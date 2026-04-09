import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { 
  MapPin, 
  Plus, 
  Trash2, 
  Shield, 
  Bell, 
  WifiOff, 
  Fingerprint,
  Info,
  Save,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { Geofence } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function Settings() {
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [error, setError] = useState('');
  const [newGf, setNewGf] = useState<Omit<Geofence, 'id'>>({
    name: '',
    address: '',
    lat: 0,
    lng: 0,
    radius: 150
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'geofences'), (snap) => {
      setGeofences(snap.docs.map(d => ({ id: d.id, ...d.data() } as Geofence)));
    });
    return () => unsubscribe();
  }, []);

  const handleAddGeofence = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGeocoding(true);
    setError('');

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Geocode this address to latitude and longitude: "${newGf.address}". Return only JSON with "lat" and "lng" keys.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              lat: { type: Type.NUMBER },
              lng: { type: Type.NUMBER }
            },
            required: ["lat", "lng"]
          }
        }
      });

      const coords = JSON.parse(response.text);
      
      await addDoc(collection(db, 'geofences'), {
        ...newGf,
        lat: coords.lat,
        lng: coords.lng
      });

      setNewGf({ name: '', address: '', lat: 0, lng: 0, radius: 150 });
    } catch (err: any) {
      console.error('Error adding geofence', err);
      setError('Não foi possível localizar o endereço. Verifique se está correto.');
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleDeleteGeofence = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'geofences', id));
    } catch (err) {
      console.error('Error deleting geofence', err);
    }
  };

  return (
    <div className="space-y-10">
      <header className="mb-10">
        <h2 className="text-3xl font-bold tracking-tight text-on-background mb-2">Configurações do Sistema</h2>
        <p className="text-on-surface-variant max-w-2xl leading-relaxed">Gerencie as diretrizes de segurança, parâmetros de autenticação e perímetros geográficos da plataforma.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <section className="lg:col-span-7 space-y-8">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-surface-container">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Segurança e Acesso</h3>
            </div>
            
            <div className="space-y-6">
              {[
                { label: 'Biometria Obrigatória', desc: 'Exigir validação facial para registros de ponto', active: true },
                { label: 'Autenticação em Duas Etapas (2FA)', desc: 'Código de verificação enviado via e-mail ou SMS', active: false },
                { label: 'Offline Sync', desc: 'Permitir registros sem conexão ativa com a internet', active: true }
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl">
                  <div className="flex flex-col">
                    <span className="font-bold text-on-surface">{item.label}</span>
                    <span className="text-xs text-on-surface-variant">{item.desc}</span>
                  </div>
                  <button className={`w-12 h-6 rounded-full transition-all relative ${item.active ? 'bg-primary' : 'bg-surface-container-high'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${item.active ? 'right-1' : 'left-1'}`}></div>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-sm border border-surface-container">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Bell className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Alertas do Sistema</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-surface-container-low rounded-2xl flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <Fingerprint className="w-5 h-5 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold">Relatórios Diários</span>
                  <span className="text-[10px] text-on-surface-variant font-medium">Envio automático às 08:00</span>
                </div>
              </div>
              <div className="p-4 bg-surface-container-low rounded-2xl flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold">Inconsistências</span>
                  <span className="text-[10px] text-on-surface-variant font-medium">Notificação imediata</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="lg:col-span-5 space-y-8">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-surface-container">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Perímetros de Geofence</h3>
              </div>
            </div>

            <form onSubmit={handleAddGeofence} className="space-y-4 mb-8 p-4 bg-surface-container-low rounded-2xl">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase ml-1">Nome da Unidade</label>
                <input 
                  placeholder="Ex: Escritório Central"
                  className="w-full px-4 py-3 bg-white border-none rounded-xl text-sm shadow-sm focus:ring-2 focus:ring-primary transition-all"
                  value={newGf.name}
                  onChange={e => setNewGf({...newGf, name: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase ml-1">Endereço Completo</label>
                <div className="relative">
                  <input 
                    placeholder="Rua, número, bairro, cidade - UF"
                    className="w-full px-4 py-3 bg-white border-none rounded-xl text-sm shadow-sm focus:ring-2 focus:ring-primary transition-all"
                    value={newGf.address}
                    onChange={e => setNewGf({...newGf, address: e.target.value})}
                    required
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-primary bg-primary/5 px-2 py-1 rounded-lg">
                    AUTO-GEOCODE
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase ml-1">Raio de Tolerância</label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input 
                      type="number" 
                      placeholder="Raio"
                      className="w-full px-4 py-3 bg-white border-none rounded-xl text-sm shadow-sm focus:ring-2 focus:ring-primary transition-all"
                      value={newGf.radius}
                      onChange={e => setNewGf({...newGf, radius: parseInt(e.target.value)})}
                      required
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant">
                      metros
                    </span>
                  </div>
                  <button 
                    type="submit" 
                    disabled={isGeocoding}
                    className="bg-primary text-white px-6 rounded-xl hover:bg-blue-700 transition-all shadow-lg flex items-center justify-center disabled:opacity-50"
                  >
                    {isGeocoding ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-6 h-6" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-[10px] text-error font-bold flex items-center gap-1 mt-2">
                  <AlertTriangle className="w-3 h-3" />
                  {error}
                </p>
              )}
            </form>

            <div className="space-y-3">
              {geofences.map((gf) => (
                <div key={gf.id} className="group p-4 bg-surface-container-low rounded-2xl transition-all hover:bg-white border border-transparent hover:border-surface-container">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <span className="font-bold text-on-surface">{gf.name}</span>
                      <span className="text-[10px] text-on-surface-variant mt-1">{gf.address}</span>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="bg-primary text-white text-[10px] font-bold px-2 py-1 rounded-lg">Raio: {gf.radius}m</span>
                      <button 
                        onClick={() => handleDeleteGeofence(gf.id!)}
                        className="p-1 text-error opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-surface-container">
              <div className="bg-amber-50 p-4 rounded-2xl flex items-center gap-4 border border-amber-100">
                <Info className="w-6 h-6 text-amber-600" />
                <p className="text-xs text-amber-800 leading-tight font-medium">
                  Registros fora dos perímetros configurados serão marcados como "Divergente" e exigirão auditoria do RH.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
