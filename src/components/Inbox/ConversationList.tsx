import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Search, 
  Bot, 
  User, 
  Circle,
  Filter,
  Globe
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Conversation } from "@/hooks/useInboxConversations";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Country code to flag emoji and name mapping
const countryData: Record<string, { flag: string; name: string }> = {
  US: { flag: '🇺🇸', name: 'Estados Unidos' },
  BR: { flag: '🇧🇷', name: 'Brasil' },
  GB: { flag: '🇬🇧', name: 'Reino Unido' },
  PT: { flag: '🇵🇹', name: 'Portugal' },
  ES: { flag: '🇪🇸', name: 'Espanha' },
  FR: { flag: '🇫🇷', name: 'França' },
  DE: { flag: '🇩🇪', name: 'Alemanha' },
  IT: { flag: '🇮🇹', name: 'Itália' },
  AR: { flag: '🇦🇷', name: 'Argentina' },
  CL: { flag: '🇨🇱', name: 'Chile' },
  CO: { flag: '🇨🇴', name: 'Colômbia' },
  VE: { flag: '🇻🇪', name: 'Venezuela' },
  MX: { flag: '🇲🇽', name: 'México' },
  PE: { flag: '🇵🇪', name: 'Peru' },
  BO: { flag: '🇧🇴', name: 'Bolívia' },
  PY: { flag: '🇵🇾', name: 'Paraguai' },
  UY: { flag: '🇺🇾', name: 'Uruguai' },
  EC: { flag: '🇪🇨', name: 'Equador' },
  IE: { flag: '🇮🇪', name: 'Irlanda' },
  NL: { flag: '🇳🇱', name: 'Holanda' },
  BE: { flag: '🇧🇪', name: 'Bélgica' },
  CH: { flag: '🇨🇭', name: 'Suíça' },
  AT: { flag: '🇦🇹', name: 'Áustria' },
  PL: { flag: '🇵🇱', name: 'Polônia' },
  JP: { flag: '🇯🇵', name: 'Japão' },
  CN: { flag: '🇨🇳', name: 'China' },
  IN: { flag: '🇮🇳', name: 'Índia' },
  AU: { flag: '🇦🇺', name: 'Austrália' },
  NZ: { flag: '🇳🇿', name: 'Nova Zelândia' },
  ZA: { flag: '🇿🇦', name: 'África do Sul' },
  AE: { flag: '🇦🇪', name: 'Emirados Árabes' },
  IL: { flag: '🇮🇱', name: 'Israel' },
  SA: { flag: '🇸🇦', name: 'Arábia Saudita' },
  CA: { flag: '🇨🇦', name: 'Canadá' },
};

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (conversation: Conversation) => void;
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  isLoading,
  searchQuery,
  onSearchChange
}: ConversationListProps) {
  const [sortBy, setSortBy] = useState<'recent' | 'unread'>('recent');

  const sortedConversations = [...conversations].sort((a, b) => {
    if (sortBy === 'unread') {
      if (a.unread_count > 0 && b.unread_count === 0) return -1;
      if (a.unread_count === 0 && b.unread_count > 0) return 1;
    }
    return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
  });

  const getInitials = (name: string | null, phone: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return phone.slice(-2);
  };

  const formatPhone = (phone: string) => {
    if (phone.length === 13) {
      return `+${phone.slice(0, 2)} (${phone.slice(2, 4)}) ${phone.slice(4, 9)}-${phone.slice(9)}`;
    }
    return phone;
  };

  return (
    <div className="w-80 border-r flex flex-col h-full inbox-sidebar overflow-hidden">
      {/* Search Header */}
      <div className="p-3 border-b border-border/50 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {conversations.length} conversas
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                <Filter className="h-3 w-3 mr-1" />
                {sortBy === 'recent' ? 'Recentes' : 'Não lidas'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortBy('recent')}>
                Mais recentes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('unread')}>
                Não lidas primeiro
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1 inbox-scroll">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 bg-muted rounded" />
                  <div className="h-3 w-32 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : sortedConversations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Circle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhuma conversa encontrada</p>
          </div>
        ) : (
          <div className="divide-y">
            {sortedConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => onSelect(conversation)}
                className={cn(
                  "w-full p-3 flex items-start gap-3 transition-colors text-left border-b border-border/30",
                  "hover:bg-inbox-hover",
                  selectedId === conversation.id && "bg-inbox-active border-l-2 border-l-primary"
                )}
              >
                {/* Avatar */}
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={conversation.contact_avatar || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {getInitials(conversation.contact_name, conversation.phone)}
                    </AvatarFallback>
                  </Avatar>
                  {/* Status indicator */}
                  <div className={cn(
                    "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
                    conversation.status === 'open' && "bg-green-500",
                    conversation.status === 'pending' && "bg-yellow-500",
                    conversation.status === 'resolved' && "bg-gray-400",
                    conversation.status === 'snoozed' && "bg-blue-500"
                  )} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {/* Country flag for international contacts */}
                      {conversation.country_code && conversation.country_code !== 'BR' && countryData[conversation.country_code] && (
                        <TooltipProvider delayDuration={100}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-sm shrink-0" role="img" aria-label={countryData[conversation.country_code].name}>
                                {countryData[conversation.country_code].flag}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              {countryData[conversation.country_code].name}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <span className={cn(
                        "font-medium truncate text-sm",
                        conversation.unread_count > 0 && "font-semibold"
                      )}>
                        {conversation.contact_name || formatPhone(conversation.phone)}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(conversation.last_message_at), {
                        addSuffix: false,
                        locale: ptBR
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 mt-0.5">
                    {/* AI indicator */}
                    {conversation.ai_enabled && (
                      <Bot className="h-3 w-3 text-primary shrink-0" />
                    )}
                    {/* Assigned indicator */}
                    {conversation.assigned_to && (
                      <User className="h-3 w-3 text-muted-foreground shrink-0" />
                    )}
                    {/* Message preview */}
                    <p className={cn(
                      "text-xs truncate",
                      conversation.unread_count > 0 
                        ? "text-foreground" 
                        : "text-muted-foreground"
                    )}>
                      {conversation.last_message_preview || "Sem mensagens"}
                    </p>
                  </div>

                  {/* Labels & Unread */}
                  <div className="flex items-center gap-1 mt-1">
                    {conversation.labels?.slice(0, 2).map((l) => (
                      <div
                        key={l.id}
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: l.label?.color }}
                        title={l.label?.name}
                      />
                    ))}
                    {conversation.labels && conversation.labels.length > 2 && (
                      <span className="text-xs text-muted-foreground">
                        +{conversation.labels.length - 2}
                      </span>
                    )}
                    
                    {conversation.unread_count > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="ml-auto h-5 min-w-5 text-xs px-1.5"
                      >
                        {conversation.unread_count}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
