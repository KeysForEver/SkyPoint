import React, { useState } from 'react';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { CloudCheck, Badge, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let email = employeeId;
      if (!employeeId.includes('@')) {
        email = `${employeeId}@skypoint.com`;
      }

      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError('Credenciais inválidas. Verifique seu ID e senha.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          name: user.displayName || 'Novo Usuário',
          email: user.email,
          role: user.email === 'wallaceinaciogs@gmail.com' ? 'admin' : 'employee',
          employeeId: `SP-${Math.floor(1000 + Math.random() * 9000)}`,
          photoUrl: user.photoURL,
          createdAt: new Date().toISOString()
        });
      }
    } catch (err) {
      setError('Erro ao entrar com Google.');
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 bg-white rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="hidden lg:block relative overflow-hidden bg-primary h-full min-h-[700px]">
          <img 
            src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200" 
            alt="Modern office" 
            className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-40"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-blue-900/90 p-16 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 text-white mb-12">
                <CloudCheck className="w-10 h-10" />
                <span className="text-3xl font-bold tracking-tight">SkyPoint</span>
              </div>
              <h1 className="text-white text-5xl font-semibold leading-[1.2] mb-6 max-w-md">
                A gestão do seu tempo com precisão absoluta.
              </h1>
              <p className="text-blue-100 text-lg font-light leading-relaxed max-w-sm">
                Segurança e agilidade no controle de jornada para a nova era do trabalho híbrido.
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="h-px flex-1 bg-white/20"></div>
              <div className="flex gap-4">
                <div className="w-2 h-2 rounded-full bg-white"></div>
                <div className="w-2 h-2 rounded-full bg-white/30"></div>
                <div className="w-2 h-2 rounded-full bg-white/30"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center p-8 lg:p-24 bg-white">
          <div className="max-w-md w-full mx-auto">
            <div className="lg:hidden flex items-center gap-2 mb-12">
              <CloudCheck className="text-primary w-8 h-8" />
              <span className="text-2xl font-bold text-primary tracking-tight">SkyPoint</span>
            </div>
            
            <div className="mb-10">
              <h2 className="text-on-surface text-3xl font-semibold mb-2">Bem-vindo de volta</h2>
              <p className="text-on-surface-variant">Acesse sua conta para gerenciar seus registros.</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-error/10 text-error rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-on-surface-variant ml-1" htmlFor="employee-id">ID do Colaborador</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-outline group-focus-within:text-primary transition-colors">
                    <Badge className="w-5 h-5" />
                  </div>
                  <input 
                    className="block w-full pl-11 pr-4 py-4 bg-surface-container-high border-none rounded-xl text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary focus:bg-white transition-all duration-200 shadow-sm"
                    id="employee-id"
                    type="text"
                    placeholder="Ex: SP-9988"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="block text-sm font-medium text-on-surface-variant" htmlFor="password">Senha</label>
                  <button type="button" className="text-sm font-semibold text-primary hover:text-blue-700 transition-colors">Esqueceu a senha?</button>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-outline group-focus-within:text-primary transition-colors">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input 
                    className="block w-full pl-11 pr-12 py-4 bg-surface-container-high border-none rounded-xl text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary focus:bg-white transition-all duration-200 shadow-sm"
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-outline hover:text-on-surface-variant"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 bg-primary text-white font-semibold rounded-xl shadow-lg hover:bg-blue-700 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Entrando...' : 'Entrar no Sistema'}
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>

            <div className="mt-8 flex items-center gap-4">
              <div className="h-px flex-1 bg-surface-container"></div>
              <span className="text-xs text-on-surface-variant font-medium uppercase tracking-widest">Ou</span>
              <div className="h-px flex-1 bg-surface-container"></div>
            </div>

            <button 
              onClick={handleGoogleLogin}
              className="mt-8 w-full py-4 px-6 border border-surface-container text-on-surface font-semibold rounded-xl hover:bg-surface-container-low transition-all duration-200 flex items-center justify-center gap-3"
            >
              <img src="https://www.gstatic.com/firebase/anonymous-scan.png" alt="Google" className="w-5 h-5 hidden" />
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Entrar com Google
            </button>

            <div className="mt-12 pt-8 border-t border-surface-container flex flex-col items-center gap-4">
              <p className="text-sm text-on-surface-variant text-center">
                Precisa de ajuda com o seu acesso? <br className="sm:hidden"/>
                <button className="text-primary font-semibold">Suporte de TI SkyPoint</button>
              </p>
              <div className="flex gap-4 text-outline text-[12px] font-medium tracking-wide">
                <span className="hover:text-on-surface-variant cursor-pointer">TERMOS DE USO</span>
                <span className="w-1 h-1 rounded-full bg-outline-variant mt-1.5"></span>
                <span className="hover:text-on-surface-variant cursor-pointer">PRIVACIDADE</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
