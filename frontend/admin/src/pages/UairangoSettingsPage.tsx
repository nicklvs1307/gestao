import React, { useState, useEffect } from 'react';
import { getUairangoSettings, updateUairangoSettings, importUairangoMenu } from '../services/api';
import { ArrowLeft, Save, Loader2, Info, ShoppingBag, RefreshCw, Database, Download } from 'lucide-react';
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
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/integrations')}
          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
        >
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 text-white rounded-xl flex items-center justify-center">
            <ShoppingBag size={18} />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase">UaiRango</h1>
            <p className="text-[9px] text-slate-400 uppercase tracking-wider">Integração de Cardápio</p>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="flex gap-4 items-start bg-blue-50 p-4 rounded-xl border border-blue-100">
        <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-900">
          Utilize o Token de Desenvolvedor disponível no painel do UaiRango. 
          A importação criará categorias, produtos e adicionais automaticamente.
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-600">Token de Desenvolvedor</label>
              <Input 
                value={token} 
                onChange={e => setToken(e.target.value)} 
                placeholder="eyJ0eXAiOiJKV1Qi..." 
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-600">ID do Estabelecimento</label>
              <Input 
                value={establishmentId} 
                onChange={e => setEstablishmentId(e.target.value)} 
                placeholder="Ex: 12345" 
              />
            </div>

            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
              <input
                type="checkbox"
                id="uairangoActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-5 h-5 text-orange-500 rounded"
              />
              <label htmlFor="uairangoActive" className="text-sm font-medium">
                Ativar Integração UaiRango
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => navigate('/integrations')} className="flex-1">
              Voltar
            </Button>
            <Button type="submit" disabled={isSaving} className="flex-1 bg-orange-500 hover:bg-orange-600">
              {isSaving ? <Loader2 className="animate-spin mr-2" size={14} /> : <Save size={14} className="mr-2" />}
              Salvar
            </Button>
          </div>
        </form>
      </Card>

      {/* Importação */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Database size={16} className="text-orange-500" />
          <h3 className="text-sm font-black text-slate-900 uppercase">Importar Cardápio</h3>
        </div>

        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 mb-4">
          <p className="text-xs text-amber-800">
            Ao importar, o sistema buscará categorias, produtos e fotos diretamente do UaiRango. 
            Pizzas e sabores serão organizados automaticamente no formato Saipos (Produto Base + Grupo de Sabores). 
            Itens com o mesmo nome serão atualizados.
          </p>
        </div>

        <Button 
          onClick={handleImportMenu} 
          disabled={isImporting || !token || !establishmentId}
          className="w-full bg-orange-600 hover:bg-orange-700"
        >
          {isImporting ? (
            <Loader2 className="animate-spin mr-2" size={14} />
          ) : (
            <Download size={14} className="mr-2" />
          )}
          Importar Cardápio
        </Button>
      </Card>
    </div>
  );
};

export default UairangoSettingsPage;