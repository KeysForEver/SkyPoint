import React from 'react';
import { PunchRecord } from '../types';
import { 
  X, 
  Printer, 
  MapPin, 
  Clock, 
  User, 
  CheckCircle2, 
  ExternalLink, 
  ShieldCheck,
  Building2,
  FileCheck
} from 'lucide-react';
import { formatSaoPauloDateTime, getPunchTypeBadgeColor } from '../lib/timeUtils';

interface ReceiptModalProps {
  punch: PunchRecord | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ punch, onClose }) => {
  if (!punch) return null;

  const badge = getPunchTypeBadgeColor(punch.type);

  const handlePrint = () => {
    window.print();
  };

  const mapUrl = punch.latitude && punch.longitude 
    ? `https://www.google.com/maps?q=${punch.latitude},${punch.longitude}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-200 w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center shadow-sm">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Comprovante de Ponto Eletrônico</h3>
              <p className="text-xs text-slate-500 font-mono">
                Autenticação: {punch.hash || 'SKY-' + punch.id.substring(0, 10).toUpperCase()}
              </p>
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

        {/* Receipt Printable Card */}
        <div id="receipt-print-area" className="py-4 space-y-4 text-xs text-slate-700">
          
          {/* Employee & Photo header */}
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="relative">
              <img
                src={punch.photo}
                alt="Selfie do Ponto"
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-indigo-500/40 shadow-md"
              />
              <div className="absolute -bottom-2 -right-2 p-1.5 rounded-full bg-emerald-600 text-white shadow">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="flex-1 text-center sm:text-left space-y-1">
              <div className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badge.bg} ${badge.border} ${badge.text}`}>
                {punch.typeLabel}
              </div>
              <h4 className="text-base font-bold text-slate-900">{punch.userName}</h4>
              <p className="text-slate-500 text-xs font-medium">{punch.userDepartment || 'Geral'}</p>
              <div className="text-slate-400 text-[11px] font-mono pt-1">
                ID Funcionário: {punch.userId}
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <span className="text-[10px] text-slate-500 flex items-center gap-1 mb-1 font-semibold uppercase">
                <Clock className="w-3 h-3 text-indigo-600" />
                <span>Horário Oficial (São Paulo GMT-3)</span>
              </span>
              <span className="font-mono text-sm font-bold text-slate-900 block">
                {punch.timestampSaoPaulo || formatSaoPauloDateTime(punch.timestamp)}
              </span>
              <span className="text-[10px] text-slate-500">
                Data do Registro: {punch.dateKey}
              </span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <span className="text-[10px] text-slate-500 flex items-center gap-1 mb-1 font-semibold uppercase">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>Status de Conexão</span>
              </span>
              <span className="text-xs font-bold text-slate-800 block">
                {punch.isOfflineSynced ? 'Sincronizado via Modo Offline' : 'Registro em Tempo Real (Online)'}
              </span>
              {punch.syncedAt && (
                <span className="text-[10px] text-slate-500 block">
                  Sincronizado às: {formatSaoPauloDateTime(punch.syncedAt)}
                </span>
              )}
            </div>

          </div>

          {/* Geolocation Section */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 flex items-center gap-1 font-semibold uppercase">
                <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                <span>Localização e Georreferenciamento</span>
              </span>
              {mapUrl && (
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-700 text-[11px] flex items-center gap-1 font-semibold underline"
                >
                  <span>Ver no Google Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <p className="text-xs text-slate-800 font-semibold">{punch.address || 'Endereço não disponível'}</p>
            
            {punch.latitude && punch.longitude && (
              <div className="flex flex-wrap gap-3 text-[10px] text-slate-500 font-mono pt-1.5 border-t border-slate-200">
                <span>Latitude: {punch.latitude.toFixed(6)}</span>
                <span>Longitude: {punch.longitude.toFixed(6)}</span>
                <span>Precisão: ~{punch.accuracy || 5}m</span>
              </div>
            )}
          </div>

          {/* Notes if any */}
          {punch.notes && (
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <span className="text-[10px] text-slate-500 block mb-1 font-semibold">Observação do Ponto:</span>
              <p className="text-xs text-slate-800 italic">{punch.notes}</p>
            </div>
          )}

          {/* Security Certificate Footer */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-[10px] text-slate-500 space-y-1">
            <div className="flex items-center justify-between font-mono font-bold text-slate-700">
              <span>SkyPoint Eletrônico</span>
              <span>Portaria MTP / CLT</span>
            </div>
            <p className="text-[9px] text-slate-500 leading-relaxed">
              Este comprovante foi emitido digitalmente com biometria facial, geolocalização e carimbo temporal no fuso de São Paulo (GMT-3).
            </p>
          </div>

        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-200 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 transition cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
