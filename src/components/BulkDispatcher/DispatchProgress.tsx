import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CircularProgress } from '@/components/ui/circular-progress';
import { 
  Play, Pause, Square, BarChart3, 
  CheckCircle2, XCircle, Clock, User, Archive 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DispatchProgressProps {
  progress: {
    total: number;
    sent: number;
    failed: number;
    pending: number;
    archived: number;
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
  showArchiveCount?: boolean;
}

export function DispatchProgress({
  progress,
  onStart,
  onPause,
  onResume,
  onCancel,
  canStart,
  showArchiveCount = true
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
    <Card className="glass-card">
      <CardHeader className="pb-3 border-b border-border/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-3">
            <div className="stats-icon-container primary">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            Progresso do Disparo
          </CardTitle>
          {progress.isRunning && (
            <Badge 
              variant="secondary" 
              className={cn(
                "font-medium",
                progress.isPaused 
                  ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" 
                  : "bg-green-500/20 text-green-500 border border-green-500/30"
              )}
            >
              <span className={cn("w-2 h-2 rounded-full mr-2", progress.isPaused ? "bg-yellow-400" : "bg-green-500 animate-pulse")} />
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

        {/* Circular Progress - Shown during dispatch */}
        {(progress.isRunning || progress.sent > 0 || progress.failed > 0) && (
          <div className="flex flex-col items-center gap-4">
            <CircularProgress 
              value={percentage} 
              size={140}
              strokeWidth={10}
              animated={progress.isRunning && !progress.isPaused}
            />
            
            {/* Current Contact */}
            {progress.currentContact && progress.isRunning && !progress.isPaused && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
                <User className="w-4 h-4" />
                <span>Enviando para: {progress.currentContact}</span>
              </div>
            )}
          </div>
        )}

        {/* Linear Progress Bar - Compact alternative below circular */}
        {(progress.isRunning || progress.sent > 0 || progress.failed > 0) && (
          <div className="space-y-1">
            <Progress value={percentage} className="h-2" />
          </div>
        )}

        {/* Stats */}
        {(progress.total > 0) && (
          <div className={cn("grid gap-3", showArchiveCount ? "grid-cols-5" : "grid-cols-4")}>
            <div className="text-center p-4 rounded-xl bg-muted/30 border border-border/30">
              <div className="text-2xl font-bold">{progress.total}</div>
              <div className="text-xs text-muted-foreground mt-1">Total</div>
            </div>
            <div className="text-center p-4 rounded-xl bg-green-500/10 border border-green-500/20">
              <div className="text-2xl font-bold text-green-500">{progress.sent}</div>
              <div className="text-xs text-green-500/70 mt-1">Enviados</div>
            </div>
            <div className="text-center p-4 rounded-xl bg-destructive/10 border border-destructive/20">
              <div className="text-2xl font-bold text-destructive">{progress.failed}</div>
              <div className="text-xs text-destructive/70 mt-1">Falharam</div>
            </div>
            {showArchiveCount && (
              <div className="text-center p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center justify-center gap-1.5">
                  <Archive className="w-4 h-4 text-blue-500" />
                  <span className="text-2xl font-bold text-blue-500">{progress.archived}</span>
                </div>
                <div className="text-xs text-blue-500/70 mt-1">Arquivados</div>
              </div>
            )}
            <div className="text-center p-4 rounded-xl bg-muted/30 border border-border/30">
              <div className="text-2xl font-bold text-muted-foreground">{progress.pending}</div>
              <div className="text-xs text-muted-foreground mt-1">Pendentes</div>
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
          <div className="space-y-3">
            <div className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Atividade Recente
            </div>
            <ScrollArea className="h-[160px] rounded-xl border border-border/30 bg-background/30">
              <div className="p-3 space-y-1.5">
                {progress.logs.map((log, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 text-xs py-1.5 px-2.5 rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    {getLogIcon(log.type)}
                    <span className="text-muted-foreground shrink-0 font-mono">
                      {log.time.toLocaleTimeString('pt-BR')}
                    </span>
                    <span className={cn(
                      "flex-1",
                      log.type === 'error' && 'text-destructive',
                      log.type === 'success' && 'text-green-500',
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
