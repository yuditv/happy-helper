import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SendingWindowProps {
  enabled: boolean;
  startTime: string;
  endTime: string;
  allowedDays: number[];
  onEnabledChange: (enabled: boolean) => void;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
  onAllowedDaysChange: (days: number[]) => void;
}

const DAYS = [
  { value: 7, label: 'D', full: 'Domingo' },
  { value: 1, label: 'S', full: 'Segunda' },
  { value: 2, label: 'T', full: 'Terça' },
  { value: 3, label: 'Q', full: 'Quarta' },
  { value: 4, label: 'Q', full: 'Quinta' },
  { value: 5, label: 'S', full: 'Sexta' },
  { value: 6, label: 'S', full: 'Sábado' },
];

export function SendingWindow({
  enabled,
  startTime,
  endTime,
  allowedDays,
  onEnabledChange,
  onStartTimeChange,
  onEndTimeChange,
  onAllowedDaysChange
}: SendingWindowProps) {
  const toggleDay = (day: number) => {
    if (allowedDays.includes(day)) {
      onAllowedDaysChange(allowedDays.filter(d => d !== day));
    } else {
      onAllowedDaysChange([...allowedDays, day].sort());
    }
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Janela de Envio
          </CardTitle>
          <Switch
            checked={enabled}
            onCheckedChange={onEnabledChange}
          />
        </div>
      </CardHeader>
      <CardContent className={cn("space-y-4", !enabled && "opacity-50 pointer-events-none")}>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm">Horário de Início</Label>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => onStartTimeChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Horário de Fim</Label>
            <Input
              type="time"
              value={endTime}
              onChange={(e) => onEndTimeChange(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm">Dias Permitidos</Label>
          <div className="flex gap-2">
            {DAYS.map((day) => (
              <button
                key={day.value}
                onClick={() => toggleDay(day.value)}
                title={day.full}
                className={cn(
                  "w-10 h-10 rounded-lg font-medium text-sm transition-all",
                  "border-2",
                  allowedDays.includes(day.value)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 text-muted-foreground border-border/50 hover:border-border"
                )}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>

        {enabled && (
          <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            📅 Mensagens serão enviadas apenas entre <strong>{startTime}</strong> e <strong>{endTime}</strong>
            {allowedDays.length < 7 && (
              <> nos dias: <strong>{allowedDays.map(d => DAYS.find(day => day.value === d)?.full).join(', ')}</strong></>
            )}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
