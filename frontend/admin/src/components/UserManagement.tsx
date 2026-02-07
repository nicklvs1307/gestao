import React, { useState, useEffect } from 'react';
import { getUsers, deleteUser } from '../services/api';
import { Plus, Trash2, Edit2, Loader2, Mail, User, ShieldCheck, ShoppingBag, Utensils, Truck } from 'lucide-react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import UserFormModal from './UserFormModal';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

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
          case 'admin': 
          case 'superadmin':
              return { label: 'Administrador', icon: ShieldCheck, color: 'text-orange-600 bg-orange-50 border-orange-100' };
          case 'staff': 
              return { label: 'Atendente', icon: ShoppingBag, color: 'text-blue-600 bg-blue-50 border-blue-100' };
          case 'waiter': 
              return { label: 'Garçom', icon: Utensils, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' };
          default: 
              return { label: role, icon: User, color: 'text-slate-600 bg-slate-50 border-slate-100' };
      }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Minha Equipe</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
            <User size={14} className="text-orange-500" /> Gerenciamento de Membros e Permissões
          </p>
        </div>
        <div className="flex items-center gap-3">
            <Button 
                variant="outline"
                className="bg-white rounded-xl"
                onClick={() => navigate('/drivers')}
            >
                <Truck size={18} /> Equipe de Entrega
            </Button>
            <Button 
                onClick={handleAddClick}
                className="rounded-xl px-6 italic"
            >
                <Plus size={18} /> NOVO USUÁRIO
            </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-4 opacity-30">
          <Loader2 className="animate-spin text-orange-500" size={32} />
          <span className="text-[10px] font-black uppercase tracking-widest">Carregando Equipe...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {users.map(user => {
            const badge = getRoleBadge(user.role);
            return (
              <Card key={user.id} className="p-6 group relative overflow-hidden flex flex-col justify-between h-full border-slate-100 hover:border-orange-500/20 transition-all duration-300 shadow-sm hover:shadow-xl">
                {/* Visual Accent */}
                <div className={cn("absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.05] transition-transform group-hover:scale-125", badge.color.split(' ')[1])} />
                
                <div className="relative z-10">
                    <div className="flex items-start justify-between mb-6">
                        <div className={cn("w-14 h-14 rounded-[1.25rem] flex items-center justify-center shadow-lg transition-transform group-hover:rotate-3", badge.color, "shadow-current/5")}>
                            <badge.icon size={28} />
                        </div>
                        <span className={cn("text-[8px] font-black uppercase px-2 py-1 rounded-lg border tracking-widest", badge.color)}>
                            {badge.label}
                        </span>
                    </div>

                    <div className="space-y-1 mb-8">
                        <h3 className="font-black text-slate-900 uppercase italic tracking-tighter text-lg leading-tight">{user.name || 'Sem Nome'}</h3>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                            <Mail size={12} />
                            {user.email}
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 relative z-10 pt-4 border-t border-slate-50">
                    <Button 
                        variant="secondary"
                        onClick={() => handleEditClick(user)}
                        className="flex-1 h-10 text-[10px] uppercase tracking-widest gap-2 rounded-xl italic"
                    >
                        <Edit2 size={14} /> Editar
                    </Button>
                    <Button 
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(user.id)}
                        className="h-10 w-10 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-all"
                    >
                        <Trash2 size={18} />
                    </Button>
                </div>
              </Card>
            );
          })}

          {/* Card de Adicionar Rápido */}
          <Card 
            onClick={handleAddClick}
            className="p-6 border-2 border-dashed border-slate-200 bg-slate-50/30 flex flex-col items-center justify-center gap-4 group cursor-pointer hover:border-orange-500/50 hover:bg-orange-50/30 transition-all duration-300 min-h-[220px]"
          >
            <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-300 group-hover:text-orange-500 group-hover:border-orange-500 transition-all">
                <Plus size={24} />
            </div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] group-hover:text-orange-600 transition-colors">Adicionar Membro</p>
          </Card>
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

export default UserManagement;