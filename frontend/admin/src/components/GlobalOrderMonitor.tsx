import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { getAdminOrders, updateOrderStatus, getSettings, getTableRequests, resolveTableRequest, markOrderAsPrinted } from '../services/api';
import { printOrder } from '../services/printing';
import type { Order } from '../types'; 
import NewOrderAlert from './NewOrderAlert';
import TableRequestAlert from './TableRequestAlert'; 
import { Bell, UserCheck } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

const GlobalOrderMonitor: React.FC = () => {
  const location = useLocation();
  const isKdsPage = location.pathname === '/kds';

  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [isAutoAccept, setIsAutoAccept] = useState(false);
  
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  
  const lastOrderIdsRef = useRef<Set<string>>(new Set());
  const lastRequestIdsRef = useRef<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchData = async () => {
    if (isKdsPage) return; // Não monitora nada se estiver no KDS

    const userStr = localStorage.getItem('user');
    const selectedRestaurantId = localStorage.getItem('selectedRestaurantId');
    if (!userStr) return;

    const user = JSON.parse(userStr);
    
    // Se for SuperAdmin e não tiver loja selecionada, abortamos o monitoramento de loja
    if (user?.isSuperAdmin && !selectedRestaurantId) return;
    // Se for usuário comum sem restaurante vinculado (caso raro), abortamos
    if (!user?.restaurantId && !selectedRestaurantId) return;

    try {
      // 1. Chamados de Mesa
      try {
          const requestsData = await getTableRequests();
          if (Array.isArray(requestsData)) {
              setPendingRequests(requestsData);
              const currentReqIds = new Set(requestsData.map((r: any) => r.id));
              const hasNewRequest = [...currentReqIds].some(id => !lastRequestIdsRef.current.has(id));
              if (hasNewRequest) {
                  playNotificationSound();
                  setIsRequestModalOpen(true);
              }
              lastRequestIdsRef.current = currentReqIds;
          }
      } catch (e) { console.warn("Monitor: Falha ao carregar chamados", e); }

      // 2. Trava de Usuário para Pedidos e Configurações
      const userStr = localStorage.getItem('user');
      if (!userStr) return; 

      const user = JSON.parse(userStr);
      const isAdminOrStaff = user?.role === 'admin' || user?.role === 'staff';

      // 3. Settings
      let currentAutoAccept = false;
      try {
          const settingsData = await getSettings();
          currentAutoAccept = settingsData?.settings?.autoAcceptOrders || false;
          setIsAutoAccept(currentAutoAccept);
      } catch (e) { console.warn("Monitor: Falha ao carregar settings", e); }

      // 4. Pedidos (Apenas Admin/Staff)
      if (isAdminOrStaff) {
          try {
              const ordersData = await getAdminOrders();
              if (Array.isArray(ordersData)) {
                  // Identificar NOVOS pedidos (para som de alerta e modal)
                  const newOrders = ordersData.filter(o => !lastOrderIdsRef.current.has(o.id));
                  if (newOrders.length > 0) {
                      playNotificationSound();
                      if (!currentAutoAccept) {
                          const hasPending = newOrders.some(o => o.status === 'PENDING');
                          if (hasPending) setIsOrderModalOpen(true);
                      }
                  }

                  // LÓGICA DE IMPRESSÃO DE PRODUÇÃO (PREPARING e ainda não impresso)
                  const toPrintProduction = ordersData.filter(o => o.status === 'PREPARING' && !o.isPrinted);
                  
                  // LÓGICA DE IMPRESSÃO DE FECHAMENTO (Apenas Delivery e ainda não impresso)
                  const toPrintFinal = ordersData.filter(o => o.status === 'COMPLETED' && o.orderType === 'DELIVERY' && !o.isPrinted);

                  const allToPrint = [...toPrintProduction, ...toPrintFinal];
                  
                  for (const order of allToPrint) {
                      console.log(`Enviando para impressora: Pedido #${order.dailyOrderNumber || order.id.slice(-4)}`);
                      try {
                          const printerConfig = JSON.parse(localStorage.getItem('printer_config') || '{}');
                          const receiptSettings = JSON.parse(localStorage.getItem('receipt_settings') || '{}');
                          const settingsData = await getSettings();
                          const restaurantInfo = {
                              name: settingsData.name,
                              address: settingsData.address,
                              phone: settingsData.phone,
                              cnpj: settingsData.fiscalConfig?.cnpj,
                              logoUrl: settingsData.logoUrl
                          };
                          
                          await printOrder(order, printerConfig, receiptSettings, restaurantInfo);
                          
                          // MARCA COMO IMPRESSO NO BANCO DE DADOS (Persistência definitiva)
                          await markOrderAsPrinted(order.id);
                          console.log(`Pedido #${order.id} marcado como impresso no servidor.`);
                      } catch (printErr) {
                          console.error("Falha na impressão:", printErr);
                      }
                  }

                  // Atualiza estados e referências
                  setPendingOrders(ordersData.filter((o: Order) => o.status === 'PENDING'));
                  lastOrderIdsRef.current = new Set(ordersData.map((o: Order) => o.id));
              }
          } catch (e) { console.warn("Monitor: Falha ao carregar pedidos", e); }
      }

    } catch (error) {
      console.error('Erro crítico no monitor global:', error);
    }
  };

  const playNotificationSound = () => {
      try {
          if (!audioRef.current) {
              audioRef.current = new Audio('/notification.mp3');
          }
          audioRef.current.play().catch(() => {});
      } catch (e) {}
  };

  useEffect(() => {
    if (isKdsPage) return; // Não faz nada se for KDS
    
    fetchData();
    const interval = setInterval(fetchData, 15000); 
    return () => clearInterval(interval);
  }, [isKdsPage]);

  const handleResolveRequest = async (id: string) => {
      try {
          await resolveTableRequest(id);
          setPendingRequests(prev => {
              const updated = prev.filter(r => r.id !== id);
              // Se não houver mais chamados, fecha o modal automaticamente
              if (updated.length === 0) {
                  setIsRequestModalOpen(false);
              }
              return updated;
          });
          toast.success("Chamado atendido!");
      } catch (e) {
          console.error(e);
          toast.error("Erro ao resolver chamado.");
      }
  };

  const hasAlerts = (pendingOrders.length > 0 || pendingRequests.length > 0) && !isKdsPage;
  if (!hasAlerts) return null;

  return (
    <>
      <div className="fixed bottom-6 right-6 z-[150] flex flex-col items-end gap-3 pointer-events-auto">
        {pendingRequests.length > 0 && (
            <div onClick={() => setIsRequestModalOpen(true)} className="pointer-events-auto bg-indigo-600 text-white rounded-2xl shadow-xl border-2 border-white flex items-center gap-3 p-1.5 pr-4 animate-bounce-subtle cursor-pointer hover:scale-105 transition-all">
                <div className="bg-white text-indigo-600 p-2 rounded-xl"><UserCheck size={20} /></div>
                <div className="flex flex-col">
                    <p className="text-[8px] font-black uppercase tracking-widest text-indigo-100 leading-tight">Chamado</p>
                    <p className="text-sm font-black italic leading-none">{pendingRequests.length} Mesa(s)</p>
                </div>
            </div>
        )}

        {pendingOrders.length > 0 && !isAutoAccept && (
            <div onClick={() => setIsOrderModalOpen(true)} className="pointer-events-auto bg-orange-600 text-white rounded-2xl shadow-xl border-2 border-white flex items-center gap-3 p-1.5 pr-4 animate-bounce-subtle cursor-pointer hover:scale-105 transition-all">
                <div className="bg-white text-orange-600 p-2 rounded-xl animate-ring"><Bell size={20} /></div>
                <div className="flex flex-col">
                    <p className="text-[8px] font-black uppercase tracking-widest text-orange-100 text-left leading-tight">Pedido</p>
                    <p className="text-sm font-black italic text-left leading-none">{pendingOrders.length} Novo(s)</p>
                </div>
            </div>
        )}
      </div>

      <div className="fixed top-0 left-0 right-0 z-[200] pointer-events-none flex flex-col">
          {pendingRequests.length > 0 && <div className="bg-indigo-600 text-white text-[8px] font-black uppercase tracking-[0.2em] py-1 text-center shadow-lg animate-pulse">CHAMADO DE MESA PENDENTE</div>}
          {pendingOrders.length > 0 && !isAutoAccept && <div className="bg-red-600 text-white text-[8px] font-black uppercase tracking-[0.2em] py-1 text-center shadow-lg animate-pulse">PEDIDO AGUARDANDO ACEITE</div>}
      </div>

      {isOrderModalOpen && (
          <NewOrderAlert 
            orders={pendingOrders}
            onAccept={async (id) => {
                await updateOrderStatus(id, 'PREPARING');
                setPendingOrders(prev => prev.filter(o => o.id !== id));
                if (pendingOrders.length <= 1) setIsOrderModalOpen(false);
            }}
            onReject={async (id) => {
                await updateOrderStatus(id, 'CANCELED');
                setPendingOrders(prev => prev.filter(o => o.id !== id));
                if (pendingOrders.length <= 1) setIsOrderModalOpen(false);
            }}
            onClose={() => setIsOrderModalOpen(false)}
          />
      )}

      {isRequestModalOpen && (
          <TableRequestAlert 
            requests={pendingRequests}
            onResolve={handleResolveRequest}
            onClose={() => setIsRequestModalOpen(false)}
          />
      )}
    </>
  );
};

export default GlobalOrderMonitor;
