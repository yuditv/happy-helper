import { useState } from "react";
import { Send, Edit, Search, Loader2, Globe, User, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CannedResponse } from "@/hooks/useCannedResponses";
import { cn } from "@/lib/utils";

interface QuickMessagesPanelProps {
  responses: CannedResponse[];
  isLoading: boolean;
  onSendMessage: (content: string) => Promise<boolean>;
  onEditMessage: (content: string) => void;
  contactName?: string | null;
  phone?: string;
}

export function QuickMessagesPanel({
  responses,
  isLoading,
  onSendMessage,
  onEditMessage,
  contactName,
  phone
}: QuickMessagesPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sendingId, setSendingId] = useState<string | null>(null);

  // Filter responses by search query
  const filteredResponses = responses.filter(r =>
    r.short_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Replace variables before sending
  const replaceVariables = (content: string) => {
    let result = content;
    if (contactName) {
      result = result.replace(/\{\{nome\}\}/gi, contactName);
    }
    if (phone) {
      result = result.replace(/\{\{telefone\}\}/gi, phone);
    }
    return result;
  };

  const handleQuickSend = async (response: CannedResponse) => {
    setSendingId(response.id);
    const content = replaceVariables(response.content);
    await onSendMessage(content);
    setSendingId(null);
  };

  const handleEdit = (response: CannedResponse) => {
    const content = replaceVariables(response.content);
    onEditMessage(content);
  };

  return (
    <div className="w-72 border-r flex flex-col h-full bg-muted/20">
      {/* Header */}
      <div className="p-3 border-b">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquareText className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Mensagens Rápidas</h3>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* Messages List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredResponses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquareText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {searchQuery ? "Nenhuma mensagem encontrada" : "Nenhuma mensagem cadastrada"}
              </p>
              <p className="text-xs mt-1">
                Acesse Configurações → Respostas Prontas
              </p>
            </div>
          ) : (
            filteredResponses.map((response) => (
              <div
                key={response.id}
                className={cn(
                  "p-3 rounded-lg border bg-card transition-colors hover:bg-muted/50",
                  sendingId === response.id && "opacity-70"
                )}
              >
                {/* Header with short code and badge */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <Badge variant="secondary" className="font-mono text-xs">
                    /{response.short_code}
                  </Badge>
                  <Tooltip>
                    <TooltipTrigger>
                      {response.is_global ? (
                        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </TooltipTrigger>
                    <TooltipContent>
                      {response.is_global ? "Global" : "Pessoal"}
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Content preview */}
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2.5">
                  {response.content.length > 80
                    ? `${response.content.substring(0, 80)}...`
                    : response.content}
                </p>

                {/* Action buttons */}
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    className="flex-1 h-7 text-xs"
                    onClick={() => handleQuickSend(response)}
                    disabled={sendingId === response.id}
                  >
                    {sendingId === response.id ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <Send className="h-3 w-3 mr-1" />
                    )}
                    Enviar
                  </Button>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 w-7 p-0"
                        onClick={() => handleEdit(response)}
                        disabled={sendingId === response.id}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Editar antes de enviar</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer hint */}
      <div className="p-2 border-t">
        <p className="text-[10px] text-muted-foreground text-center">
          💡 Clique em "Enviar" para envio imediato
        </p>
      </div>
    </div>
  );
}
