import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, RefreshCw, Circle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useInboxConversations, Conversation } from "@/hooks/useInboxConversations";
import { useInboxMessages, ChatMessage } from "@/hooks/useInboxMessages";
import { useAgentStatus } from "@/hooks/useAgentStatus";
import { useWhatsAppInstances } from "@/hooks/useWhatsAppInstances";
import { useAutomationTriggers } from "@/hooks/useAutomationTriggers";
import { InboxSidebar } from "@/components/Inbox/InboxSidebar";
import { ConversationList } from "@/components/Inbox/ConversationList";
import { ChatPanel } from "@/components/Inbox/ChatPanel";
import { InboxDashboard } from "@/components/Inbox/InboxDashboard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export default function Atendimento() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'conversations' | 'dashboard'>('conversations');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [lastProcessedMessageId, setLastProcessedMessageId] = useState<string | null>(null);

  const { instances } = useWhatsAppInstances();
  const { agents, myStatus, updateStatus } = useAgentStatus();
  
  const {
    conversations,
    labels,
    isLoading,
    filter,
    setFilter,
    metrics,
    refetch,
    assignLabel,
    removeLabel,
    assignToMe,
    resolveConversation,
    reopenConversation,
    toggleAI,
    markAsRead,
    snoozeConversation,
    setPriority
  } = useInboxConversations();

  const {
    messages,
    isLoading: messagesLoading,
    isSending,
    sendMessage
  } = useInboxMessages(selectedConversation?.id || null);

  // Automation triggers callbacks
  const automationCallbacks = {
    onSendMessage: useCallback(async (conversationId: string, content: string, isPrivate?: boolean) => {
      // Implementation for sending message to specific conversation
      const { error } = await supabase
        .from('chat_inbox_messages')
        .insert({
          conversation_id: conversationId,
          content,
          sender_type: isPrivate ? 'agent' : 'agent',
          is_private: isPrivate || false,
        });
      return !error;
    }, []),
    onAssignLabel: useCallback(async (conversationId: string, labelId: string) => {
      await supabase
        .from('conversation_labels')
        .insert({ conversation_id: conversationId, label_id: labelId });
    }, []),
    onResolve: useCallback(async (conversationId: string) => {
      await supabase
        .from('conversations')
        .update({ status: 'resolved', resolved_at: new Date().toISOString() })
        .eq('id', conversationId);
    }, []),
    onToggleAI: useCallback(async (conversationId: string, enabled: boolean) => {
      await supabase
        .from('conversations')
        .update({ ai_enabled: enabled })
        .eq('id', conversationId);
    }, []),
    onSnooze: useCallback(async (conversationId: string, until: Date) => {
      await supabase
        .from('conversations')
        .update({ status: 'snoozed', snoozed_until: until.toISOString() })
        .eq('id', conversationId);
    }, []),
    onSetPriority: useCallback(async (conversationId: string, priority: string) => {
      await supabase
        .from('conversations')
        .update({ priority })
        .eq('id', conversationId);
    }, []),
  };

  const { triggerMessageCreated, triggerConversationCreated } = useAutomationTriggers(automationCallbacks);

  // Real-time message listener for automation triggers
  useEffect(() => {
    const channel = supabase
      .channel('automation-triggers')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_inbox_messages' },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          
          // Only trigger for incoming messages from contacts
          if (newMessage.sender_type === 'contact' && newMessage.id !== lastProcessedMessageId) {
            setLastProcessedMessageId(newMessage.id);
            
            // Find the conversation for this message
            const conversation = conversations.find(c => c.id === newMessage.conversation_id);
            if (conversation) {
              console.log('[Automation] New message received, checking triggers...');
              triggerMessageCreated(conversation, newMessage);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversations' },
        (payload) => {
          const newConversation = payload.new as Conversation;
          console.log('[Automation] New conversation created, checking triggers...');
          triggerConversationCreated(newConversation);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversations, triggerMessageCreated, triggerConversationCreated, lastProcessedMessageId]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilter(prev => ({ ...prev, search: searchQuery || undefined }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, setFilter]);

  // Update selected conversation when list changes
  useEffect(() => {
    if (selectedConversation) {
      const updated = conversations.find(c => c.id === selectedConversation.id);
      if (updated) {
        setSelectedConversation(updated);
      }
    }
  }, [conversations, selectedConversation?.id]);

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
  };

  const handleSendMessage = async (content: string, isPrivate?: boolean) => {
    return sendMessage(content, isPrivate);
  };

  const handleAssignToMe = () => {
    if (selectedConversation) {
      assignToMe(selectedConversation.id);
    }
  };

  const handleResolve = () => {
    if (selectedConversation) {
      resolveConversation(selectedConversation.id);
    }
  };

  const handleReopen = () => {
    if (selectedConversation) {
      reopenConversation(selectedConversation.id);
    }
  };

  const handleToggleAI = (enabled: boolean) => {
    if (selectedConversation) {
      toggleAI(selectedConversation.id, enabled);
    }
  };

  const handleAssignLabel = (labelId: string) => {
    if (selectedConversation) {
      assignLabel(selectedConversation.id, labelId);
    }
  };

  const handleRemoveLabel = (labelId: string) => {
    if (selectedConversation) {
      removeLabel(selectedConversation.id, labelId);
    }
  };

  const handleMarkAsRead = () => {
    if (selectedConversation) {
      markAsRead(selectedConversation.id);
    }
  };

  const statusColors = {
    online: 'bg-green-500',
    busy: 'bg-yellow-500',
    offline: 'bg-gray-400'
  };

  const statusLabels = {
    online: 'Online',
    busy: 'Ocupado',
    offline: 'Offline'
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Header */}
      <header className="h-14 border-b flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Central de Atendimento</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Circle className={cn(
                  "h-2 w-2 fill-current",
                  statusColors[myStatus?.status || 'offline']
                )} />
                {statusLabels[myStatus?.status || 'offline']}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => updateStatus('online')}>
                <Circle className="h-2 w-2 mr-2 fill-green-500 text-green-500" />
                Online
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateStatus('busy')}>
                <Circle className="h-2 w-2 mr-2 fill-yellow-500 text-yellow-500" />
                Ocupado
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateStatus('offline')}>
                <Circle className="h-2 w-2 mr-2 fill-gray-400 text-gray-400" />
                Offline
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <InboxSidebar
          instances={instances}
          labels={labels}
          filter={filter}
          onFilterChange={setFilter}
          metrics={metrics}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Content Area */}
        {activeTab === 'dashboard' ? (
          <InboxDashboard
            conversations={conversations}
            agents={agents}
            metrics={metrics}
          />
        ) : (
          <>
            {/* Conversation List */}
            <ConversationList
              conversations={conversations}
              selectedId={selectedConversation?.id || null}
              onSelect={handleSelectConversation}
              isLoading={isLoading}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />

            {/* Chat Panel */}
            <ChatPanel
              conversation={selectedConversation}
              messages={messages}
              labels={labels}
              isLoading={messagesLoading}
              isSending={isSending}
              onSendMessage={handleSendMessage}
              onAssignToMe={handleAssignToMe}
              onResolve={handleResolve}
              onReopen={handleReopen}
              onToggleAI={handleToggleAI}
              onAssignLabel={handleAssignLabel}
              onRemoveLabel={handleRemoveLabel}
              onMarkAsRead={handleMarkAsRead}
            />
          </>
        )}
      </div>
    </div>
  );
}
