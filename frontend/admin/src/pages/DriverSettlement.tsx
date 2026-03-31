import React, { useState, useEffect, useMemo } from 'react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { api, payDriverSettlement } from '../services/api';
import { printDriverSettlement } from '../services/printing';
import { 
  Truck, DollarSign, CreditCard, Building2, 
  Calendar, RefreshCw, User, Package, Wallet, CheckCircle, 
  Clock, ArrowRightLeft, FileDown, Printer, Filter, TrendingUp,
  TrendingDown, MoreHorizontal, Search, X, ChevronDown
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';

interface SettlementData {
  driverId: string;
  driverName: string;
  totalOrders: number;
  cash: number;
  card: number;
  pix: number;
  deliveryFees: number;
  totalToPay: number;
  storeNet: number;
  orders?: any[];
}

const DriverSettlement: React.FC = () => {
  const [data, setData] = useState<SettlementData[]>([]);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('00:00');
  const [endTime, setEndTime] = useState('23:59');
  const [confirmData, setConfirmData] = useState<{open: boolean, title: string, message: string, onConfirm: () => void}>({open: false, title: '', message: '', onConfirm: () => {}});
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);

  const fetchSettlement = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/orders/drivers/settlement`, {
        params: { date, startTime, endTime }
      });
      setData(res.data);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar acertos.");
    } finally {
      setLoading(false);
    }
  };

  const handlePaySettlement = async (settlement: SettlementData) => {
    setConfirmData({
      open: true, 
      title: 'Confirmar Acerto', 
      message: `CONFIRMAR ACERTO: R$ ${settlement.totalToPay.toFixed(2)} com ${settlement.driverName}?\n\nIsso lançará os valores no caixa aberto e finalizará o ciclo de liquidação.`, 
      onConfirm: async () => {
        try {
          // 1. Imprime o comprovante ANTES de liquidar
          await printDriverSettlement(settlement, date, startTime, endTime);
          
          // 2. Registra o acerto no backend
          await payDriverSettlement({
            driverName: settlement.driverName,
            amount: settlement.totalToPay,
            date: date,
            driverId: settlement.driverId
          });
          toast.success(`Acerto de ${settlement.driverName} registrado com sucesso!`);
          fetchSettlement();
        } catch (error: any) {
          toast.error(error.response?.data?.error || "Erro ao registrar acerto.");
        }
      }
    });
  };

  const handleExportAll = async () => {
    if (filteredData.length === 0) return;
    
    // Imprime um comprovante para cada entregador
    for (const settlement of filteredData) {
      await printDriverSettlement(settlement, date, startTime, endTime);
    }
    toast.success(`${filteredData.length} comprovante(s) enviado(s) para impressão!`);
  };

  useEffect(() => {
    fetchSettlement();
  }, [date, startTime, endTime]);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const query = searchQuery.toLowerCase();
    return data.filter(d => d.driverName.toLowerCase().includes(query));
  }, [data, searchQuery]);

  const totals = useMemo(() => data.reduce((acc, curr) => ({
    toPay: acc.toPay + curr.totalToPay,
    net: acc.net + curr.storeNet,
    cash: acc.cash + curr.cash,
    card: acc.card + curr.card,
    pix: acc.pix + curr.pix,
    orders: acc.orders + curr.totalOrders
  }), { toPay: 0, net: 0, cash: 0, card: 0, pix: 0, orders: 0 }), [data]);

  const avgTicket = totals.orders > 0 ? totals.net / totals.orders : 0;
  const profitMargin = totals.toPay > 0 ? ((totals.net / totals.toPay) * 100) : 0;

  const formatCurrency = (value: number) => 
    `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-10">
      {/* HEADER - ERP Premium */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/20">
            <Truck size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic leading-none flex items-center gap-2">
              Gestão de Acertos <span className="text-primary">Logística</span>
            </h1>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
              Controle de Turnos e Liquidação de Entregadores
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-200 shadow-sm">
            <Calendar size={14} className="text-primary" />
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent border-none font-black text-[11px] uppercase outline-none text-slate-600 cursor-pointer"
            />
          </div>
          
          <div className="h-6 w-px bg-slate-200" />

          <div className="flex items-center gap-2">
            <Clock size={14} className="text-slate-400" />
            <input 
              type="time" 
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2 py-2 font-black text-[11px] outline-none text-slate-600 w-20"
            />
            <ArrowRightLeft size={12} className="text-slate-300" />
            <input 
              type="time" 
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2 py-2 font-black text-[11px] outline-none text-slate-600 w-20"
            />
          </div>

          <Button variant="primary" size="sm" className="h-9 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest" onClick={fetchSettlement}>
            <RefreshCw size={14} className={cn(loading && "animate-spin", "mr-2")} /> 
            {loading ? 'CARREGANDO' : 'ATUALIZAR'}
          </Button>
        </div>
      </div>

      {/* KPIs DENSOS */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card className="p-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={14} className="text-orange-400" />
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Repasse Total</span>
          </div>
          <p className="text-lg font-black italic tracking-tighter">{formatCurrency(totals.toPay)}</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[7px] font-bold text-orange-400 uppercase">{totals.orders} entregas</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-emerald-500" />
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Receita Líquida</span>
          </div>
          <p className={cn("text-lg font-black italic tracking-tighter", totals.net >= 0 ? "text-emerald-600" : "text-rose-600")}>
            {formatCurrency(totals.net)}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[7px] font-bold text-slate-400 uppercase">Margem: {profitMargin.toFixed(1)}%</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <Wallet size={14} className="text-blue-500" />
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Dinheiro (Mão)</span>
          </div>
          <p className="text-lg font-black italic tracking-tighter text-blue-600">{formatCurrency(totals.cash)}</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[7px] font-bold text-slate-400 uppercase">Coletado na Rua</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard size={14} className="text-purple-500" />
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Cartão</span>
          </div>
          <p className="text-lg font-black italic tracking-tighter text-purple-600">{formatCurrency(totals.card)}</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[7px] font-bold text-slate-400 uppercase">Machine</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <Building2 size={14} className="text-emerald-500" />
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">PIX</span>
          </div>
          <p className="text-lg font-black italic tracking-tighter text-emerald-600">{formatCurrency(totals.pix)}</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[7px] font-bold text-slate-400 uppercase">Transferência</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <Package size={14} className="text-slate-600" />
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Ticket Médio</span>
          </div>
          <p className="text-lg font-black italic tracking-tighter text-slate-800">{formatCurrency(avgTicket)}</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[7px] font-bold text-slate-400 uppercase">Por entrega</span>
          </div>
        </Card>
      </div>

      {/* TABELA PRINCIPAL */}
      <Card className="overflow-hidden border-slate-200 shadow-xl bg-white" noPadding>
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-primary rounded-full" />
            <div>
              <h3 className="font-black text-slate-900 uppercase italic tracking-tighter text-sm">Relação de Acertos</h3>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{filteredData.length} entregadores encontrados</p>
            </div>
          </div>
          
          <div className="relative w-full md:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar entregador..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-widest focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest italic w-12">#</th>
                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest italic">Entregador</th>
                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest italic text-center">Entregas</th>
                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest italic">Dinheiro</th>
                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest italic">Cartão</th>
                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest italic">PIX</th>
                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest italic text-orange-400">Repasse</th>
                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest italic bg-slate-800">Líquido Loja</th>
                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest italic text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={9} className="px-4 py-6 h-14 bg-slate-50" />
                  </tr>
                ))
              ) : filteredData.length > 0 ? filteredData.map((settlement, idx) => (
                <React.Fragment key={settlement.driverId}>
                  <tr className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-4 py-4">
                      <span className="text-[9px] font-black text-slate-300">{String(idx + 1).padStart(2, '0')}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-primary group-hover:text-white transition-all">
                          <User size={16} />
                        </div>
                        <div>
                          <span className="font-black text-xs text-slate-900 uppercase italic tracking-tighter block">
                            {settlement.driverName}
                          </span>
                          <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">ID: {settlement.driverId.slice(0, 8)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-[10px] font-black">
                        {settlement.totalOrders}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="text-emerald-600 font-black text-xs italic tracking-tighter">{formatCurrency(settlement.cash)}</span>
                        <span className="text-[6px] font-bold text-slate-400 uppercase tracking-widest">Na mão</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="text-slate-600 font-black text-xs italic tracking-tighter">{formatCurrency(settlement.card)}</span>
                        <span className="text-[6px] font-bold text-slate-400 uppercase tracking-widest">Machine</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="text-emerald-600 font-black text-xs italic tracking-tighter">{formatCurrency(settlement.pix)}</span>
                        <span className="text-[6px] font-bold text-slate-400 uppercase tracking-widest">Transfer</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-primary font-black text-xs italic tracking-tighter">{formatCurrency(settlement.totalToPay)}</span>
                    </td>
                    <td className="px-4 py-4 bg-slate-50/50">
                      <div className="flex flex-col">
                        <span className={cn("font-black text-xs italic tracking-tighter", settlement.storeNet >= 0 ? "text-emerald-600" : "text-rose-600")}>
                          {formatCurrency(settlement.storeNet)}
                        </span>
                        <span className="text-[6px] font-bold text-slate-400 uppercase tracking-widest">
                          {settlement.totalOrders > 0 ? `R$ ${(settlement.storeNet / settlement.totalOrders).toFixed(2)}/ent` : '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end items-center gap-2">
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="h-8 px-3 rounded-lg text-[8px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all gap-1"
                          onClick={() => handlePaySettlement(settlement)}
                        >
                          <CheckCircle size={12} /> LIQUIDAR
                        </Button>
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              )) : (
                <tr>
                  <td colSpan={9} className="px-4 py-20 text-center">
                    <div className="flex flex-col items-center opacity-20">
                      <Truck size={48} className="mb-3" />
                      <p className="text-[10px] font-black uppercase tracking-[0.3em]">Nenhum acerto pendente</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Para o período selecionado</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
            {filteredData.length > 0 && (
              <tfoot className="bg-slate-100 font-black border-t border-slate-200">
                <tr>
                  <td className="px-4 py-3 text-[9px] uppercase tracking-widest text-slate-500" colSpan={2}>TOTAL PERÍODO</td>
                  <td className="px-4 py-3 text-center text-slate-700">{totals.orders}</td>
                  <td className="px-4 py-3 text-emerald-600">{formatCurrency(totals.cash)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatCurrency(totals.card)}</td>
                  <td className="px-4 py-3 text-emerald-600">{formatCurrency(totals.pix)}</td>
                  <td className="px-4 py-3 text-primary">{formatCurrency(totals.toPay)}</td>
                  <td className="px-4 py-3 text-slate-700 bg-slate-200">{formatCurrency(totals.net)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-[8px] font-black uppercase tracking-widest gap-1.5 border-slate-300 hover:bg-slate-800 hover:text-white"
                      onClick={() => handleExportAll()}
                      disabled={filteredData.length === 0}
                    >
                      <FileDown size={12} /> EXPORTAR
                    </Button>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
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
            Última atualização: {format(new Date(), "'às' HH:mm:ss", { locale: ptBR })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
            Sincronizado com Fluxo de Caixa
          </span>
        </div>
      </div>

      <ConfirmDialog 
        isOpen={confirmData.open} 
        onClose={() => setConfirmData(prev => ({...prev, open: false}))} 
        onConfirm={() => { confirmData.onConfirm(); setConfirmData(prev => ({...prev, open: false})); }} 
        title={confirmData.title} 
        message={confirmData.message} 
      />
    </div>
  );
};

export default DriverSettlement;
