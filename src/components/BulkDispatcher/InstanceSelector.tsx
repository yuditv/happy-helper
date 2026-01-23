import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Smartphone, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WhatsAppInstance {
  id: string;
  instance_name: string;
  status: string;
  phone_connected?: string;
  daily_limit?: number;
}

interface InstanceSelectorProps {
  instances: WhatsAppInstance[];
  selectedIds: string[];
  balancingMode: 'automatic' | 'round-robin' | 'single';
  onSelectionChange: (ids: string[]) => void;
  onBalancingModeChange: (mode: 'automatic' | 'round-robin' | 'single') => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function InstanceSelector({
  instances,
  selectedIds,
  balancingMode,
  onSelectionChange,
  onBalancingModeChange,
  onRefresh,
  isLoading
}: InstanceSelectorProps) {
  const connectedInstances = instances.filter(i => i.status === 'connected');
  const selectedCount = selectedIds.length;

  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(i => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const selectAll = () => {
    onSelectionChange(connectedInstances.map(i => i.id));
  };

  const clearSelection = () => {
    onSelectionChange([]);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return (
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
            <Wifi className="w-3 h-3 mr-1" />
            Conectado
          </Badge>
        );
      case 'disconnected':
        return (
          <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/30">
            <WifiOff className="w-3 h-3 mr-1" />
            Desconectado
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            Aguardando
          </Badge>
        );
    }
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              Seleção de Instâncias
            </CardTitle>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
              WhatsApp API
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {isLoading && (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 animate-pulse">
                Sincronizando...
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={selectAll} disabled={connectedInstances.length === 0 || isLoading}>
              Selecionar Todas
            </Button>
            <Button variant="ghost" size="sm" onClick={clearSelection} disabled={selectedCount === 0 || isLoading}>
              Limpar
            </Button>
            {onRefresh && (
              <Button variant="ghost" size="icon" onClick={onRefresh} disabled={isLoading} title="Atualizar status das instâncias">
                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {instances.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Smartphone className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma instância encontrada</p>
            <p className="text-sm">Crie uma instância na aba "Instâncias"</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {instances.map(instance => {
                const isSelected = selectedIds.includes(instance.id);
                const isConnected = instance.status === 'connected';
                
                return (
                  <div
                    key={instance.id}
                    onClick={() => isConnected && handleToggle(instance.id)}
                    className={cn(
                      "relative p-4 rounded-lg border-2 transition-all cursor-pointer",
                      isSelected 
                        ? "border-primary bg-primary/10" 
                        : "border-border/50 bg-background/50 hover:border-border",
                      !isConnected && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        disabled={!isConnected}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium truncate">
                            {instance.instance_name}
                          </span>
                          {getStatusBadge(instance.status)}
                        </div>
                        {instance.phone_connected && (
                          <p className="text-sm text-muted-foreground mt-1">
                            📱 {instance.phone_connected}
                          </p>
                        )}
                        {instance.daily_limit && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Limite: {instance.daily_limit} msgs/dia
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border/50">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Modo de balanceamento:</span>
                <Select value={balancingMode} onValueChange={(v) => onBalancingModeChange(v as any)}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="automatic">
                      🧠 Automático (Inteligente)
                    </SelectItem>
                    <SelectItem value="round-robin">
                      🔄 Round Robin (Alternado)
                    </SelectItem>
                    <SelectItem value="single">
                      1️⃣ Única Instância
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Badge variant="secondary" className="text-sm">
                {selectedCount} instância(s) selecionada(s)
              </Badge>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
