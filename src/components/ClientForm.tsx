import { useState, useEffect } from 'react';
import { Client, PlanType, ServiceType, planLabels, planDurations, serviceLabels } from '@/types/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { User, Phone, Mail, CreditCard, CalendarDays, DollarSign, Tv } from 'lucide-react';
import { addMonths, format } from 'date-fns';

interface ClientFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<Client, 'id' | 'renewalHistory'>) => void;
  initialData?: Client | null;
}

export function ClientForm({ open, onOpenChange, onSubmit, initialData }: ClientFormProps) {
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [service, setService] = useState<ServiceType>('IPTV');
  const [plan, setPlan] = useState<PlanType>('monthly');
  const [price, setPrice] = useState('');
  const [createdAt, setCreatedAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setWhatsapp(initialData.whatsapp);
      setEmail(initialData.email);
      setService(initialData.service);
      setPlan(initialData.plan);
      setPrice(initialData.price?.toString() || '');
      setCreatedAt(format(initialData.createdAt, 'yyyy-MM-dd'));
      setExpiresAt(format(initialData.expiresAt, 'yyyy-MM-dd'));
    } else {
      setName('');
      setWhatsapp('');
      setEmail('');
      setService('IPTV');
      setPlan('monthly');
      setPrice('');
      setCreatedAt(format(new Date(), 'yyyy-MM-dd'));
      // Set default expiration based on plan
      setExpiresAt(format(addMonths(new Date(), planDurations['monthly']), 'yyyy-MM-dd'));
    }
  }, [initialData, open]);

  // Update expiration date when plan changes (only for new clients)
  useEffect(() => {
    if (!initialData) {
      setExpiresAt(format(addMonths(new Date(), planDurations[plan]), 'yyyy-MM-dd'));
    }
  }, [plan, initialData]);

  const formatWhatsapp = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWhatsapp(formatWhatsapp(e.target.value));
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
    setPrice(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ 
      name, 
      whatsapp, 
      email,
      service,
      plan,
      price: price ? parseFloat(price) : null,
      createdAt: new Date(createdAt + 'T00:00:00'),
      expiresAt: new Date(expiresAt + 'T23:59:59')
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {initialData ? 'Editar Cliente' : 'Novo Cliente'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Nome completo
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Digite o nome"
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp" className="text-sm font-medium">
              WhatsApp
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="whatsapp"
                value={whatsapp}
                onChange={handleWhatsappChange}
                placeholder="(00) 00000-0000"
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              E-mail
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="service" className="text-sm font-medium">
              Serviço
            </Label>
            <div className="relative">
              <Tv className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
              <Select value={service} onValueChange={(v) => setService(v as ServiceType)}>
                <SelectTrigger className="pl-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(serviceLabels) as [ServiceType, string][]).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="plan" className="text-sm font-medium">
                Plano
              </Label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <Select value={plan} onValueChange={(v) => setPlan(v as PlanType)}>
                  <SelectTrigger className="pl-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(planLabels) as [PlanType, string][]).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price" className="text-sm font-medium">
                Valor (R$)
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="price"
                  type="text"
                  inputMode="decimal"
                  value={price}
                  onChange={handlePriceChange}
                  placeholder="0.00"
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="createdAt" className="text-sm font-medium">
                Data de Cadastro
              </Label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="createdAt"
                  type="date"
                  value={createdAt}
                  onChange={(e) => setCreatedAt(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiresAt" className="text-sm font-medium">
                Data de Vencimento
              </Label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="expiresAt"
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              {initialData ? 'Salvar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
