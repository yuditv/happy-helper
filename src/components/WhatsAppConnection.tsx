import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Smartphone, QrCode, CheckCircle2, XCircle, Loader2, RefreshCw, Plus, Wifi, WifiOff, Zap, Signal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "qrcode";

interface InstanceData {
  instanceName: string;
  status: ConnectionStatus;
  qrcode?: string;
  base64?: string;
}

export function WhatsAppConnection() {
  const [instanceName, setInstanceName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isLoadingQR, setIsLoadingQR] = useState(false);
  const [instance, setInstance] = useState<InstanceData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const savedInstance = localStorage.getItem("whatsapp_instance");
    if (savedInstance) {
      const parsed = JSON.parse(savedInstance);
      setInstance({ ...parsed, status: "disconnected" });
      checkInstanceStatus(parsed.instanceName);
    }
  }, []);

  const createInstance = async () => {
    if (!instanceName.trim()) {
      toast.error("Digite um nome para a instância");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke("create-whatsapp-instance", {
        body: { instanceName: instanceName.trim() },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      const newInstance: InstanceData = {
        instanceName: instanceName.trim(),
        status: "qrcode",
        base64: data?.data?.qrcode?.base64,
      };

      setInstance(newInstance);
      localStorage.setItem("whatsapp_instance", JSON.stringify({ instanceName: instanceName.trim() }));
      toast.success("Instância criada com sucesso!");

      if (!data?.data?.qrcode?.base64) {
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

  const checkInstanceStatus = async (name: string) => {
    setIsChecking(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke("get-whatsapp-instance", {
        body: { instanceName: name },
      });

      if (error) throw error;

      const state = data?.data?.instance?.state || data?.data?.state;
      
      if (state === "open" || state === "connected") {
        setInstance(prev => prev ? { ...prev, status: "connected" } : null);
        toast.success("WhatsApp conectado!");
      } else if (state === "close" || state === "disconnected") {
        setInstance(prev => prev ? { ...prev, status: "disconnected" } : null);
      } else {
        await getQRCode(name);
      }
    } catch (err: any) {
      console.error("Error checking status:", err);
      await getQRCode(name);
    } finally {
      setIsChecking(false);
    }
  };

  const getQRCode = async (name: string) => {
    setIsLoadingQR(true);

    try {
      const { data, error } = await supabase.functions.invoke("get-whatsapp-qrcode", {
        body: { instanceName: name },
      });

      if (error) throw error;

      const base64 = data?.data?.base64 || data?.data?.qrcode?.base64;
      
      if (base64) {
        setInstance(prev => prev ? { ...prev, status: "qrcode", base64 } : null);
      } else {
        setInstance(prev => prev ? { ...prev, status: "disconnected" } : null);
      }
    } catch (err: any) {
      console.error("Error getting QR code:", err);
      setInstance(prev => prev ? { ...prev, status: "disconnected" } : null);
    } finally {
      setIsLoadingQR(false);
    }
  };

  const refreshQRCode = async () => {
    if (instance?.instanceName) {
      await getQRCode(instance.instanceName);
    }
  };

  const refreshStatus = async () => {
    if (instance?.instanceName) {
      await checkInstanceStatus(instance.instanceName);
    }
  };

  const disconnectInstance = () => {
    localStorage.removeItem("whatsapp_instance");
    setInstance(null);
    setInstanceName("");
    toast.info("Instância desconectada");
  };

  const getStatusBadge = () => {
    switch (instance?.status) {
      case "connected":
        return (
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
            <span className="relative flex h-2 w-2 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Conectado
          </Badge>
        );
      case "qrcode":
        return (
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.3)]">
            <QrCode className="w-3 h-3 mr-1" />
            Aguardando Scan
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

  return (
    <div className="space-y-8 relative">
      {/* Background Effects */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-green-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
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
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
              <Signal className="h-4 w-4" />
              Uazapi Integration
            </p>
          </div>
        </div>
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

      {!instance ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl shadow-2xl shadow-green-500/5 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5"></div>
            <CardHeader className="relative">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/20">
                  <Plus className="h-5 w-5 text-green-400" />
                </div>
                Criar Nova Instância
              </CardTitle>
              <CardDescription className="text-muted-foreground/80">
                Digite um nome único para identificar sua instância do WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 relative">
              <div className="space-y-3">
                <Label htmlFor="instanceName" className="text-sm font-medium text-foreground/90">
                  Nome da Instância
                </Label>
                <div className="relative">
                  <Input
                    id="instanceName"
                    placeholder="minha-instancia"
                    value={instanceName}
                    onChange={(e) => setInstanceName(e.target.value)}
                    disabled={isCreating}
                    className="bg-background/50 border-border/50 focus:border-green-500/50 focus:ring-green-500/20 transition-all duration-300 pl-4 pr-4 py-6 text-lg"
                  />
                  <div className="absolute inset-0 rounded-md bg-gradient-to-r from-green-500/0 via-green-500/5 to-emerald-500/0 pointer-events-none"></div>
                </div>
                <p className="text-xs text-muted-foreground/70">
                  Use apenas letras, números e hífens. Sem espaços ou caracteres especiais.
                </p>
              </div>
              <Button 
                onClick={createInstance} 
                disabled={isCreating || !instanceName.trim()}
                className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/25 transition-all duration-300 hover:shadow-green-500/40 hover:scale-[1.02] active:scale-[0.98]"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Criando Instância...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-5 w-5" />
                    Criar Instância
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Instance Info Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="h-full border-0 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl shadow-2xl shadow-green-500/5 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5"></div>
              <CardHeader className="relative">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/20">
                      <Smartphone className="h-5 w-5 text-green-400" />
                    </div>
                    <span className="font-mono text-lg">{instance.instanceName}</span>
                  </CardTitle>
                  {getStatusBadge()}
                </div>
              </CardHeader>
              <CardContent className="space-y-6 relative">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-br from-background/80 to-background/40 border border-border/30">
                  {instance.status === "connected" ? (
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
                      {instance.status === "connected"
                        ? "Pronto para enviar mensagens"
                        : instance.status === "qrcode"
                        ? "Escaneie o QR Code"
                        : "Instância offline"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={refreshStatus}
                    disabled={isChecking}
                    className="py-6 bg-background/50 border-border/50 hover:bg-green-500/10 hover:border-green-500/50 hover:text-green-400 transition-all duration-300"
                  >
                    {isChecking ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Atualizar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={disconnectInstance}
                    className="py-6 bg-background/50 border-border/50 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-400 transition-all duration-300"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Desconectar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* QR Code Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="h-full border-0 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl shadow-2xl shadow-green-500/5 overflow-hidden">
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
                    onClick={refreshQRCode}
                    disabled={isLoadingQR || instance.status === "connected"}
                    className="hover:bg-green-500/10 hover:text-green-400 transition-all"
                  >
                    {isLoadingQR ? (
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
                {instance.status === "connected" ? (
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
                ) : isLoadingQR ? (
                  <div className="flex flex-col items-center justify-center p-8">
                    <div className="relative">
                      <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse"></div>
                      <Loader2 className="relative h-20 w-20 animate-spin text-green-400" />
                    </div>
                    <p className="text-muted-foreground mt-4">Carregando QR Code...</p>
                  </div>
                ) : instance.base64 ? (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center"
                  >
                    <div className="relative p-1 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600">
                      <div className="p-4 bg-white rounded-xl">
                        <img
                          src={instance.base64}
                          alt="QR Code"
                          className="w-56 h-56"
                        />
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-4 text-center">
                      WhatsApp → Menu → Aparelhos conectados
                    </p>
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-gradient-to-br from-muted/30 to-muted/10 border border-border/30">
                    <div className="p-4 rounded-xl bg-muted/50 border border-border/30">
                      <QrCode className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground text-center mt-4">
                      Clique para gerar o QR Code
                    </p>
                    <Button
                      variant="outline"
                      onClick={refreshQRCode}
                      disabled={isLoadingQR}
                      className="mt-4 bg-background/50 border-border/50 hover:bg-green-500/10 hover:border-green-500/50 hover:text-green-400 transition-all duration-300"
                    >
                      <QrCode className="mr-2 h-4 w-4" />
                      Gerar QR Code
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Instructions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border-0 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl shadow-2xl shadow-green-500/5 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5"></div>
          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/20">
                <Zap className="h-5 w-5 text-green-400" />
              </div>
              Como Conectar
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { step: "01", text: "Crie uma instância com nome único" },
                { step: "02", text: "Aguarde o QR Code ser gerado" },
                { step: "03", text: "Abra o WhatsApp no celular" },
                { step: "04", text: "Menu (⋮) → Aparelhos conectados" },
                { step: "05", text: "Escaneie o QR Code" },
                { step: "06", text: "Pronto! Instância conectada" },
              ].map((item, index) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-br from-background/80 to-background/40 border border-border/30 hover:border-green-500/30 transition-all duration-300"
                >
                  <span className="text-2xl font-bold bg-gradient-to-br from-green-400 to-emerald-500 bg-clip-text text-transparent">
                    {item.step}
                  </span>
                  <p className="text-sm text-muted-foreground/90 mt-1">{item.text}</p>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}