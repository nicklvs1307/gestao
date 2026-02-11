import React, { useState, useEffect } from 'react';
import { getUsers, getRoles, deleteUser } from '../services/api';
import { 
    Plus, Trash2, Edit2, Loader2, Mail, User, ShieldCheck, 
    Award, Shield, Users, Search, RefreshCw, UserPlus, ShieldAlert
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import UserFormModal from './UserFormModal';
import RolePermissionsModal from './RolePermissionsModal';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { toast } from 'sonner';

const UserAndPermissions: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<any | null>(null);
  const [roleToEdit, setRoleToEdit] = useState<any | null>(null);
  const [tab, setTab] = useState<'users' | 'roles'>('users');

  const navigate = useNavigate();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [usersData, rolesData] = await Promise.all([getUsers(), getRoles()]);
      setUsers(usersData.filter((u: any) => !u.isSuperAdmin));
      setRoles(rolesData.filter((r: any) => r.name !== 'Super Admin'));
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
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Equipe & Permissões</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
            <ShieldCheck size={14} className="text-orange-500" /> Controle de Acesso e Níveis de Usuário
          </p>
        </div>
        
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100">
            <button 
                onClick={() => setTab('users')}
                className={cn(
                    "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    tab === 'users' ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"
                )}
            >
                Usuários
            </button>
            <button 
                onClick={() => setTab('roles')}
                className={cn(
                    "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    tab === 'roles' ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"
                )}
            >
                Cargos
            </button>
        </div>
      </div>

      {tab === 'users' ? (
          <div className="space-y-6">
              <div className="flex justify-between items-center">
                  <h3 className="text-sm font-black text-slate-900 uppercase italic">Colaboradores Ativos</h3>
                  <Button onClick={() => { setUserToEdit(null); setIsUserModalOpen(true); }} className="rounded-xl italic gap-2">
                      <UserPlus size={18} /> NOVO USUÁRIO
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
                          <Card key={u.id} className="p-6 border-slate-100 hover:shadow-xl transition-all group">
                              <div className="flex justify-between items-start mb-4">
                                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-orange-500 group-hover:text-white transition-all shadow-sm">
                                      <User size={24} />
                                  </div>
                                  <span className="bg-slate-50 text-slate-400 text-[8px] font-black px-2 py-1 rounded-lg border border-slate-100 uppercase tracking-widest">
                                      {u.roleRef?.name || 'Sem Cargo'}
                                  </span>
                              </div>
                              <h4 className="font-black text-slate-900 uppercase italic tracking-tighter text-lg mb-1">{u.name}</h4>
                              <p className="text-[10px] font-bold text-slate-400 uppercase truncate mb-6">{u.email}</p>
                              
                              <div className="flex gap-2 pt-4 border-t border-slate-50">
                                  <Button variant="secondary" className="flex-1 h-9 text-[10px] rounded-lg" onClick={() => { setUserToEdit(u); setIsUserModalOpen(true); }}>
                                      Editar
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-9 w-9 bg-slate-50 hover:bg-rose-50 hover:text-rose-500 rounded-lg" onClick={() => handleDeleteUser(u.id)}>
                                      <Trash2 size={16} />
                                  </Button>
                              </div>
                          </Card>
                      ))}
                  </div>
              )}
          </div>
      ) : (
          <div className="space-y-6">
              <div className="flex justify-between items-center">
                  <h3 className="text-sm font-black text-slate-900 uppercase italic">Cargos & Permissões</h3>
                  <div className="flex gap-3">
                    <Button variant="outline" className="rounded-xl italic bg-white" onClick={fetchData}>
                        <RefreshCw size={18} className={cn(isLoading && "animate-spin")} />
                    </Button>
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {roles.map(role => (
                      <Card key={role.id} className="p-8 border-slate-100 flex flex-col justify-between h-full group hover:border-orange-500/20 transition-all shadow-sm hover:shadow-2xl">
                          <div>
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-orange-500 text-white rounded-2xl shadow-lg shadow-orange-500/20 group-hover:scale-110 transition-transform">
                                    <Award size={24} />
                                </div>
                                <div>
                                    <h4 className="font-black text-xl text-slate-900 uppercase italic tracking-tighter leading-none mb-1">{role.name}</h4>
                                    <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest leading-none">{role.permissions?.length || 0} Permissões Ativas</p>
                                </div>
                            </div>
                            <p className="text-[11px] font-medium text-slate-400 leading-relaxed mb-8 h-8 line-clamp-2 italic">
                                {role.description || "Nenhuma descrição definida para este cargo."}
                            </p>
                          </div>

                          <Button 
                            className="w-full h-12 rounded-xl italic font-black uppercase tracking-widest text-[10px] gap-2"
                            onClick={() => {
                                setRoleToEdit(role);
                                setIsPermissionModalOpen(true);
                            }}
                          >
                              <Shield size={16} /> Configurar Acessos
                          </Button>
                      </Card>
                  ))}
                  
                  {/* Informativo */}
                  <Card className="p-8 border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-center gap-4">
                      <ShieldAlert size={40} className="text-slate-300" />
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Dica de Segurança</p>
                        <p className="text-[10px] font-medium text-slate-400 leading-tight max-w-[200px]">Crie cargos específicos para cada função e evite dar permissões de "Configurações" ou "Financeiro" para garçons e atendentes.</p>
                      </div>
                  </Card>
              </div>
          </div>
      )}

      <UserFormModal 
        isOpen={isUserModalOpen} 
        onClose={() => setIsUserModalOpen(false)} 
        onSave={fetchData} 
        userToEdit={userToEdit} 
      />

      {roleToEdit && (
          <RolePermissionsModal 
            isOpen={isPermissionModalOpen}
            onClose={() => setIsPermissionModalOpen(false)}
            roleId={roleToEdit.id}
            roleName={roleToEdit.name}
            currentPermissionIds={roleToEdit.permissions?.map((p: any) => p.id) || []}
            onSave={fetchData}
          />
      )}
    </div>
  );
};

export default UserAndPermissions;
