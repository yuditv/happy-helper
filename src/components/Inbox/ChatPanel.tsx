import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
  PanelRightClose,
  PanelLeftOpen,
  PanelLeftClose,
  Play,
  RefreshCw,
  Camera,
  Trash2,
  MessageSquareText,
  Ban,
  UserCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Conversation, InboxLabel } from "@/hooks/useInboxConversations";
import { ChatMessage } from "@/hooks/useInboxMessages";
import { useAuth } from "@/hooks/useAuth";
import { useClientByPhone } from "@/hooks/useClientByPhone";
import { useCannedResponses, CannedResponse } from "@/hooks/useCannedResponses";
import { useContactAvatar } from "@/hooks/useContactAvatar";
import { usePresence } from "@/hooks/usePresence";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
// ClientInfoPanel removed - client registration now in dropdown menu
import { MessageStatus } from "./MessageStatus";
import { TypingIndicator } from "./TypingIndicator";
import { FileUploadButton } from "./FileUploadButton";
import { AttachmentPreview } from "./AttachmentPreview";
import { QuickReplyAutocomplete } from "./QuickReplyAutocomplete";
import { AudioRecorder } from "./AudioRecorder";
import { MediaGallery } from "./MediaGallery";
import { QuickMessagesPanel } from "./QuickMessagesPanel";
import { EmojiPickerButton } from "./EmojiPickerButton";
import { AudioPlayer } from "./AudioPlayer";
import { CRMLeadPanel } from "./CRMLeadPanel";
import { useCRMLead, CRM_STATUSES } from "@/hooks/useCRMLead";

interface ChatPanelProps {
  conversation: Conversation | null;
  messages: ChatMessage[];
  labels: InboxLabel[];
  isLoading: boolean;
  isSending: boolean;
  isSyncing?: boolean;
  onSendMessage: (content: string, isPrivate?: boolean, mediaUrl?: string, mediaType?: string, fileName?: string) => Promise<boolean>;
  onAssignToMe: () => void;
  onResolve: () => void;
  onReopen: () => void;
  onToggleAI: (enabled: boolean) => void;
  onAssignLabel: (labelId: string) => void;
  onRemoveLabel: (labelId: string) => void;
  onMarkAsRead: () => void;
  onRegisterClient?: (phone: string, name?: string) => void;
  onRetryMessage?: (messageId: string) => Promise<boolean>;
  onSyncMessages?: () => void;
  onDeleteConversation?: (conversationId: string, deleteFromWhatsApp: boolean) => Promise<boolean>;
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
  isSyncing,
  onSendMessage,
  onAssignToMe,
  onResolve,
  onReopen,
  onToggleAI,
  onAssignLabel,
  onRemoveLabel,
  onMarkAsRead,
  onRegisterClient,
  onRetryMessage,
  onSyncMessages,
  onDeleteConversation
}: ChatPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  
  const [attachment, setAttachment] = useState<AttachmentState | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [autocompleteIndex, setAutocompleteIndex] = useState(-1);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryInitialId, setGalleryInitialId] = useState<string | undefined>();
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [contactAvatarUrl, setContactAvatarUrl] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteFromWhatsApp, setDeleteFromWhatsApp] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showQuickPanel, setShowQuickPanel] = useState(false);
  const [showCRMPanel, setShowCRMPanel] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch client by phone
  const { client, isLoading: isLoadingClient } = useClientByPhone(conversation?.phone || null);

  // Canned responses for quick replies (autocomplete)
  const { responses, searchResponses, findByShortCode } = useCannedResponses();
  
  // Contact avatar fetcher
  const { fetchAvatar, isLoading: isFetchingAvatar } = useContactAvatar();
  
  // CRM Lead hook
  const { lead: crmLead } = useCRMLead(
    conversation?.phone || null, 
    conversation?.instance_id || null
  );
  
  // Presence hook for typing/recording indicators
  const { sendPresence } = usePresence(conversation?.id || null);

  // Check if contact is blocked from conversation metadata
  const isContactBlocked = (conversation?.metadata as Record<string, unknown> | null)?.is_blocked === true;

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
      // Access the actual scrollable viewport inside Radix ScrollArea
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
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

  const handleSelectAutocomplete = (response: CannedResponse) => {
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

  const handleSend = () => {
    if ((!message.trim() && !attachment) || isSending) return;
    
    // Capturar valores antes de limpar
    const messageToSend = message.trim();
    const privateToSend = isPrivate;
    const attachmentToSend = attachment;
    
    // Limpar imediatamente - UX instantânea
    setMessage("");
    setIsPrivate(false);
    setAttachment(null);
    
    // Enviar em background (não aguardar)
    onSendMessage(
      messageToSend, 
      privateToSend,
      attachmentToSend?.url,
      attachmentToSend?.type,
      attachmentToSend?.fileName
    );
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

  const handleAudioReady = (url: string, type: string, fileName: string) => {
    // Send audio immediately
    onSendMessage("", isPrivate, url, type, fileName);
    setIsRecordingAudio(false);
  };

  const openMediaGallery = (messageId: string) => {
    setGalleryInitialId(messageId);
    setShowGallery(true);
  };

  const handleDeleteConversation = async () => {
    if (!conversation || !onDeleteConversation) return;
    
    setIsDeleting(true);
    const success = await onDeleteConversation(conversation.id, deleteFromWhatsApp);
    setIsDeleting(false);
    
    if (success) {
      setShowDeleteDialog(false);
      setDeleteFromWhatsApp(false);
    }
  };

  // Handler for quick send (bypasses input, supports media)
  const handleQuickSend = async (content: string, mediaUrl?: string, mediaType?: string) => {
    if (mediaUrl && mediaType) {
      return await onSendMessage(content, false, mediaUrl, mediaType, undefined);
    }
    return await onSendMessage(content, false);
  };

  // Handler for editing from quick panel (fills input)
  const handleEditFromQuick = (content: string) => {
    setMessage(content);
    textareaRef.current?.focus();
  };

  // Handler for emoji selection - inserts at cursor position
  const handleEmojiSelect = (emoji: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newMessage = message.slice(0, start) + emoji + message.slice(end);
      setMessage(newMessage);
      
      // Reposition cursor after emoji
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
        textarea.focus();
      }, 0);
    } else {
      setMessage(message + emoji);
    }
  };

  // Handle block button click - show confirmation dialog if blocking
  const handleBlockClick = () => {
    if (isContactBlocked) {
      // Unblocking doesn't need confirmation
      handleToggleBlock();
    } else {
      // Blocking needs confirmation
      setShowBlockDialog(true);
    }
  };

  // Handle actual blocking/unblocking contact via UAZAPI
  const handleToggleBlock = async () => {
    if (!conversation) return;
    
    const shouldBlock = !isContactBlocked;
    setShowBlockDialog(false);
    setIsBlocking(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        'https://tlanmmbgyyxuqvezudir.supabase.co/functions/v1/whatsapp-instances',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({
            action: 'block_contact',
            conversationId: conversation.id,
            block: shouldBlock
          })
        }
      );
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Erro ao alterar bloqueio');
      }
      
      toast({
        title: shouldBlock ? 'Contato bloqueado' : 'Contato desbloqueado',
        description: shouldBlock 
          ? 'Este contato não poderá mais enviar mensagens para esta instância'
          : 'Este contato pode enviar mensagens novamente',
      });
      
    } catch (error) {
      console.error('Error toggling block:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível alterar o bloqueio',
        variant: 'destructive'
      });
    } finally {
      setIsBlocking(false);
    }
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
    <div className="flex-1 flex h-full inbox-container overflow-hidden">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden inbox-chat-area">
        {/* Header */}
        <div className="p-3 inbox-header flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={contactAvatarUrl || conversation.contact_avatar || undefined} />
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
                  conversation.status === 'resolved' && "border-muted-foreground text-muted-foreground"
                )}
              >
                {conversation.status === 'open' ? 'Aberta' : 
                 conversation.status === 'pending' ? 'Pendente' :
                 conversation.status === 'resolved' ? 'Resolvida' : 'Adiada'}
              </Badge>
              {/* CRM Status Badge */}
              {crmLead && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs",
                    CRM_STATUSES.find(s => s.value === crmLead.status)?.color,
                    "text-white border-none"
                  )}
                >
                  {CRM_STATUSES.find(s => s.value === crmLead.status)?.label || 'Lead'}
                </Badge>
              )}
              {isContactBlocked && (
                <Badge 
                  variant="outline" 
                  className="text-xs border-destructive text-destructive"
                >
                  <Ban className="h-3 w-3 mr-1" />
                  Bloqueado
                </Badge>
              )}
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
          {/* Toggle CRM Panel */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant={showCRMPanel ? "default" : "outline"} 
                size="sm"
                onClick={() => setShowCRMPanel(!showCRMPanel)}
              >
                <User className="h-4 w-4 mr-1" />
                CRM
              </Button>
            </TooltipTrigger>
            <TooltipContent>{showCRMPanel ? 'Ocultar CRM' : 'Dados do Lead'}</TooltipContent>
          </Tooltip>

          {/* Toggle Quick Messages Panel */}
          {showQuickPanel && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setShowQuickPanel(false)}
                >
                  <PanelRightClose className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ocultar mensagens rápidas</TooltipContent>
            </Tooltip>
          )}


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
              <DropdownMenuItem 
                onClick={async () => {
                  if (conversation) {
                    const avatarUrl = await fetchAvatar(conversation.id, conversation.phone);
                    if (avatarUrl) {
                      setContactAvatarUrl(avatarUrl);
                    }
                  }
                }}
                disabled={isFetchingAvatar}
              >
                <Camera className="h-4 w-4 mr-2" />
                {isFetchingAvatar ? 'Buscando...' : 'Atualizar foto de perfil'}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Archive className="h-4 w-4 mr-2" />
                Arquivar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {/* Register/View Client */}
              {!client && onRegisterClient && (
                <DropdownMenuItem 
                  onClick={() => onRegisterClient(conversation.phone, conversation.contact_name || undefined)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Cadastrar cliente
                </DropdownMenuItem>
              )}
              {client && (
                <DropdownMenuItem disabled className="text-muted-foreground">
                  <User className="h-4 w-4 mr-2" />
                  Cliente cadastrado
                </DropdownMenuItem>
              )}
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
              {/* Block/Unblock contact */}
              <DropdownMenuItem 
                onClick={handleBlockClick}
                disabled={isBlocking}
                className={isContactBlocked ? "text-green-600 focus:text-green-600" : "text-amber-600 focus:text-amber-600"}
              >
                {isBlocking ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    {isContactBlocked ? 'Desbloqueando...' : 'Bloqueando...'}
                  </>
                ) : isContactBlocked ? (
                  <>
                    <UserCheck className="h-4 w-4 mr-2" />
                    Desbloquear contato
                  </>
                ) : (
                  <>
                    <Ban className="h-4 w-4 mr-2" />
                    Bloquear contato
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {/* Delete conversation */}
              <DropdownMenuItem 
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Deletar conversa
              </DropdownMenuItem>
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
      <ScrollArea ref={scrollRef} className="flex-1 p-4 min-h-0 inbox-scroll">
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
                      "max-w-[70%] rounded-2xl px-4 py-2.5 transition-colors",
                      isOutgoing 
                        ? msg.sender_type === 'ai'
                          ? "bg-primary/15 text-foreground dark:bg-primary/10"
                          : "bg-inbox-message-sent text-foreground rounded-br-sm"
                        : "bg-inbox-message-received border border-border/50 rounded-bl-sm",
                      msg.is_private && "inbox-message-private border border-dashed !border-amber-500/40"
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
                            <button
                              onClick={() => openMediaGallery(msg.id)}
                              className="block cursor-pointer hover:opacity-90 transition-opacity"
                            >
                              <img 
                                src={msg.media_url} 
                                alt="Media" 
                                className={cn(
                                  "rounded object-cover",
                                  msg.media_type === 'image/webp' 
                                    ? "max-w-32 max-h-32"
                                    : "max-w-full max-h-64"
                                )}
                              />
                            </button>
                          ) : msg.media_type?.startsWith('video/') ? (
                            <div className="relative group">
                              <video 
                                src={msg.media_url} 
                                className="rounded max-w-full max-h-64 cursor-pointer"
                                onClick={() => openMediaGallery(msg.id)}
                              />
                              <button
                                onClick={() => openMediaGallery(msg.id)}
                                className="absolute inset-0 flex items-center justify-center bg-black/30 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Play className="h-12 w-12 text-white" />
                              </button>
                            </div>
                          ) : msg.media_type?.startsWith('audio/') ? (
                            <AudioPlayer 
                              src={msg.media_url} 
                              isOutgoing={isOutgoing}
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
      <div className="p-3 inbox-input-area flex-shrink-0">
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
              onChange={(e) => {
                setMessage(e.target.value);
                // Send composing presence when typing (not for private notes)
                if (e.target.value.length > 0 && !isPrivate) {
                  sendPresence('composing');
                }
              }}
              onKeyDown={handleKeyDown}
              className={cn(
                "min-h-[44px] max-h-32 resize-none pr-20 inbox-input-field",
                "bg-inbox-input dark:bg-inbox-input",
                isPrivate && "!border-amber-500/50 dark:!border-amber-500/40"
              )}
              rows={1}
            />
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              <EmojiPickerButton 
                onEmojiSelect={handleEmojiSelect}
                disabled={isSending}
              />
              
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

              <Tooltip>
                <TooltipTrigger asChild>
                  <AudioRecorder
                    onAudioReady={handleAudioReady}
                    disabled={isSending || !!attachment}
                    onRecordingStart={() => sendPresence('recording')}
                    onRecordingEnd={() => sendPresence('paused')}
                  />
                </TooltipTrigger>
                <TooltipContent>Gravar áudio</TooltipContent>
              </Tooltip>
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

      {/* Quick Messages Panel - Right side */}
      <AnimatePresence mode="wait">
        {showQuickPanel && (
          <QuickMessagesPanel
            onSendMessage={handleQuickSend}
            onEditMessage={handleEditFromQuick}
            contactName={conversation.contact_name}
            phone={conversation.phone}
            onClose={() => setShowQuickPanel(false)}
          />
        )}
      </AnimatePresence>

      {/* CRM Panel - Right side */}
      <AnimatePresence mode="wait">
        {showCRMPanel && (
          <motion.div
            initial={{ opacity: 0, x: 20, width: 0 }}
            animate={{ opacity: 1, x: 0, width: 320 }}
            exit={{ opacity: 0, x: 20, width: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="border-l shrink-0 overflow-hidden"
          >
            <div className="w-80 h-full p-3">
              <CRMLeadPanel 
                phone={conversation.phone}
                instanceId={conversation.instance_id}
                contactName={conversation.contact_name || undefined}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Quick Panel Button (when hidden) */}
      <AnimatePresence>
        {!showQuickPanel && !showCRMPanel && (
          <motion.div 
            initial={{ opacity: 0, x: 20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            transition={{ 
              type: "spring",
              stiffness: 400,
              damping: 25
            }}
            className="border-l flex items-start pt-3"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 mx-1.5 hover:bg-primary/10 hover:text-primary transition-colors"
                  onClick={() => setShowQuickPanel(true)}
                >
                  <MessageSquareText className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Mensagens rápidas</TooltipContent>
            </Tooltip>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Client Info Panel removed - client registration now in dropdown menu */}

      {/* Media Gallery Modal */}
      {showGallery && (
        <MediaGallery
          messages={messages}
          initialMediaId={galleryInitialId}
          onClose={() => {
            setShowGallery(false);
            setGalleryInitialId(undefined);
          }}
        />
      )}

      {/* Delete Conversation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar conversa?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a deletar a conversa com{' '}
              <strong>{conversation?.contact_name || formatPhone(conversation?.phone || '')}</strong>.
              <br /><br />
              Esta ação irá remover todas as mensagens e não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="flex items-center space-x-2 py-4">
            <Checkbox 
              id="delete-whatsapp" 
              checked={deleteFromWhatsApp}
              onCheckedChange={(checked) => setDeleteFromWhatsApp(checked === true)}
            />
            <label htmlFor="delete-whatsapp" className="text-sm text-muted-foreground cursor-pointer">
              Deletar também do WhatsApp
            </label>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConversation}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deletando...' : 'Deletar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block Contact Confirmation Dialog */}
      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-destructive" />
              Bloquear contato?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Você está prestes a bloquear{' '}
                <strong className="text-foreground">
                  {conversation?.contact_name || formatPhone(conversation?.phone || '')}
                </strong>.
              </p>
              <p className="text-amber-600 dark:text-amber-500 font-medium">
                ⚠️ Consequências do bloqueio:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>Este contato <strong>não poderá</strong> enviar mensagens para você</li>
                <li>Você <strong>não poderá</strong> enviar mensagens para este contato</li>
                <li>O contato não será notificado sobre o bloqueio</li>
                <li>Você pode desbloquear a qualquer momento</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleToggleBlock}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Ban className="h-4 w-4 mr-2" />
              Bloquear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
