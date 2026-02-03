import React, { useState, useEffect } from 'react';
import { getUsers, createUser, updateUser, deleteUser } from '../services/api';
import { Truck, Plus, Trash2, Edit2, Loader2, Phone, Mail, User, DollarSign, X } from 'lucide-react';
import { cn } from '../lib/utils';

const DriverManagement: React.FC = () => {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<any>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [paymentType, setPaymentType] = useState('DELIVERY'); // DAILY, SHIFT, DELIVERY
  const [baseRate, setBaseRate] = useState(0);
  const [bonusPerDelivery, setBonusPerDelivery] = useState(0);

  const fetchDrivers = async () => {
    setIsLoading(true);
    try {
      const allUsers = await getUsers();
      setDrivers(allUsers.filter((u: any) => u.role === 'driver'));
    } catch (error) {
      console.error('Erro ao buscar entregadores:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const handleOpenModal = (driver: any = null) => {
    setEditingDriver(driver);
    if (driver) {
      setName(driver.name || '');
      setEmail(driver.email || '');
      setPhone(driver.phone || '');
      setIsActive(driver.isActive ?? true);
      setPaymentType(driver.paymentType || 'DELIVERY');
      setBaseRate(driver.baseRate || 0);
      setBonusPerDelivery(driver.bonusPerDelivery || 0);
      setPassword('');
    } else {
      setName('');
      setEmail('');
      setPhone('');
      setIsActive(true);
      setPaymentType('DELIVERY');
      setBaseRate(0);
      setBonusPerDelivery(0);
      setPassword('');
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = { 
        name, email, phone, isActive, paymentType, 
        baseRate: Number(baseRate), 
        bonusPerDelivery: Number(bonusPerDelivery),
        password: password || undefined, 
        role: 'driver' 
      };

      if (editingDriver) {
        await updateUser(editingDriver.id, data);
      } else {
        await createUser(data);
      }
      setIsModalOpen(false);
      fetchDrivers();
    } catch (error) {
      alert('Erro ao salvar entregador');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja remover este entregador?')) {
      try {
        await deleteUser(id);
        fetchDrivers();
      } catch (error) {
        alert('Erro ao deletar entregador');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Equipe de Entregadores</h2>
          <p className="text-slate-500 text-sm">Gerencie os motoboys e parceiros de entrega.</p>
        </div>
        <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg"
        >
          <Plus size={20} /> Adicionar Entregador
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {drivers.map(driver => (
            <div key={driver.id} className={cn(
                "bg-white p-6 rounded-3xl border shadow-sm hover:shadow-md transition-all group relative",
                !driver.isActive ? "border-slate-200 opacity-60" : "border-slate-100"
            )}>
                {!driver.isActive && (
                    <div className="absolute top-4 right-4 bg-slate-100 text-slate-500 text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-tighter">Inativo</div>
                )}
                <div className="flex items-center gap-4 mb-4">
                    <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner",
                        driver.isActive ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400"
                    )}>
                        <Truck size={28} />
                    </div>
                    <div>
                        <h3 className="font-black text-slate-900 leading-none">{driver.name}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                            {driver.paymentType === 'DAILY' ? 'Diária' : driver.paymentType === 'SHIFT' ? 'Turno' : 'Por Entrega'}
                        </p>
                    </div>
                </div>

                <div className="space-y-2 mb-6 bg-slate-50 p-4 rounded-2xl">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                        <Phone size={14} className="text-slate-400" /> {driver.phone || 'Sem telefone'}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                        <DollarSign size={14} className="text-emerald-500" /> 
                        R$ {(driver.baseRate || 0).toFixed(2)} + R$ {(driver.bonusPerDelivery || 0).toFixed(2)}/ent
                    </div>
                </div>

                <div className="flex gap-2">
                    <button 
                        onClick={() => handleOpenModal(driver)}
                        className="flex-1 bg-slate-900 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-slate-200"
                    >
                        <Edit2 size={14} /> Ajustar
                    </button>
                    <button 
                        onClick={() => handleDelete(driver.id)}
                        className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>
          ))}
          {drivers.length === 0 && (
              <div className="col-span-full py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Nenhum entregador cadastrado</p>
              </div>
          )}
        </div>
      )}

      {/* Modal de Formulário */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-900">{editingDriver ? 'Editar Entregador' : 'Novo Entregador'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-900"><X size={24} /></button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Nome Completo</label>
                        <input required type="text" className="w-full bg-slate-50 border-slate-200 border-2 rounded-2xl h-12 px-4 focus:border-primary outline-none font-bold text-slate-700 transition-all" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Telefone / WhatsApp</label>
                        <input type="text" className="w-full bg-slate-50 border-slate-200 border-2 rounded-2xl h-12 px-4 focus:border-primary outline-none font-bold text-slate-700 transition-all" value={phone} onChange={e => setPhone(e.target.value)} />
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Status</label>
                        <select className="w-full bg-slate-50 border-slate-200 border-2 rounded-2xl h-12 px-4 focus:border-primary outline-none font-bold text-slate-700 transition-all" value={isActive ? 'true' : 'false'} onChange={e => setIsActive(e.target.value === 'true')}>
                            <option value="true">Ativo / Disponível</option>
                            <option value="false">Inativo / Fora</option>
                        </select>
                    </div>
                </div>

                <div className="p-6 bg-slate-900 rounded-[2rem] space-y-4 shadow-xl">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Remuneração e Acerto</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Tipo de Base</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['DAILY', 'SHIFT', 'DELIVERY'].map(type => (
                                    <button key={type} type="button" onClick={() => setPaymentType(type)} className={cn("py-2 rounded-xl text-[10px] font-black uppercase transition-all border-2", paymentType === type ? "bg-primary border-primary text-white" : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white")}>
                                        {type === 'DAILY' ? 'Diária' : type === 'SHIFT' ? 'Turno' : 'Só Entregas'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block italic">Valor Base (R$)</label>
                            <input type="number" step="0.01" className="w-full bg-slate-800 border-slate-700 border-2 rounded-xl h-12 px-4 focus:border-primary outline-none font-bold text-white transition-all" value={baseRate} onChange={e => setBaseRate(Number(e.target.value))} />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block italic">Bônus/Entrega (R$)</label>
                            <input type="number" step="0.01" className="w-full bg-slate-800 border-slate-700 border-2 rounded-xl h-12 px-4 focus:border-primary outline-none font-bold text-white transition-all" value={bonusPerDelivery} onChange={e => setBonusPerDelivery(Number(e.target.value))} />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Email / Login</label>
                        <input required type="email" className="w-full bg-slate-50 border-slate-200 border-2 rounded-2xl h-12 px-4 focus:border-primary outline-none font-bold text-slate-700 transition-all" value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                    <div className="col-span-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Senha</label>
                        <input required={!editingDriver} type="password" placeholder={editingDriver ? "••••••" : ""} className="w-full bg-slate-50 border-slate-200 border-2 rounded-2xl h-12 px-4 focus:border-primary outline-none font-bold text-slate-700 transition-all" value={password} onChange={e => setPassword(e.target.value)} />
                    </div>
                </div>

                <div className="pt-4 flex gap-3">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-100 text-slate-500 py-5 rounded-[1.5rem] font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
                    <button type="submit" className="flex-[2] bg-slate-900 text-white py-5 rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-2xl hover:bg-black transition-all">Salvar Configurações</button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverManagement;
