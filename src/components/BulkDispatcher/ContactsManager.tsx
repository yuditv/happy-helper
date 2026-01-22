import { useState, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Users, Upload, FileSpreadsheet, Trash2, 
  Check, X, Loader2, Download, AlertCircle,
  Database, Search, Plus
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface Contact {
  phone: string;
  name?: string;
  plan?: string;
  expires_at?: string;
  link?: string;
  email?: string;
  variables?: Record<string, string>;
  isValid?: boolean;
  whatsappName?: string;
}

export interface SavedContact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
}

interface ContactsManagerProps {
  contacts: Contact[];
  verifyNumbers: boolean;
  onContactsChange: (contacts: Contact[]) => void;
  onVerifyChange: (verify: boolean) => void;
  onVerifyContacts?: (contacts: Contact[]) => Promise<Contact[]>;
  isVerifying?: boolean;
  verificationProgress?: number;
  savedContacts?: SavedContact[];
  isLoadingSaved?: boolean;
  onRefreshSaved?: () => void;
}

export function ContactsManager({
  contacts,
  verifyNumbers,
  onContactsChange,
  onVerifyChange,
  onVerifyContacts,
  isVerifying = false,
  verificationProgress = 0,
  savedContacts = [],
  isLoadingSaved = false,
  onRefreshSaved
}: ContactsManagerProps) {
  const [manualInput, setManualInput] = useState('');
  const [activeTab, setActiveTab] = useState('manual');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State for saved contacts tab
  const [savedSearch, setSavedSearch] = useState('');
  const [selectedSavedIds, setSelectedSavedIds] = useState<Set<string>>(new Set());

  const parseManualInput = useCallback((text: string): Contact[] => {
    const lines = text.split('\n').filter(line => line.trim());
    return lines.map(line => {
      const parts = line.trim().split(/\s+/);
      const phone = parts[0]?.replace(/\D/g, '') || '';
      const name = parts.slice(1).join(' ') || undefined;
      
      return { phone, name };
    }).filter(c => c.phone.length >= 10);
  }, []);

  const handleManualInputChange = (text: string) => {
    setManualInput(text);
    const parsed = parseManualInput(text);
    onContactsChange(parsed);
  };

  const handleFileUpload = async (file: File) => {
    try {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const data = e.target?.result;
        
        if (file.name.endsWith('.txt')) {
          const text = data as string;
          const parsed = parseManualInput(text);
          onContactsChange(parsed);
          setManualInput(text);
          setActiveTab('manual');
        } else {
          // Excel/CSV
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          
          const parsed: Contact[] = [];
          
          // Try to detect headers
          const firstRow = jsonData[0] || [];
          const hasHeaders = firstRow.some((cell: any) => 
            typeof cell === 'string' && 
            /phone|telefone|whatsapp|nome|name/i.test(cell)
          );
          
          const startRow = hasHeaders ? 1 : 0;
          let phoneCol = 0;
          let nameCol = 1;
          
          if (hasHeaders) {
            phoneCol = firstRow.findIndex((h: string) => 
              /phone|telefone|whatsapp|celular/i.test(h)
            );
            nameCol = firstRow.findIndex((h: string) => 
              /nome|name|cliente/i.test(h)
            );
            if (phoneCol === -1) phoneCol = 0;
            if (nameCol === -1) nameCol = 1;
          }
          
          for (let i = startRow; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || !row[phoneCol]) continue;
            
            const phone = String(row[phoneCol]).replace(/\D/g, '');
            if (phone.length < 10) continue;
            
            parsed.push({
              phone,
              name: row[nameCol] ? String(row[nameCol]) : undefined
            });
          }
          
          onContactsChange(parsed);
          setManualInput(parsed.map(c => `${c.phone} ${c.name || ''}`).join('\n'));
        }
      };
      
      if (file.name.endsWith('.txt')) {
        reader.readAsText(file);
      } else {
        reader.readAsBinaryString(file);
      }
    } catch (error) {
      console.error('Error parsing file:', error);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const clearContacts = () => {
    onContactsChange([]);
    setManualInput('');
  };

  const exportContacts = (type: 'valid' | 'invalid' | 'all') => {
    let toExport = contacts;
    if (type === 'valid') {
      toExport = contacts.filter(c => c.isValid === true);
    } else if (type === 'invalid') {
      toExport = contacts.filter(c => c.isValid === false);
    }
    
    const text = toExport.map(c => `${c.phone} ${c.name || ''}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contacts_${type}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter saved contacts by search
  const filteredSavedContacts = useMemo(() => {
    if (!savedSearch.trim()) return savedContacts;
    const search = savedSearch.toLowerCase();
    return savedContacts.filter(c => 
      c.name.toLowerCase().includes(search) ||
      c.phone.includes(search)
    );
  }, [savedContacts, savedSearch]);

  // Toggle contact selection
  const toggleSavedContact = useCallback((id: string) => {
    setSelectedSavedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Select all visible contacts
  const selectAllSaved = useCallback(() => {
    if (selectedSavedIds.size === filteredSavedContacts.length) {
      setSelectedSavedIds(new Set());
    } else {
      setSelectedSavedIds(new Set(filteredSavedContacts.map(c => c.id)));
    }
  }, [filteredSavedContacts, selectedSavedIds.size]);

  // Add selected saved contacts to dispatch list
  const handleAddSavedContacts = useCallback(() => {
    const existingPhones = new Set(contacts.map(c => c.phone));
    const selectedContacts = savedContacts.filter(c => selectedSavedIds.has(c.id));
    
    const newContacts = selectedContacts.filter(c => !existingPhones.has(c.phone));
    const duplicates = selectedContacts.length - newContacts.length;
    
    if (newContacts.length === 0) {
      toast.info('Todos os contatos selecionados já estão na lista');
      return;
    }
    
    const formatted: Contact[] = newContacts.map(c => ({
      phone: c.phone,
      name: c.name,
      email: c.email
    }));
    
    onContactsChange([...contacts, ...formatted]);
    setSelectedSavedIds(new Set());
    
    if (duplicates > 0) {
      toast.success(`${newContacts.length} contato(s) adicionado(s). ${duplicates} duplicado(s) ignorado(s)`);
    } else {
      toast.success(`${newContacts.length} contato(s) adicionado(s) ao disparo`);
    }
  }, [contacts, savedContacts, selectedSavedIds, onContactsChange]);

  const validCount = contacts.filter(c => c.isValid === true).length;
  const invalidCount = contacts.filter(c => c.isValid === false).length;
  const uncheckedCount = contacts.filter(c => c.isValid === undefined).length;

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Contatos
            </CardTitle>
            <Badge variant="secondary">
              {contacts.length} contato(s)
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.txt"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-1" />
              Importar
            </Button>
            {contacts.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearContacts}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="manual">
              Manual
            </TabsTrigger>
            <TabsTrigger value="upload">
              Upload
            </TabsTrigger>
            <TabsTrigger value="saved" className="gap-1">
              <Database className="w-3 h-3" />
              Meus
            </TabsTrigger>
            <TabsTrigger value="preview">
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-3">
            <Textarea
              value={manualInput}
              onChange={(e) => handleManualInputChange(e.target.value)}
              placeholder="Cole sua lista de contatos aqui...
Formato: telefone nome
Exemplo:
5511999998888 João Silva
5521988887777 Maria Santos"
              className="min-h-[200px] font-mono text-sm"
            />
          </TabsContent>

          <TabsContent value="upload">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                isDragging 
                  ? "border-primary bg-primary/10" 
                  : "border-border/50 hover:border-border"
              )}
            >
              <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">
                Arraste um arquivo aqui
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Suporta: CSV, XLSX, XLS, TXT
              </p>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Selecionar Arquivo
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="saved" className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou telefone..."
                  value={savedSearch}
                  onChange={(e) => setSavedSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              {onRefreshSaved && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onRefreshSaved}
                  disabled={isLoadingSaved}
                >
                  <Loader2 className={cn("w-4 h-4", isLoadingSaved && "animate-spin")} />
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {savedContacts.length} contato(s) salvos
              </span>
              {filteredSavedContacts.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAllSaved}
                >
                  {selectedSavedIds.size === filteredSavedContacts.length
                    ? 'Desmarcar Todos'
                    : 'Selecionar Todos'}
                </Button>
              )}
            </div>

            {isLoadingSaved ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredSavedContacts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{savedSearch ? 'Nenhum contato encontrado' : 'Nenhum contato salvo'}</p>
                <p className="text-xs mt-1">
                  Adicione contatos na página "Contatos"
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[200px] rounded-lg border border-border/50">
                <div className="p-2 space-y-1">
                  {filteredSavedContacts.map((contact) => (
                    <div
                      key={contact.id}
                      onClick={() => toggleSavedContact(contact.id)}
                      className={cn(
                        "flex items-center gap-3 py-2 px-3 rounded-lg cursor-pointer transition-colors",
                        selectedSavedIds.has(contact.id)
                          ? "bg-primary/10 border border-primary/30"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <Checkbox
                        checked={selectedSavedIds.has(contact.id)}
                        onCheckedChange={() => toggleSavedContact(contact.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {contact.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {contact.phone}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {selectedSavedIds.size > 0 && (
              <Button
                className="w-full"
                onClick={handleAddSavedContacts}
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar {selectedSavedIds.size} Contato(s) ao Disparo
              </Button>
            )}
          </TabsContent>

          <TabsContent value="preview" className="space-y-3">
            {contacts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum contato importado</p>
              </div>
            ) : (
              <ScrollArea className="h-[200px] rounded-lg border border-border/50">
                <div className="p-3 space-y-1">
                  {contacts.slice(0, 50).map((contact, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-6">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-medium text-sm">
                            {contact.name || 'Sem nome'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {contact.phone}
                          </p>
                        </div>
                      </div>
                      {contact.isValid !== undefined && (
                        contact.isValid ? (
                          <Badge className="bg-emerald-500/20 text-emerald-400">
                            <Check className="w-3 h-3 mr-1" />
                            Válido
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <X className="w-3 h-3 mr-1" />
                            Inválido
                          </Badge>
                        )
                      )}
                    </div>
                  ))}
                  {contacts.length > 50 && (
                    <p className="text-center text-sm text-muted-foreground py-2">
                      ... e mais {contacts.length - 50} contatos
                    </p>
                  )}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>

        {/* Verification Status */}
        {isVerifying && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Verificando números...
              </span>
              <span>{Math.round(verificationProgress)}%</span>
            </div>
            <Progress value={verificationProgress} />
          </div>
        )}

        {/* Stats */}
        {contacts.length > 0 && (validCount > 0 || invalidCount > 0) && (
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              <span>{validCount} válidos</span>
            </div>
            <div className="flex items-center gap-2">
              <X className="w-4 h-4 text-destructive" />
              <span>{invalidCount} inválidos</span>
            </div>
            {uncheckedCount > 0 && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertCircle className="w-4 h-4" />
                <span>{uncheckedCount} não verificados</span>
              </div>
            )}
          </div>
        )}

        {/* Export Options */}
        {contacts.length > 0 && (validCount > 0 || invalidCount > 0) && (
          <div className="flex gap-2">
            {validCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportContacts('valid')}
              >
                <Download className="w-3 h-3 mr-1" />
                Exportar Válidos
              </Button>
            )}
            {invalidCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportContacts('invalid')}
              >
                <Download className="w-3 h-3 mr-1" />
                Exportar Inválidos
              </Button>
            )}
          </div>
        )}

        {/* Footer Options */}
        <div className="flex items-center gap-3 pt-4 border-t border-border/50">
          <Switch
            id="verify"
            checked={verifyNumbers}
            onCheckedChange={onVerifyChange}
          />
          <Label htmlFor="verify" className="text-sm">
            Verificar números WhatsApp antes de enviar
          </Label>
        </div>
      </CardContent>
    </Card>
  );
}
