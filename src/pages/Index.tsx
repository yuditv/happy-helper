import { useState, useMemo } from 'react';
import { useClients } from '@/hooks/useClients';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { Client, PlanType, planLabels } from '@/types/client';
import { ClientCard } from '@/components/ClientCard';
import { ClientTable } from '@/components/ClientTable';
import { ClientForm } from '@/components/ClientForm';
import { usePlanSettings } from '@/hooks/usePlanSettings';
import { ClientStats } from '@/components/ClientStats';
import { RetentionMetrics } from '@/components/RetentionMetrics';
import { ClientCharts } from '@/components/ClientCharts';
import { FinancialReport } from '@/components/FinancialReport';
import { ReferralCard } from '@/components/ReferralCard';
import { SearchBar } from '@/components/SearchBar';
import { PlanFilter } from '@/components/PlanFilter';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { ExpiringClientsAlert } from '@/components/ExpiringClientsAlert';
import { RenewalHistoryDialog } from '@/components/RenewalHistoryDialog';
import { ChangePlanDialog } from '@/components/ChangePlanDialog';
import { NotificationHistoryDialog } from '@/components/NotificationHistoryDialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Users, Download, FileSpreadsheet, History, LogOut, User, Settings, FileText, Sparkles, Zap, ArrowUpDown, ChevronLeft, ChevronRight, LayoutGrid, List, CheckSquare, Square, X, RefreshCw as RefreshCwIcon, Trash2, MessageCircle, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { exportClientsToCSV, exportRenewalHistoryToCSV } from '@/lib/exportClients';
import { exportReportToPDF } from '@/lib/exportPDF';
import { generateExpirationMessage, openWhatsApp } from '@/lib/whatsapp';
import { getDaysUntilExpiration } from '@/types/client';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const { getPlanName } = usePlanSettings();
  const { clients, isLoading, addClient, updateClient, deleteClient, renewClient, expiringClients, expiredClients } = useClients();
  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyClient, setHistoryClient] = useState<Client | null>(null);
  const [changePlanDialogOpen, setChangePlanDialogOpen] = useState(false);
  const [changePlanClient, setChangePlanClient] = useState<Client | null>(null);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [notificationClient, setNotificationClient] = useState<Client | null>(null);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<PlanType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'expiresAt' | 'plan'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const clientsPerPage = viewMode === 'grid' ? 12 : 20;

  const filteredAndSortedClients = useMemo(() => {
    const filtered = clients.filter((client) => {
      const matchesSearch =
        client.name.toLowerCase().includes(search.toLowerCase()) ||
        client.email.toLowerCase().includes(search.toLowerCase()) ||
        client.whatsapp.includes(search);
      const matchesPlan = planFilter === 'all' || client.plan === planFilter;
      return matchesSearch && matchesPlan;
    });

    // Sort clients
    const planOrder: Record<PlanType, number> = { monthly: 1, quarterly: 2, semiannual: 3, annual: 4 };
    
    return filtered.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name, 'pt-BR');
      } else if (sortBy === 'expiresAt') {
        comparison = a.expiresAt.getTime() - b.expiresAt.getTime();
      } else if (sortBy === 'plan') {
        comparison = planOrder[a.plan] - planOrder[b.plan];
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [clients, search, planFilter, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedClients.length / clientsPerPage);
  const paginatedClients = useMemo(() => {
    const startIndex = (currentPage - 1) * clientsPerPage;
    return filteredAndSortedClients.slice(startIndex, startIndex + clientsPerPage);
  }, [filteredAndSortedClients, currentPage, clientsPerPage]);

  // Reset page when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [search, planFilter, sortBy, sortOrder]);

  const totalRenewals = useMemo(() => {
    return clients.reduce((acc, c) => acc + (c.renewalHistory?.length || 0), 0);
  }, [clients]);

  // Selection helpers
  const toggleClientSelection = (clientId: string) => {
    setSelectedClients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clientId)) {
        newSet.delete(clientId);
      } else {
        newSet.add(clientId);
      }
      return newSet;
    });
  };

  const selectAllOnPage = () => {
    const allIds = new Set(paginatedClients.map(c => c.id));
    setSelectedClients(allIds);
  };

  const clearSelection = () => {
    setSelectedClients(new Set());
  };

  const isAllOnPageSelected = paginatedClients.length > 0 && paginatedClients.every(c => selectedClients.has(c.id));

  // Bulk actions
  const handleBulkRenew = async () => {
    const selectedIds = Array.from(selectedClients);
    let successCount = 0;
    
    for (const id of selectedIds) {
      const result = await renewClient(id);
      if (result) successCount++;
    }
    
    if (successCount > 0) {
      toast.success(`${successCount} cliente(s) renovado(s) com sucesso!`);
    }
    if (successCount < selectedIds.length) {
      toast.error(`${selectedIds.length - successCount} renovação(ões) falhou(aram)`);
    }
    clearSelection();
  };

  const handleBulkDelete = async () => {
    const selectedIds = Array.from(selectedClients);
    let successCount = 0;
    
    for (const id of selectedIds) {
      await deleteClient(id);
      successCount++;
    }
    
    toast.success(`${successCount} cliente(s) excluído(s) com sucesso!`);
    clearSelection();
    setBulkDeleteDialogOpen(false);
  };

  const handleBulkWhatsApp = () => {
    const selectedClientsList = clients.filter(c => selectedClients.has(c.id));
    
    // Open WhatsApp for each selected client (will open multiple tabs)
    selectedClientsList.forEach((client, index) => {
      const planName = getPlanName(client.plan);
      const daysRemaining = getDaysUntilExpiration(client.expiresAt);
      const message = generateExpirationMessage({ client, planName, daysRemaining });
      
      // Delay opening to avoid browser blocking
      setTimeout(() => {
        openWhatsApp(client.whatsapp, message);
      }, index * 500);
    });

    toast.success(`Abrindo WhatsApp para ${selectedClientsList.length} cliente(s)...`);
  };

  const handleBulkEmail = async () => {
    const selectedClientsList = clients.filter(c => selectedClients.has(c.id));
    let successCount = 0;
    let failCount = 0;

    toast.info(`Enviando emails para ${selectedClientsList.length} cliente(s)...`);

    for (const client of selectedClientsList) {
      try {
        const planName = getPlanName(client.plan);
        const daysRemaining = getDaysUntilExpiration(client.expiresAt);
        
        const { error } = await supabase.functions.invoke('send-expiration-reminder', {
          body: {
            clientId: client.id,
            clientName: client.name,
            clientEmail: client.email,
            planName,
            daysRemaining,
            expiresAt: format(client.expiresAt, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
          },
        });

        if (error) {
          failCount++;
          console.error(`Failed to send email to ${client.email}:`, error);
        } else {
          successCount++;
          
          // Record notification
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const subject = daysRemaining < 0 
              ? `⚠️ ${client.name}, seu plano ${planName} venceu!`
              : daysRemaining === 0
              ? `🔔 ${client.name}, seu plano ${planName} vence hoje!`
              : `📅 ${client.name}, seu plano ${planName} vence em ${daysRemaining} dia(s)`;

            await supabase.from('notification_history').insert({
              client_id: client.id,
              user_id: user.id,
              notification_type: 'email',
              subject,
              status: 'sent',
              days_until_expiration: daysRemaining,
            });
          }
        }
      } catch (error) {
        failCount++;
        console.error(`Error sending email to ${client.email}:`, error);
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} email(s) enviado(s) com sucesso!`);
    }
    if (failCount > 0) {
      toast.error(`${failCount} email(s) falhou(aram)`);
    }
    clearSelection();
  };

  const handleAddClient = async (data: Omit<Client, 'id' | 'renewalHistory'>) => {
    const result = await addClient(data);
    if (result) {
      toast.success('Cliente cadastrado com sucesso!');
    } else {
      toast.error('Erro ao cadastrar cliente');
    }
  };

  const handleEditClient = async (data: Omit<Client, 'id' | 'renewalHistory'>) => {
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

  const handleOpenChangePlan = (client: Client) => {
    setChangePlanClient(client);
    setChangePlanDialogOpen(true);
  };

  const handleViewNotifications = (client: Client) => {
    setNotificationClient(client);
    setNotificationDialogOpen(true);
  };

  const handleConfirmChangePlan = async (clientId: string, newPlan: PlanType, newExpiresAt: Date) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    await updateClient(clientId, { plan: newPlan, expiresAt: newExpiresAt });
    toast.success(
      `Plano alterado para ${planLabels[newPlan]}! Novo vencimento: ${format(newExpiresAt, "dd 'de' MMM, yyyy", { locale: ptBR })}`,
      { duration: 4000 }
    );
  };

  const handleExportClients = () => {
    if (clients.length === 0) {
      toast.error('Não há clientes para exportar');
      return;
    }
    exportClientsToCSV(filteredAndSortedClients);
    toast.success(`${filteredAndSortedClients.length} cliente(s) exportado(s) para CSV`);
  };

  const handleExportRenewals = () => {
    if (totalRenewals === 0) {
      toast.error('Não há renovações para exportar');
      return;
    }
    exportRenewalHistoryToCSV(clients);
    toast.success(`Histórico de renovações exportado para CSV`);
  };

  const handleExportPDF = () => {
    if (clients.length === 0) {
      toast.error('Não há clientes para exportar');
      return;
    }
    exportReportToPDF(clients, getPlanName);
    toast.success('Relatório exportado para PDF');
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
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Zap className="h-6 w-6 text-primary animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background cyber-grid">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center neon-glow">
                  <Users className="h-6 w-6 text-primary-foreground" />
                </div>
                <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-accent animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gradient">Gerenciador de Clientes</h1>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-primary" />
                  Sistema inteligente de gestão
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="hidden sm:flex glass-card border-primary/30 hover:border-primary hover:neon-glow transition-all duration-300">
                    <Download className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="glass-card border-border/50">
                  <DropdownMenuItem onClick={handleExportClients} className="hover:bg-primary/10">
                    <FileSpreadsheet className="h-4 w-4 mr-2 text-primary" />
                    Exportar Clientes (CSV)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportRenewals} className="hover:bg-primary/10">
                    <History className="h-4 w-4 mr-2 text-accent" />
                    Exportar Renovações (CSV)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border/50" />
                  <DropdownMenuItem onClick={handleExportPDF} className="hover:bg-primary/10">
                    <FileText className="h-4 w-4 mr-2 text-plan-annual" />
                    Relatório Completo (PDF)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button onClick={() => setFormOpen(true)} className="gap-2 btn-futuristic text-primary-foreground font-semibold">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Novo Cliente</span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="glass-card border-primary/30 hover:border-primary hover:neon-glow transition-all duration-300 p-0 overflow-hidden">
                    {profile?.avatar_url ? (
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={profile.avatar_url} alt="Avatar" />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {profile.display_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="glass-card border-border/50">
                  <div className="px-3 py-2 text-sm text-muted-foreground border-b border-border/50 flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={profile?.avatar_url || undefined} alt="Avatar" />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {profile?.display_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground truncate max-w-[150px]">{profile?.display_name || 'Usuário'}</p>
                      <span className="text-xs text-muted-foreground truncate block max-w-[150px]">{user?.email}</span>
                    </div>
                  </div>
                  <DropdownMenuItem onClick={() => navigate('/profile')} className="hover:bg-primary/10 mt-1">
                    <User className="h-4 w-4 mr-2 text-primary" />
                    Meu Perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/settings')} className="hover:bg-primary/10">
                    <Settings className="h-4 w-4 mr-2 text-primary" />
                    Configurações
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut} className="hover:bg-destructive/10 text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Expiring Alert */}
        <ExpiringClientsAlert 
          expiringClients={expiringClients}
          expiredClients={expiredClients}
          onClientClick={handleAlertClientClick}
        />

        {/* Stats */}
        <div className="animate-fade-in">
          <ClientStats clients={clients} />
        </div>

        {/* Filters & Sort */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between glass-card p-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <SearchBar value={search} onChange={setSearch} />
          <div className="flex flex-wrap gap-2 items-center">
            {/* View Mode Toggle */}
            <div className="flex items-center border border-border/50 rounded-lg overflow-hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('grid')}
                className={`rounded-none px-3 ${viewMode === 'grid' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('list')}
                className={`rounded-none px-3 ${viewMode === 'list' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 glass-card border-primary/30 hover:border-primary">
                  <ArrowUpDown className="h-4 w-4" />
                  <span className="hidden sm:inline">Ordenar:</span>
                  <span className="font-medium">
                    {sortBy === 'name' ? 'Nome' : sortBy === 'expiresAt' ? 'Vencimento' : 'Plano'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({sortOrder === 'asc' ? '↑' : '↓'})
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background border-border/50 z-50">
                <DropdownMenuItem onClick={() => { setSortBy('name'); setSortOrder(sortBy === 'name' && sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                  Nome {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSortBy('expiresAt'); setSortOrder(sortBy === 'expiresAt' && sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                  Vencimento {sortBy === 'expiresAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSortBy('plan'); setSortOrder(sortBy === 'plan' && sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                  Plano {sortBy === 'plan' && (sortOrder === 'asc' ? '↑' : '↓')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <PlanFilter selected={planFilter} onSelect={setPlanFilter} />
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedClients.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 glass-card border border-primary/50 rounded-xl px-4 py-3 flex items-center gap-4 shadow-lg animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-primary" />
              <span className="font-medium">{selectedClients.size} selecionado(s)</span>
            </div>
            <div className="h-6 w-px bg-border/50" />
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-green-500/50 text-green-500 hover:bg-green-500/10"
                onClick={handleBulkWhatsApp}
              >
                <MessageCircle className="h-4 w-4" />
                <span className="hidden sm:inline">WhatsApp</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-blue-500/50 text-blue-500 hover:bg-blue-500/10"
                onClick={handleBulkEmail}
              >
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Email</span>
              </Button>
              <div className="h-6 w-px bg-border/50 hidden sm:block" />
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10"
                onClick={handleBulkRenew}
              >
                <RefreshCwIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Renovar</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-destructive/50 text-destructive hover:bg-destructive/10"
                onClick={() => setBulkDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Excluir</span>
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={clearSelection}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Selection Controls & Client Grid */}
        {filteredAndSortedClients.length === 0 ? (
          <div className="text-center py-20 glass-card rounded-2xl">
            <div className="relative inline-block">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 mx-auto flex items-center justify-center mb-6 float">
                <Users className="h-10 w-10 text-primary" />
              </div>
              <div className="absolute inset-0 h-20 w-20 rounded-full border-2 border-primary/30 animate-ping"></div>
            </div>
            <h3 className="text-xl font-semibold text-gradient mb-3">
              {clients.length === 0 ? 'Nenhum cliente cadastrado' : 'Nenhum cliente encontrado'}
            </h3>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              {clients.length === 0
                ? 'Comece adicionando seu primeiro cliente para desbloquear todo o potencial do sistema.'
                : 'Tente ajustar os filtros de busca para encontrar o que procura.'}
            </p>
            {clients.length === 0 && (
              <Button onClick={() => setFormOpen(true)} className="gap-2 btn-futuristic text-primary-foreground font-semibold px-8">
                <Plus className="h-4 w-4" />
                Adicionar Cliente
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Select All Toggle */}
            <div className="flex items-center gap-2 mb-2">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground hover:text-foreground"
                onClick={isAllOnPageSelected ? clearSelection : selectAllOnPage}
              >
                {isAllOnPageSelected ? (
                  <CheckSquare className="h-4 w-4 text-primary" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                {isAllOnPageSelected ? 'Desmarcar todos' : 'Selecionar todos da página'}
              </Button>
            </div>

            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {paginatedClients.map((client, index) => (
                  <div 
                    key={client.id} 
                    className="animate-fade-in relative"
                    style={{ animationDelay: `${0.05 * index}s` }}
                  >
                    {/* Selection Checkbox */}
                    <button
                      onClick={() => toggleClientSelection(client.id)}
                      className={`absolute top-3 right-3 z-20 h-6 w-6 rounded-md border-2 flex items-center justify-center transition-all ${
                        selectedClients.has(client.id)
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'bg-background/80 border-border/50 hover:border-primary/50'
                      }`}
                    >
                      {selectedClients.has(client.id) && <CheckSquare className="h-4 w-4" />}
                    </button>
                    <ClientCard
                      client={client}
                      onEdit={handleOpenEdit}
                      onDelete={handleOpenDelete}
                      onRenew={handleRenewClient}
                      onViewHistory={handleViewHistory}
                      onChangePlan={handleOpenChangePlan}
                      onViewNotifications={handleViewNotifications}
                      getPlanName={getPlanName}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <ClientTable
                clients={paginatedClients}
                onEdit={handleOpenEdit}
                onDelete={handleOpenDelete}
                onRenew={handleRenewClient}
                onViewHistory={handleViewHistory}
                onChangePlan={handleOpenChangePlan}
                onViewNotifications={handleViewNotifications}
                getPlanName={getPlanName}
                selectedClients={selectedClients}
                onToggleSelection={toggleClientSelection}
              />
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="glass-card border-primary/30 hover:border-primary"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      if (totalPages <= 7) return true;
                      if (page === 1 || page === totalPages) return true;
                      if (Math.abs(page - currentPage) <= 1) return true;
                      return false;
                    })
                    .map((page, index, arr) => {
                      const showEllipsis = index > 0 && page - arr[index - 1] > 1;
                      return (
                        <span key={page} className="flex items-center">
                          {showEllipsis && <span className="px-2 text-muted-foreground">...</span>}
                          <Button
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className={currentPage === page 
                              ? "btn-futuristic text-primary-foreground min-w-[36px]" 
                              : "glass-card border-primary/30 hover:border-primary min-w-[36px]"
                            }
                          >
                            {page}
                          </Button>
                        </span>
                      );
                    })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="glass-card border-primary/30 hover:border-primary"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>

                <span className="text-sm text-muted-foreground ml-2">
                  {filteredAndSortedClients.length} cliente(s)
                </span>
              </div>
            )}
          </>
        )}

        {/* Retention Metrics */}
        <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <RetentionMetrics clients={clients} />
        </div>

        {/* Charts */}
        <div className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <ClientCharts clients={clients} />
        </div>

        {/* Financial Report & Referral */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <div className="lg:col-span-2">
            <FinancialReport clients={clients} />
          </div>
          <div>
            <ReferralCard />
          </div>
        </div>
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
      <ChangePlanDialog
        client={changePlanClient}
        open={changePlanDialogOpen}
        onOpenChange={setChangePlanDialogOpen}
        onConfirm={handleConfirmChangePlan}
      />
      <NotificationHistoryDialog
        client={notificationClient}
        open={notificationDialogOpen}
        onOpenChange={setNotificationDialogOpen}
      />
      {/* Bulk Delete Confirmation */}
      <DeleteConfirmDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        onConfirm={handleBulkDelete}
        clientName={`${selectedClients.size} cliente(s)`}
      />
    </div>
  );
};

export default Index;