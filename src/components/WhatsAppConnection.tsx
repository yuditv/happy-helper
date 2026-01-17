import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Smartphone, QrCode, CheckCircle2, XCircle, Loader2, RefreshCw, Plus, Wifi, WifiOff, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [instance, setInstance] = useState<InstanceData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const testConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke("test-evolution-connection");

      if (error) throw error;

      console.log("Test result:", data);
      setTestResult(data);
      
      if (data?.apiTest?.success) {
        toast.success("Conexão com Evolution API funcionando!");
      } else {
        toast.error("Falha na conexão com Evolution API");
      }
    } catch (err: any) {
      console.error("Error testing connection:", err);
      setError(err.message || "Erro ao testar conexão");
      toast.error("Erro ao testar conexão: " + err.message);
    } finally {
      setIsTesting(false);
    }
  };

  // Check saved instance on mount
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

      console.log("Instance created:", data);

      const newInstance: InstanceData = {
        instanceName: instanceName.trim(),
        status: "qrcode",
        base64: data?.data?.qrcode?.base64,
      };

      setInstance(newInstance);
      localStorage.setItem("whatsapp_instance", JSON.stringify({ instanceName: instanceName.trim() }));
      toast.success("Instância criada com sucesso!");

      // If no QR code in response, fetch it
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

      console.log("Instance status:", data);

      const state = data?.data?.instance?.state || data?.data?.state;
      
      if (state === "open" || state === "connected") {
        setInstance(prev => prev ? { ...prev, status: "connected" } : null);
        toast.success("WhatsApp conectado!");
      } else if (state === "close" || state === "disconnected") {
        setInstance(prev => prev ? { ...prev, status: "disconnected" } : null);
      } else {
        // Need to scan QR code
        await getQRCode(name);
      }
    } catch (err: any) {
      console.error("Error checking status:", err);
      // Instance might not exist, try to get QR code
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

      console.log("QR Code response:", data);

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
          <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Conectado
          </Badge>
        );
      case "qrcode":
        return (
          <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
            <QrCode className="w-3 h-3 mr-1" />
            Aguardando QR Code
          </Badge>
        );
      case "connecting":
        return (
          <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Conectando
          </Badge>
        );
      default:
        return (
          <Badge className="bg-red-500/20 text-red-500 border-red-500/30">
            <XCircle className="w-3 h-3 mr-1" />
            Desconectado
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Smartphone className="h-6 w-6 text-green-500" />
            Conexão WhatsApp
          </h1>
          <p className="text-muted-foreground mt-1">
            Conecte sua instância do WhatsApp via Evolution API
          </p>
        </div>
      </div>

      {/* Test Connection Button */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Testar Conexão com Evolution API
          </CardTitle>
          <CardDescription>
            Verifica se os secrets estão configurados e a API está acessível
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={testConnection} disabled={isTesting}>
            {isTesting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testando...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Testar Conexão
              </>
            )}
          </Button>
          
          {testResult && (
            <div className="mt-4 p-4 rounded-lg bg-muted/50 overflow-auto max-h-96">
              <pre className="text-xs whitespace-pre-wrap">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!instance ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Criar Nova Instância
            </CardTitle>
            <CardDescription>
              Digite um nome único para identificar sua instância do WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="instanceName">Nome da Instância</Label>
              <Input
                id="instanceName"
                placeholder="minha-instancia"
                value={instanceName}
                onChange={(e) => setInstanceName(e.target.value)}
                disabled={isCreating}
              />
              <p className="text-xs text-muted-foreground">
                Use apenas letras, números e hífens. Sem espaços ou caracteres especiais.
              </p>
            </div>
            <Button onClick={createInstance} disabled={isCreating || !instanceName.trim()}>
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Instância
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Instance Info Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  {instance.instanceName}
                </CardTitle>
                {getStatusBadge()}
              </div>
              <CardDescription>
                Informações da sua instância WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                {instance.status === "connected" ? (
                  <Wifi className="h-5 w-5 text-green-500" />
                ) : (
                  <WifiOff className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">Status da Conexão</p>
                  <p className="text-sm text-muted-foreground">
                    {instance.status === "connected"
                      ? "WhatsApp conectado e pronto para enviar mensagens"
                      : instance.status === "qrcode"
                      ? "Escaneie o QR Code para conectar"
                      : "Instância desconectada"}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={refreshStatus}
                  disabled={isChecking}
                  className="flex-1"
                >
                  {isChecking ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Atualizar Status
                </Button>
                <Button
                  variant="destructive"
                  onClick={disconnectInstance}
                  className="flex-1"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Desconectar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* QR Code Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  QR Code
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshQRCode}
                  disabled={isLoadingQR || instance.status === "connected"}
                >
                  {isLoadingQR ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <CardDescription>
                Escaneie com o WhatsApp do seu celular
              </CardDescription>
            </CardHeader>
            <CardContent>
              {instance.status === "connected" ? (
                <div className="flex flex-col items-center justify-center p-8 rounded-lg bg-green-500/10 border border-green-500/30">
                  <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
                  <p className="text-lg font-medium text-green-500">WhatsApp Conectado!</p>
                  <p className="text-sm text-muted-foreground text-center mt-2">
                    Sua instância está pronta para enviar mensagens
                  </p>
                </div>
              ) : isLoadingQR ? (
                <div className="flex flex-col items-center justify-center p-8">
                  <Loader2 className="h-16 w-16 animate-spin text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Carregando QR Code...</p>
                </div>
              ) : instance.base64 ? (
                <div className="flex flex-col items-center">
                  <div className="p-4 bg-white rounded-lg">
                    <img
                      src={instance.base64}
                      alt="QR Code"
                      className="w-64 h-64"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-4 text-center">
                    Abra o WhatsApp → Menu (⋮) → Aparelhos conectados → Conectar
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 rounded-lg bg-muted/50">
                  <QrCode className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    Clique em "Atualizar Status" para gerar o QR Code
                  </p>
                  <Button
                    variant="outline"
                    onClick={refreshQRCode}
                    disabled={isLoadingQR}
                    className="mt-4"
                  >
                    <QrCode className="mr-2 h-4 w-4" />
                    Gerar QR Code
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Como conectar</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>Crie uma nova instância com um nome único</li>
            <li>Aguarde o QR Code ser gerado</li>
            <li>Abra o WhatsApp no seu celular</li>
            <li>Vá em Menu (⋮) → Aparelhos conectados → Conectar um aparelho</li>
            <li>Escaneie o QR Code exibido na tela</li>
            <li>Aguarde a conexão ser estabelecida</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
