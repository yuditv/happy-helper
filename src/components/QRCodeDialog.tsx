import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RefreshCw, QrCode } from "lucide-react";
import { WhatsAppInstance } from "@/hooks/useWhatsAppInstances";

interface QRCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instance: WhatsAppInstance | null;
  getQRCode: (instanceId: string) => Promise<string | null>;
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
            QR Code - {instance?.name}
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
      </DialogContent>
    </Dialog>
  );
}
