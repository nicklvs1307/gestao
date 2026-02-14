import React, { useState, useEffect } from 'react';
import { 
    Search, User, MapPin, Plus, X, Truck, Store, 
    ChevronRight, ChevronDown, Edit, Loader2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
import { searchCustomers, createCustomer } from '../services/api';
import { toast } from 'sonner';

interface Address {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string; // Novo campo
    complement?: string;
    reference?: string;
    zipCode?: string;
}

interface Customer {
    id: string;
    name: string;
    phone: string;
    addresses?: Address[];
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string; // Novo campo
    complement?: string;
}

interface CustomerSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectCustomer: (data: { 
        name: string; 
        phone: string; 
        addressStr: string; 
        addressStructured?: Address;
        deliveryType: 'delivery' | 'pickup' 
    }) => void;
}

export const CustomerSelectionModal: React.FC<CustomerSelectionModalProps> = ({ isOpen, onClose, onSelectCustomer }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<Customer[]>([]);
    const [restaurantSettings, setRestaurantSettings] = useState<any>(null);
    
    // Estado para "Novo Endereço"
    const [isAddingAddress, setIsAddingAddress] = useState<string | null>(null);
    const [newAddress, setNewAddress] = useState<Address>({
        street: '', number: '', neighborhood: '', city: '', state: '', complement: '', reference: '', zipCode: ''
    });

    // Carregar configurações da loja para pegar cidade/estado padrão
    useEffect(() => {
        const loadSettings = async () => {
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;
            if (user?.restaurantId) {
                // Tenta pegar do localStorage primeiro ou faz fetch se necessário
                const settings = localStorage.getItem('restaurant_settings');
                if (settings) {
                    const parsed = JSON.parse(settings);
                    setRestaurantSettings(parsed);
                    // Atualiza endereço inicial com dados da loja
                    setNewAddress(prev => ({
                        ...prev,
                        city: parsed.city || '',
                        state: parsed.state || ''
                    }));
                }
            }
        };
        if (isOpen) loadSettings();
    }, [isOpen]);
    
    // Estado para "Novo Cliente"
    const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
    const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });

    // Debounce da busca
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm.length >= 3) performSearch();
            else setResults([]);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const performSearch = async () => {
        setIsLoading(true);
        try {
            const data = await searchCustomers(searchTerm);
            const customersArray = Array.isArray(data) ? data : (data.customers || []);
            
            const finalResults = customersArray.map((c: any) => {
                const addressList: { label: string, data?: any }[] = [];
                const seen = new Set<string>();

                const add = (label: string, structured?: any) => {
                    const clean = label.trim().toUpperCase();
                    if (clean && clean !== 'RETIRADA NO BALCÃO' && !seen.has(clean)) {
                        addressList.push({ label, data: structured });
                        seen.add(clean);
                    }
                };

                // 1. Endereço Principal Estruturado
                if (c.street) {
                    const full = `${c.street}, ${c.number || 'S/N'} - ${c.neighborhood || ''}${c.city ? ', ' + c.city : ''}${c.state ? ' / ' + c.state : ''}`;
                    add(full, {
                        street: c.street,
                        number: c.number,
                        neighborhood: c.neighborhood,
                        city: c.city,
                        state: c.state,
                        zipCode: c.zipCode,
                        complement: c.complement
                    });
                }

                // 2. Campo address genérico (se for diferente do estruturado)
                if (c.address) add(c.address);

                // 3. Histórico de Pedidos
                c.deliveryOrders?.forEach((o: any) => {
                    if (o.address) add(o.address);
                });

                return { ...c, consolidatedAddresses: addressList };
            });

            setResults(finalResults);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectAddress = (customer: Customer, addrObj: { label: string, data?: any }) => {
        onSelectCustomer({
            name: customer.name,
            phone: customer.phone,
            addressStr: addrObj.label,
            addressStructured: addrObj.data,
            deliveryType: 'delivery'
        });
        onClose();
    };

    const handleCounterSale = (customer?: Customer) => {
        onSelectCustomer({
            name: customer?.name || 'Venda Balcão',
            phone: customer?.phone || '',
            addressStr: 'Retirada no Balcão',
            deliveryType: 'pickup'
        });
        onClose();
    };

    const handleSaveNewAddress = (customerId: string) => {
        const customer = results.find(c => c.id === customerId);
        if (customer) {
            const label = `${newAddress.street}, ${newAddress.number} - ${newAddress.neighborhood}, ${newAddress.city} / ${newAddress.state}`;
            handleSelectAddress(customer, { label, data: newAddress });
        }
    };

    const handleCreateCustomerAndAddress = async () => {
        if (!newCustomer.name || !newCustomer.phone) {
            toast.error("Preencha nome e telefone");
            return;
        }
        
        setIsLoading(true);
        try {
            // Formata string para exibição incluindo cidade e estado
            let addrStr = 'Retirada no Balcão';
            if (newAddress.street) {
                addrStr = `${newAddress.street}, ${newAddress.number} - ${newAddress.neighborhood}, ${newAddress.city} / ${newAddress.state}`;
            }

            // Salva no banco de dados
            await createCustomer({
                ...newCustomer,
                ...newAddress,
                address: addrStr
            });

            toast.success("Cliente cadastrado com sucesso!");

            onSelectCustomer({
                name: newCustomer.name,
                phone: newCustomer.phone,
                addressStr: addrStr,
                addressStructured: newAddress.street ? newAddress : undefined,
                deliveryType: newAddress.street ? 'delivery' : 'pickup'
            });
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Erro ao salvar cliente");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[250] flex items-start justify-center pt-20 px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            
            <motion.div initial={{ scale: 0.95, opacity: 0, y: -20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-5xl bg-[#f0f2f5] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                
                {/* Header de Busca */}
                <div className="bg-white p-4 flex gap-4 items-center shadow-sm z-20">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                            autoFocus
                            type="text" 
                            placeholder="Buscar por nome, telefone (35 99...)" 
                            className="w-full h-12 pl-12 pr-10 rounded-lg border-2 border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-700 uppercase"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={16}/></button>}
                    </div>
                    
                    <Button onClick={() => setIsCreatingCustomer(true)} className="h-12 bg-blue-500 hover:bg-blue-600 text-white font-bold uppercase rounded-lg px-6 gap-2">
                        <User size={18} /> Novo Cliente
                    </Button>
                    <Button onClick={() => handleCounterSale()} className="h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase rounded-lg px-6 gap-2">
                        <Store size={18} /> Venda Balcão (Sem Cliente)
                    </Button>
                    {/* Botão de Fechar */}
                     <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Conteúdo Principal */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    
                    {/* Modo Criação de Cliente */}
                    {isCreatingCustomer && (
                         <Card className="p-6 border-blue-200 shadow-md bg-white animate-in slide-in-from-top-4">
                            <div className="flex justify-between items-start mb-6">
                                <h3 className="text-lg font-black text-slate-800 uppercase italic">Novo Cadastro</h3>
                                <button onClick={() => setIsCreatingCustomer(false)} className="text-slate-400 hover:text-rose-500"><X size={20}/></button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <Input label="Nome Completo" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} autoFocus />
                                <Input label="Telefone / Celular" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} />
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-4 flex items-center gap-2"><MapPin size={14}/> Endereço Inicial (Opcional)</h4>
                                <AddressForm address={newAddress} onChange={setNewAddress} />
                            </div>
                            <div className="flex justify-end mt-6 gap-3">
                                <Button variant="ghost" onClick={() => setIsCreatingCustomer(false)}>Cancelar</Button>
                                <Button onClick={handleCreateCustomerAndAddress} className="bg-green-500 hover:bg-green-600 text-white px-8">Confirmar Cadastro</Button>
                            </div>
                         </Card>
                    )}

                    {/* Lista de Resultados */}
                    {isLoading ? (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" size={32}/></div>
                    ) : results.length === 0 && searchTerm.length >= 3 && !isCreatingCustomer ? (
                        <div className="text-center py-10 text-slate-400 font-bold uppercase">Nenhum cliente encontrado.</div>
                    ) : (
                        <div className="space-y-3">
                            {results.map(customer => (
                                <div key={customer.id} className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                                    {/* Linha do Cliente */}
                                    <div className="flex flex-col md:flex-row md:items-center p-4 gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-slate-900 text-lg uppercase leading-tight">{customer.name}</h3>
                                                <button className="text-slate-400 hover:text-blue-500 text-[10px] uppercase font-bold flex items-center gap-1"><Edit size={12}/> Editar</button>
                                            </div>
                                            <p className="text-slate-500 font-medium text-sm mt-1">{customer.phone}</p>
                                        </div>
                                        
                                        {/* Ações Rápidas do Cliente */}
                                        <div className="flex gap-2 self-start md:self-center shrink-0">
                                            <Button 
                                                size="sm" 
                                                onClick={() => setIsAddingAddress(isAddingAddress === customer.id ? null : customer.id)}
                                                className={cn("h-9 uppercase text-[10px] font-bold px-4 gap-2 transition-colors", isAddingAddress === customer.id ? "bg-slate-800 text-white" : "bg-blue-500 text-white hover:bg-blue-600")}
                                            >
                                                <Plus size={14} /> Novo Endereço
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                onClick={() => handleCounterSale(customer)}
                                                className="h-9 bg-blue-500 hover:bg-blue-600 text-white uppercase text-[10px] font-bold px-4 gap-2"
                                            >
                                                <Store size={14} /> Balcão
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Área de Endereços */}
                                    <div className="bg-slate-50 border-t border-slate-100 p-2 space-y-2">
                                        
                                        {/* Formulário de Novo Endereço Inline */}
                                        {isAddingAddress === customer.id && (
                                            <div className="bg-white border-2 border-blue-100 rounded-lg p-4 m-2 animate-in slide-in-from-top-2">
                                                <h4 className="text-xs font-bold text-blue-600 uppercase mb-3">Adicionando Novo Endereço</h4>
                                                <AddressForm address={newAddress} onChange={setNewAddress} />
                                                <div className="flex justify-end gap-2 mt-4">
                                                    <Button size="sm" variant="ghost" onClick={() => setIsAddingAddress(null)}>Cancelar</Button>
                                                    <Button size="sm" className="bg-blue-600 text-white" onClick={() => handleSaveNewAddress(customer.id)}>Usar este Endereço</Button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Lista de Endereços Existentes */}
                                        {customer.consolidatedAddresses && customer.consolidatedAddresses.length > 0 ? (
                                            customer.consolidatedAddresses.map((addr: any, idx: number) => (
                                                <div key={idx} className="flex items-center justify-between bg-blue-500 hover:bg-blue-600 text-white p-3 rounded mx-2 cursor-pointer transition-colors group" onClick={() => handleSelectAddress(customer, addr)}>
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <MapPin size={16} className="shrink-0 text-blue-200" />
                                                        <span className="text-sm font-bold uppercase truncate">
                                                            {addr.label}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            !isAddingAddress && <p className="text-center text-[10px] text-slate-400 uppercase italic py-2">Nenhum endereço cadastrado</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

// Subcomponente de Formulário de Endereço
const AddressForm = ({ address, onChange }: { address: Address, onChange: (a: Address) => void }) => {
    const handleChange = (field: keyof Address, value: string) => {
        onChange({ ...address, [field]: value });
    };

    return (
        <div className="grid grid-cols-12 gap-3">
            <div className="col-span-3">
                <Input label="CEP" placeholder="00000-000" value={address.zipCode} onChange={e => handleChange('zipCode', e.target.value)} className="h-10 text-xs" />
            </div>
            <div className="col-span-6">
                <Input label="Rua / Avenida" placeholder="Nome da via" value={address.street} onChange={e => handleChange('street', e.target.value)} className="h-10 text-xs" />
            </div>
            <div className="col-span-3">
                <Input label="Número" placeholder="123" value={address.number} onChange={e => handleChange('number', e.target.value)} className="h-10 text-xs" />
            </div>
            <div className="col-span-4">
                <Input label="Bairro" placeholder="Centro" value={address.neighborhood} onChange={e => handleChange('neighborhood', e.target.value)} className="h-10 text-xs" />
            </div>
            <div className="col-span-4">
                <Input label="Cidade" placeholder="Cidade" value={address.city} onChange={e => handleChange('city', e.target.value)} className="h-10 text-xs" />
            </div>
            <div className="col-span-4">
                <Input label="Estado" placeholder="UF" value={address.state} onChange={e => handleChange('state', e.target.value)} className="h-10 text-xs" />
            </div>
            <div className="col-span-12">
                <Input label="Complemento / Referência" placeholder="Apto 101, Próximo ao mercado..." value={address.complement} onChange={e => handleChange('complement', e.target.value)} className="h-10 text-xs" />
            </div>
        </div>
    );
};
