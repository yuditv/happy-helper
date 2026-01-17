import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Smartphone, QrCode, CheckCircle2, XCircle, Loader2, RefreshCw, Plus, Wifi, WifiOff, Zap, Signal, Trash2, Settings, MoreVertical, Eye, Copy, Check, Database } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useWhatsAppInstances, WhatsAppInstance } from "@/hooks/useWhatsAppInstances";
import { QRCodeTimer } from "@/components/QRCodeTimer";
import { Skeleton } from "@/components/ui/skeleton";

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "qrcode";

export function WhatsAppConnection() {
  const { 
    instances, 
    isLoading, 
    createInstance: createDbInstance, 
    updateInstanceStatus, 
    deleteInstance: deleteDbInstance,
    setInstanceQRCode 
  } = useWhatsAppInstances();
  
  const [selectedInstance, setSelectedInstance] = useState<WhatsAppInstance | null>(null);
  const [instanceName, setInstanceName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isChecking, setIsChecking] = useState<string | null>(null);
  const [isLoadingQR, setIsLoadingQR] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [copiedInstance, setCopiedInstance] = useState<string | null>(null);
  const [qrTimerKey, setQrTimerKey] = useState(0);

  // Update selected instance when instances change
  useEffect(() => {
    if (selectedInstance) {
      const updated = instances.find(i => i.instance_name === selectedInstance.instance_name);
      if (updated) {
        setSelectedInstance(updated);
      }
    }
  }, [instances]);

  // Check status of all instances on mount
  useEffect(() => {
    if (!isLoading && instances.length > 0) {
      instances.forEach(inst => {
        checkInstanceStatus(inst.instance_name, false);
      });
    }
  }, [isLoading]);

  const createInstance = async () => {
    if (!instanceName.trim()) {
      toast.error("Digite um nome para a instância");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // First create in database
      const dbInstance = await createDbInstance(instanceName.trim());
      if (!dbInstance) {
        setIsCreating(false);
        return;
      }

      // Then create in Evolution API
      const { data, error } = await supabase.functions.invoke("create-whatsapp-instance", {
        body: { instanceName: instanceName.trim() },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      const base64 = data?.data?.qrcode?.base64;
      if (base64) {
        setInstanceQRCode(instanceName.trim(), base64);
        await updateInstanceStatus(instanceName.trim(), "qrcode");
      }

      setSelectedInstance({ ...dbInstance, base64, status: "qrcode" });
      setInstanceName("");
      setShowCreateDialog(false);
      setQrTimerKey(prev => prev + 1);
      toast.success("Instância criada com sucesso!");

      if (!base64) {
        await getQRCode(instanceName.trim());
      }
    } catch (err: any) {
      console.error("Error creating instance:", err);
      setError(err.message || "Erro ao criar instância");
      toast.error("Erro ao criar instância");
    } finally {
      setIsCreating(false);
    }
  };

  const checkInstanceStatus = async (name: string, showToast = true) => {
    setIsChecking(name);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke("get-whatsapp-instance", {
        body: { instanceName: name },
      });

      if (error) throw error;

      const state = data?.data?.instance?.state || data?.data?.state;
      
      if (state === "open" || state === "connected") {
        await updateInstanceStatus(name, "connected");
        if (showToast) toast.success(`${name} conectado!`);
      } else if (state === "close" || state === "disconnected") {
        await updateInstanceStatus(name, "disconnected");
      } else {
        await getQRCode(name);
      }
    } catch (err: any) {
      console.error("Error checking status:", err);
      await getQRCode(name);
    } finally {
      setIsChecking(null);
    }
  };

  const getQRCode = async (name: string) => {
    setIsLoadingQR(name);

    try {
      const { data, error } = await supabase.functions.invoke("get-whatsapp-qrcode", {
        body: { instanceName: name },
      });

      if (error) throw error;

      const base64 = data?.data?.base64 || data?.data?.qrcode?.base64;
      
      setInstanceQRCode(name, base64);
      await updateInstanceStatus(name, base64 ? "qrcode" : "disconnected");
      setQrTimerKey(prev => prev + 1);
    } catch (err: any) {
      console.error("Error getting QR code:", err);
      await updateInstanceStatus(name, "disconnected");
    } finally {
      setIsLoadingQR(null);
    }
  };

  const handleDeleteInstance = async (name: string) => {
    const success = await deleteDbInstance(name);
    if (success && selectedInstance?.instance_name === name) {
      setSelectedInstance(null);
    }
  };

  const copyInstanceName = (name: string) => {
    navigator.clipboard.writeText(name);
    setCopiedInstance(name);
    setTimeout(() => setCopiedInstance(null), 2000);
    toast.success("Nome copiado!");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return (
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
            <span className="relative flex h-2 w-2 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Online
          </Badge>
        );
      case "qrcode":
        return (
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.3)]">
            <QrCode className="w-3 h-3 mr-1" />
            QR Code
          </Badge>
        );
      case "connecting":
        return (
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.3)]">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Conectando
          </Badge>
        );
      default:
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.3)]">
            <XCircle className="w-3 h-3 mr-1" />
            Offline
          </Badge>
        );
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return "from-emerald-500/20 to-green-500/10 border-emerald-500/30";
      case "qrcode":
        return "from-amber-500/20 to-yellow-500/10 border-amber-500/30";
      case "connecting":
        return "from-blue-500/20 to-cyan-500/10 border-blue-500/30";
      default:
        return "from-red-500/10 to-gray-500/5 border-red-500/20";
    }
  };

  const connectedCount = instances.filter(i => i.status === "connected").length;

  return (
    <div className="space-y-8 relative">
      {/* Background Effects */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-green-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl blur-lg opacity-50"></div>
            <div className="relative p-4 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl">
              <Smartphone className="h-8 w-8 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
              Conexão WhatsApp
            </h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
              <Signal className="h-4 w-4" />
              Uazapi Integration
              <Badge variant="outline" className="ml-2 border-green-500/30 text-green-400">
                <Database className="h-3 w-3 mr-1" />
                Sincronizado
              </Badge>
              {!isLoading && (
                <>
                  <span>• {instances.length} instância{instances.length !== 1 ? "s" : ""}</span>
                  {connectedCount > 0 && (
                    <span className="text-emerald-400">• {connectedCount} online</span>
                  )}
                </>
              )}
            </p>
          </div>
        </div>

        {/* Create Instance Button */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button 
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/25 transition-all duration-300 hover:shadow-green-500/40 hover:scale-105"
            >
              <Plus className="mr-2 h-5 w-5" />
              Nova Instância
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gradient-to-br from-card to-card/80 backdrop-blur-xl border-green-500/20">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/20">
                  <Plus className="h-5 w-5 text-green-400" />
                </div>
                Criar Nova Instância
              </DialogTitle>
              <DialogDescription className="text-muted-foreground/80">
                Digite um nome único para identificar sua instância do WhatsApp
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="instanceName" className="text-sm font-medium">
                  Nome da Instância
                </Label>
                <Input
                  id="instanceName"
                  placeholder="minha-instancia"
                  value={instanceName}
                  onChange={(e) => setInstanceName(e.target.value)}
                  disabled={isCreating}
                  className="bg-background/50 border-border/50 focus:border-green-500/50"
                />
                <p className="text-xs text-muted-foreground/70">
                  Use apenas letras, números e hífens
                </p>
              </div>
              <Button 
                onClick={createInstance} 
                disabled={isCreating || !instanceName.trim()}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Criar Instância
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Alert variant="destructive" className="border-red-500/50 bg-red-500/10 backdrop-blur-sm">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State */}
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-0 bg-gradient-to-br from-card/50 to-card/20 backdrop-blur-xl">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-6 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : instances.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-dashed border-2 border-green-500/30 bg-gradient-to-br from-card/50 to-card/20 backdrop-blur-xl">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-green-500/20 rounded-full blur-2xl"></div>
                <div className="relative p-6 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/10 border border-green-500/30">
                  <Smartphone className="h-12 w-12 text-green-400" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">Nenhuma instância criada</h3>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                Crie sua primeira instância WhatsApp para começar a enviar mensagens automáticas
              </p>
              <Button 
                onClick={() => setShowCreateDialog(true)}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/25"
              >
                <Plus className="mr-2 h-5 w-5" />
                Criar Primeira Instância
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {instances.map((instance, index) => (
              <motion.div
                key={instance.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className={`relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] border-0 bg-gradient-to-br ${getStatusColor(instance.status)} backdrop-blur-xl shadow-xl hover:shadow-2xl ${selectedInstance?.instance_name === instance.instance_name ? 'ring-2 ring-green-500/50' : ''}`}
                  onClick={() => setSelectedInstance(instance)}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/10 to-transparent rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                  
                  <CardHeader className="relative pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${instance.status === 'connected' ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-muted/30 border-border/30'} border`}>
                          {instance.status === 'connected' ? (
                            <Wifi className="h-5 w-5 text-emerald-400" />
                          ) : (
                            <WifiOff className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-lg font-mono truncate max-w-[150px]">
                            {instance.instance_name}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground/70">
                            {new Date(instance.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-background/50">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card/95 backdrop-blur-xl border-border/50">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); checkInstanceStatus(instance.instance_name); }}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Atualizar Status
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); copyInstanceName(instance.instance_name); }}>
                            {copiedInstance === instance.instance_name ? (
                              <Check className="mr-2 h-4 w-4 text-green-400" />
                            ) : (
                              <Copy className="mr-2 h-4 w-4" />
                            )}
                            Copiar Nome
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedInstance(instance); }}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={(e) => { e.stopPropagation(); handleDeleteInstance(instance.instance_name); }}
                            className="text-red-400 focus:text-red-400 focus:bg-red-500/10"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="relative pt-2">
                    <div className="flex items-center justify-between">
                      {getStatusBadge(instance.status)}
                      {isChecking === instance.instance_name && (
                        <Loader2 className="h-4 w-4 animate-spin text-green-400" />
                      )}
                    </div>
                    
                    {instance.last_connected_at && instance.status === 'connected' && (
                      <p className="text-xs text-muted-foreground/60 mt-3">
                        Última conexão: {new Date(instance.last_connected_at).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Selected Instance Details */}
      <AnimatePresence>
        {selectedInstance && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="grid gap-6 md:grid-cols-2"
          >
            {/* Instance Info Card */}
            <Card className="border-0 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl shadow-2xl shadow-green-500/5 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5"></div>
              <CardHeader className="relative">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/20">
                      <Smartphone className="h-5 w-5 text-green-400" />
                    </div>
                    <span className="font-mono text-lg">{selectedInstance.instance_name}</span>
                  </CardTitle>
                  {getStatusBadge(selectedInstance.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-6 relative">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-br from-background/80 to-background/40 border border-border/30">
                  {selectedInstance.status === "connected" ? (
                    <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
                      <Wifi className="h-6 w-6 text-emerald-400" />
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-muted/50 border border-border/30">
                      <WifiOff className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-foreground/90">Status da Conexão</p>
                    <p className="text-sm text-muted-foreground/80">
                      {selectedInstance.status === "connected"
                        ? "Pronto para enviar mensagens"
                        : selectedInstance.status === "qrcode"
                        ? "Escaneie o QR Code"
                        : "Instância offline"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => checkInstanceStatus(selectedInstance.instance_name)}
                    disabled={isChecking === selectedInstance.instance_name}
                    className="py-6 bg-background/50 border-border/50 hover:bg-green-500/10 hover:border-green-500/50 hover:text-green-400 transition-all duration-300"
                  >
                    {isChecking === selectedInstance.instance_name ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Atualizar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDeleteInstance(selectedInstance.instance_name)}
                    className="py-6 bg-background/50 border-border/50 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-400 transition-all duration-300"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  onClick={() => setSelectedInstance(null)}
                  className="w-full text-muted-foreground hover:text-foreground"
                >
                  Fechar Detalhes
                </Button>
              </CardContent>
            </Card>

            {/* QR Code Card */}
            <Card className="border-0 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl shadow-2xl shadow-green-500/5 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5"></div>
              <CardHeader className="relative">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/20">
                      <QrCode className="h-5 w-5 text-green-400" />
                    </div>
                    QR Code
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => getQRCode(selectedInstance.instance_name)}
                    disabled={isLoadingQR === selectedInstance.instance_name || selectedInstance.status === "connected"}
                    className="hover:bg-green-500/10 hover:text-green-400 transition-all"
                  >
                    {isLoadingQR === selectedInstance.instance_name ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <CardDescription className="text-muted-foreground/80">
                  Escaneie com o WhatsApp
                </CardDescription>
              </CardHeader>
              <CardContent className="relative">
                {selectedInstance.status === "connected" ? (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center justify-center p-8 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-green-500/5 border border-emerald-500/30"
                  >
                    <div className="relative">
                      <div className="absolute inset-0 bg-emerald-500/30 rounded-full blur-xl"></div>
                      <CheckCircle2 className="relative h-20 w-20 text-emerald-400" />
                    </div>
                    <p className="text-xl font-bold text-emerald-400 mt-4">Conectado!</p>
                    <p className="text-sm text-muted-foreground text-center mt-2">
                      Sua instância está pronta
                    </p>
                  </motion.div>
                ) : isLoadingQR === selectedInstance.instance_name ? (
                  <div className="flex flex-col items-center justify-center p-8">
                    <div className="relative">
                      <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse"></div>
                      <Loader2 className="relative h-20 w-20 animate-spin text-green-400" />
                    </div>
                    <p className="text-muted-foreground mt-4">Carregando QR Code...</p>
                  </div>
                ) : selectedInstance.base64 ? (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center gap-4"
                  >
                    <div className="relative group">
                      <div className="absolute -inset-2 bg-gradient-to-r from-green-500/30 via-emerald-500/30 to-teal-500/30 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
                      <div className="relative p-4 bg-white rounded-xl">
                        <img
                          src={selectedInstance.base64}
                          alt="WhatsApp QR Code"
                          className="w-48 h-48"
                        />
                      </div>
                    </div>
                    
                    {/* QR Code Timer */}
                    <QRCodeTimer
                      key={qrTimerKey}
                      duration={60}
                      onExpire={() => {
                        setInstanceQRCode(selectedInstance.instance_name, undefined);
                      }}
                      onRefresh={() => getQRCode(selectedInstance.instance_name)}
                      isRefreshing={isLoadingQR === selectedInstance.instance_name}
                    />
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8">
                    <div className="p-4 rounded-xl bg-muted/30 border border-border/30 mb-4">
                      <QrCode className="h-16 w-16 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground text-center">
                      Clique em atualizar para gerar um novo QR Code
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => getQRCode(selectedInstance.instance_name)}
                      className="mt-4 hover:bg-green-500/10 hover:border-green-500/50 hover:text-green-400"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Gerar QR Code
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* How to Connect Guide */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border-0 bg-gradient-to-br from-card/60 to-card/30 backdrop-blur-xl shadow-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5"></div>
          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/20">
                <Settings className="h-5 w-5 text-green-400" />
              </div>
              Como Conectar
            </CardTitle>
            <CardDescription className="text-muted-foreground/80">
              Siga os passos para conectar sua instância
            </CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <div className="grid md:grid-cols-4 gap-4">
              {[
                { step: 1, title: "Crie uma instância", desc: "Clique em 'Nova Instância' e dê um nome único", icon: Plus },
                { step: 2, title: "Escaneie o QR Code", desc: "Abra o WhatsApp e escaneie o código", icon: QrCode },
                { step: 3, title: "Aguarde a conexão", desc: "O status será atualizado automaticamente", icon: Loader2 },
                { step: 4, title: "Pronto!", desc: "Sua instância está conectada e pronta", icon: CheckCircle2 },
              ].map((item, index) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="relative p-4 rounded-xl bg-gradient-to-br from-background/60 to-background/30 border border-border/30 hover:border-green-500/30 transition-colors group"
                >
                  <div className="absolute top-3 right-3 text-4xl font-bold text-green-500/10 group-hover:text-green-500/20 transition-colors">
                    {item.step}
                  </div>
                  <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20 w-fit mb-3 group-hover:bg-green-500/20 transition-colors">
                    <item.icon className="h-5 w-5 text-green-400" />
                  </div>
                  <h4 className="font-semibold text-foreground/90 mb-1">{item.title}</h4>
                  <p className="text-sm text-muted-foreground/70">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
