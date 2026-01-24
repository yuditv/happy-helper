import { useState, useRef, useEffect } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Send, 
  MoreVertical, 
  Bot, 
  User,
  Check,
  Clock,
  Tag,
  UserPlus,
  Archive,
  RotateCcw,
  Lock,
  PanelRightOpen,
  PanelRightClose
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Conversation, InboxLabel } from "@/hooks/useInboxConversations";
import { ChatMessage } from "@/hooks/useInboxMessages";
import { useAuth } from "@/hooks/useAuth";
import { useClientByPhone } from "@/hooks/useClientByPhone";
import { useCannedResponses } from "@/hooks/useCannedResponses";
import { ClientInfoPanel } from "./ClientInfoPanel";
import { MessageStatus } from "./MessageStatus";
import { TypingIndicator } from "./TypingIndicator";
import { FileUploadButton } from "./FileUploadButton";
import { AttachmentPreview } from "./AttachmentPreview";
import { QuickReplyAutocomplete } from "./QuickReplyAutocomplete";

interface ChatPanelProps {
  conversation: Conversation | null;
  messages: ChatMessage[];
  labels: InboxLabel[];
  isLoading: boolean;
  isSending: boolean;
  onSendMessage: (content: string, isPrivate?: boolean, mediaUrl?: string, mediaType?: string) => Promise<boolean>;
  onAssignToMe: () => void;
  onResolve: () => void;
  onReopen: () => void;
  onToggleAI: (enabled: boolean) => void;
  onAssignLabel: (labelId: string) => void;
  onRemoveLabel: (labelId: string) => void;
  onMarkAsRead: () => void;
  onRegisterClient?: (phone: string, name?: string) => void;
  onRetryMessage?: (messageId: string) => Promise<boolean>;
}

interface AttachmentState {
  url: string;
  type: string;
  fileName: string;
}

export function ChatPanel({
  conversation,
  messages,
  labels,
  isLoading,
  isSending,
  onSendMessage,
  onAssignToMe,
  onResolve,
  onReopen,
  onToggleAI,
  onAssignLabel,
  onRemoveLabel,
  onMarkAsRead,
  onRegisterClient,
  onRetryMessage
}: ChatPanelProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [showClientPanel, setShowClientPanel] = useState(true);
  const [attachment, setAttachment] = useState<AttachmentState | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [autocompleteIndex, setAutocompleteIndex] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch client by phone
  const { client, isLoading: isLoadingClient } = useClientByPhone(conversation?.phone || null);

  // Canned responses for quick replies
  const { responses, searchResponses, findByShortCode } = useCannedResponses();

  // Get autocomplete suggestions based on current message
  const getAutocompleteSuggestions = () => {
    if (!message.startsWith('/')) return [];
    const query = message.slice(1); // Remove the leading /
    return searchResponses(query);
  };

  const autocompleteSuggestions = getAutocompleteSuggestions();
  const showAutocomplete = message.startsWith('/') && autocompleteSuggestions.length > 0;

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Mark as read when conversation is selected
  useEffect(() => {
    if (conversation && conversation.unread_count > 0) {
      onMarkAsRead();
    }
  }, [conversation?.id]);

  // Reset autocomplete index when suggestions change
  useEffect(() => {
    setAutocompleteIndex(-1);
  }, [autocompleteSuggestions.length]);

  // Simulate typing indicator based on recent messages (last message from contact within 30s)
  useEffect(() => {
    if (!conversation || messages.length === 0) {
      setIsTyping(false);
      return;
    }

    const lastContactMessage = [...messages].reverse().find(m => m.sender_type === 'contact');
    if (!lastContactMessage) {
      setIsTyping(false);
      return;
    }

    const timeSinceLastMessage = Date.now() - new Date(lastContactMessage.created_at).getTime();
    
    // Show typing for 5 seconds after a message, simulating continued engagement
    if (timeSinceLastMessage < 5000) {
      setIsTyping(true);
      const timeout = setTimeout(() => setIsTyping(false), 5000 - timeSinceLastMessage);
      return () => clearTimeout(timeout);
    } else {
      setIsTyping(false);
    }
  }, [messages, conversation]);

  const handleSelectAutocomplete = (response: typeof responses[0]) => {
    // Replace message with canned response content
    let content = response.content;
    
    // Replace variables
    if (conversation?.contact_name) {
      content = content.replace(/\{\{nome\}\}/gi, conversation.contact_name);
    }
    if (conversation?.phone) {
      content = content.replace(/\{\{telefone\}\}/gi, conversation.phone);
    }
    
    setMessage(content);
    setAutocompleteIndex(-1);
    textareaRef.current?.focus();
  };

  const handleSend = async () => {
    if ((!message.trim() && !attachment) || isSending) return;
    
    const success = await onSendMessage(
      message.trim(), 
      isPrivate,
      attachment?.url,
      attachment?.type
    );
    
    if (success) {
      setMessage("");
      setIsPrivate(false);
      setAttachment(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle autocomplete navigation
    if (showAutocomplete) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setAutocompleteIndex(prev => 
          prev < autocompleteSuggestions.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setAutocompleteIndex(prev => 
          prev > 0 ? prev - 1 : autocompleteSuggestions.length - 1
        );
        return;
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && autocompleteIndex >= 0)) {
        e.preventDefault();
        if (autocompleteIndex >= 0) {
          handleSelectAutocomplete(autocompleteSuggestions[autocompleteIndex]);
        } else if (autocompleteSuggestions.length > 0) {
          handleSelectAutocomplete(autocompleteSuggestions[0]);
        }
        return;
      }
      if (e.key === 'Escape') {
        setMessage('');
        return;
      }
    }

    // Check for shortcode completion on space
    if (e.key === ' ' && message.startsWith('/')) {
      const shortCode = message.slice(1).trim();
      const response = findByShortCode(shortCode);
      if (response) {
        e.preventDefault();
        handleSelectAutocomplete(response);
        return;
      }
    }

    // Send on Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUploaded = (url: string, type: string, fileName: string) => {
    setAttachment({ url, type, fileName });
  };

  const formatPhone = (phone: string) => {
    if (phone.length === 13) {
      return `+${phone.slice(0, 2)} (${phone.slice(2, 4)}) ${phone.slice(4, 9)}-${phone.slice(9)}`;
    }
    return phone;
  };

  const getInitials = (name: string | null, phone: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return phone.slice(-2);
  };

  const getSenderInfo = (msg: ChatMessage) => {
    switch (msg.sender_type) {
      case 'contact':
        return { 
          name: conversation?.contact_name || 'Cliente',
          icon: User,
          color: 'text-foreground'
        };
      case 'agent':
        return { 
          name: msg.metadata?.sent_by as string || 'Atendente',
          icon: User,
          color: 'text-blue-500'
        };
      case 'ai':
        return { 
          name: msg.metadata?.agent_name as string || 'Assistente IA',
          icon: Bot,
          color: 'text-primary'
        };
      case 'system':
        return { 
          name: 'Sistema',
          icon: Clock,
          color: 'text-muted-foreground'
        };
      default:
        return { name: 'Desconhecido', icon: User, color: 'text-foreground' };
    }
  };

  const getMessageStatus = (msg: ChatMessage): 'sending' | 'sent' | 'delivered' | 'read' | 'failed' => {
    // Check metadata status first (optimistic updates)
    const metadataStatus = msg.metadata?.status as string | undefined;
    if (metadataStatus === 'sending') return 'sending';
    if (metadataStatus === 'failed' || msg.metadata?.send_error) return 'failed';
    
    // Check if read
    if (msg.is_read) return 'read';
    
    // Check metadata for delivered/sent status
    if (metadataStatus === 'delivered') return 'delivered';
    if (metadataStatus === 'sent') return 'sent';
    
    // For temp messages (optimistic), use time-based logic
    if (msg.id.startsWith('temp-')) {
      return 'sending';
    }
    
    // For real messages without explicit status, assume delivered
    return 'delivered';
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center text-muted-foreground">
          <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="font-medium">Selecione uma conversa</h3>
          <p className="text-sm">Escolha uma conversa da lista para começar</p>
        </div>
      </div>
    );
  }

  const assignedLabels = conversation.labels?.map(l => l.label) || [];
  const availableLabels = labels.filter(l => !assignedLabels.some(al => al?.id === l.id));

  return (
    <div className="flex-1 flex h-full bg-background">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="p-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={conversation.contact_avatar || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials(conversation.contact_name, conversation.phone)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold">
              {conversation.contact_name || formatPhone(conversation.phone)}
            </h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{formatPhone(conversation.phone)}</span>
              <span>•</span>
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs",
                  conversation.status === 'open' && "border-green-500 text-green-500",
                  conversation.status === 'resolved' && "border-gray-400 text-gray-400"
                )}
              >
                {conversation.status === 'open' ? 'Aberta' : 
                 conversation.status === 'pending' ? 'Pendente' :
                 conversation.status === 'resolved' ? 'Resolvida' : 'Adiada'}
              </Badge>
              {conversation.instance && (
                <>
                  <span>•</span>
                  <span>{conversation.instance.instance_name}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* AI Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted">
                <Bot className={cn(
                  "h-4 w-4",
                  conversation.ai_enabled ? "text-primary" : "text-muted-foreground"
                )} />
                <Switch
                  checked={conversation.ai_enabled}
                  onCheckedChange={onToggleAI}
                  className="scale-75"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {conversation.ai_enabled ? 'IA ativada' : 'IA desativada'}
            </TooltipContent>
          </Tooltip>

          {/* Assign to me */}
          {!conversation.assigned_to && (
            <Button variant="outline" size="sm" onClick={onAssignToMe}>
              <UserPlus className="h-4 w-4 mr-1" />
              Assumir
            </Button>
          )}

          {/* Resolve/Reopen */}
          {conversation.status === 'open' || conversation.status === 'pending' ? (
            <Button variant="outline" size="sm" onClick={onResolve}>
              <Check className="h-4 w-4 mr-1" />
              Resolver
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={onReopen}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Reabrir
            </Button>
          )}

          {/* More Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Archive className="h-4 w-4 mr-2" />
                Arquivar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {/* Labels submenu */}
              {availableLabels.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    Adicionar etiqueta
                  </div>
                  {availableLabels.map(label => (
                    <DropdownMenuItem 
                      key={label.id}
                      onClick={() => onAssignLabel(label.id)}
                    >
                      <div 
                        className="h-3 w-3 rounded-full mr-2"
                        style={{ backgroundColor: label.color }}
                      />
                      {label.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Labels bar */}
      {assignedLabels.length > 0 && (
        <div className="px-3 py-2 border-b flex items-center gap-2 flex-wrap">
          <Tag className="h-3 w-3 text-muted-foreground" />
          {assignedLabels.map(label => label && (
            <Badge
              key={label.id}
              variant="secondary"
              className="text-xs cursor-pointer hover:opacity-80"
              style={{ 
                backgroundColor: `${label.color}20`,
                borderColor: label.color,
                color: label.color
              }}
              onClick={() => onRemoveLabel(label.id)}
            >
              {label.name}
              <span className="ml-1">×</span>
            </Badge>
          ))}
        </div>
      )}

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={cn(
                "flex gap-2",
                i % 2 === 0 ? "justify-start" : "justify-end"
              )}>
                <div className={cn(
                  "animate-pulse rounded-lg p-3",
                  i % 2 === 0 ? "bg-muted w-48" : "bg-primary/20 w-36"
                )}>
                  <div className="h-4 bg-muted-foreground/20 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhuma mensagem ainda</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, index) => {
              const sender = getSenderInfo(msg);
              const isOutgoing = msg.sender_type === 'agent' || msg.sender_type === 'ai';
              const showDate = index === 0 || 
                format(new Date(msg.created_at), 'yyyy-MM-dd') !== 
                format(new Date(messages[index - 1].created_at), 'yyyy-MM-dd');
              const messageStatus = getMessageStatus(msg);

              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="text-center my-4">
                      <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                        {format(new Date(msg.created_at), "d 'de' MMMM", { locale: ptBR })}
                      </span>
                    </div>
                  )}
                  
                  <div className={cn(
                    "flex gap-2",
                    isOutgoing ? "justify-end" : "justify-start"
                  )}>
                    <div className={cn(
                      "max-w-[70%] rounded-lg p-3",
                      isOutgoing 
                        ? msg.sender_type === 'ai'
                          ? "bg-primary/20 text-foreground"
                          : "bg-primary text-primary-foreground"
                        : "bg-muted",
                      msg.is_private && "border-2 border-dashed border-yellow-500"
                    )}>
                      {/* Sender info */}
                      <div className={cn(
                        "flex items-center gap-1 text-xs mb-1",
                        isOutgoing ? "justify-end" : "justify-start",
                        isOutgoing 
                          ? msg.sender_type === 'ai' ? "text-primary" : "text-primary-foreground/70"
                          : "text-muted-foreground"
                      )}>
                        <sender.icon className="h-3 w-3" />
                        <span>{sender.name}</span>
                        {msg.is_private && (
                          <Lock className="h-3 w-3 text-yellow-500" />
                        )}
                      </div>

                      {/* Media */}
                      {msg.media_url && (
                        <div className="mb-2">
                          {msg.media_type?.startsWith('image/') ? (
                            <img 
                              src={msg.media_url} 
                              alt="Media" 
                              className="rounded max-w-full max-h-64 object-cover"
                            />
                          ) : msg.media_type?.startsWith('video/') ? (
                            <video 
                              src={msg.media_url} 
                              controls
                              className="rounded max-w-full max-h-64"
                            />
                          ) : (
                            <a 
                              href={msg.media_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm underline flex items-center gap-1"
                            >
                              📎 Anexo
                            </a>
                          )}
                        </div>
                      )}

                      {/* Content */}
                      {msg.content && (
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {msg.content}
                        </p>
                      )}

                      {/* Time and Status */}
                      <div className={cn(
                        "flex items-center gap-1 text-xs mt-1",
                        isOutgoing ? "justify-end" : "justify-start",
                        isOutgoing 
                          ? msg.sender_type === 'ai' ? "text-muted-foreground" : "text-primary-foreground/70"
                          : "text-muted-foreground"
                      )}>
                        <span>
                          {format(new Date(msg.created_at), 'HH:mm')}
                        </span>
                        <MessageStatus 
                          status={messageStatus}
                          isOutgoing={isOutgoing}
                          onRetry={messageStatus === 'failed' && onRetryMessage ? () => onRetryMessage(msg.id) : undefined}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Typing Indicator */}
            {isTyping && (
              <TypingIndicator name={conversation.contact_name || 'Cliente'} />
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t">
        {/* Attachment Preview */}
        {attachment && (
          <div className="mb-2">
            <AttachmentPreview
              url={attachment.url}
              type={attachment.type}
              fileName={attachment.fileName}
              onRemove={() => setAttachment(null)}
            />
          </div>
        )}

        {/* Private note indicator */}
        {isPrivate && (
          <div className="flex items-center gap-2 text-xs text-yellow-600 mb-2 px-2">
            <Lock className="h-3 w-3" />
            Nota privada (não será enviada ao cliente)
          </div>
        )}

        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            {/* Quick Reply Autocomplete */}
            <QuickReplyAutocomplete
              responses={autocompleteSuggestions}
              isVisible={showAutocomplete}
              selectedIndex={autocompleteIndex}
              onSelect={handleSelectAutocomplete}
            />

            <Textarea
              ref={textareaRef}
              placeholder={isPrivate ? "Escreva uma nota privada..." : "Digite sua mensagem... (use / para respostas rápidas)"}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className={cn(
                "min-h-[44px] max-h-32 resize-none pr-20",
                isPrivate && "border-yellow-500"
              )}
              rows={1}
            />
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setIsPrivate(!isPrivate)}
                  >
                    <Lock className={cn(
                      "h-4 w-4",
                      isPrivate ? "text-yellow-500" : "text-muted-foreground"
                    )} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isPrivate ? 'Nota privada' : 'Tornar nota privada'}
                </TooltipContent>
              </Tooltip>
              
              <FileUploadButton
                onFileUploaded={handleFileUploaded}
                disabled={isSending}
              />
            </div>
          </div>
          
          <Button 
            onClick={handleSend}
            disabled={(!message.trim() && !attachment) || isSending}
            className="h-11"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick Reply Hint */}
        {responses.length > 0 && !message && (
          <p className="text-xs text-muted-foreground mt-1.5 px-1">
            💡 Digite <span className="font-mono text-primary">/</span> para ver respostas rápidas
          </p>
        )}
      </div>
      </div>

      {/* Client Info Panel */}
      {showClientPanel && (
        <div className="w-72 border-l flex-shrink-0 overflow-hidden">
          <div className="h-full p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Painel do Cliente</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowClientPanel(false)}
              >
                <PanelRightClose className="h-3 w-3" />
              </Button>
            </div>
            <ClientInfoPanel
              client={client}
              isLoading={isLoadingClient}
              phone={conversation.phone}
              contactName={conversation.contact_name || undefined}
              onRegisterClient={onRegisterClient}
            />
          </div>
        </div>
      )}

      {/* Toggle Panel Button (when hidden) */}
      {!showClientPanel && (
        <div className="border-l flex items-start pt-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 mx-1"
                onClick={() => setShowClientPanel(true)}
              >
                <PanelRightOpen className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Mostrar dados do cliente</TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  );
}
