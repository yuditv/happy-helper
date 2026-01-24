import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  User,
  Mail,
  CreditCard,
  StickyNote,
  RefreshCw,
  Save,
  Ticket,
  Hash,
  Loader2,
} from 'lucide-react';
import { useCRMLead, CRM_STATUSES, CRMLeadUpdate } from '@/hooks/useCRMLead';
import { useCRMConfig } from '@/hooks/useCRMConfig';
import { cn } from '@/lib/utils';

interface CRMLeadPanelProps {
  phone: string | null;
  instanceId: string | null;
  contactName?: string;
}

export function CRMLeadPanel({ phone, instanceId, contactName }: CRMLeadPanelProps) {
  const { lead, isLoading, isSaving, updateLead, syncWithUazapi } = useCRMLead(phone, instanceId);
  const { fieldConfigs } = useCRMConfig(instanceId);
  
  const [formData, setFormData] = useState<CRMLeadUpdate>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Update form when lead data loads
  useEffect(() => {
    if (lead) {
      setFormData({
        name: lead.name || '',
        fullName: lead.fullName || '',
        email: lead.email || '',
        personalId: lead.personalId || '',
        status: lead.status || 'lead',
        notes: lead.notes || '',
        kanbanOrder: lead.kanbanOrder || 1000,
        isTicketOpen: lead.isTicketOpen ?? true,
        customFields: lead.customFields || {},
      });
      setHasChanges(false);
    } else if (contactName) {
      setFormData({
        name: contactName,
        status: 'lead',
        isTicketOpen: true,
        customFields: {},
      });
    }
  }, [lead, contactName]);

  const handleFieldChange = (field: keyof CRMLeadUpdate, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleCustomFieldChange = (fieldKey: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      customFields: {
        ...prev.customFields,
        [fieldKey]: value,
      },
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    await updateLead(formData);
    setHasChanges(false);
  };

  const getStatusConfig = (status: string) => {
    return CRM_STATUSES.find(s => s.value === status) || CRM_STATUSES[0];
  };

  if (isLoading && !lead) {
    return (
      <Card className="glass-card h-full">
        <CardContent className="flex items-center justify-center h-40">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const statusConfig = getStatusConfig(formData.status || 'lead');
  const activeCustomFields = fieldConfigs.filter(f => f.isActive);

  return (
    <Card className="glass-card h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            CRM - Dados do Lead
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={syncWithUazapi}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            </Button>
            {hasChanges && (
              <Button
                variant="default"
                size="sm"
                className="h-7 gap-1"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Salvar
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <ScrollArea className="h-[calc(100vh-300px)]">
          <div className="space-y-4 pr-4">
            {/* Status Badge */}
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select
                value={formData.status || 'lead'}
                onValueChange={(value) => handleFieldChange('status', value)}
              >
                <SelectTrigger className="w-40 h-8">
                  <SelectValue>
                    <Badge className={cn("text-xs", statusConfig.color, "text-white")}>
                      {statusConfig.label}
                    </Badge>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {CRM_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      <Badge className={cn("text-xs", status.color, "text-white")}>
                        {status.label}
                      </Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Ticket Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-muted-foreground" />
                <Label className="text-xs">Ticket Aberto</Label>
              </div>
              <Switch
                checked={formData.isTicketOpen ?? true}
                onCheckedChange={(checked) => handleFieldChange('isTicketOpen', checked)}
              />
            </div>

            <Separator />

            {/* Basic Info */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <User className="h-3 w-3" />
                  Nome
                </Label>
                <Input
                  value={formData.name || ''}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  placeholder="Nome do lead"
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <User className="h-3 w-3" />
                  Nome Completo
                </Label>
                <Input
                  value={formData.fullName || ''}
                  onChange={(e) => handleFieldChange('fullName', e.target.value)}
                  placeholder="Nome completo"
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <Mail className="h-3 w-3" />
                  E-mail
                </Label>
                <Input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  placeholder="email@exemplo.com"
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <CreditCard className="h-3 w-3" />
                  CPF/CNPJ
                </Label>
                <Input
                  value={formData.personalId || ''}
                  onChange={(e) => handleFieldChange('personalId', e.target.value)}
                  placeholder="000.000.000-00"
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <Hash className="h-3 w-3" />
                  Posição Kanban
                </Label>
                <Input
                  type="number"
                  value={formData.kanbanOrder || 1000}
                  onChange={(e) => handleFieldChange('kanbanOrder', parseInt(e.target.value))}
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <StickyNote className="h-3 w-3" />
                  Notas
                </Label>
                <Textarea
                  value={formData.notes || ''}
                  onChange={(e) => handleFieldChange('notes', e.target.value)}
                  placeholder="Anotações sobre o lead..."
                  className="text-sm min-h-[80px] resize-none"
                />
              </div>
            </div>

            {/* Custom Fields */}
            {activeCustomFields.length > 0 && (
              <>
                <Separator />
                <Accordion type="single" collapsible defaultValue="custom-fields">
                  <AccordionItem value="custom-fields" className="border-none">
                    <AccordionTrigger className="text-sm py-2 hover:no-underline">
                      Campos Customizados ({activeCustomFields.length})
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pt-2">
                        {activeCustomFields.map((field) => (
                          <div key={field.fieldKey} className="space-y-1.5">
                            <Label className="text-xs">{field.fieldName}</Label>
                            {field.fieldType === 'select' && field.fieldOptions?.length ? (
                              <Select
                                value={formData.customFields?.[field.fieldKey] || ''}
                                onValueChange={(value) => handleCustomFieldChange(field.fieldKey, value)}
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {field.fieldOptions.map((option) => (
                                    <SelectItem key={option} value={option}>
                                      {option}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                type={field.fieldType === 'number' ? 'number' : field.fieldType === 'date' ? 'date' : 'text'}
                                value={formData.customFields?.[field.fieldKey] || ''}
                                onChange={(e) => handleCustomFieldChange(field.fieldKey, e.target.value)}
                                className="h-8 text-sm"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </>
            )}

            {/* Sync Info */}
            {lead?.syncedAt && (
              <>
                <Separator />
                <p className="text-xs text-muted-foreground text-center">
                  Última sincronização: {new Date(lead.syncedAt).toLocaleString('pt-BR')}
                </p>
              </>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}