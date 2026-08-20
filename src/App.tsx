import React, { useState, useEffect } from 'react';
import { User, PunchRecord } from './types';
import { 
  seedInitialAdmin, 
  fetchAllUsers, 
  createNewUser, 
  updateUserRecord, 
  deleteUserRecord, 
  savePunchRecordToFirestore,
  updatePunchRecordInFirestore,
  deletePunchRecordFromFirestore,
  fetchPunchRecords,
  subscribeToPunchRecords,
  testFirestoreConnection
} from './lib/firebase';
import { cacheUsersForOffline, getCachedUsers, getOfflinePunches } from './lib/offlineStorage';
import { Navbar } from './components/Navbar';
import { LoginPage } from './components/LoginPage';
import { PunchClock } from './components/PunchClock';
import { AdminDashboard } from './components/AdminDashboard';
import { Loader2 } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<'punch' | 'admin'>('punch');
  const [users, setUsers] = useState<User[]>([]);
  const [punches, setPunches] = useState<PunchRecord[]>([]);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  // Initialize Firebase & seed admin if necessary
  useEffect(() => {
    let unsubscribePunches: (() => void) | undefined;

    const initializeApp = async () => {
      try {
        await testFirestoreConnection();
        // Seed default admin ('admin' / 'admin@123')
        await seedInitialAdmin();

        // Fetch users
        const fetchedUsers = await fetchAllUsers();
        setUsers(fetchedUsers);
        cacheUsersForOffline(fetchedUsers);

        // Fetch initial punch records & setup real-time listener
        const initialPunches = await fetchPunchRecords();
        const offlinePunches = getOfflinePunches();
        // Merge offline with fetched
        const merged = [...offlinePunches, ...initialPunches];
        setPunches(merged);

        // Subscribe to real-time changes from Firestore
        unsubscribePunches = subscribeToPunchRecords((updatedRecords) => {
          const offlines = getOfflinePunches();
          const combined = [...offlines, ...updatedRecords];
          // Deduplicate by ID
          const map = new Map<string, PunchRecord>();
          combined.forEach((item) => map.set(item.id, item));
          setPunches(Array.from(map.values()));
        });
      } catch (err) {
        console.warn('Initial load warning (offline fallback enabled):', err);
        const cached = getCachedUsers();
        if (cached.length > 0) {
          setUsers(cached);
        } else {
          // Default admin
          setUsers([
            {
              id: 'admin-user-01',
              username: 'admin',
              name: 'Administrador SkyPoint',
              role: 'admin',
              department: 'Diretoria / RH',
              cpf: '000.000.000-00',
              password: 'admin@123',
              active: true,
              createdAt: new Date().toISOString()
            }
          ]);
        }
        setPunches(getOfflinePunches());
      } finally {
        setIsInitializing(false);
      }
    };

    initializeApp();

    return () => {
      if (unsubscribePunches) unsubscribePunches();
    };
  }, []);

  // Handlers for User CRUD
  const handleAddUser = async (userData: Partial<User>) => {
    const created = await createNewUser(userData as any);
    const updatedUsers = [created, ...users];
    setUsers(updatedUsers);
    cacheUsersForOffline(updatedUsers);
  };

  const handleUpdateUser = async (id: string, updates: Partial<User>) => {
    await updateUserRecord(id, updates);
    const updatedUsers = users.map((u) => (u.id === id ? { ...u, ...updates } : u));
    setUsers(updatedUsers);
    cacheUsersForOffline(updatedUsers);
    if (currentUser?.id === id) {
      setCurrentUser((prev) => (prev ? { ...prev, ...updates } : null));
    }
  };

  const handleDeleteUser = async (id: string) => {
    await deleteUserRecord(id);
    const updatedUsers = users.filter((u) => u.id !== id);
    setUsers(updatedUsers);
    cacheUsersForOffline(updatedUsers);
  };

  // Handlers for Punch CRUD
  const handlePunchAdded = (newPunch: PunchRecord) => {
    setPunches((prev) => [newPunch, ...prev.filter((p) => p.id !== newPunch.id)]);
  };

  const handleAddManualPunch = async (recordData: Omit<PunchRecord, 'id'>) => {
    const saved = await savePunchRecordToFirestore(recordData);
    setPunches((prev) => [saved, ...prev]);
  };

  const handleUpdatePunch = async (id: string, updates: Partial<PunchRecord>) => {
    await updatePunchRecordInFirestore(id, updates);
    setPunches((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const handleDeletePunch = async (id: string) => {
    await deletePunchRecordFromFirestore(id);
    setPunches((prev) => prev.filter((p) => p.id !== id));
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    if (user.role === 'admin') {
      setCurrentView('admin');
    } else {
      setCurrentView('punch');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView('punch');
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-700 space-y-4">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <div className="text-center">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">Iniciando SkyPoint</h2>
          <p className="text-xs text-slate-500 mt-1">Conectando ao Firebase e carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-500/20 selection:text-indigo-900">
      
      {/* Top Navigation */}
      <Navbar
        currentUser={currentUser}
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {!currentUser ? (
          <LoginPage users={users} onLoginSuccess={handleLoginSuccess} />
        ) : currentView === 'admin' && currentUser.role === 'admin' ? (
          <AdminDashboard
            currentUser={currentUser}
            users={users}
            punches={punches}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
            onAddManualPunch={handleAddManualPunch}
            onUpdatePunch={handleUpdatePunch}
            onDeletePunch={handleDeletePunch}
          />
        ) : (
          <PunchClock
            currentUser={currentUser}
            allPunches={punches}
            onPunchAdded={handlePunchAdded}
          />
        )}
      </main>

      {/* Vercel Analytics */}
      <Analytics />

    </div>
  );
}
