import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  RefreshCw, 
  ShieldCheck, 
  Camera, 
  LayoutDashboard, 
  LogOut, 
  User as UserIcon,
  CheckCircle2
} from 'lucide-react';
import { User } from '../types';
import { formatSaoPauloTimeOnly, formatSaoPauloDateOnly } from '../lib/timeUtils';
import { getOfflinePunches, syncOfflinePunches } from '../lib/offlineStorage';

interface NavbarProps {
  currentUser: User | null;
  currentView: 'punch' | 'admin';
  onNavigate: (view: 'punch' | 'admin') => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  currentView,
  onNavigate,
  onLogout,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  // Real-time São Paulo Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(formatSaoPauloTimeOnly(now, true));
      setDateStr(formatSaoPauloDateOnly(now));
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Online / Offline listener and pending offline punch count
  useEffect(() => {
    const checkPending = () => {
      setPendingCount(getOfflinePunches().length);
    };

    checkPending();
    const interval = setInterval(checkPending, 3000);

    const handleOnline = async () => {
      setIsOnline(true);
      const offlineList = getOfflinePunches();
      if (offlineList.length > 0) {
        setIsSyncing(true);
        const res = await syncOfflinePunches();
        setIsSyncing(false);
        checkPending();
        if (res.success > 0) {
          setSyncSuccessMsg(`${res.success} ponto(s) sincronizado(s)!`);
          setTimeout(() => setSyncSuccessMsg(null), 4000);
        }
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleManualSync = async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    const res = await syncOfflinePunches();
    setIsSyncing(false);
    setPendingCount(getOfflinePunches().length);
    if (res.success > 0) {
      setSyncSuccessMsg(`${res.success} ponto(s) sincronizado(s)!`);
      setTimeout(() => setSyncSuccessMsg(null), 4000);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 text-slate-900 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand matching Sleek theme */}
          <div className="flex items-center">
            <span className="text-xl font-bold tracking-tight text-slate-800">
              SkyPoint
            </span>
          </div>

          {/* Center: Live Timezone in São Paulo */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-semibold text-slate-700">
                Fuso: São Paulo (GMT-3)
              </span>
              <span className="text-xs font-mono font-bold text-slate-900 border-l border-slate-200 pl-2">
                {timeStr || '--:--:--'}
              </span>
            </div>
          </div>

          {/* Right: Network Status, Pending Sync, Navigation, User & Logout */}
          <div className="flex items-center gap-3">
            
            {/* Sync toast */}
            {syncSuccessMsg && (
              <div className="hidden lg:flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg text-xs font-medium animate-fadeIn">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{syncSuccessMsg}</span>
              </div>
            )}

            {/* Pending Punches sync button */}
            {pendingCount > 0 && (
              <button
                id="btn-sync-offline"
                onClick={handleManualSync}
                disabled={!isOnline || isSyncing}
                title="Sincronizar pontos salvos offline"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold text-xs transition shadow-sm cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{pendingCount} pendente{pendingCount > 1 ? 's' : ''}</span>
              </button>
            )}

            {/* Navigation Tabs if Admin */}
            {currentUser && currentUser.role === 'admin' && (
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  id="nav-punch-btn"
                  onClick={() => onNavigate('punch')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    currentView === 'punch'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Bater Ponto</span>
                </button>
                <button
                  id="nav-admin-btn"
                  onClick={() => onNavigate('admin')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    currentView === 'admin'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Painel Admin</span>
                </button>
              </div>
            )}

            {/* Divider */}
            {currentUser && <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>}

            {/* User Profile & Logout */}
            {currentUser && (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-slate-800 leading-tight">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    {currentUser.role === 'admin' ? 'Administrador' : currentUser.department || 'Colaborador'}
                  </div>
                </div>

                <button
                  id="btn-logout"
                  onClick={onLogout}
                  title="Sair da conta"
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-500 border border-slate-200 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

          </div>

        </div>
      </div>

      {/* Mobile Live Time Sub-bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-1.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-600">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
          <span>SP (GMT-3)</span>
        </span>
        <span className="font-mono font-bold text-slate-800">{timeStr}</span>
      </div>
    </header>
  );
};
