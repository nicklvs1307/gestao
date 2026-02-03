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
    Hexagon, DollarSign, Loader2, AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

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

        // Inicializa Mapa
        leafletMap.current = L.map(mapRef.current).setView([-23.5505, -46.6333], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(leafletMap.current);
        
        // Camada de Desenho
        drawItems.current.addTo(leafletMap.current);

        // Configuração de Desenho
        const drawControl = new L.Control.Draw({
            edit: { featureGroup: drawItems.current },
            draw: {
                polygon: true,
                circle: true,
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
            
            drawItems.current.clearLayers(); // Permite apenas um desenho por vez no form
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
        
        // Remove desenhos antigos (exceto os do form em edição)
        // Aqui poderíamos criar uma camada específica para as áreas salvas
        data.forEach(area => {
            if (area.type === 'RADIUS' && area.geometry) {
                L.circle(area.geometry, { radius: area.radius, color: 'orange', fillOpacity: 0.2 }).addTo(leafletMap.current!);
            } else if (area.type === 'POLYGON' && area.geometry) {
                L.polygon(area.geometry, { color: 'blue', fillOpacity: 0.2 }).addTo(leafletMap.current!);
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
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 h-[calc(100vh-10rem)]">
            
            {/* Formulário e Lista (Esquerda) */}
            <div className="xl:col-span-1 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
                
                {/* Nova Área */}
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-orange-100 text-orange-600 rounded-2xl">
                            <Plus size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 uppercase italic">Nova Região</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Desenhe no mapa ao lado</p>
                        </div>
                    </div>

                    <form onSubmit={handleSave} className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Nome do Setor</label>
                            <input 
                                required type="text" placeholder="Ex: Centro, Bairro Nobre..." 
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl h-12 px-4 focus:border-orange-500 outline-none font-bold transition-all"
                                value={name} onChange={e => setName(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block italic">Taxa de Entrega</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={16} />
                                    <input 
                                        required type="number" step="0.01"
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl h-12 pl-10 pr-4 focus:border-emerald-500 outline-none font-bold transition-all"
                                        value={fee} onChange={e => setFee(Number(e.target.value))}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block italic">Tipo</label>
                                <div className="h-12 flex items-center gap-2 px-2 bg-slate-50 rounded-2xl border-2 border-slate-100 text-slate-400 font-bold text-xs uppercase">
                                    {type === 'RADIUS' ? <CircleIcon size={14}/> : <Hexagon size={14}/>}
                                    {type === 'RADIUS' ? 'Raio' : 'Polígono'}
                                </div>
                            </div>
                        </div>

                        {!geometry && (
                            <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-3">
                                <MousePointer2 className="text-blue-500 shrink-0" size={18} />
                                <p className="text-[10px] font-bold text-blue-600 uppercase leading-relaxed tracking-tight">
                                    Use as ferramentas de desenho no topo do mapa para marcar a área.
                                </p>
                            </div>
                        )}

                        <button 
                            type="submit" disabled={isSaving || !geometry}
                            className="w-full bg-slate-900 text-white py-4 rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            Salvar Área de Entrega
                        </button>
                    </form>
                </div>

                {/* Lista de Áreas */}
                <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Layers size={14} /> Regiões Ativas ({areas.length})
                    </h4>
                    
                    {areas.map(area => (
                        <div key={area.id} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center shadow-inner",
                                    area.type === 'RADIUS' ? "bg-orange-50 text-orange-500" : "bg-blue-50 text-blue-500"
                                )}>
                                    {area.type === 'RADIUS' ? <CircleIcon size={18}/> : <Hexagon size={18}/>}
                                </div>
                                <div>
                                    <h5 className="font-black text-slate-900 text-sm uppercase tracking-tight">{area.name}</h5>
                                    <p className="text-[10px] font-bold text-emerald-600">Taxa: R$ {area.fee.toFixed(2)}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleDelete(area.id)}
                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Mapa (Direita) */}
            <div className="xl:col-span-2 bg-slate-200 rounded-[3rem] overflow-hidden border-4 border-white shadow-2xl relative">
                <div ref={mapRef} className="w-full h-full z-0" />
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur-md px-6 py-2 rounded-full border border-slate-200 shadow-xl flex items-center gap-3">
                    <AlertCircle className="text-orange-500" size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Áreas em Laranja = Salvas | Áreas em Azul = Novas</span>
                </div>
            </div>

        </div>
    );
};

export default DeliveryAreaManagement;
