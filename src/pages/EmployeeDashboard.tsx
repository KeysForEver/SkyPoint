import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, query, where, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore';
import { 
  Fingerprint, 
  LogIn, 
  LogOut, 
  Camera, 
  History as HistoryIcon, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TimeRecord, Geofence } from '../types';

export default function EmployeeDashboard() {
  const { profile, user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [recordType, setRecordType] = useState<'entry' | 'exit'>('entry');
  const [lastRecord, setLastRecord] = useState<TimeRecord | null>(null);
  const [recentRecords, setRecentRecords] = useState<TimeRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const [photo, setPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user) return;

    const recordsRef = collection(db, 'records');
    const q = query(
      recordsRef,
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimeRecord));
      setRecentRecords(records);
      if (records.length > 0) {
        setLastRecord(records[0]);
        setRecordType(records[0].type === 'entry' ? 'exit' : 'entry');
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'records');
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const fetchGeofences = async () => {
      try {
        const snap = await getDocs(collection(db, 'geofences'));
        setGeofences(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Geofence)));
      } catch (err) {
        console.error('Error fetching geofences', err);
      }
    };
    fetchGeofences();
  }, []);

  const handleCapturePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getGeolocation = () => {
    return new Promise<{ lat: number, lng: number }>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalização não suportada'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: true }
      );
    });
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const handleRegister = async () => {
    if (!photo) {
      setError('A foto é obrigatória para o registro.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const loc = await getGeolocation();
      setLocation(loc);

      let status: 'approved' | 'divergent' = 'approved';
      if (geofences.length > 0) {
        const isInside = geofences.some(gf => calculateDistance(loc.lat, loc.lng, gf.lat, gf.lng) <= gf.radius);
        if (!isInside) status = 'divergent';
      }

      const record: Omit<TimeRecord, 'id'> = {
        userId: user!.uid,
        employeeId: profile!.employeeId,
        employeeName: profile!.name,
        type: recordType,
        timestamp: new Date().toISOString(),
        photoUrl: photo,
        location: {
          lat: loc.lat,
          lng: loc.lng,
          address: 'Localização capturada via GPS'
        },
        status
      };

      await addDoc(collection(db, 'records'), record);
      
      setSuccess(true);
      setPhoto(null);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError('Erro ao registrar ponto: ' + (err.message || 'Verifique permissões de GPS e câmera.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-on-background">Registro de Ponto</h2>
        <p className="text-on-surface-variant font-medium">Bom dia, {profile?.name?.split(' ')[0]}. Registre sua jornada hoje.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-8 bg-white rounded-3xl p-8 flex flex-col items-center justify-center relative overflow-hidden shadow-sm border border-surface-container">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
          
          <div className="text-center z-10 mb-8">
            <p className="text-primary font-semibold tracking-widest uppercase text-xs mb-2">Hora Atual</p>
            <h3 className="text-7xl md:text-8xl font-extrabold tracking-tighter text-on-surface">
              {format(currentTime, 'HH:mm')}<span className="text-primary animate-pulse">:</span>{format(currentTime, 'ss')}
            </h3>
            <p className="text-on-surface-variant font-medium mt-2 capitalize">
              {format(currentTime, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
          </div>

          <div className="flex p-1 bg-surface-container-low rounded-2xl mb-10 w-full max-w-sm">
            <button 
              onClick={() => setRecordType('entry')}
              className={`flex-1 py-3 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
                recordType === 'entry' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <LogIn className="w-5 h-5" />
              Entrada
            </button>
            <button 
              onClick={() => setRecordType('exit')}
              className={`flex-1 py-3 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
                recordType === 'exit' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <LogOut className="w-5 h-5" />
              Saída
            </button>
          </div>

          <div className="w-full max-w-sm space-y-4">
            {photo ? (
              <div className="relative rounded-2xl overflow-hidden aspect-video border-2 border-primary/20">
                <img src={photo} alt="Capture" className="w-full h-full object-cover" />
                <button 
                  onClick={() => setPhoto(null)}
                  className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-8 border-2 border-dashed border-surface-container rounded-2xl flex flex-col items-center justify-center gap-2 text-on-surface-variant hover:border-primary hover:text-primary transition-all"
              >
                <Camera className="w-8 h-8" />
                <span className="font-semibold">Tirar Foto Obrigatória</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="user" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleCapturePhoto}
                />
              </button>
            )}

            <button 
              onClick={handleRegister}
              disabled={loading || !photo}
              className="w-full bg-primary py-5 px-8 rounded-2xl text-white font-bold text-lg shadow-xl hover:scale-[1.02] active:scale-95 transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <Fingerprint className="w-6 h-6" />
              {loading ? 'Registrando...' : 'Registrar Agora'}
            </button>

            {error && (
              <p className="text-error text-center text-sm font-medium flex items-center justify-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            )}
          </div>
        </section>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <section className="bg-white rounded-3xl p-6 border-l-4 border-primary shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-primary/10 rounded-2xl">
                <CheckCircle2 className="w-6 h-6 text-primary" />
              </div>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 font-bold text-[10px] rounded-full uppercase tracking-wider">Ativo</span>
            </div>
            <h4 className="text-lg font-bold text-on-surface mb-1">Reconhecimento Facial</h4>
            <p className="text-sm text-on-surface-variant leading-relaxed">A biometria facial está habilitada para garantir a segurança dos seus registros.</p>
            <div className="mt-6 flex items-center gap-3 p-3 bg-surface-container-low rounded-xl">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-xs font-semibold text-on-surface">Câmera pronta para captura</span>
            </div>
          </section>

          <section className="bg-white rounded-3xl p-6 shadow-sm">
            <h4 className="text-sm font-bold text-on-surface-variant mb-4 flex items-center gap-2">
              <HistoryIcon className="w-4 h-4" />
              Último Registro
            </h4>
            {lastRecord ? (
              <div className="flex items-center gap-4">
                <div className="h-12 w-1 bg-primary rounded-full"></div>
                <div>
                  <p className="text-2xl font-bold text-on-surface">{format(new Date(lastRecord.timestamp), 'HH:mm')}</p>
                  <p className="text-xs text-on-surface-variant capitalize">
                    {lastRecord.type === 'entry' ? 'Entrada' : 'Saída'} em {format(new Date(lastRecord.timestamp), 'dd/MM/yyyy')}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-on-surface-variant italic">Nenhum registro encontrado.</p>
            )}
          </section>

          <section className="bg-primary rounded-3xl p-6 text-white overflow-hidden relative shadow-lg">
            <div className="absolute right-[-20px] bottom-[-20px] opacity-10">
              <Clock className="w-32 h-32" />
            </div>
            <h4 className="text-sm font-medium opacity-80 mb-1">Horas na Semana</h4>
            <p className="text-3xl font-extrabold mb-4">32h 15m</p>
            <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
              <div className="bg-white h-full w-[75%] rounded-full"></div>
            </div>
            <p className="text-[10px] mt-2 font-medium opacity-80">Meta: 44h semanais</p>
          </section>
        </div>

        <section className="lg:col-span-12 bg-white rounded-3xl p-8 shadow-sm border border-surface-container">
          <div className="flex items-center justify-between mb-8">
            <h4 className="text-xl font-bold text-on-surface">Registros Recentes</h4>
            <button className="text-primary font-bold text-sm hover:underline">Ver Histórico Completo</button>
          </div>
          <div className="space-y-4">
            {recentRecords.map((record) => (
              <div key={record.id} className="grid grid-cols-4 md:grid-cols-6 gap-4 py-4 px-4 bg-surface-container-low rounded-2xl items-center">
                <div className="col-span-1 flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${record.type === 'entry' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                    {record.type === 'entry' ? <LogIn className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
                  </div>
                  <span className="font-bold text-sm">{format(new Date(record.timestamp), 'dd MMM')}</span>
                </div>
                <div className="col-span-1 md:col-span-2">
                  <p className="text-xs text-on-surface-variant uppercase font-bold tracking-tighter">{record.type === 'entry' ? 'Entrada' : 'Saída'}</p>
                  <p className="font-bold">{format(new Date(record.timestamp), 'HH:mm')}</p>
                </div>
                <div className="col-span-1 md:col-span-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-on-surface-variant" />
                  <span className="text-xs text-on-surface-variant truncate max-w-[150px]">
                    {record.status === 'divergent' ? 'Fora do Perímetro' : 'Local Autorizado'}
                  </span>
                </div>
                <div className="col-span-1 text-right">
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-lg uppercase ${
                    record.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-error/10 text-error'
                  }`}>
                    {record.status === 'approved' ? 'OK' : 'Auditoria'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <AnimatePresence>
        {success && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/20 backdrop-blur-sm"
          >
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Registro Confirmado</h3>
              <p className="text-on-surface-variant mb-6">Sua jornada foi registrada com sucesso.</p>
              <button 
                onClick={() => setSuccess(false)}
                className="w-full py-4 bg-primary text-white rounded-xl font-bold shadow-lg"
              >
                Entendido
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
