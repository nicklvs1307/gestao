import React, { useState, useEffect } from 'react';
import { X, Shield, ShieldCheck, CheckSquare, Square, Info } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { toast } from 'sonner';
import { api } from '../services/api';

interface Permission {
  id: string;
  name: string;
  description: string;
}

interface RolePermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  roleId: string;
  roleName: string;
  currentPermissionIds: string[];
  onSave: () => void;
}

// Categorias para organizar visualmente (baseado na sua imagem)
const CATEGORIES = [
  {
    title: 'Vendas e Pedidos',
    pattern: 'orders:|waiter:|kds:|table:',
    permissions: [] as Permission[]
  },
  {
    title: 'Financeiro',
    pattern: 'financial:|cashier:|bank_accounts:|waiter_settlement:|driver_settlement:',
    permissions: [] as Permission[]
  },
  {
    title: 'Estoque e Cardápio',
    pattern: 'products:|categories:|stock:|suppliers:',
    permissions: [] as Permission[]
  },
  {
    title: 'Relatórios',
    pattern: 'reports:',
    permissions: [] as Permission[]
  },
  {
    title: 'Configurações e Equipe',
    pattern: 'settings:|users:|integrations:',
    permissions: [] as Permission[]
  }
];

const RolePermissionsModal: React.FC<RolePermissionsModalProps> = ({ 
  isOpen, onClose, roleId, roleName, currentPermissionIds, onSave 
}) => {
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!isOpen) return;
      setIsLoading(true);
      try {
        const response = await api.get('/admin/permissions'); // Endpoint que precisaremos garantir que exista
        setAllPermissions(response.data);
        setSelectedIds(currentPermissionIds);
      } catch (error) {
        toast.error("Erro ao carregar permissões");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [isOpen, roleId, currentPermissionIds]);

  const togglePermission = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.put(`/admin/roles/${roleId}/permissions`, { permissionIds: selectedIds });
      toast.success("Permissões atualizadas com sucesso!");
      onSave();
      onClose();
    } catch (error) {
      toast.error("Erro ao salvar permissões");
    } finally {
      setIsSaving(false);
    }
  };

  // Organiza permissões em categorias
  const categorized = CATEGORIES.map(cat => {
    const regex = new RegExp(cat.pattern);
    return {
      ...cat,
      permissions: allPermissions.filter(p => regex.test(p.name))
    };
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header Master */}
        <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
            <div className="flex items-center gap-4">
                <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-lg">
                    <Shield size={24} />
                </div>
                <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">
                        Permissões do Cargo
                    </h3>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2">
                        <ShieldCheck size={12} className="text-orange-500" /> Definindo acessos para: <span className="text-slate-900 underline">{roleName}</span>
                    </p>
                </div>
            </div>
            <button onClick={onClose} className="w-10 h-10 bg-white border border-slate-100 text-slate-400 rounded-full flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-all shadow-sm">
                <X size={20} />
            </button>
        </div>

        {/* Content - Scrollable Grid */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
            {isLoading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4 opacity-30">
                    <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    <p className="font-black text-[10px] uppercase tracking-widest">Mapeando Permissões...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {categorized.map((category, idx) => (
                        <div key={idx} className="space-y-4">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-2">
                                <h4 className="font-black text-slate-900 text-sm uppercase italic tracking-tight">{category.title}</h4>
                                <span className="bg-slate-100 text-slate-400 text-[8px] font-black px-2 py-0.5 rounded-full">{category.permissions.length}</span>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-2">
                                {category.permissions.map(p => {
                                    const isSelected = selectedIds.includes(p.id);
                                    return (
                                        <div 
                                            key={p.id}
                                            onClick={() => togglePermission(p.id)}
                                            className={cn(
                                                "group flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer",
                                                isSelected 
                                                    ? "bg-slate-900 border-slate-900 text-white shadow-md" 
                                                    : "bg-white border-slate-50 hover:border-slate-200"
                                            )}
                                        >
                                            <div className={cn(
                                                "transition-colors",
                                                isSelected ? "text-orange-500" : "text-slate-300 group-hover:text-slate-400"
                                            )}>
                                                {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                                            </div>
                                            <div className="flex-1">
                                                <p className={cn("text-[10px] font-black uppercase tracking-tight", isSelected ? "text-white" : "text-slate-700")}>{p.description}</p>
                                                <p className={cn("text-[7px] font-bold uppercase tracking-widest mt-0.5", isSelected ? "text-slate-500" : "text-slate-300")}>{p.name}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* Rodapé Fixo */}
        <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-slate-400">
                <Info size={16} />
                <p className="text-[10px] font-bold uppercase tracking-tight">O SuperAdmin sempre terá acesso total, independente destas configurações.</p>
            </div>
            <div className="flex gap-3">
                <Button variant="ghost" onClick={onClose} className="rounded-xl uppercase text-[10px] font-black tracking-widest">
                    Cancelar
                </Button>
                <Button 
                    onClick={handleSave} 
                    isLoading={isSaving}
                    disabled={isLoading}
                    className="rounded-xl px-10 italic font-black shadow-xl shadow-slate-200"
                >
                    SALVAR PERMISSÕES
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default RolePermissionsModal;
