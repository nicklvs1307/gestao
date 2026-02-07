import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix para o leaflet-draw que espera L globalmente em ambientes ESM
if (typeof window !== 'undefined') {
    (window as any).L = L;
}

import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import { 
    MapPin, Plus, Trash2, Save, 
    Layers, MousePointer2, Circle as CircleIcon, 
    Hexagon, DollarSign, Loader2, AlertCircle, RefreshCw, ChevronRight, CheckCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

// Configuração do Leaflet (Ícones)
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const DeliveryAreaManagement: React.FC = () => {
    const [areas, setAreas] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // Estados do Formulário
    const [name, setName] = useState('');
    const [fee, setFee] = useState(0);
    const [type, setType] = useState<'RADIUS' | 'POLYGON'>('RADIUS');
    const [geometry, setGeometry] = useState<any>(null);
    const [radius, setRadius] = useState<number>(1000);

    const mapRef = useRef<HTMLDivElement>(null);
    const leafletMap = useRef<L.Map | null>(null);
    const drawItems = useRef<L.FeatureGroup>(new L.FeatureGroup());

    const loadAreas = async () => {
        try {
            const res = await api.get('/delivery-areas');
            setAreas(res.data);
            renderAreasOnMap(res.data);
        } catch (error) {
            toast.error("Erro ao carregar áreas.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!mapRef.current) return;

        // Inicializa Mapa - Centralizado no Brasil por default
        leafletMap.current = L.map(mapRef.current).setView([-23.5505, -46.6333], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(leafletMap.current);
        
        // Camada de Desenho
        drawItems.current.addTo(leafletMap.current);

        // Configuração de Desenho
        const drawControl = new L.Control.Draw({
            edit: { featureGroup: drawItems.current },
            draw: {
                polygon: {
                    shapeOptions: { color: '#f97316' }
                },
                circle: {
                    shapeOptions: { color: '#f97316' }
                },
                marker: false,
                polyline: false,
                rectangle: false,
                circlemarker: false
            }
        });
        leafletMap.current.addControl(drawControl);

        // Evento ao criar forma
        leafletMap.current.on(L.Draw.Event.CREATED, (e: any) => {
            const layer = e.layer;
            const layerType = e.layerType;
            
            drawItems.current.clearLayers(); 
            drawItems.current.addLayer(layer);

            if (layerType === 'circle') {
                setType('RADIUS');
                setRadius(layer.getRadius());
                setGeometry(layer.getLatLng());
            } else if (layerType === 'polygon') {
                setType('POLYGON');
                setGeometry(layer.getLatLngs()[0]);
            }
        });

        loadAreas();

        return () => {
            leafletMap.current?.remove();
        };
    }, []);

    const renderAreasOnMap = (data: any[]) => {
        if (!leafletMap.current) return;
        
        data.forEach(area => {
            if (area.type === 'RADIUS' && area.geometry) {
                L.circle(area.geometry, { 
                    radius: area.radius, 
                    color: '#f97316', 
                    fillColor: '#f97316',
                    fillOpacity: 0.1,
                    weight: 2
                }).addTo(leafletMap.current!);
            } else if (area.type === 'POLYGON' && area.geometry) {
                L.polygon(area.geometry, { 
                    color: '#3b82f6', 
                    fillColor: '#3b82f6',
                    fillOpacity: 0.1,
                    weight: 2
                }).addTo(leafletMap.current!);
            }
        });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!geometry) return toast.error("Desenhe a área no mapa primeiro.");

        setIsSaving(true);
        try {
            await api.post('/delivery-areas', {
                name, type, fee, radius, geometry
            });
            toast.success("Área de entrega salva!");
            setName(''); setFee(0); setGeometry(null);
            drawItems.current.clearLayers();
            loadAreas();
        } catch (error) {
            toast.error("Erro ao salvar.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Excluir esta área?")) return;
        try {
            await api.delete(`/delivery-areas/${id}`);
            toast.success("Área removida.");
            loadAreas();
        } catch (error) {
            toast.error("Erro ao remover.");
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header Premium */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Logística de Entrega</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
                        <MapPin size={14} className="text-orange-500" /> Raio de Atendimento e Taxas de Frete
                    </p>
                </div>
                <Button variant="outline" size="sm" className="bg-white rounded-xl h-12 gap-2" onClick={loadAreas}>
                    <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} /> ATUALIZAR MAPA
                </Button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                
                {/* Coluna Esquerda: Formulário e Lista */}
                <div className="xl:col-span-4 space-y-8 h-fit lg:sticky lg:top-24 overflow-y-auto custom-scrollbar pr-2 max-h-[calc(100vh-12rem)]">
                    
                    {/* Novo Cadastro */}
                    <Card className="p-8 space-y-8 border-slate-200 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-3xl -mr-16 -mt-16 rounded-full" />
                        
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="p-3 bg-orange-500 text-white rounded-2xl shadow-lg shadow-orange-100">
                                <Plus size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Nova Região</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Marque no mapa ao lado</p>
                            </div>
                        </div>

                        <form onSubmit={handleSave} id="area-form" className="space-y-6 relative z-10">
                            <Input 
                                label="Identificação do Setor"
                                required 
                                placeholder="Ex: Centro, Bairro Nobre..." 
                                value={name} 
                                onChange={e => setName(e.target.value)}
                            />

                            <div className="grid grid-cols-2 gap-6">
                                <Input 
                                    label="Taxa de Frete (R$)"
                                    type="number" 
                                    step="0.01"
                                    value={fee} 
                                    onChange={e => setFee(Number(e.target.value))}
                                />
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Tipo de Área</label>
                                    <div className="h-12 flex items-center justify-center gap-3 px-4 bg-slate-50 rounded-2xl border-2 border-slate-100 text-slate-900 font-black text-[10px] uppercase tracking-tighter">
                                        {type === 'RADIUS' ? <CircleIcon size={16} className="text-orange-500"/> : <Hexagon size={16} className="text-blue-500"/>}
                                        {type === 'RADIUS' ? 'Raio Circular' : 'Polígono Livre'}
                                    </div>
                                </div>
                            </div>

                            {!geometry && (
                                <div className="p-5 bg-blue-50/50 border-2 border-dashed border-blue-100 rounded-3xl flex items-start gap-4">
                                    <MousePointer2 className="text-blue-500 shrink-0 mt-1" size={20} />
                                    <p className="text-[10px] font-black text-blue-600 uppercase leading-relaxed tracking-tight italic">
                                        Use a barra de ferramentas no topo do mapa para desenhar a área de atendimento.
                                    </p>
                                </div>
                            )}

                            <Button 
                                type="submit" 
                                disabled={isSaving || !geometry}
                                isLoading={isSaving}
                                fullWidth
                                size="lg"
                                className="h-16 rounded-[2rem] italic font-black uppercase tracking-widest shadow-2xl shadow-slate-200"
                            >
                                <Save size={20} /> SALVAR ÁREA
                            </Button>
                        </form>
                    </Card>

                    {/* Regiões Ativas */}
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3 ml-2">
                            <Layers size={14} className="text-orange-500" /> Regiões Ativas ({areas.length})
                        </h4>
                        
                        <div className="space-y-3">
                            {areas.map(area => (
                                <Card key={area.id} className="p-4 border-slate-100 shadow-md group hover:border-orange-500/20 transition-all">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110",
                                                area.type === 'RADIUS' ? "bg-orange-500 text-white shadow-orange-100" : "bg-blue-500 text-white shadow-blue-100"
                                            )}>
                                                {area.type === 'RADIUS' ? <CircleIcon size={20}/> : <Hexagon size={20}/>}
                                            </div>
                                            <div>
                                                <h5 className="font-black text-slate-900 text-sm uppercase italic tracking-tighter leading-none mb-1">{area.name}</h5>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black text-emerald-600 italic tracking-tighter">FRETE: R$ {area.fee.toFixed(2)}</span>
                                                    <div className="w-1 h-1 bg-slate-200 rounded-full" />
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase">{area.type === 'RADIUS' ? `${(area.radius/1000).toFixed(1)}km` : 'Polígono'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="icon"
                                            onClick={() => handleDelete(area.id)}
                                            className="h-10 w-10 bg-slate-50 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                        >
                                            <Trash2 size={18} />
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                            {areas.length === 0 && (
                                <div className="p-10 text-center opacity-20 grayscale">
                                    <MapPin size={40} className="mx-auto mb-3" />
                                    <p className="text-[10px] font-black uppercase tracking-widest italic">Nenhuma área definida</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Coluna Direita: Mapa Master */}
                <div className="xl:col-span-8 h-[700px] xl:h-[calc(100vh-12rem)] relative">
                    <Card className="w-full h-full p-0 overflow-hidden border-4 border-white shadow-[0_30px_60px_-12px_rgba(0,0,0,0.15)] bg-slate-100" noPadding>
                        <div ref={mapRef} className="w-full h-full z-0" />
                        
                        {/* Indicadores no Mapa */}
                        <div className="absolute bottom-10 left-10 z-[1000] space-y-3">
                            <div className="bg-white/90 backdrop-blur-xl p-5 rounded-[2rem] border border-slate-200 shadow-2xl space-y-3">
                                <h5 className="text-[9px] font-black uppercase text-slate-400 tracking-widest italic border-b border-slate-100 pb-2 mb-3">Legenda Técnica</h5>
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                                    <span className="text-[10px] font-bold text-slate-700 uppercase italic">Raios de Entrega</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                                    <span className="text-[10px] font-bold text-slate-700 uppercase italic">Polígonos Livres</span>
                                </div>
                            </div>
                        </div>

                        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-3 bg-slate-900/90 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 shadow-2xl">
                            <Info className="text-orange-500" size={18} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-white italic">Selecione uma ferramenta no topo para desenhar</span>
                        </div>
                    </Card>
                </div>

            </div>
        </div>
    );
};

export default DeliveryAreaManagement;