import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Plus, 
  Smartphone, 
  Megaphone, 
  Users, 
  Play, 
  Pause, 
  QrCode, 
  RefreshCw, 
  Trash2, 
  FileText,
  Wifi,
  WifiOff,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";
import { useWhatsAppInstances, WhatsAppInstance } from "@/hooks/useWhatsAppInstances";
import { useCampaigns, Campaign } from "@/hooks/useCampaigns";
import { QRCodeDialog } from "@/components/QRCodeDialog";
import { CreateInstanceDialog } from "@/components/CreateInstanceDialog";
import { CreateCampaignDialog } from "@/components/CreateCampaignDialog";
import { CampaignLogsDialog } from "@/components/CampaignLogsDialog";
import { ImportContactsDialog } from "@/components/ImportContactsDialog";
import { toast } from "sonner";

export default function Campaigns() {
  const { 
    instances, 
    isLoading: instancesLoading, 
    createInstance, 
    getQRCode, 
    checkStatus, 
    deleteInstance, 
    refetch: refetchInstances 
  } = useWhatsAppInstances();
  
  const { 
    campaigns, 
    isLoading: campaignsLoading, 
    startCampaign, 
    pauseCampaign, 
    refetch: refetchCampaigns 
  } = useCampaigns();

  const [selectedInstance, setSelectedInstance] = useState<WhatsAppInstance | null>(null);
  const [qrCodeDialogOpen, setQrCodeDialogOpen] = useState(false);
  const [createInstanceDialogOpen, setCreateInstanceDialogOpen] = useState(false);
  const [createCampaignDialogOpen, setCreateCampaignDialogOpen] = useState(false);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [checkingStatus, setCheckingStatus] = useState<string | null>(null);

  // Polling for campaign progress
  useEffect(() => {
    const activeCampaigns = campaigns.filter(c => c.status === 'running');
    if (activeCampaigns.length > 0) {
      const interval = setInterval(() => {
        refetchCampaigns();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [campaigns, refetchCampaigns]);

  const handleShowQRCode = async (instance: WhatsAppInstance) => {
    setSelectedInstance(instance);
    setQrCodeDialogOpen(true);
  };

  const handleCheckStatus = async (instanceId: string) => {
    setCheckingStatus(instanceId);
    try {
      await checkStatus(instanceId);
      await refetchInstances();
      toast.success("Status atualizado!");
    } catch (error) {
      toast.error("Erro ao verificar status");
    } finally {
      setCheckingStatus(null);
    }
  };

  const handleDeleteInstance = async (instanceId: string) => {
    if (confirm("Tem certeza que deseja excluir esta instância?")) {
      await deleteInstance(instanceId);
    }
  };

  const handleStartCampaign = async (campaignId: string) => {
    await startCampaign(campaignId);
  };

  const handlePauseCampaign = async (campaignId: string) => {
    await pauseCampaign(campaignId);
  };

  const handleShowLogs = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setLogsDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><Wifi className="w-3 h-3 mr-1" /> Conectado</Badge>;
      case 'disconnected':
        return <Badge variant="destructive"><WifiOff className="w-3 h-3 mr-1" /> Desconectado</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Aguardando</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCampaignStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30"><Play className="w-3 h-3 mr-1" /> Em execução</Badge>;
      case 'paused':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Pause className="w-3 h-3 mr-1" /> Pausada</Badge>;
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle2 className="w-3 h-3 mr-1" /> Concluída</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Falhou</Badge>;
      case 'draft':
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" /> Rascunho</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campanhas WhatsApp</h1>
          <p className="text-muted-foreground">Gerencie suas instâncias e campanhas de envio em massa</p>
        </div>
      </div>

      <Tabs defaultValue="instances" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="instances" className="gap-2">
            <Smartphone className="w-4 h-4" />
            Instâncias
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-2">
            <Megaphone className="w-4 h-4" />
            Campanhas
          </TabsTrigger>
          <TabsTrigger value="contacts" className="gap-2">
            <Users className="w-4 h-4" />
            Contatos
          </TabsTrigger>
        </TabsList>

        {/* Tab: Instâncias */}
        <TabsContent value="instances" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Suas Instâncias WhatsApp</h2>
            <Button onClick={() => setCreateInstanceDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Instância
            </Button>
          </div>

          {instancesLoading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : instances.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Smartphone className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma instância cadastrada</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Crie sua primeira instância WhatsApp para começar a enviar campanhas
                </p>
                <Button onClick={() => setCreateInstanceDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Instância
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {instances.map((instance) => (
                <Card key={instance.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{instance.name}</CardTitle>
                        <CardDescription>
                          {instance.phone_connected || "Não conectado"}
                        </CardDescription>
                      </div>
                      {getStatusBadge(instance.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Limite diário:</span>
                      <span className="font-medium">{instance.daily_limit || 500} msgs</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleShowQRCode(instance)}
                      >
                        <QrCode className="w-4 h-4 mr-1" />
                        QR Code
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleCheckStatus(instance.id)}
                        disabled={checkingStatus === instance.id}
                      >
                        <RefreshCw className={`w-4 h-4 mr-1 ${checkingStatus === instance.id ? 'animate-spin' : ''}`} />
                        Status
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteInstance(instance.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Campanhas */}
        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Suas Campanhas</h2>
            <Button 
              onClick={() => setCreateCampaignDialogOpen(true)}
              disabled={instances.filter(i => i.status === 'connected').length === 0}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Campanha
            </Button>
          </div>

          {instances.filter(i => i.status === 'connected').length === 0 && (
            <Card className="border-yellow-500/30 bg-yellow-500/5">
              <CardContent className="flex items-center gap-3 py-4">
                <AlertCircle className="w-5 h-5 text-yellow-500" />
                <p className="text-sm text-yellow-200">
                  Conecte pelo menos uma instância WhatsApp para criar campanhas
                </p>
              </CardContent>
            </Card>
          )}

          {campaignsLoading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : campaigns.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Megaphone className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma campanha criada</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Crie sua primeira campanha de envio em massa
                </p>
                <Button 
                  onClick={() => setCreateCampaignDialogOpen(true)}
                  disabled={instances.filter(i => i.status === 'connected').length === 0}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Campanha
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {campaigns.map((campaign) => (
                <Card key={campaign.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{campaign.name}</CardTitle>
                        <CardDescription className="mt-1">
                          Criada em {new Date(campaign.created_at).toLocaleDateString('pt-BR')}
                        </CardDescription>
                      </div>
                      {getCampaignStatusBadge(campaign.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progresso</span>
                        <span className="font-medium">{campaign.progress}%</span>
                      </div>
                      <Progress value={campaign.progress} className="h-2" />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold">{campaign.total_contacts}</p>
                        <p className="text-xs text-muted-foreground">Total</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-500">{campaign.sent_count}</p>
                        <p className="text-xs text-muted-foreground">Enviados</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-red-500">{campaign.failed_count}</p>
                        <p className="text-xs text-muted-foreground">Falhas</p>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      {campaign.status === 'draft' && campaign.total_contacts > 0 && (
                        <Button size="sm" onClick={() => handleStartCampaign(campaign.id)}>
                          <Play className="w-4 h-4 mr-1" />
                          Iniciar
                        </Button>
                      )}
                      {campaign.status === 'running' && (
                        <Button size="sm" variant="outline" onClick={() => handlePauseCampaign(campaign.id)}>
                          <Pause className="w-4 h-4 mr-1" />
                          Pausar
                        </Button>
                      )}
                      {campaign.status === 'paused' && (
                        <Button size="sm" onClick={() => handleStartCampaign(campaign.id)}>
                          <Play className="w-4 h-4 mr-1" />
                          Retomar
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => handleShowLogs(campaign)}>
                        <FileText className="w-4 h-4 mr-1" />
                        Logs
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Contatos */}
        <TabsContent value="contacts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Adicionar Contatos</h2>
          </div>

          {campaigns.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma campanha disponível</h3>
                <p className="text-muted-foreground text-center">
                  Crie uma campanha primeiro para adicionar contatos
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {campaigns.filter(c => c.status === 'draft' || c.status === 'paused').map((campaign) => (
                <Card key={campaign.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{campaign.name}</CardTitle>
                    <CardDescription>
                      {campaign.total_contacts} contatos adicionados
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      className="w-full" 
                      onClick={() => {
                        setSelectedCampaign(campaign);
                        setImportDialogOpen(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Contatos
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <QRCodeDialog 
        open={qrCodeDialogOpen} 
        onOpenChange={setQrCodeDialogOpen}
        instance={selectedInstance}
        getQRCode={getQRCode}
      />
      
      <CreateInstanceDialog
        open={createInstanceDialogOpen}
        onOpenChange={setCreateInstanceDialogOpen}
        onCreateInstance={createInstance}
        onRefetch={refetchInstances}
      />

      <CreateCampaignDialog
        open={createCampaignDialogOpen}
        onOpenChange={setCreateCampaignDialogOpen}
        instances={instances.filter(i => i.status === 'connected')}
        onRefetch={refetchCampaigns}
      />

      <CampaignLogsDialog
        open={logsDialogOpen}
        onOpenChange={setLogsDialogOpen}
        campaign={selectedCampaign}
      />

      <ImportContactsDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        campaign={selectedCampaign}
        onRefetch={refetchCampaigns}
      />
    </div>
  );
}
