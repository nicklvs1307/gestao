import React, { useState, useEffect, useMemo } from 'react';
import { createUser, updateUser, getRoles, getAvailablePermissions, sendResetEmail } from '../services/api';
import { 
    X, User, Mail, Lock, CheckCircle, Loader2, Award, 
    ChevronRight, ChevronLeft, ShieldCheck, CheckSquare, Square,
    Layout, ShoppingCart, DollarSign, Package, PieChart, Settings, Users,
    ClipboardCheck, Map, Send, Layers, FolderOpen, FileText, 
    ShoppingBag, UtensilsCrossed, Receipt, CreditCard, TrendingUp,
    Warehouse, PackagePlus, ClipboardList, FileBarChart, UsersRound,
    Settings2, Zap, Eye, Pencil, Trash2, PlusCircle
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

  // Agrupar permissões por estrutura hierárquica
  const permissionsByCategory = useMemo(() => {
    return PERMISSION_STRUCTURE.map(cat => {
      const pages = cat.pages.map(page => {
        const pagePerms = availablePermissions.filter(p => 
          page.keywords.some(kw => p.name.toLowerCase().includes(kw.toLowerCase()))
        );
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
  }, [availablePermissions, selectedPermissionIds]);

  const currentCategory = permissionsByCategory.find(c => c.id === activeCategory);
  const totalSelected = selectedPermissionIds.length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-5xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header Master */}
        <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center shrink-0 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center gap-4">
                <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-lg shadow-slate-900/20">
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
            <div className="flex items-center gap-3">
              {step === 2 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 rounded-full border border-orange-100">
                  <Zap size={14} className="text-orange-500" />
                  <span className="text-[10px] font-black text-orange-700 uppercase">
                    {totalSelected} permissões
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
                        <div className="w-56 border-r border-slate-100 bg-slate-50/50 p-3 shrink-0 overflow-y-auto custom-scrollbar">
                            <div className="space-y-1.5">
                                <div className="px-3 py-2">
                                    <h5 className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Categorias</h5>
                                </div>
                                
                                {permissionsByCategory.map(cat => {
                                    const isActive = activeCategory === cat.id;
                                    const Icon = cat.icon;
                                    
                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => setActiveCategory(cat.id)}
                                            className={cn(
                                                "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group",
                                                isActive 
                                                    ? "bg-white shadow-md border border-slate-200" 
                                                    : "hover:bg-white hover:shadow-sm border border-transparent"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                                isActive ? cat.color : "bg-slate-100 text-slate-400"
                                            )}>
                                                <Icon size={16} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className={cn(
                                                    "text-[10px] font-black uppercase tracking-tight block",
                                                    isActive ? "text-slate-900" : "text-slate-600"
                                                )}>
                                                    {cat.name}
                                                </span>
                                                <span className="text-[8px] text-slate-400">
                                                    {cat.selectedCount}/{cat.totalPerms} permissões
                                                </span>
                                            </div>
                                            {isActive && (
                                                <div className="w-1.5 h-4 bg-orange-500 rounded-full" />
                                            )}
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
                                        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", currentCategory.color)}>
                                            <currentCategory.icon size={24} />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-black text-slate-900 uppercase italic tracking-tighter">
                                                {currentCategory.name}
                                            </h4>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                {currentCategory.selectedCount} de {currentCategory.totalPerms} permissões selecionadas
                                            </p>
                                        </div>
                                    </div>

                                    {/* Páginas dentro da Categoria */}
                                    <div className="space-y-6">
                                        {currentCategory.pages.map(page => {
                                            const Icon = page.icon;
                                            const allSelected = page.selectedCount === page.totalCount && page.totalCount > 0;
                                            const someSelected = page.selectedCount > 0 && !allSelected;
                                            
                                            return (
                                                <div key={page.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/30 hover:border-slate-200 transition-all">
                                                    {/* Header da Página */}
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-500">
                                                                <Icon size={16} />
                                                            </div>
                                                            <div>
                                                                <h5 className="text-xs font-black text-slate-900 uppercase italic tracking-tight">
                                                                    {page.name}
                                                                </h5>
                                                                <span className="text-[8px] text-slate-400">
                                                                    {page.selectedCount}/{page.permissions.length} permissões
                                                                </span>
                                                            </div>
                                                        </div>
                                                        
                                                        <button
                                                            onClick={() => toggleAllInPage(page.keywords)}
                                                            className={cn(
                                                                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                                                                allSelected 
                                                                    ? "bg-orange-500 text-white"
                                                                    : someSelected
                                                                        ? "bg-orange-100 text-orange-700 border border-orange-200"
                                                                        : "bg-white text-slate-400 border border-slate-200 hover:border-orange-300"
                                                            )}
                                                        >
                                                            {allSelected ? (
                                                                <>
                                                                    <CheckSquare size={12} />
                                                                   Todos
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Square size={12} />
                                                                    {someSelected ? 'Parcial' : 'Selecionar'}
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>

                                                    {/* Grid de Permissões */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                                        {page.permissions.map(p => {
                                                            const isSelected = selectedPermissionIds.includes(p.id);
                                                            
                                                            return (
                                                                <button
                                                                    key={p.id}
                                                                    onClick={() => togglePermission(p.id)}
                                                                    className={cn(
                                                                        "flex items-start gap-2.5 p-3 rounded-xl border-2 transition-all text-left hover:scale-[1.01]",
                                                                        isSelected 
                                                                            ? "bg-orange-50 border-orange-200 shadow-sm" 
                                                                            : "bg-white border-slate-100 hover:border-slate-200"
                                                                    )}
                                                                >
                                                                    <div className={cn(
                                                                        "w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5",
                                                                        isSelected ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-300"
                                                                    )}>
                                                                        {isSelected ? <CheckSquare size={12} /> : <Square size={12} />}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <span className={cn(
                                                                            "text-[9px] font-bold uppercase tracking-tight block truncate",
                                                                            isSelected ? "text-orange-900" : "text-slate-700"
                                                                        )}>
                                                                            {p.description || p.name}
                                                                        </span>
                                                                        <span className="text-[7px] text-slate-400 block truncate mt-0.5">{p.name}</span>
                                                                    </div>
                                                                </button>
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
        <div className="px-8 py-5 bg-white border-t border-slate-100 flex gap-3 shrink-0 shadow-lg shadow-slate-100/50">
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