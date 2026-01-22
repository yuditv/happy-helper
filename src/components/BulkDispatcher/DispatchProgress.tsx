import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Play, Pause, Square, BarChart3, 
  CheckCircle2, XCircle, Clock, User 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DispatchProgressProps {
  progress: {
    total: number;
    sent: number;
    failed: number;
    pending: number;
    currentContact?: string;
    isPaused: boolean;
    isRunning: boolean;
    estimatedTimeRemaining?: number;
    logs: Array<{
      time: Date;
      type: 'success' | 'error' | 'info' | 'warning';
      message: string;
    }>;
  };
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  canStart: boolean;
}

export function DispatchProgress({
  progress,
  onStart,
  onPause,
  onResume,
  onCancel,
  canStart
}: DispatchProgressProps) {
  const percentage = progress.total > 0 
    ? Math.round(((progress.sent + progress.failed) / progress.total) * 100)
    : 0;

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return `${mins}m ${secs}s`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-3 h-3 text-emerald-500" />;
      case 'error':
        return <XCircle className="w-3 h-3 text-destructive" />;
      case 'warning':
        return <Clock className="w-3 h-3 text-yellow-500" />;
      default:
        return <BarChart3 className="w-3 h-3 text-primary" />;
    }
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Progresso do Disparo
          </CardTitle>
          {progress.isRunning && (
            <Badge 
              variant="secondary" 
              className={cn(
                progress.isPaused 
                  ? "bg-yellow-500/20 text-yellow-400" 
                  : "bg-emerald-500/20 text-emerald-400"
              )}
            >
              {progress.isPaused ? 'Pausado' : 'Em andamento'}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Action Button */}
        <div className="flex gap-2">
          {!progress.isRunning ? (
            <Button 
              onClick={onStart} 
              disabled={!canStart}
              className="flex-1 h-12 text-lg"
              size="lg"
            >
              <Play className="w-5 h-5 mr-2" />
              Iniciar Disparo
              {progress.total > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {progress.total} contatos
                </Badge>
              )}
            </Button>
          ) : (
            <>
              {progress.isPaused ? (
                <Button 
                  onClick={onResume} 
                  className="flex-1 h-12"
                  variant="default"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Retomar
                </Button>
              ) : (
                <Button 
                  onClick={onPause} 
                  className="flex-1 h-12"
                  variant="secondary"
                >
                  <Pause className="w-5 h-5 mr-2" />
                  Pausar
                </Button>
              )}
              <Button 
                onClick={onCancel} 
                variant="destructive"
                className="h-12"
              >
                <Square className="w-5 h-5 mr-2" />
                Cancelar
              </Button>
            </>
          )}
        </div>

        {/* Progress Bar */}
        {(progress.isRunning || progress.sent > 0 || progress.failed > 0) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">{percentage}%</span>
            </div>
            <Progress value={percentage} className="h-3" />
          </div>
        )}

        {/* Current Contact */}
        {progress.currentContact && progress.isRunning && !progress.isPaused && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
            <User className="w-4 h-4" />
            <span>Enviando para: {progress.currentContact}</span>
          </div>
        )}

        {/* Stats */}
        {(progress.total > 0) && (
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold">{progress.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-emerald-500/10">
              <div className="text-2xl font-bold text-emerald-500">{progress.sent}</div>
              <div className="text-xs text-emerald-500/70">Enviados</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-destructive/10">
              <div className="text-2xl font-bold text-destructive">{progress.failed}</div>
              <div className="text-xs text-destructive/70">Falharam</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-muted-foreground">{progress.pending}</div>
              <div className="text-xs text-muted-foreground">Pendentes</div>
            </div>
          </div>
        )}

        {/* Estimated Time */}
        {progress.isRunning && progress.estimatedTimeRemaining && progress.estimatedTimeRemaining > 0 && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>Tempo estimado: ~{formatTime(Math.round(progress.estimatedTimeRemaining))}</span>
          </div>
        )}

        {/* Activity Log */}
        {progress.logs.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Atividade Recente</div>
            <ScrollArea className="h-[150px] rounded-lg border border-border/50 bg-background/50">
              <div className="p-2 space-y-1">
                {progress.logs.map((log, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 text-xs py-1 px-2 rounded hover:bg-muted/50"
                  >
                    {getLogIcon(log.type)}
                    <span className="text-muted-foreground shrink-0">
                      {log.time.toLocaleTimeString('pt-BR')}
                    </span>
                    <span className={cn(
                      log.type === 'error' && 'text-destructive',
                      log.type === 'success' && 'text-emerald-500',
                      log.type === 'warning' && 'text-yellow-500'
                    )}>
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
