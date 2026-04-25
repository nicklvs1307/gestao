import React, { useState, useEffect } from 'react';
import { getUairangoSettings, updateUairangoSettings, importUairangoMenu } from '../services/api';
import { ArrowLeft, Save, Loader2, Info, ShoppingBag, RefreshCw, Database, Download, CheckCircle, XCircle, Key, Link as LinkIcon, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

const UairangoSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [establishmentId, setEstablishmentId] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [lastImport, setLastImport] = useState<Date | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const settings = await getUairangoSettings();
        setToken(settings.uairangoToken || '');
        setEstablishmentId(settings.uairangoEstablishmentId || '');
        setIsActive(settings.uairangoActive || false);
      } catch (error) {
        console.error(error);
        toast.error('Erro ao carregar configurações do UaiRango.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateUairangoSettings({ 
        uairangoToken: token,
        uairangoEstablishmentId: establishmentId,
        uairangoActive: isActive 
      });
      toast.success('Configurações UaiRango salvas!');
    } catch (error) {
      toast.error('Falha ao salvar configurações.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImportMenu = async () => {
    if (!token || !establishmentId) {
      toast.error('Configure o Token e o ID antes de importar.');
      return;
    }

    setIsImporting(true);
    try {
      const result = await importUairangoMenu();
      toast.success(`Importação concluída: ${result.importedCount} itens importados!`);
      setLastImport(new Date());
    } catch (error) {
      console.error(error);
      toast.error('Erro ao importar cardápio do UaiRango.');
    } finally {
      setIsImporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-orange-500" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Premium */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/integrations')}
          className="p-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
        >
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <div className="flex items-center gap-4 flex-1">
          <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-lg">
            <img src={require('../assets/uairango-logo.png').default} alt="UaiRango" className="w-10 h-10 object-contain" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">UaiRango</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border ${
                isActive 
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20' 
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                {isActive ? 'Conectado' : 'Desativado'}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Integração de Cardápio</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card de Configuração */}
          <Card className="overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                  <LinkIcon size={18} className="text-orange-600" />
                </div>
                <div>
                  <h2 className="font-black text-slate-900 uppercase text-sm tracking-tight">Configuração da API</h2>
                  <p className="text-[10px] text-slate-400 font-medium">Token de acesso e ID do estabelecimento</p>
                </div>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Token de Desenvolvedor</label>
                <Input 
                  value={token} 
                  onChange={e => setToken(e.target.value)} 
                  placeholder="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..." 
                  className="h-12 bg-slate-50 border-slate-200 focus:bg-white font-mono text-sm"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">ID do Estabelecimento</label>
                <Input 
                  value={establishmentId} 
                  onChange={e => setEstablishmentId(e.target.value)} 
                  placeholder="Ex: 12345" 
                  className="h-12 bg-slate-50 border-slate-200 focus:bg-white"
                />
              </div>

              {/* Toggle Ativo */}
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`relative w-14 h-8 rounded-full transition-all ${
                    isActive ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-all ${
                    isActive ? 'left-7' : 'left-1'
                  }`} />
                </button>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-700">Ativar Integração UaiRango</p>
                  <p className="text-[10px] text-slate-400">Sincronizar cardápio automaticamente</p>
                </div>
                {isActive ? (
                  <CheckCircle size={20} className="text-emerald-500" />
                ) : (
                  <XCircle size={20} className="text-slate-400" />
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => navigate('/integrations')} className="flex-1 h-12">
                  Voltar
                </Button>
                <Button type="submit" disabled={isSaving} className="flex-1 h-12 bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20">
                  {isSaving ? <Loader2 className="animate-spin mr-2" size={14} /> : <Save size={14} className="mr-2" />}
                  Salvar Configurações
                </Button>
              </div>
            </form>
          </Card>

          {/* Card de Importação */}
          <Card className="overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                    <Database size={18} className="text-amber-600" />
                  </div>
                  <div>
                    <h2 className="font-black text-slate-900 uppercase text-sm tracking-tight">Importar Cardápio</h2>
                    <p className="text-[10px] text-slate-400 font-medium">Buscar produtos do UaiRango</p>
                  </div>
                </div>
                {lastImport && (
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 uppercase">Última importação</p>
                    <p className="text-xs font-black text-slate-600">{lastImport.toLocaleDateString('pt-BR')}</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-xs text-amber-800 leading-relaxed">
                      Ao importar, o sistema buscará <span className="font-black">categorias, produtos e fotos</span> diretamente do UaiRango. 
                    </p>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      Pizzas e sabores serão organizados automaticamente no formato <span className="font-black">Produto Base + Grupo de Sabores</span>. 
                      Itens com o mesmo nome serão atualizados.
                    </p>
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleImportMenu} 
                disabled={isImporting || !token || !establishmentId}
                className="w-full h-14 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-xl shadow-orange-500/30 text-lg font-black uppercase tracking-wider"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="animate-spin mr-3" size={18} />
                    Importando...
                  </>
                ) : (
                  <>
                    <Download size={18} className="mr-3" />
                    Importar Cardápio do UaiRango
                  </>
                )}
              </Button>
              
              {(!token || !establishmentId) && (
                <p className="text-center text-xs text-slate-400">
                  Configure o Token e o ID para habilitar a importação
                </p>
              )}
            </div>
          </Card>
        </div>

        {/* Coluna Lateral - Info */}
        <div className="space-y-6">
          {/* Info */}
          <Card className="overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white">
              <div className="flex items-center gap-2">
                <Info size={16} className="text-blue-500" />
                <h3 className="font-black text-slate-800 text-sm uppercase">Como Obter</h3>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-black text-slate-500">1</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Acesse o painel do <span className="font-black">UaiRango</span> e vá em Configurações
                </p>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-black text-slate-500">2</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Copie o <span className="font-black">Token de Desenvolvedor</span> da seção API
                </p>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-black text-slate-500">3</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  O <span className="font-black">ID do Estabelecimento</span> está no perfil da sua conta
                </p>
              </div>
            </div>
          </Card>

          {/* Status */}
          <Card className="overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-2">
                <Key size={16} className="text-slate-500" />
                <h3 className="font-black text-slate-800 text-sm uppercase">Status</h3>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Token</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                  token ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                }`}>
                  {token ? 'Configurado' : 'Pendente'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Estabelecimento</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                  establishmentId ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                }`}>
                  {establishmentId ? establishmentId : 'Pendente'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Integração</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                  isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                }`}>
                  {isActive ? 'Ativa' : 'Inativa'}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UairangoSettingsPage;