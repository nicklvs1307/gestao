import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTables, deleteTable } from '../services/api';
import type { Table } from '@/types/index';
import { QRCodeCanvas } from 'qrcode.react';
import { Plus, QrCode, Copy, ExternalLink, Trash2, Edit, CheckCircle, Armchair, X, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

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
      const interval = setInterval(fetchTables, 10000);
      return () => clearInterval(interval);
    }
  }, [refetchTrigger, restaurantId]);

  const handleReleaseTable = async (tableId: string) => {
    try {
      await fetch(`/api/tables/${tableId}/release`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      fetchTables();
    } catch (err) {
      alert('Falha ao liberar a mesa.');
    }
  };

  const handleDelete = async (tableId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta mesa?')) return;
    try {
      await deleteTable(tableId);
      fetchTables();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Falha ao excluir a mesa.');
    }
  };

  const generateMenuLink = (tableNumber: number) => {
    const baseUrl = user?.menuUrl || window.location.origin.replace(window.location.port, '5174');
    const sanitizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    return `${sanitizedBaseUrl}/cardapio/${user?.restaurantId}/${tableNumber}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Link copiado para a área de transferência!');
    }, (err) => {
      alert('Falha ao copiar o link.');
      console.error('Could not copy text: ', err);
    });
  };

  if (isLoading) return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
  );

  if (error) return (
      <div className="p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 m-4">
        {error}
      </div>
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-500 max-w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ui-card p-4">
        <div>
          <h2 className="text-xl font-black text-foreground uppercase tracking-tighter italic flex items-center gap-2">
            <Armchair className="h-5 w-5 text-primary" />
            Gestão de Mesas
          </h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">Status e controle de atendimento local.</p>
        </div>
        <button 
          className="ui-button-primary h-10 px-4 text-[10px] uppercase tracking-widest"
          onClick={onAddTableClick}
        >
          <Plus size={16} />
          Adicionar Mesa
        </button>
      </div>

      <div className="ui-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="text-[9px] uppercase bg-muted/10 text-slate-400 border-b border-border font-black tracking-widest">
              <tr>
                <th className="px-4 py-3">Mesa</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Menu / QR</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {tables.length === 0 ? (
                 <tr>
                    <td colSpan={4} className="p-12 text-center text-slate-400">
                        <Armchair className="mx-auto h-10 w-10 opacity-20 mb-3" />
                        <p className="font-black text-[10px] uppercase tracking-widest">Nenhuma mesa</p>
                    </td>
                 </tr>
              ) : (
                tables.map(table => {
                  const menuLink = generateMenuLink(table.number);
                  const isAvailable = table.status.toLowerCase() === 'available';
                  const isOccupied = table.status.toLowerCase() === 'occupied';
                  const isPayment = table.status.toLowerCase() === 'awaiting_payment';

                  return (
                    <tr key={table.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded bg-muted flex items-center justify-center text-slate-400 border border-border">
                                <Armchair size={14} />
                            </div>
                            <span className="font-bold text-xs uppercase italic tracking-tight">Mesa {table.number}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                            "inline-flex items-center rounded-md px-2 py-0.5 text-[8px] font-black uppercase tracking-widest border shadow-sm transition-all",
                            isAvailable && "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20",
                            isOccupied && "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/20",
                            isPayment && "bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-950/20",
                            !isAvailable && !isOccupied && !isPayment && "bg-muted text-slate-400 border-border"
                        )}>
                            {table.status === 'awaiting_payment' ? 'Pagamento' : 
                             table.status === 'available' ? 'Livre' : 
                             table.status === 'occupied' ? 'Ocupada' : table.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setQrCodeLink(menuLink)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all" title="QR Code">
                            <QrCode size={16} />
                          </button>
                          <button onClick={() => copyToClipboard(menuLink)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all" title="Copiar Link">
                            <Copy size={14} />
                          </button>
                          <a href={menuLink} target="_blank" rel="noopener noreferrer" className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all" title="Abrir Menu">
                            <ExternalLink size={14} />
                          </a>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {table.status === 'awaiting_payment' ? (
                            <button 
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 font-black text-[9px] uppercase tracking-widest transition-all shadow-md shadow-emerald-500/20" 
                                onClick={() => handleReleaseTable(table.id)}
                            >
                                <CheckCircle size={12} /> Liberar
                            </button>
                          ) : (
                            <>
                              <button 
                                className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all" 
                                onClick={() => onEditTableClick(table)}
                              >
                                <Edit size={16} />
                              </button>
                              <button 
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" 
                                onClick={() => handleDelete(table.id)}
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {qrCodeLink && (
          <div className="ui-modal-overlay" onClick={() => setQrCodeLink(null)}>
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="ui-modal-content w-full max-w-sm" 
                onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-border bg-muted/20 flex justify-between items-center">
                <h4 className="font-black text-lg text-foreground italic uppercase tracking-tight">QR Code da Mesa</h4>
                <button onClick={() => setQrCodeLink(null)} className="p-2 hover:bg-muted rounded-full text-slate-400">
                    <X size={20} />
                </button>
              </div>
              <div className="p-8 flex flex-col items-center gap-6 bg-white dark:bg-white"> {/* Mantemos branco para leitura do QR */}
                <div className="p-4 bg-white rounded-2xl shadow-inner border border-slate-100">
                    <QRCodeCanvas value={qrCodeLink} size={200} />
                </div>
                <p className="text-[10px] text-center text-slate-400 break-all bg-slate-50 p-3 rounded-xl w-full font-mono font-bold border border-slate-100 uppercase italic">
                    {qrCodeLink}
                </p>
                <button 
                    className="ui-button-primary w-full h-12 uppercase italic" 
                    onClick={() => copyToClipboard(qrCodeLink)}
                >
                    <Copy size={16} />
                    Copiar Link
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TableManagement;
