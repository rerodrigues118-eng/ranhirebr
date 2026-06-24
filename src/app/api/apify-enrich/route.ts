import { handleApiError } from "@/lib/api";
import { requireAuth } from "@/lib/auth-guard";
import { redisConnection } from "@/lib/queue";
import { Queue } from "bullmq";
import { NextResponse } from "next/server";

let enrichmentQueue: any;
if (redisConnection) {
  enrichmentQueue = new Queue("linkedin-enrichment", { connection: redisConnection });
} else {
  enrichmentQueue = {
    add: async () => { throw new Error("Redis nao configurado; fila indisponivel em ambiente de build"); },
  } as unknown as Queue;
}

export async function POST(req: Request) {
  try {
    await requireAuth();
    const { linkedinUrl, vagaId, candidateName } = (await req.json()) as {
      linkedinUrl?: string;
      vagaId?: string;
      candidateName?: string;
    };

    if (!linkedinUrl || !vagaId) {
      return NextResponse.json(
        { error: "URL do LinkedIn e ID da vaga sao obrigatorios" },
        { status: 400 },
      );
    }

    const batchId = `apify-${Date.now()}`;

    await enrichmentQueue.add(
      "enrich-profile",
      {
        linkedinUrl,
        vagaId,
        batchId,
        candidateName,
      },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
      },
    );

    return NextResponse.json({ success: true, batchId, message: "Enriquecimento na fila." });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
