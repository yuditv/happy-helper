import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RefreshCw, QrCode, Smartphone, AlertCircle } from "lucide-react";
import { WhatsAppInstance } from "@/hooks/useWhatsAppInstances";

interface QRCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instance: WhatsAppInstance | null;
  getQRCode: (instanceId: string) => Promise<string | null>;
  getPairingCode?: (instanceId: string, phoneNumber: string) => Promise<string | null>;
}

export function QRCodeDialog({ open, onOpenChange, instance, getQRCode }: QRCodeDialogProps) {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (open && instance) {
      fetchQRCode();
    } else {
      setQrCode(null);
      setError(null);
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
            Escaneie o QR Code com seu WhatsApp para conectar
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-4 py-4">
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
            <div className="p-4 bg-white rounded-lg shadow-sm">
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

          <div className="text-center space-y-3">
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium">Como conectar:</p>
              <ol className="list-decimal list-inside text-left space-y-1">
                <li>Abra o WhatsApp no seu celular</li>
                <li>Vá em <strong>Aparelhos conectados</strong></li>
                <li>Toque em <strong>Conectar um aparelho</strong></li>
                <li>Escaneie o QR Code acima</li>
              </ol>
            </div>
            
            <p className="text-xs text-muted-foreground">
              O QR Code atualiza automaticamente a cada 30 segundos
            </p>
            
            <Button variant="outline" size="sm" onClick={fetchQRCode} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar QR Code
            </Button>
          </div>

          {/* Info about pairing code */}
          <div className="w-full mt-4 p-3 bg-muted/50 rounded-lg border border-border/50">
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>
                <strong>Nota:</strong> O código de pareamento (alternativa ao QR Code) não está disponível 
                nesta versão da API. Use o QR Code para conectar sua instância.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
