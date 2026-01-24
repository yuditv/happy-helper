import { useState, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragOverlay,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { CRMKanbanColumn } from './CRMKanbanColumn';
import { CRMKanbanCard } from './CRMKanbanCard';
import { CRMLeadDialog } from './CRMLeadDialog';
import { useCRMKanban, KanbanLead } from '@/hooks/useCRMKanban';
import { Plus, RefreshCw, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface CRMKanbanProps {
  instanceId?: string;
  onOpenConversation?: (conversationId: string) => void;
}

export function CRMKanban({ instanceId, onOpenConversation }: CRMKanbanProps) {
  const { 
    columns, 
    isLoading, 
    isSaving, 
    moveCard, 
    updateLead, 
    createLead, 
    deleteLead,
    refetch 
  } = useCRMKanban(instanceId);
  
  const { toast } = useToast();
  const [activeCard, setActiveCard] = useState<KanbanLead | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingLead, setEditingLead] = useState<KanbanLead | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const lead = active.data.current?.lead as KanbanLead;
    if (lead) {
      setActiveCard(lead);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Get the target column (status)
    let targetStatus: string | null = null;

    if (over.data.current?.type === 'column') {
      targetStatus = over.data.current.status;
    } else if (over.data.current?.type === 'card') {
      // If dropped on another card, find which column it belongs to
      const overLead = over.data.current.lead as KanbanLead;
      targetStatus = overLead.status;
    }

    if (!targetStatus) return;

    // Find the active lead
    const activeLead = columns
      .flatMap(col => col.leads)
      .find(lead => lead.id === activeId);

    if (!activeLead) return;

    // Only update if status changed
    if (activeLead.status !== targetStatus) {
      const success = await moveCard(activeId, targetStatus);
      
      if (success) {
        toast({
          title: 'Lead movido',
          description: `Lead movido para ${columns.find(c => c.value === targetStatus)?.label}`,
        });
      } else {
        toast({
          title: 'Erro',
          description: 'Não foi possível mover o lead',
          variant: 'destructive',
        });
      }
    }
  };

  const handleEditLead = (lead: KanbanLead) => {
    setEditingLead(lead);
    setDialogMode('edit');
    setDialogOpen(true);
  };

  const handleCreateLead = () => {
    setEditingLead(null);
    setDialogMode('create');
    setDialogOpen(true);
  };

  const handleDeleteLead = (leadId: string) => {
    setLeadToDelete(leadId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!leadToDelete) return;
    
    const success = await deleteLead(leadToDelete);
    
    if (success) {
      toast({
        title: 'Lead excluído',
        description: 'O lead foi removido do pipeline.',
      });
    } else {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o lead',
        variant: 'destructive',
      });
    }
    
    setDeleteDialogOpen(false);
    setLeadToDelete(null);
  };

  const handleSaveLead = async (data: Partial<KanbanLead> & { phone?: string }) => {
    if (dialogMode === 'create') {
      const leadId = await createLead({
        phone: data.phone!,
        name: data.name || undefined,
        email: data.email || undefined,
        status: data.status,
        dealValue: data.dealValue,
        instanceId,
      });
      
      if (leadId) {
        toast({
          title: 'Lead criado',
          description: 'Novo lead adicionado ao pipeline.',
        });
        return true;
      }
      
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o lead',
        variant: 'destructive',
      });
      return false;
    } else if (editingLead) {
      const success = await updateLead(editingLead.id, data);
      
      if (success) {
        toast({
          title: 'Lead atualizado',
          description: 'As informações foram salvas.',
        });
        return true;
      }
      
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o lead',
        variant: 'destructive',
      });
      return false;
    }
    
    return false;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Button onClick={handleCreateLead} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Novo Lead
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refetch}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
        
        {isSaving && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Salvando...
          </div>
        )}
      </div>

      {/* Kanban Board */}
      <ScrollArea className="flex-1 w-full">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 pb-4 min-h-[500px]">
            {columns.map((column) => (
              <CRMKanbanColumn
                key={column.value}
                id={column.value}
                title={column.label}
                color={column.color}
                leads={column.leads}
                onEditLead={handleEditLead}
                onDeleteLead={handleDeleteLead}
                onOpenConversation={onOpenConversation}
              />
            ))}
          </div>

          <DragOverlay>
            {activeCard && (
              <div className="opacity-80 rotate-3">
                <CRMKanbanCard
                  lead={activeCard}
                  onEdit={() => {}}
                  onDelete={() => {}}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Lead Dialog */}
      <CRMLeadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        lead={editingLead}
        onSave={handleSaveLead}
        mode={dialogMode}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este lead? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
