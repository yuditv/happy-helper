import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Smartphone, Settings } from 'lucide-react';

export function WhatsAppConnection() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 rounded-xl bg-primary/10">
          <Smartphone className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Conexão WhatsApp</h1>
          <p className="text-muted-foreground">Configure sua integração com WhatsApp</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuração Pendente
          </CardTitle>
          <CardDescription>
            A integração com WhatsApp está sendo reconstruída do zero.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Smartphone className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium mb-2">Em breve</p>
            <p className="text-sm">
              Uma nova integração com WhatsApp será implementada aqui.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
