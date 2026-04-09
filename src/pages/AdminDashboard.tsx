import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { 
  Users, 
  Clock, 
  UserMinus, 
  AlertTriangle, 
  MapPinOff, 
  FileText, 
  Download,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Search,
  Bell
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TimeRecord, UserProfile } from '../types';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [recentRecords, setRecentRecords] = useState<TimeRecord[]>([]);
  const [stats, setStats] = useState({
    present: 0,
    total: 0,
    late: 0,
    absent: 0
  });
  const [criticalAlerts, setCriticalAlerts] = useState<TimeRecord[]>([]);

  useEffect(() => {
    const recordsRef = collection(db, 'records');
    const q = query(recordsRef, orderBy('timestamp', 'desc'), limit(50));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimeRecord));
      setRecentRecords(records);
      
      const today = new Date().toISOString().split('T')[0];
      const todayRecords = records.filter(r => r.timestamp.startsWith(today));
      const uniqueUsersToday = new Set(todayRecords.map(r => r.userId));
      
      setStats(prev => ({
        ...prev,
        present: uniqueUsersToday.size,
        late: todayRecords.filter(r => r.status === 'divergent').length
      }));

      setCriticalAlerts(records.filter(r => r.status === 'divergent').slice(0, 5));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'records');
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchTotalUsers = async () => {
      const snap = await getDocs(collection(db, 'users'));
      setStats(prev => ({ ...prev, total: snap.size, absent: snap.size - prev.present }));
    };
    fetchTotalUsers();
  }, [stats.present]);

  const handleApprove = async (recordId: string) => {
    try {
      await updateDoc(doc(db, 'records', recordId), { status: 'approved' });
    } catch (err) {
      console.error('Error approving record', err);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-on-background">Administração</h2>
          <p className="text-on-surface-variant font-medium">Bem-vindo, {profile?.name}. Aqui está o resumo de hoje.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 rounded-full hover:bg-surface-container transition-colors relative">
            <Bell className="w-6 h-6 text-on-surface-variant" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full"></span>
          </button>
          <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
            {profile?.name?.charAt(0)}
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-surface-container flex flex-col justify-between group hover:bg-surface-container-low transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">+4% vs. ontem</span>
          </div>
          <div>
            <p className="text-sm font-medium text-on-surface-variant mb-1">Funcionários Presentes</p>
            <h2 className="text-3xl font-bold tracking-tight">{stats.present}<span className="text-lg font-normal text-on-surface-variant">/{stats.total}</span></h2>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-surface-container flex flex-col justify-between group hover:bg-surface-container-low transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-amber-100 rounded-xl">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-full">Alerta</span>
          </div>
          <div>
            <p className="text-sm font-medium text-on-surface-variant mb-1">Divergências</p>
            <h2 className="text-3xl font-bold tracking-tight">{stats.late}</h2>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-surface-container flex flex-col justify-between group hover:bg-surface-container-low transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-error/10 rounded-xl">
              <UserMinus className="w-6 h-6 text-error" />
            </div>
            <span className="text-xs font-medium text-error bg-error/5 px-2 py-1 rounded-full">Crítico</span>
          </div>
          <div>
            <p className="text-sm font-medium text-on-surface-variant mb-1">Ausências</p>
            <h2 className="text-3xl font-bold tracking-tight">{stats.absent}</h2>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-error" />
              Alertas Críticos
            </h3>
            <button className="text-sm font-semibold text-primary hover:underline">Ver todos</button>
          </div>
          <div className="space-y-3">
            {criticalAlerts.length > 0 ? criticalAlerts.map((alert) => (
              <div key={alert.id} className="bg-white p-4 rounded-2xl shadow-sm border border-surface-container flex items-start gap-4 transition-colors hover:bg-surface-container-low">
                <div className="p-2 bg-error/10 text-error rounded-full">
                  <MapPinOff className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-sm">Violação de Perímetro</h4>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">
                      {format(new Date(alert.timestamp), 'HH:mm')}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                    <strong>{alert.employeeName}</strong> registrou ponto fora do perímetro autorizado.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button 
                      onClick={() => handleApprove(alert.id!)}
                      className="px-3 py-1.5 bg-primary text-white text-[10px] font-bold rounded-lg hover:opacity-90 transition-all"
                    >
                      Aprovar Exceção
                    </button>
                    <button className="px-3 py-1.5 bg-surface-container text-on-surface text-[10px] font-bold rounded-lg hover:bg-surface-container-high transition-all">
                      Ver Foto
                    </button>
                  </div>
                </div>
              </div>
            )) : (
              <div className="bg-white p-8 rounded-2xl text-center border border-dashed border-surface-container">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm text-on-surface-variant">Nenhum alerta crítico no momento.</p>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-bold">Resumo por Unidade</h3>
          <div className="bg-white p-6 rounded-2xl border border-surface-container shadow-sm space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span>Matriz São Paulo</span>
                <span>98%</span>
              </div>
              <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full" style={{ width: '98%' }}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span>Filial Campinas</span>
                <span>82%</span>
              </div>
              <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full" style={{ width: '82%' }}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span>Centro de Distribuição</span>
                <span>65%</span>
              </div>
              <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: '65%' }}></div>
              </div>
            </div>
            
            <div className="pt-4 mt-4 border-t border-surface-container">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-surface-container-high flex items-center justify-center text-[10px] font-bold">
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-primary text-white flex items-center justify-center text-[10px] font-bold">+12</div>
                </div>
                <p className="text-[10px] font-medium text-on-surface-variant">Equipe de campo ativa agora</p>
              </div>
            </div>
          </div>

          <div className="bg-primary p-6 rounded-2xl text-white relative overflow-hidden shadow-lg">
            <div className="relative z-10">
              <h4 className="font-bold text-sm mb-2">Relatório Consolidado</h4>
              <p className="text-xs opacity-90 mb-4">Gere o PDF mensal de todos os colaboradores com um clique.</p>
              <button className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-lg text-xs font-bold hover:bg-white/30 transition-colors flex items-center gap-2">
                <Download className="w-4 h-4" />
                Baixar Agora
              </button>
            </div>
            <FileText className="absolute -bottom-4 -right-4 w-24 h-24 opacity-10" />
          </div>
        </section>
      </div>
    </div>
  );
}
