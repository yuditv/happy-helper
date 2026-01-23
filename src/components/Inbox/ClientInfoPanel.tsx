import { useMemo } from 'react';
import { Client, getExpirationStatus, getDaysUntilExpiration, formatCurrency, planLabels } from '@/types/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  CreditCard, 
  History, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  StickyNote,
  ExternalLink,
  UserPlus
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ClientInfoPanelProps {
  client: Client | null;
  isLoading?: boolean;
  onRenew?: (id: string) => void;
  onEdit?: (client: Client) => void;
  onRegisterClient?: (phone: string, name?: string) => void;
  phone?: string;
  contactName?: string;
}

export function ClientInfoPanel({ 
  client, 
  isLoading,
  onRenew, 
  onEdit,
  onRegisterClient,
  phone,
  contactName
}: ClientInfoPanelProps) {
  const status = client ? getExpirationStatus(client.expiresAt) : null;
  const daysUntil = client ? getDaysUntilExpiration(client.expiresAt) : 0;

  const statusConfig = useMemo(() => {
    if (!status) return null;
    
    switch (status) {
      case 'active':
        return {
          label: 'Ativo',
          icon: CheckCircle,
          color: 'text-emerald-500',
          bgColor: 'bg-emerald-500/10',
          borderColor: 'border-emerald-500/30',
        };
      case 'expiring':
        return {
          label: `Expira em ${daysUntil} dia${daysUntil !== 1 ? 's' : ''}`,
          icon: AlertTriangle,
          color: 'text-amber-500',
          bgColor: 'bg-amber-500/10',
          borderColor: 'border-amber-500/30',
        };
      case 'expired':
        return {
          label: `Expirado há ${Math.abs(daysUntil)} dia${Math.abs(daysUntil) !== 1 ? 's' : ''}`,
          icon: XCircle,
          color: 'text-destructive',
          bgColor: 'bg-destructive/10',
          borderColor: 'border-destructive/30',
        };
    }
  }, [status, daysUntil]);

  if (isLoading) {
    return (
      <Card className="glass-card h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="h-4 w-4" />
            Dados do Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Client not found - show register option
  if (!client) {
    return (
      <Card className="glass-card h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="h-4 w-4" />
            Dados do Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <User className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              Cliente não cadastrado
            </p>
            {phone && (
              <p className="text-xs text-muted-foreground mb-4">
                {phone}
              </p>
            )}
            {onRegisterClient && (
              <Button 
                size="sm" 
                onClick={() => onRegisterClient(phone || '', contactName)}
                className="gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Cadastrar Cliente
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("glass-card h-full", statusConfig?.borderColor)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Dados do Cliente
          </div>
          {onEdit && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6"
              onClick={() => onEdit(client)}
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Badge */}
        {statusConfig && (
          <div className={cn(
            "flex items-center gap-2 p-2 rounded-lg",
            statusConfig.bgColor
          )}>
            <statusConfig.icon className={cn("h-4 w-4", statusConfig.color)} />
            <span className={cn("text-sm font-medium", statusConfig.color)}>
              {statusConfig.label}
            </span>
          </div>
        )}

        {/* Client Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm font-medium truncate">{client.name}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-muted-foreground">{client.whatsapp}</span>
          </div>
          
          {client.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-muted-foreground truncate">{client.email}</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Plan Info */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Plano</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {planLabels[client.plan]}
            </Badge>
          </div>
          
          {client.price !== null && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Valor</span>
              </div>
              <span className="text-sm font-medium">{formatCurrency(client.price)}</span>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Vencimento</span>
            </div>
            <span className="text-sm">{format(client.expiresAt, "dd/MM/yyyy")}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Cadastrado</span>
            </div>
            <span className="text-sm">{format(client.createdAt, "dd/MM/yyyy")}</span>
          </div>
        </div>

        {/* Notes */}
        {client.notes && (
          <>
            <Separator />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <StickyNote className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Notas</span>
              </div>
              <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded line-clamp-3">
                {client.notes}
              </p>
            </div>
          </>
        )}

        {/* Renewal History */}
        {client.renewalHistory && client.renewalHistory.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Renovações ({client.renewalHistory.length})
                </span>
              </div>
              <ScrollArea className="h-20">
                <div className="space-y-1">
                  {client.renewalHistory.slice(0, 3).map((renewal, i) => (
                    <div key={renewal.id} className="text-xs text-muted-foreground flex justify-between">
                      <span>{format(renewal.date, "dd/MM/yy", { locale: ptBR })}</span>
                      <span>{planLabels[renewal.plan]}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </>
        )}

        {/* Actions */}
        {onRenew && (status === 'expiring' || status === 'expired') && (
          <>
            <Separator />
            <Button 
              size="sm" 
              className="w-full gap-2"
              variant={status === 'expired' ? 'destructive' : 'default'}
              onClick={() => onRenew(client.id)}
            >
              <RefreshCw className="h-4 w-4" />
              Renovar Plano
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
