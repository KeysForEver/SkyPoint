import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Clock, 
  Calendar, 
  Search, 
  Filter, 
  UserPlus, 
  FileSpreadsheet, 
  Trash2, 
  Edit3, 
  Eye, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  PlusCircle, 
  Download, 
  TrendingUp, 
  Activity, 
  Sparkles,
  RefreshCw,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { User, PunchRecord, PunchType } from '../types';
import { 
  formatSaoPauloDateTime, 
  formatSaoPauloTimeOnly, 
  formatSaoPauloDateOnly, 
  getSaoPauloDateKey, 
  getPunchTypeLabel, 
  getPunchTypeBadgeColor 
} from '../lib/timeUtils';
import { EmployeeModal } from './EmployeeModal';
import { EditPunchModal } from './EditPunchModal';
import { ManualPunchModal } from './ManualPunchModal';
import { ReceiptModal } from './ReceiptModal';

interface AdminDashboardProps {
  currentUser: User;
  users: User[];
  punches: PunchRecord[];
  onAddUser: (user: Partial<User>) => Promise<void>;
  onUpdateUser: (id: string, updates: Partial<User>) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
  onAddManualPunch: (record: Omit<PunchRecord, 'id'>) => Promise<void>;
  onUpdatePunch: (id: string, updates: Partial<PunchRecord>) => Promise<void>;
  onDeletePunch: (id: string) => Promise<void>;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  users,
  punches,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onAddManualPunch,
  onUpdatePunch,
  onDeletePunch,
}) => {
  // Navigation tabs in Admin
  const [activeTab, setActiveTab] = useState<'overview' | 'records' | 'employees'>('overview');

  // Filter states for records tab
  const todayKey = getSaoPauloDateKey(new Date());
  const [filterPeriod, setFilterPeriod] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [isManualPunchModalOpen, setIsManualPunchModalOpen] = useState(false);
  const [isEditPunchModalOpen, setIsEditPunchModalOpen] = useState(false);
  const [editingPunch, setEditingPunch] = useState<PunchRecord | null>(null);

  const [viewingReceipt, setViewingReceipt] = useState<PunchRecord | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteUserConfirmId, setDeleteUserConfirmId] = useState<string | null>(null);

  // Departments List
  const departments = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => {
      if (u.department) set.add(u.department);
    });
    return Array.from(set);
  }, [users]);

  // Today's punches
  const todayPunches = useMemo(() => {
    return punches.filter((p) => p.dateKey === todayKey);
  }, [punches, todayKey]);

  // Unique active employees today
  const todayUniqueEmployees = useMemo(() => {
    const set = new Set(todayPunches.map((p) => p.userId));
    return set.size;
  }, [todayPunches]);

  // Filtered punches for the Records table
  const filteredPunches = useMemo(() => {
    const now = new Date();
    return punches.filter((p) => {
      if (filterPeriod === 'today' && p.dateKey !== todayKey) return false;
      if (filterPeriod === 'week') {
        const pDate = new Date(p.timestamp);
        const diffDays = (now.getTime() - pDate.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 7) return false;
      }
      if (filterPeriod === 'month') {
        const pDate = new Date(p.timestamp);
        if (pDate.getMonth() !== now.getMonth() || pDate.getFullYear() !== now.getFullYear()) return false;
      }

      if (selectedUserFilter !== 'all' && p.userId !== selectedUserFilter) return false;
      if (selectedTypeFilter !== 'all' && p.type !== selectedTypeFilter) return false;
      if (selectedDeptFilter !== 'all' && p.userDepartment !== selectedDeptFilter) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = p.userName.toLowerCase().includes(query);
        const matchDept = (p.userDepartment || '').toLowerCase().includes(query);
        const matchNotes = (p.notes || '').toLowerCase().includes(query);
        const matchAddr = (p.address || '').toLowerCase().includes(query);
        if (!matchName && !matchDept && !matchNotes && !matchAddr) return false;
      }

      return true;
    });
  }, [punches, filterPeriod, selectedUserFilter, selectedTypeFilter, selectedDeptFilter, searchQuery, todayKey]);

  // Chart Data: Hourly Distribution for today
  const hourlyData = useMemo(() => {
    const buckets: { [key: string]: number } = {
      '06:00 - 09:00': 0,
      '09:00 - 12:00': 0,
      '12:00 - 15:00': 0,
      '15:00 - 18:00': 0,
      '18:00 - 21:00': 0,
      'Outros': 0,
    };

    todayPunches.forEach((p) => {
      const d = new Date(p.timestamp);
      const hour = d.getHours();
      if (hour >= 6 && hour < 9) buckets['06:00 - 09:00']++;
      else if (hour >= 9 && hour < 12) buckets['09:00 - 12:00']++;
      else if (hour >= 12 && hour < 15) buckets['12:00 - 15:00']++;
      else if (hour >= 15 && hour < 18) buckets['15:00 - 18:00']++;
      else if (hour >= 18 && hour < 21) buckets['18:00 - 21:00']++;
      else buckets['Outros']++;
    });

    return Object.entries(buckets).map(([name, count]) => ({ name, count }));
  }, [todayPunches]);

  // Chart Data: Type Distribution
  const typeDistributionData = useMemo(() => {
    const counts = {
      Entradas: 0,
      'Saídas Almoço': 0,
      'Retornos Almoço': 0,
      Saídas: 0,
    };

    todayPunches.forEach((p) => {
      if (p.type === 'entry') counts.Entradas++;
      else if (p.type === 'lunch_start') counts['Saídas Almoço']++;
      else if (p.type === 'lunch_end') counts['Retornos Almoço']++;
      else if (p.type === 'exit') counts.Saídas++;
    });

    return [
      { name: 'Entradas', value: counts.Entradas, color: '#10b981' },
      { name: 'Saída Almoço', value: counts['Saídas Almoço'], color: '#f59e0b' },
      { name: 'Retorno Almoço', value: counts['Retornos Almoço'], color: '#6366f1' },
      { name: 'Saídas', value: counts.Saídas, color: '#ef4444' },
    ].filter((item) => item.value > 0);
  }, [todayPunches]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Colaborador', 'Departamento', 'Tipo', 'Data/Hora (SP)', 'Endereco/GPS', 'Offline Sincronizado', 'Observacao'];
    const rows = filteredPunches.map((p) => [
      `"${p.id}"`,
      `"${p.userName}"`,
      `"${p.userDepartment || ''}"`,
      `"${p.typeLabel}"`,
      `"${p.timestampSaoPaulo || formatSaoPauloDateTime(p.timestamp)}"`,
      `"${(p.address || '').replace(/"/g, '""')}"`,
      p.isOfflineSynced ? 'Sim' : 'Nao',
      `"${(p.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SkyPoint_Relatorio_${filterPeriod}_${todayKey}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEditEmployee = (u: User) => {
    setEditingUser(u);
    setIsEmployeeModalOpen(true);
  };

  const handleCreateEmployee = () => {
    setEditingUser(null);
    setIsEmployeeModalOpen(true);
  };

  const handleEditPunch = (p: PunchRecord) => {
    setEditingPunch(p);
    setIsEditPunchModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6">
      
      {/* Header Banner matching Sleek Interface */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Painel do Administrador
          </h1>
        </div>

        {/* Action Buttons Top */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="btn-admin-add-employee"
            onClick={handleCreateEmployee}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 flex items-center gap-1.5 transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Novo Funcionário</span>
          </button>

          <button
            id="btn-admin-manual-punch"
            onClick={() => setIsManualPunchModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 flex items-center gap-1.5 transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-indigo-600" />
            <span>Ponto Manual</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation in Sleek style */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 overflow-x-auto scrollbar-none gap-1">
        <button
          id="tab-overview"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Visão Geral & Métricas</span>
        </button>

        <button
          id="tab-records"
          onClick={() => setActiveTab('records')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'records'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Registros de Ponto ({punches.length})</span>
        </button>

        <button
          id="tab-employees"
          onClick={() => setActiveTab('employees')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'employees'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Gestão de Funcionários ({users.length})</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: VISÃO GERAL & GRÁFICOS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          
          {/* Key Metrics Cards in Sleek Interface */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Colaboradores</span>
                <Users className="w-4 h-4 text-indigo-600" />
              </div>
              <h4 className="text-3xl font-bold text-slate-800">
                {users.length}
              </h4>
              <div className="mt-2 text-xs text-emerald-600 font-medium">
                {users.filter(u => u.active).length} ativos no sistema
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Registros Hoje</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <h4 className="text-3xl font-bold text-slate-800">
                {todayPunches.length}
              </h4>
              <div className="mt-2 text-xs text-amber-600 font-medium">
                {todayUniqueEmployees} colaboradores presentes
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Entradas Turno</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <h4 className="text-3xl font-bold text-emerald-600">
                {todayPunches.filter(p => p.type === 'entry').length}
              </h4>
              <div className="mt-2 text-xs text-slate-500 font-medium">
                Inícios de expediente
              </div>
            </div>

          </div>

          {/* Simple Clean Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Hourly Distribution Bar Chart (7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    Volume de Batidas por Horário (Hoje)
                  </h3>
                  <p className="text-xs text-slate-500">Distribuição de fluxo ao longo do expediente</p>
                </div>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <XAxis 
                      dataKey="name" 
                      stroke="#94a3b8" 
                      fontSize={10} 
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="#94a3b8" 
                      fontSize={10} 
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '12px', color: '#1e293b', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(val: number) => [`${val} batidas`, 'Registros']}
                    />
                    <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Type Distribution Donut (5 cols) */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Distribuição por Tipo de Ponto
                </h3>
                <p className="text-xs text-slate-500 mb-3">
                  Entradas, saídas e intervalos computados hoje
                </p>
              </div>

              {typeDistributionData.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  Sem batidas registradas hoje ainda.
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={typeDistributionData}
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {typeDistributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-2 gap-2 w-full mt-2 text-xs">
                    {typeDistributionData.map((item) => (
                      <div key={item.name} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-600 truncate">{item.name}:</span>
                        <span className="font-bold text-slate-800 ml-auto">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

          </div>

          {/* Real-time Today's Feed */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">Últimas Batidas em Tempo Real</h3>
                <p className="text-xs text-slate-500">Registros do dia com fotos selfies capturadas</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('records')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
              >
                <span>Ver todos</span>
                <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
              </button>
            </div>

            {todayPunches.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
                Nenhum ponto registrado hoje até o momento.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {todayPunches.slice(0, 6).map((punch) => {
                  const badge = getPunchTypeBadgeColor(punch.type);
                  return (
                    <div
                      key={punch.id}
                      onClick={() => setViewingReceipt(punch)}
                      className="p-3.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-2xl flex items-center justify-between cursor-pointer transition shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={punch.photo}
                          alt="Selfie"
                          className="w-11 h-11 rounded-xl object-cover border border-slate-200 shadow-sm"
                        />
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 truncate max-w-[130px]">
                            {punch.userName}
                          </h4>
                          <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-md border mt-0.5 ${badge.bg} ${badge.border} ${badge.text}`}>
                            {punch.typeLabel}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono text-xs font-bold text-indigo-600">
                          {formatSaoPauloTimeOnly(punch.timestamp)}
                        </span>
                        <span className="block text-[9px] text-slate-400 truncate max-w-[85px]">
                          {punch.address?.split(',')[0] || 'São Paulo'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: REGISTROS DE PONTO (TABELA COMPLETA & FILTROS) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'records' && (
        <div className="space-y-4">
          
          {/* Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              
              {/* Search input */}
              <div className="relative lg:col-span-2">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  id="filter-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por colaborador, setor ou nota..."
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Period Filter */}
              <div>
                <select
                  id="filter-period-select"
                  value={filterPeriod}
                  onChange={(e) => setFilterPeriod(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                >
                  <option value="today">Período: Hoje</option>
                  <option value="week">Últimos 7 dias</option>
                  <option value="month">Este Mês</option>
                  <option value="all">Todo o Histórico</option>
                </select>
              </div>

              {/* Employee Filter */}
              <div>
                <select
                  id="filter-user-select"
                  value={selectedUserFilter}
                  onChange={(e) => setSelectedUserFilter(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                >
                  <option value="all">Todos os Funcionários</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type Filter */}
              <div>
                <select
                  id="filter-type-select"
                  value={selectedTypeFilter}
                  onChange={(e) => setSelectedTypeFilter(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                >
                  <option value="all">Todos os Tipos</option>
                  <option value="entry">Entrada</option>
                  <option value="lunch_start">Saída Intervalo</option>
                  <option value="lunch_end">Retorno Intervalo</option>
                  <option value="exit">Saída</option>
                  <option value="custom">Especial / Manual</option>
                </select>
              </div>

            </div>

            {/* Sub Filter Row & Export */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs">
              <div className="text-slate-500">
                Exibindo <strong className="text-slate-800">{filteredPunches.length}</strong> registro(s)
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="btn-export-csv"
                  type="button"
                  onClick={handleExportCSV}
                  disabled={filteredPunches.length === 0}
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold border border-indigo-200 flex items-center gap-1.5 transition disabled:opacity-40 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Exportar CSV</span>
                </button>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-4 px-6">Selfie</th>
                    <th className="py-4 px-4">Colaborador</th>
                    <th className="py-4 px-4">Tipo</th>
                    <th className="py-4 px-4">Data & Horário (SP)</th>
                    <th className="py-4 px-4">Localização / GPS</th>
                    <th className="py-4 px-4 text-center">Modo</th>
                    <th className="py-4 px-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPunches.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        Nenhum registro encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredPunches.map((punch) => {
                      const badge = getPunchTypeBadgeColor(punch.type);
                      return (
                        <tr key={punch.id} className="hover:bg-slate-50/70 transition-colors">
                          
                          {/* Photo Thumbnail */}
                          <td className="py-3 px-6">
                            <img
                              src={punch.photo}
                              alt="Selfie"
                              onClick={() => setViewingReceipt(punch)}
                              className="w-10 h-10 rounded-xl object-cover border border-slate-200 cursor-pointer hover:scale-105 transition shadow-sm"
                            />
                          </td>

                          {/* Employee Name & Dept */}
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-800">{punch.userName}</div>
                            <div className="text-[10px] text-slate-400">{punch.userDepartment || 'Geral'}</div>
                          </td>

                          {/* Punch Type */}
                          <td className="py-3 px-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${badge.bg} ${badge.border} ${badge.text}`}>
                              {punch.typeLabel}
                            </span>
                          </td>

                          {/* Timestamp SP */}
                          <td className="py-3 px-4 font-mono">
                            <div className="text-slate-800 font-bold">
                              {formatSaoPauloTimeOnly(punch.timestamp)}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {punch.dateKey}
                            </div>
                          </td>

                          {/* Location */}
                          <td className="py-3 px-4 max-w-[200px]">
                            <div className="truncate text-slate-600" title={punch.address}>
                              {punch.address || 'Sem GPS'}
                            </div>
                            {punch.notes && (
                              <div className="text-[10px] text-indigo-600 truncate italic" title={punch.notes}>
                                Nota: {punch.notes}
                              </div>
                            )}
                          </td>

                          {/* Offline / Online Badge */}
                          <td className="py-3 px-4 text-center">
                            {punch.isOfflineSynced ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                                Offline Sync
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                Online
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-6 text-right">
                            <div className="flex items-center justify-end gap-2 text-slate-400">
                              
                              <button
                                type="button"
                                onClick={() => setViewingReceipt(punch)}
                                title="Ver Comprovante Oficial"
                                className="p-1.5 hover:text-indigo-600 transition-colors cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleEditPunch(punch)}
                                title="Editar Registro"
                                className="p-1.5 hover:text-amber-600 transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              {deleteConfirmId === punch.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await onDeletePunch(punch.id);
                                      setDeleteConfirmId(null);
                                    }}
                                    className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                                  >
                                    Sim
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="px-1.5 py-1 bg-slate-200 text-slate-700 rounded-lg text-[10px] cursor-pointer"
                                  >
                                    Não
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(punch.id)}
                                  title="Excluir Registro"
                                  className="p-1.5 hover:text-red-600 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}

                            </div>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: GESTÃO DE FUNCIONÁRIOS (CADASTRO, EDITAR, SENHAS) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'employees' && (
        <div className="space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
            <div>
              <h3 className="text-base font-bold text-slate-800">Quadro de Colaboradores</h3>
              <p className="text-xs text-slate-500">Controle de login, senhas e permissões de acesso ao SkyPoint</p>
            </div>

            <button
              id="btn-add-emp-tab"
              type="button"
              onClick={handleCreateEmployee}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-200 flex items-center gap-1.5 transition self-start sm:self-auto cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Cadastrar Novo Funcionário</span>
            </button>
          </div>

          {/* Employees List Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((u) => {
              const punchCount = punches.filter((p) => p.userId === u.id).length;
              return (
                <div
                  key={u.id}
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-3xl p-5 shadow-sm flex flex-col justify-between space-y-4 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 font-bold flex items-center justify-center text-base shadow-sm">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                          <span>{u.name}</span>
                          {u.role === 'admin' && (
                            <ShieldCheck className="w-4 h-4 text-indigo-600" title="Administrador" />
                          )}
                        </h4>
                        <p className="text-xs text-slate-500 font-medium">@{u.username}</p>
                      </div>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      u.active 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {u.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>Departamento:</span>
                      <span className="text-slate-800 font-semibold">{u.department || 'Geral'}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Total de Batidas:</span>
                      <span className="text-indigo-600 font-bold">{punchCount}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Nível:</span>
                      <span className="text-slate-800 font-semibold">
                        {u.role === 'admin' ? 'Administrador' : 'Colaborador'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    
                    <button
                      type="button"
                      onClick={() => handleEditEmployee(u)}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-indigo-700 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar / Senha</span>
                    </button>

                    {/* Delete button only if not initial admin */}
                    {u.username !== 'admin' && (
                      deleteUserConfirmId === u.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={async () => {
                              await onDeleteUser(u.id);
                              setDeleteUserConfirmId(null);
                            }}
                            className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            Excluir
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteUserConfirmId(null)}
                            className="px-1.5 py-1 bg-slate-200 text-slate-700 rounded-lg text-[10px] cursor-pointer"
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteUserConfirmId(u.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 transition cursor-pointer"
                          title="Excluir Funcionário"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )
                    )}

                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* MODALS */}
      <EmployeeModal
        isOpen={isEmployeeModalOpen}
        onClose={() => setIsEmployeeModalOpen(false)}
        onSave={async (data) => {
          if (editingUser) {
            await onUpdateUser(editingUser.id, data);
          } else {
            await onAddUser(data as any);
          }
        }}
        editingUser={editingUser}
      />

      <ManualPunchModal
        isOpen={isManualPunchModalOpen}
        onClose={() => setIsManualPunchModalOpen(false)}
        onSave={onAddManualPunch}
        users={users}
      />

      <EditPunchModal
        isOpen={isEditPunchModalOpen}
        onClose={() => setIsEditPunchModalOpen(false)}
        onSave={onUpdatePunch}
        punch={editingPunch}
      />

      <ReceiptModal
        punch={viewingReceipt}
        onClose={() => setViewingReceipt(null)}
      />

    </div>
  );
};
