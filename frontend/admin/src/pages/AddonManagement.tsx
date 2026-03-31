import React, { useState, useEffect, useMemo } from 'react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { addonService, updateAddon } from '../services/api/addonService';
import type { AddonGroup } from '../services/api/addonService';
import { 
  Plus, Edit2, Trash2, Loader2, List, Settings, 
  RefreshCw, Copy, Search, Hash, ChevronRight,
  Info, CheckCircle2, AlertCircle, Layers, ListTree, Tag, DollarSign
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { motion } from 'framer-motion';

interface AddonGroupRowProps {
    group: AddonGroup;
    onDuplicate: (id: string) => void;
    onDelete: (id: string) => void;
    navigate: any;
}

const AddonGroupRow: React.FC<AddonGroupRowProps> = ({ group, onDuplicate, onDelete, navigate }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [addonEdits, setAddonEdits] = useState<Record<string, {name: string, price: string}>>({});

    const handleAddonBlur = async (addonId: string) => {
        const edit = addonEdits[addonId];
        if (!edit) return;
        const newPrice = parseFloat(edit.price);
        if (isNaN(newPrice)) return;
        
        try {
            await updateAddon(addonId, { name: edit.name, price: newPrice });
            toast.success("Item atualizado!");
        } catch (e) {
            toast.error("Erro ao atualizar item.");
        }
    };

    return (
        <>
        <tr className={cn("hover:bg-slate-50/50 transition-colors group", isExpanded && "bg-slate-50/80")}>
            <td className="px-6 py-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => setIsExpanded(!isExpanded)} className={cn("p-1.5 rounded-xl transition-all hover:bg-slate-100 text-slate-400", isExpanded && "rotate-90 text-orange-500 bg-orange-50")}>
                        <ChevronRight size={18} />
                    </button>
                    <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-sm transition-transform group-hover:scale-110",
                        group.isFlavorGroup ? "bg-amber-50 border-amber-100 text-amber-500" : "bg-slate-50 border-slate-100 text-slate-400"
                    )}>
                        {group.isFlavorGroup ? <Layers size={20} /> : <List size={20} />}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="font-black text-xs uppercase italic tracking-tighter truncate group-hover:text-orange-600 transition-colors">
                            {group.name}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            {group.isFlavorGroup && (
                                <span className="text-[7px] font-black bg-amber-500 text-white px-1 rounded italic uppercase tracking-widest">SABORES</span>
                            )}
                            <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest italic truncate">
                                ID: {group.id?.slice(-8).toUpperCase()}
                            </span>
                        </div>
                    </div>
                </div>
            </td>
            <td className="px-4 py-4">
                <div className="flex items-center justify-center gap-1.5">
                    <Badge label="OBRIG" active={group.isRequired} variant="rose" />
                    <Badge label={group.type === 'single' ? "ÚNICA" : "MÚLTIP"} active={true} variant={group.type === 'single' ? "blue" : "purple"} />
                    {group.priceRule === 'higher' && <Badge label="MAIOR" active={true} variant="amber" />}
                </div>
            </td>
            <td className="px-4 py-4 text-center">
                <div className="flex flex-col items-center">
                    <span className="font-black text-xs italic tracking-tighter text-slate-700">
                        {group.minQuantity} <span className="text-[8px] text-slate-300 mx-1">A</span> {group.maxQuantity}
                    </span>
                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Escolhas Permitidas</span>
                </div>
            </td>
            <td className="px-4 py-4">
                <div className="flex flex-col gap-1.5">
                    <div className="flex flex-wrap gap-1">
                        {group.addons.slice(0, 3).map((a, i) => (
                            <span key={i} className="text-[8px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase italic border border-slate-200/50">
                                {a.name}
                            </span>
                        ))}
                        {group.addons.length > 3 && (
                            <span className="text-[8px] font-black text-slate-400 px-1 py-0.5 uppercase italic">+{group.addons.length - 3} itens</span>
                        )}
                    </div>
                    <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                        <div className="bg-orange-400 h-full rounded-full" style={{ width: `${Math.min(100, (group.addons.length / 10) * 100)}%` }} />
                    </div>
                </div>
            </td>
            <td className="px-4 py-4 text-center">
                <span className="text-[9px] font-black bg-slate-50 border border-slate-200 text-slate-400 px-2 py-1 rounded italic uppercase">
                    {group.saiposIntegrationCode || '---'}
                </span>
            </td>
            <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                    <Button variant="ghost" size="icon" className="h-9 w-9 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-xl border border-slate-200 shadow-sm" onClick={() => onDuplicate(group.id!)} title="Duplicar"><Copy size={16}/></Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 bg-slate-50 text-slate-400 hover:text-orange-600 rounded-xl border border-slate-200 shadow-sm" onClick={() => navigate(`/addons/${group.id}`)} title="Editar"><Edit2 size={16}/></Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 bg-slate-50 text-slate-400 hover:text-rose-600 rounded-xl border border-slate-200 shadow-sm" onClick={() => onDelete(group.id!)} title="Excluir"><Trash2 size={16}/></Button>
                </div>
            </td>
        </tr>
        {isExpanded && (
            <tr className="bg-slate-50/80 animate-in slide-in-from-top-2 duration-300">
                <td colSpan={6} className="px-12 py-6 border-b border-slate-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {group.addons.map(addon => (
                            <div key={addon.id} className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-2 hover:border-orange-200 transition-all group/addon">
                                <div className="flex-1">
                                    <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest block mb-1">Nome do Item</span>
                                    <input 
                                        className="w-full bg-transparent border-none text-[11px] font-black uppercase italic text-slate-700 focus:ring-0 p-0 h-auto"
                                        value={addonEdits[addon.id!]?.name ?? addon.name}
                                        onChange={e => setAddonEdits({...addonEdits, [addon.id!]: { ...(addonEdits[addon.id!] || {price: addon.price.toString()}), name: e.target.value }})}
                                        onBlur={() => handleAddonBlur(addon.id!)}
                                    />
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[9px] font-black text-slate-300">R$</span>
                                        <input 
                                            type="number" step="0.01"
                                            className="w-20 bg-slate-50 border-none rounded-lg text-xs font-black text-slate-900 focus:bg-white focus:ring-1 focus:ring-orange-500/20 px-2 py-1"
                                            value={addonEdits[addon.id!]?.price ?? addon.price}
                                            onChange={e => setAddonEdits({...addonEdits, [addon.id!]: { ...(addonEdits[addon.id!] || {name: addon.name}), price: e.target.value }})}
                                            onBlur={() => handleAddonBlur(addon.id!)}
                                        />
                                    </div>
                                    <div className="flex gap-1">
                                        <span className={cn("px-1.5 py-0.5 rounded text-[7px] font-black uppercase italic border", addon.saiposIntegrationCode ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-100 text-slate-400 border-slate-200")}>
                                            {addon.saiposIntegrationCode ? 'SYNC' : 'LOCAL'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {group.addons.length === 0 && (
                            <div className="col-span-full py-8 text-center border-2 border-dashed border-slate-200 rounded-3xl">
                                <p className="text-[10px] font-black uppercase text-slate-300 italic">Nenhum item cadastrado neste grupo</p>
                            </div>
                        )}
                    </div>
                </td>
            </tr>
        )}
        </>
    );
};

const AddonManagement: React.FC = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<AddonGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmData, setConfirmData] = useState<{open: boolean, title: string, message: string, onConfirm: () => void}>({open: false, title: '', message: '', onConfirm: () => {}});

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const groupsData = await addonService.getAll();
      setGroups(Array.isArray(groupsData) ? groupsData : []);
    } catch (error) { toast.error('Erro ao carregar biblioteca.'); }
    finally { setLoading(false); }
  };

  const handleDuplicate = async (id: string) => {
    try {
      setLoading(true);
      await addonService.duplicate(id);
      toast.success('Grupo duplicado com sucesso!');
      fetchData();
    } catch (error) { toast.error('Erro ao duplicar grupo.'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    setConfirmData({open: true, title: 'Confirmar', message: 'Deseja excluir este grupo permanentemente? Todos os vínculos com produtos serão removidos.', onConfirm: async () => {
      try {
        await addonService.delete(id);
        toast.success('Grupo removido da biblioteca.');
        fetchData();
      } catch (error) { toast.error('Erro ao excluir grupo.'); }
    }});
  };

  const filteredGroups = useMemo(() => {
    return groups.filter(g => 
      g.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      g.saiposIntegrationCode?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [groups, searchTerm]);

  // KPI computations
  const totalItems = useMemo(() => groups.reduce((acc, g) => acc + g.addons.length, 0), [groups]);
  const syncedGroups = useMemo(() => groups.filter(g => g.saiposIntegrationCode).length, [groups]);
  const flavorGroups = useMemo(() => groups.filter(g => g.isFlavorGroup).length, [groups]);
  const pendingGroups = useMemo(() => groups.filter(g => !g.saiposIntegrationCode).length, [groups]);

  if (loading && groups.length === 0) return (
      <div className="flex flex-col h-[60vh] items-center justify-center opacity-30 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">Sincronizando Biblioteca...</span>
      </div>
  );

  return (
    <motion.div 
      className="space-y-6 pb-10 max-w-[1600px] mx-auto"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* HEADER - ERP Premium */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/20">
            <Layers size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic leading-none flex items-center gap-2">
              Biblioteca de <span className="text-orange-500">Complementos</span>
            </h1>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
              Gestão Centralizada de Adicionais, Sabores e Regras de Escolha
            </p>
          </div>
        </div>
        
        <div className="flex gap-2 w-full lg:w-auto">
            <Button variant="outline" className="bg-white rounded-xl h-11 px-4 border-slate-200 text-slate-400 hover:text-orange-500 transition-all" onClick={fetchData}>
                <RefreshCw size={16} className={cn(loading && "animate-spin")} />
            </Button>
            <Button onClick={() => navigate('/addons/new')} className="flex-1 lg:flex-none rounded-xl px-6 italic font-black h-11 shadow-lg shadow-orange-900/10 text-xs gap-2 uppercase">
                <Plus size={18} /> NOVO GRUPO
            </Button>
        </div>
      </div>

      {/* KPIs DENSOS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card className="p-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none">
          <div className="flex items-center gap-2 mb-2">
            <ListTree size={14} className="text-orange-400" />
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Total Grupos</span>
          </div>
          <p className="text-lg font-black italic tracking-tighter">{groups.length}</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[7px] font-bold text-orange-400 uppercase">Bibliotecas ativas</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <Hash size={14} className="text-blue-500" />
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Total Itens</span>
          </div>
          <p className="text-lg font-black italic tracking-tighter text-blue-600">{totalItems}</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[7px] font-bold text-slate-400 uppercase">Addons/Sabores</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={14} className="text-emerald-500" />
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Sincronizados ERP</span>
          </div>
          <p className="text-lg font-black italic tracking-tighter text-emerald-600">{syncedGroups}</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[7px] font-bold text-slate-400 uppercase">Integração ativa</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <Layers size={14} className="text-amber-500" />
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Grupos de Sabores</span>
          </div>
          <p className="text-lg font-black italic tracking-tighter text-amber-600">{flavorGroups}</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[7px] font-bold text-slate-400 uppercase">Variações de sabor</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={14} className="text-rose-500" />
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Pendentes</span>
          </div>
          <p className="text-lg font-black italic tracking-tighter text-rose-600">{pendingGroups}</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[7px] font-bold text-slate-400 uppercase">Sem código ERP</span>
          </div>
        </Card>
      </div>

      {/* SEARCH BAR */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors" size={16} />
            <input 
                type="text" 
                placeholder="Pesquisar por nome ou código de integração..." 
                className="w-full h-12 pl-12 pr-4 rounded-2xl bg-white border border-slate-200 focus:border-orange-500 outline-none transition-all font-bold text-xs uppercase italic tracking-tight shadow-sm"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

      {/* TABELA PREMIUM */}
      <Card className="p-0 overflow-hidden border border-slate-200 shadow-xl bg-white rounded-2xl" noPadding>
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-orange-500 rounded-full" />
            <div>
              <h3 className="font-black text-slate-900 uppercase italic tracking-tighter text-sm">Relação de Grupos</h3>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{filteredGroups.length} grupos encontrados</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed min-w-[1000px]">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="w-[30%] px-6 py-3 text-[9px] font-black uppercase tracking-widest italic">Grupo / Identificação</th>
                <th className="w-[15%] px-4 py-3 text-center text-[9px] font-black uppercase tracking-widest italic">Regras Técnicas</th>
                <th className="w-[12%] px-4 py-3 text-center text-[9px] font-black uppercase tracking-widest italic">Seleção Mín/Máx</th>
                <th className="w-[20%] px-4 py-3 text-[9px] font-black uppercase tracking-widest italic">Mix de Itens</th>
                <th className="w-[10%] px-4 py-3 text-center text-[9px] font-black uppercase tracking-widest italic">Cód. Integração</th>
                <th className="w-[13%] px-6 py-3 text-right text-[9px] font-black uppercase tracking-widest italic">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredGroups.map((group) => (
                <AddonGroupRow key={group.id} group={group} onDuplicate={handleDuplicate} onDelete={handleDelete} navigate={navigate} />
              ))}
            </tbody>
          </table>
        </div>

        {filteredGroups.length === 0 && (
          <div className="p-20 text-center bg-slate-50/30">
            <div className="flex flex-col items-center justify-center opacity-20">
              <Layers size={48} strokeWidth={1} className="mb-4" />
              <p className="font-black text-[10px] uppercase tracking-[0.3em] italic leading-none">Biblioteca Vazia</p>
              <p className="text-[8px] font-bold uppercase tracking-widest mt-2">Nenhum grupo de complementos foi configurado até o momento.</p>
            </div>
          </div>
        )}
      </Card>

      {/* STATUS BAR */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sistema Online</span>
          </div>
          <div className="w-px h-4 bg-slate-200" />
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
            {groups.length} grupos · {totalItems} itens · {syncedGroups} sincronizados
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
            Biblioteca de Complementos v2.0
          </span>
        </div>
      </div>

      <ConfirmDialog isOpen={confirmData.open} onClose={() => setConfirmData(prev => ({...prev, open: false}))} onConfirm={() => { confirmData.onConfirm(); setConfirmData(prev => ({...prev, open: false})); }} title={confirmData.title} message={confirmData.message} />
    </motion.div>
  );
};

interface BadgeProps {
  label: string;
  active: boolean;
  variant: 'rose' | 'blue' | 'purple' | 'amber' | 'slate';
}

const Badge: React.FC<BadgeProps> = ({ label, active, variant }) => {
  const variants = {
    rose: active ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-slate-50 text-slate-200 border-slate-100 opacity-30",
    blue: active ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-slate-50 text-slate-200 border-slate-100 opacity-30",
    purple: active ? "bg-purple-50 text-purple-600 border-purple-100" : "bg-slate-50 text-slate-200 border-slate-100 opacity-30",
    amber: active ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-slate-50 text-slate-200 border-slate-100 opacity-30",
    slate: active ? "bg-slate-100 text-slate-600 border-slate-200" : "bg-slate-50 text-slate-200 border-slate-100 opacity-30"
  };

  return (
    <span className={cn("px-1.5 py-0.5 rounded text-[7px] font-black border tracking-wider uppercase italic", variants[variant])}>
      {label}
    </span>
  );
};

export default AddonManagement;
