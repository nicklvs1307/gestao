import React, { useState, useEffect, useMemo } from 'react';
import { getUsers, deleteUser } from '../services/api';
import { 
    Plus, Trash2, Edit2, Loader2, Mail, User, ShieldCheck, 
    Award, Shield, Users, Search, RefreshCw, UserPlus, ShieldAlert,
    Filter, X
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import UserFormModal from './UserFormModal';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { toast } from 'sonner';

const UserAndPermissions: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<any | null>(null);
  const [confirmData, setConfirmData] = useState<{open: boolean; title: string; message: string; onConfirm: () => void}>({open: false, title: '', message: '', onConfirm: () => {}});
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

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

  const filteredUsers = useMemo(() => {
    let result = users;
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(u => 
        u.name.toLowerCase().includes(query) || 
        u.email.toLowerCase().includes(query)
      );
    }
    
    if (roleFilter !== 'all') {
      result = result.filter(u => u.roleRef?.name === roleFilter || (roleFilter === 'custom' && !u.roleId));
    }
    
    return result;
  }, [users, searchQuery, roleFilter]);

  const uniqueRoles = useMemo(() => {
    const roles = new Set(users.map(u => u.roleRef?.name).filter(Boolean));
    return Array.from(roles);
  }, [users]);

  const handleDeleteUser = async (userId: string) => {
    setConfirmData({open: true, title: 'Confirmar Exclusão', message: 'Excluir este usuário?', onConfirm: async () => {
      try {
        await deleteUser(userId);
        toast.success('Membro removido.');
        fetchData();
      } catch (error: any) {
        toast.error(error.message);
      }
    }});
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      {/* Header Premium */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/20">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
              Equipe <span className="text-primary">& Acessos</span>
            </h1>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
              Gestão Individual de Permissões
            </p>
          </div>
        </div>
        
        <Button onClick={() => { setUserToEdit(null); setIsUserModalOpen(true); }} className="rounded-2xl italic gap-2 shadow-xl shadow-slate-200 h-12 px-8 uppercase font-black text-[10px] tracking-widest">
            <UserPlus size={18} /> ADICIONAR COLABORADOR
        </Button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 w-full md:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar colaborador..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold uppercase tracking-widest focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          <select 
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest focus:border-primary outline-none cursor-pointer"
          >
            <option value="all">Todos os Cargos</option>
            {uniqueRoles.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
            <option value="custom">Personalizado</option>
          </select>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
            {filteredUsers.length} de {users.length} colaboradores
          </span>
        </div>

        <Button variant="ghost" size="sm" onClick={fetchData} className="text-slate-400 hover:text-orange-500">
          <RefreshCw size={14} className={cn(isLoading && "animate-spin")} />
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none">
          <div className="flex items-center gap-2 mb-2">
            <Users size={14} className="text-orange-400" />
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Total Equipe</span>
          </div>
          <p className="text-2xl font-black italic tracking-tighter">{users.length}</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[7px] font-bold text-orange-400 uppercase">colaboradores</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <Award size={14} className="text-blue-500" />
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Com Cargo</span>
          </div>
          <p className="text-2xl font-black italic tracking-tighter text-blue-600">
            {users.filter(u => u.roleId).length}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[7px] font-bold text-slate-400 uppercase">com role definida</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert size={14} className="text-purple-500" />
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Personalizados</span>
          </div>
          <p className="text-2xl font-black italic tracking-tighter text-purple-600">
            {users.filter(u => !u.roleId).length}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[7px] font-bold text-slate-400 uppercase">permissão manual</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <UserPlus size={14} className="text-emerald-500" />
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Permissões</span>
          </div>
          <p className="text-2xl font-black italic tracking-tighter text-emerald-600">
            {users.reduce((acc, u) => acc + (u.allPermissions?.length || 0), 0)}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[7px] font-bold text-slate-400 uppercase">total concedidas</span>
          </div>
        </Card>
      </div>

      {/* User Cards Grid */}
      {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="p-6 border-slate-100 animate-pulse bg-slate-50 min-h-[220px]" />
            ))}
          </div>
      ) : filteredUsers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredUsers.map((u, idx) => (
                  <motion.div
                    key={u.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                  <Card className="p-6 border-slate-100 hover:shadow-xl transition-all group overflow-hidden relative">
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
                  </motion.div>
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
      ) : (
          <Card className="p-16 text-center border-2 border-dashed border-slate-200 bg-slate-50/30">
            <div className="flex flex-col items-center opacity-40">
              <Users size={64} strokeWidth={1} className="text-slate-400/40 mb-4" />
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] italic">Nenhum colaborador</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase mt-2">
                {searchQuery || roleFilter !== 'all' ? 'Tente ajustar os filtros' : 'Adicione um novo membro à equipe'}
              </p>
            </div>
          </Card>
      )}

      <UserFormModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onSave={fetchData}
        userToEdit={userToEdit}
      />
      <ConfirmDialog isOpen={confirmData.open} onClose={() => setConfirmData({...confirmData, open: false})} onConfirm={() => {confirmData.onConfirm(); setConfirmData({...confirmData, open: false});}} title={confirmData.title} message={confirmData.message} />
    </div>
  );
};

export default UserAndPermissions;
