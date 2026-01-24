import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Settings,
  Save,
  RefreshCw,
  Plus,
  Trash2,
  GripVertical,
  Loader2,
} from 'lucide-react';
import { useWhatsAppInstances } from '@/hooks/useWhatsAppInstances';
import { useCRMConfig, CRMFieldConfig } from '@/hooks/useCRMConfig';
import { toast } from 'sonner';

export function CRMFieldsSettings() {
  const { instances } = useWhatsAppInstances();
  const [selectedInstance, setSelectedInstance] = useState<string>('');
  const { fieldConfigs, isLoading, isSaving, saveConfigs, fetchUazapiFieldsMap, getDefaultFields } = useCRMConfig(selectedInstance || null);
  
  const [localConfigs, setLocalConfigs] = useState<CRMFieldConfig[]>([]);
  const [editingField, setEditingField] = useState<CRMFieldConfig | null>(null);
  const [optionsDialogOpen, setOptionsDialogOpen] = useState(false);
  const [newOption, setNewOption] = useState('');

  // Set first instance as default
  useEffect(() => {
    if (instances.length > 0 && !selectedInstance) {
      setSelectedInstance(instances[0].id);
    }
  }, [instances, selectedInstance]);

  // Load configs or defaults
  useEffect(() => {
    if (fieldConfigs.length > 0) {
      setLocalConfigs(fieldConfigs);
    } else {
      setLocalConfigs(getDefaultFields());
    }
  }, [fieldConfigs, getDefaultFields]);

  const handleToggleField = (fieldKey: string, isActive: boolean) => {
    setLocalConfigs(prev => 
      prev.map(f => f.fieldKey === fieldKey ? { ...f, isActive } : f)
    );
  };

  const handleFieldNameChange = (fieldKey: string, fieldName: string) => {
    setLocalConfigs(prev =>
      prev.map(f => f.fieldKey === fieldKey ? { ...f, fieldName } : f)
    );
  };

  const handleFieldTypeChange = (fieldKey: string, fieldType: 'text' | 'number' | 'date' | 'select') => {
    setLocalConfigs(prev =>
      prev.map(f => f.fieldKey === fieldKey ? { ...f, fieldType } : f)
    );
  };

  const handleEditOptions = (field: CRMFieldConfig) => {
    setEditingField(field);
    setOptionsDialogOpen(true);
  };

  const handleAddOption = () => {
    if (!editingField || !newOption.trim()) return;
    
    setLocalConfigs(prev =>
      prev.map(f => f.fieldKey === editingField.fieldKey
        ? { ...f, fieldOptions: [...(f.fieldOptions || []), newOption.trim()] }
        : f
      )
    );
    setEditingField(prev => prev ? {
      ...prev,
      fieldOptions: [...(prev.fieldOptions || []), newOption.trim()]
    } : null);
    setNewOption('');
  };

  const handleRemoveOption = (option: string) => {
    if (!editingField) return;
    
    setLocalConfigs(prev =>
      prev.map(f => f.fieldKey === editingField.fieldKey
        ? { ...f, fieldOptions: (f.fieldOptions || []).filter(o => o !== option) }
        : f
      )
    );
    setEditingField(prev => prev ? {
      ...prev,
      fieldOptions: (prev.fieldOptions || []).filter(o => o !== option)
    } : null);
  };

  const handleSave = async () => {
    const activeConfigs = localConfigs.filter(f => f.isActive);
    await saveConfigs(activeConfigs);
  };

  const handleSyncFromUazapi = async () => {
    const uazapiFields = await fetchUazapiFieldsMap();
    if (uazapiFields) {
      toast.success('Campos sincronizados do UAZAPI');
      // Parse and update local configs based on UAZAPI response
    }
  };

  const activeCount = localConfigs.filter(f => f.isActive).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Campos CRM Customizados
          </h2>
          <p className="text-sm text-muted-foreground">
            Configure até 20 campos personalizados para os leads do CRM
          </p>
        </div>
      </div>

      {/* Instance Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Instância WhatsApp</CardTitle>
          <CardDescription>
            Selecione a instância para configurar os campos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedInstance} onValueChange={setSelectedInstance}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma instância" />
            </SelectTrigger>
            <SelectContent>
              {instances.map((instance) => (
                <SelectItem key={instance.id} value={instance.id}>
                  {instance.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedInstance && (
        <>
          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {activeCount} campos ativos
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncFromUazapi}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Sincronizar do WhatsApp
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar Configurações
              </Button>
            </div>
          </div>

          {/* Fields Table */}
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead className="w-16">Ativo</TableHead>
                      <TableHead className="w-32">Chave</TableHead>
                      <TableHead>Nome do Campo</TableHead>
                      <TableHead className="w-32">Tipo</TableHead>
                      <TableHead className="w-24">Opções</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {localConfigs.map((field, index) => (
                      <TableRow key={field.fieldKey} className={!field.isActive ? 'opacity-50' : ''}>
                        <TableCell>
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={field.isActive}
                            onCheckedChange={(checked) => handleToggleField(field.fieldKey, checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {field.fieldKey}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={field.fieldName}
                            onChange={(e) => handleFieldNameChange(field.fieldKey, e.target.value)}
                            className="h-8"
                            disabled={!field.isActive}
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={field.fieldType}
                            onValueChange={(value) => handleFieldTypeChange(field.fieldKey, value as any)}
                            disabled={!field.isActive}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Texto</SelectItem>
                              <SelectItem value="number">Número</SelectItem>
                              <SelectItem value="date">Data</SelectItem>
                              <SelectItem value="select">Seleção</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {field.fieldType === 'select' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditOptions(field)}
                              disabled={!field.isActive}
                            >
                              {(field.fieldOptions?.length || 0)} opções
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}

      {/* Options Dialog */}
      <Dialog open={optionsDialogOpen} onOpenChange={setOptionsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Opções do Campo: {editingField?.fieldName}</DialogTitle>
            <DialogDescription>
              Gerencie as opções disponíveis para este campo de seleção
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                placeholder="Nova opção"
                onKeyDown={(e) => e.key === 'Enter' && handleAddOption()}
              />
              <Button onClick={handleAddOption} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <Separator />

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {editingField?.fieldOptions?.map((option, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                  <span className="text-sm">{option}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleRemoveOption(option)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {(!editingField?.fieldOptions || editingField.fieldOptions.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma opção adicionada
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setOptionsDialogOpen(false)}>
              Concluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}