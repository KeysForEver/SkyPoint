import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { X, UserPlus, Save, Shield, KeyRound, Briefcase, FileText } from 'lucide-react';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (userData: Partial<User>) => Promise<void>;
  editingUser: User | null;
}

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingUser,
}) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('Operações');
  const [role, setRole] = useState<'admin' | 'employee'>('employee');
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingUser) {
      setName(editingUser.name);
      setUsername(editingUser.username);
      setPassword(editingUser.password);
      setDepartment(editingUser.department || 'Operações');
      setRole(editingUser.role);
      setActive(editingUser.active);
    } else {
      setName('');
      setUsername('');
      setPassword('');
      setDepartment('Operações');
      setRole('employee');
      setActive(true);
    }
    setError(null);
  }, [editingUser, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = name.trim();
    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanName || !cleanUsername || !cleanPassword) {
      setError('Nome, Usuário e Senha são campos obrigatórios.');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        name: cleanName,
        username: cleanUsername,
        password: cleanPassword,
        department: department.trim() || 'Geral',
        role,
        active,
      });
      onClose();
    } catch (err: any) {
      console.error('Error saving employee:', err);
      setError(err.message || 'Erro ao salvar funcionário.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-200 w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center shadow-sm">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">
                {editingUser ? 'Editar Funcionário' : 'Novo Funcionário'}
              </h3>
              <p className="text-xs text-slate-500">
                {editingUser ? 'Atualize os dados e credenciais' : 'Cadastre um colaborador para registro de ponto'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="py-4 space-y-4 text-xs text-slate-700">
          
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700">
              {error}
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1" htmlFor="emp-name">
              Nome Completo do Colaborador *
            </label>
            <input
              id="emp-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: João da Silva Santos"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
              required
            />
          </div>

          {/* Username & Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1" htmlFor="emp-username">
                Login / Usuário *
              </label>
              <input
                id="emp-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ex: joao.silva"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1" htmlFor="emp-password">
                Senha de Acesso *
              </label>
              <input
                id="emp-password"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Defina a senha"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Department */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1" htmlFor="emp-dept">
              Departamento / Setor
            </label>
            <input
              id="emp-dept"
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="Ex: TI, Vendas, Logística"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Role & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1" htmlFor="emp-role">
                Perfil de Acesso
              </label>
              <select
                id="emp-role"
                value={role}
                onChange={(e) => setRole(e.target.value as 'admin' | 'employee')}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
              >
                <option value="employee">Funcionário (Apenas Ponto)</option>
                <option value="admin">Administrador (Gestão Total)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1" htmlFor="emp-status">
                Status da Conta
              </label>
              <select
                id="emp-status"
                value={active ? 'active' : 'inactive'}
                onChange={(e) => setActive(e.target.value === 'active')}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
              >
                <option value="active">Ativo (Pode bater ponto)</option>
                <option value="inactive">Inativo (Bloqueado)</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              id="btn-save-employee"
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{editingUser ? 'Atualizar Dados' : 'Cadastrar Colaborador'}</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
