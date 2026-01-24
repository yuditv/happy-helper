import { useState } from "react";
import { RefreshCw, Copy, Loader2, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface TestGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TestGeneratorDialog({ open, onOpenChange }: TestGeneratorDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [testData, setTestData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const generateTest = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        "https://sportplay.sigmab.pro/api/chatbot/80m1Eev1lE/VpKDaPJLRA",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setTestData(JSON.stringify(data, null, 2));
    } catch (err) {
      console.error("Erro ao gerar teste:", err);
      setError("Erro ao gerar teste. Verifique sua conexão e tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (testData) {
      try {
        await navigator.clipboard.writeText(testData);
        toast({ 
          title: "Copiado!", 
          description: "Dados copiados para a área de transferência" 
        });
      } catch (err) {
        toast({ 
          title: "Erro ao copiar", 
          description: "Não foi possível copiar para a área de transferência",
          variant: "destructive"
        });
      }
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state when closing
      setTestData(null);
      setError(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            Gerar Teste Automático
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Button 
            onClick={generateTest} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Gerar Novo Teste
              </>
            )}
          </Button>
          
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}
          
          {testData && (
            <ScrollArea className="h-[300px] rounded-md border">
              <pre className="text-xs p-4 bg-muted/50 whitespace-pre-wrap break-all">
                {testData}
              </pre>
            </ScrollArea>
          )}
        </div>
        
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4">
          {testData && (
            <Button onClick={copyToClipboard} variant="default">
              <Copy className="h-4 w-4 mr-2" />
              Copiar Tudo
            </Button>
          )}
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
