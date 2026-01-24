import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  MoreHorizontal, Phone, Mail, MessageSquare, DollarSign, 
  GripVertical, Calendar, ExternalLink 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { KanbanLead } from '@/hooks/useCRMKanban';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CRMKanbanCardProps {
  lead: KanbanLead;
  onEdit: (lead: KanbanLead) => void;
  onDelete: (leadId: string) => void;
  onOpenConversation?: (conversationId: string) => void;
}

export function CRMKanbanCard({ 
  lead, 
  onEdit, 
  onDelete,
  onOpenConversation 
}: CRMKanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: lead.id,
    data: {
      type: 'card',
      lead,
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const formatCurrency = (value: number) => {
    if (value === 0) return null;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPhone = (phone: string) => {
    // Format as Brazilian phone: (XX) XXXXX-XXXX
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 13) {
      return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    }
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`
        cursor-grab active:cursor-grabbing transition-all duration-200
        border-border/50 hover:border-primary/50 hover:shadow-lg
        ${isDragging ? 'opacity-50 shadow-xl ring-2 ring-primary' : ''}
      `}
    >
      <CardContent className="p-3 space-y-2">
        {/* Header with drag handle and menu */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div {...attributes} {...listeners} className="cursor-grab">
              <GripVertical className="h-4 w-4 text-muted-foreground/50" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                {lead.name || 'Sem nome'}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {formatPhone(lead.phone)}
              </p>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(lead)}>
                Editar Lead
              </DropdownMenuItem>
              {lead.conversationId && onOpenConversation && (
                <DropdownMenuItem onClick={() => onOpenConversation(lead.conversationId!)}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Abrir Conversa
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(lead.id)}
                className="text-destructive"
              >
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Deal Value */}
        {lead.dealValue > 0 && (
          <div className="flex items-center gap-1 text-sm">
            <DollarSign className="h-4 w-4 text-green-500" />
            <span className="font-semibold text-green-500">
              {formatCurrency(lead.dealValue)}
            </span>
          </div>
        )}

        {/* Email if available */}
        {lead.email && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
            <Mail className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{lead.email}</span>
          </div>
        )}

        {/* Footer with date and ticket status */}
        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>
              {formatDistanceToNow(new Date(lead.createdAt), { 
                addSuffix: true, 
                locale: ptBR 
              })}
            </span>
          </div>
          
          {lead.isTicketOpen && (
            <Badge variant="outline" className="text-xs h-5 px-1.5">
              Ticket Aberto
            </Badge>
          )}
        </div>

        {/* Notes preview */}
        {lead.notes && (
          <p className="text-xs text-muted-foreground line-clamp-2 italic">
            "{lead.notes}"
          </p>
        )}
      </CardContent>
    </Card>
  );
}
