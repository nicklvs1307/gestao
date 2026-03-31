import React, { useState, useEffect, useMemo } from 'react';
import { createUser, updateUser, getRoles, getAvailablePermissions, sendResetEmail } from '../services/api';
import { 
    X, User, Mail, Lock, CheckCircle, Loader2, Award, 
    ChevronRight, ChevronLeft, ShieldCheck, CheckSquare, Square,
    Layout, ShoppingCart, DollarSign, Package, PieChart, Settings, Users,
    ClipboardCheck, Map, Send, Layers, FolderOpen, FileText, 
    ShoppingBag, UtensilsCrossed, Receipt, CreditCard, TrendingUp,
    Warehouse, PackagePlus, ClipboardList, FileBarChart, UsersRound,
    Settings2, Zap, Eye, Pencil, Trash2, PlusCircle, Search, Filter,
    Check, ToggleLeft, LockOpen, Info
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

// Definição de estrutura hierárquica: Categoria > Página > Permissões
const PERMISSION_STRUCTURE = [
    {
        id: 'vendas',
        name: 'Vendas & Pedidos',
        icon: ShoppingCart,
        color: 'text-orange-500 bg-orange-50',
        pages: [
            { 
                id: 'pos', 
                name: 'Ponto de Venda (POS)', 
                icon: Receipt,
                keywords: ['pos', 'pdv', 'venda', 'order.create', 'order.read', 'order.update', 'order.delete']
            },
            { 
                id: 'mesas', 
                name: 'Gestão de Mesas', 
                icon: UtensilsCrossed,
                keywords: ['table', 'mesa', 'waiter']
            },
            { 
                id: 'entregas', 
                name: 'Delivery & Entregas', 
                icon: ShoppingBag,
                keywords: ['delivery', 'entrega']
            },
            { 
                id: 'cozinha', 
                name: 'Cozinha (KDS)', 
                icon: Layers,
                keywords: ['kds', 'kitchen', 'cozinha']
            }
        ]
    },
    {
        id: 'financeiro',
        name: 'Financeiro',
        icon: DollarSign,
        color: 'text-emerald-500 bg-emerald-50',
        pages: [
            { 
                id: 'caixa', 
                name: 'Caixa & Fluxo', 
                icon: CreditCard,
                keywords: ['cashier', 'caixa', 'cash']
            },
            { 
                id: 'bancos', 
                name: 'Contas Bancárias', 
                icon: TrendingUp,
                keywords: ['bank', 'banco', 'account']
            },
            { 
                id: 'movimentos', 
                name: 'Movimentos', 
                icon: FileText,
                keywords: ['financial', 'entry', 'movimento', 'receita', 'despesa']
            },
            { 
                id: 'acertos', 
                name: 'Acertos', 
                icon: Layers,
                keywords: ['settlement', 'acerto', 'driver.settlement']
            }
        ]
    },
    {
        id: 'estoque',
        name: 'Estoque & Produtos',
        icon: Package,
        color: 'text-blue-500 bg-blue-50',
        pages: [
            { 
                id: 'produtos', 
                name: 'Cardápio & Produtos', 
                icon: PackagePlus,
                keywords: ['product', 'produto', 'addon', 'tamanho', 'category.produto']
            },
            { 
                id: 'ingredientes', 
                name: 'Ingredientes', 
                icon: Warehouse,
                keywords: ['ingredient', 'ingrediente', 'stock.ingredient']
            },
            { 
                id: 'estoque', 
                name: 'Controle de Estoque', 
                icon: ClipboardList,
                keywords: ['stock', 'estoque', 'purchase', 'compra', 'supplier']
            }
        ]
    },
    {
        id: 'operacional',
        name: 'Operacional',
        icon: ClipboardCheck,
        color: 'text-purple-500 bg-purple-50',
        pages: [
            { 
                id: 'checklists', 
                name: 'Checklists & Tarefas', 
                icon: ClipboardList,
                keywords: ['checklist', 'checklist.fill']
            },
            { 
                id: 'producao', 
                name: 'Produção', 
                icon: Layers,
                keywords: ['production', 'producao', 'sector', 'setor']
            }
        ]
    },
    {
        id: 'gestao',
        name: 'Gestão & Relatórios',
        icon: PieChart,
        color: 'text-slate-500 bg-slate-100',
        pages: [
            { 
                id: 'relatorios', 
                name: 'Relatórios', 
                icon: FileBarChart,
                keywords: ['report', 'relatorio', 'dashboard', 'sales']
            },
            { 
                id: 'usuarios', 
                name: 'Usuários & Equipe', 
                icon: UsersRound,
                keywords: ['user', 'usuario', 'role', 'permission', 'driver', 'entregador']
            },
            { 
                id: 'configuracoes', 
                name: 'Configurações', 
                icon: Settings2,
                keywords: ['settings', 'config', 'tenant', 'estabelecimento']
            },
            { 
                id: 'integracoes', 
                name: 'Integrações', 
                icon: Zap,
                keywords: ['integration', 'webhook', 'api']
            }
        ]
    }
];

const UserFormModal: React.FC<UserFormModalProps> = ({ isOpen, onClose, onSave, userToEdit }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState<string | null>(null);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('vendas');
  const [permissionSearch, setPermissionSearch] = useState('');
  
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  
  const isEditing = !!userToEdit;

  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingData(true);
      try {
        const [roles, perms] = await Promise.all([getRoles(), getAvailablePermissions()]);
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

  const handleRoleSelect = (role: any) => {
    setRoleId(role.id);
    const rolePermIds = role.permissions?.map((p: any) => p.id) || [];
    setSelectedPermissionIds(rolePermIds);
  };

  const togglePermission = (id: string) => {
    setSelectedPermissionIds(prev => 
        prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const toggleAllInPage = (keywords: string[]) => {
    const pagePerms = availablePermissions.filter(p => 
      keywords.some(kw => p.name.toLowerCase().includes(kw.toLowerCase()))
    );
    const pagePermIds = pagePerms.map(p => p.id);
    const allSelected = pagePermIds.every(id => selectedPermissionIds.includes(id));
    
    if (allSelected) {
      setSelectedPermissionIds(prev => prev.filter(id => !pagePermIds.includes(id)));
    } else {
      setSelectedPermissionIds(prev => [...new Set([...prev, ...pagePermIds])]);
    }
  };

  const handleSendResetEmail = async () => {
    if (!userToEdit) return;
    setIsSendingReset(true);
    try {
      await sendResetEmail(userToEdit.id);
      toast.success(`Email de redefinição enviado para ${userToEdit.email}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao enviar email.');
    } finally {
      setIsSendingReset(false);
    }
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

  // Agrupar permissões por estrutura hierárquica com filtro de busca
  const permissionsByCategory = useMemo(() => {
    return PERMISSION_STRUCTURE.map(cat => {
      const pages = cat.pages.map(page => {
        let pagePerms = availablePermissions.filter(p => 
          page.keywords.some(kw => p.name.toLowerCase().includes(kw.toLowerCase()))
        );
        
        // Filtrar por busca
        if (permissionSearch.trim()) {
          const searchLower = permissionSearch.toLowerCase();
          pagePerms = pagePerms.filter(p => 
            p.name.toLowerCase().includes(searchLower) ||
            (p.description && p.description.toLowerCase().includes(searchLower))
          );
        }
        
        return {
          ...page,
          permissions: pagePerms,
          selectedCount: pagePerms.filter(p => selectedPermissionIds.includes(p.id)).length,
          totalCount: pagePerms.length
        };
      }).filter(p => p.permissions.length > 0);
      
      return {
        ...cat,
        pages,
        totalPerms: pages.reduce((acc, p) => acc + p.permissions.length, 0),
        selectedCount: pages.reduce((acc, p) => acc + p.selectedCount, 0)
      };
    }).filter(cat => cat.pages.length > 0);
  }, [availablePermissions, selectedPermissionIds, permissionSearch]);

  // Contagem total real (sem filtro de busca)
  const totalPermissionsCount = useMemo(() => {
    return availablePermissions.length;
  }, [availablePermissions]);

  const currentCategory = permissionsByCategory.find(c => c.id === activeCategory);
  const totalSelected = selectedPermissionIds.length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-6xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header Master - Estilo DriverSettlement */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/20">
                    <ShieldCheck size={22} />
                </div>
                <div>
                    <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tighter leading-none flex items-center gap-2">
                        {isEditing ? 'Configurar' : 'Novo'} <span className="text-primary">Colaborador</span>
                    </h3>
                    <div className="flex items-center gap-3 mt-2">
                        <div className={cn(
                            "flex items-center gap-1.5 px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest",
                            step === 1 ? "bg-orange-100 text-orange-600" : "bg-emerald-100 text-emerald-600"
                        )}>
                            {step === 1 ? <User size={10} /> : <Check size={10} />}
                            {step === 1 ? 'Dados Pessoais' : 'Permissões'}
                        </div>
                        <div className="flex items-center gap-1">
                            <div className={cn("w-6 h-1 rounded-full", step === 1 ? "bg-orange-500" : "bg-emerald-500")} />
                            <div className={cn("w-6 h-1 rounded-full", step === 2 ? "bg-orange-500" : "bg-slate-200")} />
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-3">
              {step === 2 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 rounded-full border border-orange-100">
                  <Zap size={14} className="text-orange-500" />
                  <span className="text-[10px] font-black text-orange-700 uppercase">
                    {selectedPermissionIds.length} permissões
                  </span>
                </div>
              )}
              <button onClick={onClose} className="w-10 h-10 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-all">
                  <X size={20} />
              </button>
            </div>
        </div>

        {/* Body com scroll interno */}
        <div className="flex-1 overflow-hidden min-h-0">
            <AnimatePresence mode="wait">
                {step === 1 ? (
                    <motion.div 
                        key="step1"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="h-full overflow-y-auto custom-scrollbar"
                    >
                        <div className="p-8 space-y-8 max-w-2xl mx-auto">
                            {/* Seção Dados */}
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <div className="w-1 h-4 bg-orange-500 rounded-full" />
                                  <h4 className="text-sm font-black text-slate-900 uppercase italic tracking-tight">Dados de Acesso</h4>
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-3">Identifique o colaborador no sistema</p>
                            </div>

                            <div className="space-y-5 p-6 bg-slate-50/50 rounded-2xl border border-slate-100">
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

                                {isEditing && (
                                    <button
                                        type="button"
                                        onClick={handleSendResetEmail}
                                        disabled={isSendingReset}
                                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed border-slate-200 hover:border-orange-300 hover:bg-orange-50/50 text-slate-500 hover:text-orange-600 transition-all text-[10px] font-bold uppercase tracking-widest"
                                    >
                                        {isSendingReset ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                        {isSendingReset ? 'ENVIANDO...' : 'ENVIAR EMAIL DE REDEFINIÇÃO DE SENHA'}
                                    </button>
                                )}
                            </div>

                            {/* Seção Cargo */}
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                                      <h4 className="text-sm font-black text-slate-900 uppercase italic tracking-tight">Cargo Base (Opcional)</h4>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-3">Selecione um cargo para preencher permissões automaticamente</p>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    {availableRoles.map(r => (
                                        <button
                                            key={r.id}
                                            onClick={() => handleRoleSelect(r)}
                                            className={cn(
                                                "flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left group hover:scale-[1.02]",
                                                roleId === r.id 
                                                    ? "bg-slate-900 border-slate-900 shadow-lg shadow-slate-900/20" 
                                                    : "bg-white border-slate-100 hover:border-slate-200 hover:shadow-md"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center",
                                                roleId === r.id ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-orange-50 group-hover:text-orange-500"
                                            )}>
                                                <Award size={18} />
                                            </div>
                                            <span className={cn("text-[11px] font-black uppercase italic tracking-tight", roleId === r.id ? "text-white" : "text-slate-600")}>
                                                {r.name}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div 
                        key="step2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="flex h-full min-h-0"
                    >
                        {/* Sidebar de Categorias */}
                        <div className="w-64 border-r border-slate-100 bg-slate-50/50 p-4 shrink-0 flex flex-col gap-4">
                            {/* Search Bar */}
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder="Buscar permissão..." 
                                    value={permissionSearch}
                                    onChange={(e) => setPermissionSearch(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-bold uppercase tracking-widest focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                                />
                            </div>

                            {/* Status Badge */}
                            <div className="flex items-center gap-2 px-3 py-2.5 bg-white rounded-xl border border-slate-200 shadow-sm">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex-1">
                                    {selectedPermissionIds.length} de {totalPermissionsCount}
                                </span>
                                <span className="text-[8px] font-bold text-slate-400 uppercase">selecionadas</span>
                            </div>

                            {/* Categories List */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                                <div className="px-1 py-2">
                                    <h5 className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Módulos</h5>
                                </div>
                                
                                {permissionsByCategory.map(cat => {
                                    const isActive = activeCategory === cat.id;
                                    const Icon = cat.icon;
                                    const progress = cat.totalPerms > 0 ? (cat.selectedCount / cat.totalPerms) * 100 : 0;
                                    
                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => setActiveCategory(cat.id)}
                                            className={cn(
                                                "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group",
                                                isActive 
                                                    ? "bg-white shadow-md border-2 border-primary/20" 
                                                    : "hover:bg-white hover:shadow-sm border-2 border-transparent"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                                                isActive ? cat.color : "bg-slate-100 text-slate-400"
                                            )}>
                                                <Icon size={18} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className={cn(
                                                    "text-[10px] font-black uppercase tracking-tight block",
                                                    isActive ? "text-slate-900" : "text-slate-600"
                                                )}>
                                                    {cat.name}
                                                </span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full bg-orange-500 rounded-full transition-all"
                                                            style={{ width: `${progress}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[7px] text-slate-400 shrink-0">
                                                        {cat.selectedCount}/{cat.totalPerms}
                                                    </span>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Conteúdo Principal */}
                        <div className="flex-1 p-5 overflow-y-auto custom-scrollbar bg-white min-h-0">
                            {isLoadingData ? (
                                <div className="flex flex-col items-center justify-center min-h-[200px] gap-4">
                                    <Loader2 className="animate-spin text-orange-500" size={32} />
                                    <span className="text-[10px] font-black uppercase text-slate-400">Carregando permissões...</span>
                                </div>
                            ) : currentCategory ? (
                                <div className="space-y-6">
                                    {/* Header da Categoria */}
                                    <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                                        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", currentCategory.color)}>
                                            <currentCategory.icon size={28} />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">
                                                {currentCategory.name}
                                            </h4>
                                            <div className="flex items-center gap-3 mt-2">
                                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-[200px]">
                                                    <div 
                                                        className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full transition-all"
                                                        style={{ width: `${currentCategory.totalPerms > 0 ? (currentCategory.selectedCount / currentCategory.totalPerms) * 100 : 0}%` }}
                                                    />
                                                </div>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                    {currentCategory.selectedCount} de {currentCategory.totalPerms} concedidas
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Páginas dentro da Categoria */}
                                    <div className="space-y-6">
                                        {currentCategory.pages.map(page => {
                                            const Icon = page.icon;
                                            const allSelected = page.selectedCount === page.totalCount && page.totalCount > 0;
                                            const someSelected = page.selectedCount > 0 && !allSelected;
                                            
                                            return (
                                                <div key={page.id} className="p-5 rounded-2xl border-2 border-slate-100 bg-slate-50/30 hover:border-slate-200 hover:shadow-lg transition-all">
                                                    {/* Header da Página */}
                                                    <div className="flex items-center justify-between mb-5">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-xl bg-white border-2 border-slate-100 flex items-center justify-center text-slate-500 shadow-sm">
                                                                <Icon size={22} />
                                                            </div>
                                                            <div>
                                                                <h5 className="text-sm font-black text-slate-900 uppercase italic tracking-tight">
                                                                    {page.name}
                                                                </h5>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className={cn(
                                                                        "text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
                                                                        allSelected ? "bg-emerald-100 text-emerald-600" : 
                                                                        someSelected ? "bg-amber-100 text-amber-600" :
                                                                        "bg-slate-100 text-slate-400"
                                                                    )}>
                                                                        {allSelected ? 'Completo' : someSelected ? 'Parcial' : 'Vazio'}
                                                                    </span>
                                                                    <span className="text-[7px] text-slate-400">
                                                                        {page.selectedCount}/{page.permissions.length} permissões
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        
                                                        <button
                                                            onClick={() => toggleAllInPage(page.keywords)}
                                                            className={cn(
                                                                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all hover:scale-105",
                                                                allSelected 
                                                                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                                                                    : someSelected
                                                                        ? "bg-amber-100 text-amber-700 border-2 border-amber-200"
                                                                        : "bg-white text-slate-500 border-2 border-slate-200 hover:border-orange-300 hover:text-orange-600"
                                                            )}
                                                        >
                                                            {allSelected ? (
                                                                <>
                                                                    <CheckSquare size={14} />
                                                                    Conceder Tudo
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Square size={14} />
                                                                    {someSelected ? 'Ajustar' : 'Conceder'}
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>

                                                    {/* Grid de Permissões */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                        {page.permissions.map((p, idx) => {
                                                            const isSelected = selectedPermissionIds.includes(p.id);
                                                            
                                                            return (
                                                                <motion.button
                                                                    key={p.id}
                                                                    initial={{ opacity: 0, y: 5 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    transition={{ delay: idx * 0.02 }}
                                                                    onClick={() => togglePermission(p.id)}
                                                                    className={cn(
                                                                        "flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left hover:scale-[1.02] group",
                                                                        isSelected 
                                                                            ? "bg-gradient-to-br from-orange-50 to-white border-orange-200 shadow-md" 
                                                                            : "bg-white border-slate-100 hover:border-slate-200"
                                                                    )}
                                                                >
                                                                    <div className={cn(
                                                                        "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-all",
                                                                        isSelected ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30" : "bg-slate-100 text-slate-300 group-hover:bg-slate-200"
                                                                    )}>
                                                                        {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <span className={cn(
                                                                            "text-[9px] font-bold uppercase tracking-tight block",
                                                                            isSelected ? "text-orange-900" : "text-slate-700"
                                                                        )}>
                                                                            {p.description || p.name}
                                                                        </span>
                                                                        <span className="text-[7px] text-slate-400 block truncate mt-1">{p.name}</span>
                                                                    </div>
                                                                </motion.button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full opacity-40">
                                    <FolderOpen size={48} className="text-slate-300 mb-3" />
                                    <p className="text-[10px] font-black uppercase text-slate-400">Nenhuma permissão nesta categoria</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

        {/* Rodapé Fixo */}
        <div className="px-6 py-4 bg-white border-t border-slate-100 flex gap-3 shrink-0 shadow-lg shadow-slate-100/50">
            {step === 1 ? (
                <>
                    <Button 
                        type="button"
                        variant="ghost"
                        onClick={onClose}
                        className="flex-1 rounded-xl font-black uppercase text-[10px] tracking-widest text-slate-400 hover:text-slate-600"
                    >
                        Cancelar
                    </Button>
                    <Button 
                        type="button"
                        onClick={() => {
                            if (!name || !email || (!isEditing && !password)) return toast.error("Preencha todos os campos obrigatórios");
                            setStep(2);
                        }}
                        className="flex-[2] h-12 rounded-xl shadow-lg shadow-orange-500/20 uppercase tracking-widest italic font-black gap-2"
                    >
                        DEFINIR PERMISSÕES <ChevronRight size={16} />
                    </Button>
                </>
            ) : (
                <>
                    <Button 
                        type="button"
                        variant="ghost"
                        onClick={() => setStep(1)}
                        className="flex-1 rounded-xl font-black uppercase text-[10px] tracking-widest text-slate-400 hover:text-slate-600 gap-2"
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