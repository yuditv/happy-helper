import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, QrCode, Smartphone, Copy, Check } from "lucide-react";
import { WhatsAppInstance } from "@/hooks/useWhatsAppInstances";
import { toast } from "sonner";

interface QRCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instance: WhatsAppInstance | null;
  getQRCode: (instanceId: string) => Promise<string | null>;
  getPairingCode?: (instanceId: string, phoneNumber: string) => Promise<string | null>;
}

export function QRCodeDialog({ open, onOpenChange, instance, getQRCode, getPairingCode }: QRCodeDialogProps) {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pairing code state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [loadingPairCode, setLoadingPairCode] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchQRCode = async () => {
    if (!instance) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const code = await getQRCode(instance.id);
      if (code) {
        setQrCode(code);
      } else {
        setError("Não foi possível obter o QR Code. A instância pode já estar conectada.");
      }
    } catch (err) {
      setError("Erro ao buscar QR Code");
    } finally {
      setLoading(false);
    }
  };

  const fetchPairingCode = async () => {
    if (!instance || !getPairingCode || !phoneNumber) {
      toast.error("Digite um número de telefone válido");
      return;
    }
    
    setLoadingPairCode(true);
    setPairingCode(null);
    
    try {
      // Clean phone number - remove spaces, dashes, parentheses
      const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, "");
      const code = await getPairingCode(instance.id, cleanPhone);
      if (code) {
        setPairingCode(code);
      }
    } catch (err) {
      toast.error("Erro ao gerar código de pareamento");
    } finally {
      setLoadingPairCode(false);
    }
  };

  const copyPairingCode = () => {
    if (pairingCode) {
      navigator.clipboard.writeText(pairingCode.replace("-", ""));
      setCopied(true);
      toast.success("Código copiado!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    if (open && instance) {
      fetchQRCode();
    } else {
      setQrCode(null);
      setError(null);
      setPairingCode(null);
      setPhoneNumber("");
    }
  }, [open, instance]);

  // Auto-refresh QR Code every 30 seconds
  useEffect(() => {
    if (!open || !instance || instance.status === 'connected') return;
    
    const interval = setInterval(() => {
      fetchQRCode();
    }, 30000);

    return () => clearInterval(interval);
  }, [open, instance]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Conectar - {instance?.name}
          </DialogTitle>
          <DialogDescription>
            Escolha como deseja conectar sua instância WhatsApp
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="qrcode" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="qrcode" className="flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              QR Code
            </TabsTrigger>
            <TabsTrigger value="paircode" className="flex items-center gap-2" disabled={!getPairingCode}>
              <Smartphone className="w-4 h-4" />
              Código
            </TabsTrigger>
          </TabsList>

          <TabsContent value="qrcode" className="mt-4">
            <div className="flex flex-col items-center space-y-4">
              {loading ? (
                <div className="w-64 h-64 flex items-center justify-center bg-muted rounded-lg">
                  <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <div className="w-64 h-64 flex flex-col items-center justify-center bg-muted rounded-lg text-center p-4">
                  <p className="text-sm text-muted-foreground mb-4">{error}</p>
                  <Button variant="outline" size="sm" onClick={fetchQRCode}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Tentar novamente
                  </Button>
                </div>
              ) : qrCode ? (
                <div className="p-4 bg-white rounded-lg">
                  <img 
                    src={qrCode} 
                    alt="QR Code WhatsApp" 
                    className="w-56 h-56"
                  />
                </div>
              ) : (
                <div className="w-64 h-64 flex items-center justify-center bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">QR Code não disponível</p>
                </div>
              )}

              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  O QR Code atualiza automaticamente a cada 30 segundos
                </p>
                <Button variant="outline" size="sm" onClick={fetchQRCode} disabled={loading}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Atualizar QR Code
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="paircode" className="mt-4">
            <div className="flex flex-col space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Número do WhatsApp</Label>
                <Input
                  id="phone"
                  placeholder="+55 11 99999-9999"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={loadingPairCode}
                />
                <p className="text-xs text-muted-foreground">
                  Digite o número com código do país (ex: 5511999999999)
                </p>
              </div>

              <Button 
                onClick={fetchPairingCode} 
                disabled={loadingPairCode || !phoneNumber}
                className="w-full"
              >
                {loadingPairCode ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Gerando código...
                  </>
                ) : (
                  <>
                    <Smartphone className="w-4 h-4 mr-2" />
                    Gerar Código
                  </>
                )}
              </Button>

              {pairingCode && (
                <div className="mt-4 space-y-4">
                  <div className="p-6 bg-muted rounded-lg text-center">
                    <p className="text-sm text-muted-foreground mb-2">Seu código de pareamento:</p>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-3xl font-mono font-bold tracking-wider">
                        {pairingCode}
                      </span>
                      <Button variant="ghost" size="icon" onClick={copyPairingCode}>
                        {copied ? (
                          <Check className="w-5 h-5 text-green-500" />
                        ) : (
                          <Copy className="w-5 h-5" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground space-y-2 p-4 bg-muted/50 rounded-lg">
                    <p className="font-medium">Como conectar:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Abra o WhatsApp no seu celular</li>
                      <li>Vá em <strong>Aparelhos conectados</strong></li>
                      <li>Toque em <strong>Conectar um aparelho</strong></li>
                      <li>Selecione <strong>Conectar com número de telefone</strong></li>
                      <li>Digite o código acima</li>
                    </ol>
                  </div>
                </div>
              )}

              {!pairingCode && !loadingPairCode && (
                <div className="text-center p-4 text-sm text-muted-foreground">
                  <p>O código de pareamento é uma alternativa ao QR Code.</p>
                  <p>Ideal quando você não tem acesso à câmera.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
