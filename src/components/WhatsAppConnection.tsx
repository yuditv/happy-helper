import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Smartphone, QrCode, CheckCircle2, XCircle, Loader2, RefreshCw, Wifi, WifiOff, Zap, Signal, Settings, Phone, Link2, Unlink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeTimer } from "@/components/QRCodeTimer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WhatsAppDashboard } from "@/components/WhatsAppDashboard";

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "qrcode";

interface InstanceStatus {
  status: ConnectionStatus;
  qrCode?: string;
  pairingCode?: string;
  phone?: string;
  lastDisconnect?: any;
  details?: any;
}

export function WhatsAppConnection() {
  const [instanceStatus, setInstanceStatus] = useState<InstanceStatus>({
    status: "disconnected"
  });
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrTimerKey, setQrTimerKey] = useState(0);
  const [usePairingCode, setUsePairingCode] = useState(false);

  // Check status on mount
  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = useCallback(async (showToast = false) => {
    setIsCheckingStatus(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke("uazapi-status");

      if (error) throw error;

      console.log("Status response:", data);

      if (data?.data) {
        const statusData = data.data;
        
        // Parse status from Uazapi response
        let newStatus: ConnectionStatus = "disconnected";
        
        if (statusData.status === "connected" || statusData.connected === true) {
          newStatus = "connected";
        } else if (statusData.status === "connecting" || statusData.qrCode) {
          newStatus = statusData.qrCode ? "qrcode" : "connecting";
        }

        setInstanceStatus({
          status: newStatus,
          qrCode: statusData.qrCode || statusData.qr_code,
          pairingCode: statusData.pairingCode || statusData.pairing_code,
          phone: statusData.phone,
          lastDisconnect: statusData.lastDisconnect,
          details: statusData
        });

        if (showToast) {
          if (newStatus === "connected") {
            toast.success("WhatsApp conectado!");
          } else if (newStatus === "qrcode") {
            toast.info("Escaneie o QR Code para conectar");
          }
        }
      }
    } catch (err: any) {
      console.error("Error checking status:", err);
      if (showToast) {
        toast.error("Erro ao verificar status");
      }
    } finally {
      setIsCheckingStatus(false);
    }
  }, []);

  const connectInstance = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const body: any = {};
      
      // If using pairing code, send phone number
      if (usePairingCode && phoneNumber.trim()) {
        body.phone = phoneNumber.replace(/\D/g, '');
      }

      const { data, error } = await supabase.functions.invoke("uazapi-connect", {
        body
      });

      if (error) throw error;

      console.log("Connect response:", data);

      if (data?.data) {
        const connectData = data.data;
        
        setInstanceStatus({
          status: connectData.qrCode || connectData.qr_code ? "qrcode" : "connecting",
          qrCode: connectData.qrCode || connectData.qr_code,
          pairingCode: connectData.pairingCode || connectData.pairing_code,
          details: connectData
        });

        setQrTimerKey(prev => prev + 1);

        if (connectData.pairingCode || connectData.pairing_code) {
          toast.success("Código de pareamento gerado!");
        } else if (connectData.qrCode || connectData.qr_code) {
          toast.success("QR Code gerado! Escaneie com o WhatsApp");
        } else {
          toast.success("Conexão iniciada!");
        }
      }
    } catch (err: any) {
      console.error("Error connecting:", err);
      setError(err.message || "Erro ao conectar instância");
      toast.error("Erro ao conectar");
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectInstance = async () => {
    setIsDisconnecting(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke("uazapi-disconnect");

      if (error) throw error;

      console.log("Disconnect response:", data);

      setInstanceStatus({
        status: "disconnected"
      });

      toast.success("WhatsApp desconectado!");
    } catch (err: any) {
      console.error("Error disconnecting:", err);
      setError(err.message || "Erro ao desconectar");
      toast.error("Erro ao desconectar");
    } finally {
      setIsDisconnecting(false);
    }
  };

  const getStatusBadge = (status: ConnectionStatus) => {
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

  return (
    <div className="space-y-6 relative">
      {/* Background Effects */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-green-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-3xl"></div>
      </div>

      {/* Tabs for Connection and Dashboard */}
      <Tabs defaultValue="connection" className="w-full">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4"
          >
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
                {getStatusBadge(instanceStatus.status)}
              </p>
            </div>
          </motion.div>

          <TabsList className="bg-muted/50 backdrop-blur border border-border/50">
            <TabsTrigger value="connection" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
              <Smartphone className="h-4 w-4 mr-2" />
              Conexão
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
              <Signal className="h-4 w-4 mr-2" />
              Dashboard
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="mt-0">
          <WhatsAppDashboard />
        </TabsContent>

        <TabsContent value="connection" className="space-y-6 mt-0">
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

          <div className="grid gap-6 md:grid-cols-2">
            {/* Connection Status Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="border-0 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl shadow-2xl shadow-green-500/5 overflow-hidden h-full">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5"></div>
                <CardHeader className="relative">
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/20">
                      <Wifi className="h-5 w-5 text-green-400" />
                    </div>
                    Status da Instância
                  </CardTitle>
                  <CardDescription className="text-muted-foreground/80">
                    Status atual da conexão WhatsApp
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 relative">
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-br from-background/80 to-background/40 border border-border/30">
                    {instanceStatus.status === "connected" ? (
                      <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
                        <Wifi className="h-6 w-6 text-emerald-400" />
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-muted/50 border border-border/30">
                        <WifiOff className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground/90">Status da Conexão</p>
                        {getStatusBadge(instanceStatus.status)}
                      </div>
                      <p className="text-sm text-muted-foreground/80 mt-1">
                        {instanceStatus.status === "connected"
                          ? "Pronto para enviar mensagens"
                          : instanceStatus.status === "qrcode"
                          ? "Escaneie o QR Code para conectar"
                          : instanceStatus.status === "connecting"
                          ? "Aguardando conexão..."
                          : "Instância offline"}
                      </p>
                      {instanceStatus.phone && (
                        <p className="text-sm text-green-400 mt-1">
                          <Phone className="inline h-3 w-3 mr-1" />
                          {instanceStatus.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      onClick={() => checkStatus(true)}
                      disabled={isCheckingStatus}
                      className="py-6 bg-background/50 border-border/50 hover:bg-green-500/10 hover:border-green-500/50 hover:text-green-400 transition-all duration-300"
                    >
                      {isCheckingStatus ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      Atualizar
                    </Button>
                    
                    {instanceStatus.status === "connected" ? (
                      <Button
                        variant="outline"
                        onClick={disconnectInstance}
                        disabled={isDisconnecting}
                        className="py-6 bg-background/50 border-border/50 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-400 transition-all duration-300"
                      >
                        {isDisconnecting ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Unlink className="mr-2 h-4 w-4" />
                        )}
                        Desconectar
                      </Button>
                    ) : (
                      <Button
                        onClick={connectInstance}
                        disabled={isConnecting}
                        className="py-6 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/25"
                      >
                        {isConnecting ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Link2 className="mr-2 h-4 w-4" />
                        )}
                        Conectar
                      </Button>
                    )}
                  </div>

                  {/* Pairing Code Option */}
                  {instanceStatus.status !== "connected" && (
                    <div className="space-y-3 p-4 rounded-xl bg-gradient-to-br from-background/60 to-background/30 border border-border/30">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="usePairingCode" className="text-sm font-medium">
                          Usar código de pareamento
                        </Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setUsePairingCode(!usePairingCode)}
                          className={usePairingCode ? "text-green-400" : "text-muted-foreground"}
                        >
                          {usePairingCode ? "Ativado" : "Desativado"}
                        </Button>
                      </div>
                      
                      {usePairingCode && (
                        <div className="space-y-2">
                          <Label htmlFor="phoneNumber" className="text-xs text-muted-foreground">
                            Número do WhatsApp (com DDD)
                          </Label>
                          <Input
                            id="phoneNumber"
                            placeholder="5511999999999"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="bg-background/50 border-border/50 focus:border-green-500/50"
                          />
                          <p className="text-xs text-muted-foreground/70">
                            O código será exibido e você pode digitá-lo no WhatsApp
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* QR Code / Connection Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="border-0 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl shadow-2xl shadow-green-500/5 overflow-hidden h-full">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5"></div>
                <CardHeader className="relative">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/20">
                        <QrCode className="h-5 w-5 text-green-400" />
                      </div>
                      QR Code
                    </CardTitle>
                    {instanceStatus.status !== "connected" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={connectInstance}
                        disabled={isConnecting}
                        className="hover:bg-green-500/10 hover:text-green-400 transition-all"
                      >
                        {isConnecting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                  <CardDescription className="text-muted-foreground/80">
                    Escaneie com o WhatsApp para conectar
                  </CardDescription>
                </CardHeader>
                <CardContent className="relative">
                  {instanceStatus.status === "connected" ? (
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
                        Sua instância está pronta para uso
                      </p>
                    </motion.div>
                  ) : isConnecting ? (
                    <div className="flex flex-col items-center justify-center p-8">
                      <div className="relative">
                        <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse"></div>
                        <Loader2 className="relative h-20 w-20 animate-spin text-green-400" />
                      </div>
                      <p className="text-muted-foreground mt-4">Gerando QR Code...</p>
                    </div>
                  ) : instanceStatus.pairingCode ? (
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex flex-col items-center gap-4"
                    >
                      <div className="relative p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-2xl border border-green-500/30">
                        <p className="text-3xl font-mono font-bold text-green-400 tracking-widest">
                          {instanceStatus.pairingCode}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground text-center">
                        Digite este código no WhatsApp para parear
                      </p>
                      <QRCodeTimer
                        key={qrTimerKey}
                        duration={300}
                        onExpire={() => {
                          setInstanceStatus(prev => ({ ...prev, pairingCode: undefined }));
                        }}
                        onRefresh={connectInstance}
                        isRefreshing={isConnecting}
                      />
                    </motion.div>
                  ) : instanceStatus.qrCode ? (
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex flex-col items-center gap-4"
                    >
                      <div className="relative group">
                        <div className="absolute -inset-2 bg-gradient-to-r from-green-500/30 via-emerald-500/30 to-teal-500/30 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
                        <div className="relative p-4 bg-white rounded-xl">
                          <img
                            src={instanceStatus.qrCode.startsWith('data:') ? instanceStatus.qrCode : `data:image/png;base64,${instanceStatus.qrCode}`}
                            alt="WhatsApp QR Code"
                            className="w-48 h-48"
                          />
                        </div>
                      </div>
                      
                      <QRCodeTimer
                        key={qrTimerKey}
                        duration={120}
                        onExpire={() => {
                          setInstanceStatus(prev => ({ ...prev, qrCode: undefined }));
                        }}
                        onRefresh={connectInstance}
                        isRefreshing={isConnecting}
                      />
                    </motion.div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8">
                      <div className="p-4 rounded-xl bg-muted/30 border border-border/30 mb-4">
                        <QrCode className="h-16 w-16 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground text-center mb-4">
                        Clique em "Conectar" para gerar o QR Code
                      </p>
                      <Button 
                        onClick={connectInstance}
                        disabled={isConnecting}
                        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                      >
                        {isConnecting ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Zap className="mr-2 h-4 w-4" />
                        )}
                        Gerar QR Code
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

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
                  Siga os passos para conectar seu WhatsApp
                </CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { step: 1, title: "Gere o QR Code", desc: "Clique em 'Conectar' para gerar o código", icon: QrCode },
                    { step: 2, title: "Escaneie ou Digite", desc: "Use o QR Code ou código de pareamento", icon: Smartphone },
                    { step: 3, title: "Pronto!", desc: "Sua instância está conectada", icon: CheckCircle2 },
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
