import { Client, planLabels } from '@/types/client';
import { PlanBadge } from './PlanBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, Mail, Pencil, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClientCardProps {
  client: Client;
  onEdit: (client: Client) => void;
  onDelete: (id: string) => void;
}

export function ClientCard({ client, onEdit, onDelete }: ClientCardProps) {
  const whatsappLink = `https://wa.me/${client.whatsapp.replace(/\D/g, '')}`;

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 bg-card">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-lg truncate mb-1">
              {client.name}
            </h3>
            <PlanBadge plan={client.plan} />
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary"
              onClick={() => onEdit(client)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(client.id)}
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
          <div className="flex items-center gap-2 text-muted-foreground pt-2 border-t border-border/50">
            <Calendar className="h-4 w-4" />
            <span className="text-xs">
              Cadastrado em {format(client.createdAt, "dd 'de' MMM, yyyy", { locale: ptBR })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
