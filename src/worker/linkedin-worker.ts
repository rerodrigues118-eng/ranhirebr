import { fetchWithTimeout } from "../lib/api";
import { callAI } from "../lib/ai-client";
import { redisConnection } from "../lib/queue";
import { buildScoringPrompt } from "../lib/scoring-prompt";
import { createClient } from "@supabase/supabase-js";
import { Job, Worker } from "bullmq";
import 'dotenv/config';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

type ScoringResult = {
  score_final: number;
  criterios?: unknown[];
};

async function fetchLinkedinProfile(linkedinUrl: string, candidateName?: string) {
  const apifyToken = process.env.APIFY_API_TOKEN;

  if (!apifyToken) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {
      name: candidateName,
      headline: "Profissional de Design e Tecnologia",
      summary: "Experiencia de 5 anos trabalhando com interfaces e CRM.",
      experiences: [
        { company: "TechCorp", title: "Designer Pleno", duration: "2 anos" },
        { company: "Agencia Digital", title: "UI Designer", duration: "3 anos" },
      ],
      skills: ["Figma", "Photoshop", "HTML", "CSS", "Email Marketing"],
    };
  }

  const apifyRes = await fetchWithTimeout(
    `https://api.apify.com/v2/acts/rock_star_scraper~linkedin-profile-scraper/runs?token=${apifyToken}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileUrls: [linkedinUrl] }),
    },
    30_000,
  );

  if (!apifyRes.ok) {
    throw new Error("Falha ao iniciar Actor do Apify");
  }

  const runData = await apifyRes.json();
  const runId = runData.data.id;

  for (let attempt = 0; attempt < 6; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const statusRes = await fetchWithTimeout(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`,
      {},
      30_000,
    );
    const statusData = await statusRes.json();

    if (statusData.data.status === "SUCCEEDED") {
      const datasetId = statusData.data.defaultDatasetId;
      const datasetRes = await fetchWithTimeout(
        `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}`,
        {},
        30_000,
      );
      const datasetItems = await datasetRes.json();
      return datasetItems[0] || {};
    }

    if (["FAILED", "ABORTED", "TIMED-OUT"].includes(statusData.data.status)) {
      throw new Error("Apify Actor falhou");
    }
  }

  throw new Error("Timeout aguardando Apify");
}

async function processLinkedinJob(job: Job) {
  const { linkedinUrl, vagaId, candidateName } = job.data as {
    linkedinUrl: string;
    vagaId: string;
    candidateName?: string;
  };

  const profileData = await fetchLinkedinProfile(linkedinUrl, candidateName);
  const profileDataString = JSON.stringify(profileData);

  await supabaseAdmin.from("profiles_cache").upsert({
    linkedin_url: linkedinUrl,
    dados: profileData,
    expires_at: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
  });

  const { data: vaga } = await supabaseAdmin
    .from("vagas")
    .select("empresa_id")
    .eq("id", vagaId)
    .single();

  const { data: criteriaData } = await supabaseAdmin
    .from("criteria")
    .select("id,nome,peso")
    .eq("vaga_id", vagaId);

  const formattedCriteria = (criteriaData || []).map((criteria) => ({
    id: criteria.id,
    name: criteria.nome,
    weight: criteria.peso,
  }));

  const prompt = buildScoringPrompt(profileDataString, formattedCriteria);
  const jsonString = await callAI(prompt);
  const cleanJsonString = jsonString.replace(/```json/g, "").replace(/```/g, "").trim();
  const result = JSON.parse(cleanJsonString) as ScoringResult;

  await supabaseAdmin.from("pipeline_entries").upsert({
    vaga_id: vagaId,
    empresa_id: vaga?.empresa_id ?? null,
    status: "triado",
    notas: `LinkedIn: ${linkedinUrl}\nScore: ${result.score_final}`,
  });

  return { success: true, score: result.score_final };
}

new Worker("linkedin-enrichment", processLinkedinJob, {
  connection: redisConnection,
});
