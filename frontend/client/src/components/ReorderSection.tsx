import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getOrderById } from '../services/api';
import type { Order, Product } from '../types';
import { History, ChevronRight, PlusCircle } from 'lucide-react';

interface ReorderSectionProps {
  onProductClick: (product: Product) => void;
  onReorder: (items: any[]) => void;
}

const ReorderSection: React.FC<ReorderSectionProps> = ({ onProductClick, onReorder }) => {
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentOrders = async () => {
      const storedIds = localStorage.getItem('recent_orders');
      if (!storedIds) {
        setLoading(false);
        return;
      }

      try {
        const ids = JSON.parse(storedIds).slice(0, 3); // Pega os últimos 3 IDs
        const orders = await Promise.all(
          ids.map((id: string) => getOrderById(id).catch(() => null))
        );
        setRecentOrders(orders.filter((o): o is Order => o !== null));
      } catch (error) {
        console.error("Erro ao buscar pedidos recentes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentOrders();
  }, []);

  if (loading || recentOrders.length === 0) return null;

  return (
    <div className="px-5 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-primary/10 p-2 rounded-xl text-primary">
          <History size={20} />
        </div>
        <h3 className="text-lg font-black italic uppercase tracking-tighter text-slate-900 leading-none">Peça Novamente</h3>
      </div>

      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
        {recentOrders.map((order) => (
          <motion.div
            key={order.id}
            whileTap={{ scale: 0.98 }}
            className="min-w-[280px] bg-white rounded-[2rem] p-4 border border-slate-100 shadow-xl shadow-slate-200/40 flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pedido #{order.dailyOrderNumber || order.id.slice(-4)}</span>
                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full uppercase">Concluído</span>
              </div>
              
              <div className="space-y-2 mb-4">
                {order.items.slice(0, 2).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-slate-50">
                      <img src={item.product.imageUrl} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-900 truncate italic uppercase">{item.quantity}x {item.product.name}</p>
                    </div>
                  </div>
                ))}
                {order.items.length > 2 && (
                  <p className="text-[10px] text-slate-400 font-bold ml-13">+ {order.items.length - 2} itens</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-50">
               <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Total</span>
                  <span className="text-lg font-black text-slate-900 italic tracking-tighter">R$ {order.total.toFixed(2).replace('.', ',')}</span>
               </div>
               <button 
                onClick={() => onReorder(order.items)}
                className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-primary transition-colors shadow-lg shadow-slate-900/10"
               >
                 Repetir <PlusCircle size={14} />
               </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ReorderSection;
