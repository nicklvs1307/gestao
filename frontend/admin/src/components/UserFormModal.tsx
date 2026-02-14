import React, { useState, useEffect } from 'react';
import { createUser, updateUser, getRoles, getPermissions } from '../services/api';
import { 
    X, User, Mail, Lock, CheckCircle, Loader2, Award, 
    ChevronRight, ChevronLeft, ShieldCheck, CheckSquare, Square,
    Layout, ShoppingCart, DollarSign, Package, PieChart, Settings, Users,
    ClipboardCheck, Map
} from 'lucide-react';
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

const CATEGORIES = [
    { id: 'vendas', name: 'Vendas & Pedidos', icon: ShoppingCart, pattern: ['order', 'waiter', 'pos', 'kds', 'table', 'delivery'] },
    { id: 'financeiro', name: 'Financeiro', icon: DollarSign, pattern: ['financial', 'cashier', 'bank', 'settlement'] },
    { id: 'estoque', name: 'Estoque & Produtos', icon: Package, pattern: ['product', 'category', 'stock', 'supplier', 'ingredient'] },
    { id: 'operacional', name: 'Operacional', icon: ClipboardCheck, pattern: ['checklist', 'sector', 'production'] },
    { id: 'gestao', name: 'Gestão & Relatórios', icon: PieChart, pattern: ['report', 'franchise', 'settings', 'user', 'integration'] },
];

const UserFormModal: React.FC<UserFormModalProps> = ({ isOpen, onClose, onSave, userToEdit }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState<string | null>(null);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);
  
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const isEditing = !!userToEdit;

  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingData(true);
      try {
        const [roles, perms] = await Promise.all([getRoles(), getPermissions()]);
        setAvailableRoles(roles);
        setAvailablePermissions(perms);
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
        toast.error("Erro ao carregar permissões");
      } finally {
        setIsLoadingData(false);
      }
    };
    if (isOpen) fetchData();
  }, [isOpen]);

  useEffect(() => {
    if (isEditing && userToEdit) {
      setName(userToEdit.name || '');
      setEmail(userToEdit.email);
      setRoleId(userToEdit.roleId || null);
      
      // Carregar permissões já existentes do usuário (diretas)
      const directPermIds = userToEdit.permissions?.map((p: any) => p.id) || [];
      setSelectedPermissionIds(directPermIds);
      
      setPassword(''); 
      setStep(1);
    } else {
      setName('');
      setEmail('');
      setPassword('');
      setRoleId(null);
      setSelectedPermissionIds([]);
      setStep(1);
    }
  }, [userToEdit, isEditing, isOpen]);

  // Ao mudar o cargo, sugere as permissões do cargo
  const handleRoleSelect = (role: any) => {
    setRoleId(role.id);
    const rolePermIds = role.permissions?.map((p: any) => p.id) || [];
    // Ao selecionar um cargo, resetamos as customizadas para as do cargo
    setSelectedPermissionIds(rolePermIds);
  };

  const togglePermission = (id: string) => {
    setSelectedPermissionIds(prev => 
        prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    const userData = { 
        email, 
        name, 
        roleId: roleId || undefined, 
        permissionIds: selectedPermissionIds,
        password: password || undefined 
    };

    try {
      if (isEditing) {
        await updateUser(userToEdit.id, userData);
        toast.success("Usuário atualizado com sucesso!");
      } else {
        await createUser(userData);
        toast.success("Usuário criado com sucesso!");
      }
      onSave();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.message);
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
        className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
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
                        className="p-8 space-y-8"
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

                        <div className="space-y-4">
                            <div className="space-y-1">
                                <h4 className="text-sm font-black text-slate-900 uppercase italic tracking-tight">Cargo Base (Opcional)</h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Isso preencherá as permissões automaticamente</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                {availableRoles.map(r => (
                                    <button
                                        key={r.id}
                                        onClick={() => handleRoleSelect(r)}
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left group",
                                            roleId === r.id 
                                                ? "bg-slate-900 border-slate-900 shadow-md" 
                                                : "bg-slate-50 border-transparent hover:border-slate-200"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center",
                                            roleId === r.id ? "bg-orange-500 text-white" : "bg-white text-slate-400"
                                        )}>
                                            <Award size={16} />
                                        </div>
                                        <span className={cn("text-[10px] font-black uppercase italic tracking-tight", roleId === r.id ? "text-white" : "text-slate-600")}>
                                            {r.name}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div 
                        key="step2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="p-8 space-y-8"
                    >
                        <div className="space-y-1">
                            <h4 className="text-sm font-black text-slate-900 uppercase italic tracking-tight">Permissões de Acesso</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Personalize o que este membro pode acessar</p>
                        </div>

                        {isLoadingData ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-4">
                                <Loader2 className="animate-spin text-orange-500" />
                                <span className="text-[10px] font-black uppercase text-slate-400">Carregando permissões...</span>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {CATEGORIES.map(cat => {
                                    const catPerms = availablePermissions.filter(p => 
                                        cat.pattern.some(pat => p.name.includes(pat))
                                    );

                                    if (catPerms.length === 0) return null;

                                    return (
                                        <div key={cat.id} className="space-y-4">
                                            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                                <cat.icon size={16} className="text-orange-500" />
                                                <h5 className="text-[11px] font-black text-slate-900 uppercase tracking-wider">{cat.name}</h5>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {catPerms.map(p => {
                                                    const isSelected = selectedPermissionIds.includes(p.id);
                                                    return (
                                                        <button
                                                            key={p.id}
                                                            onClick={() => togglePermission(p.id)}
                                                            className={cn(
                                                                "flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                                                                isSelected 
                                                                    ? "bg-orange-50 border-orange-200" 
                                                                    : "bg-white border-slate-50 hover:border-slate-100"
                                                            )}
                                                        >
                                                            {isSelected ? (
                                                                <CheckSquare size={18} className="text-orange-600 shrink-0" />
                                                            ) : (
                                                                <Square size={18} className="text-slate-200 shrink-0" />
                                                            )}
                                                            <div className="flex flex-col">
                                                                <span className={cn("text-[10px] font-black uppercase tracking-tight", isSelected ? "text-orange-900" : "text-slate-700")}>
                                                                    {p.description || p.name}
                                                                </span>
                                                                <span className="text-[8px] font-bold text-slate-400 uppercase opacity-50">{p.name}</span>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
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
                        PERMISSÕES <ChevronRight size={16} />
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
                        disabled={isSaving}
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
