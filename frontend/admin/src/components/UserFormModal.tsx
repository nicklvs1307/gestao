import React, { useState, useEffect } from 'react';
import { createUser, updateUser, getRoles } from '../services/api';
import { X, User, Mail, Lock, CheckCircle, Loader2, Award } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
import { toast } from 'sonner';

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    if (!roleId) return toast.error("Selecione um cargo para o usuário");
    
    setIsSaving(true);
    const userData = { email, name, role, roleId, password: password || undefined };

    try {
      if (isEditing) {
        await updateUser(userToEdit.id, userData);
        toast.success("Usuário atualizado com sucesso!");
      } else {
        await createUser(userData);
        toast.success("Usuário criado com sucesso!");
      }
      onSave();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="ui-modal-overlay">
      <div className="ui-modal-content w-full max-w-lg overflow-hidden flex flex-col">
        
        {/* Header Master */}
        <div className="px-10 py-8 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
            <div className="flex items-center gap-4">
                <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl shadow-slate-200">
                    <User size={24} />
                </div>
                <div>
                    <h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">
                        {isEditing ? 'Editar Integrante' : 'Novo Integrante'}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1.5">Acesso e Permissões</p>
                </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full bg-slate-50">
                <X size={24} />
            </Button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30">
            <form onSubmit={handleSubmit} id="user-form" className="p-10 space-y-8">
                <div className="space-y-4">
                    <Input 
                        label="Nome Completo"
                        required
                        placeholder="Ex: João Silva"
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                    />

                    <Input 
                        label="E-mail Corporativo"
                        type="email" 
                        required
                        placeholder="joao@restaurante.com"
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                    />

                    <Input 
                        label={isEditing ? "Senha (Deixe em branco para manter)" : "Senha de Acesso"}
                        type="password" 
                        required={!isEditing}
                        placeholder="••••••••"
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                    />
                </div>

                {/* Seleção de Cargo Premium */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Cargo do Colaborador</label>
                    <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                        {availableRoles.map(r => (
                            <Card
                                key={r.id}
                                onClick={() => {
                                    setRoleId(r.id);
                                    setRole(r.name.toLowerCase()); 
                                }}
                                className={cn(
                                    "flex items-center gap-4 p-4 border-2 transition-all text-left cursor-pointer",
                                    roleId === r.id 
                                        ? "bg-slate-900 text-white border-slate-900 shadow-xl scale-[1.02]" 
                                        : "bg-white text-slate-500 border-slate-100 hover:border-orange-500/30"
                                )}
                                noPadding
                            >
                                <div className="pl-4">
                                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-colors", roleId === r.id ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-400")}>
                                      <Award size={20} />
                                  </div>
                                </div>
                                <div className="py-4 pr-4">
                                    <p className={cn("text-sm font-black uppercase italic tracking-tight", roleId === r.id ? "text-white" : "text-slate-800")}>{r.name}</p>
                                    {r.description && <p className={cn("text-[10px] font-medium leading-tight mt-0.5", roleId === r.id ? "text-slate-400" : "text-slate-400")}>{r.description}</p>}
                                </div>
                                {roleId === r.id && (
                                  <div className="ml-auto pr-6 text-emerald-400">
                                    <CheckCircle size={20} />
                                  </div>
                                )}
                            </Card>
                        ))}
                    </div>
                </div>
            </form>
        </div>

        {/* Rodapé Fixo */}
        <div className="px-10 py-6 bg-white border-t border-slate-100 flex gap-4 shrink-0">
            <Button 
                type="button"
                variant="ghost"
                onClick={onClose}
                className="flex-1 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-400"
            >
                Cancelar
            </Button>
            <Button 
                type="submit"
                form="user-form"
                disabled={isSaving}
                isLoading={isSaving}
                className="flex-[2] h-14 rounded-2xl shadow-xl shadow-slate-200 uppercase tracking-widest italic font-black"
            >
                {isEditing ? 'SALVAR ALTERAÇÕES' : 'CADASTRAR MEMBRO'}
            </Button>
        </div>
      </div>
    </div>
  );
};

export default UserFormModal;