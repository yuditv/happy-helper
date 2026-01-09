import { useState, useMemo } from 'react';
import { useClients } from '@/hooks/useClients';
import { useAuth } from '@/hooks/useAuth';
import { Client, PlanType, planLabels } from '@/types/client';
import { ClientCard } from '@/components/ClientCard';
import { ClientForm } from '@/components/ClientForm';
import { ClientStats } from '@/components/ClientStats';
import { ClientCharts } from '@/components/ClientCharts';
import { SearchBar } from '@/components/SearchBar';
import { PlanFilter } from '@/components/PlanFilter';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { ExpiringClientsAlert } from '@/components/ExpiringClientsAlert';
import { RenewalHistoryDialog } from '@/components/RenewalHistoryDialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Users, Download, FileSpreadsheet, History, LogOut, User } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { exportClientsToCSV, exportRenewalHistoryToCSV } from '@/lib/exportClients';

const Index = () => {
  const { user, signOut } = useAuth();
  const { clients, isLoading, addClient, updateClient, deleteClient, renewClient, expiringClients, expiredClients } = useClients();
  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyClient, setHistoryClient] = useState<Client | null>(null);
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

  const totalRenewals = useMemo(() => {
    return clients.reduce((acc, c) => acc + (c.renewalHistory?.length || 0), 0);
  }, [clients]);

  const handleAddClient = async (data: Omit<Client, 'id' | 'createdAt' | 'renewalHistory'>) => {
    const result = await addClient(data);
    if (result) {
      toast.success('Cliente cadastrado com sucesso!');
    } else {
      toast.error('Erro ao cadastrar cliente');
    }
  };

  const handleEditClient = async (data: Omit<Client, 'id' | 'createdAt' | 'renewalHistory'>) => {
    if (editingClient) {
      await updateClient(editingClient.id, data);
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

  const handleConfirmDelete = async () => {
    if (clientToDelete) {
      await deleteClient(clientToDelete.id);
      setClientToDelete(null);
      setDeleteDialogOpen(false);
      toast.success('Cliente excluído com sucesso!');
    }
  };

  const handleRenewClient = async (id: string) => {
    const client = clients.find(c => c.id === id);
    if (!client) return;

    const newExpiresAt = await renewClient(id);
    if (newExpiresAt) {
      toast.success(
        `Plano ${planLabels[client.plan]} renovado! Novo vencimento: ${format(newExpiresAt, "dd 'de' MMM, yyyy", { locale: ptBR })}`,
        { duration: 4000 }
      );
    } else {
      toast.error('Erro ao renovar plano');
    }
  };

  const handleViewHistory = (client: Client) => {
    setHistoryClient(client);
    setHistoryDialogOpen(true);
  };

  const handleExportClients = () => {
    if (clients.length === 0) {
      toast.error('Não há clientes para exportar');
      return;
    }
    exportClientsToCSV(filteredClients);
    toast.success(`${filteredClients.length} cliente(s) exportado(s) para CSV`);
  };

  const handleExportRenewals = () => {
    if (totalRenewals === 0) {
      toast.error('Não há renovações para exportar');
      return;
    }
    exportRenewalHistoryToCSV(clients);
    toast.success(`Histórico de renovações exportado para CSV`);
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

  const handleSignOut = async () => {
    await signOut();
    toast.success('Logout realizado com sucesso!');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

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
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="hidden sm:flex">
                    <Download className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportClients}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Exportar Clientes (CSV)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportRenewals}>
                    <History className="h-4 w-4 mr-2" />
                    Exportar Renovações (CSV)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button onClick={() => setFormOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Novo Cliente</span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    {user?.email}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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

        {/* Charts */}
        <ClientCharts clients={clients} />

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
                onRenew={handleRenewClient}
                onViewHistory={handleViewHistory}
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
      <RenewalHistoryDialog
        client={historyClient}
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
      />
    </div>
  );
};

export default Index;
