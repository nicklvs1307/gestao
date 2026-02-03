import React, { useState, useEffect } from 'react';
import { IMaskInput } from 'react-imask';
import { 
  MapPin, Phone, User, CreditCard, ShoppingBag, 
  ChevronRight, ArrowLeft, CheckCircle2, Package, Truck, Info, Search 
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useLocalCart } from '../hooks/useLocalCart';
import { LocationService } from '../services/LocationService';
import { getPaymentMethods } from '../services/api';

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
  const [step, setStep] = useState<'form' | 'review'>('form');
  
  // Tenta carregar dados salvos do localStorage para agilizar a compra
  const savedData = JSON.parse(localStorage.getItem('foodsys_customer_data') || '{}');

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

  // Carregar meios de pagamento e estados
  useEffect(() => {
    LocationService.getStates().then(setStatesList);
    if (restaurantId) {
        getPaymentMethods(restaurantId).then(methods => {
            const filtered = methods.filter(m => m.isActive && m.allowDelivery);
            setAvailableMethods(filtered);
            if (filtered.length > 0 && !paymentMethod) {
                setPaymentMethod(filtered[0].name);
            }
        });
    }
  }, [restaurantId]);

  // Carregar cidades quando o estado muda
  useEffect(() => {
    if (state) {
      LocationService.getCitiesByState(state).then(setCitiesList);
    } else {
      setCitiesList([]);
    }
  }, [state]);

  // Buscar endereço pelo CEP
  const handleCepBlur = async () => {
    if (cep.replace(/\D/g, '').length === 8) {
      setIsLoadingCep(true);
      const data = await LocationService.getAddressByCep(cep);
      setIsLoadingCep(false);
      
      if (data) {
        setStreet(data.logradouro);
        setNeighborhood(data.bairro);
        setState(data.uf);
        setCity(data.localidade);
        
        // Focar no número após preencher (opcional, requer ref)
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
      changeFor: paymentMethod === 'cash' && changeFor ? parseFloat(changeFor.replace(/[^\\d.,]/g, '').replace(',', '.')) : undefined,
    };

    // SALVA OS DADOS PARA A PRÓXIMA COMPRA
    localStorage.setItem('kicardapio_customer_data', JSON.stringify({
        name, phone, cep, street, number, neighborhood, city, state, deliveryType, paymentMethod
    }));

    onSubmit(deliveryInfo);
  };

  const formatMethod = (method: string) => {
      return method;
  };

  return (
    <div className="bg-white min-h-full flex flex-col relative">
      
      {/* HEADER */}
      <div className="sticky top-0 bg-white/90 backdrop-blur-md z-20 px-6 py-4 border-b border-slate-100 flex items-center gap-4">
          <button 
            onClick={() => step === 'review' ? setStep('form') : onClose()}
            className="p-2 bg-slate-100 text-slate-900 rounded-full hover:bg-slate-200 transition-colors"
          >
              <ArrowLeft size={20} />
          </button>
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 italic">
              {step === 'form' ? 'Dados do Pedido' : 'Revise seu Pedido'}
          </h2>
      </div>

      <div className="flex-1 p-6 pb-40 space-y-8 overflow-y-auto">
        
        {step === 'form' ? (
            /* --- TELA 1: FORMULÁRIO --- */
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <section className="space-y-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <User size={14} className="text-primary" /> Informações Pessoais
                    </h3>
                    <div className="space-y-3">
                        <input 
                            type="text" placeholder="Como te chamamos?" 
                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl h-14 px-5 text-slate-950 font-bold focus:border-primary focus:bg-white outline-none transition-all placeholder:text-slate-400"
                            value={name} onChange={e => setName(e.target.value)}
                        />
                        <IMaskInput
                            mask="(00) 00000-0000" placeholder="Seu WhatsApp"
                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl h-14 px-5 text-slate-950 font-bold focus:border-primary focus:bg-white outline-none transition-all placeholder:text-slate-400"
                            value={phone} onAccept={(v) => setPhone(String(v))}
                        />
                    </div>
                </section>

                <section className="space-y-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Package size={14} className="text-primary" /> Forma de Entrega
                    </h3>
                    <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
                        <button onClick={() => setDeliveryType('delivery')} className={cn("flex-1 py-3.5 rounded-xl font-black text-xs uppercase transition-all", deliveryType === 'delivery' ? "bg-white text-primary shadow-md" : "text-slate-400")}>Entrega</button>
                        <button onClick={() => setDeliveryType('pickup')} className={cn("flex-1 py-3.5 rounded-xl font-black text-xs uppercase transition-all", deliveryType === 'pickup' ? "bg-white text-primary shadow-md" : "text-slate-400")}>Retirada</button>
                    </div>

                    {deliveryType === 'delivery' && (
                        <div className="space-y-3 pt-2">
                            {/* CEP */}
                            <div className="relative">
                                <IMaskInput
                                    mask="00000-000" placeholder="CEP"
                                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl h-14 px-5 text-slate-950 font-bold outline-none"
                                    value={cep} 
                                    onAccept={(v) => setCep(String(v))}
                                    onBlur={handleCepBlur}
                                />
                                {isLoadingCep && <div className="absolute right-4 top-4 text-primary animate-spin"><Search size={20} /></div>}
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                {/* ESTADO */}
                                <select 
                                    className="col-span-1 bg-slate-50 border-2 border-slate-200 rounded-2xl h-14 px-2 text-slate-950 font-bold outline-none appearance-none"
                                    value={state}
                                    onChange={e => setState(e.target.value)}
                                >
                                    <option value="">UF</option>
                                    {statesList.map(s => <option key={s.sigla} value={s.sigla}>{s.sigla}</option>)}
                                </select>
                                
                                {/* CIDADE */}
                                <select 
                                    className="col-span-2 bg-slate-50 border-2 border-slate-200 rounded-2xl h-14 px-4 text-slate-950 font-bold outline-none"
                                    value={city}
                                    onChange={e => setCity(e.target.value)}
                                    disabled={!state}
                                >
                                    <option value="">{state ? 'Selecione a Cidade' : 'Selecione UF primeiro'}</option>
                                    {citiesList.map(c => <option key={c.nome} value={c.nome}>{c.nome}</option>)}
                                </select>
                            </div>

                            <input type="text" placeholder="Rua / Avenida" className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl h-14 px-5 text-slate-950 font-bold outline-none" value={street} onChange={e => setStreet(e.target.value)} />
                            <div className="grid grid-cols-3 gap-3">
                                <input type="text" placeholder="Nº" className="col-span-1 bg-slate-50 border-2 border-slate-200 rounded-2xl h-14 px-5 text-slate-950 font-bold outline-none" value={number} onChange={e => setNumber(e.target.value)} />
                                <input type="text" placeholder="Bairro" className="col-span-2 bg-slate-50 border-2 border-slate-200 rounded-2xl h-14 px-5 text-slate-950 font-bold outline-none" value={neighborhood} onChange={e => setNeighborhood(e.target.value)} />
                            </div>
                        </div>
                    )}
                </section>

                <section className="space-y-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <CreditCard size={14} className="text-primary" /> Forma de Pagamento
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        {availableMethods.map(m => (
                            <button 
                                key={m.id} 
                                onClick={() => setPaymentMethod(m.name)} 
                                className={cn(
                                    "p-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-1", 
                                    paymentMethod === m.name ? "border-primary bg-orange-50 text-primary" : "border-slate-100 text-slate-400 opacity-60"
                                )}
                            >
                                <span className="text-xl">
                                    {m.type === 'CASH' ? '💵' : 
                                     m.type === 'PIX' ? '📱' : 
                                     m.type.includes('CARD') ? '💳' : '📄'}
                                </span>
                                <span className="text-[9px] font-black uppercase">{m.name}</span>
                            </button>
                        ))}
                    </div>
                    {paymentMethod.toLowerCase().includes('dinheiro') && (
                        <IMaskInput
                            mask="R$ num"
                            blocks={{ num: { mask: Number, thousandsSeparator: '.', radix: ',', scale: 2, padFractionalZeros: true } }}
                            placeholder="Troco para quanto?"
                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl h-14 px-5 text-slate-950 font-bold outline-none mt-2"
                            value={changeFor} onAccept={(v) => setChangeFor(String(v))}
                        />
                    )}
                </section>
            </div>
        ) : (
            /* --- TELA 2: REVISÃO --- */
            <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 flex flex-col items-center text-center">
                    <CheckCircle2 size={48} className="text-emerald-500 mb-2" />
                    <h3 className="text-xl font-black text-emerald-900 italic tracking-tighter uppercase">Quase lá, {name.split(' ')[0]}!</h3>
                    <p className="text-emerald-700 text-sm font-medium">Confira se está tudo certinho antes de enviar.</p>
                </div>

                {/* Resumo dos Itens */}
                <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Seu Pedido</h4>
                    <div className="space-y-3">
                        {localCartItems.map((item, i) => (
                            <div key={i} className="flex justify-between items-start text-sm">
                                <span className="font-bold text-slate-800"><b className="text-primary">{item.quantity}x</b> {item.product.name}</span>
                                <span className="text-slate-500 font-medium">R$ {(item.priceAtTime * item.quantity).toFixed(2)}</span>
                            </div>
                        ))}
                        <div className="pt-4 mt-4 border-t border-dashed border-slate-200 space-y-2">
                            <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-tighter">
                                <span>Subtotal</span>
                                <span>R$ {total.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-tighter">
                                <span>Taxa de Entrega</span>
                                <span>{deliveryType === 'delivery' ? `R$ ${deliveryFee.toFixed(2)}` : 'Grátis'}</span>
                            </div>
                            <div className="flex justify-between text-lg font-black text-slate-900 italic pt-2">
                                <span>TOTAL FINAL</span>
                                <span className="text-emerald-600">R$ {(total + (deliveryType === 'delivery' ? deliveryFee : 0)).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Detalhes de Entrega e Pagamento */}
                <div className="grid grid-cols-1 gap-4">
                    <div className="bg-white border-2 border-slate-50 rounded-3xl p-5 flex items-start gap-4">
                        <div className="bg-blue-50 text-blue-600 p-3 rounded-2xl"><Truck size={20} /></div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Onde Entregar</p>
                            <p className="text-sm font-bold text-slate-800 leading-tight">
                              {deliveryType === 'delivery' ? 
                                `${street}, ${number} - ${neighborhood}` : 
                                'Retirada no Balcão'}
                            </p>
                            {deliveryType === 'delivery' && (
                              <p className="text-xs text-slate-500 mt-1">{city} - {state}</p>
                            )}
                        </div>
                    </div>
                    <div className="bg-white border-2 border-slate-50 rounded-3xl p-5 flex items-start gap-4">
                        <div className="bg-orange-50 text-orange-600 p-3 rounded-2xl"><CreditCard size={20} /></div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Como pagar</p>
                            <p className="text-sm font-bold text-slate-800 leading-tight">{formatMethod(paymentMethod)}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-amber-50 rounded-2xl p-4 flex gap-3 items-center border border-amber-100">
                    <Info size={18} className="text-amber-600 shrink-0" />
                    <p className="text-[10px] font-bold text-amber-800 leading-tight italic">
                        Ao clicar em finalizar, seu pedido será enviado para a nossa cozinha imediatamente.
                    </p>
                </div>
            </div>
        )}
      </div>

      {/* BOTÃO */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-slate-100 z-30 shadow-[0_-20px_50px_rgba(0,0,0,0.05)]">
          {step === 'form' ? (
              <button 
                onClick={validateAndNext}
                className="w-full bg-slate-900 text-white font-black py-5 rounded-[2rem] text-sm uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all"
              >
                Revisar Pedido <ChevronRight size={20} className="text-primary" />
              </button>
          ) : (
              <button 
                onClick={handleFinalSubmit}
                className="w-full bg-emerald-500 text-white font-black py-5 rounded-[2rem] text-sm uppercase tracking-[0.2em] shadow-2xl shadow-emerald-200 flex items-center justify-center gap-3 active:scale-95 transition-all"
              >
                Tudo Certo, Enviar! <CheckCircle2 size={20} />
              </button>
          )}
      </div>
    </div>
  );
};

export default DeliveryCheckout;