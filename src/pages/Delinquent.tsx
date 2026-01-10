import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useClients } from "@/hooks/useClients";
import { usePlanSettings } from "@/hooks/usePlanSettings";
import { Client, planLabels, formatCurrency } from "@/types/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  ArrowLeft,
  AlertTriangle,
  Users,
  DollarSign,
  RefreshCw,
  MessageCircle,
  Trash2,
  CheckSquare,
  Square,
  Search,
  Filter,
  Download,
} from "lucide-react";
import { openWhatsApp } from "@/lib/whatsapp";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

type DaysFilter = 'all' | '1-7' | '8-15' | '16-30' | '30+';

export default function Delinquent() {
  const navigate = useNavigate();
  const { clients, renewClient, deleteClient } = useClients();
  const { getPlanName, getPlanPrice } = usePlanSettings();
  const [search, setSearch] = useState("");
  const [daysFilter, setDaysFilter] = useState<DaysFilter>("all");
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Get only expired/delinquent clients
  const delinquentClients = useMemo(() => {
    const now = new Date();
    return clients
      .filter((client) => new Date(client.expiresAt) < now)
      .map((client) => ({
        ...client,
        daysOverdue: differenceInDays(now, new Date(client.expiresAt)),
      }))
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [clients]);

  // Apply filters
  const filteredClients = useMemo(() => {
    return delinquentClients.filter((client) => {
      const matchesSearch =
        client.name.toLowerCase().includes(search.toLowerCase()) ||
        client.whatsapp.includes(search);

      let matchesDays = true;
      if (daysFilter !== "all") {
        const days = client.daysOverdue;
        switch (daysFilter) {
          case "1-7":
            matchesDays = days >= 1 && days <= 7;
            break;
          case "8-15":
            matchesDays = days >= 8 && days <= 15;
            break;
          case "16-30":
            matchesDays = days >= 16 && days <= 30;
            break;
          case "30+":
            matchesDays = days > 30;
            break;
        }
      }

      return matchesSearch && matchesDays;
    });
  }, [delinquentClients, search, daysFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalDebt = filteredClients.reduce((acc, client) => {
      const price = client.price || getPlanPrice(client.plan);
      return acc + price;
    }, 0);

    const critical = filteredClients.filter((c) => c.daysOverdue > 30).length;
    const warning = filteredClients.filter((c) => c.daysOverdue >= 8 && c.daysOverdue <= 30).length;
    const recent = filteredClients.filter((c) => c.daysOverdue < 8).length;

    return { totalDebt, critical, warning, recent, total: filteredClients.length };
  }, [filteredClients, getPlanPrice]);

  // Selection helpers
  const toggleClientSelection = (clientId: string) => {
    setSelectedClients((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(clientId)) {
        newSet.delete(clientId);
      } else {
        newSet.add(clientId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedClients(new Set(filteredClients.map((c) => c.id)));
  };

  const clearSelection = () => {
    setSelectedClients(new Set());
  };

  const isAllSelected =
    filteredClients.length > 0 &&
    filteredClients.every((c) => selectedClients.has(c.id));

  // Actions
  const handleBulkWhatsApp = async () => {
    const selectedList = filteredClients.filter((c) => selectedClients.has(c.id));
    if (selectedList.length === 0) {
      toast.error("Selecione pelo menos um cliente");
      return;
    }

    setIsProcessing(true);
    let count = 0;

    for (const client of selectedList) {
      const planName = getPlanName(client.plan);
      const message = `Olá ${client.name}! 👋

Notamos que seu plano *${planName}* venceu há *${client.daysOverdue} dia(s)*.

Gostaríamos de ajudar você a renovar e continuar aproveitando nossos serviços!

Entre em contato para renovar. 😊`;

      await new Promise((resolve) => setTimeout(resolve, 500));
      openWhatsApp(client.whatsapp, message);
      count++;
    }

    setIsProcessing(false);
    toast.success(`WhatsApp aberto para ${count} cliente(s)`);
    clearSelection();
  };

  const handleBulkRenew = async () => {
    const selectedList = filteredClients.filter((c) => selectedClients.has(c.id));
    if (selectedList.length === 0) {
      toast.error("Selecione pelo menos um cliente");
      return;
    }

    setIsProcessing(true);
    let successCount = 0;

    for (const client of selectedList) {
      const result = await renewClient(client.id);
      if (result) successCount++;
    }

    setIsProcessing(false);
    if (successCount > 0) {
      toast.success(`${successCount} cliente(s) renovado(s) com sucesso!`);
    }
    if (successCount < selectedList.length) {
      toast.error(`${selectedList.length - successCount} renovação(ões) falhou(aram)`);
    }
    clearSelection();
  };

  const handleBulkDelete = async () => {
    const selectedList = filteredClients.filter((c) => selectedClients.has(c.id));
    setIsProcessing(true);
    let count = 0;

    for (const client of selectedList) {
      await deleteClient(client.id);
      count++;
    }

    setIsProcessing(false);
    toast.success(`${count} cliente(s) excluído(s)`);
    clearSelection();
    setBulkDeleteDialogOpen(false);
  };

  const handleSingleRenew = async (clientId: string) => {
    const result = await renewClient(clientId);
    if (result) {
      toast.success("Cliente renovado com sucesso!");
    } else {
      toast.error("Erro ao renovar cliente");
    }
  };

  const handleSingleWhatsApp = (client: Client & { daysOverdue: number }) => {
    const planName = getPlanName(client.plan);
    const message = `Olá ${client.name}! 👋

Notamos que seu plano *${planName}* venceu há *${client.daysOverdue} dia(s)*.

Gostaríamos de ajudar você a renovar e continuar aproveitando nossos serviços!

Entre em contato para renovar. 😊`;
    openWhatsApp(client.whatsapp, message);
  };

  const exportToCSV = () => {
    if (filteredClients.length === 0) {
      toast.error("Não há clientes para exportar");
      return;
    }

    const headers = ["Nome", "WhatsApp", "Plano", "Vencimento", "Dias Atrasado", "Valor"];
    const rows = filteredClients.map((c) => [
      c.name,
      c.whatsapp,
      planLabels[c.plan],
      format(new Date(c.expiresAt), "dd/MM/yyyy"),
      c.daysOverdue,
      c.price || getPlanPrice(c.plan),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `inadimplentes_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();

    toast.success(`${filteredClients.length} cliente(s) exportado(s)`);
  };

  const getDaysOverdueBadge = (days: number) => {
    if (days > 30) {
      return (
        <Badge variant="destructive" className="font-mono">
          {days} dias
        </Badge>
      );
    }
    if (days >= 8) {
      return (
        <Badge variant="outline" className="border-yellow-500 text-yellow-500 font-mono">
          {days} dias
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-orange-500 text-orange-500 font-mono">
        {days} dias
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <h1 className="text-xl font-bold">Relatório de Inadimplência</h1>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Users className="h-8 w-8 text-destructive" />
                <span className="text-2xl font-bold">{stats.total}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Total Inadimplentes</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <DollarSign className="h-8 w-8 text-yellow-500" />
                <span className="text-2xl font-bold">{formatCurrency(stats.totalDebt)}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Receita Pendente</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <AlertTriangle className="h-8 w-8 text-red-500" />
                <span className="text-2xl font-bold">{stats.critical}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Críticos (+30 dias)</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <AlertTriangle className="h-8 w-8 text-orange-500" />
                <span className="text-2xl font-bold">{stats.recent}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Recentes (&lt;8 dias)</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Actions */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              {/* Search & Filters */}
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar cliente..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 w-[200px]"
                  />
                </div>

                <Select value={daysFilter} onValueChange={(v) => setDaysFilter(v as DaysFilter)}>
                  <SelectTrigger className="w-[150px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Dias de atraso" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="1-7">1-7 dias</SelectItem>
                    <SelectItem value="8-15">8-15 dias</SelectItem>
                    <SelectItem value="16-30">16-30 dias</SelectItem>
                    <SelectItem value="30+">+30 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Bulk Actions */}
              {selectedClients.size > 0 && (
                <div className="flex gap-2 items-center">
                  <Badge variant="secondary">{selectedClients.size} selecionado(s)</Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBulkWhatsApp}
                    disabled={isProcessing}
                  >
                    <MessageCircle className="h-4 w-4 mr-1" />
                    WhatsApp
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBulkRenew}
                    disabled={isProcessing}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Renovar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setBulkDeleteDialogOpen(true)}
                    disabled={isProcessing}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Excluir
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Lista de Inadimplentes</span>
              <Button variant="ghost" size="sm" onClick={isAllSelected ? clearSelection : selectAll}>
                {isAllSelected ? (
                  <>
                    <CheckSquare className="h-4 w-4 mr-1" />
                    Desmarcar
                  </>
                ) : (
                  <>
                    <Square className="h-4 w-4 mr-1" />
                    Selecionar Todos
                  </>
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredClients.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {delinquentClients.length === 0 ? (
                  <div>
                    <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                    <p className="font-medium text-foreground">Nenhum cliente inadimplente!</p>
                    <p className="text-sm">Todos os clientes estão com o plano em dia.</p>
                  </div>
                ) : (
                  <p>Nenhum cliente encontrado com os filtros atuais.</p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>WhatsApp</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Atraso</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client) => (
                      <TableRow key={client.id} className="hover:bg-muted/50">
                        <TableCell>
                          <Checkbox
                            checked={selectedClients.has(client.id)}
                            onCheckedChange={() => toggleClientSelection(client.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{client.name}</TableCell>
                        <TableCell className="text-muted-foreground">{client.whatsapp}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{planLabels[client.plan]}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(client.expiresAt), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>{getDaysOverdueBadge(client.daysOverdue)}</TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(client.price || getPlanPrice(client.plan))}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSingleWhatsApp(client)}
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSingleRenew(client.id)}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Bulk Delete Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedClients.size} cliente(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os dados dos clientes selecionados
              serão permanentemente removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
