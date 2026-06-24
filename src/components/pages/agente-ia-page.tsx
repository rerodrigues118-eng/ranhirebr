"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { ArrowRight, Bell, Bot, Calendar, CheckCircle2, Clock3, Mail, PlayCircle, Search, Settings, Sparkles, Target, ThumbsDown, ThumbsUp, TrendingUp, UserPlus } from "lucide-react";
// @ts-expect-error - lucide-react subpath export has no TS declarations
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check";
import ScoreGauge from "@/components/score-gauge";
import type { Agent, AgentCandidate, AgentCriterion, AgentFrequency, AgentProfile, Job } from "@/lib/types";
import { AVATAR_COLORS, INITIAL_JOBS } from "@/lib/mock-data";

type AgentTab = "criar" | "dashboard" | "candidatos" | "performance";
type CalibrationDecision = "aprovado" | "rejeitado" | "pulado";

type DraftAgent = {
  nome: string;
  vagaId: string;
  briefing: string;
  frequencia: AgentFrequency;
  scoreMinimoNotificacao: number;
};

type AgentNotification = {
  id: string;
  title: string;
  description: string;
  channel: "sino" | "email";
  createdAt: string;
  unread: boolean;
};

type CalibrationAnswer = {
  profile: AgentProfile;
  decisao: CalibrationDecision;
};

const seedJobs = INITIAL_JOBS.slice(0, 3);

const seedAgents: Agent[] = [
  {
    id: "agent-1",
    empresaId: "empresa-1",
    vagaId: seedJobs[0].id,
    nome: "Agente Designer Email",
    briefing:
      "Procuro um perfil forte em Figma, HTML/CSS para email, CRM e automacao. Precisa entender campanhas e colaborar com marketing.",
    status: "ativo",
    frequencia: "diaria",
    scoreMinimoNotificacao: 4.0,
    calibracoesRealizadas: 2,
    ultimaBusca: "2026-06-18T11:00:00.000Z",
    proximaBusca: "2026-06-19T08:00:00.000Z",
    createdAt: "2026-06-14T10:00:00.000Z",
    vagaTitulo: seedJobs[0].title,
    criteriosIa: [
      { nome: "Design visual e Figma", peso: 5, descricao: "Profundidade em layout e prototipacao." },
      { nome: "HTML/CSS para email", peso: 5, descricao: "Capacidade de codificar templates e campanhas." },
      { nome: "CRM e automacao", peso: 4, descricao: "Vivencia com funis e automacoes." },
      { nome: "Senioridade", peso: 3, descricao: "Maturidade para atuar de forma autonoma." },
    ],
    filtrosIa: {
      job_titles: ["Email Designer", "CRM Designer", "Product Designer"],
      localizacao: "Brasil",
      experiencia_minima: 3,
      experiencia_maxima: 9,
      keywords: ["Figma", "HTML", "CRM", "Email Marketing"],
    },
    metrics: {
      analisados: 312,
      encontrados: 89,
      scoreAlto: 23,
      pipeline: 11,
    },
    latestRun: {
      id: "run-1",
      agenteId: "agent-1",
      perfisAnalisados: 54,
      candidatosEncontrados: 12,
      candidatosScoreAlto: 4,
      status: "concluido",
      executadoEm: "2026-06-18T11:00:00.000Z",
    },
  },
  {
    id: "agent-2",
    empresaId: "empresa-1",
    vagaId: seedJobs[1].id,
    nome: "Agente Frontend",
    briefing: "Buscar senioridade tecnica em React, TypeScript, performance e produto.",
    status: "pausado",
    frequencia: "semanal",
    scoreMinimoNotificacao: 4.3,
    calibracoesRealizadas: 1,
    ultimaBusca: "2026-06-17T08:00:00.000Z",
    proximaBusca: "2026-06-24T08:00:00.000Z",
    createdAt: "2026-06-11T10:00:00.000Z",
    vagaTitulo: seedJobs[1].title,
    criteriosIa: [
      { nome: "React e TypeScript", peso: 5 },
      { nome: "Performance", peso: 4 },
      { nome: "Arquitetura", peso: 4 },
    ],
    filtrosIa: {
      job_titles: ["Frontend Engineer", "React Developer"],
      localizacao: "Remoto",
      experiencia_minima: 4,
      experiencia_maxima: 12,
      keywords: ["React", "TypeScript", "Next.js"],
    },
    metrics: {
      analisados: 188,
      encontrados: 41,
      scoreAlto: 13,
      pipeline: 6,
    },
    latestRun: {
      id: "run-2",
      agenteId: "agent-2",
      perfisAnalisados: 40,
      candidatosEncontrados: 7,
      candidatosScoreAlto: 2,
      status: "concluido",
      executadoEm: "2026-06-17T08:00:00.000Z",
    },
  },
];

const seedProfiles: AgentProfile[] = [
  {
    nome: "Juliana Mendes",
    cargo: "Senior Email Designer",
    empresa: "TechCorp",
    cidade: "Sao Paulo, SP",
    resumo: "Especialista em campanhas de lifecycle, Figma e HTML email. Trabalha com CRM e automacao.",
    skills: ["Figma", "HTML Email", "CRM", "Klaviyo"],
    linkedinUrl: "https://linkedin.com/in/juliana-mendes",
    avatarColor: "#1B4FD8",
  },
  {
    nome: "Ricardo Gomes",
    cargo: "UX/UI Designer",
    empresa: "Agencia Digital",
    cidade: "Remoto",
    resumo: "Perfil visual forte, mas sem experiencia profunda em email marketing ou automacao.",
    skills: ["Figma", "UX Research", "Prototipacao"],
    linkedinUrl: "https://linkedin.com/in/ricardo-gomes",
    avatarColor: "#0F766E",
  },
  {
    nome: "Fernanda Lima",
    cargo: "Email Marketing Analyst",
    empresa: "E-commerce XP",
    cidade: "Curitiba, PR",
    resumo: "Atua na operacao de CRM, segmentacao e performance de campanhas.",
    skills: ["CRM", "Copywriting", "Analytics"],
    linkedinUrl: "https://linkedin.com/in/fernanda-lima",
    avatarColor: "#B45309",
  },
  {
    nome: "Carlos Eduardo",
    cargo: "Frontend Designer",
    empresa: "SaaS Brasil",
    cidade: "Belo Horizonte, MG",
    resumo: "Mistura design e codigo, com boa leitura de produto e interfaces responsivas.",
    skills: ["React", "Design System", "Figma"],
    linkedinUrl: "https://linkedin.com/in/carlos-eduardo",
    avatarColor: "#7C3AED",
  },
  {
    nome: "Mariana Souza",
    cargo: "Product Designer",
    empresa: "Fintech",
    cidade: "Remote",
    resumo: "Perfil de produto com olhar estrategico, mas menos foco em email marketing.",
    skills: ["Product Thinking", "Figma", "Research"],
    linkedinUrl: "https://linkedin.com/in/mariana-souza",
    avatarColor: "#DB2777",
  },
  {
    nome: "Lucas Pereira",
    cargo: "Growth Designer",
    empresa: "Marketplace",
    cidade: "Rio de Janeiro, RJ",
    resumo: "Boa leitura de funil e conversao, com experiencia em testes e campanhas.",
    skills: ["Growth", "A/B Testing", "CRM"],
    linkedinUrl: "https://linkedin.com/in/lucas-pereira",
    avatarColor: "#0369A1",
  },
  {
    nome: "Aline Costa",
    cargo: "Content Designer",
    empresa: "Marketplace",
    cidade: "Sao Paulo, SP",
    resumo: "Excelente copy e ajuste de mensagem, com repertorio visual moderado.",
    skills: ["Copywriting", "Figma", "Brand Voice"],
    linkedinUrl: "https://linkedin.com/in/aline-costa",
    avatarColor: "#059669",
  },
  {
    nome: "Paulo Henrique",
    cargo: "CRM Specialist",
    empresa: "Retail Pro",
    cidade: "Brasilia, DF",
    resumo: "Forte em automacao, journeys e mensuracao de campanha.",
    skills: ["CRM", "Lifecycle", "Analytics"],
    linkedinUrl: "https://linkedin.com/in/paulo-henrique",
    avatarColor: "#D97706",
  },
];

const seedCandidates: AgentCandidate[] = [
  {
    id: "cand-agent-1",
    agenteId: "agent-1",
    linkedinUrl: "https://linkedin.com/in/juliana-mendes",
    scoreFinal: 4.8,
    visto: false,
    status: "novo",
    descobertoEm: "2026-06-18T08:12:00.000Z",
    nome: "Juliana Mendes",
    cargo: "Senior Email Designer",
    empresa: "TechCorp",
    cidade: "Sao Paulo, SP",
    skills: ["Figma", "HTML Email", "CRM", "Klaviyo"],
    chips: ["Figma", "HTML/CSS", "CRM"],
    avatarColor: "#1B4FD8",
    initials: "JM",
    criteriosAvaliacao: [
      { nome: "Design visual e Figma", peso: 5, nota: 5, justificativa: "Usa Figma como ferramenta principal." },
      { nome: "HTML/CSS para email", peso: 5, nota: 4.7, justificativa: "Entrega templates codificados." },
      { nome: "CRM e automacao", peso: 4, nota: 4.5, justificativa: "Atua com lifecycle e automacoes." },
    ],
  },
  {
    id: "cand-agent-2",
    agenteId: "agent-1",
    linkedinUrl: "https://linkedin.com/in/fernanda-lima",
    scoreFinal: 4.3,
    visto: false,
    status: "novo",
    descobertoEm: "2026-06-18T09:02:00.000Z",
    nome: "Fernanda Lima",
    cargo: "Email Marketing Analyst",
    empresa: "E-commerce XP",
    cidade: "Curitiba, PR",
    skills: ["CRM", "Copywriting", "Analytics"],
    chips: ["CRM", "Copy", "Analytics"],
    avatarColor: "#B45309",
    initials: "FL",
    criteriosAvaliacao: [
      { nome: "Design visual e Figma", peso: 5, nota: 3.0, justificativa: "Menos foco em design." },
      { nome: "HTML/CSS para email", peso: 5, nota: 4.1, justificativa: "Boa operacao de campanha." },
      { nome: "CRM e automacao", peso: 4, nota: 4.8, justificativa: "Muito forte em lifecycle." },
    ],
  },
  {
    id: "cand-agent-3",
    agenteId: "agent-2",
    linkedinUrl: "https://linkedin.com/in/carlos-eduardo",
    scoreFinal: 4.0,
    visto: true,
    status: "shortlist",
    descobertoEm: "2026-06-17T09:00:00.000Z",
    nome: "Carlos Eduardo",
    cargo: "Frontend Designer",
    empresa: "SaaS Brasil",
    cidade: "Belo Horizonte, MG",
    skills: ["React", "Design System", "Figma"],
    chips: ["React", "Design System"],
    avatarColor: "#7C3AED",
    initials: "CE",
    criteriosAvaliacao: [
      { nome: "React e TypeScript", peso: 5, nota: 4.2, justificativa: "Boa base tecnica." },
      { nome: "Performance", peso: 4, nota: 4.0, justificativa: "Conhece otimização de interfaces." },
      { nome: "Arquitetura", peso: 4, nota: 3.9, justificativa: "Bom raciocinio de produto." },
    ],
  },
];

const seedNotifications: AgentNotification[] = [
  {
    id: "notif-1",
    title: "Juliana Mendes passou do score minimo",
    description: "O agente encontrou um candidato 4.8 e disparou notificacao no sino e via Brevo.",
    channel: "email",
    createdAt: "2026-06-18T08:12:00.000Z",
    unread: true,
  },
  {
    id: "notif-2",
    title: "Agente Designer Email executado",
    description: "54 perfis analisados, 12 candidatos encontrados e 4 acima de 4.0.",
    channel: "sino",
    createdAt: "2026-06-18T11:00:00.000Z",
    unread: false,
  },
];

const scoreSeries = [12, 18, 14, 20, 16, 22, 19, 25, 28, 21, 24, 32, 29, 30, 34, 38, 33, 40, 36, 42, 39, 45, 41, 47, 46, 49, 44, 50, 48, 52];

function formatDateTime(value: string | null) {
  if (!value) return "Nao informado";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDayGroup(value: string) {
  const date = new Date(value);
  const today = new Date();
  const diffDays = Math.floor((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  if (diffDays <= 7) return "Esta semana";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(date);
}

function toInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

function groupCandidatesByDate(candidates: AgentCandidate[]) {
  const groups = new Map<string, AgentCandidate[]>();

  candidates
    .slice()
    .sort((a, b) => new Date(b.descobertoEm).getTime() - new Date(a.descobertoEm).getTime())
    .forEach((candidate) => {
      const key = formatDayGroup(candidate.descobertoEm);
      const list = groups.get(key) || [];
      list.push(candidate);
      groups.set(key, list);
    });

  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}

function AgentPill({ children, active = false }: { children: React.ReactNode; active?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold ${
        active ? "border-[#1B4FD8]/20 bg-[#E8EEFB] text-[#1B4FD8]" : "border-slate-200 bg-white text-slate-500"
      }`}
    >
      {children}
    </span>
  );
}

function MetricCard({ label, value, hint, accent = "text-slate-900" }: { label: string; value: string; hint: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className={`mt-2 text-[28px] font-semibold tracking-tight ${accent}`}>{value}</div>
      <div className="mt-1 text-[12px] text-slate-500">{hint}</div>
    </div>
  );
}

function AgentCandidateCard({
  candidate,
  onShortlist,
  onReject,
}: {
  candidate: AgentCandidate;
  onShortlist: (id: string) => void;
  onReject: (id: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-[1px] hover:border-[#1B4FD8]/30">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl text-[13px] font-semibold text-white shadow" style={{ background: candidate.avatarColor }}>
            {candidate.initials || toInitials(candidate.nome)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-[15px] font-semibold text-slate-900">{candidate.nome}</h3>
              {!candidate.visto && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-600">Novo</span>}
            </div>
            <p className="mt-0.5 text-[12px] text-slate-500">
              {candidate.cargo} · {candidate.empresa} · {candidate.cidade}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {candidate.chips.slice(0, 3).map((chip) => (
                <span key={chip} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-shrink-0 flex-col items-end gap-3">
          <ScoreGauge score={candidate.scoreFinal} />
          <div className="flex gap-2">
            <button
              onClick={() => onReject(candidate.id)}
              className="inline-flex h-9 items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-3 text-[12px] font-semibold text-rose-600 transition hover:bg-rose-100"
            >
              Rejeitar
            </button>
            <button
              onClick={() => onShortlist(candidate.id)}
              className="inline-flex h-9 items-center justify-center rounded-full bg-[#1B4FD8] px-3 text-[12px] font-semibold text-white transition hover:bg-[#163fb3]"
            >
              Shortlist
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AgenteIAPage() {
  const [activeTab, setActiveTab] = useState<AgentTab>("criar");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [candidates, setCandidates] = useState<AgentCandidate[]>([]);
  const [notifications, setNotifications] = useState<AgentNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdAgent, setCreatedAgent] = useState<Agent | null>(null);
  const [workflowStep, setWorkflowStep] = useState<1 | 2 | 3>(1);
  const [calibrationIndex, setCalibrationIndex] = useState(0);
  const workflowRafRef = useRef<number | null>(null);
  const [calibrationDecisions, setCalibrationDecisions] = useState<CalibrationAnswer[]>([]);
  const [isSavingCalibration, setIsSavingCalibration] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [draft, setDraft] = useState<DraftAgent>({
    nome: "",
    vagaId: "",
    briefing: "",
    frequencia: "diaria",
    scoreMinimoNotificacao: 4,
  });

  const calibrationProfiles = useMemo(
    () => seedProfiles.slice(0, 8),
    [],
  );

  const activeAgent = useMemo(() => {
    return agents.find((agent) => agent.id === selectedAgentId) || agents[0] || null;
  }, [agents, selectedAgentId]);

  const candidateGroups = useMemo(() => groupCandidatesByDate(candidates), [candidates]);

  const activeMetrics = activeAgent?.metrics || {
    analisados: 0,
    encontrados: 0,
    scoreAlto: 0,
    pipeline: 0,
  };

  useEffect(() => {
    let alive = true;

    async function loadAgents() {
      try {
        const res = await fetch("/api/agentes");
        const data = await res.json();

        if (!alive) return;

        if (res.ok) {
          if (Array.isArray(data.vagas) && data.vagas.length > 0) {
            setJobs(
              data.vagas.map((vaga: { id: string; titulo: string }) => ({
                ...seedJobs[0],
                id: vaga.id,
                title: vaga.titulo,
                department: "Geral",
                candidatesCount: 0,
                averageScore: 0,
                topScore: 0,
                status: "active",
                createdDate: new Date().toLocaleDateString("pt-BR"),
              })),
            );
          }

          if (Array.isArray(data.agentes) && data.agentes.length > 0) {
            setAgents(data.agentes);
            setSelectedAgentId(data.agentes[0].id);
          }

          if (Array.isArray(data.candidatos) && data.candidatos.length > 0) {
            setCandidates(data.candidatos);
          }

          if (Array.isArray(data.notificacoes) && data.notificacoes.length > 0) {
            setNotifications(data.notificacoes);
          }
        } else {
          throw new Error(data.error || "Falha ao carregar agentes.");
        }
      } catch (error: unknown) {
        if (alive) {
          setLoadError(error instanceof Error ? error.message : "Falha ao carregar agentes.");
        }
      } finally {
        if (alive) {
          setIsLoading(false);
        }
      }
    }

    loadAgents();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (workflowStep !== 2) return;
    if (calibrationIndex >= calibrationProfiles.length) {
      if (workflowRafRef.current !== null) cancelAnimationFrame(workflowRafRef.current);
      workflowRafRef.current = requestAnimationFrame(() => setWorkflowStep(3));
    }
    return () => { if (workflowRafRef.current !== null) cancelAnimationFrame(workflowRafRef.current); };
  }, [workflowStep, calibrationIndex, calibrationProfiles.length]);

  const generatedCriteria = useMemo<AgentCriterion[]>(() => {
    const briefing = draft.briefing.toLowerCase();
    const criteria: AgentCriterion[] = [
      { nome: "Experiencia relevante", peso: 5, descricao: "Tempo e aderencia ao cargo alvo." },
      { nome: "Senioridade", peso: 4, descricao: "Maturidade para atuar com autonomia." },
      { nome: "Contexto de produto", peso: 3, descricao: "Vivencia com o tipo de negocio descrito." },
    ];

    if (briefing.includes("figma") || briefing.includes("design")) {
      criteria.unshift({ nome: "Design visual e Figma", peso: 5, descricao: "Profundidade em layout, prototipacao e execucao visual." });
    }

    if (briefing.includes("html") || briefing.includes("css") || briefing.includes("email")) {
      criteria.push({ nome: "HTML/CSS para email", peso: 5, descricao: "Capacidade de codificar templates e campanhas." });
    }

    if (briefing.includes("crm") || briefing.includes("hubspot") || briefing.includes("salesforce")) {
      criteria.push({ nome: "CRM e automacao", peso: 4, descricao: "Vivencia com funis, jornadas e segmentacao." });
    }

    return criteria.slice(0, 5);
  }, [draft.briefing]);

  const activeCriteria = createdAgent?.criteriosIa?.length ? createdAgent.criteriosIa : generatedCriteria;

  const handleCreateAgent = async () => {
    setCreateError(null);

    if (!draft.nome.trim() || !draft.vagaId || !draft.briefing.trim()) {
      setCreateError("Preencha nome, vaga e briefing para continuar.");
      return;
    }

    const selectedJob = jobs.find((job) => job.id === draft.vagaId);
    setIsCreating(true);

    try {
      const res = await fetch("/api/agentes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: draft.nome,
          vagaId: draft.vagaId,
          briefing: draft.briefing,
          frequencia: draft.frequencia,
          scoreMinimoNotificacao: draft.scoreMinimoNotificacao,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Falha ao criar agente.");
      }

      const created: Agent = {
        ...(data.agente as Agent),
        vagaTitulo: selectedJob?.title || data.agente?.vagaTitulo || "Vaga vinculada",
        metrics: {
          analisados: 0,
          encontrados: 0,
          scoreAlto: 0,
          pipeline: 0,
        },
      };

      setAgents((prev) => [created, ...prev]);
      setCreatedAgent(created);
      setSelectedAgentId(created.id);
      setWorkflowStep(2);
      setCalibrationIndex(0);
      setCalibrationDecisions([]);
      setActiveTab("criar");
    } catch (error: unknown) {
      setCreateError(error instanceof Error ? error.message : "Falha ao criar agente.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCalibrationAction = (decisao: CalibrationDecision) => {
    const profile = calibrationProfiles[calibrationIndex];
    if (!profile) return;

    setCalibrationDecisions((prev) => [...prev, { profile, decisao }]);
    setCalibrationIndex((prev) => Math.min(prev + 1, calibrationProfiles.length));
  };

  const handleFinishCalibration = async () => {
    if (!createdAgent) return;

    setIsSavingCalibration(true);
    const decisionsPayload = calibrationDecisions.map((entry) => ({
      linkedinUrl: entry.profile.linkedinUrl,
      decisao: entry.decisao,
      dadosPerfil: entry.profile,
    }));

    try {
      await fetch(`/api/agentes/${createdAgent.id}/calibracoes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calibracoes: decisionsPayload }),
      });

      await fetch(`/api/agentes/${createdAgent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "ativo",
          calibracoesRealizadas: 1,
          criteriosIa: activeCriteria,
          filtrosIa: {
            job_titles: [jobs.find((job) => job.id === draft.vagaId)?.title || ""],
            localizacao: "Brasil",
            experiencia_minima: draft.briefing.toLowerCase().includes("senior") ? 5 : 3,
            experiencia_maxima: draft.briefing.toLowerCase().includes("senior") ? 12 : 8,
            keywords: activeCriteria.map((criterion) => criterion.nome),
          },
        }),
      });

      setAgents((prev) =>
        prev.map((agent) =>
          agent.id === createdAgent.id
            ? {
                ...agent,
                status: "ativo",
                calibracoesRealizadas: 1,
                criteriosIa: activeCriteria,
                filtrosIa: {
                  job_titles: [jobs.find((job) => job.id === draft.vagaId)?.title || ""],
                  localizacao: "Brasil",
                  experiencia_minima: draft.briefing.toLowerCase().includes("senior") ? 5 : 3,
                  experiencia_maxima: draft.briefing.toLowerCase().includes("senior") ? 12 : 8,
                  keywords: activeCriteria.map((criterion) => criterion.nome),
                },
              }
            : agent,
        ),
      );

      setCreatedAgent((prev) =>
        prev
          ? {
              ...prev,
              status: "ativo",
              calibracoesRealizadas: 1,
              criteriosIa: activeCriteria,
              filtrosIa: {
                job_titles: [jobs.find((job) => job.id === draft.vagaId)?.title || ""],
                localizacao: "Brasil",
                experiencia_minima: draft.briefing.toLowerCase().includes("senior") ? 5 : 3,
                experiencia_maxima: draft.briefing.toLowerCase().includes("senior") ? 12 : 8,
                keywords: activeCriteria.map((criterion) => criterion.nome),
              },
            }
          : prev,
      );

      setWorkflowStep(3);
    } finally {
      setIsSavingCalibration(false);
    }
  };

  const handleToggleCandidateStatus = (id: string, status: AgentCandidate["status"]) => {
    setCandidates((prev) =>
      prev.map((candidate) =>
        candidate.id === id
          ? {
              ...candidate,
              status,
              visto: true,
            }
          : candidate,
      ),
    );
  };

  const handleAgentAction = async (agentId: string, action: "pausar" | "ativar") => {
    setAgents((prev) =>
      prev.map((agent) =>
        agent.id === agentId
          ? {
              ...agent,
              status: action === "ativar" ? "ativo" : "pausado",
            }
          : agent,
      ),
    );

    await fetch(`/api/agentes/${agentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: action === "ativar" ? "ativo" : "pausado" }),
    }).catch(() => {});
  };

  const calibrationSummary = useMemo(() => {
    const approved = calibrationDecisions.filter((item) => item.decisao === "aprovado").length;
    const rejected = calibrationDecisions.filter((item) => item.decisao === "rejeitado").length;
    const skipped = calibrationDecisions.filter((item) => item.decisao === "pulado").length;

    const weightBoost = approved * 0.3 - rejected * 0.2;
    return {
      approved,
      rejected,
      skipped,
      weightBoost,
      total: calibrationDecisions.length,
    };
  }, [calibrationDecisions]);

  const currentProfile = calibrationProfiles[calibrationIndex];
  const unreadNotifications = notifications.filter((notification) => notification.unread);

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-6 py-6 lg:px-8">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#081225_0%,#111827_55%,#1B4FD8_100%)] text-white shadow-[0_20px_60px_rgba(15,23,42,0.22)]">
        <div className="flex flex-col gap-6 p-6 lg:p-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">
              <Sparkles className="h-3.5 w-3.5" />
              Recrutador virtual autonomo
            </div>
            <h1 className="text-[30px] font-semibold tracking-tight lg:text-[38px]">
              Agente IA que trabalha sozinho, aprende com calibracao e avisa quando encontra candidatos fortes.
            </h1>
            <p className="mt-3 max-w-2xl text-[14px] leading-6 text-white/72">
              Crie um agente, calibre com 8 perfis reais, acompanhe o dashboard de execucoes e veja a fila de candidatos em ordem de descoberta.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[430px]">
            <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.12em] text-white/55">Agentes ativos</div>
              <div className="mt-2 text-[28px] font-semibold">{agents.filter((agent) => agent.status === "ativo").length}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.12em] text-white/55">Score 4.0+</div>
              <div className="mt-2 text-[28px] font-semibold">{agents.reduce((acc, agent) => acc + (agent.metrics?.scoreAlto || 0), 0)}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.12em] text-white/55">Notificacoes</div>
              <div className="mt-2 text-[28px] font-semibold">{unreadNotifications.length}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(["criar", "dashboard", "candidatos", "performance"] as AgentTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold transition ${
              activeTab === tab
                ? "border-[#1B4FD8]/20 bg-[#E8EEFB] text-[#1B4FD8]"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
            }`}
          >
            {tab === "criar" && <UserPlus className="h-4 w-4" />}
            {tab === "dashboard" && <Bot className="h-4 w-4" />}
            {tab === "candidatos" && <Search className="h-4 w-4" />}
            {tab === "performance" && <TrendingUp className="h-4 w-4" />}
            {tab === "criar" && "Criar agente"}
            {tab === "dashboard" && "Dashboard"}
            {tab === "candidatos" && "Candidatos"}
            {tab === "performance" && "Performance"}
          </button>
        ))}
      </div>

      {loadError && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
          Carregamento parcial: {loadError}. A tela segue com dados de exemplo para manter o fluxo visivel.
        </div>
      )}

      {activeTab === "criar" && (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-[22px] font-semibold tracking-tight text-slate-900">Criar agente</h2>
                  <p className="mt-1 text-[14px] text-slate-500">
                    Preencha o briefing. A IA monta os filtros e os criterios iniciais automaticamente.
                  </p>
                </div>
                <div className="hidden items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[12px] font-semibold text-slate-600 md:flex">
                  <Clock3 className="h-4 w-4" />
                  Fluxo guiado
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="space-y-2 md:col-span-1">
                  <span className="text-[13px] font-semibold text-slate-700">Nome do agente</span>
                  <input
                    value={draft.nome}
                    onChange={(event) => setDraft((prev) => ({ ...prev, nome: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] outline-none transition focus:border-[#1B4FD8] focus:bg-white"
                    placeholder="Ex: Agente Designer Email"
                  />
                </label>

                <label className="space-y-2 md:col-span-1">
                  <span className="text-[13px] font-semibold text-slate-700">Vaga vinculada</span>
                  <select
                    value={draft.vagaId}
                    onChange={(event) => setDraft((prev) => ({ ...prev, vagaId: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] outline-none transition focus:border-[#1B4FD8] focus:bg-white"
                    disabled={jobs.length === 0}
                  >
                    {jobs.length === 0 ? (
                      <option value="">Nenhuma vaga cadastrada</option>
                    ) : (
                      jobs.map((job) => (
                        <option key={job.id} value={job.id}>
                          {job.title}
                        </option>
                      ))
                    )}
                  </select>
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-[13px] font-semibold text-slate-700">Briefing livre</span>
                  <textarea
                    value={draft.briefing}
                    onChange={(event) => setDraft((prev) => ({ ...prev, briefing: event.target.value }))}
                    rows={6}
                    className="w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] outline-none transition focus:border-[#1B4FD8] focus:bg-white"
                    placeholder="Descreva o perfil ideal, diferenciais, senioridade, stack, empresas-alvo e qualquer restricao importante."
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[13px] font-semibold text-slate-700">Frequencia</span>
                  <select
                    value={draft.frequencia}
                    onChange={(event) => setDraft((prev) => ({ ...prev, frequencia: event.target.value as AgentFrequency }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] outline-none transition focus:border-[#1B4FD8] focus:bg-white"
                  >
                    <option value="diaria">Diaria</option>
                    <option value="semanal">Semanal</option>
                    <option value="manual">Manual</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-[13px] font-semibold text-slate-700">Score minimo para notificar</span>
                  <select
                    value={draft.scoreMinimoNotificacao.toFixed(1)}
                    onChange={(event) => setDraft((prev) => ({ ...prev, scoreMinimoNotificacao: Number(event.target.value) }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] outline-none transition focus:border-[#1B4FD8] focus:bg-white"
                  >
                    <option value="3.5">3.5+</option>
                    <option value="4.0">4.0+ (padrao)</option>
                    <option value="4.3">4.3+</option>
                    <option value="4.5">4.5+</option>
                  </select>
                </label>
              </div>

              {createError && (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700">
                  {createError}
                </div>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  onClick={handleCreateAgent}
                  disabled={isCreating}
                  className="inline-flex items-center gap-2 rounded-full bg-[#1B4FD8] px-5 py-3 text-[13px] font-semibold text-white transition hover:bg-[#163fb3] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isCreating ? "Gerando criterios..." : "Criar e iniciar calibracao"}
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setDraft({
                      nome: "Agente Designer Email",
                      vagaId: jobs[0]?.id || "",
                      briefing:
                        "Procuro um perfil forte em Figma, HTML/CSS para email, CRM e automacao. Precisa entender campanhas e colaborar com marketing.",
                      frequencia: "diaria",
                      scoreMinimoNotificacao: 4,
                    });
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-[13px] font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                >
                  <PlayCircle className="h-4 w-4" />
                  Preencher exemplo
                </button>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-[18px] font-semibold text-slate-900">Criterios gerados pela IA</h3>
                  <p className="mt-1 text-[13px] text-slate-500">
                    A calibracao ajusta os pesos com base nos perfis aprovados e rejeitados.
                  </p>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">
                {activeCriteria.length} criterios
                </span>
              </div>

              <div className="mt-5 grid gap-3">
                {activeCriteria.map((criterion) => (
                  <div key={criterion.nome} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[14px] font-semibold text-slate-900">{criterion.nome}</div>
                        <div className="mt-1 text-[12px] text-slate-500">{criterion.descricao}</div>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[#1B4FD8]">
                        peso {criterion.peso}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[12px] uppercase tracking-[0.14em] text-slate-500">Etapa</div>
                  <h3 className="mt-1 text-[20px] font-semibold text-slate-900">
                    {workflowStep === 1 && "1. Criacao"}
                    {workflowStep === 2 && "2. Calibracao"}
                    {workflowStep === 3 && "3. Resumo e ativacao"}
                  </h3>
                </div>
                <div className="rounded-full bg-[#E8EEFB] px-3 py-1 text-[12px] font-semibold text-[#1B4FD8]">
                  {workflowStep === 1 && "Preparando"}
                  {workflowStep === 2 && "Em andamento"}
                  {workflowStep === 3 && "Concluido"}
                </div>
              </div>

              <div className="mt-6 grid gap-3">
                <div className={`flex items-start gap-3 rounded-2xl border p-4 ${workflowStep >= 1 ? "border-[#1B4FD8]/20 bg-[#E8EEFB]" : "border-slate-200 bg-slate-50"}`}>
                  <div className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold ${workflowStep >= 1 ? "bg-[#1B4FD8] text-white" : "bg-white text-slate-400"}`}>1</div>
                  <div>
                    <div className="text-[13px] font-semibold text-slate-900">Descrever a vaga</div>
                    <div className="text-[12px] text-slate-500">Nome, briefing, frequencia e score minimo.</div>
                  </div>
                </div>
                <div className={`flex items-start gap-3 rounded-2xl border p-4 ${workflowStep >= 2 ? "border-[#1B4FD8]/20 bg-[#E8EEFB]" : "border-slate-200 bg-slate-50"}`}>
                  <div className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold ${workflowStep >= 2 ? "bg-[#1B4FD8] text-white" : "bg-white text-slate-400"}`}>2</div>
                  <div>
                    <div className="text-[13px] font-semibold text-slate-900">Calibracao exclusiva</div>
                    <div className="text-[12px] text-slate-500">8 perfis avaliados um por um para ajustar pesos.</div>
                  </div>
                </div>
                <div className={`flex items-start gap-3 rounded-2xl border p-4 ${workflowStep >= 3 ? "border-[#1B4FD8]/20 bg-[#E8EEFB]" : "border-slate-200 bg-slate-50"}`}>
                  <div className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold ${workflowStep >= 3 ? "bg-[#1B4FD8] text-white" : "bg-white text-slate-400"}`}>3</div>
                  <div>
                    <div className="text-[13px] font-semibold text-slate-900">Ativar e monitorar</div>
                    <div className="text-[12px] text-slate-500">Agente ativo, notificacoes e execucoes automaticas.</div>
                  </div>
                </div>
              </div>
            </div>

            {workflowStep === 2 && currentProfile && (
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[12px] uppercase tracking-[0.14em] text-slate-500">Calibracao</div>
                    <h3 className="mt-1 text-[20px] font-semibold text-slate-900">
                      Perfil {calibrationIndex + 1} de {calibrationProfiles.length}
                    </h3>
                  </div>
                  <Target className="h-5 w-5 text-[#1B4FD8]" />
                </div>

                <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-start gap-4">
                    <div
                      className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl text-[18px] font-semibold text-white shadow"
                      style={{ background: currentProfile.avatarColor || AVATAR_COLORS[calibrationIndex % AVATAR_COLORS.length] }}
                    >
                      {toInitials(currentProfile.nome)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-[18px] font-semibold text-slate-900">{currentProfile.nome}</h4>
                      <p className="mt-1 text-[13px] text-slate-600">
                        {currentProfile.cargo} · {currentProfile.empresa}
                      </p>
                      <p className="mt-1 text-[12px] text-slate-500">{currentProfile.cidade}</p>
                    </div>
                  </div>

                  <p className="mt-4 rounded-2xl bg-white p-4 text-[14px] leading-6 text-slate-700">
                    {currentProfile.resumo}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {currentProfile.skills.map((skill) => (
                      <span key={skill} className="rounded-full bg-[#E8EEFB] px-3 py-1 text-[11px] font-semibold text-[#1B4FD8]">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    onClick={() => handleCalibrationAction("rejeitado")}
                    className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] font-semibold text-rose-600 transition hover:bg-rose-100"
                  >
                    <ThumbsDown className="h-4 w-4" />
                    Nao e
                  </button>
                  <button
                    onClick={() => handleCalibrationAction("aprovado")}
                    className="inline-flex items-center gap-2 rounded-full bg-[#1B4FD8] px-4 py-3 text-[13px] font-semibold text-white transition hover:bg-[#163fb3]"
                  >
                    <ThumbsUp className="h-4 w-4" />
                    Este e o perfil
                  </button>
                  <button
                    onClick={() => handleCalibrationAction("pulado")}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-[13px] font-semibold text-slate-700 transition hover:border-slate-300"
                  >
                    <ArrowRight className="h-4 w-4" />
                    Pular
                  </button>
                </div>
              </div>
            )}

            {workflowStep === 3 && (
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[12px] uppercase tracking-[0.14em] text-slate-500">Resumo calibrado</div>
                    <h3 className="mt-1 text-[20px] font-semibold text-slate-900">
                      O agente aprendeu com {calibrationSummary.total} respostas.
                    </h3>
                  </div>
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <MetricCard label="Aprovados" value={`${calibrationSummary.approved}`} hint="Perfis alinhados ao briefing." accent="text-emerald-600" />
                  <MetricCard label="Rejeitados" value={`${calibrationSummary.rejected}`} hint="Sinais claros de ajuste." accent="text-rose-600" />
                  <MetricCard label="Pulados" value={`${calibrationSummary.skipped}`} hint="Perfis neutros ou incertos." accent="text-amber-600" />
                </div>

                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-[13px] font-semibold text-slate-900">Ajuste estimado de pesos</div>
                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#1B4FD8] to-[#06D6A0]" style={{ width: `${Math.min(100, 45 + calibrationSummary.weightBoost * 12)}%` }} />
                  </div>
                  <div className="mt-2 text-[12px] text-slate-500">
                    A IA esta pronta para ativar com os pesos recalibrados e o score minimo de notificacao.
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    onClick={handleFinishCalibration}
                    disabled={isSavingCalibration}
                    className="inline-flex items-center gap-2 rounded-full bg-[#1B4FD8] px-4 py-3 text-[13px] font-semibold text-white transition hover:bg-[#163fb3] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSavingCalibration ? "Ativando..." : "Ativar agente"}
                    <PlayCircle className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setWorkflowStep(2)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-[13px] font-semibold text-slate-700 transition hover:border-slate-300"
                  >
                    Revisar calibracao
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "dashboard" && (
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-[22px] font-semibold tracking-tight text-slate-900">Dashboard dos agentes</h2>
                <p className="mt-1 text-[14px] text-slate-500">
                  Cada card mostra status, proxima execucao e o resumo da semana.
                </p>
              </div>
              <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-600 md:flex">
                <Bell className="h-4 w-4" />
                {unreadNotifications.length} pendentes
              </div>
            </div>

            <div className="grid gap-4">
              {agents.map((agent) => (
                <div key={agent.id} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Bot className="h-5 w-5 text-[#1B4FD8]" />
                        <h3 className="text-[18px] font-semibold text-slate-900">{agent.nome}</h3>
                        <AgentPill active={agent.status === "ativo"}>{agent.status === "ativo" ? "Ativo" : agent.status === "pausado" ? "Pausado" : "Arquivado"}</AgentPill>
                        <AgentPill>{agent.vagaTitulo}</AgentPill>
                      </div>
                      <p className="mt-3 max-w-2xl text-[13px] leading-6 text-slate-500">{agent.briefing}</p>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl bg-slate-50 p-3">
                          <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Ultima busca</div>
                          <div className="mt-1 text-[13px] font-semibold text-slate-900">{formatDateTime(agent.ultimaBusca)}</div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-3">
                          <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Proxima busca</div>
                          <div className="mt-1 text-[13px] font-semibold text-slate-900">{formatDateTime(agent.proximaBusca)}</div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-3">
                          <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Score minimo</div>
                          <div className="mt-1 text-[13px] font-semibold text-slate-900">{agent.scoreMinimoNotificacao.toFixed(1)}+</div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-3">
                          <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Calibracoes</div>
                          <div className="mt-1 text-[13px] font-semibold text-slate-900">{agent.calibracoesRealizadas}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-stretch gap-3 lg:min-w-[220px]">
                      <div className="rounded-[24px] border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4">
                        <div className="text-[11px] uppercase tracking-[0.12em] text-amber-700">Metrica da semana</div>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-center">
                          <div>
                          <div className="text-[22px] font-semibold text-slate-900">{agent.metrics?.analisados || 0}</div>
                            <div className="text-[11px] text-slate-500">Analisados</div>
                          </div>
                          <div>
                            <div className="text-[22px] font-semibold text-slate-900">{agent.metrics?.encontrados || 0}</div>
                            <div className="text-[11px] text-slate-500">Encontrados</div>
                          </div>
                          <div>
                            <div className="text-[22px] font-semibold text-emerald-600">{agent.metrics?.scoreAlto || 0}</div>
                            <div className="text-[11px] text-slate-500">Score 4.0+</div>
                          </div>
                          <div>
                            <div className="text-[22px] font-semibold text-slate-900">{agent.metrics?.pipeline || 0}</div>
                            <div className="text-[11px] text-slate-500">Pipeline</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => setSelectedAgentId(agent.id)}
                          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1B4FD8] px-4 py-3 text-[13px] font-semibold text-white transition hover:bg-[#163fb3]"
                        >
                          Ver candidatos
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAgentId(agent.id);
                            setWorkflowStep(2);
                            setActiveTab("criar");
                            setCreatedAgent(agent);
                          }}
                          className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-[13px] font-semibold text-slate-700 transition hover:border-slate-300"
                        >
                          Calibrar
                        </button>
                        <button
                          onClick={() => handleAgentAction(agent.id, agent.status === "ativo" ? "pausar" : "ativar")}
                          className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] font-semibold text-slate-700 transition hover:border-slate-300"
                        >
                          <Settings className="h-4 w-4" />
                          {agent.status === "ativo" ? "Pausar" : "Ativar"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#1B4FD8]" />
                <h3 className="text-[18px] font-semibold text-slate-900">Notificacoes</h3>
              </div>
              <div className="mt-4 space-y-3">
                {notifications.map((notification) => (
                  <div key={notification.id} className={`rounded-2xl border p-4 ${notification.unread ? "border-[#1B4FD8]/20 bg-[#E8EEFB]" : "border-slate-200 bg-slate-50"}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[13px] font-semibold text-slate-900">{notification.title}</div>
                      <AgentPill active={notification.channel === "email"}>{notification.channel === "email" ? "Brevo" : "Sino"}</AgentPill>
                    </div>
                    <div className="mt-2 text-[12px] leading-5 text-slate-500">{notification.description}</div>
                    <div className="mt-2 text-[11px] text-slate-400">{formatDateTime(notification.createdAt)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <h3 className="text-[18px] font-semibold text-slate-900">Ultima execucao</h3>
              </div>
              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <div className="text-[13px] font-semibold text-slate-900">{activeAgent?.latestRun ? "Concluida" : "Sem execucao recente"}</div>
                {activeAgent?.latestRun && (
                  <div className="mt-2 space-y-1 text-[12px] text-slate-500">
                    <div>{activeAgent.latestRun.perfisAnalisados} perfis analisados</div>
                    <div>{activeAgent.latestRun.candidatosEncontrados} candidatos encontrados</div>
                    <div>{activeAgent.latestRun.candidatosScoreAlto} com score alto</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "candidatos" && (
        <div className="grid gap-6 xl:grid-cols-[1fr_0.38fr]">
          <div className="space-y-5">
            <div>
              <h2 className="text-[22px] font-semibold tracking-tight text-slate-900">Candidatos do agente</h2>
              <p className="mt-1 text-[14px] text-slate-500">
                Timeline reversa agrupada por data de descoberta.
              </p>
            </div>

            <div className="grid gap-4">
              {candidateGroups.map((group) => (
                <div key={group.label} className="space-y-4">
                  <div className="flex items-center gap-4">
                    <h3 className="text-[14px] font-semibold text-slate-900">{group.label}</h3>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>

                  {group.items.map((candidate) => (
                    <AgentCandidateCard
                      key={candidate.id}
                      candidate={candidate}
                      onShortlist={(id) => handleToggleCandidateStatus(id, "shortlist")}
                      onReject={(id) => handleToggleCandidateStatus(id, "rejeitado")}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#1B4FD8]" />
                <h3 className="text-[18px] font-semibold text-slate-900">Resumo do agente</h3>
              </div>
              <div className="mt-4 space-y-3 text-[13px] text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Total de candidatos</span>
                  <strong className="text-slate-900">{candidates.length}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Novos</span>
                  <strong className="text-slate-900">{candidates.filter((candidate) => candidate.status === "novo").length}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Shortlist</span>
                  <strong className="text-slate-900">{candidates.filter((candidate) => candidate.status === "shortlist").length}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Rejeitados</span>
                  <strong className="text-slate-900">{candidates.filter((candidate) => candidate.status === "rejeitado").length}</strong>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#1B4FD8]" />
                <h3 className="text-[18px] font-semibold text-slate-900">Chips de criterio</h3>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {activeCriteria.map((criterion) => (
                  <AgentPill key={criterion.nome} active={criterion.peso >= 4}>
                    {criterion.nome}
                  </AgentPill>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "performance" && (
        <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <div className="space-y-6">
            <div>
              <h2 className="text-[22px] font-semibold tracking-tight text-slate-900">Performance</h2>
              <p className="mt-1 text-[14px] text-slate-500">
                Candidatos encontrados por dia e funil de conversao do agente.
              </p>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-[18px] font-semibold text-slate-900">Candidatos encontrados nos ultimos 30 dias</h3>
                <AgentPill active>30 dias</AgentPill>
              </div>
              <div className="mt-6 flex h-56 items-end gap-2">
                {scoreSeries.map((value, index) => (
                  <div key={index} className="flex-1">
                    <div className="flex h-52 items-end rounded-2xl bg-slate-50 p-1">
                      <div
                        className="w-full rounded-[18px] bg-gradient-to-t from-[#1B4FD8] to-[#06D6A0]"
                        style={{ height: `${Math.max(14, Math.min(100, value))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-between text-[11px] text-slate-400">
                <span>30 dias atras</span>
                <span>Hoje</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-[18px] font-semibold text-slate-900">Funil</h3>
              <div className="mt-5 space-y-4">
                {[
                  { label: "Analisados", value: activeMetrics.analisados, width: 100, tone: "bg-slate-400" },
                  { label: "Passaram nos filtros", value: Math.max(1, Math.round(activeMetrics.analisados * 0.34)), width: 68, tone: "bg-blue-400" },
                  { label: `Score ${activeAgent?.scoreMinimoNotificacao.toFixed(1) || "4.0"}+`, value: activeMetrics.scoreAlto, width: 46, tone: "bg-emerald-500" },
                  { label: "Shortlist", value: activeMetrics.pipeline, width: 28, tone: "bg-[#1B4FD8]" },
                  { label: "Contatados", value: Math.max(1, Math.round(activeMetrics.pipeline * 0.5)), width: 16, tone: "bg-amber-500" },
                  { label: "Contratados", value: 1, width: 8, tone: "bg-slate-700" },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="mb-1 flex items-center justify-between text-[13px]">
                      <span className="text-slate-500">{item.label}</span>
                      <strong className="text-slate-900">{item.value}</strong>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className={`h-2 rounded-full ${item.tone}`} style={{ width: `${item.width}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#1B4FD8]" />
                <h3 className="text-[18px] font-semibold text-slate-900">Notificacao por Brevo</h3>
              </div>
              <p className="mt-3 text-[13px] leading-6 text-slate-500">
                Quando um candidato ultrapassa o score minimo, o sistema aciona o sino interno e prepara o envio por email via Brevo.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <AgentPill active>Score minimo {activeAgent?.scoreMinimoNotificacao.toFixed(1) || "4.0"}+</AgentPill>
                <AgentPill active>{unreadNotifications.length} alertas novos</AgentPill>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#1B4FD8]" />
                <h3 className="text-[18px] font-semibold text-slate-900">Resumo rapido</h3>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <MetricCard label="Analyzed" value={`${activeMetrics.analisados}`} hint="Perfis examinados." accent="text-slate-900" />
                <MetricCard label="Achados" value={`${activeMetrics.encontrados}`} hint="Candidatos encontrados." accent="text-slate-900" />
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="rounded-[28px] border border-slate-200 bg-white px-4 py-3 text-[13px] text-slate-500 shadow-sm">
          Carregando agentes e candidatos...
        </div>
      )}

      {notifications.length > 0 && activeTab !== "dashboard" && activeTab !== "performance" && (
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-[#1B4FD8]" />
            <h3 className="text-[18px] font-semibold text-slate-900">Central de notificacoes</h3>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {notifications.map((notification) => (
              <div key={notification.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[13px] font-semibold text-slate-900">{notification.title}</div>
                  <AgentPill active={notification.channel === "email"}>{notification.channel === "email" ? "Brevo" : "Sino"}</AgentPill>
                </div>
                <div className="mt-2 text-[12px] leading-5 text-slate-500">{notification.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {createdAgent && workflowStep >= 2 && activeTab === "criar" && (
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-[18px] font-semibold text-slate-900">Agente preparado</h3>
              <p className="mt-1 text-[13px] text-slate-500">
                {createdAgent.nome} foi criado para a vaga {createdAgent.vagaTitulo}. Agora ele esta pronto para operar em segundo plano.
              </p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">Pronto para ativar</span>
          </div>
        </div>
      )}
    </div>
  );
}
