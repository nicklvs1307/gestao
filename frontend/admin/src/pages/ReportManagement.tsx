import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  api,
  getReportsSummary, 
  getSalesHistory, 
  getTopProducts, 
  getPaymentMethodsReport 
} from '../services/api';
import StaffPerformance from '../components/StaffPerformance';
import DreManagement from '../components/DreManagement';
import SalesMap from './SalesMap';
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
  MapPin,
  ChevronLeft,
  ChevronRight,
  Printer,
  Download,
  PieChart,
  History,
  ClipboardList
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
  Filler
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { cn } from '../lib/utils';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// --- VIEW: CURVA ABC (ITENS) ---
const AbcAnalysisView: React.FC = () => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/admin/reports/abc-analysis').then(res => {
            setData(res.data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    if (loading) return <div className="p-20 text-center flex flex-col items-center gap-4 opacity-30"><Loader2 className="animate-spin text-orange-500" size={40} /><p className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Analisando Performance...</p></div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <Card className="p-8 border-slate-100 shadow-sm flex justify-between items-center bg-white">
                <div>
                    <h3 className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter leading-none mb-2">Curva ABC de Produtos</h3>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Identifique seus itens mais lucrativos</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="rounded-xl bg-white border-slate-200 text-slate-400"><Printer size={16} /></Button>
                    <Button variant="outline" size="sm" className="rounded-xl bg-white border-slate-200 text-slate-400"><Download size={16} /></Button>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {[
                    { c: 'A', label: 'Carros-chefe', color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', icon: TrendingUp },
                    { c: 'B', label: 'Intermediários', color: 'orange', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-100', icon: TrendingUp },
                    { c: 'C', label: 'Baixo Giro', color: 'slate', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-100', icon: TrendingUp },
                ].map(classe => {
                    const classProducts = data?.products?.filter((p: any) => p.classification === classe.c) || [];
                    const revenue = classProducts.reduce((sum: number, p: any) => sum + p.totalRevenue, 0);
                    return (
                        <Card key={classe.c} className={cn("p-8 border-2 relative overflow-hidden group hover:shadow-2xl transition-all duration-300", classe.bg, classe.border)} noPadding>
                            <div className="p-8 relative z-10">
                                <div className="flex justify-between items-start mb-6">
                                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg", classe.bg.replace('bg-', 'bg-').replace('-50', '-500'), "text-white")}>
                                        <classe.icon size={24} />
                                    </div>
                                    <span className={cn("text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border", classe.text, classe.border)}>Classe {classe.c}</span>
                                </div>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{classe.label}</p>
                                <h4 className={cn("text-3xl font-black italic tracking-tighter", classe.text)}>R$ {revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
                                <div className="mt-6 pt-6 border-t border-black/5 flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">{classProducts.length} Produtos</span>
                                    <span className="text-[10px] font-black text-slate-900">{((revenue / (data?.totalRevenue || 1)) * 100).toFixed(1)}% do Total</span>
                                </div>
                            </div>
                            <div className="absolute -right-6 -bottom-6 text-[120px] font-black opacity-[0.03] italic">{classe.c}</div>
                        </Card>
                    );
                })}
            </div>

            <Card className="p-0 overflow-hidden border-slate-200 shadow-xl bg-white">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h4 className="font-black text-slate-900 uppercase italic text-xs tracking-widest flex items-center gap-2">
                        <ClipboardList size={16} className="text-orange-500" /> Detalhamento por Item
                    </h4>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 bg-slate-50/30">
                                <th className="px-8 py-4">Ranking</th>
                                <th className="px-8 py-4">Produto / Categoria</th>
                                <th className="px-8 py-4 text-center">Classificação</th>
                                <th className="px-8 py-4 text-right">Qtd. Vendida</th>
                                <th className="px-8 py-4 text-right">Faturamento</th>
                                <th className="px-8 py-4 text-right">Relevância</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-slate-900">
                            {data?.products.map((p: any, idx: number) => (
                                <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-8 py-5 font-black text-slate-200 italic text-xl group-hover:text-orange-500 transition-colors">0{idx + 1}</td>
                                    <td className="px-8 py-5 font-black text-xs text-slate-900 uppercase italic tracking-tight">{p.name}</td>
                                    <td className="px-8 py-5 text-center">
                                        <span className={cn(
                                            "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm border",
                                            p.classification === 'A' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : 
                                            p.classification === 'B' ? "bg-orange-50 text-orange-600 border-orange-100" : 
                                            "bg-slate-50 text-slate-400 border-slate-100"
                                        )}>{p.classification}</span>
                                    </td>
                                    <td className="px-8 py-5 text-right font-bold text-slate-500">{p.totalQty}</td>
                                    <td className="px-8 py-5 text-right font-black text-slate-900 italic tracking-tighter">R$ {p.totalRevenue.toFixed(2).replace('.', ',')}</td>
                                    <td className="px-8 py-5 text-right w-48">
                                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200 shadow-inner">
                                            <div className={cn(
                                                "h-full transition-all duration-1000",
                                                p.classification === 'A' ? "bg-emerald-500" : p.classification === 'B' ? "bg-orange-500" : "bg-slate-400"
                                            )} style={{ width: `${p.accumulatedPercentage}%` }} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

// --- VIEW: HEATMAP ENTREGAS ---
const DeliveryAreaReportView: React.FC = () => {
    const [stats, setStats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/admin/reports/delivery-area-stats').then(res => {
            setStats(res.data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    if (loading) return <div className="p-20 text-center opacity-30"><Loader2 className="animate-spin text-orange-500 mx-auto" /></div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <Card className="p-8 border-slate-100 bg-white flex justify-between items-center">
                <div>
                    <h3 className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter leading-none mb-2">Desempenho por Bairro</h3>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Onde estão seus clientes mais fiéis?</p>
                </div>
                <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl shadow-lg shadow-blue-100"><MapPin size={28} /></div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.slice(0, 4).map((s, i) => (
                    <Card key={i} className="p-6 border-blue-50 bg-white group hover:border-blue-500/20 transition-all">
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Top {i+1} Área
                        </p>
                        <h4 className="text-lg font-black text-slate-900 uppercase italic truncate leading-none">{s.name}</h4>
                        <div className="mt-4 flex items-baseline gap-2">
                            <span className="text-3xl font-black text-blue-600 tracking-tighter">{s.count}</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pedidos</span>
                        </div>
                    </Card>
                ))}
            </div>

            <Card className="p-0 overflow-hidden border-slate-200 shadow-xl bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 bg-slate-50/30">
                                <th className="px-8 py-4">Bairro / Região</th>
                                <th className="px-8 py-4 text-center">Volume Total</th>
                                <th className="px-8 py-4 text-right">Taxas Geradas</th>
                                <th className="px-8 py-4 text-right">Impacto no Faturamento</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-slate-900">
                            {stats.map((s: any, idx: number) => {
                                const totalOrders = stats.reduce((acc, curr) => acc + curr.count, 0);
                                const relevancy = (s.count / totalOrders) * 100;
                                return (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-8 py-5 font-black text-slate-900 uppercase italic text-xs tracking-tight">{s.name}</td>
                                        <td className="px-8 py-5 text-center font-bold text-slate-600">{s.count} pedidos</td>
                                        <td className="px-8 py-5 text-right font-black text-emerald-600 italic tracking-tighter">R$ {s.totalFees.toFixed(2)}</td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex items-center justify-end gap-3 font-black text-blue-500 italic">
                                                {relevancy.toFixed(1)}%
                                                <div className="w-20 bg-slate-100 h-1 rounded-full overflow-hidden">
                                                    <div className="bg-blue-500 h-full" style={{ width: `${relevancy}%` }} />
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

const ReportManagement: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
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
          } catch (error) { console.error(error); }
          finally { setIsLoading(false); }
        };
        fetchAllData();
    } else { setIsLoading(false); }
  }, [location.pathname]);

  // --- Roteador Interno ---
  if (location.pathname.includes('/reports/staff')) return <StaffPerformance />;
  if (location.pathname.includes('/reports/dre')) return <DreManagement />;
  if (location.pathname.includes('/reports/sales-map')) return <SalesMap />;
  if (location.pathname.includes('/reports/items')) return <AbcAnalysisView />;
  if (location.pathname.includes('/reports/delivery-areas')) return <DeliveryAreaReportView />;
  
  if (location.pathname !== '/reports' && location.pathname !== '/reports/') {
      return (
          <div className="p-12 flex flex-col items-center justify-center min-h-[60vh] bg-white rounded-[3rem] border-2 border-dashed border-slate-100 animate-in fade-in zoom-in-95">
              <div className="p-6 bg-orange-50 text-orange-500 rounded-3xl mb-6 shadow-xl shadow-orange-100"><AlertCircle size={48} /></div>
              <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900 mb-2">Relatório em Formatação</h2>
              <p className="text-slate-500 font-medium text-center max-w-md">Estamos otimizando a visualização deste relatório detalhado para o novo padrão premium.</p>
              <Button onClick={() => navigate('/reports')} className="mt-8 px-10 italic">VOLTAR PARA CENTRAL</Button>
          </div>
      );
  }

  if (isLoading) return <div className="flex flex-col h-[60vh] items-center justify-center opacity-30 gap-4"><Loader2 className="animate-spin text-orange-500" size={40} /><span className="text-[10px] font-black uppercase tracking-widest">Compilando Relatórios...</span></div>;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 10, weight: 'bold' as const }, color: '#94a3b8' } },
      x: { grid: { display: false }, ticks: { font: { size: 10, weight: 'bold' as const }, color: '#94a3b8' } }
    }
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-700">
      {/* Header Central de Inteligência */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-xl shadow-slate-200"><BarChart3 size={24} /></div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">Central de Inteligência</h2>
            <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest mt-1">Dados e performance do seu negócio em tempo real</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
                <Calendar size={14} className="text-orange-500" />
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Últimos 30 Dias</span>
            </div>
            <Button variant="outline" size="icon" className="w-10 h-10 rounded-xl bg-white border-slate-200 text-slate-400"><Download size={16}/></Button>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 border-slate-100 bg-white group hover:border-orange-500/20 transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg"><ShoppingBag size={20} /></div>
            <div className="text-emerald-500 flex items-center gap-1 text-[10px] font-black italic tracking-tighter uppercase"><ArrowUpRight size={12}/> +15%</div>
          </div>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Volume de Pedidos</p>
          <h3 className="text-3xl font-black italic tracking-tighter text-slate-900">{summary?.totalOrders || 0}</h3>
        </Card>

        <Card className="p-6 border-slate-100 bg-white group hover:border-emerald-500/20 transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-100"><DollarSign size={20} /></div>
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 italic">Meta Diária: R$ 5k</span>
          </div>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Faturamento Bruto</p>
          <h3 className="text-3xl font-black italic tracking-tighter text-slate-900">R$ {(summary?.totalRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
        </Card>

        <Card className="p-6 border-orange-100 bg-orange-50/20 group hover:bg-white transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-orange-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-orange-100"><TrendingUp size={20} /></div>
            <span className="text-[9px] font-black uppercase tracking-widest text-orange-600">Ticket Médio</span>
          </div>
          <p className="text-[9px] font-black uppercase tracking-widest text-orange-400 mb-0.5">Média por Cliente</p>
          <h3 className="text-3xl font-black italic tracking-tighter text-orange-900">R$ {(summary?.totalRevenue / (summary?.totalOrders || 1)).toFixed(2).replace('.', ',')}</h3>
        </Card>
      </div>

      {/* Gráficos em Cards Master */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-8 p-8 bg-white border-slate-100 shadow-lg">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-2"><div className="w-1 h-4 bg-orange-500 rounded-full shadow-lg shadow-orange-500/30"/><h4 className="text-xs font-black uppercase italic tracking-tighter text-slate-900">Histórico de Performance</h4></div>
          </div>
          <div className="h-[300px] w-full">
            <Line 
                data={{
                    labels: salesHistory.map(d => new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })),
                    datasets: [{
                        label: 'Vendas',
                        data: salesHistory.map(d => d.amount),
                        borderColor: '#f97316',
                        backgroundColor: 'rgba(249, 115, 22, 0.05)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 4,
                        pointRadius: 4,
                        pointBackgroundColor: '#fff',
                        pointBorderColor: '#f97316',
                        pointBorderWidth: 2,
                    }]
                }} 
                options={chartOptions} 
            />
          </div>
        </Card>

        <Card className="lg:col-span-4 p-10 bg-white border-slate-100 shadow-xl flex flex-col h-full">
          <div className="flex items-center gap-3 mb-10"><div className="w-1.5 h-5 bg-blue-500 rounded-full shadow-lg shadow-blue-500/30"/><h4 className="text-sm font-black uppercase italic tracking-tighter text-slate-900">Mais Vendidos</h4></div>
          <div className="space-y-6 flex-1">
              {topProducts.slice(0, 5).map((p, i) => (
                  <div key={i} className="space-y-2 group cursor-default">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-900 transition-colors">
                          <span className="italic">#{i+1} {p.name}</span>
                          <span className="font-black italic text-slate-900">{p.quantity} un</span>
                      </div>
                      <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden border border-slate-100 shadow-inner">
                          <div className="bg-slate-900 h-full transition-all duration-1000 group-hover:bg-orange-500" style={{ width: `${(p.quantity / (topProducts[0]?.quantity || 1)) * 100}%` }} />
                      </div>
                  </div>
              ))}
          </div>
          <Button variant="ghost" fullWidth onClick={() => navigate('/reports/items')} className="mt-8 h-12 rounded-xl text-[9px] uppercase tracking-widest text-orange-600 hover:bg-orange-50">Análise Completa ABC</Button>
        </Card>

        {/* Métodos de Pagamento e Botões de Acesso Rápido */}
        <Card className="lg:col-span-12 p-8 border-slate-100 bg-slate-50/50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Atalhos de Inteligência</h4>
                    <div className="flex flex-wrap gap-3">
                        {[
                            { label: 'DRE Gerencial', path: '/reports/dre', icon: Calculator },
                            { label: 'Mapa Geográfico', path: '/reports/sales-map', icon: MapPin },
                            { label: 'Mapa de Calor', path: '/reports/delivery-areas', icon: MapPin },
                            { label: 'Equipe & Comissão', path: '/reports/staff', icon: User },
                            { label: 'Consumo Detalhado', path: '/reports/consumed-items', icon: History }
                        ].map((btn, i) => (
                            <Button key={i} variant="outline" className="bg-white rounded-2xl h-14 px-6 border-slate-200 hover:border-orange-500/20 group" onClick={() => navigate(btn.path)}>
                                <btn.icon size={18} className="text-slate-400 group-hover:text-orange-500 transition-colors mr-2" />
                                <span className="text-[10px] font-black uppercase tracking-widest">{btn.label}</span>
                            </Button>
                        ))}
                    </div>
                </div>
                
                <div className="flex-1 max-w-md w-full">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 ml-2">Mix de Recebimento</h4>
                    <div className="grid grid-cols-2 gap-3">
                        {paymentMethods.map((pm, i) => (
                            <div key={i} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                                <span className="text-[9px] font-black text-slate-400 uppercase italic truncate max-w-[80px]">{pm.method}</span>
                                <span className="text-[11px] font-black text-emerald-600 italic">R$ {pm.total.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Card>
      </div>
    </div>
  );
};

export default ReportManagement;