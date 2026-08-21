import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Camera, 
  SwitchCamera, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  WifiOff, 
  Eye, 
  Building2, 
  FileText, 
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { User, PunchRecord, PunchType } from '../types';
import { 
  formatSaoPauloDateTime, 
  formatSaoPauloTimeOnly, 
  getSaoPauloDateKey, 
  getPunchTypeLabel, 
  getPunchTypeBadgeColor,
  generatePunchReceiptHash 
} from '../lib/timeUtils';
import { getCurrentLocation } from '../lib/geolocation';
import { saveOfflinePunch } from '../lib/offlineStorage';
import { savePunchRecordToFirestore } from '../lib/firebase';
import { ReceiptModal } from './ReceiptModal';

interface PunchClockProps {
  currentUser: User;
  allPunches: PunchRecord[];
  onPunchAdded: (punch: PunchRecord) => void;
}

export const PunchClock: React.FC<PunchClockProps> = ({
  currentUser,
  allPunches,
  onPunchAdded,
}) => {
  const [punchType, setPunchType] = useState<PunchType>('entry');
  const [notes, setNotes] = useState<string>('');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraLoading, setCameraLoading] = useState<boolean>(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Photo & Location state
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [location, setLocation] = useState<{
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    address?: string;
  }>({});
  const [loadingLocation, setLoadingLocation] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successRecord, setSuccessRecord] = useState<PunchRecord | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<PunchRecord | null>(null);

  // Live Clock
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const todayKey = getSaoPauloDateKey(new Date());

  // User's punches for today
  const myTodayPunches = useMemo(() => {
    return allPunches.filter((p) => p.userId === currentUser.id && p.dateKey === todayKey);
  }, [allPunches, currentUser.id, todayKey]);

  // Real-time São Paulo clock
  useEffect(() => {
    const updateTime = () => {
      setCurrentTimeStr(formatSaoPauloTimeOnly(new Date(), true));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Initialize camera stream with robust fallbacks for mobile browsers
  const startCamera = async () => {
    setCameraLoading(true);
    setCameraError(null);

    // Stop existing stream if any
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Seu navegador não suporta acesso direto à câmera. Use o botão "Tirar Foto" abaixo.');
      setCameraActive(false);
      setCameraLoading(false);
      return;
    }

    let stream: MediaStream | null = null;

    // Strategy 1: Ideal constraints for mobile front/rear camera
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });
    } catch (err1) {
      console.warn('Strategy 1 camera attempt failed, trying basic facingMode:', err1);
      // Strategy 2: Simple facingMode string
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: false,
        });
      } catch (err2) {
        console.warn('Strategy 2 camera attempt failed, trying fallback video=true:', err2);
        // Strategy 3: Pure video fallback
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } catch (err3: any) {
          console.error('All camera attempts failed:', err3);
          const isDenied = err3.name === 'NotAllowedError' || err3.name === 'PermissionDeniedError';
          setCameraError(
            isDenied
              ? 'Permissão da câmera bloqueada. Conceda permissão no navegador ou tire uma foto abaixo.'
              : 'Não foi possível acessar a câmera do dispositivo. Você pode tirar a foto pelo botão abaixo.'
          );
          setCameraActive(false);
          setCameraLoading(false);
          return;
        }
      }
    }

    if (stream) {
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('Video play catch:', playErr);
        }
      }
      setCameraActive(true);
      setCameraLoading(false);
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Start camera on mount & change facing mode
  useEffect(() => {
    startCamera();
    loadLocation();

    return () => {
      stopCamera();
    };
  }, [facingMode]);

  // Handle native file input capture (100% resilient fallback for mobile)
  const handleNativeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        // Draw onto canvas to add timestamp overlay
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width || 640;
          canvas.height = img.height || 480;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
            ctx.fillRect(0, canvas.height - 36, canvas.width, 36);
            ctx.fillStyle = '#ffffff';
            ctx.font = '14px monospace';
            ctx.fillText(
              `SkyPoint | ${currentUser.name} | ${formatSaoPauloDateTime(new Date())}`,
              12,
              canvas.height - 14
            );
            const formattedData = canvas.toDataURL('image/jpeg', 0.85);
            setCapturedPhoto(formattedData);
          } else {
            setCapturedPhoto(result);
          }
        };
        img.src = result;
      }
    };
    reader.readAsDataURL(file);
  };

  // Load geolocation
  const loadLocation = async () => {
    setLoadingLocation(true);
    try {
      const geo = await getCurrentLocation();
      if (geo) {
        setLocation({
          latitude: geo.latitude,
          longitude: geo.longitude,
          accuracy: geo.accuracy,
          address: geo.address,
        });
      }
    } catch (err) {
      console.warn('Geolocation warn:', err);
    } finally {
      setLoadingLocation(false);
    }
  };

  // Take selfie photo
  const takeSelfie = (): string | null => {
    if (!videoRef.current) return null;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Overlay timestamp stamp on canvas
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, canvas.height - 36, canvas.width, 36);
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px monospace';
    ctx.fillText(
      `SkyPoint | ${currentUser.name} | ${formatSaoPauloDateTime(new Date())}`,
      12,
      canvas.height - 14
    );

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedPhoto(dataUrl);
    return dataUrl;
  };

  // Handle punch submission
  const handleRegisterPunch = async () => {
    setSubmitting(true);
    try {
      let photoData = capturedPhoto;
      if (!photoData) {
        photoData = takeSelfie();
      }

      if (!photoData) {
        // Fallback placeholder photo
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(0, 0, 400, 400);
          ctx.fillStyle = '#4f46e5';
          ctx.beginPath();
          ctx.arc(200, 160, 80, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 20px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(currentUser.name, 200, 320);
        }
        photoData = canvas.toDataURL('image/jpeg', 0.8);
      }

      const now = new Date();
      const isoTimestamp = now.toISOString();
      const spFormatted = formatSaoPauloDateTime(now);
      const todayDateKey = getSaoPauloDateKey(now);
      const typeLabel = getPunchTypeLabel(punchType);
      const receiptHash = generatePunchReceiptHash(currentUser.id, isoTimestamp);
      const tempId = 'punch-' + Date.now();

      const punchData: PunchRecord = {
        id: tempId,
        userId: currentUser.id,
        userName: currentUser.name,
        userDepartment: currentUser.department || 'Geral',
        type: punchType,
        typeLabel,
        timestamp: isoTimestamp,
        timestampSaoPaulo: spFormatted,
        dateKey: todayDateKey,
        photo: photoData,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        address: location.address || 'Localização aproximada (São Paulo)',
        isOfflineSynced: !navigator.onLine,
        notes: notes.trim() ? notes.trim() : undefined,
        deviceInfo: navigator.userAgent.substring(0, 80),
        hash: receiptHash,
      };

      let savedRecord: PunchRecord = punchData;

      if (!navigator.onLine) {
        saveOfflinePunch(punchData);
      } else {
        try {
          const remoteSaved = await savePunchRecordToFirestore({
            userId: punchData.userId,
            userName: punchData.userName,
            userDepartment: punchData.userDepartment,
            type: punchData.type,
            typeLabel: punchData.typeLabel,
            timestamp: punchData.timestamp,
            timestampSaoPaulo: punchData.timestampSaoPaulo,
            dateKey: punchData.dateKey,
            photo: punchData.photo,
            latitude: punchData.latitude,
            longitude: punchData.longitude,
            accuracy: punchData.accuracy,
            address: punchData.address,
            isOfflineSynced: false,
            notes: punchData.notes,
            deviceInfo: punchData.deviceInfo,
            hash: punchData.hash,
          });
          if (remoteSaved) {
            savedRecord = remoteSaved;
          }
        } catch (fbErr) {
          console.warn('Firestore write failed, falling back to local offline queue:', fbErr);
          saveOfflinePunch(punchData);
        }
      }

      onPunchAdded(savedRecord);
      setSuccessRecord(savedRecord);
      setCapturedPhoto(null);
      setNotes('');

      // Auto cycle to next suggested punch type
      if (punchType === 'entry') setPunchType('lunch_start');
      else if (punchType === 'lunch_start') setPunchType('lunch_end');
      else if (punchType === 'lunch_end') setPunchType('exit');
    } catch (err: any) {
      console.error('Error submitting punch:', err);
      alert('Erro ao registrar ponto: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
      
      {/* Success Notification Banner */}
      {successRecord && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-emerald-950">
                Ponto Registrado com Sucesso! ({successRecord.typeLabel})
              </h4>
              <p className="text-xs text-emerald-700">
                Horário oficial de SP: {successRecord.timestampSaoPaulo} | Hash: {successRecord.hash?.substring(0, 14)}...
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setViewingReceipt(successRecord)}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Ver Comprovante</span>
            </button>
            <button
              type="button"
              onClick={() => setSuccessRecord(null)}
              className="px-2.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-medium rounded-lg transition cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Main Grid matching Sleek Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ======================================================== */}
        {/* LEFT COLUMN: PUNCH CLOCK CAMERA & REGISTRATION CARD      */}
        {/* ======================================================== */}
        <section className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
          
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Registro de Ponto</h3>
                <p className="text-xs text-slate-500">Módulo Mobile / Selfie Biometric</p>
              </div>
              <button
                type="button"
                onClick={toggleFacingMode}
                title="Alternar câmera"
                className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition shadow-sm cursor-pointer"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>
            </div>

            {/* Camera Viewfinder */}
            <div className="p-6 flex flex-col items-center gap-5">
              
              {/* Hidden file input for 100% native mobile camera fallback */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={handleNativeFileChange}
              />

              <div className="w-full aspect-[3/4] max-h-[380px] bg-slate-900 rounded-2xl relative overflow-hidden flex items-center justify-center border-4 border-slate-100 shadow-inner">
                
                {/* Persistent Video Element - Always Mounted */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  onLoadedMetadata={() => {
                    videoRef.current?.play().catch((e) => console.warn('Autoplay prevented:', e));
                  }}
                  className={`w-full h-full object-cover transition-opacity duration-300 ${
                    cameraActive && !capturedPhoto ? 'opacity-100' : 'opacity-0 absolute'
                  }`}
                  style={{
                    transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                  }}
                />

                {/* Captured Photo Preview */}
                {capturedPhoto && (
                  <div className="w-full h-full relative">
                    <img
                      src={capturedPhoto}
                      alt="Biometria capturada"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 left-4 bg-emerald-600/90 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-md">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Foto Pronta</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCapturedPhoto(null);
                        startCamera();
                      }}
                      className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer backdrop-blur-sm"
                    >
                      Tirar Outra
                    </button>
                  </div>
                )}

                {/* Camera Loading State */}
                {cameraLoading && !cameraActive && !capturedPhoto && !cameraError && (
                  <div className="flex flex-col items-center justify-center p-6 text-center text-slate-300">
                    <div className="w-10 h-10 border-3 border-white/20 border-t-indigo-500 rounded-full animate-spin mb-3" />
                    <span className="text-xs font-medium">Iniciando câmera...</span>
                  </div>
                )}

                {/* Camera Error / Permission Fallback State */}
                {cameraError && !capturedPhoto && (
                  <div className="flex flex-col items-center justify-center p-6 text-center text-white gap-3 z-10">
                    <AlertCircle className="w-10 h-10 text-amber-400" />
                    <p className="text-xs text-slate-200 max-w-[240px]">
                      {cameraError}
                    </p>
                    <div className="flex flex-col w-full gap-2 mt-1">
                      <button
                        type="button"
                        onClick={startCamera}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Tentar Novamente</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Abrir Câmera do Celular</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Live Overlays (Only when camera active & no static photo) */}
                {cameraActive && !capturedPhoto && (
                  <>
                    {/* Facial Alignment Guide */}
                    <div className="absolute inset-0 border-2 border-indigo-400/40 pointer-events-none rounded-xl m-4" />

                    {/* Top Overlay Badge with Live SP REC */}
                    <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-md text-[10px] text-white flex items-center gap-1.5 font-mono shadow">
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                      <span>REC {currentTimeStr || '09:41:22'}</span>
                    </div>

                    {/* Location indicator inside video */}
                    <div className="absolute bottom-3 left-3 right-3 bg-black/60 backdrop-blur-sm px-2.5 py-1.5 rounded-lg text-[10px] text-white/90 truncate flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                      <span className="truncate">{location.address || 'Capturando localização GPS...'}</span>
                    </div>
                  </>
                )}

              </div>

              {/* Native Camera Quick Button (Optional Alternative on Mobile) */}
              <div className="w-full flex justify-between items-center px-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 transition cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Usar app de câmera nativo</span>
                </button>
                {cameraActive && !capturedPhoto && (
                  <button
                    type="button"
                    onClick={() => takeSelfie()}
                    className="text-[11px] text-slate-500 hover:text-slate-700 font-medium transition cursor-pointer"
                  >
                    Congelar foto
                  </button>
                )}
              </div>

              {/* Time & GPS Info */}
              <div className="w-full text-center">
                <p className="text-3xl font-mono font-bold text-slate-800 tracking-tight">
                  {currentTimeStr || '00:00:00'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  São Paulo, SP — Precisão {location.accuracy ? `~${location.accuracy}m` : '5m'}
                </p>
              </div>

              {/* Punch Type Selector */}
              <div className="w-full grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPunchType('entry')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                    punchType === 'entry'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  🟢 Entrada
                </button>
                <button
                  type="button"
                  onClick={() => setPunchType('lunch_start')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                    punchType === 'lunch_start'
                      ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  🟡 Saída Almoço
                </button>
                <button
                  type="button"
                  onClick={() => setPunchType('lunch_end')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                    punchType === 'lunch_end'
                      ? 'bg-blue-50 text-blue-800 border-blue-300 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  🔵 Retorno Almoço
                </button>
                <button
                  type="button"
                  onClick={() => setPunchType('exit')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                    punchType === 'exit'
                      ? 'bg-red-50 text-red-800 border-red-300 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  🔴 Saída
                </button>
              </div>

              {/* Optional Note */}
              <div className="w-full">
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observação opcional..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Main Submit Button matching Sleek theme */}
              <button
                id="btn-register-punch-action"
                type="button"
                onClick={handleRegisterPunch}
                disabled={submitting}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 disabled:opacity-50 cursor-pointer text-sm"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Camera className="w-5 h-5" />
                    <span>REGISTRAR {getPunchTypeLabel(punchType).toUpperCase()}</span>
                  </>
                )}
              </button>

            </div>

          </div>

          {/* Offline Sync Card matching design */}
          <div className="bg-blue-600 p-4 rounded-2xl text-white flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-blue-200" />
              <div>
                <span className="text-sm font-semibold block leading-tight">Offline Sync: Ativo</span>
                <span className="text-[11px] text-blue-100">Armazena localmente sem sinal de internet</span>
              </div>
            </div>
            <span className="text-xs font-semibold bg-white/20 px-2.5 py-1 rounded-lg">
              Local DB
            </span>
          </div>

        </section>

        {/* ======================================================== */}
        {/* RIGHT COLUMN: METRICS & TODAY'S PUNCH MONITORING TABLE   */}
        {/* ======================================================== */}
        <section className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
          
          {/* Top 3 Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Minhas Batidas Hoje
              </p>
              <h4 className="text-3xl font-bold text-slate-800">
                {myTodayPunches.length}
              </h4>
              <div className="mt-2 text-xs text-indigo-600 font-medium">
                {myTodayPunches.length === 0 ? 'Nenhum registro ainda' : `${myTodayPunches.length} ponto(s) computado(s)`}
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Colaborador
              </p>
              <h4 className="text-xl font-bold text-slate-800 truncate">
                {currentUser.name.split(' ')[0]}
              </h4>
              <div className="mt-2 text-xs text-slate-500 font-medium truncate">
                Setor: {currentUser.department || 'Geral'}
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Status Firebase
              </p>
              <h4 className="text-3xl font-bold text-emerald-600">
                Online
              </h4>
              <div className="mt-2 text-xs text-slate-400 font-medium">
                Sincronizado: Agora
              </div>
            </div>

          </div>

          {/* Real-time Today's Punches Monitoring Table */}
          <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            
            <div className="px-6 sm:px-8 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Monitoramento em Tempo Real (Hoje)</h3>
                <p className="text-xs text-slate-500">Histórico pessoal com comprovantes eletrônicos</p>
              </div>
              <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg">
                {myTodayPunches.length} batida(s)
              </span>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider font-bold sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-6 py-3.5">Selfie</th>
                    <th className="text-left px-4 py-3.5">Evento</th>
                    <th className="text-left px-4 py-3.5">Horário (SP)</th>
                    <th className="text-left px-4 py-3.5">Localização</th>
                    <th className="text-center px-6 py-3.5">Comprovante</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
                  {myTodayPunches.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-slate-400 text-xs">
                        Você ainda não registrou nenhum ponto hoje. Utilize a câmera ao lado para bater ponto.
                      </td>
                    </tr>
                  ) : (
                    myTodayPunches.map((record) => {
                      const badge = getPunchTypeBadgeColor(record.type);
                      return (
                        <tr key={record.id} className="hover:bg-slate-50/70 transition-colors">
                          
                          {/* Selfie thumbnail */}
                          <td className="px-6 py-3.5">
                            <img
                              src={record.photo}
                              alt="Selfie"
                              onClick={() => setViewingReceipt(record)}
                              className="w-9 h-9 rounded-xl object-cover border border-slate-200 shadow-sm cursor-pointer hover:scale-105 transition"
                            />
                          </td>

                          {/* Event type */}
                          <td className="px-4 py-3.5">
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase border ${badge.bg} ${badge.border} ${badge.text}`}>
                              {record.typeLabel}
                            </span>
                          </td>

                          {/* Time */}
                          <td className="px-4 py-3.5 font-mono font-bold text-slate-800 text-xs">
                            {formatSaoPauloTimeOnly(record.timestamp)}
                          </td>

                          {/* Address */}
                          <td className="px-4 py-3.5 text-xs text-slate-500 max-w-[200px] truncate" title={record.address}>
                            {record.address || 'São Paulo, SP'}
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => setViewingReceipt(record)}
                              title="Visualizar Comprovante"
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 transition cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

          </div>

        </section>

      </div>

      {/* Receipt Modal */}
      <ReceiptModal
        punch={viewingReceipt}
        onClose={() => setViewingReceipt(null)}
      />

    </div>
  );
};
