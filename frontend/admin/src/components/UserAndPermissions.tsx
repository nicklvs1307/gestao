import React, { useState, useEffect } from 'react';
import { getUsers, deleteUser } from '../services/api';
import { 
    Plus, Trash2, Edit2, Loader2, Mail, User, ShieldCheck, 
    Award, Shield, Users, Search, RefreshCw, UserPlus, ShieldAlert
} from 'lucide-react';
import { cn } from '../lib/utils';
import UserFormModal from './UserFormModal';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { toast } from 'sonner';

const UserAndPermissions: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<any | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const usersData = await getUsers();
      setUsers(usersData.filter((u: any) => !u.isSuperAdmin));
    } catch (error: any) {
      toast.error("Erro ao carregar dados de equipe");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Excluir este usuário?')) return;
    try {
      await deleteUser(userId);
      toast.success('Membro removido.');
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Equipe & Acessos</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
            <ShieldCheck size={14} className="text-orange-500" /> Gestão Individual de Permissões
          </p>
        </div>
        
        <Button onClick={() => { setUserToEdit(null); setIsUserModalOpen(true); }} className="rounded-2xl italic gap-2 shadow-xl shadow-slate-200 h-12 px-8 uppercase font-black text-[10px] tracking-widest">
            <UserPlus size={18} /> ADICIONAR COLABORADOR
        </Button>
      </div>

      <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Equipe Ativa ({users.length})</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={fetchData} className="text-slate-400 hover:text-orange-500">
                <RefreshCw size={14} className={cn(isLoading && "animate-spin")} />
              </Button>
          </div>

          {isLoading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-4 opacity-30">
                  <Loader2 className="animate-spin text-orange-500" size={32} />
                  <p className="text-[10px] font-black uppercase tracking-widest">Sincronizando equipe...</p>
              </div>
          ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {users.map(u => (
                      <Card key={u.id} className="p-6 border-slate-100 hover:shadow-xl transition-all group overflow-hidden relative">
                          {/* Background Decoration */}
                          <div className="absolute -right-4 -top-4 text-slate-50 opacity-10 group-hover:text-orange-500 group-hover:opacity-5 transition-all">
                            <Shield size={120} />
                          </div>

                          <div className="flex justify-between items-start mb-4 relative z-10">
                              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-orange-500 group-hover:text-white transition-all shadow-sm">
                                  <User size={24} />
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="bg-slate-900 text-white text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-widest mb-1">
                                    {u.roleRef?.name || 'Personalizado'}
                                </span>
                                <span className="text-[7px] font-black text-orange-500 uppercase tracking-tighter">
                                    {u.allPermissions?.length || 0} PERMISSÕES
                                </span>
                              </div>
                          </div>
                          
                          <div className="relative z-10">
                            <h4 className="font-black text-slate-900 uppercase italic tracking-tighter text-lg mb-1">{u.name}</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase truncate mb-6">{u.email}</p>
                          </div>
                          
                          <div className="flex gap-2 pt-4 border-t border-slate-50 relative z-10">
                              <Button variant="secondary" className="flex-1 h-10 text-[10px] rounded-xl font-black uppercase tracking-widest" onClick={() => { setUserToEdit(u); setIsUserModalOpen(true); }}>
                                  CONFIGURAR
                              </Button>
                              <Button variant="ghost" size="icon" className="h-10 w-10 bg-slate-50 hover:bg-rose-50 hover:text-rose-500 rounded-xl transition-colors" onClick={() => handleDeleteUser(u.id)}>
                                  <Trash2 size={16} />
                              </Button>
                          </div>
                      </Card>
                  ))}

                  <button 
                    onClick={() => { setUserToEdit(null); setIsUserModalOpen(true); }}
                    className="p-6 border-2 border-dashed border-slate-100 rounded-[2rem] flex flex-col items-center justify-center gap-4 text-slate-300 hover:border-orange-500/20 hover:text-orange-500 transition-all bg-slate-50/30 group"
                  >
                    <div className="w-12 h-12 rounded-2xl border-2 border-dashed border-current flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Plus size={24} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Novo Membro</span>
                  </button>
              </div>
          )}
      </div>

      <UserFormModal 
        isOpen={isUserModalOpen} 
        onClose={() => setIsUserModalOpen(false)} 
        onSave={fetchData} 
        userToEdit={userToEdit} 
      />
    </div>
  );
};

export default UserAndPermissions;
