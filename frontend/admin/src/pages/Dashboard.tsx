import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getReportsSummary, getAdminOrders, getSalesHistory, getPaymentMethodsReport, api } from '../services/api';
import { Line, Bar, Pie } from 'react-chartjs-2';
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
import { Eye, ArrowRight, Share2, DollarSign, Clock, LayoutDashboard, ShoppingCart, Utensils, Truck, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

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

const Dashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [salesHistory, setSalesHistory] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [hourlySales, setHourlySales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    if (user?.isSuperAdmin && !localStorage.getItem('selectedRestaurantId')) {
        navigate('/super-admin');
        return;
    }
    try {
      setLoading(true);
      const [summaryData, ordersData, historyData, paymentsData, hourlyData] = await Promise.all([
        getReportsSummary(),
        getAdminOrders(),
        getSalesHistory(),
        getPaymentMethodsReport(),
        api.get('/admin/reports/hourly-sales')
      ]);
      
      setStats({
        ordersToday: ordersData.filter((order: any) => order.createdAt.startsWith(new Date().toISOString().split('T')[0])).length,
        revenueToday: summaryData.totalRevenue,
        activeProducts: summaryData.activeProducts,
        totalOrders: summaryData.totalOrders,
        ticketMedio: summaryData.totalOrders > 0 ? summaryData.totalRevenue / summaryData.totalOrders : 0,
        preparing: ordersData.filter((o: any) => o.status === 'PREPARING').length,
        channelStats: {
            delivery: ordersData.filter((o:any) => o.orderType === 'DELIVERY').length,
            table: ordersData.filter((o:any) => o.orderType === 'TABLE').length,
        }
      });
      setRecentOrders(ordersData.slice(0, 5));
      setSalesHistory(historyData.slice(-7));
      setPaymentMethods(paymentsData);
      setHourlySales(hourlyData.data);
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

  // --- RENDERS ESPECÍFICOS ---

  if (location.pathname.includes('/dashboard/channels')) {
      const channelData = {
          labels: ['Mesa', 'Delivery'],
          datasets: [{
              data: [stats?.channelStats?.table || 0, stats?.channelStats?.delivery || 0],
              backgroundColor: ['#f97316', '#0ea5e9'],
              borderWidth: 0
          }]
      };
      return (
          <div className="space-y-8 animate-in fade-in duration-500">
              <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-3">
                  <Share2 className="text-blue-500" size={32} /> Performance por Canais
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white p-12 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col items-center">
                      <h3 className="font-bold text-slate-700 mb-8 uppercase tracking-widest text-xs">Divisão de Volume</h3>
                      <div className="h-80 w-80"><Pie data={channelData} /></div>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-center">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pedidos em Mesas</p>
                          <h4 className="text-4xl font-black text-orange-500 italic">{stats?.channelStats?.table}</h4>
                          <p className="text-xs font-medium text-slate-500 mt-2">Corresponde a {((stats?.channelStats?.table / (stats?.totalOrders || 1)) * 100).toFixed(1)}% do seu movimento.</p>
                      </div>
                      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-center">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pedidos Delivery</p>
                          <h4 className="text-4xl font-black text-blue-500 italic">{stats?.channelStats?.delivery}</h4>
                          <p className="text-xs font-medium text-slate-500 mt-2">Corresponde a {((stats?.channelStats?.delivery / (stats?.totalOrders || 1)) * 100).toFixed(1)}% do seu movimento.</p>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  if (location.pathname.includes('/dashboard/billing')) {
      const billingChartData = {
          labels: paymentMethods.map(pm => pm.method),
          datasets: [{
              label: 'Total R$',
              data: paymentMethods.map(pm => pm.total),
              backgroundColor: '#10b981',
              borderRadius: 12
          }]
      };
      return (
          <div className="space-y-8 animate-in fade-in duration-500">
              <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-3">
                  <DollarSign className="text-emerald-500" size={32} /> Detalhamento Financeiro
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                      <h3 className="font-bold text-slate-700 mb-8 uppercase tracking-widest text-xs">Faturamento por Método</h3>
                      <div className="h-[400px]"><Bar data={billingChartData} options={{ responsive: true, maintainAspectRatio: false }} /></div>
                  </div>
                  <div className="space-y-4">
                      {paymentMethods.map((pm, idx) => (
                          <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
                              <span className="font-black text-slate-600 uppercase text-[10px] tracking-widest">{pm.method}</span>
                              <span className="font-black text-slate-900 italic text-lg">R$ {pm.total.toFixed(2)}</span>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      );
  }

  if (location.pathname.includes('/dashboard/hourly')) {
      const hourlyData = {
          labels: hourlySales.map(h => h.hour),
          datasets: [{
              label: 'Volume de Pedidos',
              data: hourlySales.map(h => h.count),
              backgroundColor: '#f97316',
              borderRadius: 4
          }]
      };
      return (
          <div className="space-y-8 animate-in fade-in duration-500">
              <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-3">
                  <Clock className="text-orange-500" size={32} /> Mapa de Vendas por Hora
              </h2>
              <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-center mb-8">
                      <h3 className="font-bold text-slate-700 uppercase tracking-widest text-xs">Distribuição do Movimento (24h)</h3>
                      <div className="flex items-center gap-2 text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
                          <AlertCircle size={14} /> Horário de Pico: {hourlySales.sort((a,b) => b.count - a.count)[0]?.hour}
                      </div>
                  </div>
                  <div className="h-[450px]"><Bar data={hourlyData} options={{ responsive: true, maintainAspectRatio: false }} /></div>
              </div>
          </div>
      );
  }

  // --- DASHBOARD PRINCIPAL (DEFAULT) ---

  const chartData = {
    labels: salesHistory.length > 0 ? salesHistory.map(d => new Date(d.date).toLocaleDateString('pt-BR', { weekday: 'short' })) : ['-'],
    datasets: [
      {
        label: 'Faturamento',
        data: salesHistory.length > 0 ? salesHistory.map(d => d.amount) : [0],
        fill: true,
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        borderColor: '#f97316',
        tension: 0.4,
        pointBackgroundColor: '#f97316',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
      }
    },
    scales: {
      y: {
        grid: { color: '#f1f5f9', borderDash: [4, 4] },
        ticks: { color: '#64748b', font: { size: 11 } },
        border: { display: false }
      },
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { size: 11 } },
        border: { display: false }
      }
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-400 font-medium">Carregando dados...</div>;
  }

  if (error) {
    return <div className="p-4 rounded-xl bg-red-50 text-red-600 border border-red-100 font-medium">{error}</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {user?.isSuperAdmin && localStorage.getItem('selectedRestaurantId') && (
          <div className="bg-blue-600 text-white p-4 rounded-2xl flex justify-between items-center shadow-lg animate-in slide-in-from-top-4">
              <div className="flex items-center gap-3">
                  <LayoutDashboard size={20} />
                  <div>
                      <p className="text-[10px] font-black uppercase opacity-80 leading-none">Modo de Gerenciamento</p>
                      <p className="text-sm font-bold italic">Você está visualizando os dados de uma unidade específica.</p>
                  </div>
              </div>
              <button 
                onClick={() => {
                    localStorage.removeItem('selectedRestaurantId');
                    navigate('/super-admin');
                    window.location.reload();
                }}
                className="bg-white text-blue-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-blue-50 transition-colors"
              >
                  Sair da Loja
              </button>
          </div>
      )}

      {/* Stats Grid - Kicardapio Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="ui-card p-5 border-l-4 border-l-blue-500 flex flex-col justify-between h-28 hover:shadow-md transition-shadow">
            <div>
                <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">Novos Pedidos</p>
                <h3 className="text-2xl font-black text-foreground mt-1">{stats?.ordersToday ?? 0}</h3>
            </div>
            <div className="text-[10px] text-slate-400 font-medium">+12% vs ontem</div>
        </div>

        <div className="ui-card p-5 border-l-4 border-l-yellow-500 flex flex-col justify-between h-28 hover:shadow-md transition-shadow">
            <div>
                <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">Em Preparo</p>
                <h3 className="text-2xl font-black text-foreground mt-1">{stats?.preparing ?? 0}</h3>
            </div>
            <div className="text-[10px] text-slate-400 font-medium">Cozinha operando normal</div>
        </div>

        <div className="ui-card p-5 border-l-4 border-l-green-500 flex flex-col justify-between h-28 hover:shadow-md transition-shadow">
            <div>
                <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">Faturamento Hoje</p>
                <h3 className="text-2xl font-black text-foreground mt-1">R$ {stats?.revenueToday.toFixed(2) ?? '0.00'}</h3>
            </div>
            <div className="text-[10px] text-green-600 font-bold bg-green-50 dark:bg-green-900/20 w-fit px-2 py-0.5 rounded-full uppercase">Meta batida!</div>
        </div>

        <div className="ui-card p-5 border-l-4 border-l-purple-500 flex flex-col justify-between h-28 hover:shadow-md transition-shadow">
            <div>
                <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">Ticket Médio</p>
                <h3 className="text-2xl font-black text-foreground mt-1">R$ {stats?.ticketMedio.toFixed(2) ?? '0.00'}</h3>
            </div>
            <div className="text-[10px] text-slate-400 font-medium uppercase">Estável</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section */}
        <div className="lg:col-span-2 ui-card p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-foreground text-base italic uppercase tracking-tight">Visão de Faturamento</h3>
            <select className="bg-muted text-[10px] font-bold text-muted-foreground rounded-lg py-1.5 px-3 outline-none cursor-pointer border border-border">
                <option>Últimos 7 dias</option>
                <option>Este Mês</option>
            </select>
          </div>
          <div className="h-[280px] w-full">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>

        {/* Recent Orders */}
        <div className="ui-card flex flex-col overflow-hidden">
          <div className="p-5 border-b border-border flex justify-between items-center bg-muted/20">
            <h3 className="font-bold text-foreground text-base italic uppercase tracking-tight">Pedidos Recentes</h3>
            <button className="text-primary text-[10px] font-black uppercase hover:underline flex items-center gap-1">
                Ver todos <ArrowRight size={12} />
            </button>
          </div>
          <div className="overflow-auto flex-1">
            <table className="w-full text-left">
              <thead className="bg-muted/50 text-muted-foreground text-[9px] uppercase font-black tracking-widest">
                <tr>
                  <th className="px-6 py-3">ID/Mesa</th>
                  <th className="px-6 py-3">Total</th>
                  <th className="px-6 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground text-sm">
                {recentOrders.length > 0 ? (
                  recentOrders.map(order => (
                    <tr key={order.id} className="hover:bg-primary/5 transition-colors group">
                      <td className="px-6 py-3 font-medium">
                        <span className="block text-xs font-bold">#{order.id.slice(-4).toUpperCase()}</span>
                        <span className="text-[10px] text-muted-foreground uppercase font-medium">Mesa {order.tableNumber || 'Balcão'}</span>
                      </td>
                      <td className="px-6 py-3 font-black text-xs italic text-foreground">R$ {order.total.toFixed(2)}</td>
                      <td className="px-6 py-3 text-right">
                        <button className="text-primary hover:bg-primary hover:text-white font-black text-[9px] border border-primary/20 px-2.5 py-1.5 rounded-lg transition-all uppercase tracking-widest">
                            Detalhes
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground italic text-xs uppercase">Sem pedidos recentes.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
