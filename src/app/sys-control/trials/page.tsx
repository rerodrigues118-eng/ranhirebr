"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, Clock, Mail, CalendarPlus, Search, CheckSquare } from "lucide-react";

export default function AdminTrialsPage() {
  const [trials, setTrials] = useState<Array<{ id: string; empresa: string; email: string; dias_restantes: number; trial_expires_at: string }>>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/trials');
        const json = await res.json();
        if (res.ok && mounted) {
          setTrials((json.trials || []).map((t: any) => ({ id: String(t.id), empresa: t.empresa, email: t.email, dias_restantes: t.dias_restantes, trial_expires_at: t.trial_expires_at })));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = (filterFn: (t: any) => boolean) => {
    const ids = trials.filter(filterFn).map(t => t.id);
    const allSelected = ids.every(id => selectedIds.includes(id));
    if (allSelected) setSelectedIds(prev => prev.filter(x => !ids.includes(x)));
    else setSelectedIds(prev => Array.from(new Set([...prev, ...ids])));
  };

  const sendReminder = async (empresaId: string) => {
    await fetch('/api/admin/enviar-lembrete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ empresa_id: empresaId, tipo: 'trial_expirando' }) });
  };

  const sendRemindersBulk = async () => {
    for (const id of selectedIds) {
      await sendReminder(id);
    }
    setSelectedIds([]);
  };

  const urgentes = trials.filter(t => t.dias_restantes <= 3);
  const atencao = trials.filter(t => t.dias_restantes > 3 && t.dias_restantes <= 7);
  const semana = trials.filter(t => t.dias_restantes > 7 && t.dias_restantes <= 14);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[24px] font-bold text-[#111827]">Gestão de Trials</h2>
          <p className="text-[#6B7280] text-[14px] mt-1">Monitore e atue sobre trials próximos do vencimento.</p>
        </div>
        {selectedIds.length > 0 && (
          <button onClick={sendRemindersBulk} className="flex items-center gap-2 px-4 py-2 bg-[#111827] text-white rounded-lg text-[13px] font-semibold transition-all shadow-md">
            <Mail className="w-4 h-4" /> Enviar Lembrete para {selectedIds.length} selecionados
          </button>
        )}
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[16px] font-bold text-red-600 flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> URGENTE — Expirando em menos de 3 dias</h3>
          <button onClick={() => selectAll((t) => t.dias_restantes <= 3)} className="text-[12px] font-semibold text-[#6B7280] hover:text-[#111827]">Selecionar todos</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? <div>Carregando...</div> : urgentes.map(t => (
            <div key={t.id} className={`p-5 rounded-xl border transition-all ${selectedIds.includes(t.id) ? 'border-red-500 bg-red-50/50 ring-1 ring-red-500' : 'border-red-200 bg-white hover:border-red-300'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={selectedIds.includes(t.id)} onChange={() => toggleSelect(t.id)} className="w-4 h-4 text-red-600 rounded border-red-300 focus:ring-red-500" />
                  <div>
                    <h4 className="text-[15px] font-bold text-[#111827]">{t.empresa}</h4>
                    <p className="text-[12px] text-[#6B7280]">{t.email}</p>
                  </div>
                </div>
                <div className="px-2 py-1 bg-red-100 text-red-700 rounded text-[11px] font-bold animate-pulse">{t.dias_restantes} dias restantes</div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => sendReminder(t.id)} className="flex-1 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-[12px] font-semibold transition-colors flex items-center justify-center gap-1.5 border border-red-200"><Mail className="w-3.5 h-3.5" /> Lembrete</button>
                <button className="flex-1 py-2 bg-white hover:bg-gray-50 text-[#374151] rounded-lg text-[12px] font-semibold transition-colors flex items-center justify-center gap-1.5 border border-[#D1D5DB]"><CalendarPlus className="w-3.5 h-3.5" /> +7 Dias</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="pt-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[16px] font-bold text-[#D97706] flex items-center gap-2"><Clock className="w-5 h-5" /> ATENÇÃO — Expirando em 4 a 7 dias</h3>
          <button onClick={() => selectAll((t) => t.dias_restantes > 3 && t.dias_restantes <= 7)} className="text-[12px] font-semibold text-[#6B7280] hover:text-[#111827]">Selecionar todos</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {atencao.map(t => (
            <div key={t.id} className={`p-5 rounded-xl border transition-all ${selectedIds.includes(t.id) ? 'border-[#F59E0B] bg-[#FFFBEB] ring-1 ring-[#F59E0B]' : 'border-[#FDE68A] bg-white hover:border-[#FCD34D]'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={selectedIds.includes(t.id)} onChange={() => toggleSelect(t.id)} className="w-4 h-4 text-[#F59E0B] rounded border-[#FCD34D] focus:ring-[#F59E0B]" />
                  <div>
                    <h4 className="text-[15px] font-bold text-[#111827]">{t.empresa}</h4>
                    <p className="text-[12px] text-[#6B7280]">{t.email}</p>
                  </div>
                </div>
                <div className="px-2 py-1 bg-[#FEF3C7] text-[#B45309] rounded text-[11px] font-bold">{t.dias_restantes} dias</div>
              </div>
              <button onClick={() => sendReminder(t.id)} className="w-full mt-2 py-2 bg-white hover:bg-[#FFFBEB] text-[#92400E] rounded-lg text-[12px] font-semibold transition-colors flex items-center justify-center gap-1.5 border border-[#FDE68A]"><Mail className="w-3.5 h-3.5" /> Enviar Lembrete Padrão</button>
            </div>
          ))}
        </div>
      </section>

      <section className="pt-4">
        <h3 className="text-[16px] font-bold text-[#374151] mb-4">Esta Semana — Expirando em 8 a 14 dias</h3>
        <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <tbody className="divide-y divide-[#E5E7EB]">
              {semana.map(t => (
                <tr key={t.id} className="hover:bg-[#F9FAFB] transition-colors">
                  <td className="px-6 py-4 w-12">
                    <input type="checkbox" checked={selectedIds.includes(t.id)} onChange={() => toggleSelect(t.id)} className="w-4 h-4 text-[#06D6A0] rounded border-[#D1D5DB] focus:ring-[#06D6A0]" />
                  </td>
                  <td className="px-6 py-4"><p className="text-[14px] font-bold text-[#111827]">{t.empresa}</p></td>
                  <td className="px-6 py-4 text-[13px] text-[#6B7280]">{t.email}</td>
                  <td className="px-6 py-4"><span className="text-[13px] font-medium text-[#4B5563]">Expira em {t.dias_restantes} dias</span></td>
                  <td className="px-6 py-4 text-right"><button onClick={() => sendReminder(t.id)} className="text-[12px] text-[#2563EB] font-medium hover:underline">Agendar Lembrete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
