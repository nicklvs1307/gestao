import React, { useState, useEffect } from 'react';
import { getUsers, deleteUser } from '../services/api';
import { Plus, Trash2, Edit2, Loader2, Mail, Utensils, RefreshCw, UserCheck, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';
import UserFormModal from '../components/UserFormModal';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { toast } from 'sonner';

const WaiterManagement: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<any | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await getUsers();
      setUsers(data.filter((u: any) => u.role === 'waiter'));
    } catch (error) {
      console.error('Erro ao buscar garçons:', error);
      toast.error('Falha ao carregar equipe.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleAddClick = () => {
    setUserToEdit({ role: 'waiter' });
    setIsModalOpen(true);
  };

  const handleEditClick = (user: any) => {
    setUserToEdit(user);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    setIsModalOpen(false);
    fetchUsers();
  };

  const handleDelete = async (userId: string) => {
    if (!window.confirm('Remover garçom da equipe permanentemente?')) return;
    try {
      await deleteUser(userId);
      toast.success('Garçom removido!');
      fetchUsers();
    } catch (error) {
      toast.error('Erro ao excluir.');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Minha Equipe</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
            <Utensils size={14} className="text-orange-500" /> Gestão de Garçons e Atendimento de Salão
          </p>
        </div>
        <div className="flex gap-3">
            <Button variant="outline" size="icon" className="bg-white rounded-xl h-12 w-12" onClick={fetchUsers}>
                <RefreshCw size={18} className={cn(isLoading && "animate-spin text-orange-500")} />
            </Button>
            <Button onClick={handleAddClick} className="rounded-xl px-8 italic font-black h-12 shadow-xl shadow-orange-900/10">
                <Plus size={20} className="mr-2" /> NOVO GARÇOM
            </Button>
        </div>
      </div>

      {isLoading && users.length === 0 ? (
        <div className="flex flex-col h-64 items-center justify-center opacity-30 gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
          <span className="text-[10px] font-black uppercase tracking-widest">Sincronizando Equipe...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {users.map(user => (
            <Card key={user.id} className="p-0 overflow-hidden border-2 border-slate-100 hover:border-orange-500/20 transition-all duration-300 hover:shadow-2xl bg-white group" noPadding>
                <div className="p-8 flex flex-col items-center text-center">
                    {/* Avatar Estilizado */}
                    <div className="relative mb-6">
                        <div className="w-20 h-20 rounded-[2rem] bg-slate-900 text-orange-500 flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 border-4 border-white">
                            <Utensils size={36} />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-500 text-white rounded-xl border-4 border-white flex items-center justify-center shadow-lg">
                            <UserCheck size={14} />
                        </div>
                    </div>
                    
                    <h3 className="font-black text-xl text-slate-900 uppercase italic tracking-tighter leading-none mb-2">{user.name || 'Sem Nome'}</h3>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6">
                        <Mail size={12} className="text-slate-300" />
                        {user.email}
                    </div>

                    <div className="w-full pt-6 border-t border-slate-50 flex gap-2">
                        <Button 
                            variant="secondary"
                            onClick={() => handleEditClick(user)}
                            className="flex-1 h-11 text-[10px] uppercase tracking-widest gap-2 rounded-xl italic font-black bg-slate-100"
                        >
                            <Edit2 size={14} /> EDITAR
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDelete(user.id)}
                            className="h-11 w-11 rounded-xl bg-rose-50 text-rose-400 hover:text-rose-600 hover:bg-rose-100 transition-all"
                        >
                            <Trash2 size={18} />
                        </Button>
                    </div>
                </div>
                {/* Visual Status Indicator */}
                <div className="h-1.5 w-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
            </Card>
          ))}
          
          {/* Card de Adicionar Rápido */}
          <Card 
            onClick={handleAddClick}
            className="p-8 border-2 border-dashed border-slate-200 bg-slate-50/30 flex flex-col items-center justify-center gap-4 group cursor-pointer hover:border-orange-500/50 hover:bg-orange-50/30 transition-all duration-300 min-h-[280px]"
          >
            <div className="w-14 h-14 rounded-3xl bg-white border border-slate-200 flex items-center justify-center text-slate-300 group-hover:text-orange-500 group-hover:border-orange-500 group-hover:scale-110 transition-all shadow-sm">
                <Plus size={28} />
            </div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] group-hover:text-orange-600 transition-colors">Contratar Membro</p>
          </Card>
        </div>
      )}

      {users.length === 0 && !isLoading && (
          <div className="py-24 flex flex-col items-center justify-center text-center opacity-20">
              <ShieldCheck size={80} strokeWidth={1} className="text-slate-300 mb-4" />
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] italic">Nenhum garçom vinculado à sua unidade</h3>
          </div>
      )}

      <UserFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        userToEdit={userToEdit}
      />
    </div>
  );
};

export default WaiterManagement;