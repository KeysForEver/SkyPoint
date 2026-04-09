import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, where, limit } from 'firebase/firestore';
import { 
  Search, 
  Filter, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  AlertTriangle,
  LogIn,
  LogOut,
  Calendar as CalendarIcon,
  MoreVertical
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TimeRecord } from '../types';

export default function History() {
  const { user, isAdmin } = useAuth();
  const [records, setRecords] = useState<TimeRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const recordsRef = collection(db, 'records');
    let q = query(recordsRef, orderBy('timestamp', 'desc'), limit(100));

    if (!isAdmin) {
      q = query(recordsRef, where('userId', '==', user.uid), orderBy('timestamp', 'desc'), limit(100));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimeRecord)));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'records');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, isAdmin]);

  const filteredRecords = records.filter(r => 
    r.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight text-on-background">Histórico de Registros</h2>
          <p className="text-on-surface-variant font-medium">Visualize e exporte os registros de ponto com precisão digital.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border border-surface-container px-4 py-2 rounded-xl text-primary font-bold flex items-center gap-2 shadow-sm hover:bg-surface-container-low transition-all">
            <CalendarIcon className="w-4 h-4" />
            Esta Semana
          </button>
          <button className="bg-primary text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-blue-700 transition-all">
            <Download className="w-4 h-4" />
            Exportar PDF
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 bg-white p-4 rounded-2xl border border-surface-container shadow-sm">
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Buscar Colaborador</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-5 h-5" />
            <input 
              type="text"
              placeholder="Nome ou ID do funcionário..."
              className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-surface-container shadow-sm">
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Período</label>
          <input 
            type="date"
            className="w-full px-4 py-2.5 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary transition-all text-sm"
          />
        </div>
        <div className="flex items-end">
          <button className="w-full bg-surface-container-high text-on-surface py-3 rounded-xl font-bold hover:bg-surface-container transition-all flex items-center justify-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros Avançados
          </button>
        </div>
      </section>

      <div className="bg-white rounded-3xl border border-surface-container shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest">Colaborador</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest">Data / Hora</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest">Tipo</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-on-surface-variant italic">Carregando registros...</td>
                </tr>
              ) : filteredRecords.length > 0 ? filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-surface-container-low transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {record.employeeName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-on-surface">{record.employeeName}</p>
                        <p className="text-xs text-on-surface-variant">ID: {record.employeeId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm font-medium">{format(new Date(record.timestamp), 'dd MMM, yyyy')}</p>
                    <p className="text-xs text-on-surface-variant">{format(new Date(record.timestamp), 'HH:mm:ss')}</p>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase ${
                      record.type === 'entry' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {record.type === 'entry' ? <LogIn className="w-3 h-3" /> : <LogOut className="w-3 h-3" />}
                      {record.type === 'entry' ? 'Entrada' : 'Saída'}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className={`flex items-center gap-1.5 ${record.status === 'approved' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {record.status === 'approved' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                      <span className="text-sm font-bold">{record.status === 'approved' ? 'Aprovado' : 'Divergente'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button className="p-2 rounded-full hover:bg-surface-container transition-all">
                      <MoreVertical className="w-5 h-5 text-on-surface-variant" />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-on-surface-variant italic">Nenhum registro encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-surface-container-low flex items-center justify-between">
          <p className="text-xs text-on-surface-variant font-bold">Mostrando {filteredRecords.length} registros</p>
          <div className="flex gap-2">
            <button className="p-2 border border-surface-container rounded-lg hover:bg-white transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="p-2 border border-surface-container rounded-lg hover:bg-white transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
