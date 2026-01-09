import { useState, useMemo } from 'react';
import { useClients } from '@/hooks/useClients';
import { Client, PlanType } from '@/types/client';
import { ClientCard } from '@/components/ClientCard';
import { ClientForm } from '@/components/ClientForm';
import { ClientStats } from '@/components/ClientStats';
import { SearchBar } from '@/components/SearchBar';
import { PlanFilter } from '@/components/PlanFilter';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { ExpiringClientsAlert } from '@/components/ExpiringClientsAlert';
import { Button } from '@/components/ui/button';
import { Plus, Users } from 'lucide-react';
import { toast } from 'sonner';

const Index = () => {
  const { clients, addClient, updateClient, deleteClient, expiringClients, expiredClients } = useClients();
  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<PlanType | 'all'>('all');

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const matchesSearch =
        client.name.toLowerCase().includes(search.toLowerCase()) ||
        client.email.toLowerCase().includes(search.toLowerCase()) ||
        client.whatsapp.includes(search);
      const matchesPlan = planFilter === 'all' || client.plan === planFilter;
      return matchesSearch && matchesPlan;
    });
  }, [clients, search, planFilter]);

  const handleAddClient = (data: Omit<Client, 'id' | 'createdAt'>) => {
    addClient(data);
    toast.success('Cliente cadastrado com sucesso!');
  };

  const handleEditClient = (data: Omit<Client, 'id' | 'createdAt'>) => {
    if (editingClient) {
      updateClient(editingClient.id, data);
      setEditingClient(null);
      toast.success('Cliente atualizado com sucesso!');
    }
  };

  const handleOpenEdit = (client: Client) => {
    setEditingClient(client);
    setFormOpen(true);
  };

  const handleOpenDelete = (id: string) => {
    const client = clients.find((c) => c.id === id);
    if (client) {
      setClientToDelete(client);
      setDeleteDialogOpen(true);
    }
  };

  const handleConfirmDelete = () => {
    if (clientToDelete) {
      deleteClient(clientToDelete.id);
      setClientToDelete(null);
      setDeleteDialogOpen(false);
      toast.success('Cliente excluído com sucesso!');
    }
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setEditingClient(null);
    }
  };

  const handleAlertClientClick = (client: Client) => {
    handleOpenEdit(client);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
                <Users className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Gerenciador de Clientes</h1>
                <p className="text-sm text-muted-foreground">Organize seus clientes por plano</p>
              </div>
            </div>
            <Button onClick={() => setFormOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Novo Cliente</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Expiring Alert */}
        <ExpiringClientsAlert 
          expiringClients={expiringClients}
          expiredClients={expiredClients}
          onClientClick={handleAlertClientClick}
        />

        {/* Stats */}
        <ClientStats clients={clients} />

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <SearchBar value={search} onChange={setSearch} />
          <PlanFilter selected={planFilter} onSelect={setPlanFilter} />
        </div>

        {/* Client Grid */}
        {filteredClients.length === 0 ? (
          <div className="text-center py-16">
            <div className="h-16 w-16 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              {clients.length === 0 ? 'Nenhum cliente cadastrado' : 'Nenhum cliente encontrado'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {clients.length === 0
                ? 'Comece adicionando seu primeiro cliente.'
                : 'Tente ajustar os filtros de busca.'}
            </p>
            {clients.length === 0 && (
              <Button onClick={() => setFormOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Cliente
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredClients.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                onEdit={handleOpenEdit}
                onDelete={handleOpenDelete}
              />
            ))}
          </div>
        )}
      </main>

      {/* Forms & Dialogs */}
      <ClientForm
        open={formOpen}
        onOpenChange={handleFormClose}
        onSubmit={editingClient ? handleEditClient : handleAddClient}
        initialData={editingClient}
      />
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        clientName={clientToDelete?.name || ''}
      />
    </div>
  );
};

export default Index;
