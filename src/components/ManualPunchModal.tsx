import React, { useState } from 'react';
import { User, PunchRecord, PunchType } from '../types';
import { X, PlusCircle, Save, Clock, User as UserIcon, Calendar } from 'lucide-react';
import { 
  formatSaoPauloDateTime, 
  getSaoPauloDateKey, 
  getPunchTypeLabel, 
  generatePunchReceiptHash 
} from '../lib/timeUtils';

interface ManualPunchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: Omit<PunchRecord, 'id'>) => Promise<void>;
  users: User[];
}

export const ManualPunchModal: React.FC<ManualPunchModalProps> = ({
  isOpen,
  onClose,
  onSave,
  users,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>(users[0]?.id || '');
  const [type, setType] = useState<PunchType>('entry');
  const [dateTime, setDateTime] = useState<string>(() => {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [notes, setNotes] = useState<string>('Inclusão manual autorizada pela administração.');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const targetUser = users.find((u) => u.id === selectedUserId);
    if (!targetUser) {
      setError('Selecione um funcionário válido.');
      return;
    }

    setLoading(true);
    try {
      const dateObj = new Date(dateTime);
      const iso = dateObj.toISOString();
      const spFormatted = formatSaoPauloDateTime(dateObj);
      const dateKey = getSaoPauloDateKey(dateObj);
      const typeLabel = getPunchTypeLabel(type);
      const receiptHash = generatePunchReceiptHash(targetUser.id, iso);

      // Create a clean placeholder canvas badge dataUrl for manual registration
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, 300, 300);
        ctx.fillStyle = '#4f46e5';
        ctx.beginPath();
        ctx.arc(150, 120, 50, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#6366f1';
        ctx.beginPath();
        ctx.arc(150, 240, 70, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 15px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('INCLUSÃO MANUAL', 150, 280);
      }
      const placeholderPhoto = canvas.toDataURL('image/jpeg', 0.85);

      await onSave({
        userId: targetUser.id,
        userName: targetUser.name,
        userDepartment: targetUser.department || 'Geral',
        type,
        typeLabel,
        timestamp: iso,
        timestampSaoPaulo: spFormatted,
        dateKey,
        photo: placeholderPhoto,
        address: 'Registro Manual pelo Administrador',
        isOfflineSynced: false,
        notes: notes.trim(),
        deviceInfo: 'Painel Web Admin SkyPoint',
        hash: receiptHash,
      });

      onClose();
    } catch (err: any) {
      console.error('Error inserting manual punch:', err);
      setError(err.message || 'Erro ao registrar ponto manual.');
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
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Registrar Ponto Manual</h3>
              <p className="text-xs text-slate-500">Inclusão retroativa ou de exceção</p>
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

          {/* Select Employee */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1" htmlFor="manual-emp-select">
              Funcionário / Colaborador *
            </label>
            <select
              id="manual-emp-select"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
              required
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.department || 'Geral'}) - @{u.username}
                </option>
              ))}
            </select>
          </div>

          {/* Type of Punch */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1" htmlFor="manual-type-select">
              Tipo de Ponto
            </label>
            <select
              id="manual-type-select"
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
            <label className="block font-semibold text-slate-700 mb-1" htmlFor="manual-datetime-input">
              Data e Horário (Fuso de São Paulo)
            </label>
            <input
              id="manual-datetime-input"
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
              required
            />
          </div>

          {/* Justification */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1" htmlFor="manual-notes-input">
              Justificativa Obrigatória
            </label>
            <textarea
              id="manual-notes-input"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Falha no dispositivo do funcionário, atestado, etc."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
              required
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
              id="btn-save-manual-punch"
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Gravar Ponto</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
