"use client";

import React, { useState, useEffect, useRef } from "react";
import type { Candidate, Job } from "@/lib/types";
import { AVATAR_COLORS } from "@/lib/mock-data";
import { 
  RefreshCw, ExternalLink, Plus, AlertCircle, SlidersHorizontal,
  Sparkles, Eye, EyeOff, ArrowUp
} from "lucide-react";
import AdvancedFiltersDrawer, { type AdvancedSearchFilters } from "../AdvancedFiltersDrawer";
import LinkedinPreviewDrawer, { type LinkedinProfile } from "../LinkedinPreviewDrawer";

interface LinkedinPageProps {
  activeJob: Job;
  onImportCandidate: (candidate: Candidate) => void;
}

interface Criterio {
  id: string;
  nome: string;
  descricao: string;
  peso: number;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'ai-loading' | 'ai-criterios' | 'ai-results' | 'ai-error';
  content?: string;
  criterios?: Criterio[];
  filtros?: { job_titles?: string[]; location?: string; keywords?: string[] };
  results?: LinkedinProfile[];
  isMock?: boolean;
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase() || "??";
}

function ScoreGauge({ score, size = 44 }: { score: number; size?: number }) {
  const r = size / 2 - 5;
  const cx = size / 2, cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - ((score - 1) / 4));
  const color = score >= 4 ? '#10b981' : score >= 3 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth="4" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={circumference} strokeDashoffset={dashOffset}
        strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} />
      <text x={cx} y={cy + 4} textAnchor="middle" fill={color} fontSize="11" fontWeight="bold">
        {score.toFixed(1)}
      </text>
    </svg>
  );
}

async function scoreCandidatesInBatches(profiles: LinkedinProfile[], criterios: Criterio[]) {
  const BATCH = 5;
  const out = [...profiles];
  for (let i = 0; i < profiles.length; i += BATCH) {
    const batch = profiles.slice(i, i + BATCH);
    const scored = await Promise.all(batch.map(async (p) => {
      try {
        const res = await fetch('/api/candidate-scoring', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ criterios, perfil: p })
        });
        if (!res.ok) return p;
        const d = await res.json();
        return { ...p, score_final: d.score_final, criterios_avaliados: d.criterios, resumo: d.resumo || p.resumo };
      } catch { return p; }
    }));
    scored.forEach((p, bi) => { out[i + bi] = p; });
    if (i + BATCH < profiles.length) await new Promise(r => setTimeout(r, 500));
  }
  return out;
}

const SUGESTOES = [
  "Designer de Email com Figma, inglês fluente, agências digitais",
  "Dev React Sênior, fintech, 5+ anos, São Paulo",
  "Gerente de Vendas B2B, SaaS, Sul do Brasil",
  "Analista de Marketing Digital, SEO, e-commerce",
];

function hasActiveFilters(filters: Record<string, unknown>): boolean {
  return Object.keys(filters).some(k => {
    const v = filters[k];
    return Array.isArray(v) ? v.length > 0 : Boolean(v);
  });
}

function FilterButton({ size = 'md', activeFilters, onOpen }: { size?: 'sm' | 'md'; activeFilters: Record<string, unknown>; onOpen: () => void }) {
  const active = hasActiveFilters(activeFilters);
  const sm = size === 'sm';
  return (
    <button
      onClick={onOpen}
      className={`flex items-center gap-2 border rounded-xl font-medium transition-all
        ${active ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700'}
        ${sm ? 'px-2.5 py-1.5 text-[11px]' : 'px-3 py-2 text-[12px]'}`}
    >
      <SlidersHorizontal className={sm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      Filtros avançados
      {active && (
        <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">
          ✓
        </span>
      )}
    </button>
  );
}

export default function LinkedinPage({ activeJob, onImportCandidate }: LinkedinPageProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasStarted, setHasStarted] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const [criterios, setCriterios] = useState<Criterio[]>([]);
  const [activeFilters, setActiveFilters] = useState<Record<string, unknown>>({});
  const setAdvancedFilters = (f: AdvancedSearchFilters) => setActiveFilters(f as unknown as Record<string, unknown>);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<LinkedinProfile | null>(null);
  const [urlsVistas, setUrlsVistas] = useState<Set<string>>(new Set());
  const [ocultarVistos, setOcultarVistos] = useState(false);
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch('/api/perfis-vistos').then(r => r.json())
      .then(d => { if (d.vistos) setUrlsVistas(new Set(d.vistos)); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (hasStarted) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [messages, hasStarted]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [input]);

  async function handleSubmit() {
    if (!input.trim() || isAnalyzing) return;
    const userText = input.trim();
    setInput("");
    setHasStarted(true);

    const userMsgId = `user-${Date.now()}`;
    const loadingId = `loading-${Date.now()}`;

    setMessages(prev => [
      ...prev,
      { id: userMsgId, type: 'user', content: userText },
      { id: loadingId, type: 'ai-loading' },
    ]);
    setIsAnalyzing(true);

    try {
      const res = await fetch('/api/nl-to-filters', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: userText, mode: 'nl' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao analisar');

      const novoCriterios: Criterio[] = (data.criterios || []).map((c: { nome: string; descricao: string; peso: number }, i: number) => ({
        id: `c${i}`, nome: c.nome, descricao: c.descricao, peso: c.peso,
      }));
      const novosFiltros: Record<string, unknown> = {
        job_titles: data.filtros_sugeridos?.job_titles || [],
        location: data.filtros_sugeridos?.localizacao || '',
        keywords: data.filtros_sugeridos?.keywords || [],
        booleanExpr: data.filtros_sugeridos?.boolean_expression || '',
        minYears: data.filtros_sugeridos?.experiencia_minima?.toString() || '',
        maxYears: data.filtros_sugeridos?.experiencia_maxima?.toString() || '',
        idiomas: data.filtros_sugeridos?.idiomas || [],
      };

      setCriterios(novoCriterios);
      setActiveFilters(novosFiltros);

      setMessages(prev => prev.map(m =>
        m.id === loadingId
          ? { id: loadingId, type: 'ai-criterios', criterios: novoCriterios, filtros: novosFiltros }
          : m
      ));
      setIsAnalyzing(false);
      await runSearch(novosFiltros, novoCriterios);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao analisar';
      setMessages(prev => prev.map(m =>
        m.id === loadingId ? { id: loadingId, type: 'ai-error', content: errorMessage } : m
      ));
      setIsAnalyzing(false);
    }
  }

  async function runSearch(filters: Record<string, unknown>, crits: Criterio[]) {
    const searchMsgId = `search-${Date.now()}`;
    setIsSearching(true);
    setMessages(prev => [...prev, { id: searchMsgId, type: 'ai-loading' }]);

    try {
      const res = await fetch('/api/linkedin-search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro na busca');

      let perfis: LinkedinProfile[] = (data.results || []).map((r: LinkedinProfile) => ({
        ...r, jaVisto: urlsVistas.has(r.linkedinUrl),
      }));

      perfis.sort((a, b) => {
        if (a.jaVisto && !b.jaVisto) return 1;
        if (!a.jaVisto && b.jaVisto) return -1;
        return (b.experiencia_anos || 0) - (a.experiencia_anos || 0);
      });

      setMessages(prev => prev.map(m =>
        m.id === searchMsgId
          ? { id: searchMsgId, type: 'ai-results', results: perfis, isMock: data.isMock }
          : m
      ));
      setIsSearching(false);

      if (crits.length > 0) {
        setIsScoring(true);
        scoreCandidatesInBatches(perfis, crits).then(scored => {
          const sortedScored = [...scored].sort((a, b) => (b.score_final || 0) - (a.score_final || 0));
          setMessages(prev => prev.map(m =>
            m.id === searchMsgId ? { ...m, results: sortedScored } : m
          ));
        }).finally(() => setIsScoring(false));
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro na busca';
      setMessages(prev => prev.map(m =>
        m.id === searchMsgId ? { id: searchMsgId, type: 'ai-error', content: errorMessage } : m
      ));
      setIsSearching(false);
    }
  }

  function handleImport(r: LinkedinProfile) {
    const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    onImportCandidate({
      id: `linkedin-${r.id}-${Date.now()}`,
      name: r.name, role: r.headline, company: r.company, city: r.location,
      score: r.score_final ? Math.round(r.score_final * 10) / 10 : 0,
      avatarColor: color, initials: getInitials(r.name),
      confirmedTags: r.skills?.slice(0, 3) || [], partialTags: [], otherTags: [],
      shortlist: false, status: "triado", linkedinUrl: r.linkedinUrl,
    });
    setImportedIds(prev => new Set(prev).add(r.id));
  }

  const notaColor = (n: number) => n >= 4 ? 'text-emerald-600 bg-emerald-50' : n >= 3 ? 'text-amber-600 bg-amber-50' : 'text-red-500 bg-red-50';

  function renderMessage(msg: ChatMessage) {
    if (msg.type === 'user') {
      return (
        <div key={msg.id} className="flex justify-end mb-6">
          <div className="max-w-[70%] bg-indigo-600 text-white px-4 py-3 rounded-2xl rounded-tr-sm text-[14px] leading-relaxed shadow-sm">
            {msg.content}
          </div>
        </div>
      );
    }

    if (msg.type === 'ai-loading') {
      return (
        <div key={msg.id} className="flex items-start gap-3 mb-6">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      );
    }

    if (msg.type === 'ai-error') {
      return (
        <div key={msg.id} className="flex items-start gap-3 mb-6">
          <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-4 h-4 text-white" />
          </div>
          <div className="bg-red-50 border border-red-200 rounded-2xl rounded-tl-sm px-4 py-3 text-red-700 text-[13px]">
            {msg.content || 'Ocorreu um erro. Tente novamente.'}
          </div>
        </div>
      );
    }

    if (msg.type === 'ai-criterios') {
      return (
        <div key={msg.id} className="flex items-start gap-3 mb-6">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 max-w-[85%] space-y-3">
            <p className="text-[13px] text-gray-500">
              Analisei o perfil e identifiquei <strong className="text-gray-800">{msg.criterios?.length} critérios</strong> de avaliação. Iniciando busca...
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {msg.criterios?.map((c, i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-xl px-3 py-2.5 shadow-sm flex items-start gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{c.peso}</div>
                  <div>
                    <p className="text-[13px] font-semibold text-gray-800">{c.nome}</p>
                    <p className="text-[11px] text-gray-400 leading-tight mt-0.5">{c.descricao}</p>
                  </div>
                </div>
              ))}
            </div>
            {msg.filtros?.job_titles && msg.filtros.job_titles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[11px] text-gray-400">Buscando por:</span>
                {msg.filtros.job_titles.map((t: string) => (
                  <span key={t} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-[11px] font-medium">{t}</span>
                ))}
                {msg.filtros.location && (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[11px]">📍 {msg.filtros.location}</span>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (msg.type === 'ai-results') {
      const results = msg.results || [];
      const visibleResults = ocultarVistos ? results.filter(r => !r.jaVisto) : results;
      const hiddenCount = results.filter(r => r.jaVisto).length;

      return (
        <div key={msg.id} className="flex items-start gap-3 mb-6">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 max-w-[90%]">
            {msg.isMock && (
              <div className="flex items-center gap-1.5 mb-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-[12px] text-amber-700">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                Resultados de demonstração — configure APIFY_TOKEN para buscas reais.
              </div>
            )}
            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-semibold text-gray-900">
                    {results.length} candidatos encontrados
                    {isScoring && <span className="ml-2 text-[11px] text-indigo-500 font-normal">• Ranqueando com IA...</span>}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {criterios.length > 0 ? 'Ordenados por score de compatibilidade' : 'Mais recentes primeiro'}
                  </p>
                </div>
                {hiddenCount > 0 && (
                  <button
                    onClick={() => setOcultarVistos(!ocultarVistos)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-colors ${ocultarVistos ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                  >
                    {ocultarVistos ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {ocultarVistos ? 'Mostrar todos' : `Ocultar vistos (${hiddenCount})`}
                  </button>
                )}
              </div>
              <div className="divide-y divide-gray-50">
                {visibleResults.map((r, idx) => {
                  const isImported = importedIds.has(r.id);
                  const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                  return (
                    <div
                      key={r.id}
                      className={`flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer group ${r.jaVisto ? 'opacity-60' : ''}`}
                      onClick={() => setSelectedProfile(r)}
                    >
                      {r.score_final ? <ScoreGauge score={r.score_final} /> : (
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0" style={{ backgroundColor: color + '20', color }}>
                          {getInitials(r.name)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-semibold text-gray-900 truncate">{r.name}</p>
                          {r.jaVisto && <span className="px-1.5 py-0.5 bg-gray-100 text-gray-400 text-[10px] rounded-full flex-shrink-0">Visto</span>}
                        </div>
                        <p className="text-[11px] text-gray-500 truncate">{r.headline}{r.company ? ` · ${r.company}` : ''}</p>
                        {r.criterios_avaliados && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {r.criterios_avaliados.slice(0, 3).map((c, i) => (
                              <span key={i} className={`px-1.5 py-0.5 text-[10px] rounded-full font-medium ${notaColor(c.nota)}`}>
                                {c.nome.split(' ')[0]}: {c.nota.toFixed(1)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <a
                          href={r.linkedinUrl} target="_blank" rel="noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={e => { e.stopPropagation(); handleImport(r); }}
                          disabled={isImported}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${isImported ? 'bg-emerald-50 text-emerald-600' : 'border border-gray-200 text-gray-600 hover:border-emerald-300 hover:text-emerald-600'}`}
                        >
                          <Plus className="w-3 h-3" />{isImported ? 'Importado' : 'Importar'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  }

  // ── Botão de filtros reutilizável ─────────────────────────────────────────
  function FilterButton({ size = 'md' }: { size?: 'sm' | 'md' }) {
    const active = hasActiveFilters(activeFilters);
    const sm = size === 'sm';
    return (
      <button
        onClick={() => setIsFiltersOpen(true)}
        className={`flex items-center gap-2 border rounded-xl font-medium transition-all
          ${active ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700'}
          ${sm ? 'px-2.5 py-1.5 text-[11px]' : 'px-3 py-2 text-[12px]'}`}
      >
        <SlidersHorizontal className={sm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        Filtros avançados
        {active && (
          <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">
            ✓
          </span>
        )}
      </button>
    );
  }

  // ── ESTADO INICIAL — Centralizado ──────────────────────────────────────────
  if (!hasStarted) {
    return (
      <div className="relative flex min-h-[calc(100vh-120px)] flex-col items-center justify-center px-4">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-1/2 top-14 h-64 w-64 -translate-x-1/2 rounded-full bg-indigo-200/20 blur-3xl" />
          <div className="absolute right-12 top-24 h-48 w-48 rounded-full bg-violet-200/20 blur-3xl" />
          <div className="absolute bottom-10 left-10 h-40 w-40 rounded-full bg-sky-200/20 blur-3xl" />
        </div>

        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/90 px-3.5 py-1.5 text-[12px] font-medium text-indigo-700 shadow-sm backdrop-blur">
          <Sparkles className="w-3.5 h-3.5" />
          Busca com IA em linguagem natural
        </div>

        <h1 className="mb-3 max-w-2xl text-center text-[30px] font-semibold tracking-tight text-gray-900 sm:text-[34px]">
          Quem você está buscando hoje?
        </h1>
        <p className="mb-8 max-w-lg text-center text-[14px] leading-6 text-gray-500">
          Descreva o perfil ideal em linguagem natural e a IA extrai os critérios, aplica filtros e busca os melhores candidatos no LinkedIn.
        </p>

        <div className="mb-5 flex max-w-[760px] flex-wrap items-center justify-center gap-2 text-[11px] text-gray-500">
          <span className="rounded-full border border-gray-200 bg-white px-3 py-1 shadow-sm">Briefing livre</span>
          <span className="rounded-full border border-gray-200 bg-white px-3 py-1 shadow-sm">IA gera filtros</span>
          <span className="rounded-full border border-gray-200 bg-white px-3 py-1 shadow-sm">Score e priorização</span>
        </div>

        {/* Input box */}
        <div className="w-full max-w-[760px] overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)] ring-1 ring-white/70">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
            placeholder="Ex: Designer de Email com Figma e CRM, inglês fluente, passagem por agências..."
            rows={3}
            className="w-full resize-none bg-transparent px-6 pt-5 pb-3 text-[15px] leading-relaxed text-gray-900 outline-none placeholder:text-gray-400"
          />
            <div className="flex items-center justify-between border-t border-gray-100/80 bg-gradient-to-r from-gray-50/80 via-white to-gray-50/80 px-4 py-3">
            <FilterButton activeFilters={activeFilters} onOpen={() => setIsFiltersOpen(true)} />
            <button
              onClick={handleSubmit}
              disabled={!input.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-sm transition-colors hover:from-indigo-700 hover:to-violet-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:from-gray-200 disabled:to-gray-200"
            >
              <ArrowUp className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>

        {/* Sugestões */}
        <div className="mt-5 flex max-w-[760px] flex-wrap justify-center gap-2">
          {SUGESTOES.map((s, i) => (
            <button
              key={i}
              onClick={() => setInput(s)}
              className="rounded-full border border-gray-200 bg-white px-3.5 py-2 text-[12px] text-gray-600 shadow-sm transition-all hover:-translate-y-[1px] hover:border-indigo-300 hover:text-indigo-700 hover:shadow-md"
            >
              {s}
            </button>
          ))}
        </div>

        <AdvancedFiltersDrawer
          isOpen={isFiltersOpen}
          onClose={() => setIsFiltersOpen(false)}
          onSearch={f => { setAdvancedFilters(f); setIsFiltersOpen(false); }}
        />
      </div>
    );
  }

  // ── ESTADO ATIVO — Chat expandido ──────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-80px)] relative">

      {/* Área de mensagens */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[860px] mx-auto px-4 pt-6 pb-4">
          {messages.map(renderMessage)}
          {isScoring && (
            <div className="flex items-center gap-2 text-[12px] text-indigo-600 mb-4 pl-11">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Avaliando candidatos com IA...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input fixo no rodapé */}
      <div className="border-t border-gray-100 bg-white/95 backdrop-blur-sm px-4 py-3">
        <div className="max-w-[860px] mx-auto">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              placeholder="Refine a busca ou descreva outro perfil..."
              rows={1}
              disabled={isAnalyzing || isSearching}
              className="w-full px-4 pt-3 pb-2 text-[14px] text-gray-900 resize-none outline-none placeholder:text-gray-400 bg-transparent leading-relaxed disabled:opacity-50"
            />
              <div className="flex items-center justify-between px-3 pb-2.5 border-t border-gray-100 pt-2">
              <FilterButton size="sm" activeFilters={activeFilters} onOpen={() => setIsFiltersOpen(true)} />
              <button
                onClick={handleSubmit}
                disabled={!input.trim() || isAnalyzing || isSearching}
                className="w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              >
                {isAnalyzing || isSearching
                  ? <RefreshCw className="w-3.5 h-3.5 text-white animate-spin" />
                  : <ArrowUp className="w-3.5 h-3.5 text-white" />}
              </button>
            </div>
          </div>
          <p className="text-center text-[11px] text-gray-300 mt-2">
            A IA pode cometer erros — verifique informações importantes.
          </p>
        </div>
      </div>

      {/* Drawers */}
      <AdvancedFiltersDrawer
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        onSearch={f => { setAdvancedFilters(f); setIsFiltersOpen(false); runSearch(f as unknown as Record<string, unknown>, criterios); }}
      />
      <LinkedinPreviewDrawer
        profile={selectedProfile}
        onClose={() => {
          if (selectedProfile) {
            setUrlsVistas(prev => new Set(prev).add(selectedProfile.linkedinUrl));
            setMessages(prev => prev.map(m =>
              m.type === 'ai-results'
                ? { ...m, results: m.results?.map(r => r.linkedinUrl === selectedProfile.linkedinUrl ? { ...r, jaVisto: true } : r) }
                : m
            ));
          }
          setSelectedProfile(null);
        }}
        onShortlist={p => { handleImport(p); setSelectedProfile(null); }}
        onAddPipeline={p => { handleImport(p); setSelectedProfile(null); }}
        onHide={p => {
          setMessages(prev => prev.map(m =>
            m.type === 'ai-results'
              ? { ...m, results: m.results?.map(r => r.id === p.id ? { ...r, jaVisto: true } : r) }
              : m
          ));
        }}
      />
    </div>
  );
}
