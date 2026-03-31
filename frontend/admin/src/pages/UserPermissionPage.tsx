import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createUser, updateUser, getRoles, getAvailablePermissions, sendResetEmail, getUsers } from '../services/api';
import { 
    X, User, Mail, Lock, CheckCircle, Loader2, Award, 
    ChevronRight, ChevronLeft, ShieldCheck, CheckSquare, Square,
    ShoppingCart, DollarSign, Package, PieChart, ClipboardCheck,
    Send, Layers, FolderOpen, FileText, ShoppingBag, UtensilsCrossed, Receipt, CreditCard, TrendingUp,
    Warehouse, PackagePlus, ClipboardList, FileBarChart, UsersRound,
    Settings2, Zap, Search, ArrowLeft, Save, Check
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const PERMISSION_STRUCTURE = [
    {
        id: 'vendas',
        name: 'Vendas & Pedidos',
        icon: ShoppingCart,
        color: 'text-orange-500 bg-orange-50',
        pages: [
            { id: 'pos', name: 'Ponto de Venda (POS)', icon: Receipt, keywords: ['pos', 'pdv', 'venda', 'order.create', 'order.read', 'order.update', 'order.delete'] },
            { id: 'mesas', name: 'Gestão de Mesas', icon: UtensilsCrossed, keywords: ['table', 'mesa', 'waiter'] },
            { id: 'entregas', name: 'Delivery & Entregas', icon: ShoppingBag, keywords: ['delivery', 'entrega'] },
            { id: 'cozinha', name: 'Cozinha (KDS)', icon: Layers, keywords: ['kds', 'kitchen', 'cozinha'] }
        ]
    },
    {
        id: 'financeiro',
        name: 'Financeiro',
        icon: DollarSign,
        color: 'text-emerald-500 bg-emerald-50',
        pages: [
            { id: 'caixa', name: 'Caixa & Fluxo', icon: CreditCard, keywords: ['cashier', 'caixa', 'cash'] },
            { id: 'bancos', name: 'Contas Bancárias', icon: TrendingUp, keywords: ['bank', 'banco', 'account'] },
            { id: 'movimentos', name: 'Movimentos', icon: FileText, keywords: ['financial', 'entry', 'movimento', 'receita', 'despesa'] },
            { id: 'acertos', name: 'Acertos', icon: Layers, keywords: ['settlement', 'acerto', 'driver.settlement'] }
        ]
    },
    {
        id: 'estoque',
        name: 'Estoque & Produtos',
        icon: Package,
        color: 'text-blue-500 bg-blue-50',
        pages: [
            { id: 'produtos', name: 'Cardápio & Produtos', icon: PackagePlus, keywords: ['product', 'produto', 'addon', 'tamanho', 'category.produto'] },
            { id: 'ingredientes', name: 'Ingredientes', icon: Warehouse, keywords: ['ingredient', 'ingrediente', 'stock.ingredient'] },
            { id: 'estoque', name: 'Controle de Estoque', icon: ClipboardList, keywords: ['stock', 'estoque', 'purchase', 'compra', 'supplier'] }
        ]
    },
    {
        id: 'operacional',
        name: 'Operacional',
        icon: ClipboardCheck,
        color: 'text-purple-500 bg-purple-50',
        pages: [
            { id: 'checklists', name: 'Checklists & Tarefas', icon: ClipboardList, keywords: ['checklist', 'checklist.fill'] },
            { id: 'producao', name: 'Produção', icon: Layers, keywords: ['production', 'producao', 'sector', 'setor'] }
        ]
    },
    {
        id: 'gestao',
        name: 'Gestão & Relatórios',
        icon: PieChart,
        color: 'text-slate-500 bg-slate-100',
        pages: [
            { id: 'relatorios', name: 'Relatórios', icon: FileBarChart, keywords: ['report', 'relatorio', 'dashboard', 'sales'] },
            { id: 'usuarios', name: 'Usuários & Equipe', icon: UsersRound, keywords: ['user', 'usuario', 'role', 'permission', 'driver', 'entregador'] },
            { id: 'configuracoes', name: 'Configurações', icon: Settings2, keywords: ['settings', 'config', 'tenant', 'estabelecimento'] },
            { id: 'integracoes', name: 'Integrações', icon: Zap, keywords: ['integration', 'webhook', 'api'] }
        ]
    }
];

const UserPermissionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNewUser = id === 'new' || !id;
  
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
    fetchData();
  }, []);

  useEffect(() => {
    if (!isNewUser && id) {
      const fetchUser = async () => {
        try {
          const users = await getUsers();
          const user = users.find((u: any) => u.id === id);
          if (user) {
            setName(user.name || '');
            setEmail(user.email);
            setRoleId(user.roleId || null);
            const directPermIds = user.permissions?.map((p: any) => p.id) || [];
            setSelectedPermissionIds(directPermIds);
          }
        } catch (error) {
          console.error('Erro ao buscar usuário:', error);
          toast.error("Erro ao carregar usuário");
        }
      };
      fetchUser();
    }
  }, [id, isNewUser]);

  const handleRoleSelect = (role: any) => {
    setRoleId(role.id);
    const rolePermIds = role.permissions?.map((p: any) => p.id) || [];
    setSelectedPermissionIds(rolePermIds);
  };

  const togglePermission = (permId: string) => {
    setSelectedPermissionIds(prev => 
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
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
    if (!id) return;
    setIsSendingReset(true);
    try {
      await sendResetEmail(id);
      toast.success(`Email de redefinição enviado para ${email}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao enviar email.');
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleSubmit = async () => {
    if (!name || !email || (isNewUser && !password)) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setIsSaving(true);
    const userData = { 
      email, 
      name, 
      roleId: roleId || undefined, 
      permissionIds: selectedPermissionIds,
      password: password || undefined 
    };

    try {
      if (!isNewUser && id) {
        await updateUser(id, userData);
        toast.success("Usuário atualizado com sucesso!");
      } else {
        await createUser(userData);
        toast.success("Usuário criado com sucesso!");
      }
      navigate('/users');
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const permissionsByCategory = useMemo(() => {
    return PERMISSION_STRUCTURE.map(cat => {
      const pages = cat.pages.map(page => {
        let pagePerms = availablePermissions.filter(p => 
          page.keywords.some(kw => p.name.toLowerCase().includes(kw.toLowerCase()))
        );
        
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

  const currentCategory = permissionsByCategory.find(c => c.id === activeCategory);
  const totalPermissionsCount = availablePermissions.length;

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/users')}
              className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-all"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">
                {isNewUser ? 'Novo Colaborador' : 'Configurar Acesso'}
              </h1>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                Dados e permissões do sistema
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 rounded-full border border-orange-100">
              <Zap size={14} className="text-orange-500" />
              <span className="text-[10px] font-black text-orange-700 uppercase">
                {selectedPermissionIds.length} permissões
              </span>
            </div>
            <Button 
              onClick={handleSubmit}
              disabled={isSaving}
              isLoading={isSaving}
              className="h-10 px-6 rounded-xl shadow-lg shadow-orange-500/20 uppercase tracking-widest italic font-black gap-2"
            >
              <Save size={16} />
              {isNewUser ? 'CADASTRAR' : 'SALVAR'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Dados do Usuário */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Formulário */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 border-slate-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-6 bg-orange-500 rounded-full" />
                <h2 className="text-sm font-black text-slate-900 uppercase italic tracking-tight">Dados de Acesso</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  label={isNewUser ? "Senha Provisória" : "Nova Senha (Opcional)"}
                  type="password" 
                  icon={Lock}
                  placeholder="••••••••"
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                />
                
                {!isNewUser && (
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleSendResetEmail}
                      disabled={isSendingReset}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed border-slate-200 hover:border-orange-300 hover:bg-orange-50/50 text-slate-500 hover:text-orange-600 transition-all text-[10px] font-bold uppercase tracking-widest"
                    >
                      {isSendingReset ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      {isSendingReset ? 'ENVIANDO...' : 'REDEFINIR SENHA'}
                    </button>
                  </div>
                )}
              </div>
            </Card>

            {/* Cargos */}
            <Card className="p-6 border-slate-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-6 bg-emerald-500 rounded-full" />
                <h2 className="text-sm font-black text-slate-900 uppercase italic tracking-tight">Cargo Base (Opcional)</h2>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Selecione um cargo para preencher permissões automaticamente</p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
            </Card>
          </div>

          {/* Stats */}
          <div className="space-y-4">
            <Card className="p-5 border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase italic">Permissões</h3>
                  <p className="text-[8px] font-bold text-slate-400 uppercase">Concedidas vs Total</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Selecionadas</span>
                  <span className="text-lg font-black text-orange-500 italic">{selectedPermissionIds.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Total Disponível</span>
                  <span className="text-lg font-black text-slate-700 italic">{totalPermissionsCount}</span>
                </div>
                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full transition-all"
                        style={{ width: `${totalPermissionsCount > 0 ? (selectedPermissionIds.length / totalPermissionsCount) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-black text-slate-600">
                      {totalPermissionsCount > 0 ? Math.round((selectedPermissionIds.length / totalPermissionsCount) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Permissões */}
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-64 shrink-0 space-y-4">
            <Card className="p-4 border-slate-200">
              <div className="relative mb-4">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Buscar..." 
                  value={permissionSearch}
                  onChange={(e) => setPermissionSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold uppercase tracking-widest focus:border-primary outline-none"
                />
              </div>
              
              <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-100 mb-4">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-black text-slate-600 uppercase">
                  {selectedPermissionIds.length} / {totalPermissionsCount}
                </span>
              </div>

              <div className="space-y-2">
                {permissionsByCategory.map(cat => {
                  const isActive = activeCategory === cat.id;
                  const Icon = cat.icon;
                  const progress = cat.totalPerms > 0 ? (cat.selectedCount / cat.totalPerms) * 100 : 0;
                  
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left",
                        isActive 
                          ? "bg-white shadow-md border-2 border-primary/20" 
                          : "hover:bg-white border-2 border-transparent"
                      )}
                    >
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", isActive ? cat.color : "bg-slate-100 text-slate-400")}>
                        <Icon size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={cn("text-[10px] font-black uppercase tracking-tight block", isActive ? "text-slate-900" : "text-slate-600")}>
                          {cat.name}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-500 rounded-full" style={{ width: `${progress}%` }} />
                          </div>
                          <span className="text-[7px] text-slate-400">{cat.selectedCount}/{cat.totalPerms}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Content */}
          <div className="flex-1">
            {isLoadingData ? (
              <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
                <Loader2 className="animate-spin text-orange-500" size={32} />
                <span className="text-[10px] font-black uppercase text-slate-400">Carregando...</span>
              </div>
            ) : currentCategory ? (
              <div className="space-y-6">
                <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", currentCategory.color)}>
                    <currentCategory.icon size={28} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">{currentCategory.name}</h4>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-[200px]">
                        <div 
                          className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full"
                          style={{ width: `${currentCategory.totalPerms > 0 ? (currentCategory.selectedCount / currentCategory.totalPerms) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">{currentCategory.selectedCount} de {currentCategory.totalPerms}</span>
                    </div>
                  </div>
                </div>

                {currentCategory.pages.map(page => {
                  const Icon = page.icon;
                  const allSelected = page.selectedCount === page.totalCount && page.totalCount > 0;
                  const someSelected = page.selectedCount > 0 && !allSelected;
                  
                  return (
                    <div key={page.id} className="p-5 rounded-2xl border-2 border-slate-100 bg-slate-50/30 hover:border-slate-200">
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-white border-2 border-slate-100 flex items-center justify-center text-slate-500 shadow-sm">
                            <Icon size={22} />
                          </div>
                          <div>
                            <h5 className="text-sm font-black text-slate-900 uppercase italic">{page.name}</h5>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={cn("text-[8px] font-black px-2 py-0.5 rounded-full uppercase", allSelected ? "bg-emerald-100 text-emerald-600" : someSelected ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-400")}>
                                {allSelected ? 'Completo' : someSelected ? 'Parcial' : 'Vazio'}
                              </span>
                              <span className="text-[7px] text-slate-400">{page.selectedCount}/{page.permissions.length}</span>
                            </div>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => toggleAllInPage(page.keywords)}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase hover:scale-105 transition-all",
                            allSelected ? "bg-emerald-500 text-white shadow-lg" : someSelected ? "bg-amber-100 text-amber-700 border-2 border-amber-200" : "bg-white text-slate-500 border-2 border-slate-200 hover:border-orange-300"
                          )}
                        >
                          {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                          {allSelected ? 'Conceder Tudo' : someSelected ? 'Ajustar' : 'Conceder'}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {page.permissions.map((p, idx) => {
                          const isSelected = selectedPermissionIds.includes(p.id);
                          return (
                            <motion.button
                              key={p.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: idx * 0.02 }}
                              onClick={() => togglePermission(p.id)}
                              className={cn("flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left hover:scale-[1.02]", isSelected ? "bg-gradient-to-br from-orange-50 to-white border-orange-200" : "bg-white border-slate-100")}
                            >
                              <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0", isSelected ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-300")}>
                                {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                              </div>
                              <div>
                                <span className={cn("text-[9px] font-bold uppercase block", isSelected ? "text-orange-900" : "text-slate-700")}>{p.description || p.name}</span>
                                <span className="text-[7px] text-slate-400 block mt-1">{p.name}</span>
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[300px] opacity-40">
                <FolderOpen size={48} className="text-slate-300 mb-3" />
                <p className="text-[10px] font-black uppercase text-slate-400">Nenhuma permissão</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserPermissionPage;