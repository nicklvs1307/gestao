import React, { useState, useEffect } from 'react';
import { createUser, updateUser, getRoles } from '../services/api';
import { X, User, Mail, Lock, CheckCircle, Loader2, Award, ChevronRight, ChevronLeft, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

type UserType = any;

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  userToEdit?: UserType | null;
}

const UserFormModal: React.FC<UserFormModalProps> = ({ isOpen, onClose, onSave, userToEdit }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      setRoleId(userToEdit.roleId || null);
      setPassword(''); 
      setStep(1);
    } else {
      setName('');
      setEmail('');
      setPassword('');
      setRoleId(null);
      setStep(1);
    }
  }, [userToEdit, isEditing, isOpen]);

  const handleSubmit = async () => {
    if (!roleId) return toast.error("Selecione um cargo para o usuário");
    
    setIsSaving(true);
    const userData = { email, name, roleId, password: password || undefined };

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
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        
        {/* Header Master */}
        <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-4">
                <div className="bg-slate-900 text-white p-2.5 rounded-xl">
                    <ShieldCheck size={20} />
                </div>
                <div>
                    <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tighter leading-none">
                        {isEditing ? 'Configurar Membro' : 'Novo Integrante'}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5">
                        <div className={cn("h-1 w-8 rounded-full", step === 1 ? "bg-orange-500" : "bg-slate-100")} />
                        <div className={cn("h-1 w-8 rounded-full", step === 2 ? "bg-orange-500" : "bg-slate-100")} />
                    </div>
                </div>
            </div>
            <button onClick={onClose} className="w-10 h-10 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-all">
                <X size={20} />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
            <AnimatePresence mode="wait">
                {step === 1 ? (
                    <motion.div 
                        key="step1"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="p-8 space-y-6"
                    >
                        <div className="space-y-1">
                            <h4 className="text-sm font-black text-slate-900 uppercase italic tracking-tight">Dados de Acesso</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Identifique o colaborador no sistema</p>
                        </div>

                        <div className="space-y-4">
                            <Input 
                                label="Nome Completo"
                                icon={User}
                                placeholder="Ex: João Silva"
                                value={name} 
                                onChange={e => setName(e.target.value)} 
                            />

                            <Input 
                                label="E-mail de Login"
                                type="email" 
                                icon={Mail}
                                placeholder="joao@restaurante.com"
                                value={email} 
                                onChange={e => setEmail(e.target.value)} 
                            />

                            <Input 
                                label={isEditing ? "Nova Senha (Opcional)" : "Senha Provisória"}
                                type="password" 
                                icon={Lock}
                                placeholder="••••••••"
                                value={password} 
                                onChange={e => setPassword(e.target.value)} 
                            />
                        </div>
                    </motion.div>
                ) : (
                    <motion.div 
                        key="step2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="p-8 space-y-6"
                    >
                        <div className="space-y-1">
                            <h4 className="text-sm font-black text-slate-900 uppercase italic tracking-tight">Atribuição de Cargo</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Defina o nível de acesso e funções</p>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {(!availableRoles || availableRoles.length === 0) ? (
                                <div className="p-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-center">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase italic">Nenhum cargo disponível ou carregando...</p>
                                </div>
                            ) : (
                                availableRoles.map(r => (
                                    <div
                                        key={r.id}
                                        onClick={() => setRoleId(r.id)}
                                        className={cn(
                                            "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer group",
                                            roleId === r.id 
                                                ? "bg-slate-900 border-slate-900 shadow-xl" 
                                                : "bg-white border-slate-100 hover:border-orange-500/20 shadow-sm"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors", 
                                            roleId === r.id ? "bg-orange-500 text-white" : "bg-slate-50 text-slate-400 group-hover:bg-orange-50 group-hover:text-orange-500"
                                        )}>
                                            <Award size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <p className={cn("text-xs font-black uppercase italic tracking-tight", roleId === r.id ? "text-white" : "text-slate-800")}>{r.name}</p>
                                            {r.description && <p className={cn("text-[9px] font-bold leading-tight mt-0.5", roleId === r.id ? "text-slate-400" : "text-slate-400")}>{r.description}</p>}
                                        </div>
                                        {roleId === r.id && (
                                          <div className="text-emerald-400">
                                            <CheckCircle size={20} />
                                          </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

        {/* Rodapé Fixo */}
        <div className="px-8 py-6 bg-white border-t border-slate-50 flex gap-3 shrink-0">
            {step === 1 ? (
                <>
                    <Button 
                        type="button"
                        variant="ghost"
                        onClick={onClose}
                        className="flex-1 rounded-xl font-black uppercase text-[10px] tracking-widest text-slate-400"
                    >
                        Cancelar
                    </Button>
                    <Button 
                        type="button"
                        onClick={() => {
                            if (!name || !email || (!isEditing && !password)) return toast.error("Preencha todos os campos");
                            setStep(2);
                        }}
                        className="flex-[2] h-12 rounded-xl shadow-lg uppercase tracking-widest italic font-black gap-2"
                    >
                        PRÓXIMO PASSO <ChevronRight size={16} />
                    </Button>
                </>
            ) : (
                <>
                    <Button 
                        type="button"
                        variant="ghost"
                        onClick={() => setStep(1)}
                        className="flex-1 rounded-xl font-black uppercase text-[10px] tracking-widest text-slate-400 gap-2"
                    >
                        <ChevronLeft size={16} /> VOLTAR
                    </Button>
                    <Button 
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSaving || !roleId}
                        isLoading={isSaving}
                        className="flex-[2] h-12 rounded-xl shadow-xl shadow-slate-200 uppercase tracking-widest italic font-black"
                    >
                        {isEditing ? 'SALVAR ALTERAÇÕES' : 'FINALIZAR CADASTRO'}
                    </Button>
                </>
            )}
        </div>
      </motion.div>
    </div>
  );
};

export default UserFormModal;