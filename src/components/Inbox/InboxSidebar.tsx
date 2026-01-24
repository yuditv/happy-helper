import { useState } from "react";
import { 
  MessageSquare, 
  Inbox, 
  Users, 
  Tag, 
  BarChart3,
  ChevronRight,
  Circle,
  Bot
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ConversationFilter, InboxLabel } from "@/hooks/useInboxConversations";

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
    labels: true
  });

  const toggleSection = (section: 'inbox' | 'labels') => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

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
      icon: Users, 
      count: metrics.mine,
      filter: { status: 'all' as const, assignedTo: 'me' as const, instanceId: undefined, labelId: undefined }
    },
    { 
      id: 'unassigned', 
      label: 'Não atribuídas', 
      icon: Inbox, 
      count: metrics.unassigned,
      filter: { status: 'open' as const, assignedTo: 'unassigned' as const, instanceId: undefined, labelId: undefined }
    },
    { 
      id: 'open', 
      label: 'Abertas', 
      icon: Circle, 
      count: metrics.open,
      filter: { status: 'open' as const, assignedTo: 'all' as const, instanceId: undefined, labelId: undefined }
    },
    { 
      id: 'resolved', 
      label: 'Resolvidas', 
      icon: Circle, 
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
    <div className="w-64 border-r bg-card/50 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          Central de Atendimento
        </h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* Main Navigation */}
          <div className="space-y-1">
            <Button
              variant={activeTab === 'conversations' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => onTabChange('conversations')}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Conversas
              {metrics.unread > 0 && (
                <Badge variant="destructive" className="ml-auto">
                  {metrics.unread}
                </Badge>
              )}
            </Button>
            <Button
              variant={activeTab === 'dashboard' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => onTabChange('dashboard')}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
          </div>

          <Separator className="my-3" />

          {/* Filter Menu */}
          <div className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onFilterChange(item.filter)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                  isActiveFilter(item.filter)
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className={cn(
                  "h-4 w-4",
                  item.id === 'open' && "fill-green-500 text-green-500",
                  item.id === 'resolved' && "fill-muted text-muted-foreground"
                )} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.count > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {item.count}
                  </Badge>
                )}
              </button>
            ))}
          </div>

          <Separator className="my-3" />

          {/* Instances Section */}
          <div>
            <button
              onClick={() => toggleSection('inbox')}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className={cn(
                "h-4 w-4 transition-transform",
                expandedSections.inbox && "rotate-90"
              )} />
              <Inbox className="h-4 w-4" />
              Caixas de Entrada
            </button>
            
            {expandedSections.inbox && (
              <div className="ml-6 space-y-1">
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
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Circle className={cn(
                        "h-2 w-2",
                        instance.status === 'connected' ? "fill-green-500 text-green-500" : "fill-red-500 text-red-500"
                      )} />
                      <span className="truncate">{instance.instance_name}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <Separator className="my-3" />

          {/* Labels Section */}
          <div>
            <button
              onClick={() => toggleSection('labels')}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className={cn(
                "h-4 w-4 transition-transform",
                expandedSections.labels && "rotate-90"
              )} />
              <Tag className="h-4 w-4" />
              Etiquetas
            </button>
            
            {expandedSections.labels && (
              <div className="ml-6 space-y-1">
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
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <div 
                        className="h-3 w-3 rounded-full" 
                        style={{ backgroundColor: label.color }}
                      />
                      <span className="truncate">{label.name}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
