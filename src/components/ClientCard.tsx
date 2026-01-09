import { Client, planLabels, getExpirationStatus, getDaysUntilExpiration, planPrices, formatCurrency } from '@/types/client';
import { PlanBadge } from './PlanBadge';
import { ExpirationBadge } from './ExpirationBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, Mail, Pencil, Trash2, Calendar, RefreshCw, History, ArrowRightLeft, MessageCircle, Send } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { generateExpirationMessage, openWhatsApp } from '@/lib/whatsapp';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ClientCardProps {
  client: Client;
  onEdit: (client: Client) => void;
  onDelete: (id: string) => void;
  onRenew: (id: string) => void;
  onViewHistory: (client: Client) => void;
  onChangePlan: (client: Client) => void;
  getPlanName?: (plan: string) => string;
}

export function ClientCard({ client, onEdit, onDelete, onRenew, onViewHistory, onChangePlan, getPlanName }: ClientCardProps) {
  const whatsappLink = `https://wa.me/${client.whatsapp.replace(/\D/g, '')}`;
  const status = getExpirationStatus(client.expiresAt);
  const needsAttention = status === 'expiring' || status === 'expired';
  const hasHistory = client.renewalHistory && client.renewalHistory.length > 0;
  const daysRemaining = getDaysUntilExpiration(client.expiresAt);
  const planName = getPlanName ? getPlanName(client.plan) : planLabels[client.plan];

  const handleSendWhatsApp = () => {
    const message = generateExpirationMessage({
      client,
      planName,
      daysRemaining,
    });
    openWhatsApp(client.whatsapp, message);
  };

  const handleSendEmail = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('send-expiration-reminder', {
        body: {
          clientId: client.id,
          clientName: client.name,
          clientEmail: client.email,
          planName,
          daysRemaining,
          expiresAt: format(client.expiresAt, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
        },
      });

      if (error) throw error;

      toast.success(`Email de lembrete enviado para ${client.email}`);
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error('Erro ao enviar email. Tente novamente.');
    }
  };

  return (
    <Card className={cn(
      "group hover:shadow-lg transition-all duration-300 border-border/50 bg-card",
      status === 'expired' && "border-destructive/30 bg-destructive/5",
      status === 'expiring' && "border-plan-annual/30 bg-plan-annual/5"
    )}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-lg truncate mb-1">
              {client.name}
            </h3>
            <p className="text-sm text-muted-foreground mb-2">
              {formatCurrency(planPrices[client.plan])}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <PlanBadge plan={client.plan} />
              <ExpirationBadge expiresAt={client.expiresAt} />
            </div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {hasHistory && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-primary"
                onClick={() => onViewHistory(client)}
                title="Ver histórico"
              >
                <History className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary"
              onClick={() => onEdit(client)}
              title="Editar"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(client.id)}
              title="Excluir"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <Phone className="h-4 w-4" />
            <span>{client.whatsapp}</span>
          </a>
          <a
            href={`mailto:${client.email}`}
            className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <Mail className="h-4 w-4" />
            <span className="truncate">{client.email}</span>
          </a>
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="text-xs">
                Vence em {format(client.expiresAt, "dd 'de' MMM, yyyy", { locale: ptBR })}
              </span>
            </div>
            {hasHistory && (
              <button
                onClick={() => onViewHistory(client)}
                className="text-xs text-primary hover:underline"
              >
                {client.renewalHistory.length} renovação{client.renewalHistory.length > 1 ? 'ões' : ''}
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 mt-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5"
              onClick={() => onChangePlan(client)}
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              Trocar Plano
            </Button>
            <Button
              variant={needsAttention ? "default" : "outline"}
              size="sm"
              className={cn(
                "flex-1 gap-1.5",
                needsAttention && status === 'expired' && "bg-destructive hover:bg-destructive/90",
                needsAttention && status === 'expiring' && "bg-plan-annual hover:bg-plan-annual/90"
              )}
              onClick={() => onRenew(client.id)}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Renovar
            </Button>
          </div>
          {needsAttention && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5 text-green-600 border-green-600/30 hover:bg-green-600/10"
                onClick={handleSendWhatsApp}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5 text-blue-600 border-blue-600/30 hover:bg-blue-600/10"
                onClick={handleSendEmail}
              >
                <Send className="h-3.5 w-3.5" />
                Email
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
