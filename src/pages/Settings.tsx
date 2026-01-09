import { useState, useEffect } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePlanSettings, PlanSetting } from '@/hooks/usePlanSettings';
import { PlanType } from '@/types/client';
import { useNavigate } from 'react-router-dom';

const planKeys: PlanType[] = ['monthly', 'quarterly', 'semiannual', 'annual'];

export default function Settings() {
  const navigate = useNavigate();
  const { settings, isLoading, saveSettings } = usePlanSettings();
  const [formSettings, setFormSettings] = useState<PlanSetting[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings.length > 0) {
      setFormSettings(settings);
    }
  }, [settings]);

  const handleChange = (planKey: PlanType, field: 'planName' | 'planPrice', value: string) => {
    setFormSettings(prev => prev.map(setting => {
      if (setting.planKey === planKey) {
        return {
          ...setting,
          [field]: field === 'planPrice' ? parseFloat(value) || 0 : value,
        };
      }
      return setting;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await saveSettings(formSettings);
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
            <p className="text-muted-foreground">Personalize os planos e preços</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Planos de Assinatura</CardTitle>
              <CardDescription>
                Configure os nomes e valores de cada plano. Essas configurações serão aplicadas a novos clientes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {planKeys.map(planKey => {
                const setting = formSettings.find(s => s.planKey === planKey);
                if (!setting) return null;

                return (
                  <div key={planKey} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg bg-muted/50">
                    <div className="space-y-2">
                      <Label htmlFor={`name-${planKey}`}>Nome do Plano</Label>
                      <Input
                        id={`name-${planKey}`}
                        value={setting.planName}
                        onChange={(e) => handleChange(planKey, 'planName', e.target.value)}
                        placeholder="Nome do plano"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`price-${planKey}`}>Preço (R$)</Label>
                      <Input
                        id={`price-${planKey}`}
                        type="number"
                        step="0.01"
                        min="0"
                        value={setting.planPrice}
                        onChange={(e) => handleChange(planKey, 'planPrice', e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <div className="flex justify-end mt-6">
            <Button type="submit" disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
