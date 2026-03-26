import React, { useState, useEffect, useMemo } from 'react';
import { api, payWaiterCommission } from '../services/api';
import { 
  Users, DollarSign, RefreshCw, Calendar, User, ShoppingBag, CheckCircle, 
  TrendingUp, Wallet, ArrowUpRight, Loader2, TrendingDown, Receipt, 
  Percent, FileText, Search, ChevronRight
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { motion } from 'framer-motion';

interface WaiterSettlementData {
  waiterId: string;
  waiterName: string;
  totalOrders: number;
  totalSales: number;
  serviceRate: number;
  commissionAmount: number;
}

const WaiterSettlement: React.FC = () => {
  const [data, setData] = useState<WaiterSettlementData[]>([]);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [searchQuery, setSearchQuery] = useState('');

  const fetchSettlement = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/waiters/settlement?date=${date}`);
      setData(res.data);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar acertos.");
    } finally {
      setLoading(false);
    }
  };

  const handlePayCommission = async (waiter: WaiterSettlementData) => {
    if(!confirm(`Confirmar pagamento de R$ ${waiter.commissionAmount.toFixed(2)} para ${waiter.waiterName}?\n\nIsso lançará a comissão no caixa aberto.`)) return;

    try {
      await payWaiterCommission({
        waiterId: waiter.waiterId,
        amount: waiter.commissionAmount,
        date: date
      });
      toast.success(`Pagamento de ${waiter.waiterName} registrado!`);
      fetchSettlement();
    } catch (error) {
      toast.error("Erro ao registrar pagamento.");
    }
  };

  useEffect(() => {
    fetchSettlement();
  }, [date]);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const query = searchQuery.toLowerCase();
    return data.filter(d => d.waiterName.toLowerCase().includes(query));
  }, [data, searchQuery]);

  const totalSales = data.reduce((acc, curr) => acc + curr.totalSales, 0);
  const totalCommission = data.reduce((acc, curr) => acc + curr.commissionAmount, 0);
  const totalOrders = data.reduce((acc, curr) => acc + curr.totalOrders, 0);
  const avgTicket = totalOrders > 0 ? totalSales / totalOrders : 0;
  const serviceRate = data[0]?.serviceRate || 10;

  const formatCurrency = (value: number) => 
    `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* HEADER - ERP Premium */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/20">
            <Users size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic leading-none flex items-center gap-2">
              Acertos de <span className="text-primary">Garçons</span>
            </h1>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
              Comissões, Taxas de Serviço e Liquidação de Turno
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-200 shadow-sm">
            <Calendar size={14} className="text-primary" />
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent border-none font-black text-[11px] uppercase outline-none text-slate-600 cursor-pointer"
            />
          </div>
          <Button variant="primary" size="sm" className="h-9 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest" onClick={fetchSettlement}>
            <RefreshCw size={14} className={cn(loading && "animate-spin", "mr-2")} />
            {loading ? 'CARREGANDO' : 'ATUALIZAR'}
          </Button>
        </div>
      </div>

      {/* KPIs DENSOS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 bg-gradient-to-br from-primary to-slate-900 text-white border-none">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-orange-400" />
            <span className="text-[8px] font-black uppercase tracking-widest text-white/60">Faturamento do Dia</span>
          </div>
          <p className="text-2xl font-black italic tracking-tighter">{formatCurrency(totalSales)}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[7px] font-bold text-white/60 uppercase">{totalOrders} atendimentos</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <Percent size={14} className="text-blue-500" />
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Total Comissões</span>
          </div>
          <p className="text-2xl font-black italic tracking-tighter text-blue-600">{formatCurrency(totalCommission)}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[7px] font-bold text-slate-400 uppercase">Taxa aplicada: {serviceRate}%</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <Receipt size={14} className="text-emerald-500" />
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Média por Atend.</span>
          </div>
          <p className="text-2xl font-black italic tracking-tighter text-emerald-600">{formatCurrency(avgTicket)}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[7px] font-bold text-slate-400 uppercase">Ticket médio</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingBag size={14} className="text-purple-500" />
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Volume de Atend.</span>
          </div>
          <p className="text-2xl font-black italic tracking-tighter text-purple-600">{totalOrders}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[7px] font-bold text-slate-400 uppercase">pedidos processados</span>
          </div>
        </Card>
      </div>

      {/* LISTAGEM POR GARÇOM - CARDS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-primary rounded-full" />
            <h3 className="font-black text-slate-900 uppercase italic tracking-tighter text-sm">Comissões por Garçom</h3>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-2">
              {filteredData.length} colaborador(es) encontrado(s)
            </span>
          </div>
          
          <div className="relative w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar garçom..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-widest focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-6 animate-pulse bg-slate-50 border-slate-200 min-h-[180px]" />
            ))}
          </div>
        ) : filteredData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredData.map((waiter, idx) => (
              <motion.div
                key={waiter.waiterId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="p-0 overflow-hidden border-2 border-slate-100 hover:border-primary/20 transition-all duration-300 hover:shadow-xl bg-white rounded-2xl" noPadding>
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
                          <User size={20} />
                        </div>
                        <div>
                          <h4 className="font-black text-sm text-slate-900 uppercase italic tracking-tighter leading-none">
                            {waiter.waiterName}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[7px] font-black uppercase tracking-widest bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded">
                              <ShoppingBag size={8} className="inline mr-1" />
                              {waiter.totalOrders} atendimentos
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">Vendas</p>
                        <p className="text-sm font-black text-slate-700 italic tracking-tighter">
                          {formatCurrency(waiter.totalSales)}
                        </p>
                      </div>
                      <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                        <p className="text-[7px] font-black text-emerald-600 uppercase tracking-widest mb-1">Comissão</p>
                        <p className="text-lg font-black text-emerald-600 italic tracking-tighter">
                          {formatCurrency(waiter.commissionAmount)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <Percent size={10} className="text-slate-400" />
                        <span className="text-[7px] font-bold text-slate-400 uppercase">
                          Taxa: {serviceRate}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[7px] font-bold text-slate-400 uppercase">
                          Média: {formatCurrency(waiter.totalOrders > 0 ? waiter.totalSales / waiter.totalOrders : 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="px-5 pb-5 pt-0">
                    <Button 
                      fullWidth 
                      variant="secondary"
                      className="h-10 rounded-xl text-[9px] font-black uppercase tracking-widest gap-1.5 border-slate-200 bg-slate-50 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all"
                      onClick={() => handlePayCommission(waiter)}
                    >
                      <DollarSign size={14} /> REGISTRAR PAGAMENTO
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="p-16 text-center border-2 border-dashed border-slate-200 bg-slate-50/30">
            <div className="flex flex-col items-center opacity-20">
              <Users size={64} strokeWidth={1} className="text-slate-400/40 mb-4" />
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] italic">Nenhum atendimento</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase mt-2">Para o período selecionado</p>
            </div>
          </Card>
        )}
      </div>

      {/* STATUS BAR */}
      <div className="flex items-center justify-between px-2 py-3 bg-slate-50 rounded-xl border border-slate-100">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sistema Online</span>
          </div>
          <div className="w-px h-4 bg-slate-200" />
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
            Última atualização: {format(new Date(), "'às' HH:mm:ss", { locale: ptBR })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <FileText size={12} className="text-slate-400" />
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
            Sincronizado com Fluxo de Caixa
          </span>
        </div>
      </div>
    </div>
  );
};

export default WaiterSettlement;