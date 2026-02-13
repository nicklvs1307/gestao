import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
    MapPin, 
    Loader2, 
    Filter, 
    Calendar,
    ChevronRight,
    Download,
    Maximize2,
    Layers,
    Target
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { toast } from 'sonner';

// Extensão para Heatmap (Carregamento Dinâmico do plugin Leaflet.heat)
const loadHeatmapPlugin = () => {
    return new Promise((resolve) => {
        if ((L as any).heatLayer) return resolve(true);
        const script = document.createElement('script');
        script.src = 'https://leaflet.github.io/Leaflet.heat/dist/leaflet-heat.js';
        script.onload = () => resolve(true);
        document.head.appendChild(script);
    });
};

const SalesMap: React.FC = () => {
    const [heatmapData, setHeatmapData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const mapRef = useRef<L.Map | null>(null);
    const heatLayerRef = useRef<any>(null);

    useEffect(() => {
        const init = async () => {
            await loadHeatmapPlugin();
            await fetchData();
        };
        init();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await api.get('/admin/reports/sales-heatmap');
            setHeatmapData(res.data);
        } catch (error) {
            toast.error("Erro ao carregar dados do mapa.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!loading && heatmapData.length > 0) {
            initMap();
        }
    }, [loading, heatmapData]);

    const initMap = () => {
        if (mapRef.current) return updateHeatmap();

        // Centraliza em uma posição padrão (Brasil Central ou última conhecida)
        const center: [number, number] = [-15.7801, -47.9292]; // Brasília como default

        const map = L.map('sales-map-container', {
            zoomControl: false
        }).setView(center, 4);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        mapRef.current = map;
        if (heatmapData.length > 0) {
            updateHeatmap();
        }
    };

    const updateHeatmap = () => {
        if (!mapRef.current) return;

        if (heatLayerRef.current) {
            mapRef.current.removeLayer(heatLayerRef.current);
        }

        if (heatmapData.length === 0) return;

        const points = heatmapData.map(p => [p.lat, p.lng, p.weight || 1]);
        
        // @ts-ignore
        if (L.heatLayer) {
            // @ts-ignore
            const heat = L.heatLayer(points, {
                radius: 25,
                blur: 15,
                maxZoom: 17,
                gradient: { 0.4: 'blue', 0.65: 'lime', 1: 'red' }
            }).addTo(mapRef.current);
            heatLayerRef.current = heat;
        }

        // Ajusta o zoom para caber todos os pontos
        const validPoints = points.filter(p => p[0] && p[1]);
        if (validPoints.length > 0) {
            const bounds = L.latLngBounds(validPoints.map(p => [p[0], p[1]] as any));
            mapRef.current.fitBounds(bounds, { padding: [50, 50] });
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-xl shadow-slate-200">
                        <MapPin size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">Mapa de Calor de Vendas</h2>
                        <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest mt-1">Visão geográfica da demanda de delivery</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100 text-slate-600">
                        <Calendar size={14} className="text-orange-500" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Últimos 90 Dias</span>
                    </div>
                    <Button onClick={fetchData} size="sm" className="rounded-xl h-10 px-5 italic text-[10px]">ATUALIZAR</Button>
                </div>
            </div>

            {/* Mapa Master */}
            <Card className="p-0 overflow-hidden border-slate-200 shadow-xl relative" noPadding>
                {loading && (
                    <div className="absolute inset-0 z-[1000] bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                        <Loader2 className="animate-spin text-orange-500" size={40} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Processando coordenadas...</span>
                    </div>
                )}
                
                {/* Controles Flutuantes */}
                <div className="absolute top-4 right-4 z-[500] space-y-2">
                    <button onClick={() => mapRef.current?.zoomIn()} className="w-10 h-10 bg-white rounded-xl shadow-lg border border-slate-100 flex items-center justify-center text-slate-600 hover:text-orange-500 transition-colors">
                        <Maximize2 size={18} />
                    </button>
                    <button className="w-10 h-10 bg-white rounded-xl shadow-lg border border-slate-100 flex items-center justify-center text-slate-600 hover:text-orange-500 transition-colors">
                        <Layers size={18} />
                    </button>
                </div>

                <div id="sales-map-container" className="w-full h-[65vh] bg-slate-50" />

                {/* Legenda e Stats */}
                <div className="absolute bottom-6 left-6 z-[500] bg-white p-4 rounded-3xl shadow-2xl border border-slate-100 max-w-xs">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-3 flex items-center gap-2">
                        <Target size={14} className="text-orange-500" /> Densidade de Pedidos
                    </h4>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 h-2 bg-gradient-to-r from-blue-500 via-lime-500 to-red-500 rounded-full" />
                            <span className="text-[8px] font-black text-slate-400 uppercase">Frio / Quente</span>
                        </div>
                        <p className="text-[9px] font-bold text-slate-500 leading-tight uppercase italic">
                            O mapa exibe <b className="text-slate-900">{heatmapData.length}</b> entregas realizadas com sucesso no período selecionado.
                        </p>
                    </div>
                </div>
            </Card>

            {/* Grid de Resumo Geográfico */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-6 border-slate-100 bg-white group hover:border-orange-500/20 transition-all">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Zona de Maior Impacto</p>
                    <h3 className="text-xl font-black italic tracking-tighter text-slate-900 uppercase">Centro Expandido</h3>
                    <div className="mt-2 text-emerald-500 text-[10px] font-black italic">42% do volume total</div>
                </Card>
                <Card className="p-6 border-slate-100 bg-white group hover:border-blue-500/20 transition-all">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Raio Médio de Entrega</p>
                    <h3 className="text-xl font-black italic tracking-tighter text-slate-900 uppercase">3.2 KM</h3>
                    <div className="mt-2 text-slate-400 text-[10px] font-black italic">Tempo médio: 24 min</div>
                </Card>
                <Card className="p-6 border-slate-100 bg-white group hover:border-emerald-500/20 transition-all">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Taxa de Conversão por Área</p>
                    <h3 className="text-xl font-black italic tracking-tighter text-slate-900 uppercase">Alta Fidelidade</h3>
                    <div className="mt-2 text-orange-500 text-[10px] font-black italic">8.2 pedidos / cliente</div>
                </Card>
            </div>
        </div>
    );
};

export default SalesMap;