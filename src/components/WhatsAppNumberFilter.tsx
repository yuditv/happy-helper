import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Filter,
  Upload,
  FileSpreadsheet,
  Loader2,
  CheckCircle,
  XCircle,
  Phone,
  Copy,
  Download,
  Trash2,
  Search,
  MessageCircle,
  AlertTriangle,
} from 'lucide-react';

interface NumberResult {
  phone: string;
  formattedPhone: string;
  hasWhatsApp: boolean;
  jid?: string;
}

export function WhatsAppNumberFilter() {
  const [numbers, setNumbers] = useState<string[]>([]);
  const [numbersInput, setNumbersInput] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<NumberResult[]>([]);
  const [activeTab, setActiveTab] = useState('input');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseNumbers = (text: string): string[] => {
    // Split by newlines, commas, semicolons, or spaces
    const lines = text.split(/[\n,;]+/);
    const parsed: string[] = [];

    for (const line of lines) {
      const cleaned = line.trim().replace(/\D/g, '');
      if (cleaned.length >= 8 && cleaned.length <= 15) {
        parsed.push(cleaned);
      }
    }

    return [...new Set(parsed)]; // Remove duplicates
  };

  const handleInputChange = (value: string) => {
    setNumbersInput(value);
    const parsed = parseNumbers(value);
    setNumbers(parsed);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as string[][];

      const extractedNumbers: string[] = [];
      for (const row of jsonData) {
        for (const cell of row) {
          if (cell) {
            const cleaned = String(cell).replace(/\D/g, '');
            if (cleaned.length >= 8 && cleaned.length <= 15) {
              extractedNumbers.push(cleaned);
            }
          }
        }
      }

      const uniqueNumbers = [...new Set(extractedNumbers)];
      setNumbers(uniqueNumbers);
      setNumbersInput(uniqueNumbers.join('\n'));
      toast.success(`${uniqueNumbers.length} números extraídos do arquivo`);
    } catch (error) {
      console.error('Error reading file:', error);
      toast.error('Erro ao ler arquivo');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const checkNumbers = async () => {
    if (numbers.length === 0) {
      toast.error('Adicione números para verificar');
      return;
    }

    setIsChecking(true);
    setProgress(0);
    setResults([]);
    setActiveTab('results');

    try {
      // Process in chunks for progress tracking
      const chunkSize = 50;
      const allResults: NumberResult[] = [];

      for (let i = 0; i < numbers.length; i += chunkSize) {
        const chunk = numbers.slice(i, i + chunkSize);
        
        const { data, error } = await supabase.functions.invoke('check-whatsapp-numbers', {
          body: { phones: chunk },
        });

        if (error) {
          throw new Error(error.message);
        }

        if (data?.results) {
          allResults.push(...data.results);
        }

        const progressPercent = Math.min(((i + chunk.length) / numbers.length) * 100, 100);
        setProgress(progressPercent);
        setResults([...allResults]);
      }

      const withWhatsApp = allResults.filter(r => r.hasWhatsApp).length;
      const withoutWhatsApp = allResults.filter(r => !r.hasWhatsApp).length;

      toast.success(`Verificação concluída: ${withWhatsApp} com WhatsApp, ${withoutWhatsApp} sem WhatsApp`);
    } catch (error: any) {
      console.error('Error checking numbers:', error);
      toast.error(`Erro ao verificar números: ${error.message}`);
    } finally {
      setIsChecking(false);
      setProgress(100);
    }
  };

  const copyNumbers = (withWhatsApp: boolean) => {
    const filtered = results.filter(r => r.hasWhatsApp === withWhatsApp);
    const text = filtered.map(r => r.phone).join('\n');
    navigator.clipboard.writeText(text);
    toast.success(`${filtered.length} números copiados!`);
  };

  const downloadNumbers = (withWhatsApp: boolean) => {
    const filtered = results.filter(r => r.hasWhatsApp === withWhatsApp);
    const ws = XLSX.utils.aoa_to_sheet([
      ['Número', 'Número Formatado', 'Possui WhatsApp'],
      ...filtered.map(r => [r.phone, r.formattedPhone, r.hasWhatsApp ? 'Sim' : 'Não'])
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Números');
    XLSX.writeFile(wb, `numeros_${withWhatsApp ? 'com' : 'sem'}_whatsapp.xlsx`);
    toast.success('Arquivo baixado!');
  };

  const downloadAll = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Número', 'Número Formatado', 'Possui WhatsApp'],
      ...results.map(r => [r.phone, r.formattedPhone, r.hasWhatsApp ? 'Sim' : 'Não'])
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Todos os Números');
    XLSX.writeFile(wb, 'verificacao_numeros.xlsx');
    toast.success('Arquivo baixado!');
  };

  const clearAll = () => {
    setNumbers([]);
    setNumbersInput('');
    setResults([]);
    setProgress(0);
  };

  const withWhatsApp = results.filter(r => r.hasWhatsApp);
  const withoutWhatsApp = results.filter(r => !r.hasWhatsApp);

  return (
    <div className="container max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
          <Filter className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Filtrar Números WhatsApp</h1>
          <p className="text-muted-foreground">
            Verifique quais números possuem conta no WhatsApp
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Números para Verificar
            </CardTitle>
            <CardDescription>
              Cole os números ou importe de uma planilha
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-2" />
                Importar Planilha
              </Button>
              <Button
                variant="outline"
                onClick={clearAll}
                disabled={numbers.length === 0 && results.length === 0}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            <div className="space-y-2">
              <Label>Números (um por linha ou separados por vírgula)</Label>
              <Textarea
                placeholder="(11) 99999-9999&#10;11988887777&#10;5511977776666"
                value={numbersInput}
                onChange={(e) => handleInputChange(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
              />
            </div>

            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="text-sm">
                {numbers.length} número(s) detectado(s)
              </Badge>
              <Button
                onClick={checkNumbers}
                disabled={isChecking || numbers.length === 0}
                className="gap-2"
              >
                {isChecking ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Verificar Números
                  </>
                )}
              </Button>
            </div>

            {isChecking && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progresso</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Resultados da Verificação
            </CardTitle>
            {results.length > 0 && (
              <CardDescription>
                Total verificado: {results.length} números
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum resultado ainda</p>
                <p className="text-sm">Adicione números e clique em verificar</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">Com WhatsApp</span>
                    </div>
                    <p className="text-3xl font-bold text-green-600 mt-2">
                      {withWhatsApp.length}
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyNumbers(true)}
                        disabled={withWhatsApp.length === 0}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copiar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadNumbers(true)}
                        disabled={withWhatsApp.length === 0}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Excel
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="flex items-center gap-2 text-red-600">
                      <XCircle className="h-5 w-5" />
                      <span className="font-medium">Sem WhatsApp</span>
                    </div>
                    <p className="text-3xl font-bold text-red-600 mt-2">
                      {withoutWhatsApp.length}
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyNumbers(false)}
                        disabled={withoutWhatsApp.length === 0}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copiar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadNumbers(false)}
                        disabled={withoutWhatsApp.length === 0}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Excel
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Download all */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={downloadAll}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Baixar Relatório Completo
                </Button>

                {/* Results list */}
                <Tabs defaultValue="all" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="all">Todos ({results.length})</TabsTrigger>
                    <TabsTrigger value="with">Com ({withWhatsApp.length})</TabsTrigger>
                    <TabsTrigger value="without">Sem ({withoutWhatsApp.length})</TabsTrigger>
                  </TabsList>
                  <TabsContent value="all">
                    <NumbersList numbers={results} />
                  </TabsContent>
                  <TabsContent value="with">
                    <NumbersList numbers={withWhatsApp} />
                  </TabsContent>
                  <TabsContent value="without">
                    <NumbersList numbers={withoutWhatsApp} />
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function NumbersList({ numbers }: { numbers: NumberResult[] }) {
  if (numbers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Nenhum número nesta categoria
      </div>
    );
  }

  return (
    <ScrollArea className="h-[250px]">
      <div className="space-y-1">
        {numbers.map((num, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
          >
            <div className="flex items-center gap-2">
              {num.hasWhatsApp ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="font-mono text-sm">{num.phone}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {num.formattedPhone}
            </span>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
