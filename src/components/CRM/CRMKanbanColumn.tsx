import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { CRMKanbanCard } from './CRMKanbanCard';
import { KanbanLead } from '@/hooks/useCRMKanban';
import { DollarSign } from 'lucide-react';

interface CRMKanbanColumnProps {
  id: string;
  title: string;
  color: string;
  leads: KanbanLead[];
  onEditLead: (lead: KanbanLead) => void;
  onDeleteLead: (leadId: string) => void;
  onOpenConversation?: (conversationId: string) => void;
}

export function CRMKanbanColumn({
  id,
  title,
  color,
  leads,
  onEditLead,
  onDeleteLead,
  onOpenConversation,
}: CRMKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      type: 'column',
      status: id,
    },
  });

  const totalValue = leads.reduce((sum, lead) => sum + lead.dealValue, 0);

  const formatCurrency = (value: number) => {
    if (value === 0) return null;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div 
      className={`
        flex flex-col h-full min-w-[280px] max-w-[320px] rounded-lg 
        bg-card/50 border border-border/50
        ${isOver ? 'ring-2 ring-primary bg-primary/5' : ''}
        transition-all duration-200
      `}
    >
      {/* Column Header */}
      <div 
        className="p-3 border-b border-border/50 flex-shrink-0"
        style={{ borderLeftColor: color, borderLeftWidth: 3 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: color }}
            />
            <h3 className="font-medium text-sm">{title}</h3>
            <Badge variant="secondary" className="text-xs">
              {leads.length}
            </Badge>
          </div>
        </div>
        
        {totalValue > 0 && (
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <DollarSign className="h-3 w-3" />
            <span>{formatCurrency(totalValue)}</span>
          </div>
        )}
      </div>

      {/* Cards Container */}
      <ScrollArea className="flex-1">
        <div
          ref={setNodeRef}
          className="p-2 space-y-2 min-h-[200px]"
        >
          <SortableContext
            items={leads.map(l => l.id)}
            strategy={verticalListSortingStrategy}
          >
            {leads.map((lead) => (
              <CRMKanbanCard
                key={lead.id}
                lead={lead}
                onEdit={onEditLead}
                onDelete={onDeleteLead}
                onOpenConversation={onOpenConversation}
              />
            ))}
          </SortableContext>

          {leads.length === 0 && (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground/50 border-2 border-dashed border-border/50 rounded-lg">
              Arraste cards aqui
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
