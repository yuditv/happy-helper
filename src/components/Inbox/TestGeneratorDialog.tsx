import { useState } from "react";
import { RefreshCw, Copy, Loader2, FlaskConical, User, Lock, Calendar, Link2, Smartphone, Cloud } from "lucide-react";
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

interface TestCredentials {
  username: string;
  password: string;
  expiresAt: string;
  connections: string;
  linkM3U: string;
  assistPlusCode: string;
  corePlayerCode: string;
  playSimCode: string;
  xcloudProvider: string;
}

const extractCredentials = (data: any): TestCredentials => {
  return {
    username: data.username || data.user || data.Usuario || '',
    password: data.password || data.pass || data.Senha || '',
    expiresAt: data.expiresAt || data.exp_date || data.Expira || data.expira || '',
    connections: String(data.connections || data.max_connections || data.Conexoes || ''),
    linkM3U: data.m3u_url || data.linkM3U || data.M3U || data.link_m3u || '',
    assistPlusCode: data.assist_plus || data.assistPlus || data.ASSIST_PLUS || '',
    corePlayerCode: data.core_player || data.corePlayer || data.CORE_PLAYER || '',
    playSimCode: data.playsim || data.PlaySim || data.PLAYSIM || '',
    xcloudProvider: data.xcloud || data.XCLOUD || data.xcloud_provider || '',
  };
};

export function TestGeneratorDialog({ open, onOpenChange }: TestGeneratorDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [credentials, setCredentials] = useState<TestCredentials | null>(null);
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
      const extracted = extractCredentials(data);
      setCredentials(extracted);
    } catch (err) {
      console.error("Erro ao gerar teste:", err);
      setError("Erro ao gerar teste. Verifique sua conexão e tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyField = async (label: string, value: string) => {
    if (value) {
      try {
        await navigator.clipboard.writeText(value);
        toast({ 
          title: "Copiado!", 
          description: `${label} copiado para a área de transferência` 
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

  const copyAll = async () => {
    if (credentials) {
      const formattedText = `👤 Usuário: ${credentials.username}
🔐 Senha: ${credentials.password}
📅 Expira em: ${credentials.expiresAt}
🔗 Conexões: ${credentials.connections}

📺 Link M3U: ${credentials.linkM3U}
📱 ASSIST PLUS Código: ${credentials.assistPlusCode}
📱 CORE PLAYER Código: ${credentials.corePlayerCode}
📱 PlaySim Código: ${credentials.playSimCode}
☁️ XCLOUD Provedor: ${credentials.xcloudProvider}`;

      try {
        await navigator.clipboard.writeText(formattedText);
        toast({ 
          title: "Copiado!", 
          description: "Todos os dados foram copiados" 
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
      setCredentials(null);
      setError(null);
    }
    onOpenChange(newOpen);
  };

  const CredentialRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
    <div className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 transition-colors group">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm text-muted-foreground shrink-0">{label}:</span>
        <span className="text-sm font-medium truncate">{value || '-'}</span>
      </div>
      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={() => copyField(label, value)}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
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
          
          {credentials && (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-4">
                {/* Credenciais */}
                <div className="rounded-lg border bg-card p-1">
                  <div className="px-3 py-2 border-b">
                    <h4 className="text-sm font-semibold text-foreground">Credenciais</h4>
                  </div>
                  <div className="divide-y">
                    <CredentialRow icon={User} label="Usuário" value={credentials.username} />
                    <CredentialRow icon={Lock} label="Senha" value={credentials.password} />
                    <CredentialRow icon={Calendar} label="Expira em" value={credentials.expiresAt} />
                    <CredentialRow icon={Link2} label="Conexões" value={credentials.connections} />
                  </div>
                </div>

                {/* Links e Códigos */}
                <div className="rounded-lg border bg-card p-1">
                  <div className="px-3 py-2 border-b">
                    <h4 className="text-sm font-semibold text-foreground">Links e Códigos</h4>
                  </div>
                  <div className="divide-y">
                    <CredentialRow icon={Link2} label="Link M3U" value={credentials.linkM3U} />
                    <CredentialRow icon={Smartphone} label="ASSIST PLUS Código" value={credentials.assistPlusCode} />
                    <CredentialRow icon={Smartphone} label="CORE PLAYER Código" value={credentials.corePlayerCode} />
                    <CredentialRow icon={Smartphone} label="PlaySim Código" value={credentials.playSimCode} />
                    <CredentialRow icon={Cloud} label="XCLOUD Provedor" value={credentials.xcloudProvider} />
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </div>
        
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4">
          {credentials && (
            <Button onClick={copyAll} variant="default">
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
