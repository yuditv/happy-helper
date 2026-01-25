import { useState } from "react";
import { 
  MessageSquare, 
  Inbox, 
  Users, 
  Tag, 
  BarChart3,
  ChevronDown,
  Circle,
  Bot,
  UserCheck,
  UserX,
  CheckCircle2,
  Mail
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ConversationFilter, InboxLabel } from "@/hooks/useInboxConversations";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface WhatsAppInstance {
  id: string;
  instance_name: string;
  status: string;
}

interface InboxSidebarProps {
  instances: WhatsAppInstance[];
  labels: InboxLabel[];
  filter: ConversationFilter;
  onFilterChange: (filter: ConversationFilter) => void;
  metrics: {
    total: number;
    open: number;
    pending: number;
    resolved: number;
    unassigned: number;
    unread: number;
    mine: number;
  };
  activeTab: 'conversations' | 'dashboard';
  onTabChange: (tab: 'conversations' | 'dashboard') => void;
}

export function InboxSidebar({
  instances,
  labels,
  filter,
  onFilterChange,
  metrics,
  activeTab,
  onTabChange
}: InboxSidebarProps) {
  const [expandedSections, setExpandedSections] = useState({
    inbox: true,
    instances: true,
    labels: true
  });

  const menuItems = [
    { 
      id: 'all', 
      label: 'Todas conversas', 
      icon: MessageSquare, 
      count: metrics.total,
      filter: { status: 'all' as const, assignedTo: 'all' as const, instanceId: undefined, labelId: undefined }
    },
    { 
      id: 'mine', 
      label: 'Minhas', 
      icon: UserCheck, 
      count: metrics.mine,
      filter: { status: 'all' as const, assignedTo: 'me' as const, instanceId: undefined, labelId: undefined }
    },
    { 
      id: 'unassigned', 
      label: 'Não atribuídas', 
      icon: UserX, 
      count: metrics.unassigned,
      filter: { status: 'open' as const, assignedTo: 'unassigned' as const, instanceId: undefined, labelId: undefined }
    },
    { 
      id: 'open', 
      label: 'Abertas', 
      icon: Circle, 
      count: metrics.open,
      iconClass: "fill-green-500 text-green-500",
      filter: { status: 'open' as const, assignedTo: 'all' as const, instanceId: undefined, labelId: undefined }
    },
    { 
      id: 'resolved', 
      label: 'Resolvidas', 
      icon: CheckCircle2, 
      count: metrics.resolved,
      filter: { status: 'resolved' as const, assignedTo: 'all' as const, instanceId: undefined, labelId: undefined }
    },
  ];

  const isActiveFilter = (itemFilter: ConversationFilter) => {
    return (
      filter.status === itemFilter.status &&
      filter.assignedTo === itemFilter.assignedTo &&
      !filter.instanceId &&
      !filter.labelId
    );
  };

  return (
    <div className="w-64 border-r border-border/50 bg-card/50 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          Central de Atendimento
        </h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          {/* Main Navigation */}
          <Button
            variant={activeTab === 'conversations' ? 'secondary' : 'ghost'}
            className="w-full justify-start h-9"
            onClick={() => onTabChange('conversations')}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Conversas
            {metrics.unread > 0 && (
              <Badge variant="destructive" className="ml-auto text-xs px-1.5 h-5">
                {metrics.unread}
              </Badge>
            )}
          </Button>
          <Button
            variant={activeTab === 'dashboard' ? 'secondary' : 'ghost'}
            className="w-full justify-start h-9"
            onClick={() => onTabChange('dashboard')}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Dashboard
          </Button>

          {/* Inbox Section */}
          <Collapsible
            open={expandedSections.inbox}
            onOpenChange={(open) => setExpandedSections(prev => ({ ...prev, inbox: open }))}
            className="mt-4"
          >
            <CollapsibleTrigger className="flex items-center gap-2 w-full px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
              <ChevronDown className={cn(
                "h-3.5 w-3.5 transition-transform",
                !expandedSections.inbox && "-rotate-90"
              )} />
              <Inbox className="h-3.5 w-3.5" />
              Caixa de Entrada
            </CollapsibleTrigger>
            
            <CollapsibleContent className="mt-1 space-y-0.5">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onFilterChange(item.filter)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                    isActiveFilter(item.filter)
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-accent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <item.icon className={cn("h-4 w-4", item.iconClass)} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.count > 0 && (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {item.count}
                    </span>
                  )}
                </button>
              ))}
            </CollapsibleContent>
          </Collapsible>

          {/* Instances Section */}
          <Collapsible
            open={expandedSections.instances}
            onOpenChange={(open) => setExpandedSections(prev => ({ ...prev, instances: open }))}
            className="mt-4"
          >
            <CollapsibleTrigger className="flex items-center gap-2 w-full px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
              <ChevronDown className={cn(
                "h-3.5 w-3.5 transition-transform",
                !expandedSections.instances && "-rotate-90"
              )} />
              <Mail className="h-3.5 w-3.5" />
              Instâncias
            </CollapsibleTrigger>
            
            <CollapsibleContent className="mt-1 space-y-0.5">
              {instances.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted-foreground">
                  Nenhuma instância
                </p>
              ) : (
                instances.map((instance) => (
                  <button
                    key={instance.id}
                    onClick={() => onFilterChange({ 
                      ...filter, 
                      instanceId: filter.instanceId === instance.id ? undefined : instance.id 
                    })}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                      filter.instanceId === instance.id
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-accent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Circle className={cn(
                      "h-2.5 w-2.5 shrink-0",
                      instance.status === 'connected' ? "fill-green-500 text-green-500" : "fill-red-500 text-red-500"
                    )} />
                    <span className="truncate text-left">{instance.instance_name}</span>
                  </button>
                ))
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Labels Section */}
          <Collapsible
            open={expandedSections.labels}
            onOpenChange={(open) => setExpandedSections(prev => ({ ...prev, labels: open }))}
            className="mt-4"
          >
            <CollapsibleTrigger className="flex items-center gap-2 w-full px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
              <ChevronDown className={cn(
                "h-3.5 w-3.5 transition-transform",
                !expandedSections.labels && "-rotate-90"
              )} />
              <Tag className="h-3.5 w-3.5" />
              Etiquetas
            </CollapsibleTrigger>
            
            <CollapsibleContent className="mt-1 space-y-0.5">
              {labels.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted-foreground">
                  Nenhuma etiqueta
                </p>
              ) : (
                labels.map((label) => (
                  <button
                    key={label.id}
                    onClick={() => onFilterChange({ 
                      ...filter, 
                      labelId: filter.labelId === label.id ? undefined : label.id 
                    })}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                      filter.labelId === label.id
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-accent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div 
                      className="h-2.5 w-2.5 rounded-sm shrink-0" 
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="truncate text-left">{label.name}</span>
                  </button>
                ))
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
    </div>
  );
}