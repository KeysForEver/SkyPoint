import React, { useState, useEffect } from 'react';
import { PunchRecord, PunchType } from '../types';
import { X, Edit3, Save, Clock, Calendar, AlertCircle } from 'lucide-react';
import { 
  formatSaoPauloDateTime, 
  getSaoPauloDateKey, 
  getPunchTypeLabel 
} from '../lib/timeUtils';

interface EditPunchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<PunchRecord>) => Promise<void>;
  punch: PunchRecord | null;
}

export const EditPunchModal: React.FC<EditPunchModalProps> = ({
  isOpen,
  onClose,
  onSave,
  punch,
}) => {
  const [type, setType] = useState<PunchType>('entry');
  const [dateTime, setDateTime] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (punch) {
      setType(punch.type);
      setNotes(punch.notes || '');

      const d = new Date(punch.timestamp);
      const pad = (n: number) => n.toString().padStart(2, '0');
      const formattedInput = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      setDateTime(formattedInput);
    }
    setError(null);
  }, [punch, isOpen]);

  if (!isOpen || !punch) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    setLoading(true);
    try {
      const dateObj = new Date(dateTime);
      const iso = dateObj.toISOString();
      const spFormatted = formatSaoPauloDateTime(dateObj);
      const dateKey = getSaoPauloDateKey(dateObj);
      const typeLabel = getPunchTypeLabel(type);

      await onSave(punch.id, {
        type,
        typeLabel,
        timestamp: iso,
        timestampSaoPaulo: spFormatted,
        dateKey,
        notes: notes.trim() || undefined,
      });

      onClose();
    } catch (err: any) {
      console.error('Error updating punch:', err);
      setError(err.message || 'Erro ao atualizar registro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-200 w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center shadow-sm">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Editar Registro de Ponto</h3>
              <p className="text-xs text-slate-500">{punch.userName}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="py-4 space-y-4 text-xs text-slate-700">
          
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700">
              {error}
            </div>
          )}

          {/* Type of Punch */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1" htmlFor="edit-punch-type">
              Tipo de Batida
            </label>
            <select
              id="edit-punch-type"
              value={type}
              onChange={(e) => setType(e.target.value as PunchType)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
            >
              <option value="entry">Entrada</option>
              <option value="lunch_start">Saída Intervalo / Almoço</option>
              <option value="lunch_end">Retorno Intervalo / Almoço</option>
              <option value="exit">Saída (Fim do Turno)</option>
              <option value="custom">Ponto Especial / Extra</option>
            </select>
          </div>

          {/* Date and Time */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1" htmlFor="edit-punch-datetime">
              Data e Horário (Fuso de São Paulo GMT-3)
            </label>
            <input
              id="edit-punch-datetime"
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1" htmlFor="edit-punch-notes">
              Justificativa / Observação do Ajuste
            </label>
            <textarea
              id="edit-punch-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Ajuste solicitado pelo colaborador com atestado."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              id="btn-save-edit-punch"
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Alterações</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
