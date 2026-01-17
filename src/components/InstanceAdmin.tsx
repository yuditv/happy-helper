import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  RefreshCw, 
  Trash2, 
  Smartphone, 
  Wifi, 
  WifiOff, 
  Loader2,
  Server,
  Calendar,
  User
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { ScrollArea } from '@/components/ui/scroll-area';

interface UazapiInstance {
  id?: string;
  name: string;
  status: 'disconnected' | 'connecting' | 'connected';
  token?: string;
  createdAt?: string;
  lastDisconnect?: string;
  disconnectReason?: string;
  profileName?: string;
  profilePicture?: string;
  phone?: string;
}

export function InstanceAdmin() {
  const [instances, setInstances] = useState<UazapiInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [newInstanceName, setNewInstanceName] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [instanceToDelete, setInstanceToDelete] = useState<UazapiInstance | null>(null);
  const [createdToken, setCreatedToken] = useState<string | null>(null);

  const fetchInstances = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('uazapi-list-instances');

      if (error) {
        console.error('Error fetching instances:', error);
        toast.error('Erro ao carregar instâncias');
        return;
      }

      if (data?.instances) {
        // Handle both array and object responses
        const instanceList = Array.isArray(data.instances) 
          ? data.instances 
          : data.instances.instances || [];
        
        setInstances(instanceList.map((inst: any) => ({
          id: inst.id,
          name: inst.name,
          status: inst.status || 'disconnected',
          token: inst.token,
          createdAt: inst.createdAt,
          lastDisconnect: inst.lastDisconnect,
          disconnectReason: inst.disconnectReason,
          profileName: inst.profileName,
          profilePicture: inst.profilePicture,
          phone: inst.phone,
        })));
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('Erro ao carregar instâncias');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInstances();
  }, [fetchInstances]);

  const handleCreateInstance = async () => {
    if (!newInstanceName.trim()) {
      toast.error('Nome da instância é obrigatório');
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('uazapi-init-instance', {
        body: { name: newInstanceName.trim() },
      });

      if (error) {
        console.error('Error creating instance:', error);
        toast.error('Erro ao criar instância');
        return;
      }

      if (data?.success) {
        toast.success('Instância criada com sucesso!');
        
        // Store the token if returned
        if (data.data?.token) {
          setCreatedToken(data.data.token);
        }
        
        setNewInstanceName('');
        fetchInstances();
      } else {
        toast.error(data?.error || 'Erro ao criar instância');
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('Erro ao criar instância');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteInstance = async () => {
    if (!instanceToDelete) return;

    setIsDeleting(instanceToDelete.name);
    try {
      const { data, error } = await supabase.functions.invoke('uazapi-delete-instance', {
        body: { instanceName: instanceToDelete.name },
      });

      if (error) {
        console.error('Error deleting instance:', error);
        toast.error('Erro ao deletar instância');
        return;
      }

      if (data?.success) {
        toast.success('Instância deletada com sucesso!');
        setInstances(prev => prev.filter(inst => inst.name !== instanceToDelete.name));
      } else {
        toast.error(data?.error || 'Erro ao deletar instância');
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('Erro ao deletar instância');
    } finally {
      setIsDeleting(null);
      setDeleteDialogOpen(false);
      setInstanceToDelete(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <Wifi className="w-3 h-3 mr-1" />
            Conectado
          </Badge>
        );
      case 'connecting':
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Conectando
          </Badge>
        );
      default:
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            <WifiOff className="w-3 h-3 mr-1" />
            Desconectado
          </Badge>
        );
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleString('pt-BR');
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5 text-primary" />
                Administração de Instâncias
              </CardTitle>
              <CardDescription>
                Gerencie suas instâncias WhatsApp Uazapi
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={fetchInstances}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Instância
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Nova Instância</DialogTitle>
                    <DialogDescription>
                      Crie uma nova instância WhatsApp. Após criar, guarde o token retornado.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="instanceName">Nome da Instância</Label>
                      <Input
                        id="instanceName"
                        placeholder="minha-instancia"
                        value={newInstanceName}
                        onChange={(e) => setNewInstanceName(e.target.value)}
                      />
                    </div>
                    {createdToken && (
                      <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <Label className="text-green-400">Token da Instância (guarde isso!):</Label>
                        <code className="block mt-1 text-xs break-all bg-background/50 p-2 rounded">
                          {createdToken}
                        </code>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => {
                      setCreateDialogOpen(false);
                      setCreatedToken(null);
                      setNewInstanceName('');
                    }}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreateInstance} disabled={isCreating}>
                      {isCreating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Criando...
                        </>
                      ) : (
                        'Criar Instância'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : instances.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Smartphone className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma instância encontrada</p>
              <p className="text-sm">Crie uma nova instância para começar</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {instances.map((instance) => (
                  <Card 
                    key={instance.name} 
                    className="bg-background/50 border-border/50 hover:border-primary/30 transition-colors"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                              {instance.profilePicture ? (
                                <img 
                                  src={instance.profilePicture} 
                                  alt={instance.name}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <Smartphone className="w-5 h-5 text-primary" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-semibold">{instance.name}</h4>
                              {instance.profileName && (
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {instance.profileName}
                                </p>
                              )}
                            </div>
                            {getStatusBadge(instance.status)}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground mt-3">
                            {instance.phone && (
                              <div className="flex items-center gap-1">
                                <Smartphone className="w-3 h-3" />
                                {instance.phone}
                              </div>
                            )}
                            {instance.createdAt && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Criado: {formatDate(instance.createdAt)}
                              </div>
                            )}
                          </div>

                          {instance.disconnectReason && (
                            <p className="text-xs text-red-400 mt-2">
                              Motivo desconexão: {instance.disconnectReason}
                            </p>
                          )}
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => {
                            setInstanceToDelete(instance);
                            setDeleteDialogOpen(true);
                          }}
                          disabled={isDeleting === instance.name}
                        >
                          {isDeleting === instance.name ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Instância</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar a instância "{instanceToDelete?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteInstance}
              className="bg-red-500 hover:bg-red-600"
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
