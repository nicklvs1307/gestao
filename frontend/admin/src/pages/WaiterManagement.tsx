import React, { useState, useEffect } from 'react';
import { getUsers, deleteUser } from '../services/api';
import { Plus, Trash2, Edit2, Loader2, Mail, Utensils } from 'lucide-react';
import { cn } from '../lib/utils';
import UserFormModal from '../components/UserFormModal';

const WaiterManagement: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<any | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await getUsers();
      // Filtra APENAS garçons para esta tela
      setUsers(data.filter((u: any) => u.role === 'waiter'));
    } catch (error) {
      console.error('Erro ao buscar garçons:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddClick = () => {
    setUserToEdit({ role: 'waiter' }); // Pré-seleciona garçom
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
    if (!window.confirm('Remover garçom da equipe?')) return;
    try {
      await deleteUser(userId);
      fetchUsers();
    } catch (error) {
      alert('Erro ao excluir.');
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ui-card p-4">
        <div>
          <h2 className="text-xl font-black text-foreground uppercase tracking-tighter italic flex items-center gap-2">
            <Utensils className="text-primary" size={24} /> Garçons
          </h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">Gestão de equipe e acessos.</p>
        </div>
        <button 
            onClick={handleAddClick}
            className="ui-button-primary h-10 px-6 text-[10px] uppercase tracking-widest"
        >
            <Plus size={18} /> Novo Garçom
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {users.map(user => (
            <div key={user.id} className="ui-card p-4 hover:shadow-md transition-all group relative overflow-hidden flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 mb-3 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                    <Utensils size={24} />
                </div>
                
                <h3 className="font-bold text-foreground uppercase italic tracking-tight text-sm">{user.name || 'Sem Nome'}</h3>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-4 truncate w-full">{user.email}</p>
                
                <div className="flex w-full gap-2 mt-auto pt-3 border-t border-border/50">
                    <button 
                        onClick={() => handleEditClick(user)}
                        className="flex-1 ui-button-secondary h-9 text-[9px] uppercase tracking-widest"
                    >
                        Editar
                    </button>
                    <button 
                        onClick={() => handleDelete(user.id)}
                        className="w-9 h-9 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
          ))}
          
          {users.length === 0 && (
              <div className="col-span-full py-16 text-center ui-card bg-muted/10 border-dashed">
                  <Utensils size={40} className="mx-auto text-slate-200 mb-2" />
                  <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Equipe vazia</p>
              </div>
          )}
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