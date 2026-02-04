import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  api,
  getReportsSummary, 
  getSalesHistory, 
  getTopProducts, 
  getPaymentMethodsReport 
} from '../services/api';
import StaffPerformance from '../components/StaffPerformance';
import DreManagement from '../components/DreManagement';
import { 
  BarChart3, 
  TrendingUp, 
  Package, 
  CreditCard, 
  Loader2,
  Calendar,
  ArrowUpRight,
  ShoppingBag,
  DollarSign,
  Utensils,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { cn } from '../lib/utils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// --- Subcomponente: Curva ABC ---
const AbcAnalysisView: React.FC = () => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/admin/reports/abc-analysis').then(res => {
            setData(res.data);
            setLoading(false);
        }).catch(err => {
            console.error(err);
            setLoading(false);
        });
    }, []);

    if (loading) return (
        <div className="p-20 text-center flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-orange-500" size={40} />
            <p className="font-black text-slate-300 uppercase tracking-widest text-xs">Calculando Inteligência ABC...</p>
        </div>
    );

    if (!data) return <div className="p-20 text-center text-slate-400 font-bold uppercase">Sem dados para análise no período.</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <h3 className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter mb-2">Análise de Faturamento (ABC)</h3>
                <p className="text-slate-500 text-sm font-medium">Classificação baseada no faturamento acumulado dos últimos 30 dias.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {['A', 'B', 'C'].map(classe => {
                    const classProducts = data.products.filter((p: any) => p.classification === classe);
                    const count = classProducts.length;
                    const revenue = classProducts.reduce((sum: number, p: any) => sum + p.totalRevenue, 0);
                    return (
                        <div key={classe} className={cn(
                            "p-8 rounded-[2rem] border shadow-sm relative overflow-hidden transition-all hover:scale-[1.02]",
                            classe === 'A' ? "bg-emerald-50 border-emerald-100" : classe === 'B' ? "bg-amber-50 border-amber-100" : "bg-slate-50 border-slate-100"
                        )}>
                            <div className="absolute -right-4 -bottom-4 text-8xl font-black opacity-10 uppercase">{classe}</div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Classe {classe}</p>
                            <h4 className={cn(
                                "text-3xl font-black italic",
                                classe === 'A' ? "text-emerald-700" : classe === 'B' ? "text-amber-700" : "text-slate-700"
                            )}>R$ {revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
                            <div className="mt-4 flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-500 uppercase">{count} Itens</span>
                                <div className="w-1 h-1 rounded-full bg-slate-300" />
                                <span className="text-xs font-black text-slate-900">{((revenue / (data.totalRevenue || 1)) * 100).toFixed(1)}% da Receita</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 bg-slate-50/50 border-b border-slate-100">
                    <h4 className="font-black text-slate-900 uppercase italic text-xs tracking-widest">Ranking de Performance por Item</h4>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                                <th className="px-8 py-4">Rank</th>
                                <th className="px-8 py-4">Produto</th>
                                <th className="px-8 py-4 text-center">Classe</th>
                                <th className="px-8 py-4 text-right">Vendas</th>
                                <th className="px-8 py-4 text-right">Total (R$)</th>
                                <th className="px-8 py-4 text-right">% Acumulada</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {data.products.map((p: any, idx: number) => (
                                <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-8 py-5 font-black text-slate-300 italic group-hover:text-primary">#{idx + 1}</td>
                                    <td className="px-8 py-5 font-black text-slate-900 uppercase text-xs tracking-tight">{p.name}</td>
                                    <td className="px-8 py-5 text-center">
                                        <span className={cn(
                                            "px-3 py-1 rounded-lg text-[10px] font-black uppercase shadow-sm",
                                            p.classification === 'A' ? "bg-emerald-500 text-white" : 
                                            p.classification === 'B' ? "bg-amber-500 text-white" : 
                                            "bg-slate-200 text-slate-600"
                                        )}>{p.classification}</span>
                                    </td>
                                    <td className="px-8 py-5 text-right font-bold text-slate-500">{p.totalQty}</td>
                                    <td className="px-8 py-5 text-right font-black text-slate-900 italic">R$ {p.totalRevenue.toFixed(2)}</td>
                                    <td className="px-8 py-5 text-right w-48">
                                        <div className="flex flex-col items-end gap-1">
                                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200 shadow-inner">
                                                <div className={cn(
                                                    "h-full transition-all duration-1000",
                                                    p.classification === 'A' ? "bg-emerald-500" : p.classification === 'B' ? "bg-amber-500" : "bg-slate-400"
                                                )} style={{ width: `${p.accumulatedPercentage}%` }} />
                                            </div>
                                            <span className="text-[9px] font-black text-slate-400">{p.accumulatedPercentage.toFixed(1)}%</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// --- Subcomponente: Faturamento Detalhado ---
const BillingReportView: React.FC = () => {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getSalesHistory().then(res => {
            setHistory(res);
            setLoading(false);
        });
    }, []);

    if (loading) return <div className="p-20 text-center animate-pulse font-black text-slate-300">Carregando Fluxo de Faturamento...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <h3 className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter mb-2">Faturamento Diário</h3>
                <p className="text-slate-500 text-sm font-medium">Histórico de vendas consolidadas dos últimos dias.</p>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                            <th className="px-8 py-4">Data</th>
                            <th className="px-8 py-4 text-right">Total Vendido</th>
                            <th className="px-8 py-4">Performance</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {history.map((d: any, idx: number) => {
                            const max = Math.max(...history.map(h => h.amount));
                            const percent = (d.amount / (max || 1)) * 100;
                            return (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-8 py-5 font-bold text-slate-600">{new Date(d.date).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</td>
                                    <td className="px-8 py-5 text-right font-black text-slate-900 italic text-lg">R$ {d.amount.toFixed(2)}</td>
                                    <td className="px-8 py-5">
                                        <div className="w-full max-w-[200px] bg-slate-100 h-3 rounded-full overflow-hidden">
                                            <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${percent}%` }} />
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- Subcomponente: Áreas de Entrega ---
const DeliveryAreaReportView: React.FC = () => {
    const [stats, setStats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/admin/reports/delivery-area-stats').then(res => {
            setStats(res.data);
            setLoading(false);
        });
    }, []);

    if (loading) return <div className="p-20 text-center animate-pulse font-black text-slate-300">Analisando Rotas de Entrega...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex justify-between items-center">
                <div>
                    <h3 className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter mb-2">Mapa de Calor: Entregas</h3>
                    <p className="text-slate-500 text-sm font-medium">Bairros e áreas com maior volume de pedidos.</p>
                </div>
                <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
                    <MapPin size={24} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.slice(0, 4).map((s, i) => (
                    <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Top {i+1} Bairro</p>
                        <h4 className="text-lg font-black text-slate-900 uppercase truncate">{s.name}</h4>
                        <p className="text-2xl font-black text-blue-600 mt-2">{s.count} Pedidos</p>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                            <th className="px-8 py-4">Área / Bairro</th>
                            <th className="px-8 py-4 text-center">Volume</th>
                            <th className="px-8 py-4 text-right">Taxas Coletadas</th>
                            <th className="px-8 py-4 text-right">Relevância</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {stats.map((s: any, idx: number) => {
                            const totalOrders = stats.reduce((acc, curr) => acc + curr.count, 0);
                            const relevancy = (s.count / totalOrders) * 100;
                            return (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-8 py-5 font-black text-slate-900 uppercase text-xs">{s.name}</td>
                                    <td className="px-8 py-5 text-center font-bold text-slate-600">{s.count}</td>
                                    <td className="px-8 py-5 text-right font-bold text-emerald-600">R$ {s.totalFees.toFixed(2)}</td>
                                    <td className="px-8 py-5 text-right font-black text-blue-500 italic">{relevancy.toFixed(1)}%</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- Subcomponente: Pagamentos Detalhados ---
const PaymentsReportView: React.FC = () => {
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/admin/reports/detailed-payments').then(res => {
            setPayments(res.data);
            setLoading(false);
        });
    }, []);

    if (loading) return <div className="p-20 text-center animate-pulse font-black text-slate-300">Cruzando dados financeiros...</div>;

    const methodMap: any = { cash: 'Dinheiro', pix: 'Pix', credit_card: 'Cartão Crédito', debit_card: 'Cartão Débito', meal_voucher: 'Vale Refeição' };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <h3 className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter mb-2">Detalhamento de Recebíveis</h3>
                <p className="text-slate-500 text-sm font-medium">Lista cronológica de cada centavo que entrou no caixa.</p>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                            <th className="px-8 py-4">Data/Hora</th>
                            <th className="px-8 py-4">Origem</th>
                            <th className="px-8 py-4">Método</th>
                            <th className="px-8 py-4 text-right">Valor</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {payments.map((p: any) => (
                            <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-8 py-5 text-xs text-slate-500 font-medium">{new Date(p.createdAt).toLocaleString()}</td>
                                <td className="px-8 py-5">
                                    <span className="font-black text-slate-900 text-xs uppercase italic">
                                        {p.order.tableNumber ? `Mesa ${p.order.tableNumber}` : 'Delivery'}
                                    </span>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{p.order.customerName || 'Venda Direta'}</p>
                                </td>
                                <td className="px-8 py-5">
                                    <span className="bg-slate-100 px-3 py-1 rounded-lg text-[10px] font-black text-slate-600 uppercase tracking-widest border border-slate-200">
                                        {methodMap[p.method] || p.method.toUpperCase()}
                                    </span>
                                </td>
                                <td className="px-8 py-5 text-right font-black text-emerald-600 italic">R$ {p.amount.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- Subcomponente: Itens Consumidos ---
const ConsumedItemsReportView: React.FC = () => {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/admin/reports/consumed-items').then(res => {
            setItems(res.data);
            setLoading(false);
        });
    }, []);

    if (loading) return <div className="p-20 text-center animate-pulse font-black text-slate-300">Mapeando consumo detalhado...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex justify-between items-center">
                <div>
                    <h3 className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter mb-2">Relatório de Itens Vendidos</h3>
                    <p className="text-slate-500 text-sm font-medium">Cada item que saiu da sua cozinha ou bar.</p>
                </div>
                <div className="p-4 bg-orange-50 text-orange-600 rounded-2xl">
                    <Utensils size={24} />
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                            <th className="px-8 py-4">Item</th>
                            <th className="px-8 py-4">Categoria</th>
                            <th className="px-8 py-4 text-center">Pedido</th>
                            <th className="px-8 py-4 text-center">Qtd</th>
                            <th className="px-8 py-4 text-right">Preço Un.</th>
                            <th className="px-8 py-4 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {items.map((i: any) => (
                            <tr key={i.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-8 py-5 font-black text-slate-900 uppercase text-xs">{i.product.name}</td>
                                <td className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{i.product.category.name}</td>
                                <td className="px-8 py-5 text-center font-bold text-slate-500 text-xs">#{i.order.dailyOrderNumber}</td>
                                <td className="px-8 py-5 text-center font-black text-slate-900">{i.quantity}</td>
                                <td className="px-8 py-5 text-right font-medium text-slate-500 text-xs">R$ {i.priceAtTime.toFixed(2)}</td>
                                <td className="px-8 py-5 text-right font-black text-slate-900 italic">R$ {(i.priceAtTime * i.quantity).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const ReportManagement: React.FC = () => {
  const location = useLocation();
  const [summary, setSummary] = useState<any>(null);
  const [salesHistory, setSalesHistory] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (location.pathname === '/reports' || location.pathname === '/reports/') {
        const fetchAllData = async () => {
          try {
            setIsLoading(true);
            const [summaryData, salesData, topData, paymentData] = await Promise.all([
              getReportsSummary(),
              getSalesHistory(),
              getTopProducts(),
              getPaymentMethodsReport()
            ]);
            setSummary(summaryData);
            setSalesHistory(salesData);
            setTopProducts(topData);
            setPaymentMethods(paymentData);
          } catch (error) {
            console.error('Erro ao buscar dados do relatório:', error);
          } finally {
            setIsLoading(false);
          }
        };
        fetchAllData();
    } else {
        setIsLoading(false);
    }
  }, [location.pathname]);

  // --- Roteador Interno de Relatórios ---
  if (location.pathname.includes('/reports/staff')) return <StaffPerformance />;
  if (location.pathname.includes('/reports/dre')) return <DreManagement />;
  if (location.pathname.includes('/reports/items')) return <AbcAnalysisView />;
  if (location.pathname.includes('/reports/billing')) return <BillingReportView />;
  if (location.pathname.includes('/reports/delivery-areas')) return <DeliveryAreaReportView />;
  if (location.pathname.includes('/reports/payments')) return <PaymentsReportView />;
  if (location.pathname.includes('/reports/consumed-items')) return <ConsumedItemsReportView />;
  
  // Placeholder para outros relatórios
  if (location.pathname !== '/reports' && location.pathname !== '/reports/') {
      return (
          <div className="p-12 flex flex-col items-center justify-center min-h-[60vh] bg-white rounded-[3rem] border-2 border-dashed border-slate-100 animate-in fade-in zoom-in-95">
              <div className="p-6 bg-orange-50 text-orange-500 rounded-3xl mb-6 shadow-xl shadow-orange-100">
                  <AlertCircle size={48} />
              </div>
              <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900 mb-2">Visualização em Construção</h2>
              <p className="text-slate-500 font-medium text-center max-w-md">
                  O relatório <strong>{location.pathname.split('/').pop()?.toUpperCase()}</strong> já está coletando dados no servidor, mas estamos finalizando o design desta tabela detalhada.
              </p>
              <button onClick={() => window.history.back()} className="mt-8 px-8 py-3 bg-slate-900 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-orange-600 transition-all shadow-lg active:scale-95">Voltar para Central</button>
          </div>
      );
  }

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">Carregando Inteligência de Dados...</p>
        </div>
      </div>
    );
  }

  // Gráficos do Dashboard Geral
  const salesChartData = {
    labels: salesHistory.map(d => new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })),
    datasets: [{
        label: 'Vendas (R$)',
        data: salesHistory.map(d => d.amount),
        borderColor: '#f97316',
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
    }]
  };

  const productsChartData = {
    labels: topProducts.map(p => p.name),
    datasets: [{
        label: 'Quantidade Vendida',
        data: topProducts.map(p => p.quantity),
        backgroundColor: ['#0f172a', '#1e293b', '#334155', '#475569', '#64748b'],
        borderRadius: 8,
    }]
  };

  const paymentsChartData = {
    labels: paymentMethods.map(p => p.method === 'cash' ? 'Dinheiro' : p.method === 'pix' ? 'Pix' : p.method === 'credit_card' ? 'Cartão Créd.' : p.method === 'debit_card' ? 'Cartão Déb.' : p.method),
    datasets: [{
        data: paymentMethods.map(p => p.total),
        backgroundColor: ['#10b981', '#06b6d4', '#6366f1', '#8b5cf6', '#f43f5e'],
        borderWidth: 0,
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, grid: { display: false } },
      x: { grid: { display: false } }
    }
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase flex items-center gap-3">
            <BarChart3 className="text-orange-600" size={32} /> Central de Inteligência
          </h2>
          <p className="text-slate-500 font-medium mt-1">Análise de performance e resultados do seu negócio.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100">
          <Calendar size={18} className="text-slate-400" />
          <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Últimos 30 Dias</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 text-white/5 group-hover:scale-110 transition-transform"><ShoppingBag size={120} /></div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Total de Pedidos</p>
          <div className="flex items-end gap-3">
            <h3 className="text-5xl font-black tracking-tighter italic">{summary?.totalOrders || 0}</h3>
            <div className="mb-2 flex items-center gap-1 text-emerald-400 text-xs font-bold"><ArrowUpRight size={14} /> +12%</div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden group">
           <div className="absolute -right-4 -top-4 text-slate-50 group-hover:scale-110 transition-transform"><DollarSign size={120} /></div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Faturamento Bruto</p>
          <h3 className="text-4xl font-black text-slate-900 tracking-tighter italic">R$ {(summary?.totalRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
        </div>

        <div className="bg-orange-50 p-8 rounded-[2.5rem] shadow-sm border border-orange-100 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 text-orange-100/50 group-hover:scale-110 transition-transform"><Utensils size={120} /></div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600 mb-2">Destaque de Venda</p>
          <h3 className="text-2xl font-black text-orange-900 tracking-tight uppercase italic leading-tight truncate">{summary?.topProducts?.[0]?.name || 'Nenhum'}</h3>
          <p className="text-[10px] font-bold text-orange-600/60 mt-2 uppercase tracking-widest">{summary?.topProducts?.[0]?._sum?.quantity || 0} unidades vendidas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 lg:col-span-2">
          <h4 className="font-black text-slate-900 uppercase italic tracking-widest text-sm flex items-center gap-2 mb-8"><TrendingUp className="text-orange-600" size={20} /> Curva de Vendas Diária</h4>
          <div className="h-[350px] w-full"><Line data={salesChartData} options={chartOptions} /></div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <h4 className="font-black text-slate-900 uppercase italic tracking-widest text-sm flex items-center gap-2 mb-8"><Package className="text-blue-600" size={20} /> Top 5 Produtos</h4>
          <div className="h-[300px] w-full"><Bar data={productsChartData} options={chartOptions} /></div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 text-center flex flex-col items-center">
          <h4 className="font-black text-slate-900 uppercase italic tracking-widest text-sm flex items-center gap-2 mb-8 w-full text-left"><CreditCard className="text-emerald-600" size={20} /> Mix de Pagamentos</h4>
          <div className="h-[250px] w-[250px] mb-6"><Pie data={paymentsChartData} options={chartOptions} /></div>
          <div className="w-full grid grid-cols-2 gap-2">
              {paymentMethods.map((pm, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                      <span className="text-[10px] font-black text-slate-400 uppercase">{pm.method}</span>
                      <span className="text-[10px] font-black text-slate-900 italic">R$ {pm.total.toFixed(2)}</span>
                  </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportManagement;
