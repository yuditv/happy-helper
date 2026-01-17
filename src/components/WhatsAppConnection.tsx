import { useState, useEffect, useCallback } from 'react';
import { Smartphone, Plus, Trash2, RefreshCw, QrCode, LogOut, Phone, Loader2, Copy, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWhatsAppInstances, WhatsAppInstance } from '@/hooks/useWhatsAppInstances';
import { toast } from 'sonner';

export function WhatsAppConnection() {
  const {
    instances,
    isLoading,
    isCreating,
    fetchInstances,
    createInstance,
    deleteInstance,
    getQRCode,
    getPairingCode,
    getStatus,
    disconnectInstance,
  } = useWhatsAppInstances();

  const [newInstanceName, setNewInstanceName] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<WhatsAppInstance | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoadingQR, setIsLoadingQR] = useState(false);
  const [isLoadingPairing, setIsLoadingPairing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Handle create instance
  const handleCreateInstance = async () => {
    if (!newInstanceName.trim()) {
      toast.error('Digite um nome para a instância');
      return;
    }

    const instance = await createInstance(newInstanceName.trim());
    if (instance) {
      setNewInstanceName('');
      setCreateDialogOpen(false);
      // Open connect dialog for the new instance
      setSelectedInstance(instance);
      setConnectDialogOpen(true);
    }
  };

  // Handle connect via QR Code
  const handleConnectQR = async (instance: WhatsAppInstance) => {
    setSelectedInstance(instance);
    setQrCode(null);
    setPairingCode(null);
    setConnectDialogOpen(true);
    await refreshQRCode(instance);
  };

  // Refresh QR Code
  const refreshQRCode = useCallback(async (instance: WhatsAppInstance) => {
    setIsLoadingQR(true);
    try {
      const qr = await getQRCode(instance.token);
      setQrCode(qr);
    } finally {
      setIsLoadingQR(false);
    }
  }, [getQRCode]);

  // Handle pairing code request
  const handleGetPairingCode = async () => {
    if (!selectedInstance || !phoneNumber.trim()) {
      toast.error('Digite seu número de WhatsApp');
      return;
    }

    setIsLoadingPairing(true);
    try {
      const code = await getPairingCode(selectedInstance.token, phoneNumber);
      if (code) {
        setPairingCode(code);
        toast.success('Código gerado! Digite no seu WhatsApp.');
      }
    } finally {
      setIsLoadingPairing(false);
    }
  };

  // Copy pairing code
  const handleCopyPairingCode = () => {
    if (pairingCode) {
      navigator.clipboard.writeText(pairingCode);
      setCopied(true);
      toast.success('Código copiado!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Poll for connection status
  useEffect(() => {
    if (!connectDialogOpen || !selectedInstance) return;

    const interval = setInterval(async () => {
      const status = await getStatus(selectedInstance);
      if (status?.connected) {
        toast.success('WhatsApp conectado com sucesso!');
        setConnectDialogOpen(false);
        setQrCode(null);
        setPairingCode(null);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [connectDialogOpen, selectedInstance, getStatus]);

  // Auto-refresh QR code every 20 seconds
  useEffect(() => {
    if (!connectDialogOpen || !selectedInstance || !qrCode) return;

    const interval = setInterval(() => {
      refreshQRCode(selectedInstance);
    }, 20000);

    return () => clearInterval(interval);
  }, [connectDialogOpen, selectedInstance, qrCode, refreshQRCode]);

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-500 hover:bg-green-600">Conectado</Badge>;
      case 'connecting':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Conectando</Badge>;
      case 'qr':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Aguardando QR</Badge>;
      default:
        return <Badge variant="secondary">Desconectado</Badge>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <Smartphone className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Conexão WhatsApp</h1>
            <p className="text-muted-foreground">Gerencie suas instâncias do WhatsApp</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchInstances} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Instância
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Instância</DialogTitle>
                <DialogDescription>
                  Digite um nome para identificar esta conexão WhatsApp.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome da Instância</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Meu WhatsApp, Vendas, Suporte..."
                    value={newInstanceName}
                    onChange={(e) => setNewInstanceName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateInstance()}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateInstance} disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    'Criar'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading && instances.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p>Carregando instâncias...</p>
            </div>
          </CardContent>
        </Card>
      ) : instances.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <Smartphone className="h-16 w-16 mb-4 opacity-30" />
              <p className="text-lg font-medium mb-2">Nenhuma instância encontrada</p>
              <p className="text-sm mb-4">Crie uma nova instância para conectar seu WhatsApp.</p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Instância
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {instances.map((instance) => (
            <Card key={instance.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {instance.profile_picture ? (
                      <img
                        src={instance.profile_picture}
                        alt={instance.profile_name || instance.instance_name}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                        <Smartphone className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-lg">{instance.instance_name}</CardTitle>
                      <CardDescription>
                        {instance.profile_name && (
                          <span className="mr-2">{instance.profile_name}</span>
                        )}
                        {instance.phone && (
                          <span className="text-primary">+{instance.phone}</span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  {getStatusBadge(instance.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {instance.status !== 'connected' ? (
                    <Button variant="outline" onClick={() => handleConnectQR(instance)}>
                      <QrCode className="h-4 w-4 mr-2" />
                      Conectar
                    </Button>
                  ) : (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline">
                          <LogOut className="h-4 w-4 mr-2" />
                          Desconectar
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Desconectar WhatsApp?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Isso irá desconectar esta instância do WhatsApp. Você precisará escanear o QR Code novamente para reconectar.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => disconnectInstance(instance)}>
                            Desconectar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  <Button variant="outline" onClick={() => getStatus(instance)}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Atualizar Status
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Instância?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. A instância "{instance.instance_name}" será permanentemente removida.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteInstance(instance)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Connect Dialog */}
      <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Conectar WhatsApp</DialogTitle>
            <DialogDescription>
              Escolha como deseja conectar: escaneando o QR Code ou digitando um código no seu celular.
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="qrcode" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="qrcode">
                <QrCode className="h-4 w-4 mr-2" />
                QR Code
              </TabsTrigger>
              <TabsTrigger value="pairing">
                <Phone className="h-4 w-4 mr-2" />
                Código
              </TabsTrigger>
            </TabsList>
            <TabsContent value="qrcode" className="mt-4">
              <div className="flex flex-col items-center gap-4">
                {isLoadingQR ? (
                  <div className="h-64 w-64 flex items-center justify-center bg-muted rounded-lg">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : qrCode ? (
                  <div className="p-4 bg-white rounded-lg">
                    <img
                      src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                      alt="QR Code"
                      className="h-64 w-64"
                    />
                  </div>
                ) : (
                  <div className="h-64 w-64 flex items-center justify-center bg-muted rounded-lg">
                    <p className="text-muted-foreground text-sm">QR Code não disponível</p>
                  </div>
                )}
                <p className="text-sm text-muted-foreground text-center">
                  Abra o WhatsApp no seu celular, vá em <strong>Dispositivos Conectados</strong> e escaneie o QR Code acima.
                </p>
                <Button
                  variant="outline"
                  onClick={() => selectedInstance && refreshQRCode(selectedInstance)}
                  disabled={isLoadingQR}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingQR ? 'animate-spin' : ''}`} />
                  Atualizar QR Code
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="pairing" className="mt-4">
              <div className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="phone">Número do WhatsApp</Label>
                  <Input
                    id="phone"
                    placeholder="Ex: 11999999999"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Digite seu número com DDD, sem o código do país.
                  </p>
                </div>
                {pairingCode ? (
                  <div className="flex flex-col items-center gap-2 p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Seu código de pareamento:</p>
                    <div className="flex items-center gap-2">
                      <span className="text-3xl font-mono font-bold tracking-widest">{pairingCode}</span>
                      <Button variant="ghost" size="icon" onClick={handleCopyPairingCode}>
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      No seu celular, vá em <strong>WhatsApp → Dispositivos Conectados → Conectar Dispositivo</strong> e digite este código.
                    </p>
                  </div>
                ) : (
                  <Button onClick={handleGetPairingCode} disabled={isLoadingPairing || !phoneNumber.trim()}>
                    {isLoadingPairing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      'Gerar Código de Pareamento'
                    )}
                  </Button>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
