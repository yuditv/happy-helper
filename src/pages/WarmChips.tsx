import { WhatsAppWarming } from "@/components/WhatsAppWarming";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame } from "lucide-react";

export default function WarmChips() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Flame className="h-8 w-8 text-orange-500" />
          Aquecer Chips
        </h1>
        <p className="text-muted-foreground">
          Simule conversas naturais entre instâncias para reduzir risco de banimento
        </p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Sistema de Aquecimento</CardTitle>
          <CardDescription>
            Configure sessões de aquecimento para manter suas instâncias saudáveis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WhatsAppWarming />
        </CardContent>
      </Card>
    </div>
  );
}
