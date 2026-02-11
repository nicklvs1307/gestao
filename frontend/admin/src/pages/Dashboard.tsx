import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getReportsSummary, getAdminOrders, getSalesHistory, getPaymentMethodsReport, api } from '../services/api';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { 
  ArrowRight, 
  DollarSign, 
  Clock, 
  LayoutDashboard, 
  CheckCircle, 
  TrendingUp, 
  ShoppingBag, 
  ChefHat, 
  Target, 
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [salesHistory, setSalesHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    if (user?.isSuperAdmin && !localStorage.getItem('selectedRestaurantId')) {
        navigate('/super-admin');
        return;
    }
    try {
      setLoading(true);
      const [summaryData, ordersData, historyData, paymentsData, categoriesData] = await Promise.all([
        getReportsSummary(),
        getAdminOrders(),
        getSalesHistory(),
        getPaymentMethodsReport(),
        api.get('/categories/flat').catch(() => ({ data: [] })),
      ]);
      
      const safeOrders = Array.isArray(ordersData) ? ordersData : [];
      const safeHistory = Array.isArray(historyData) ? historyData : [];
      const safePayments = Array.isArray(paymentsData) ? paymentsData : [];
      const safeCategories = Array.isArray(categoriesData?.data) ? categoriesData.data : [];
      const safeSummary = summaryData || { totalRevenue: 0, totalOrders: 0, activeProducts: 0 };

      setStats({
        ordersToday: safeOrders.filter((order: any) => order.createdAt?.startsWith(new Date().toISOString().split('T')[0])).length,
        revenueToday: safeSummary.totalRevenue || 0,
        activeProducts: safeSummary.activeProducts || 0,
        totalOrders: safeSummary.totalOrders || 0,
        ticketMedio: (safeSummary.totalOrders || 0) > 0 ? (safeSummary.totalRevenue || 0) / safeSummary.totalOrders : 0,
        preparing: safeOrders.filter((o: any) => o.status === 'PREPARING').length,
        hasCategories: safeCategories.length > 0,
        hasProducts: (safeSummary.activeProducts || 0) > 0,
        hasPayments: safePayments.length > 0
      });
      setRecentOrders(safeOrders.slice(0, 6));
      setSalesHistory(safeHistory.slice(-7));
      setError(null);
    } catch (err) {
      setError('Falha ao carregar os dados do dashboard.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">Sincronizando dados...</p>
        </div>
    );
  }

  if (error) {
    return (
        <Card className="p-8 border-red-100 bg-red-50/50 flex flex-col items-center text-center">
            <AlertCircle size={40} className="text-red-500 mb-4" />
            <h3 className="text-red-900 font-black uppercase italic tracking-tighter">Ocorreu um erro</h3>
            <p className="text-red-600 text-sm mt-2">{error}</p>
            <Button variant="danger" className="mt-6" onClick={() => window.location.reload()}>Tentar Novamente</Button>
        </Card>
    );
  }

  const isConfigComplete = stats?.hasCategories && stats?.hasProducts && stats?.hasPayments;

  const chartData = {
    labels: salesHistory.length > 0 ? salesHistory.map(d => new Date(d.date).toLocaleDateString('pt-BR', { weekday: 'short' })) : ['-'],
    datasets: [
      {
        label: 'Faturamento',
        data: salesHistory.length > 0 ? salesHistory.map(d => d.amount) : [0],
        fill: true,
        backgroundColor: 'rgba(249, 115, 22, 0.05)',
        borderColor: '#f97316',
        borderWidth: 3,
        tension: 0.4,
        pointBackgroundColor: '#f97316',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { size: 12, weight: 'bold' as const },
        bodyFont: { size: 14, weight: '900' as const },
        padding: 12,
        cornerRadius: 12,
        displayColors: false,
        callbacks: {
            label: (context: any) => ` R$ ${context.parsed.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        }
      }
    },
    scales: {
      y: {
        grid: { color: '#f1f5f9', drawBorder: false },
        ticks: { 
            color: '#94a3b8', 
            font: { size: 10, weight: 'bold' as const },
            callback: (val: any) => `R$ ${val}`
        }
      },
      x: {
        grid: { display: false },
        ticks: { color: '#94a3b8', font: { size: 10, weight: 'bold' as const } }
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10">
      
      {/* Header do Dashboard */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Visão Geral</h1>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
                  <Clock size={14} className="text-orange-500" /> Atualizado em tempo real
              </p>
          </div>
          <div className="flex gap-3">
              <Button variant="outline" size="sm" className="bg-white" onClick={() => window.location.reload()}>
                  Atualizar
              </Button>
              <Button size="sm" onClick={() => navigate('/orders')}>
                  Monitor de Pedidos
              </Button>
          </div>
      </div>

      {/* Guia de Onboarding Premium */}
      {!isConfigComplete && (
          <Card className="bg-slate-900 border-none p-8 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
              <div className="relative z-10 flex flex-col lg:flex-row gap-10 items-center">
                  <div className="flex-1 text-center lg:text-left">
                      <span className="bg-orange-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest mb-4 inline-block">Configuração Pendente</span>
                      <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-3">Vamos turbinar sua loja?</h2>
                      <p className="text-slate-400 text-sm font-medium max-w-md">Complete os passos abaixo para ativar seu cardápio e começar a faturar.</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full lg:w-auto">
                      {[
                          { label: 'Menu', done: stats.hasCategories, path: '/categories', icon: LayoutDashboard },
                          { label: 'Itens', done: stats.hasProducts, path: '/products', icon: ShoppingBag },
                          { label: 'Caixa', done: stats.hasPayments, path: '/payment-methods', icon: DollarSign },
                          { label: 'Loja', done: true, path: '/settings', icon: Target },
                      ].map((step, i) => (
                          <Card 
                            key={i}
                            onClick={() => navigate(step.path)}
                            className={cn(
                                "p-5 border-2 transition-all flex flex-col items-center text-center gap-3 cursor-pointer group",
                                step.done 
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" 
                                    : "bg-white/5 border-white/10 text-slate-500 hover:border-orange-500/50"
                            )}
                          >
                              {step.done ? <CheckCircle size={24} /> : <step.icon size={24} className="group-hover:text-orange-500" />}
                              <p className="text-[10px] font-black uppercase tracking-widest">{step.label}</p>
                          </Card>
                      ))}
                  </div>
              </div>
          </Card>
      )}

      {/* Grid de Métricas Master */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
            { label: 'Pedidos Hoje', value: stats?.ordersToday, icon: ShoppingBag, color: 'blue', sub: 'Pedidos realizados' },
            { label: 'Em Preparo', value: stats?.preparing, icon: ChefHat, color: 'orange', sub: 'Na cozinha agora' },
            { label: 'Faturamento', value: `R$ ${stats?.revenueToday?.toFixed(2)}`, icon: DollarSign, color: 'emerald', sub: 'Total do dia' },
            { label: 'Ticket Médio', value: `R$ ${stats?.ticketMedio?.toFixed(2)}`, icon: TrendingUp, color: 'purple', sub: 'Valor por pedido' },
        ].map((item, i) => (
            <Card key={i} className="p-6 group hover:border-orange-500/20 transition-all duration-300">
                <div className="flex justify-between items-start mb-4">
                    <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110",
                        item.color === 'blue' ? "bg-blue-500 text-white shadow-blue-200" :
                        item.color === 'orange' ? "bg-orange-500 text-white shadow-orange-200" :
                        item.color === 'emerald' ? "bg-emerald-500 text-white shadow-emerald-200" :
                        "bg-purple-500 text-white shadow-purple-200"
                    )}>
                        <item.icon size={22} />
                    </div>
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{item.sub}</span>
                </div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{item.label}</p>
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic">{item.value}</h3>
            </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Gráfico de Vendas */}
        <Card className="lg:col-span-2 p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
                <h3 className="font-black text-slate-900 text-lg italic uppercase tracking-tighter leading-none">Faturamento Semanal</h3>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Desempenho dos últimos 7 dias</p>
            </div>
            <Button variant="ghost" size="sm" className="text-orange-600" onClick={() => navigate('/reports')}>
                Ver Detalhes <ChevronRight size={16} />
            </Button>
          </div>
          <div className="h-[320px] w-full">
            <Line data={chartData} options={chartOptions} />
          </div>
        </Card>

        {/* Lista de Pedidos Recentes */}
        <Card className="flex flex-col overflow-hidden p-0">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
                <h3 className="font-black text-slate-900 text-base italic uppercase tracking-tighter leading-none">Últimos Pedidos</h3>
                <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest mt-1">Atividade recente</p>
            </div>
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate('/orders')}>
                <ArrowRight size={18} />
            </Button>
          </div>
          <div className="overflow-auto flex-1">
            <table className="w-full text-left">
              <tbody className="divide-y divide-slate-50 text-slate-900">
                {recentOrders.length > 0 ? (
                  recentOrders.map(order => (
                    <tr key={order.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => navigate('/orders')}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "w-2 h-2 rounded-full",
                                order.status === 'PENDING' ? "bg-orange-500 animate-pulse" : "bg-emerald-500"
                            )} />
                            <div>
                                <span className="block text-xs font-black uppercase italic tracking-tighter">#{order.id.slice(-4)}</span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase">Mesa {order.tableNumber || 'Delivery'}</span>
                            </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-black text-sm italic text-slate-900">R$ {order.total?.toFixed(2).replace('.', ',')}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                         <div className="w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-orange-500 group-hover:border-orange-100 transition-all">
                            <ChevronRight size={16} />
                         </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-slate-300 italic text-xs uppercase font-bold tracking-widest">Nenhum pedido recente</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {recentOrders.length > 0 && (
              <div className="p-4 bg-slate-50/50 border-t border-slate-100 text-center">
                  <button onClick={() => navigate('/orders')} className="text-[10px] font-black text-orange-600 uppercase tracking-widest hover:underline">
                      Ver histórico completo
                  </button>
              </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
