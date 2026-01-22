import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Timer, Pause, Brain, Phone, Archive, Sparkles } from 'lucide-react';

interface TimingConfigProps {
  minDelay: number;
  maxDelay: number;
  pauseAfterMessages: number;
  pauseDurationMinutes: number;
  stopAfterMessages: number;
  smartDelay: boolean;
  attentionCall: boolean;
  autoArchive: boolean;
  aiPersonalization: boolean;
  onConfigChange: (config: Partial<TimingConfigProps>) => void;
}

export function TimingConfig({
  minDelay,
  maxDelay,
  pauseAfterMessages,
  pauseDurationMinutes,
  stopAfterMessages,
  smartDelay,
  attentionCall,
  autoArchive,
  aiPersonalization,
  onConfigChange
}: TimingConfigProps) {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Timer className="w-5 h-5 text-primary" />
          Configurações de Timing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Delay Settings */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Delay entre mensagens</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Mínimo (segundos)</Label>
              <div className="flex items-center gap-2">
                <Slider
                  value={[minDelay]}
                  onValueChange={([v]) => onConfigChange({ minDelay: v })}
                  min={1}
                  max={30}
                  step={1}
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={minDelay}
                  onChange={(e) => onConfigChange({ minDelay: Number(e.target.value) })}
                  className="w-16 text-center"
                  min={1}
                  max={30}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Máximo (segundos)</Label>
              <div className="flex items-center gap-2">
                <Slider
                  value={[maxDelay]}
                  onValueChange={([v]) => onConfigChange({ maxDelay: v })}
                  min={1}
                  max={60}
                  step={1}
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={maxDelay}
                  onChange={(e) => onConfigChange({ maxDelay: Number(e.target.value) })}
                  className="w-16 text-center"
                  min={1}
                  max={60}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Pause Settings */}
        <div className="space-y-4 pt-4 border-t border-border/50">
          <div className="flex items-center gap-2">
            <Pause className="w-4 h-4 text-primary" />
            <Label className="text-sm font-medium">Pausas Automáticas</Label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Pausar a cada (mensagens)</Label>
              <Input
                type="number"
                value={pauseAfterMessages}
                onChange={(e) => onConfigChange({ pauseAfterMessages: Number(e.target.value) })}
                min={0}
                placeholder="Ex: 100"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Duração da pausa (minutos)</Label>
              <Input
                type="number"
                value={pauseDurationMinutes}
                onChange={(e) => onConfigChange({ pauseDurationMinutes: Number(e.target.value) })}
                min={1}
                placeholder="Ex: 30"
              />
            </div>
          </div>
          {pauseAfterMessages > 0 && (
            <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              O sistema pausará automaticamente a cada <strong>{pauseAfterMessages}</strong> mensagens 
              por <strong>{pauseDurationMinutes}</strong> minutos
            </p>
          )}
        </div>

        {/* Stop Settings */}
        <div className="space-y-3 pt-4 border-t border-border/50">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Parar completamente após (mensagens) - 0 = desativado
            </Label>
            <Input
              type="number"
              value={stopAfterMessages}
              onChange={(e) => onConfigChange({ stopAfterMessages: Number(e.target.value) })}
              min={0}
              placeholder="Ex: 500"
            />
          </div>
          {stopAfterMessages > 0 && (
            <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">
              ⚠️ O disparo irá parar após {stopAfterMessages} mensagens e aguardar ação manual
            </Badge>
          )}
        </div>

        {/* Advanced Toggles */}
        <div className="space-y-4 pt-4 border-t border-border/50">
          <Label className="text-sm font-medium">Opções Avançadas</Label>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center gap-3">
                <Brain className="w-5 h-5 text-primary" />
                <div>
                  <Label className="text-sm cursor-pointer">Delay Inteligente</Label>
                  <p className="text-xs text-muted-foreground">
                    Varia o delay de forma não-linear
                  </p>
                </div>
              </div>
              <Switch
                checked={smartDelay}
                onCheckedChange={(v) => onConfigChange({ smartDelay: v })}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 opacity-50">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <div>
                  <Label className="text-sm cursor-pointer">Ligação de Atenção</Label>
                  <p className="text-xs text-muted-foreground">
                    Em breve
                  </p>
                </div>
              </div>
              <Switch
                checked={attentionCall}
                onCheckedChange={(v) => onConfigChange({ attentionCall: v })}
                disabled
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 opacity-50">
              <div className="flex items-center gap-3">
                <Archive className="w-5 h-5 text-muted-foreground" />
                <div>
                  <Label className="text-sm cursor-pointer">Arquivar Chats</Label>
                  <p className="text-xs text-muted-foreground">
                    Em breve
                  </p>
                </div>
              </div>
              <Switch
                checked={autoArchive}
                onCheckedChange={(v) => onConfigChange({ autoArchive: v })}
                disabled
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 opacity-50">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-muted-foreground" />
                <div>
                  <Label className="text-sm cursor-pointer">IA Personalização</Label>
                  <p className="text-xs text-muted-foreground">
                    Em breve
                  </p>
                </div>
              </div>
              <Switch
                checked={aiPersonalization}
                onCheckedChange={(v) => onConfigChange({ aiPersonalization: v })}
                disabled
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
