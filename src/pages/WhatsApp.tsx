import { useState, useEffect } from 'react';
import { useWhatsAppInstances, WhatsAppInstance } from '@/hooks/useWhatsAppInstances';
import { useCampaigns, Campaign } from '@/hooks/useCampaigns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { 
  Send, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Clock,
  Zap,
  RefreshCw,
  CalendarDays,
  FileText,
  History,
  Smartphone,
  Megaphone,
  Plus,
  Play,
  Pause,
  QrCode,
  Trash2,
  Wifi,
  WifiOff,
  AlertCircle,
  CircleDot,
} from 'lucide-react';
import { toast } from 'sonner';
import { WhatsAppTemplateManager } from '@/components/WhatsAppTemplateManager';
import { ScheduleDispatch } from '@/components/ScheduleDispatch';
import { ScheduledDispatchList } from '@/components/ScheduledDispatchList';
import { DispatchHistoryPanel } from '@/components/DispatchHistoryPanel';
import { QRCodeDialog } from '@/components/QRCodeDialog';
import { CreateInstanceDialog } from '@/components/CreateInstanceDialog';
import { CreateCampaignDialog } from '@/components/CreateCampaignDialog';
import { CampaignLogsDialog } from '@/components/CampaignLogsDialog';
import { ImportContactsDialog } from '@/components/ImportContactsDialog';
import { WhatsAppStatus } from '@/components/WhatsAppStatus';
import { BulkDispatcher } from '@/components/BulkDispatcher';

export default function WhatsApp() {
  const { 
    instances, 
    isLoading: instancesLoading, 
    createInstance, 
    getQRCode, 
    checkStatus, 
    deleteInstance, 
    getPairingCode,
    refetch: refetchInstances 
  } = useWhatsAppInstances();
  const { 
    campaigns, 
    isLoading: campaignsLoading, 
    startCampaign, 
    pauseCampaign, 
    refetch: refetchCampaigns 
  } = useCampaigns();
  
  // Tab state
  const [activeTab, setActiveTab] = useState('dispatch');

  // Instance/Campaign dialogs
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

  // Instance handlers
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

  const getInstanceStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-success/20 text-success border-success/30"><Wifi className="w-3 h-3 mr-1" /> Conectado</Badge>;
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
        return <Badge className="bg-primary/20 text-primary border-primary/30"><Play className="w-3 h-3 mr-1" /> Em execução</Badge>;
      case 'paused':
        return <Badge className="bg-warning/20 text-warning border-warning/30"><Pause className="w-3 h-3 mr-1" /> Pausada</Badge>;
      case 'completed':
        return <Badge className="bg-success/20 text-success border-success/30"><CheckCircle2 className="w-3 h-3 mr-1" /> Concluída</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Falhou</Badge>;
      case 'draft':
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" /> Rascunho</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
          <Send className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gradient">WhatsApp</h1>
          <p className="text-sm text-muted-foreground">Gerencie instâncias, campanhas e disparos em massa</p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-7 w-full max-w-4xl">
          <TabsTrigger value="dispatch" className="gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Disparo</span>
          </TabsTrigger>
          <TabsTrigger value="status" className="gap-2">
            <CircleDot className="h-4 w-4" />
            <span className="hidden sm:inline">Status</span>
          </TabsTrigger>
          <TabsTrigger value="instances" className="gap-2">
            <Smartphone className="h-4 w-4" />
            <span className="hidden sm:inline">Instâncias</span>
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-2">
            <Megaphone className="h-4 w-4" />
            <span className="hidden sm:inline">Campanhas</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Templates</span>
          </TabsTrigger>
          <TabsTrigger value="schedule" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            <span className="hidden sm:inline">Agendar</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Histórico</span>
          </TabsTrigger>
        </TabsList>

        {/* Dispatch Tab - NEW BULK DISPATCHER */}
        <TabsContent value="dispatch" className="space-y-6">
          <BulkDispatcher />
        </TabsContent>

        {/* Instances Tab */}
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
                      {getInstanceStatusBadge(instance.status)}
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

        {/* Campaigns Tab */}
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
            <Card className="border-warning/30 bg-warning/5">
              <CardContent className="flex items-center gap-3 py-4">
                <AlertCircle className="w-5 h-5 text-warning" />
                <p className="text-sm text-muted-foreground">
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
                        <p className="text-2xl font-bold text-success">{campaign.sent_count}</p>
                        <p className="text-xs text-muted-foreground">Enviados</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-destructive">{campaign.failed_count}</p>
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
                      {(campaign.status === 'draft' || campaign.status === 'paused') && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedCampaign(campaign);
                            setImportDialogOpen(true);
                          }}
                        >
                          <Users className="w-4 h-4 mr-1" />
                          Contatos
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <WhatsAppTemplateManager onSelectTemplate={() => {}} />
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ScheduleDispatch 
              selectedClients={[]}
              message=""
              onMessageChange={() => {}}
            />
            <ScheduledDispatchList />
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <DispatchHistoryPanel />
        </TabsContent>

        {/* Status Tab */}
        <TabsContent value="status">
          <WhatsAppStatus instances={instances} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <QRCodeDialog 
        open={qrCodeDialogOpen} 
        onOpenChange={setQrCodeDialogOpen}
        instance={selectedInstance}
        getQRCode={getQRCode}
        getPairingCode={getPairingCode}
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
