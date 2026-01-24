import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CRMKanban } from '@/components/CRM/CRMKanban';
import { CRMDashboard } from '@/components/CRM/CRMDashboard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWhatsAppInstances } from '@/hooks/useWhatsAppInstances';
import { Kanban, BarChart3, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function CRM() {
  const [activeTab, setActiveTab] = useState('kanban');
  const [selectedInstance, setSelectedInstance] = useState<string>('all');
  const { instances } = useWhatsAppInstances();

  const instanceId = selectedInstance === 'all' ? undefined : selectedInstance;

  return (
    <div className="container mx-auto p-6 space-y-6 h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            CRM Pipeline
          </h1>
          <p className="text-muted-foreground">
            Gerencie seus leads e acompanhe o funil de vendas
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedInstance} onValueChange={setSelectedInstance}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todas as instâncias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as instâncias</SelectItem>
              {instances.map((instance) => (
                <SelectItem key={instance.id} value={instance.id}>
                  {instance.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" asChild>
            <Link to="/inbox-settings?section=crm-fields">
              <Settings2 className="h-4 w-4 mr-2" />
              Configurar Campos
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2">
          <TabsTrigger value="kanban" className="flex items-center gap-2">
            <Kanban className="h-4 w-4" />
            Kanban
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="flex-1 mt-4">
          <Card className="h-full border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Pipeline de Vendas</CardTitle>
              <CardDescription>
                Arraste os cards entre colunas para atualizar o estágio dos leads
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[calc(100%-5rem)]">
              <CRMKanban instanceId={instanceId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dashboard" className="flex-1 mt-4">
          <CRMDashboard instanceId={instanceId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
