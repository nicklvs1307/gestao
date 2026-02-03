import React, { useState, useEffect } from 'react';
import { getUsers, deleteUser } from '../services/api';
import { Plus, Trash2, Edit2, Loader2, Mail, User, ShieldCheck, ShoppingBag, Utensils, Truck, MoreVertical } from 'lucide-react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import UserFormModal from './UserFormModal';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<any | null>(null);

  const navigate = useNavigate();

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await getUsers();
      // Oculta entregadores desta lista, pois eles têm gestão própria
      setUsers(data.filter((u: any) => u.role !== 'driver'));
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddClick = () => {
    setUserToEdit(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (user: any) => {
    if (user.role === 'driver') {
        // Redireciona para a tela específica de entregadores que tem os campos financeiros
        navigate('/drivers');
        return;
    }
    setUserToEdit(user);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    setIsModalOpen(false);
    fetchUsers();
  };

  const handleDelete = async (userId: string) => {
    if (!window.confirm('Tem certeza que deseja remover este usuário?')) return;
    try {
      await deleteUser(userId);
      fetchUsers();
    } catch (error) {
      alert('Erro ao excluir usuário.');
    }
  };

  const getRoleBadge = (role: string) => {
      switch(role) {
          case 'admin': return { label: 'Administrador', icon: ShieldCheck, color: 'text-blue-600 bg-blue-50 border-blue-100' };
          case 'staff': return { label: 'Atendente', icon: ShoppingBag, color: 'text-slate-600 bg-slate-50 border-slate-100' };
          case 'waiter': return { label: 'Garçom', icon: Utensils, color: 'text-orange-600 bg-orange-50 border-orange-100' };
          case 'driver': return { label: 'Entregador', icon: Truck, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' };
          default: return { label: role, icon: User, color: 'text-gray-600 bg-gray-50 border-gray-100' };
      }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight italic uppercase">Gestão de Equipe</h2>
          <p className="text-slate-500 text-sm font-medium">Controle quem acessa o seu sistema.</p>
        </div>
        <div className="flex items-center gap-3">
            <button 
                onClick={() => navigate('/drivers')}
                className="flex items-center gap-2 bg-blue-50 text-blue-600 px-6 py-3 rounded-2xl font-bold hover:bg-blue-100 transition-all border border-blue-100 shadow-sm active:scale-95"
            >
                <Truck size={20} /> Equipe de Entrega
            </button>
            <button 
                onClick={handleAddClick}
                className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95"
            >
                <Plus size={20} /> Adicionar Usuário
            </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map(user => {
            const badge = getRoleBadge(user.role);
            return (
              <div key={user.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                {/* Background Decoration */}
                <div className={cn("absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-[0.03] transition-transform group-hover:scale-110", badge.color.split(' ')[1])} />
                
                <div className="flex items-center gap-4 mb-6 relative z-10">
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner", badge.color)}>
                        <badge.icon size={28} />
                    </div>
                    <div>
                        <h3 className="font-black text-slate-900 uppercase italic tracking-tighter leading-none mb-1">{user.name || 'Sem Nome'}</h3>
                        <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border", badge.color)}>
                            {badge.label}
                        </span>
                    </div>
                </div>

                <div className="space-y-2 mb-8 relative z-10">
                    <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                        <Mail size={14} className="text-slate-300" />
                        {user.email}
                    </div>
                </div>

                <div className="flex gap-2 relative z-10">
                    <button 
                        onClick={() => handleEditClick(user)}
                        className="flex-1 bg-slate-50 text-slate-600 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
                    >
                        <Edit2 size={14} /> Editar
                    </button>
                    <button 
                        onClick={() => handleDelete(user.id)}
                        className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-90"
                    >
                        <Trash2 size={20} />
                    </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Formulário Corrigido */}
      <UserFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        userToEdit={userToEdit}
      />
    </div>
  );
};

export default UserManagement;