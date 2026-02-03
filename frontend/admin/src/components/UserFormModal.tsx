import React, { useState, useEffect } from 'react';
import { createUser, updateUser, getRoles } from '../services/api';
import { X, User, Mail, Lock, ShieldCheck, CheckCircle2, Loader2, Award } from 'lucide-react';
import { cn } from '../lib/utils';

type UserType = any;

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  userToEdit?: UserType | null;
}

const UserFormModal: React.FC<UserFormModalProps> = ({ isOpen, onClose, onSave, userToEdit }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('staff');
  const [roleId, setRoleId] = useState<string | null>(null);
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const isEditing = !!userToEdit;

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const data = await getRoles();
        setAvailableRoles(data);
      } catch (error) {
        console.error('Erro ao buscar cargos:', error);
      }
    };
    if (isOpen) fetchRoles();
  }, [isOpen]);

  useEffect(() => {
    if (isEditing && userToEdit) {
      setName(userToEdit.name || '');
      setEmail(userToEdit.email);
      setRole(userToEdit.role);
      setRoleId(userToEdit.roleId || null);
      setPassword(''); 
    } else {
      setName('');
      setEmail('');
      setPassword('');
      setRole('staff');
      setRoleId(null);
    }
  }, [userToEdit, isEditing, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const userData = { email, name, role, roleId, password: password || undefined };

    try {
      if (isEditing) {
        await updateUser(userToEdit.id, userData);
      } else {
        await createUser(userData);
      }
      onSave();
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="px-8 py-6 border-b bg-slate-50 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
                <div className="bg-slate-900 text-white p-2.5 rounded-xl">
                    <User size={20} />
                </div>
                <div>
                    <h3 className="text-lg font-black text-slate-900 italic uppercase tracking-tighter">
                        {isEditing ? 'Editar Integrante' : 'Novo Integrante'}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Acesso ao Sistema</p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 text-slate-400 hover:text-slate-900 rounded-full transition-all">
                <X size={24} />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mb-2 block">Nome Completo</label>
                    <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
                        <input 
                            type="text" 
                            required
                            className="w-full h-12 pl-11 pr-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 focus:border-primary focus:bg-white outline-none transition-all"
                            placeholder="Ex: João da Silva"
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                        />
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mb-2 block">E-mail de Login</label>
                    <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
                        <input 
                            type="email" 
                            required
                            className="w-full h-12 pl-11 pr-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 focus:border-primary focus:bg-white outline-none transition-all"
                            placeholder="joao@exemplo.com"
                            value={email} 
                            onChange={e => setEmail(e.target.value)} 
                        />
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mb-2 block">
                        Senha {isEditing && <span className="text-primary italic">(opcional)</span>}
                    </label>
                    <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
                        <input 
                            type="password" 
                            required={!isEditing}
                            className="w-full h-12 pl-11 pr-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 focus:border-primary focus:bg-white outline-none transition-all"
                            placeholder="••••••••"
                            value={password} 
                            onChange={e => setPassword(e.target.value)} 
                        />
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mb-2 block">Cargo / Permissões</label>
                    <div className="space-y-2 max-h-48 overflow-y-auto p-1">
                        {availableRoles.map(r => (
                            <button
                                key={r.id}
                                type="button"
                                onClick={() => {
                                    setRoleId(r.id);
                                    setRole(r.name.toLowerCase()); // Fallback role string
                                }}
                                className={cn(
                                    "w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                                    roleId === r.id 
                                        ? "bg-slate-900 text-white border-slate-900 shadow-md" 
                                        : "bg-slate-50 text-slate-500 border-slate-100 hover:border-slate-200"
                                )}
                            >
                                <Award size={16} className={roleId === r.id ? "text-primary" : "text-slate-300"} />
                                <div>
                                    <p className="text-xs font-black uppercase tracking-tighter">{r.name}</p>
                                    {r.description && <p className="text-[10px] opacity-70 font-medium">{r.description}</p>}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="pt-6 flex gap-3">
                    <button 
                        type="button"
                        onClick={onClose}
                        className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        type="submit"
                        disabled={isSaving}
                        className="flex-[2] bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                        {isEditing ? 'Salvar Alterações' : 'Criar Usuário'}
                    </button>
                </div>
            </form>
        </div>
      </div>
    </div>
  );
};

export default UserFormModal;
