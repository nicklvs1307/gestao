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
    <div className="px-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
            <History size={16} className="text-primary" />
            <h3 className="text-sm font-black italic uppercase tracking-tighter text-slate-900 leading-none">Peça Novamente</h3>
        </div>
        <a href="#" className="text-[10px] font-bold text-primary uppercase tracking-widest">Ver todos</a>
      </div>

      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
        {recentOrders.map((order) => (
          <motion.div
            key={order.id}
            whileTap={{ scale: 0.98 }}
            className="min-w-[250px] bg-white rounded-2xl p-3 border border-slate-100 shadow-lg shadow-slate-100/70 flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Pedido #{order.dailyOrderNumber || order.id.slice(-4)}</span>
                <span className="text-[9px] font-bold text-emerald-500">Concluído</span>
              </div>
              
              <div className="space-y-1.5 mb-3">
                {order.items.slice(0, 2).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-slate-50">
                      <img src={item.product.imageUrl} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black text-slate-800 truncate italic uppercase">{item.quantity}x {item.product.name}</p>
                    </div>
                  </div>
                ))}
                {order.items.length > 2 && (
                  <p className="text-[9px] text-slate-400 font-bold ml-10">+ {order.items.length - 2} itens</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
               <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Total</span>
                  <span className="text-base font-black text-slate-900 italic tracking-tighter">R$ {order.total.toFixed(2).replace('.', ',')}</span>
               </div>
               <button 
                onClick={() => onReorder(order.items)}
                className="bg-primary text-white h-9 w-9 rounded-lg flex items-center justify-center hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
               >
                 <PlusCircle size={16} />
               </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ReorderSection;
