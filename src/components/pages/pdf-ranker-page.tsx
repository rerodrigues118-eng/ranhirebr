"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { Job, Candidate, UploadFile } from "@/lib/types";
import {
  UploadCloud,
  RefreshCw,
  Filter,
  FileText,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";

interface PdfCriterion {
  id?: string;
  nome: string;
  peso: number;
  _tempId?: string; // local only, for rendering
}

interface PdfRankerPageProps {
  activeJob: Job;
  candidates: Candidate[];
  uploads: UploadFile[];
  isUploading: boolean;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onSelectCandidate: (c: Candidate) => void;
  quota?: {
    isAdmin: boolean;
    used: number;
    limit: number | null;
    remaining: number | null;
    plano: string;
    mes: string;
  } | null;
}

/* ── Status helpers ──────────────────────────────────────── */
function statusLabel(status: UploadFile["status"]) {
  switch (status) {
    case "completed": return "Triado ✓";
    case "extracting":
    case "scoring": return "Executando";
    case "failed": return "Falhou";
    default: return "Aguardando";
  }
}

function statusColor(status: UploadFile["status"]) {
  if (status === "completed") return "text-[#059669] bg-[rgba(6,214,160,0.1)]";
  if (status === "failed") return "text-red-600 bg-red-50";
  return "text-[#00B4D8] bg-[rgba(0,180,216,0.1)]";
}

function barColor(status: UploadFile["status"]) {
  if (status === "completed") return "var(--green)";
  return "var(--cyan)";
}

const SUGGESTED_CRITERIA: { nome: string; peso: number }[] = [
  { nome: "Experiência na área", peso: 3 },
  { nome: "Formação acadêmica", peso: 3 },
  { nome: "Habilidades técnicas", peso: 3 },
  { nome: "Idiomas", peso: 3 },
  { nome: "Fit cultural", peso: 3 },
];

let localTempId = 0;
function nextTempId() {
  return `new-${++localTempId}`;
}

type ToastType = "success" | "error" | "info";
interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

export default function PdfRankerPage({
  activeJob,
  candidates,
  uploads,
  isUploading,
  onFileUpload,
  fileInputRef,
  onSelectCandidate,
  quota,
}: PdfRankerPageProps) {
  const [activeTab, setActiveTab] = useState<"triagem" | "funil">("triagem");
  const [criteria, setCriteria] = useState<PdfCriterion[]>([]);
  const [isLoadingCriteria, setIsLoadingCriteria] = useState(false);
  const [isSavingCriteria, setIsSavingCriteria] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  const topCandidates = [...candidates].sort((a, b) => b.score - a.score);

  /* ── Toast helpers ────────────────────────── */
  const showToast = useCallback((type: ToastType, message: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  /* ── Load criteria when switching to Funil tab ── */
  useEffect(() => {
    if (activeTab === "funil" && activeJob?.id) {
      fetchCriteria();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, activeJob?.id]);
  const fetchCriteria = async () => {
    setIsLoadingCriteria(true);
    try {
      const res = await fetch(`/api/vagas/${activeJob.id}/criteria`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.criteria)) {
        setCriteria(
          data.criteria.map((c: { id: string; nome?: string | null; peso?: number | null }) => ({
            id: c.id,
            nome: c.nome ?? "",
            peso: c.peso ?? 3,
          }))
        );
      } else {
        showToast("error", "Erro ao carregar critérios da vaga.");
      }
    } catch {
      showToast("error", "Falha de conexão ao carregar critérios.");
    } finally {
      setIsLoadingCriteria(false);
    }
  };

  const handleAddCriteria = (nome: string = "", peso: number = 3) => {
    setCriteria((prev) => [
      ...prev,
      { nome, peso, _tempId: nextTempId() },
    ]);
  };

  const handleRemoveCriteria = (index: number) => {
    setCriteria((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateCriteria = (index: number, field: "nome" | "peso", value: string | number) => {
    setCriteria((prev) =>
      prev.map((c, i) =>
        i === index ? { ...c, [field]: field === "peso" ? Number(value) : value } : c
      )
    );
  };

  const handleSaveCriteria = async () => {
    const valid = criteria.filter((c) => c.nome && c.nome.trim());
    if (valid.length === 0) {
      showToast("error", "Adicione pelo menos um critério antes de salvar.");
      return;
    }

    setIsSavingCriteria(true);
    try {
      const res = await fetch(`/api/vagas/${activeJob.id}/criteria`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          criteria: valid.map((c) => ({
            id: c.id,
            nome: c.nome.trim(),
            peso: c.peso,
          })),
        }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.criteria)) {
        setCriteria(
          data.criteria.map((c: { id: string; nome?: string | null; peso?: number | null }) => ({
            id: c.id,
            nome: c.nome ?? "",
            peso: c.peso ?? 3,
          }))
        );
        showToast("success", "Critérios do funil salvos com sucesso!");
      } else {
        showToast("error", data.error || "Erro ao salvar critérios.");
      }
    } catch {
      showToast("error", "Falha de conexão ao salvar critérios.");
    } finally {
      setIsSavingCriteria(false);
    }
  };

  const suggestionsToShow = SUGGESTED_CRITERIA.filter(
    (s) => !criteria.some((c) => (c.nome || "").toLowerCase() === s.nome.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-2 pb-10">
      {/* ── Toast notifications ─────────────────── */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-2 px-4 py-3 rounded-[10px] shadow-lg text-[13px] font-medium pointer-events-auto transition-all duration-300 ${
              toast.type === "success"
                ? "bg-[#E6FAF4] text-[#059669] border border-[#A7F3D0]"
                : toast.type === "error"
                ? "bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]"
                : "bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : toast.type === "error" ? (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" />
            )}
            {toast.message}
          </div>
        ))}
      </div>

      {/* ── Page header ─────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold text-[#111827] tracking-tight">PDF Ranker</h1>
          <p className="text-[14px] text-[#6B7280] mt-1">
            Faça upload de currículos em massa. A IA extrairá os dados e fará o match com a vaga{" "}
            <strong>{activeJob.title}</strong>.
          </p>
        </div>
        {quota && (
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-sm flex items-center gap-4 text-sm max-w-sm">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
              {quota.isAdmin ? "∞" : (quota.remaining ?? "∞")}
            </div>
            <div>
              <p className="font-semibold text-gray-900 leading-tight">
                {quota.isAdmin ? "Exportações Ilimitadas" : `${quota.used} de ${quota.limit} exportadas`}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {quota.isAdmin ? `Acesso Admin · Plano ${quota.plano}` : `Plano ${quota.plano} · Mês de ${quota.mes}`}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Tabs ──────────────────────────────────── */}
      <div className="flex gap-1 bg-[#F3F4F6] rounded-[10px] p-1 w-fit">
        <button
          onClick={() => setActiveTab("triagem")}
          className={`flex items-center gap-2 px-4 py-2 rounded-[8px] text-[13px] font-medium transition-all duration-200 ${
            activeTab === "triagem"
              ? "bg-white text-[#111827] shadow-sm"
              : "text-[#6B7280] hover:text-[#374151]"
          }`}
        >
          <FileText className="w-4 h-4" />
          Triagem de PDFs
        </button>
        <button
          onClick={() => setActiveTab("funil")}
          className={`flex items-center gap-2 px-4 py-2 rounded-[8px] text-[13px] font-medium transition-all duration-200 ${
            activeTab === "funil"
              ? "bg-white text-[#111827] shadow-sm"
              : "text-[#6B7280] hover:text-[#374151]"
          }`}
        >
          <Filter className="w-4 h-4" />
          Funil de Critérios
        </button>
      </div>

      {/* ══════════════════════════════════════════════ */}
      {/* ── TAB: TRIAGEM DE PDFs ───────────────────── */}
      {/* ══════════════════════════════════════════════ */}
      {activeTab === "triagem" && (
        <>
          {/* ── Upload drop zone ────────────────────── */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-[12px] p-12 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-200 border-2 border-dashed border-[#D1D5DB] hover:border-[#06D6A0] bg-[#FFFFFF] group"
          >
            <div className="w-14 h-14 rounded-full bg-[#F3F4F6] flex items-center justify-center transition-colors group-hover:bg-[rgba(6,214,160,0.1)]">
              <UploadCloud
                className="w-6 h-6 text-[#9CA3AF] group-hover:text-[#06D6A0] transition-colors"
                strokeWidth={1.5}
              />
            </div>
            <div className="text-center">
              <p className="text-[15px] font-medium text-[#111827]">
                Arraste currículos em PDF ou clique para selecionar
              </p>
              <p className="text-[13px] text-[#6B7280] mt-1">
                Aceita múltiplos arquivos · Formato .pdf
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf"
              className="hidden"
              onChange={onFileUpload}
            />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* ── Processing queue ──────────────────── */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[16px] font-semibold text-[#111827] flex items-center gap-2">
                  Fila de Processamento
                  {isUploading && (
                    <RefreshCw className="w-4 h-4 text-[#06D6A0] animate-spin" />
                  )}
                </h2>
                <span className="text-[13px] text-[#6B7280]">
                  {uploads.length} arquivo{uploads.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="bg-[#FFFFFF] rounded-[12px] p-5 flex-1" style={{ border: "1px solid #E5E7EB" }}>
                {uploads.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-[#9CA3AF] text-[13px] py-10">
                    Nenhum upload em andamento
                  </div>
                ) : (
                  <div className="space-y-4">
                    {uploads.map((file, idx) => {
                      const isActive = file.status === "extracting" || file.status === "scoring";
                      return (
                        <div key={idx}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <p className="text-[13px] font-medium text-[#111827] truncate">
                                {file.name}
                              </p>
                              <span className="text-[11px] text-[#9CA3AF] flex-shrink-0">
                                {file.size}
                              </span>
                            </div>
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-[4px] font-medium flex-shrink-0 ${statusColor(file.status)} ${isActive ? "animate-pulse" : ""}`}
                            >
                              {statusLabel(file.status)}
                            </span>
                          </div>
                          <div className="h-[4px] bg-[#F3F4F6] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${isActive ? "animate-pulse" : ""}`}
                              style={{
                                width: `${file.progress}%`,
                                backgroundColor: barColor(file.status),
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── Results preview ───────────────────── */}
            <div className="flex flex-col">
              <h2 className="text-[16px] font-semibold text-[#111827] mb-4">
                Resultados da Triagem
              </h2>

              <div className="bg-[#FFFFFF] rounded-[12px] p-5 flex-1" style={{ border: "1px solid #E5E7EB" }}>
                {topCandidates.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-[#9CA3AF] text-[13px] py-10">
                    Os candidatos aparecerão aqui
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topCandidates.map((c) => {
                      const firstTag = c.confirmedTags[0] || c.partialTags[0] || c.otherTags[0];
                      return (
                        <div
                          key={c.id}
                          onClick={() => onSelectCandidate(c)}
                          className="flex items-center justify-between p-3 rounded-[8px] hover:bg-[#F9FAFB] transition-colors cursor-pointer border border-[#E5E7EB]"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0"
                              style={{ backgroundColor: c.avatarColor + "15", color: c.avatarColor }}
                            >
                              {c.initials}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium text-[#111827] truncate">
                                {c.name}
                              </p>
                              <p className="text-[12px] text-[#6B7280] truncate">
                                {c.role} · {c.company}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                            {firstTag && (
                              <span className="bg-[#F3F4F6] text-[#4B5563] px-2 py-0.5 rounded-[4px] text-[11px] font-medium">
                                {firstTag}
                              </span>
                            )}
                            <div className="inline-flex items-center bg-[#FEF9C3] px-2 py-0.5 rounded border border-[#FEF08A]">
                              <span className="text-[13px] font-semibold text-[#854D0E]">
                                {c.score > 0 ? c.score.toFixed(1) : "—"}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════ */}
      {/* ── TAB: FUNIL DE CRITÉRIOS ──────────────── */}
      {/* ══════════════════════════════════════════════ */}
      {activeTab === "funil" && (
        <div className="space-y-6">
          {/* Info banner */}
          <div className="flex items-start gap-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-[10px] px-4 py-3">
            <AlertCircle className="w-4 h-4 text-[#1D4ED8] flex-shrink-0 mt-0.5" />
            <p className="text-[13px] text-[#1E40AF] leading-relaxed">
              Configure os critérios e pesos que a IA usará para analisar e pontuar os currículos da vaga{" "}
              <strong>{activeJob.title}</strong>. Pesos maiores aumentam a relevância do critério no score final.
            </p>
          </div>

          {/* Criteria card */}
          <div className="bg-white rounded-[12px] p-6" style={{ border: "1px solid #E5E7EB" }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-[15px] font-semibold text-[#111827]">Critérios de Avaliação</h2>
                <p className="text-[12px] text-[#6B7280] mt-0.5">
                  Escala de peso de 1 (baixo) a 5 (essencial)
                </p>
              </div>
              <button
                onClick={() => handleAddCriteria()}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#EFF6FF] text-[#1D4ED8] hover:bg-[#1D4ED8] hover:text-white rounded-[8px] text-[13px] font-medium transition-all duration-200"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar critério
              </button>
            </div>

            {isLoadingCriteria ? (
              <div className="flex items-center justify-center py-12 gap-2 text-[#6B7280]">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-[13px]">Carregando critérios...</span>
              </div>
            ) : criteria.length === 0 ? (
              <div className="text-center py-10 text-[#9CA3AF]">
                <Filter className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-[14px] font-medium text-[#6B7280] mb-1">Nenhum critério configurado</p>
                <p className="text-[12px]">Adicione critérios ou use as sugestões abaixo.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {criteria.map((crit, index) => (
                  <div
                    key={crit.id || crit._tempId}
                    className="flex items-center gap-3 group"
                  >
                    {/* Name input */}
                    <input
                      type="text"
                      value={crit.nome}
                      onChange={(e) => handleUpdateCriteria(index, "nome", e.target.value)}
                      placeholder="Nome do critério…"
                      className="flex-1 text-[13px] text-[#111827] px-3 py-2 rounded-[8px] border border-[#E5E7EB] bg-[#FAFAFA] focus:outline-none focus:border-[#1D4ED8] focus:ring-1 focus:ring-[#1D4ED8] transition-all"
                    />

                    {/* Weight selector */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[12px] text-[#6B7280] font-medium">Peso</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((w) => (
                          <button
                            key={w}
                            onClick={() => handleUpdateCriteria(index, "peso", w)}
                            className={`w-7 h-7 rounded-[6px] text-[12px] font-semibold transition-all duration-150 ${
                              crit.peso === w
                                ? "bg-[#1D4ED8] text-white shadow-sm"
                                : "bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]"
                            }`}
                          >
                            {w}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Remove button */}
                    <button
                      onClick={() => handleRemoveCriteria(index)}
                      className="p-1.5 text-[#D1D5DB] hover:text-[#EF4444] hover:bg-[#FEF2F2] rounded-[6px] transition-all opacity-0 group-hover:opacity-100"
                      title="Remover critério"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Save button */}
            <div className="flex justify-end mt-6 pt-5 border-t border-[#F3F4F6]">
              <button
                onClick={handleSaveCriteria}
                disabled={isSavingCriteria}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#111827] hover:bg-[#1F2937] disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-[8px] text-[13px] font-semibold transition-all duration-200 shadow-sm"
              >
                {isSavingCriteria ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Salvar configurações do funil
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Suggested criteria chips */}
          {suggestionsToShow.length > 0 && (
            <div>
              <p className="text-[12px] font-medium text-[#6B7280] mb-2">Sugestões rápidas:</p>
              <div className="flex flex-wrap gap-2">
                {suggestionsToShow.map((s) => (
                  <button
                    key={s.nome}
                    onClick={() => handleAddCriteria(s.nome, s.peso)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F9FAFB] border border-[#E5E7EB] hover:border-[#1D4ED8] hover:bg-[#EFF6FF] hover:text-[#1D4ED8] text-[#374151] rounded-full text-[12px] font-medium transition-all duration-200"
                  >
                    <Plus className="w-3 h-3" />
                    {s.nome}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Preview of weights */}
          {criteria.filter((c) => c.nome && c.nome.trim()).length > 0 && (
            <div className="bg-[#F9FAFB] rounded-[10px] p-4" style={{ border: "1px solid #E5E7EB" }}>
              <p className="text-[12px] font-semibold text-[#374151] uppercase tracking-wider mb-3">
                Pré-visualização da ponderação
              </p>
              <div className="space-y-2">
                {criteria
                  .filter((c) => c.nome && c.nome.trim())
                  .map((c, i) => {
                    const totalPeso = criteria.filter((x) => x.nome && x.nome.trim()).reduce((sum, x) => sum + x.peso, 0);
                    const pct = totalPeso > 0 ? Math.round((c.peso / totalPeso) * 100) : 0;
                    return (
                      <div key={c.id || c._tempId || i} className="flex items-center gap-3">
                        <span className="text-[12px] text-[#374151] flex-1 truncate">{c.nome}</span>
                        <div className="w-24 h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#1D4ED8] rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-[#6B7280] w-8 text-right font-medium">{pct}%</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
