import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
    Search, User, MapPin, Plus, X, Store, 
    ChevronRight, Loader2, UserPlus, Star, Info,
    Edit2, Trash2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';
import { searchCustomers, createCustomer } from '../services/api';
import { toast } from 'sonner';
import { useScrollLock } from '../hooks/useScrollLock';

interface Address {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
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
    state?: string;
    complement?: string;
    consolidatedAddresses?: { label: string, data?: any }[];
}

interface CustomerSelectionModalProps {
    isOpen: boolean;
    isDeliveryMode?: boolean;
    onClose: () => void;
    onSelectCustomer: (data: { 
        name: string; 
        phone: string; 
        addressStr: string; 
        addressStructured?: Address;
        deliveryType: 'delivery' | 'retirada' 
    }) => void;
}

export const CustomerSelectionModal: React.FC<CustomerSelectionModalProps> = ({ isOpen, isDeliveryMode = false, onClose, onSelectCustomer }) => {
    useScrollLock(isOpen);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<Customer[]>([]);
    const [restaurantSettings, setRestaurantSettings] = useState<any>(null);
    const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
    const [isAddingAddress, setIsAddingAddress] = useState<string | null>(null);
    const [editingAddress, setEditingAddress] = useState<{ customerId: string; address: Address; index: number } | null>(null);
    
    const [newAddress, setNewAddress] = useState<Address>({
        street: '', number: '', neighborhood: '', city: '', state: '', complement: '', reference: '', zipCode: ''
    });
    const [addingAddressForm, setAddingAddressForm] = useState<Address>({
        street: '', number: '', neighborhood: '', city: '', state: '', complement: '', reference: '', zipCode: ''
    });

    const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });

    useEffect(() => {
        if (!isOpen) return;
        const settings = localStorage.getItem('restaurant_settings');
        if (settings) {
            const parsed = JSON.parse(settings);
            setRestaurantSettings(parsed);
            setNewAddress(prev => {
                if (!prev.street && parsed.city) {
                    return { ...prev, city: parsed.city || '', state: parsed.state || '' };
                }
                return prev;
            });
        }
    }, [isOpen]);

    // Busca com Debounce
    const mountedRef = React.useRef(true);
    const searchIdRef = React.useRef(0);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    const performSearch = useCallback(async (query: string) => {
        if (!query || query.length < 3) return;
        
        const searchId = ++searchIdRef.current;
        setIsLoading(true);
        
        try {
            const data = await searchCustomers(query);
            if (!mountedRef.current || searchId !== searchIdRef.current) return;
            
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

                if (c.street) {
                    const full = `${c.street}, ${c.number || 'S/N'} - ${c.neighborhood || ''}${c.city ? ', ' + c.city : ''}`;
                    add(full, { street: c.street, number: c.number, neighborhood: c.neighborhood, city: c.city, state: c.state, zipCode: c.zipCode, complement: c.complement, reference: c.reference });
                }
                if (c.address) add(c.address);
                c.deliveryOrders?.forEach((o: any) => { 
                    if (o.address) add(o.address, { complement: o.complement, reference: o.reference }); 
                });

                return { ...c, consolidatedAddresses: addressList };
            });

            setResults(finalResults);
        } catch (error) {
            if (!mountedRef.current || searchId !== searchIdRef.current) return;
            console.error(error);
        } finally {
            if (mountedRef.current && searchId === searchIdRef.current) {
                setIsLoading(false);
            }
        }
    }, []);

    const debouncedSearchTerm = useRef<string>('');
    useEffect(() => {
        const timer = setTimeout(() => {
            debouncedSearchTerm.current = searchTerm;
            if (searchTerm.length >= 3) {
                setResults([]);
                performSearch(searchTerm);
            } else if (searchTerm.length === 0) {
                setResults([]);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, performSearch]);

    const handleSelectAddress = useCallback((customer: Customer, addrObj: { label: string, data?: any }) => {
        onSelectCustomer({
            name: customer.name,
            phone: customer.phone,
            addressStr: addrObj.label,
            addressStructured: addrObj.data,
            deliveryType: 'delivery'
        });
        onClose();
    }, [onSelectCustomer, onClose]);

    const handleCounterSale = useCallback((customer?: Customer) => {
        onSelectCustomer({
            name: customer?.name || 'Venda Balcão',
            phone: customer?.phone || '',
            addressStr: 'Retirada no Balcão',
            deliveryType: 'retirada'
        });
        onClose();
    }, [onSelectCustomer, onClose]);

    const handleNoCustomer = useCallback(() => {
        onSelectCustomer({
            name: '',
            phone: '',
            addressStr: 'Retirada no Balcão',
            deliveryType: 'retirada'
        });
        onClose();
    }, [onSelectCustomer, onClose]);

    const handleSaveNewAddress = useCallback((customerId: string) => {
        const customer = results.find(c => c.id === customerId);
        if (customer) {
            const label = `${addingAddressForm.street}, ${addingAddressForm.number} - ${addingAddressForm.neighborhood}, ${addingAddressForm.city}`;
            handleSelectAddress(customer, { label, data: addingAddressForm });
            setIsAddingAddress(null);
        }
    }, [results, addingAddressForm, handleSelectAddress]);

    const handleEditAddress = useCallback((customer: Customer, addr: { label: string, data?: any }, index: number) => {
        let addressData = addr.data;
        
        if (!addressData || !addressData.street) {
            const label = addr.label || '';
            const parts = label.split(/[,.-]/);
            
            const streetNumMatch = label.match(/^(.+?),\s*(\d+|\d+\s*\w*)\s*[-–]\s*(.+?)(?:,\s*(.+))?$/i);
            if (streetNumMatch) {
                addressData = {
                    street: (streetNumMatch[1] || '').trim(),
                    number: (streetNumMatch[2] || '').trim(),
                    neighborhood: (streetNumMatch[3] || '').trim(),
                    city: (streetNumMatch[4] || '').trim(),
                    state: '',
                    complement: addr.data?.complement || '',
                    reference: addr.data?.reference || '',
                    zipCode: addr.data?.zipCode || ''
                };
            } else {
                addressData = {
                    street: parts[0] || '',
                    number: '',
                    neighborhood: parts[1] || '',
                    city: parts[2] || '',
                    state: '',
                    complement: addr.data?.complement || '',
                    reference: addr.data?.reference || '',
                    zipCode: addr.data?.zipCode || ''
                };
            }
        }
        
        setEditingAddress({ customerId: customer.id, address: addressData, index });
        setIsAddingAddress(null);
    }, []);

    const handleSaveEditedAddress = useCallback((customerId: string, originalIndex: number) => {
        const customer = results.find(c => c.id === customerId);
        if (customer && customer.consolidatedAddresses) {
            const label = `${editingAddress?.address.street}, ${editingAddress?.address.number} - ${editingAddress?.address.neighborhood}, ${editingAddress?.address.city}`;
            const updatedAddresses = [...customer.consolidatedAddresses];
            updatedAddresses[originalIndex] = { label, data: editingAddress?.address };
            customer.consolidatedAddresses = updatedAddresses;
            setResults([...results]);
            toast.success("Endereço atualizado!");
            setEditingAddress(null);
        }
    }, [results, editingAddress]);

    const handleDeleteAddress = useCallback((customerId: string, index: number) => {
        const customer = results.find(c => c.id === customerId);
        if (customer && customer.consolidatedAddresses) {
            const updatedAddresses = customer.consolidatedAddresses.filter((_, i) => i !== index);
            customer.consolidatedAddresses = updatedAddresses;
            setResults([...results]);
            toast.success("Endereço removido!");
        }
    }, [results]);

    const handleCreateCustomerAndAddress = useCallback(async () => {
        if (!newCustomer.name) return toast.error("Nome obrigatório");
        setIsLoading(true);
        try {
            let addrStr = 'Retirada no Balcão';
            if (newAddress.street) {
                addrStr = `${newAddress.street}, ${newAddress.number} - ${newAddress.neighborhood}, ${newAddress.city}`;
            }
            await createCustomer({ ...newCustomer, ...newAddress, address: addrStr });
            toast.success("Cliente registrado!");
            onSelectCustomer({
                name: newCustomer.name, phone: newCustomer.phone, addressStr: addrStr,
                addressStructured: newAddress.street ? newAddress : undefined,
                deliveryType: newAddress.street ? 'delivery' : 'retirada'
            });
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Erro ao salvar");
        } finally {
            setIsLoading(false);
        }
    }, [newCustomer, newAddress, onSelectCustomer, onClose]);

    const handleClearSearch = useCallback(() => setSearchTerm(''), []);

    const resetAddress = { street: '', number: '', neighborhood: '', city: '', state: '', complement: '', reference: '', zipCode: '' };

    const toggleAddingAddress = useCallback((customerId: string) => {
        if (isAddingAddress === customerId) {
            setIsAddingAddress(null);
        } else {
            setAddingAddressForm(resetAddress);
            setIsAddingAddress(customerId);
        }
    }, [isAddingAddress]);

    const toggleCreatingCustomer = useCallback(() => {
        setIsCreatingCustomer(prev => !prev);
    }, []);

    const handleEditAddressChange = useCallback((field: keyof Address, value: string) => {
        if (editingAddress) {
            setEditingAddress({
                ...editingAddress,
                address: { ...editingAddress.address, [field]: value }
            });
        }
    }, [editingAddress]);

    const handleCustomerNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setNewCustomer(prev => ({ ...prev, name: e.target.value }));
    }, []);

    const handleCustomerPhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setNewCustomer(prev => ({ ...prev, phone: e.target.value }));
    }, []);

    const handleAddressChange = useCallback((field: keyof Address, value: string) => {
        setNewAddress(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleAddingAddressChange = useCallback((field: keyof Address, value: string) => {
        setAddingAddressForm(prev => ({ ...prev, [field]: value }));
    }, []);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <div onClick={onClose} className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" />
            
            <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header Compacto e Profissional */}
                <div className="bg-slate-900 px-4 py-3 flex items-center justify-between border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500 rounded-lg text-white shadow-lg"><User size={18} /></div>
                        <div>
                            <h2 className="text-white text-sm font-black uppercase italic tracking-tight leading-none">Seleção de Cliente</h2>
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">PDV Inteligente • Cardápio Tablets</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-slate-400 transition-all"><X size={20} /></button>
                </div>

                <div className="flex flex-col lg:flex-row h-full overflow-hidden">
                    
                    {/* Painel de Busca e Resultados */}
                    <div className={cn("flex-1 flex flex-col border-r border-slate-100", isCreatingCustomer && "hidden lg:flex")}>
                        <div className="p-3 bg-slate-50/50 border-b border-slate-100 flex gap-2">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                                <input 
                                    autoFocus
                                    type="text" 
                                    placeholder="Nome ou telefone..." 
                                    className="w-full h-10 pl-10 pr-8 rounded-xl bg-white border border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-700 uppercase text-xs"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && <button onClick={handleClearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"><X size={14}/></button>}
                            </div>
                            {!isDeliveryMode && (
                                <Button onClick={() => handleNoCustomer()} className="h-10 bg-slate-900 hover:bg-black text-white px-4 rounded-xl shadow-lg flex items-center gap-2 text-[10px] font-black uppercase italic">
                                    <Store size={14} /> Balcão (Rápido)
                                </Button>
                            )}
                            <Button onClick={() => { setIsCreatingCustomer(true); setSearchTerm(''); }} className="h-10 bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-xl shadow-lg flex items-center gap-2 text-[10px] font-black uppercase italic">
                                <UserPlus size={14} /> Novo Cliente
                            </Button>
                        </div>

                        {/* Lista de Resultados Densa */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-30">
                                    <Loader2 className="animate-spin text-blue-500" size={24}/>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Pesquisando...</span>
                                </div>
                            ) : results.length > 0 ? (
                                <div className="divide-y divide-slate-50">
                                    {results.map((customer, index) => (
                                        <div key={`${customer.id}-${index}`} className="group hover:bg-slate-50/50 transition-all">
                                            <div className="p-3 flex items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-bold text-slate-800 text-xs uppercase truncate leading-none">{customer.name}</h3>
                                                        <span className="text-[10px] text-slate-400 font-medium px-1.5 py-0.5 bg-slate-100 rounded-md">{customer.phone}</span>
                                                    </div>
                                                    
                                                    {/* Endereços em Linha ou Minimalistas */}
                                                    <div className="mt-2 space-y-1">
                                                        {customer.consolidatedAddresses?.map((addr, i) => (
                                                            <div key={i} className="flex items-center gap-1">
                                                                <button 
                                                                    onClick={() => handleSelectAddress(customer, addr)}
                                                                    className="flex-1 flex items-center gap-2 p-1.5 rounded-lg border border-slate-100 bg-white hover:border-blue-200 hover:bg-blue-50 transition-all group/addr"
                                                                >
                                                                    <MapPin size={12} className="text-slate-300 group-hover/addr:text-blue-400" />
                                                                    <span className="text-[10px] font-bold text-slate-500 uppercase truncate text-left">{addr.label}</span>
                                                                    <ChevronRight size={10} className="ml-auto opacity-0 group-hover/addr:opacity-100 text-blue-400" />
                                                                </button>
                                                                <Button 
                                                                    size="sm" 
                                                                    variant="ghost"
                                                                    onClick={() => handleEditAddress(customer, addr, i)}
                                                                    className="h-7 w-7 p-0 rounded-lg text-slate-300 hover:text-amber-500 hover:bg-amber-50 shrink-0"
                                                                >
                                                                    <Edit2 size={12} />
                                                                </Button>
                                                                <Button 
                                                                    size="sm" 
                                                                    variant="ghost"
                                                                    onClick={() => handleDeleteAddress(customer.id, i)}
                                                                    className="h-7 w-7 p-0 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 shrink-0"
                                                                >
                                                                    <Trash2 size={12} />
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-1 shrink-0">
                                                    <Button 
                                                        size="sm" 
                                                        variant="ghost"
                                                        onClick={() => toggleAddingAddress(customer.id)}
                                                        className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50"
                                                    >
                                                        <Plus size={16} />
                                                    </Button>
                                                    <Button 
                                                        size="sm" 
                                                        variant="ghost"
                                                        onClick={() => handleCounterSale(customer)}
                                                        className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-50"
                                                    >
                                                        <Store size={16} />
                                                    </Button>
                                                </div>
                                            </div>

                                            {isAddingAddress === customer.id && (
                                                <div className="bg-slate-50/80 border-t border-slate-100 overflow-hidden">
                                                    <div className="p-3">
                                                        <AddressForm address={addingAddressForm} onChange={setAddingAddressForm} compact />
                                                        <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-slate-200/50">
                                                            <Button size="sm" variant="ghost" className="h-7 text-[9px] uppercase font-black" onClick={() => setIsAddingAddress(null)}>Cancelar</Button>
                                                            <Button size="sm" className="h-7 bg-blue-600 text-white text-[9px] uppercase font-black px-4 shadow-md" onClick={() => handleSaveNewAddress(customer.id)}>Confirmar</Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {editingAddress?.customerId === customer.id && (
                                                <div className="bg-amber-50/80 border-t border-amber-100 overflow-hidden">
                                                    <div className="p-3">
                                                        <div className="text-[9px] font-black text-amber-600 uppercase mb-2">Editando Endereço</div>
                                                        <AddressForm 
                                                            address={editingAddress.address} 
                                                            onChange={handleEditAddressChange} 
                                                            compact 
                                                        />
                                                        <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-slate-200/50">
                                                            <Button size="sm" variant="ghost" className="h-7 text-[9px] uppercase font-black" onClick={() => setEditingAddress(null)}>Cancelar</Button>
                                                            <Button size="sm" className="h-7 bg-amber-600 text-white text-[9px] uppercase font-black px-4 shadow-md" onClick={() => handleSaveEditedAddress(customer.id, editingAddress.index)}>Salvar</Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : searchTerm.length >= 3 ? (
                                <div className="py-12 px-6 text-center">
                                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3"><Info className="text-slate-300" size={20} /></div>
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Nenhum registro encontrado</p>
                                    <Button onClick={toggleCreatingCustomer} className="mt-4 h-9 bg-blue-500 text-white rounded-xl text-[9px] font-black uppercase italic shadow-lg shadow-blue-500/20">Cadastrar "{searchTerm}"</Button>
                                </div>
                            ) : (
                                <div className="py-12 text-center opacity-20">
                                    <UserPlus className="mx-auto mb-3" size={32} />
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">Aguardando termo de busca...</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Painel Lateral de Novo Cadastro (Fixo em Desktop, Modal em Mobile) */}
                    <div className={cn(
                        "w-full lg:w-[320px] bg-slate-50 p-4 border-l border-slate-100 flex flex-col",
                        !isCreatingCustomer && "hidden"
                    )}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-black text-slate-900 uppercase italic flex items-center gap-2">
                                <UserPlus size={14} className="text-blue-500" /> Novo Cliente
                            </h3>
                            {isCreatingCustomer && <button onClick={toggleCreatingCustomer} className="lg:hidden text-slate-400"><X size={18}/></button>}
                        </div>
                        
                        <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-1">
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                                <input className="w-full h-9 px-3 rounded-lg bg-white border border-slate-200 text-[11px] font-bold focus:border-blue-500 outline-none" value={newCustomer.name} onChange={handleCustomerNameChange} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp / Fone</label>
                                <input className="w-full h-9 px-3 rounded-lg bg-white border border-slate-200 text-[11px] font-bold" value={newCustomer.phone} onChange={handleCustomerPhoneChange} />
                            </div>

                            <div className="pt-4 border-t border-slate-200">
                                <h4 className="text-[9px] font-black text-slate-400 uppercase mb-3 flex items-center gap-2 italic">Endereço de Entrega</h4>
                                <AddressForm address={newAddress} onChange={handleAddressChange} compact />
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-200">
                            <Button onClick={handleCreateCustomerAndAddress} disabled={isLoading} className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xl shadow-blue-600/20 font-black uppercase text-[10px] italic flex items-center justify-center gap-2 transition-all active:scale-95">
                                {isLoading ? <Loader2 className="animate-spin" size={16}/> : <><Star size={14} /> Finalizar Cadastro</>}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AddressForm = ({ address, onChange, compact }: { address: Address, onChange: (a: Address) => void, compact?: boolean }) => {
    const handleChange = (field: keyof Address, value: string) => {
        onChange({ ...address, [field]: value });
    };

    return (
        <div className="grid grid-cols-12 gap-2">
            <div className="col-span-5">
                <input 
                    placeholder="CEP" 
                    className="w-full h-8 px-2 rounded-lg bg-white border border-slate-200 text-[10px] font-bold outline-none focus:border-blue-500" 
                    value={address.zipCode} 
                    onChange={e => handleChange('zipCode', e.target.value)}
                />
            </div>
            <div className="col-span-7">
                <input 
                    placeholder="Rua / Av." 
                    className="w-full h-8 px-2 rounded-lg bg-white border border-slate-200 text-[10px] font-bold outline-none focus:border-blue-500" 
                    value={address.street} 
                    onChange={e => handleChange('street', e.target.value)}
                />
            </div>
            <div className="col-span-3">
                <input 
                    placeholder="Nº" 
                    className="w-full h-8 px-2 rounded-lg bg-white border border-slate-200 text-[10px] font-bold outline-none focus:border-blue-500" 
                    value={address.number} 
                    onChange={e => handleChange('number', e.target.value)}
                />
            </div>
            <div className="col-span-9">
                <input 
                    placeholder="Bairro" 
                    className="w-full h-8 px-2 rounded-lg bg-white border border-slate-200 text-[10px] font-bold outline-none focus:border-blue-500" 
                    value={address.neighborhood} 
                    onChange={e => handleChange('neighborhood', e.target.value)}
                />
            </div>
            <div className="col-span-8">
                <input 
                    placeholder="Cidade" 
                    className="w-full h-8 px-2 rounded-lg bg-white border border-slate-200 text-[10px] font-bold outline-none focus:border-blue-500" 
                    value={address.city} 
                    onChange={e => handleChange('city', e.target.value)}
                />
            </div>
            <div className="col-span-4">
                <input 
                    placeholder="UF" 
                    className="w-full h-8 px-2 rounded-lg bg-white border border-slate-200 text-[10px] font-bold outline-none focus:border-blue-500" 
                    value={address.state} 
                    onChange={e => handleChange('state', e.target.value)}
                />
            </div>
            <div className="col-span-12">
                <input 
                    placeholder="Complemento (Apto, Bloco, etc.)" 
                    className="w-full h-8 px-2 rounded-lg bg-white border border-slate-200 text-[10px] font-bold outline-none focus:border-blue-500" 
                    value={address.complement} 
                    onChange={e => handleChange('complement', e.target.value)}
                />
            </div>
            <div className="col-span-12">
                <input 
                    placeholder="Ponto de Referência" 
                    className="w-full h-8 px-2 rounded-lg bg-white border border-slate-200 text-[10px] font-bold outline-none focus:border-blue-500" 
                    value={address.reference} 
                    onChange={e => handleChange('reference', e.target.value)}
                />
            </div>
        </div>
    );
};
