import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Smartphone, Loader2 } from "lucide-react";

interface CreateInstanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateInstance: (name: string, dailyLimit?: number) => Promise<any>;
  onRefetch: () => void;
}

export function CreateInstanceDialog({ 
  open, 
  onOpenChange, 
  onCreateInstance,
  onRefetch 
}: CreateInstanceDialogProps) {
  const [name, setName] = useState("");
  const [dailyLimit, setDailyLimit] = useState("500");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;
    
    setLoading(true);
    try {
      const result = await onCreateInstance(name.trim(), parseInt(dailyLimit) || 500);
      if (result) {
        setName("");
        setDailyLimit("500");
        onOpenChange(false);
        onRefetch();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Nova Instância WhatsApp
          </DialogTitle>
          <DialogDescription>
            Crie uma nova instância para conectar seu WhatsApp
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Instância</Label>
            <Input
              id="name"
              placeholder="Ex: WhatsApp Principal"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dailyLimit">Limite Diário de Mensagens</Label>
            <Input
              id="dailyLimit"
              type="number"
              placeholder="500"
              value={dailyLimit}
              onChange={(e) => setDailyLimit(e.target.value)}
              min="1"
              max="5000"
            />
            <p className="text-xs text-muted-foreground">
              Máximo de mensagens que podem ser enviadas por dia
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar Instância"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
