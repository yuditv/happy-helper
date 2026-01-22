import { WhatsAppNumberFilter } from "@/components/WhatsAppNumberFilter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search } from "lucide-react";

export default function FilterNumbers() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Search className="h-8 w-8 text-primary" />
          Filtrar Números Ativos
        </h1>
        <p className="text-muted-foreground">
          Valide listas de contatos e identifique números ativos no WhatsApp
        </p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Validação de Números</CardTitle>
          <CardDescription>
            Importe sua lista de contatos e verifique quais números estão ativos no WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WhatsAppNumberFilter />
        </CardContent>
      </Card>
    </div>
  );
}
