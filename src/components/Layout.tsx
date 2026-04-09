import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { auth } from '../lib/firebase';
import { 
  LayoutDashboard, 
  History as HistoryIcon, 
  Settings as SettingsIcon, 
  LogOut, 
  CloudCheck, 
  Users,
  Menu,
  X,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { profile, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const handleLogout = () => {
    auth.signOut();
    navigate('/');
  };

  const navItems = [
    { label: 'Painel', path: '/', icon: LayoutDashboard },
    { label: 'Registros', path: '/history', icon: HistoryIcon },
    ...(isAdmin ? [{ label: 'Configurações', path: '/settings', icon: SettingsIcon }] : []),
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <aside className="h-screen w-64 hidden md:flex flex-col border-r border-surface-container-high bg-surface-container-low fixed left-0 top-0 p-4 space-y-2 z-40">
        <div className="text-lg font-bold text-primary mb-8 px-2 flex items-center gap-2">
          <CloudCheck className="w-6 h-6" />
          SkyPoint
        </div>
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all duration-200 ${
                  isActive 
                    ? 'bg-white text-primary shadow-sm' 
                    : 'text-on-surface-variant hover:text-primary hover:translate-x-1'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        
        <div className="pt-4 border-t border-surface-container">
          <div className="flex items-center gap-3 px-2 py-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
              {profile?.photoUrl ? (
                <img src={profile.photoUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-primary font-bold">{profile?.name?.charAt(0)}</span>
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold truncate">{profile?.name}</p>
              <p className="text-xs text-on-surface-variant truncate">{isAdmin ? 'Administrador' : 'Colaborador'}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-error hover:bg-error/5 rounded-xl font-semibold transition-all"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>
      </aside>

      <header className="w-full top-0 sticky md:hidden bg-background/80 backdrop-blur-xl border-b border-surface-container z-40">
        <div className="flex justify-between items-center px-6 py-4">
          <div className="flex items-center gap-2">
            <CloudCheck className="text-primary w-6 h-6" />
            <h1 className="text-xl font-bold text-primary tracking-tight">SkyPoint</h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 text-on-surface-variant">
              <Bell className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-on-surface-variant"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 top-16 bg-background z-30 md:hidden p-6"
          >
            <nav className="space-y-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-4 p-4 rounded-2xl font-bold text-lg ${
                      isActive ? 'bg-primary/10 text-primary' : 'text-on-surface-variant'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                    {item.label}
                  </Link>
                );
              })}
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-4 p-4 text-error font-bold text-lg"
              >
                <LogOut className="w-6 h-6" />
                Sair
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 md:ml-64 p-6 md:p-10 pb-24 md:pb-10 max-w-7xl mx-auto w-full">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 w-full h-16 bg-white/80 backdrop-blur-xl md:hidden flex justify-around items-center px-4 border-t border-surface-container z-40 shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-1 ${
                isActive ? 'text-primary' : 'text-on-surface-variant'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
        <button 
          onClick={handleLogout}
          className="flex flex-col items-center justify-center gap-1 text-on-surface-variant"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[10px] font-medium">Sair</span>
        </button>
      </nav>
    </div>
  );
}
