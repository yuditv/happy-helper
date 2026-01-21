import { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  Upload, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  FileText,
  Trash2,
  Filter as FilterIcon
} from "lucide-react";
import { toast } from "sonner";
import { useWhatsAppInstances } from "@/hooks/useWhatsAppInstances";
import * as XLSX from 'xlsx';

interface ParsedNumber {
  raw: string;
  phone: string;
  name?: string;
}

interface VerificationResult {
  phone: string;
  name?: string;
  exists: boolean;
  whatsappName?: string;
}

export function WhatsAppNumberFilter() {
  const { instances } = useWhatsAppInstances();
  const connectedInstances = instances.filter(i => i.status === 'connected');
  
  const [selectedInstance, setSelectedInstance] = useState<string>("");
  const [fetchOriginalName, setFetchOriginalName] = useState(false);
  const [manualNumbers, setManualNumbers] = useState("");
  const [parsedNumbers, setParsedNumbers] = useState<ParsedNumber[]>([]);
  const [verificationResults, setVerificationResults] = useState<VerificationResult[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationProgress, setVerificationProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState("import");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse manual input numbers
  const parseManualNumbers = useCallback((text: string): ParsedNumber[] => {
    const lines = text.split('\n').filter(line => line.trim());
    return lines.map(line => {
      // Try to extract phone and name
      const parts = line.trim().split(/\s+/);
      let phone = parts[0] || "";
      const name = parts.slice(1).join(" ") || undefined;
      
      // Normalize phone number
      phone = phone.replace(/[^\d+]/g, '');
      if (!phone.startsWith('+') && !phone.startsWith('55')) {
        phone = '55' + phone;
      }
      phone = phone.replace('+', '');
      
      return { raw: line, phone, name };
    }).filter(n => n.phone.length >= 10);
  }, []);

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, []);

  // Handle file selection
  const handleFile = async (file: File) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error("Arquivo muito grande. Máximo 10MB.");
      return;
    }

    const extension = file.name.split('.').pop()?.toLowerCase();
    
    try {
      if (extension === 'txt') {
        const text = await file.text();
        const parsed = parseManualNumbers(text);
        setParsedNumbers(prev => [...prev, ...parsed]);
        toast.success(`${parsed.length} números importados`);
      } else if (['xlsx', 'xls', 'csv'].includes(extension || '')) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const data: unknown[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        
        const numbers: ParsedNumber[] = [];
        for (const row of data as unknown[][]) {
          if (row && row.length > 0) {
            let phone = String(row[0] || '').replace(/[^\d+]/g, '');
            const name = row[1] ? String(row[1]) : undefined;
            
            if (phone && phone.length >= 10) {
              if (!phone.startsWith('+') && !phone.startsWith('55')) {
                phone = '55' + phone;
              }
              phone = phone.replace('+', '');
              numbers.push({ raw: `${phone} ${name || ''}`.trim(), phone, name });
            }
          }
        }
        
        setParsedNumbers(prev => [...prev, ...numbers]);
        toast.success(`${numbers.length} números importados`);
      } else {
        toast.error("Formato não suportado. Use .xlsx, .xls, .csv ou .txt");
      }
    } catch (error) {
      console.error("Error parsing file:", error);
      toast.error("Erro ao processar arquivo");
    }
  };

  // Add manual numbers to list
  const handleAddManualNumbers = () => {
    if (!manualNumbers.trim()) {
      toast.error("Digite pelo menos um número");
      return;
    }
    
    const parsed = parseManualNumbers(manualNumbers);
    if (parsed.length === 0) {
      toast.error("Nenhum número válido encontrado");
      return;
    }
    
    setParsedNumbers(prev => [...prev, ...parsed]);
    setManualNumbers("");
    toast.success(`${parsed.length} números adicionados`);
  };

  // Remove number from list
  const removeNumber = (index: number) => {
    setParsedNumbers(prev => prev.filter((_, i) => i !== index));
  };

  // Clear all numbers
  const clearAllNumbers = () => {
    setParsedNumbers([]);
    setVerificationResults([]);
    toast.success("Lista limpa");
  };

  // Verify numbers (mock implementation - would need actual WhatsApp API)
  const handleVerifyNumbers = async () => {
    if (!selectedInstance) {
      toast.error("Selecione uma instância conectada");
      return;
    }
    
    if (parsedNumbers.length === 0) {
      toast.error("Adicione números para verificar");
      return;
    }
    
    setIsVerifying(true);
    setVerificationProgress(0);
    setVerificationResults([]);
    
    const results: VerificationResult[] = [];
    
    // Simulate verification (replace with actual API call)
    for (let i = 0; i < parsedNumbers.length; i++) {
      const num = parsedNumbers[i];
      
      // Mock verification - in production, call the WhatsApp API
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Random result for demo
      const exists = Math.random() > 0.3;
      
      results.push({
        phone: num.phone,
        name: num.name,
        exists,
        whatsappName: exists && fetchOriginalName ? `User ${num.phone.slice(-4)}` : undefined
      });
      
      setVerificationProgress(((i + 1) / parsedNumbers.length) * 100);
      setVerificationResults([...results]);
    }
    
    setIsVerifying(false);
    
    const validCount = results.filter(r => r.exists).length;
    const invalidCount = results.filter(r => !r.exists).length;
    
    toast.success(`Verificação concluída: ${validCount} válidos, ${invalidCount} inválidos`);
  };

  // Export valid numbers
  const exportValidNumbers = () => {
    const valid = verificationResults.filter(r => r.exists);
    if (valid.length === 0) {
      toast.error("Nenhum número válido para exportar");
      return;
    }
    
    const content = valid.map(r => `${r.phone}${r.name ? ` ${r.name}` : ''}${r.whatsappName ? ` (${r.whatsappName})` : ''}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'numeros_validos.txt';
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success(`${valid.length} números exportados`);
  };

  // Export invalid numbers
  const exportInvalidNumbers = () => {
    const invalid = verificationResults.filter(r => !r.exists);
    if (invalid.length === 0) {
      toast.error("Nenhum número inválido para exportar");
      return;
    }
    
    const content = invalid.map(r => `${r.phone}${r.name ? ` ${r.name}` : ''}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'numeros_invalidos.txt';
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success(`${invalid.length} números exportados`);
  };

  const totalNumbers = parsedNumbers.length;
  const validNumbers = verificationResults.filter(r => r.exists).length;
  const invalidNumbers = verificationResults.filter(r => !r.exists).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <FilterIcon className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold text-foreground">Filtro de Número</h2>
          <p className="text-muted-foreground">
            Importe e verifique se os números estão registrados no WhatsApp
          </p>
        </div>
      </div>

      {/* Import Section */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importação Avançada de Contatos
          </CardTitle>
          <CardDescription>
            Importe contatos de Excel, CSV ou TXT com detecção automática de colunas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="import" className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Importar
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-2">
                <Download className="h-4 w-4" />
                Pré-visualização
              </TabsTrigger>
            </TabsList>

            <TabsContent value="import">
              {/* Drag & Drop Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border/50 hover:border-primary/50'
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-foreground font-medium mb-2">
                  Arraste e solte o arquivo aqui
                </p>
                <p className="text-muted-foreground text-sm mb-4">
                  ou clique para selecionar
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Selecionar Arquivo
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.txt"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
                <p className="text-xs text-muted-foreground mt-4">
                  Formatos aceitos: .xlsx, .xls, .csv, .txt
                </p>
                <p className="text-xs text-muted-foreground">
                  Tamanho máximo: 10 MB
                </p>
              </div>
            </TabsContent>

            <TabsContent value="preview">
              {parsedNumbers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum número importado ainda
                </div>
              ) : (
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {parsedNumbers.map((num, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between p-2 rounded bg-background/50 border border-border/30"
                      >
                        <div>
                          <span className="font-mono text-sm">{num.phone}</span>
                          {num.name && (
                            <span className="text-muted-foreground text-sm ml-2">
                              {num.name}
                            </span>
                          )}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => removeNumber(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Manual Entry & Verification */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Manual Entry */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Entrada Manual</CardTitle>
            <CardDescription>
              Digite números diretamente ou adicione aos contatos importados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Números</Label>
              <Textarea
                value={manualNumbers}
                onChange={(e) => setManualNumbers(e.target.value)}
                placeholder="Digite os números com nomes (um por linha):
5511999999999 João Silva
+55 11 98888-8888 Maria Santos
11977777777 Pedro Costa"
                className="min-h-[150px] font-mono text-sm"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Suporta: número + nome, apenas número. Formatos: +5511999999999, 5511999999999, 11999999999
            </p>
            <Button onClick={handleAddManualNumbers} className="w-full">
              Adicionar à Lista
            </Button>
          </CardContent>
        </Card>

        {/* WhatsApp Verification */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Verificação WhatsApp</CardTitle>
            <CardDescription>
              Verifique se os números estão registrados no WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Instância</Label>
              <Select value={selectedInstance} onValueChange={setSelectedInstance}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma instância conectada" />
                </SelectTrigger>
                <SelectContent>
                  {connectedInstances.length === 0 ? (
                    <SelectItem value="none" disabled>
                      Nenhuma instância conectada
                    </SelectItem>
                  ) : (
                    connectedInstances.map((instance) => (
                      <SelectItem key={instance.id} value={instance.id}>
                        {instance.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {connectedInstances.length === 0 && (
                <p className="text-xs text-destructive">
                  Nenhuma instância conectada encontrada. Conecte uma instância primeiro.
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Buscar Nome Original do WhatsApp</Label>
                <p className="text-xs text-muted-foreground">
                  {fetchOriginalName 
                    ? "Ativado: Busca o nome cadastrado no WhatsApp"
                    : "Desativado: Verificação rápida, apenas status ativo/inativo"
                  }
                </p>
              </div>
              <Switch
                checked={fetchOriginalName}
                onCheckedChange={setFetchOriginalName}
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Total para verificar:</span>
              <Badge variant="secondary">{totalNumbers} números</Badge>
            </div>

            {isVerifying && (
              <div className="space-y-2">
                <Progress value={verificationProgress} />
                <p className="text-xs text-center text-muted-foreground">
                  Verificando... {Math.round(verificationProgress)}%
                </p>
              </div>
            )}

            <Button 
              onClick={handleVerifyNumbers} 
              className="w-full gap-2"
              disabled={isVerifying || parsedNumbers.length === 0 || !selectedInstance}
            >
              {isVerifying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Verificar Números ({totalNumbers})
            </Button>

            {totalNumbers > 0 && (
              <Button 
                variant="outline" 
                onClick={clearAllNumbers}
                className="w-full gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Limpar Lista
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      {verificationResults.length > 0 && (
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Resultados da Verificação</CardTitle>
                <CardDescription>
                  {validNumbers} válidos, {invalidNumbers} inválidos de {verificationResults.length} verificados
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={exportValidNumbers}
                  className="gap-1"
                >
                  <Download className="h-4 w-4" />
                  Exportar Válidos
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={exportInvalidNumbers}
                  className="gap-1"
                >
                  <Download className="h-4 w-4" />
                  Exportar Inválidos
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {verificationResults.map((result, index) => (
                  <div 
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      result.exists 
                        ? 'bg-green-500/10 border-green-500/30' 
                        : 'bg-destructive/10 border-destructive/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {result.exists ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive" />
                      )}
                      <div>
                        <p className="font-mono text-sm">{result.phone}</p>
                        {result.name && (
                          <p className="text-xs text-muted-foreground">{result.name}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {result.exists ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          {result.whatsappName || "Válido"}
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Inválido</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
