import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface MessageStatusProps {
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  isOutgoing: boolean;
  className?: string;
}

export function MessageStatus({ status, isOutgoing, className }: MessageStatusProps) {
  if (!isOutgoing) return null;

  const getStatusInfo = () => {
    switch (status) {
      case 'sending':
        return {
          icon: Clock,
          label: 'Enviando...',
          color: 'text-muted-foreground animate-pulse'
        };
      case 'sent':
        return {
          icon: Check,
          label: 'Enviada',
          color: 'text-muted-foreground'
        };
      case 'delivered':
        return {
          icon: CheckCheck,
          label: 'Entregue',
          color: 'text-muted-foreground'
        };
      case 'read':
        return {
          icon: CheckCheck,
          label: 'Lida',
          color: 'text-blue-400'
        };
      case 'failed':
        return {
          icon: AlertCircle,
          label: 'Falha ao enviar',
          color: 'text-destructive'
        };
      default:
        return {
          icon: Check,
          label: 'Enviada',
          color: 'text-muted-foreground'
        };
    }
  };

  const { icon: Icon, label, color } = getStatusInfo();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn('inline-flex', className)}>
          <Icon className={cn('h-3 w-3', color)} />
        </span>
      </TooltipTrigger>
      <TooltipContent side="left">
        <p className="text-xs">{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}
