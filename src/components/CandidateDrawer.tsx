import React, { useState, useEffect, useCallback, useRef } from "react";
import type { Candidate, KanbanStatus } from "@/lib/types";
import { getAvatarBg } from "@/lib/mock-data";
import {
  X, ExternalLink, Star, ChevronDown, ChevronUp, MapPin, Building, Briefcase,
  Mail, Phone, CircleDollarSign, Calendar, FileText, Edit2, Check, History, Link as LinkIcon,
  CheckCircle2, User, type LucideIcon, Loader2, AlertCircle, Sparkles,
} from "lucide-react";

interface CandidateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate | null;
  onToggleShortlist: (id: string) => void;
  onMoveCandidate: (id: string, newStatus: KanbanStatus) => void;
  onUpdateCandidate?: (updated: Candidate) => void;
  quota?: {
    isAdmin: boolean;
    used: number;
    limit: number | null;
    remaining: number | null;
    plano: string;
    mes: string;
  } | null;
  onExportSuccess?: () => void;
}

type ToastType = "success" | "error";

interface EditableFieldProps {
  label: string;
  icon: LucideIcon;
  fieldKey: keyof Candidate;
  value?: string;
  isTextArea?: boolean;
  editingField: string | null;
  editValue: string;
  savingField: string | null;
  onChangeEditValue: (value: string) => void;
  onStartEdit: (field: keyof Candidate, value: string) => void;
  onCancelEdit: () => void;
  onSaveField: (field: keyof Candidate) => void;
}

function EditableField({
  label,
  icon: Icon,
  fieldKey,
  value,
  isTextArea = false,
  editingField,
  editValue,
  savingField,
  onChangeEditValue,
  onStartEdit,
  onCancelEdit,
  onSaveField,
}: EditableFieldProps) {
  const isEditing = editingField === fieldKey;
  const isSaving = savingField === String(fieldKey);

  return (
    <div className="flex flex-col gap-1.5 mb-4 group">
      <span className="text-xs text-gray-500 font-medium flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" /> {label}
      </span>
      {isEditing ? (
        <div className="flex flex-col gap-2">
          {isTextArea ? (
            <textarea
              autoFocus
              value={editValue}
              onChange={(e) => onChangeEditValue(e.target.value)}
              className="text-sm text-gray-900 border border-blue-500 rounded px-2 py-1 outline-none w-full min-h-[80px]"
              onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) onSaveField(fieldKey); }}
            />
          ) : (
            <input
              autoFocus
              type="text"
              value={editValue}
              onChange={(e) => onChangeEditValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") onSaveField(fieldKey); }}
              className="text-sm text-gray-900 border border-blue-500 rounded px-2 py-1 outline-none w-full"
            />
          )}
          <div className="flex gap-2">
            <button
              onClick={() => onSaveField(fieldKey)}
              disabled={isSaving}
              className="text-xs bg-blue-600 text-white px-2 py-1 rounded flex items-center gap-1 disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Salvar
            </button>
            <button onClick={onCancelEdit} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div
          className="text-sm text-gray-900 min-h-[20px] cursor-pointer border border-transparent hover:border-gray-200 hover:bg-gray-50 rounded p-1 -ml-1 flex justify-between items-start"
          onClick={() => onStartEdit(fieldKey, value || "")}
        >
          <span className={!value ? "text-gray-400 italic" : ""}>{value || "Clique para adicionar"}</span>
          <Edit2 className="w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
        </div>
      )}
    </div>
  );
}

export default function CandidateDrawer({
  isOpen,
  onClose,
  candidate,
  onToggleShortlist,
  onMoveCandidate,
  onUpdateCandidate,
  quota,
  onExportSuccess,
}: CandidateDrawerProps) {
  const [showRawText, setShowRawText] = useState(false);

  // Local state for edits
  const [localCandidate, setLocalCandidate] = useState<Candidate | null>(null);

  // Edit mode states
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editingScoreIndex, setEditingScoreIndex] = useState<number | null>(null);
  const [editScoreValue, setEditScoreValue] = useState<number>(0);

  // Saving field state
  const [savingField, setSavingField] = useState<string | null>(null);
  const [savingScore, setSavingScore] = useState<number | null>(null);

  // Rescore state (UX constraint 9 - disable during request)
  const [isRescoring, setIsRescoring] = useState(false);

  // Export PDF state
  const [isExporting, setIsExporting] = useState(false);

  // Etiquetas IA
  const [etiquetas, setEtiquetas] = useState<Array<{ id: string; nome: string; cor: string; posicao: number }>>([]);
  const [selectedEtiquetaId, setSelectedEtiquetaId] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);
  const toastTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const candidateRafRef = useRef<number | null>(null);

  const handleExportPdf = async () => {
    if (!localCandidate || isExporting) return;
    setIsExporting(true);

    try {
      const res = await fetch("/api/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId: localCandidate.id }),
      });

      const data = await res.json();

      if (res.ok) {
        showToast("success", "Exportação registrada com sucesso. Gerando PDF...");
        if (onExportSuccess) {
          onExportSuccess();
        }
        setTimeout(() => {
          window.print();
        }, 500);
      } else if (res.status === 403) {
        showToast("error", data.upgrade_message || "Limite de exportações atingido. Faça upgrade de plano.");
      } else {
        showToast("error", data.error || "Erro ao exportar PDF.");
      }
    } catch {
      showToast("error", "Erro de conexão ao exportar PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    if (candidateRafRef.current !== null) {
      cancelAnimationFrame(candidateRafRef.current);
    }

    if (!candidate) {
      // schedule clearing localCandidate to avoid synchronous setState in effect
      candidateRafRef.current = requestAnimationFrame(() => setLocalCandidate(null));
      return;
    }

    candidateRafRef.current = requestAnimationFrame(() => {
      setLocalCandidate({ ...candidate });
      setEditingField(null);
      setEditingScoreIndex(null);
      setShowRawText(false);
      setSelectedEtiquetaId(candidate.etiqueta?.id ?? null);
    });

    return () => {
      if (candidateRafRef.current !== null) cancelAnimationFrame(candidateRafRef.current);
    };
  }, [candidate]);

  const showToast = useCallback((type: ToastType, message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ type, message });
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Load etiquetas for the current empresa
  useEffect(() => {
    let mounted = true;
    async function loadEtiquetas() {
      try {
        const res = await fetch('/api/etiquetas');
        const data = await res.json();
        if (res.ok && mounted) {
          setEtiquetas(data.etiquetas || []);
        }
      } catch (e) {
        // ignore
      }
    }
    loadEtiquetas();
    return () => { mounted = false; };
  }, []);

  if (!isOpen || !localCandidate) return null;

  const bg = getAvatarBg(localCandidate.avatarColor);

  // Recalculate Final Score using Weighted Average (score logic 3 & 4)
  const recalculateScore = (evals: NonNullable<Candidate["evaluations"]>) => {
    if (!evals.length) return 0;
    let sumWeighted = 0;
    let sumWeights = 0;
    evals.forEach((ev) => {
      const weight = ev.weight || 1;
      // Priority: nota_manual > nota da IA (score logic 4)
      const val = ev.manualScore !== undefined && ev.manualScore !== null ? ev.manualScore : ev.score;
      sumWeighted += val * weight;
      sumWeights += weight;
    });
    return sumWeights > 0 ? sumWeighted / sumWeights : 0;
  };

  /* ── Field persistence ────────────────────────────────── */
  const handleSaveField = async (field: keyof Candidate) => {
    if (!localCandidate) return;
    setSavingField(String(field));

    const fieldMap: Record<string, string> = {
      email: "email",
      phone: "phone",
      linkedinUrl: "linkedinUrl",
      pretensaoSalarial: "pretensaoSalarial",
      disponibilidade: "disponibilidade",
      regime: "regime",
      observacoes: "observacoes",
      name: "name",
      role: "role",
      company: "company",
      city: "city",
    };

    const apiField = fieldMap[field as string] || field;

    try {
      const res = await fetch(`/api/candidates/${localCandidate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [apiField]: editValue }),
      });

      if (res.ok) {
        const updated = { ...localCandidate, [field]: editValue };
        setLocalCandidate(updated);
        if (onUpdateCandidate) onUpdateCandidate(updated);
      } else {
        showToast("error", "Falha ao salvar alteração.");
      }
    } catch {
      showToast("error", "Erro de conexão ao salvar.");
    } finally {
      setSavingField(null);
      setEditingField(null);
    }
  };

  /* ── Manual score persistence ─────────────────────────── */
  const handleSaveScore = async (index: number) => {
    if (!localCandidate || !localCandidate.evaluations) return;
    setSavingScore(index);

    const newEvals = [...localCandidate.evaluations];
    newEvals[index] = { ...newEvals[index], manualScore: editScoreValue };

    // Immediately recalculate score locally for display
    const newFinalScore = recalculateScore(newEvals);

    try {
      const res = await fetch(`/api/candidates/${localCandidate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evaluations: newEvals.map((ev) => ({
            name: ev.name,
            manualScore: ev.manualScore !== undefined ? ev.manualScore : null,
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const serverScore = data.candidate?.score ?? newFinalScore;
        const updated = {
          ...localCandidate,
          evaluations: newEvals,
          score: serverScore,
        };
        setLocalCandidate(updated);
        if (onUpdateCandidate) onUpdateCandidate(updated);
        showToast("success", "Nota manual salva com sucesso.");
      } else {
        showToast("error", "Falha ao salvar nota manual.");
      }
    } catch {
      showToast("error", "Erro de conexão ao salvar nota.");
    } finally {
      setSavingScore(null);
      setEditingScoreIndex(null);
    }
  };

  const handleStartEdit = (field: keyof Candidate, value: string) => {
    setEditValue(value);
    setEditingField(String(field));
  };

  const handleCancelEdit = () => {
    setEditingField(null);
  };

  /* ── Rescore via IA (Groq) ────────────────────────────── */
  const handleRescore = async () => {
    if (!localCandidate || isRescoring) return;
    setIsRescoring(true); // Disable button (UX constraint 9)

    try {
      const res = await fetch(`/api/candidates/${localCandidate.id}/rescore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (res.ok && data.score !== undefined) {
        const updatedEvals = data.evaluations || localCandidate.evaluations;
        const updated: Candidate = {
          ...localCandidate,
          name: data.name || localCandidate.name,
          score: data.score,
          evaluations: updatedEvals,
          initials: (data.name || localCandidate.name)
            .split(" ")
            .map((p: string) => p[0])
            .join("")
            .substring(0, 2)
            .toUpperCase(),
        };
        setLocalCandidate(updated);
        if (onUpdateCandidate) onUpdateCandidate(updated);
        showToast("success", "Score atualizado com sucesso pela IA!");
      } else if (res.status === 429) {
        showToast("error", "Limite atingido: 5 recálculos por minuto. Aguarde antes de tentar novamente.");
      } else {
        showToast("error", data.error || "Falha ao recalcular o score com a IA.");
      }
    } catch {
      showToast("error", "Erro de conexão ao recalcular score.");
    } finally {
      setIsRescoring(false); // Re-enable button (UX constraint 9)
    }
  };

  const getCompatibilityLabel = (score: number) => {
    if (score >= 4.5) return { text: "Compatibilidade Excelente", color: "text-green-600" };
    if (score >= 3.5) return { text: "Compatibilidade Alta", color: "text-blue-600" };
    if (score >= 2.5) return { text: "Compatibilidade Média", color: "text-yellow-600" };
    return { text: "Compatibilidade Baixa", color: "text-red-600" };
  };

  const compatibility = getCompatibilityLabel(localCandidate.score);

  

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40 transition-opacity no-print" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 w-[680px] bg-white shadow-2xl z-50 transform transition-transform overflow-y-auto flex flex-col candidate-drawer-print">

        {/* ── Toast ──────────────────────────── */}
        {toast && (
          <div
            className={`fixed bottom-6 right-[700px] z-[60] flex items-center gap-2 px-4 py-3 rounded-[10px] shadow-lg text-[13px] font-medium transition-all duration-300 ${
              toast.type === "success"
                ? "bg-[#E6FAF4] text-[#059669] border border-[#A7F3D0]"
                : "bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            {toast.message}
          </div>
        )}

        {/* SEÇÃO 1: HEADER */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-start justify-between flex-shrink-0 bg-gray-50/50">
          <div className="flex items-center gap-5">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-medium shadow-sm border border-black/5"
              style={{ backgroundColor: bg, color: localCandidate.avatarColor }}
            >
              {localCandidate.initials}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-gray-900">{localCandidate.name}</h2>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase rounded-full border border-blue-100">
                  Via PDF
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                <span className="flex items-center gap-1.5 text-sm text-gray-600 font-medium">
                  <Briefcase className="w-4 h-4 text-gray-400" /> {localCandidate.role}
                </span>
                <span className="flex items-center gap-1.5 text-sm text-gray-600">
                  <Building className="w-4 h-4 text-gray-400" /> {localCandidate.company}
                </span>
                <span className="flex items-center gap-1.5 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400" /> {localCandidate.city}
                </span>
              </div>

              {/* Etiqueta do candidato */}
              <div className="mt-3">
                <label className="text-xs text-gray-500 font-medium mb-1 block">Etiqueta</label>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedEtiquetaId ?? ""}
                    onChange={async (e) => {
                      const val = e.target.value || null;
                      setSelectedEtiquetaId(val);
                      if (!localCandidate) return;

                      try {
                        const res = await fetch('/api/candidate-etiquetas', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ candidateId: localCandidate.id, etiquetaId: val }),
                        });

                        const data = await res.json();
                        if (!res.ok) {
                          showToast('error', data.error || 'Falha ao atualizar etiqueta');
                          return;
                        }

                        const etiquetaObj = etiquetas.find((t) => t.id === val) || null;
                        const updated = { ...localCandidate, etiqueta: etiquetaObj };
                        setLocalCandidate(updated);
                        if (onUpdateCandidate) onUpdateCandidate(updated);
                        showToast('success', val ? 'Etiqueta aplicada' : 'Etiqueta removida');
                      } catch (err) {
                        showToast('error', 'Erro de conexão ao salvar etiqueta');
                      }
                    }}
                    className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-white outline-none"
                  >
                    <option value="">Nenhuma</option>
                    {etiquetas.map((et) => (
                      <option key={et.id} value={et.id}>{et.nome}</option>
                    ))}
                  </select>

                  {selectedEtiquetaId ? (
                    <span className="text-[12px] font-semibold px-2 py-1 rounded" style={{ backgroundColor: etiquetas.find(t => t.id === selectedEtiquetaId)?.cor || '#E5E7EB', color: '#111827' }}>
                      {etiquetas.find(t => t.id === selectedEtiquetaId)?.nome}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400 italic">—</span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white border border-transparent hover:border-gray-200 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 p-8 space-y-10">

          {/* SEÇÃO 2: SCORE E AÇÕES */}
          <div className="flex flex-row items-center justify-between bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-full flex items-center justify-center relative shadow-inner bg-gray-50">
                <svg className="absolute inset-0 w-full h-full drop-shadow-sm" viewBox="0 0 36 36" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E8EEFB" strokeWidth="4" />
                  <circle
                    cx="18" cy="18" r="15.9"
                    fill="none" stroke="#F5C000" strokeWidth="4"
                    strokeDasharray="100"
                    strokeDashoffset={100 - (100 * (localCandidate.score / 5))}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="text-2xl font-black text-gray-900 relative z-10">{localCandidate.score.toFixed(1)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-0.5">Score Final</span>
                <span className={`text-base font-semibold ${compatibility.color}`}>{compatibility.text}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 items-end">
              <div className="flex gap-2">
                <button
                  onClick={() => onToggleShortlist(localCandidate.id)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm ${localCandidate.shortlist ? "bg-[#FFFBEA] text-[#C49500] border border-[#F5C000]/40 hover:bg-[#FEF6D8]" : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"}`}
                >
                  <Star className={`w-4 h-4 ${localCandidate.shortlist ? "fill-[#C49500]" : ""}`} />
                  {localCandidate.shortlist ? "Na Shortlist" : "Shortlist"}
                </button>
                <a
                  href={localCandidate.linkedinUrl !== "#" ? localCandidate.linkedinUrl : "https://linkedin.com"}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-[#E8EEFB] text-[#1B4FD8] hover:bg-[#1B4FD8] hover:text-white transition-all shadow-sm"
                >
                  <ExternalLink className="w-4 h-4" /> LinkedIn
                </a>
                <button
                  onClick={handleExportPdf}
                  disabled={isExporting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-[#EFF6FF] text-[#1D4ED8] hover:bg-[#1D4ED8] hover:text-white disabled:opacity-60 transition-all shadow-sm"
                >
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  Exportar PDF
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium">Pipeline:</span>
                <select
                  value={localCandidate.status}
                  onChange={(e) => onMoveCandidate(localCandidate.id, e.target.value as KanbanStatus)}
                  className="text-sm font-semibold text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-[#1B4FD8] focus:ring-1 focus:ring-[#1B4FD8]"
                >
                  <option value="triado">Triado</option>
                  <option value="shortlist">Shortlist</option>
                  <option value="entrevista">Entrevista</option>
                  <option value="oferecido">Oferecido</option>
                  <option value="contratado">Contratado</option>
                </select>
              </div>
            </div>
          </div>

          {/* SEÇÃO 3: AVALIAÇÃO POR CRITÉRIO */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-gray-400" />
              Avaliação por Critério
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {(localCandidate.evaluations || [
                { name: "Avaliação geral", score: localCandidate.score, justification: "Nota baseada na avaliação geral do documento.", weight: 1 },
              ]).map((ev, i) => (
                <div key={i} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm relative group">
                  <div className="flex justify-between items-start mb-2">
                    <div className="pr-4">
                      <span className="text-sm font-semibold text-gray-900 block leading-tight">{ev.name}</span>
                      <span className="text-[11px] text-gray-400 font-medium mt-1 inline-block bg-gray-100 px-2 py-0.5 rounded-full">
                        Peso {ev.weight || 1}
                      </span>
                      {ev.manualScore !== undefined && ev.manualScore !== null && (
                        <span className="ml-2 text-[10px] text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full font-semibold">
                          Nota manual
                        </span>
                      )}
                    </div>

                    {editingScoreIndex === i ? (
                      <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                        <input
                          type="range" min="1" max="5" step="0.1"
                          value={editScoreValue}
                          onChange={(e) => setEditScoreValue(parseFloat(e.target.value))}
                          className="w-24 accent-[#F5C000]"
                        />
                        <span className="text-sm font-bold w-8 text-center">{editScoreValue.toFixed(1)}</span>
                        <div className="flex gap-1 ml-2">
                          <button
                            onClick={() => handleSaveScore(i)}
                            disabled={savingScore === i}
                            className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-60"
                          >
                            {savingScore === i ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button onClick={() => setEditingScoreIndex(null)} className="p-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-black text-[#F5C000] drop-shadow-sm">
                          {ev.manualScore !== undefined && ev.manualScore !== null
                            ? ev.manualScore.toFixed(1)
                            : ev.score.toFixed(1)}
                        </span>
                        <button
                          onClick={() => {
                            setEditingScoreIndex(i);
                            setEditScoreValue(
                              ev.manualScore !== undefined && ev.manualScore !== null ? ev.manualScore : ev.score
                            );
                          }}
                          className="p-1.5 text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  {ev.justification && (
                    <p className="text-[13px] text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                      {ev.justification}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Rescore button (UX constraint 11) */}
            <div className="flex justify-end pt-2">
              <button
                onClick={handleRescore}
                disabled={isRescoring}
                className="text-[13px] text-[#1B4FD8] font-medium hover:underline flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-blue-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:no-underline"
              >
                {isRescoring ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Analisando currículo com IA...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Recalcular score com IA
                  </>
                )}
              </button>
            </div>
          </div>

          {/* SEÇÃO 4: INFORMAÇÕES PESSOAIS */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              Informações Pessoais
            </h3>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                <EditableField label="Email de contato" icon={Mail} fieldKey="email" value={localCandidate.email}
                  editingField={editingField} editValue={editValue} savingField={savingField}
                  onChangeEditValue={setEditValue} onStartEdit={handleStartEdit} onCancelEdit={handleCancelEdit} onSaveField={handleSaveField} />
                <EditableField label="Telefone" icon={Phone} fieldKey="phone" value={localCandidate.phone}
                  editingField={editingField} editValue={editValue} savingField={savingField}
                  onChangeEditValue={setEditValue} onStartEdit={handleStartEdit} onCancelEdit={handleCancelEdit} onSaveField={handleSaveField} />
                <EditableField label="LinkedIn URL" icon={LinkIcon} fieldKey="linkedinUrl" value={localCandidate.linkedinUrl}
                  editingField={editingField} editValue={editValue} savingField={savingField}
                  onChangeEditValue={setEditValue} onStartEdit={handleStartEdit} onCancelEdit={handleCancelEdit} onSaveField={handleSaveField} />
                <EditableField label="Pretensão salarial" icon={CircleDollarSign} fieldKey="pretensaoSalarial" value={localCandidate.pretensaoSalarial}
                  editingField={editingField} editValue={editValue} savingField={savingField}
                  onChangeEditValue={setEditValue} onStartEdit={handleStartEdit} onCancelEdit={handleCancelEdit} onSaveField={handleSaveField} />
                <EditableField label="Disponibilidade" icon={Calendar} fieldKey="disponibilidade" value={localCandidate.disponibilidade}
                  editingField={editingField} editValue={editValue} savingField={savingField}
                  onChangeEditValue={setEditValue} onStartEdit={handleStartEdit} onCancelEdit={handleCancelEdit} onSaveField={handleSaveField} />
                <EditableField label="Regime preferido" icon={Briefcase} fieldKey="regime" value={localCandidate.regime}
                  editingField={editingField} editValue={editValue} savingField={savingField}
                  onChangeEditValue={setEditValue} onStartEdit={handleStartEdit} onCancelEdit={handleCancelEdit} onSaveField={handleSaveField} />
              </div>
              {localCandidate.aiSummary && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Resumo do Candidato (IA)
                  </span>
                  <p className="text-sm text-gray-700 italic bg-blue-50/40 rounded-xl p-3 border border-blue-100/30 leading-relaxed">
                    "{localCandidate.aiSummary}"
                  </p>
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <EditableField
                  label="Observações do Recrutador"
                  icon={FileText}
                  fieldKey="observacoes"
                  value={localCandidate.observacoes}
                  isTextArea={true}
                  editingField={editingField}
                  editValue={editValue}
                  savingField={savingField}
                  onChangeEditValue={setEditValue}
                  onStartEdit={handleStartEdit}
                  onCancelEdit={handleCancelEdit}
                  onSaveField={handleSaveField}
                />
              </div>
            </div>
          </div>

          {/* SEÇÃO 5: HISTÓRICO NO PIPELINE */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <History className="w-4 h-4 text-gray-400" />
              Histórico no Pipeline
            </h3>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="relative pl-6 space-y-6 before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                <div className="relative flex items-start gap-4">
                  <div className="absolute left-[-24px] top-1 w-2 h-2 rounded-full bg-blue-500 border-2 border-white ring-4 ring-blue-50"></div>
                  <div>
                    <span className="text-xs text-gray-400 font-medium block mb-0.5">Hoje, 10:30</span>
                    <p className="text-sm text-gray-800">Nota manual adicionada em Figma: <strong>4.5</strong></p>
                  </div>
                </div>
                <div className="relative flex items-start gap-4">
                  <div className="absolute left-[-24px] top-1 w-2 h-2 rounded-full bg-gray-300 border-2 border-white ring-4 ring-gray-50"></div>
                  <div>
                    <span className="text-xs text-gray-400 font-medium block mb-0.5">Ontem, 15:45</span>
                    <p className="text-sm text-gray-800">Movido para <strong>Shortlist</strong></p>
                  </div>
                </div>
                <div className="relative flex items-start gap-4">
                  <div className="absolute left-[-24px] top-1 w-2 h-2 rounded-full bg-green-500 border-2 border-white ring-4 ring-green-50"></div>
                  <div>
                    <span className="text-xs text-gray-400 font-medium block mb-0.5">05/06/2026, 09:00</span>
                    <p className="text-sm text-gray-800">Adicionado via <strong>PDF Ranker</strong></p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SEÇÃO 6: TEXTO EXTRAÍDO DO CV */}
          <div className="space-y-4">
            <button onClick={() => setShowRawText(!showRawText)} className="flex items-center justify-between w-full text-left group">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2 group-hover:text-[#1B4FD8] transition-colors">
                <FileText className="w-4 h-4 text-gray-400 group-hover:text-[#1B4FD8]" />
                Texto extraído do CV
              </h3>
              {showRawText ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>

            {showRawText && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 shadow-inner">
                {localCandidate.parsedText ? (
                  <div className="max-h-[300px] overflow-y-auto pr-2">
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans leading-relaxed">
                      {localCandidate.parsedText}
                    </pre>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-500 mb-3">Texto bruto não disponível para este candidato.</p>
                    <button className="text-xs font-medium bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg shadow-sm hover:bg-gray-50 transition-colors">
                      Tentar extrair novamente
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SEÇÃO 7: VAGAS ASSOCIADAS */}
          <div className="space-y-4 pb-8">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-gray-400" />
              Vagas Associadas
            </h3>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3">Vaga</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">Email Designer BR — Figma</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-[11px] font-semibold bg-blue-50 text-blue-700 rounded-md uppercase">
                        {localCandidate.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-[#F5C000]">
                      {localCandidate.score.toFixed(1)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
