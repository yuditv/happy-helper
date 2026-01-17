import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Smartphone, Plus, Trash2, Link2, Link2Off, RefreshCw, QrCode, Hash, Loader2, AlertCircle } from 'lucide-react';
import { useWhatsAppInstances, WhatsAppInstance } from '@/hooks/useWhatsAppInstances';
import { motion, AnimatePresence } from 'framer-motion';

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
    disconnectInstance,
  } = useWhatsAppInstances();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState('');
  const [selectedInstance, setSelectedInstance] = useState<WhatsAppInstance | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoadingQR, setIsLoadingQR] = useState(false);
  const [isLoadingPairing, setIsLoadingPairing] = useState(false);
  const [qrTimer, setQrTimer] = useState(60);

  useEffect(() => {
    fetchInstances();
  }, [fetchInstances]);

  // QR Code timer
  useEffect(() => {
    if (qrCode && qrTimer > 0) {
      const timer = setInterval(() => {
        setQrTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (qrTimer === 0) {
      setQrCode(null);
    }
  }, [qrCode, qrTimer]);

  const handleCreateInstance = async () => {
    if (!newInstanceName.trim()) return;
    
    const result = await createInstance(newInstanceName.trim());
    if (result) {
      setNewInstanceName('');
      setIsCreateDialogOpen(false);
    }
  };

  const handleOpenConnectDialog = (instance: WhatsAppInstance) => {
    setSelectedInstance(instance);
    setQrCode(null);
    setPairingCode(null);
    setPhoneNumber('');
    setQrTimer(60);
    setIsConnectDialogOpen(true);
  };

  const handleFetchQRCode = useCallback(async () => {
    if (!selectedInstance) return;
    
    setIsLoadingQR(true);
    setQrCode(null);
    setQrTimer(60);
    
    const qr = await getQRCode(selectedInstance.token);
    if (qr) {
      setQrCode(qr);
    }
    setIsLoadingQR(false);
  }, [selectedInstance, getQRCode]);

  const handleGetPairingCode = async () => {
    if (!selectedInstance || !phoneNumber.trim()) return;
    
    setIsLoadingPairing(true);
    setPairingCode(null);
    
    const code = await getPairingCode(selectedInstance.token, phoneNumber);
    if (code) {
      setPairingCode(code);
    }
    setIsLoadingPairing(false);
  };

  const handleDeleteInstance = async () => {
    if (!selectedInstance) return;
    
    await deleteInstance(selectedInstance.token);
    setSelectedInstance(null);
    setIsDeleteDialogOpen(false);
  };

  const confirmDelete = (instance: WhatsAppInstance) => {
    setSelectedInstance(instance);
    setIsDeleteDialogOpen(true);
  };

  const getStatusBadge = (status: WhatsAppInstance['status']) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Conectado</Badge>;
      case 'connecting':
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Conectando...</Badge>;
      case 'qr':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Aguardando QR</Badge>;
      default:
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Desconectado</Badge>;
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
            <p className="text-muted-foreground">Gerencie suas instâncias WhatsApp</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchInstances} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Instância
          </Button>
        </div>
      </div>

      {/* Lista de Instâncias */}
      <Card>
        <CardHeader>
          <CardTitle>Minhas Instâncias</CardTitle>
          <CardDescription>
            {instances.length === 0
              ? 'Nenhuma instância criada ainda. Clique em "Nova Instância" para começar.'
              : `${instances.length} instância(s) configurada(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && instances.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : instances.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Smartphone className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium mb-2">Nenhuma instância</p>
              <p className="text-sm">Crie uma nova instância para conectar seu WhatsApp.</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="space-y-4">
                {instances.map((instance) => (
                  <motion.div
                    key={instance.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={instance.profilePicture} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {instance.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{instance.name}</h3>
                          {getStatusBadge(instance.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {instance.phone
                            ? `+${instance.phone}`
                            : instance.profileName || 'Não conectado'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {instance.status === 'connected' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => disconnectInstance(instance.token)}
                        >
                          <Link2Off className="h-4 w-4 mr-2" />
                          Desconectar
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleOpenConnectDialog(instance)}
                        >
                          <Link2 className="h-4 w-4 mr-2" />
                          Conectar
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => confirmDelete(instance)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          )}
        </CardContent>
      </Card>

      {/* Dialog Criar Instância */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Instância</DialogTitle>
            <DialogDescription>
              Digite um nome para identificar sua instância WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Nome da instância (ex: Vendas, Suporte)"
              value={newInstanceName}
              onChange={(e) => setNewInstanceName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateInstance()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateInstance} disabled={isCreating || !newInstanceName.trim()}>
              {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Instância
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Conectar WhatsApp */}
      <Dialog open={isConnectDialogOpen} onOpenChange={setIsConnectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Conectar WhatsApp</DialogTitle>
            <DialogDescription>
              Escolha como deseja conectar: QR Code ou código por número.
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="qrcode" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="qrcode" className="flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                QR Code
              </TabsTrigger>
              <TabsTrigger value="pairing" className="flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Código
              </TabsTrigger>
            </TabsList>

            <TabsContent value="qrcode" className="mt-4">
              <div className="flex flex-col items-center">
                {qrCode ? (
                  <div className="relative">
                    <img
                      src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                      alt="QR Code"
                      className="w-64 h-64 rounded-lg border"
                    />
                    <div className="absolute bottom-2 right-2 bg-background/90 px-2 py-1 rounded text-sm font-medium">
                      {qrTimer}s
                    </div>
                  </div>
                ) : (
                  <div className="w-64 h-64 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/30">
                    {isLoadingQR ? (
                      <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                    ) : (
                      <QrCode className="h-16 w-16 text-muted-foreground/30" />
                    )}
                  </div>
                )}
                <Button
                  className="mt-4 w-full"
                  onClick={handleFetchQRCode}
                  disabled={isLoadingQR}
                >
                  {isLoadingQR ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  {qrCode ? 'Atualizar QR Code' : 'Gerar QR Code'}
                </Button>
                <p className="text-sm text-muted-foreground mt-4 text-center">
                  Abra o WhatsApp no seu celular, vá em <strong>Configurações &gt; Aparelhos conectados</strong> e escaneie o código.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="pairing" className="mt-4">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Número do WhatsApp</label>
                  <Input
                    placeholder="Ex: 11999999999"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Digite apenas números, com DDD (sem +55)
                  </p>
                </div>

                {pairingCode && (
                  <div className="p-4 bg-primary/10 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground mb-2">Seu código de pareamento:</p>
                    <p className="text-3xl font-mono font-bold tracking-widest text-primary">
                      {pairingCode}
                    </p>
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={handleGetPairingCode}
                  disabled={isLoadingPairing || !phoneNumber || phoneNumber.length < 10}
                >
                  {isLoadingPairing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {pairingCode ? 'Gerar Novo Código' : 'Gerar Código'}
                </Button>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Como usar o código
                  </h4>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Abra o WhatsApp no celular</li>
                    <li>Vá em <strong>Configurações &gt; Aparelhos conectados</strong></li>
                    <li>Toque em <strong>Conectar um aparelho</strong></li>
                    <li>Escolha <strong>Conectar com número de telefone</strong></li>
                    <li>Digite o código de 8 dígitos acima</li>
                  </ol>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Exclusão */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a instância <strong>{selectedInstance?.name}</strong>?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteInstance}>
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
