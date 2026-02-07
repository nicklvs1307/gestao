import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTables, deleteTable } from '../services/api';
import type { Table } from '@/types/index';
import { QRCodeCanvas } from 'qrcode.react';
import { Plus, QrCode, Copy, ExternalLink, Trash2, Edit, CheckCircle, Armchair, X, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { toast } from 'sonner';

interface TableManagementProps {
  onAddTableClick: () => void;
  onEditTableClick: (table: Table) => void;
  refetchTrigger: number;
}

const TableManagement: React.FC<TableManagementProps> = ({ onAddTableClick, onEditTableClick, refetchTrigger }) => {
  const [tables, setTables] = useState<Table[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeLink, setQrCodeLink] = useState<string | null>(null);
  const { user } = useAuth();
  const restaurantId = user?.restaurantId;

  const fetchTables = async () => {
    try {
      setIsLoading(true);
      const data = await getTables();
      setTables(data);
      setError(null);
    } catch (err) {
      setError('Falha ao buscar as mesas.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (restaurantId) {
      fetchTables();
      const interval = setInterval(fetchTables, 15000);
      return () => clearInterval(interval);
    }
  }, [refetchTrigger, restaurantId]);

  const handleReleaseTable = async (tableId: string) => {
    try {
      await fetch(`/api/tables/${tableId}/release`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      toast.success("Mesa liberada!");
      fetchTables();
    } catch (err) {
      toast.error('Falha ao liberar a mesa.');
    }
  };

  const handleDelete = async (tableId: string) => {
    if (!window.confirm('Excluir esta mesa?')) return;
    try {
      await deleteTable(tableId);
      toast.success("Mesa removida.");
      fetchTables();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao excluir.');
    }
  };

  const generateMenuLink = (tableNumber: number) => {
    const baseUrl = user?.menuUrl || window.location.origin.replace(window.location.port, '5174');
    const sanitizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    return `${sanitizedBaseUrl}/cardapio/${user?.restaurantId}/${tableNumber}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Link copiado!');
    });
  };

  if (isLoading && tables.length === 0) return (
      <div className="flex flex-col h-64 items-center justify-center opacity-30 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        <span className="text-[10px] font-black uppercase tracking-widest">Sincronizando Mesas...</span>
      </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Gestão de Mesas</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
            <Armchair size={14} className="text-orange-500" /> Controle de Salão e QR Codes
          </p>
        </div>
        <div className="flex gap-3">
            <Button variant="outline" size="sm" className="bg-white rounded-xl" onClick={fetchTables}>
                <RefreshCw size={16} />
            </Button>
            <Button onClick={onAddTableClick} className="rounded-xl px-6 italic">
                <Plus size={18} /> NOVA MESA
            </Button>
        </div>
      </div>

      {/* Grid de Mesas - Cards Modernos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
        {tables.length === 0 ? (
            <Card className="col-span-full p-20 flex flex-col items-center justify-center text-slate-300 opacity-30 border-dashed border-2">
                <Armchair size={64} strokeWidth={1} className="mb-4" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Nenhuma mesa ativa</p>
            </Card>
        ) : (
            tables.map(table => {
                const menuLink = generateMenuLink(table.number);
                const isAwaiting = table.status === 'awaiting_payment';
                const isOccupied = table.status === 'occupied';
                const isAvailable = table.status === 'available' || table.status === 'free';

                return (
                    <Card 
                        key={table.id} 
                        className={cn(
                            "group p-0 overflow-hidden border-2 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1",
                            isAvailable ? "border-slate-100 hover:border-emerald-500/30 bg-white" : 
                            isOccupied ? "border-blue-100 bg-blue-50/20" : 
                            "border-rose-100 bg-rose-50/20"
                        )}
                        noPadding
                    >
                        {/* Status Bar */}
                        <div className={cn(
                            "h-1.5 w-full",
                            isAvailable ? "bg-emerald-500" : isOccupied ? "bg-blue-500" : "bg-rose-500"
                        )} />

                        <div className="p-6">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110",
                                        isAvailable ? "bg-emerald-500 text-white shadow-emerald-100" : 
                                        isOccupied ? "bg-blue-500 text-white shadow-blue-100" : 
                                        "bg-rose-500 text-white shadow-rose-100"
                                    )}>
                                        <Armchair size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-xl text-slate-900 italic tracking-tighter uppercase leading-none">Mesa 0{table.number}</h3>
                                        <span className={cn(
                                            "text-[8px] font-black uppercase tracking-widest mt-1 inline-block px-1.5 py-0.5 rounded border shadow-sm",
                                            isAvailable ? "text-emerald-600 bg-emerald-50 border-emerald-100" : 
                                            isOccupied ? "text-blue-600 bg-blue-50 border-blue-100" : 
                                            "text-rose-600 bg-rose-50 border-rose-100"
                                        )}>
                                            {isAvailable ? 'Livre' : isOccupied ? 'Ocupada' : 'Pgto Pendente'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-slate-50" onClick={() => onEditTableClick(table)}><Edit size={14}/></Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-rose-50 text-rose-500" onClick={() => handleDelete(table.id)}><Trash2 size={14}/></Button>
                                </div>
                            </div>

                            {/* Menu Link Quick Actions */}
                            <div className="space-y-3 pt-4 border-t border-slate-50">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cardápio Digital</p>
                                <div className="flex gap-2">
                                    <Button 
                                        variant="outline" 
                                        className="flex-1 h-10 rounded-xl bg-slate-50 border-slate-100 text-slate-500 gap-2 text-[10px] font-black uppercase tracking-tighter shadow-sm hover:border-orange-500 hover:text-orange-600"
                                        onClick={() => setQrCodeLink(menuLink)}
                                    >
                                        <QrCode size={14} /> QR Code
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-10 w-10 rounded-xl bg-slate-100 text-slate-400"
                                        onClick={() => copyToClipboard(menuLink)}
                                    >
                                        <Copy size={14} />
                                    </Button>
                                    <a href={menuLink} target="_blank" rel="noreferrer" className="h-10 w-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg hover:scale-105 transition-all">
                                        <ExternalLink size={14} />
                                    </a>
                                </div>
                            </div>

                            {/* Checkout Action if needed */}
                            {isAwaiting && (
                                <Button 
                                    fullWidth 
                                    className="mt-4 bg-emerald-500 hover:bg-emerald-600 h-12 rounded-xl italic font-black uppercase text-[10px] tracking-widest"
                                    onClick={() => handleReleaseTable(table.id)}
                                >
                                    <CheckCircle size={16} /> Liberar Mesa
                                </Button>
                            )}
                        </div>
                    </Card>
                );
            })
        )}
      </div>

      {/* Modal de QR Code Premium */}
      <AnimatePresence>
        {qrCodeLink && (
          <div className="ui-modal-overlay">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="ui-modal-content w-full max-w-sm overflow-hidden" 
            >
              <header className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h4 className="font-black text-lg text-slate-900 italic uppercase tracking-tighter">Acesso Local</h4>
                <Button variant="ghost" size="icon" onClick={() => setQrCodeLink(null)} className="bg-white rounded-full"><X size={20}/></Button>
              </header>
              <div className="p-10 flex flex-col items-center gap-8 bg-white">
                <div className="p-6 bg-slate-50 rounded-[3rem] shadow-inner border border-slate-100 relative group">
                    <QRCodeCanvas value={qrCodeLink} size={220} />
                    <div className="absolute inset-0 bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-[3rem] cursor-pointer" onClick={() => copyToClipboard(qrCodeLink)}>
                        <Copy className="text-orange-500" size={40} />
                    </div>
                </div>
                <div className="text-center space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Aponte a câmera para testar</p>
                    <p className="text-[9px] text-slate-300 font-mono break-all max-w-[200px]">{qrCodeLink}</p>
                </div>
                <Button 
                    fullWidth 
                    size="lg"
                    className="rounded-2xl italic font-black uppercase tracking-widest h-14"
                    onClick={() => copyToClipboard(qrCodeLink)}
                >
                    <Copy size={18} /> COPIAR ENDEREÇO
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TableManagement;