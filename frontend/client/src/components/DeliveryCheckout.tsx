import React, { useState, useEffect } from 'react';
import { IMaskInput } from 'react-imask';
import { 
  CreditCard, ShoppingBag, 
  ChevronRight, ArrowLeft, CheckCircle2, Truck, Info, Search, User, Package, MapPin, Loader2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useLocalCart } from '../hooks/useLocalCart';
import { LocationService } from '../services/LocationService';
import { getPaymentMethods } from '../services/api';
import { useRestaurant } from '../context/RestaurantContext'; // Adicionado
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';

interface DeliveryInfo {
  name: string;
  phone: string;
  address: string;
  deliveryType: 'delivery' | 'pickup';
  paymentMethod: string;
  changeFor?: number;
  cep?: string;
  city?: string;
  state?: string;
  number?: string;
  street?: string;
  neighborhood?: string;
}

interface DeliveryCheckoutProps {
  onSubmit: (deliveryInfo: DeliveryInfo) => void;
  onClose: () => void;
  total: number;
  deliveryFee: number;
  restaurantId: string;
}

const DeliveryCheckout: React.FC<DeliveryCheckoutProps> = ({ onSubmit, onClose, total, deliveryFee, restaurantId }) => {
  const { localCartItems } = useLocalCart();
  const { restaurantSettings } = useRestaurant(); // Acesso ao contexto
  const [step, setStep] = useState<'form' | 'review'>('form');
  
  // Tenta carregar dados salvos do localStorage para agilizar a compra
  const savedData = JSON.parse(localStorage.getItem('kicardapio_customer_data') || '{}');

  const [name, setName] = useState(savedData.name || '');
  const [phone, setPhone] = useState(savedData.phone || '');
  const [cep, setCep] = useState(savedData.cep || '');
  const [street, setStreet] = useState(savedData.street || '');
  const [number, setNumber] = useState(savedData.number || '');
  const [neighborhood, setNeighborhood] = useState(savedData.neighborhood || '');
  const [state, setState] = useState(savedData.state || '');
  const [city, setCity] = useState(savedData.city || '');
  
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>(savedData.deliveryType || 'delivery');
  const [paymentMethod, setPaymentMethod] = useState<string>(savedData.paymentMethod || '');
  const [availableMethods, setAvailableMethods] = useState<any[]>([]);
  const [changeFor, setChangeFor] = useState('');
  
  const [statesList, setStatesList] = useState<{sigla: string, nome: string}[]>([]);
  const [citiesList, setCitiesList] = useState<{nome: string}[]>([]);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Carregar meios de pagamento e estados
  useEffect(() => {
    LocationService.getStates().then(setStatesList);
    
    // Tenta carregar usando restaurantId ou o slug do contexto como fallback
    const targetId = restaurantId || restaurantSettings?.restaurant?.slug || restaurantSettings?.restaurantId;
    
    if (targetId) {
        getPaymentMethods(targetId).then(methods => {
            // O backend já filtra por isActive: true, então filtramos apenas por allowDelivery
            const filtered = methods.filter((m: any) => m.allowDelivery);
            setAvailableMethods(filtered);
            
            if (filtered.length > 0) {
                // Se já temos um método salvo que existe na lista, mantém ele. Senão, pega o primeiro.
                if (!paymentMethod || !filtered.find(f => f.name === paymentMethod)) {
                    setPaymentMethod(filtered[0].name);
                }
            }
        }).catch(err => console.error('Erro API Pagamentos:', err));
    }
  }, [restaurantId, restaurantSettings]);

  // Carregar cidades quando o estado muda
  useEffect(() => {
    if (state) {
      LocationService.getCitiesByState(state).then(setCitiesList);
    } else {
      setCitiesList([]);
    }
  }, [state]);

  // Função para usar Geolocalização
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      return alert('Seu navegador não suporta geolocalização.');
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          // Aqui usamos o Google Maps ou um serviço similar via LocationService
          // Se o seu LocationService não tiver, podemos usar a API do Google diretamente ou Nominatim
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`);
          const data = await response.json();
          
          if (data && data.address) {
            const addr = data.address;
            setStreet(addr.road || addr.street || addr.pedestrian || '');
            setNeighborhood(addr.suburb || addr.neighbourhood || addr.city_district || addr.village || '');
            
            const detectedCity = addr.city || addr.town || addr.village || addr.municipality || addr.county || '';
            setCity(detectedCity);

            const detectedState = addr.state_code || addr['ISO3166-2-lvl4']?.split('-')[1] || addr.state || '';
            
            if (detectedState.length === 2) {
                setState(detectedState.toUpperCase());
            } else {
                // Se retornou o nome completo, tentamos encontrar a sigla
                const stateObj = statesList.find(s => s.nome.toLowerCase() === detectedState.toLowerCase());
                if (stateObj) setState(stateObj.sigla);
                else setState(detectedState);
            }
            
            if (addr.postcode) {
              setCep(addr.postcode.replace(/\D/g, ''));
            }
            
            toast.success('Localização preenchida!');
          }
        } catch (error) {
          console.error('Erro ao obter endereço:', error);
          alert('Não foi possível obter seu endereço pela localização.');
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error('Erro GPS:', error);
        setIsLocating(false);
        alert('Permissão de localização negada ou GPS desligado.');
      },
      { enableHighAccuracy: true }
    );
  };

  // Buscar endereço pelo CEP
  const handleCepBlur = async () => {
    if (cep.replace(/\D/g, '').length === 8) {
      setIsLoadingCep(true);
      const data = await LocationService.getAddressByCep(cep);
      setIsLoadingCep(false);
      
      if (data) {
        setStreet(data.logradouro || '');
        setNeighborhood(data.bairro || '');
        setState(data.uf || '');
        setCity(data.localidade || '');
      }
    }
  };

  const validateAndNext = () => {
    if (!name.trim()) return alert('Por favor, informe seu nome.');
    if (phone.length < 10) return alert('Por favor, informe um WhatsApp válido.');
    
    if (deliveryType === 'delivery') {
        if (!cep.replace(/\D/g, '')) return alert('Informe o CEP.');
        if (!street.trim() || !number.trim()) return alert('Preencha o endereço completo.');
        if (!city || !state) return alert('Selecione a cidade e o estado.');
    }
    setStep('review');
  };

  const handleFinalSubmit = () => {
    const deliveryInfo: DeliveryInfo = {
      name, 
      phone,
      cep,
      street,
      number,
      neighborhood,
      city,
      state,
      address: deliveryType === 'delivery' ? `${street}, ${number} - ${neighborhood}, ${city}/${state}` : 'Retirada no Balcão',
      deliveryType, 
      paymentMethod,
      changeFor: paymentMethod.toLowerCase().includes('dinheiro') && changeFor ? parseFloat(changeFor.replace(/[^\d.,]/g, '').replace(',', '.')) : undefined,
    };

    // SALVA OS DADOS PARA A PRÓXIMA COMPRA
    localStorage.setItem('kicardapio_customer_data', JSON.stringify({
        name, phone, cep, street, number, neighborhood, city, state, deliveryType, paymentMethod
    }));

    onSubmit(deliveryInfo);
  };

  return (
    <div className="bg-slate-50 min-h-full flex flex-col relative">
      
      {/* HEADER */}
      <div className="sticky top-0 bg-white/90 backdrop-blur-md z-20 px-6 py-4 border-b border-slate-100 flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => step === 'review' ? setStep('form') : onClose()}>
              <ArrowLeft size={20} />
          </Button>
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 italic">
              {step === 'form' ? 'Dados do Pedido' : 'Revise seu Pedido'}
          </h2>
      </div>

      <div className="flex-1 p-6 pb-40 space-y-8 overflow-y-auto custom-scrollbar">
        
        {step === 'form' ? (
            /* --- TELA 1: FORMULÁRIO --- */
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <section className="space-y-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <User size={14} className="text-primary" /> Informações Pessoais
                    </h3>
                    <div className="space-y-1">
                        <Input 
                            label="Seu Nome"
                            placeholder="Como te chamamos?" 
                            value={name} onChange={e => setName(e.target.value)}
                        />
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">WhatsApp</label>
                          <IMaskInput
                              mask="(00) 00000-0000" 
                              placeholder="Seu WhatsApp"
                              className="flex h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium text-slate-900"
                              value={phone} onAccept={(v) => setPhone(String(v))}
                          />
                        </div>
                    </div>
                </section>

                <section className="space-y-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Package size={14} className="text-primary" /> Forma de Entrega
                    </h3>
                    <div className="flex gap-2 p-1 bg-white border border-slate-100 rounded-2xl shadow-sm">
                        <button onClick={() => setDeliveryType('delivery')} className={cn("flex-1 py-3 rounded-xl font-black text-xs uppercase transition-all", deliveryType === 'delivery' ? "bg-slate-900 text-white shadow-md" : "text-slate-400")}>Entrega</button>
                        <button onClick={() => setDeliveryType('pickup')} className={cn("flex-1 py-3 rounded-xl font-black text-xs uppercase transition-all", deliveryType === 'pickup' ? "bg-slate-900 text-white shadow-md" : "text-slate-400")}>Retirada</button>
                    </div>

                    {deliveryType === 'delivery' && (
                        <div className="space-y-4 pt-2">
                            {/* CEP e Localização */}
                            <div className="space-y-3">
                                <div className="relative">
                                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">CEP</label>
                                    <div className="relative">
                                      <IMaskInput
                                          mask="00000-000" placeholder="00000-000"
                                          className="flex h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium text-slate-900"
                                          value={cep} 
                                          onAccept={(v) => setCep(String(v))}
                                          onBlur={handleCepBlur}
                                      />
                                      {isLoadingCep && <div className="absolute right-4 top-3 text-primary animate-spin"><Search size={18} /></div>}
                                    </div>
                                </div>

                                <Button 
                                    type="button"
                                    variant="outline" 
                                    fullWidth 
                                    className="h-12 rounded-xl border-dashed border-2 border-slate-200 text-slate-500 hover:border-primary hover:text-primary hover:bg-primary/5 gap-2 text-[10px] font-black uppercase tracking-widest"
                                    onClick={handleUseMyLocation}
                                    disabled={isLocating}
                                >
                                    {isLocating ? (
                                        <> <Loader2 size={16} className="animate-spin" /> Localizando... </>
                                    ) : (
                                        <> <MapPin size={16} /> Usar minha localização </>
                                    )}
                                </Button>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                {/* ESTADO */}
                                <div className="col-span-1">
                                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">UF</label>
                                  <select 
                                      className="flex h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-2 py-2 text-sm focus:border-primary outline-none transition-all font-black"
                                      value={state}
                                      onChange={e => setState(e.target.value)}
                                  >
                                      <option value="">UF</option>
                                      {statesList.map(s => <option key={s.sigla} value={s.sigla}>{s.sigla}</option>)}
                                  </select>
                                </div>
                                
                                {/* CIDADE */}
                                <div className="col-span-2">
                                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Cidade</label>
                                  <select 
                                      className="flex h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2 text-sm focus:border-primary outline-none transition-all font-bold"
                                      value={city}
                                      onChange={e => setCity(e.target.value)}
                                      disabled={!state}
                                  >
                                      <option value="">{state ? 'Selecione a Cidade' : 'Selecione UF primeiro'}</option>
                                      {citiesList.map(c => <option key={c.nome} value={c.nome}>{c.nome}</option>)}
                                  </select>
                                </div>
                            </div>

                            <Input label="Rua / Avenida" placeholder="Nome da rua" value={street} onChange={e => setStreet(e.target.value)} />
                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-1">
                                  <Input label="Nº" placeholder="123" value={number} onChange={e => setNumber(e.target.value)} />
                                </div>
                                <div className="col-span-2">
                                  <Input label="Bairro" placeholder="Nome do bairro" value={neighborhood} onChange={e => setNeighborhood(e.target.value)} />
                                </div>
                            </div>
                        </div>
                    )}
                </section>

                <section className="space-y-4 pb-10">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <CreditCard size={14} className="text-primary" /> Forma de Pagamento
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        {availableMethods.map(m => (
                            <Card 
                                key={m.id} 
                                onClick={() => setPaymentMethod(m.name)} 
                                className={cn(
                                    "p-4 border-2 transition-all flex flex-col items-center gap-2 text-center", 
                                    paymentMethod === m.name ? "border-primary bg-orange-50 text-primary" : "border-slate-100 text-slate-400 opacity-60"
                                )}
                            >
                                <span className="text-2xl">
                                    {m.type === 'CASH' ? '💵' : 
                                     m.type === 'PIX' ? '📱' : 
                                     m.type.includes('CARD') ? '💳' : '📄'}
                                </span>
                                <span className="text-[9px] font-black uppercase tracking-widest">{m.name}</span>
                            </Card>
                        ))}
                    </div>
                    {paymentMethod.toLowerCase().includes('dinheiro') && (
                        <div className="pt-2 animate-in slide-in-from-top-2 duration-300">
                          <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Troco para quanto?</label>
                          <IMaskInput
                              mask="R$ num"
                              blocks={{ num: { mask: Number, thousandsSeparator: '.', radix: ',', scale: 2, padFractionalZeros: true } }}
                              placeholder="Ex: R$ 50,00"
                              className="flex h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2 text-sm focus:border-primary outline-none transition-all font-bold text-emerald-600"
                              value={changeFor} onAccept={(v) => setChangeFor(String(v))}
                          />
                        </div>
                    )}
                </section>
            </div>
        ) : (
            /* --- TELA 2: REVISÃO --- */
            <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                <Card className="bg-emerald-50 border-emerald-100 p-6 flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
                      <CheckCircle2 size={32} className="text-emerald-500" />
                    </div>
                    <h3 className="text-xl font-black text-emerald-900 italic tracking-tighter uppercase leading-none mb-1">Quase lá, {name.split(' ')[0]}!</h3>
                    <p className="text-emerald-700 text-xs font-bold uppercase tracking-widest opacity-70">Confira seu pedido antes de enviar</p>
                </Card>

                {/* Resumo dos Itens */}
                <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Itens na Sacola</h4>
                    <Card className="p-6 border-slate-100">
                      <div className="space-y-4">
                          {localCartItems.map((item, i) => (
                              <div key={i} className="flex justify-between items-start text-sm">
                                  <div className="flex flex-col">
                                    <span className="font-black text-slate-800 uppercase text-xs italic tracking-tight leading-tight">
                                      <b className="text-primary not-italic mr-1">{item.quantity}x</b> {item.product.name}
                                    </span>
                                    {item.sizeJson && <span className="text-[9px] font-bold text-slate-400 uppercase">{JSON.parse(item.sizeJson).name}</span>}
                                  </div>
                                  <span className="font-black text-slate-900 text-xs shrink-0">R$ {(item.priceAtTime * item.quantity).toFixed(2).replace('.', ',')}</span>
                              </div>
                          ))}
                          <div className="pt-4 border-t border-dashed border-slate-200 space-y-3">
                              <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                  <span>Subtotal</span>
                                  <span>R$ {total.toFixed(2).replace('.', ',')}</span>
                              </div>
                              <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                  <span>Taxa de Entrega</span>
                                  <span className={deliveryType === 'delivery' ? 'text-primary' : 'text-emerald-500'}>
                                    {deliveryType === 'delivery' ? `R$ ${deliveryFee.toFixed(2).replace('.', ',')}` : 'Grátis'}
                                  </span>
                              </div>
                              <div className="flex justify-between items-center pt-2">
                                  <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Total do Pedido</span>
                                  <span className="text-2xl font-black text-slate-900 italic tracking-tighter">
                                    R$ {(total + (deliveryType === 'delivery' ? deliveryFee : 0)).toFixed(2).replace('.', ',')}
                                  </span>
                              </div>
                          </div>
                      </div>
                    </Card>
                </div>

                {/* Detalhes de Entrega e Pagamento */}
                <div className="grid grid-cols-1 gap-3">
                    <Card className="p-4 flex items-center gap-4 border-slate-50">
                        <div className="bg-blue-50 text-blue-600 p-3 rounded-2xl"><Truck size={20} /></div>
                        <div className="min-w-0">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Onde Entregar</p>
                            <p className="text-xs font-black text-slate-800 leading-tight uppercase truncate">
                              {deliveryType === 'delivery' ? 
                                `${street}, ${number}` : 
                                'Retirada no Balcão'}
                            </p>
                            {deliveryType === 'delivery' && (
                              <p className="text-[10px] text-slate-500 font-bold uppercase truncate">{neighborhood} • {city}/{state}</p>
                            )}
                        </div>
                    </Card>
                    <Card className="p-4 flex items-center gap-4 border-slate-50">
                        <div className="bg-orange-50 text-orange-600 p-3 rounded-2xl"><CreditCard size={20} /></div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Como pagar</p>
                            <p className="text-xs font-black text-slate-800 uppercase italic leading-tight">{paymentMethod}</p>
                        </div>
                    </Card>
                </div>

                <div className="bg-amber-50 rounded-2xl p-4 flex gap-3 items-center border border-amber-100 mb-10">
                    <Info size={18} className="text-amber-600 shrink-0" />
                    <p className="text-[10px] font-bold text-amber-800 leading-tight italic">
                        Ao finalizar, seu pedido entrará em produção imediatamente.
                    </p>
                </div>
            </div>
        )}
      </div>

      {/* BOTÃO FIXO */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-slate-100 z-30 shadow-[0_-20px_50px_rgba(0,0,0,0.05)]">
          {step === 'form' ? (
              <Button 
                onClick={validateAndNext}
                fullWidth
                size="lg"
                className="rounded-[2rem] text-sm uppercase tracking-widest italic gap-3"
              >
                Revisar Pedido <ChevronRight size={20} strokeWidth={3} />
              </Button>
          ) : (
              <Button 
                onClick={handleFinalSubmit}
                fullWidth
                size="lg"
                className="rounded-[2rem] text-sm uppercase tracking-widest italic gap-3 bg-emerald-500 hover:bg-emerald-600 shadow-emerald-100"
              >
                Tudo Certo, Enviar! <CheckCircle2 size={20} />
              </Button>
          )}
      </div>
    </div>
  );
};

export default DeliveryCheckout;
