import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Shuffle, Plus, X, Copy, Trash2, Edit2, Check, 
  Sparkles, ChevronDown, ChevronUp, Lightbulb
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SpintaxKey {
  id: string;
  name: string;
  variations: string[];
  createdAt: number;
}

interface SpintaxManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsertSpintax: (spintax: string) => void;
}

const STORAGE_KEY = 'spintax-keys';

const EXAMPLE_KEYS: SpintaxKey[] = [
  { id: 'ex1', name: 'saudacao', variations: ['Olá', 'Oi', 'E aí', 'Hey', 'Opa'], createdAt: 0 },
  { id: 'ex2', name: 'despedida', variations: ['Abraços', 'Até mais', 'Valeu', 'Obrigado'], createdAt: 0 },
  { id: 'ex3', name: 'urgencia', variations: ['Corra', 'Aproveite agora', 'Não perca', 'Últimas vagas'], createdAt: 0 },
];

export function SpintaxManager({ open, onOpenChange, onInsertSpintax }: SpintaxManagerProps) {
  const [keys, setKeys] = useState<SpintaxKey[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newVariation, setNewVariation] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingVariationIndex, setEditingVariationIndex] = useState<number | null>(null);
  const [editingVariationValue, setEditingVariationValue] = useState('');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [showExamples, setShowExamples] = useState(false);

  // Load keys from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setKeys(JSON.parse(stored));
      } catch {
        console.error('Failed to parse stored spintax keys');
      }
    }
  }, []);

  // Save keys to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  }, [keys]);

  const sanitizeName = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 20);
  };

  const addKey = () => {
    const sanitized = sanitizeName(newKeyName);
    if (!sanitized) {
      toast.error('Digite um nome válido para a KEY');
      return;
    }
    if (keys.some(k => k.name === sanitized)) {
      toast.error('Já existe uma KEY com esse nome');
      return;
    }

    const newKey: SpintaxKey = {
      id: crypto.randomUUID(),
      name: sanitized,
      variations: [],
      createdAt: Date.now(),
    };
    setKeys([newKey, ...keys]);
    setNewKeyName('');
    setExpandedKey(newKey.id);
    toast.success(`KEY "${sanitized}" criada!`);
  };

  const deleteKey = (id: string) => {
    setKeys(keys.filter(k => k.id !== id));
    if (expandedKey === id) setExpandedKey(null);
    toast.success('KEY removida');
  };

  const addVariation = (keyId: string) => {
    if (!newVariation.trim()) return;
    
    setKeys(keys.map(k => {
      if (k.id === keyId) {
        if (k.variations.includes(newVariation.trim())) {
          toast.error('Esta variação já existe');
          return k;
        }
        return { ...k, variations: [...k.variations, newVariation.trim()] };
      }
      return k;
    }));
    setNewVariation('');
  };

  const removeVariation = (keyId: string, index: number) => {
    setKeys(keys.map(k => {
      if (k.id === keyId) {
        return { ...k, variations: k.variations.filter((_, i) => i !== index) };
      }
      return k;
    }));
  };

  const startEditVariation = (keyId: string, index: number, value: string) => {
    setEditingId(keyId);
    setEditingVariationIndex(index);
    setEditingVariationValue(value);
  };

  const saveEditVariation = () => {
    if (!editingVariationValue.trim() || editingId === null || editingVariationIndex === null) {
      setEditingId(null);
      setEditingVariationIndex(null);
      return;
    }

    setKeys(keys.map(k => {
      if (k.id === editingId) {
        const newVariations = [...k.variations];
        newVariations[editingVariationIndex] = editingVariationValue.trim();
        return { ...k, variations: newVariations };
      }
      return k;
    }));

    setEditingId(null);
    setEditingVariationIndex(null);
    setEditingVariationValue('');
  };

  const getSpintaxCode = (key: SpintaxKey) => {
    return `{{ ${key.name} : ${key.variations.join(' | ')} }}`;
  };

  const copySpintax = (key: SpintaxKey) => {
    const code = getSpintaxCode(key);
    navigator.clipboard.writeText(code);
    toast.success('Spintax copiado!');
  };

  const insertSpintax = (key: SpintaxKey) => {
    if (key.variations.length < 2) {
      toast.error('Adicione pelo menos 2 variações');
      return;
    }
    onInsertSpintax(getSpintaxCode(key));
    onOpenChange(false);
    toast.success('Spintax inserido na mensagem!');
  };

  const loadExample = (example: SpintaxKey) => {
    if (keys.some(k => k.name === example.name)) {
      toast.error(`KEY "${example.name}" já existe`);
      return;
    }
    const newKey = { ...example, id: crypto.randomUUID(), createdAt: Date.now() };
    setKeys([newKey, ...keys]);
    toast.success(`Exemplo "${example.name}" adicionado!`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shuffle className="h-5 w-5 text-primary" />
            Gerenciador de Spintax
          </DialogTitle>
          <DialogDescription>
            Crie variações de texto para personalizar suas mensagens automaticamente
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Create New Key */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Nome da KEY (ex: saudacao)"
                className="pr-20"
                onKeyDown={(e) => e.key === 'Enter' && addKey()}
              />
              {newKeyName && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {sanitizeName(newKeyName)}
                </span>
              )}
            </div>
            <Button onClick={addKey} disabled={!newKeyName.trim()}>
              <Plus className="w-4 h-4 mr-1" />
              Criar KEY
            </Button>
          </div>

          {/* Examples Toggle */}
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowExamples(!showExamples)}
              className="gap-1.5 text-xs text-muted-foreground"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              Exemplos prontos
              {showExamples ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </Button>
          </div>

          {/* Example Keys */}
          {showExamples && (
            <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-muted/30 border border-dashed border-border/50">
              {EXAMPLE_KEYS.map(example => (
                <Badge
                  key={example.id}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/20 transition-colors gap-1.5 py-1.5"
                  onClick={() => loadExample(example)}
                >
                  <Plus className="w-3 h-3" />
                  {example.name}
                  <span className="text-muted-foreground">({example.variations.length})</span>
                </Badge>
              ))}
            </div>
          )}

          {/* Keys List */}
          <ScrollArea className="flex-1 -mx-6 px-6">
            {keys.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Shuffle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhuma KEY criada ainda</p>
                <p className="text-sm mt-1">Crie sua primeira KEY acima ou use os exemplos</p>
              </div>
            ) : (
              <div className="space-y-3">
                {keys.map(key => (
                  <div
                    key={key.id}
                    className={cn(
                      "rounded-xl border transition-all",
                      expandedKey === key.id 
                        ? "border-primary/50 bg-primary/5" 
                        : "border-border/50 bg-card/50 hover:border-border"
                    )}
                  >
                    {/* Key Header */}
                    <div 
                      className="flex items-center gap-3 p-3 cursor-pointer"
                      onClick={() => setExpandedKey(expandedKey === key.id ? null : key.id)}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Badge variant="secondary" className="font-mono shrink-0">
                          {key.name}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {key.variations.length} {key.variations.length === 1 ? 'variação' : 'variações'}
                        </span>
                        {key.variations.length > 0 && (
                          <span className="text-xs text-muted-foreground/60 truncate hidden sm:block">
                            • {key.variations.slice(0, 3).join(', ')}{key.variations.length > 3 && '...'}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => { e.stopPropagation(); copySpintax(key); }}
                                disabled={key.variations.length < 2}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copiar Spintax</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-primary"
                                onClick={(e) => { e.stopPropagation(); insertSpintax(key); }}
                                disabled={key.variations.length < 2}
                              >
                                <Sparkles className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Inserir na mensagem</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={(e) => { e.stopPropagation(); deleteKey(key.id); }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Excluir KEY</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        {expandedKey === key.id ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {expandedKey === key.id && (
                      <div className="px-3 pb-3 pt-1 border-t border-border/30 space-y-3">
                        {/* Variations List */}
                        <div className="flex flex-wrap gap-2">
                          {key.variations.map((variation, index) => (
                            <div
                              key={index}
                              className="group flex items-center gap-1 bg-muted/50 rounded-lg px-2.5 py-1.5"
                            >
                              {editingId === key.id && editingVariationIndex === index ? (
                                <div className="flex items-center gap-1">
                                  <Input
                                    value={editingVariationValue}
                                    onChange={(e) => setEditingVariationValue(e.target.value)}
                                    className="h-6 text-sm w-24 px-1"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') saveEditVariation();
                                      if (e.key === 'Escape') { setEditingId(null); setEditingVariationIndex(null); }
                                    }}
                                    onBlur={saveEditVariation}
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    onClick={saveEditVariation}
                                  >
                                    <Check className="w-3 h-3" />
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <span className="text-sm">{variation}</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => startEditVariation(key.id, index, variation)}
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                                    onClick={() => removeVariation(key.id, index)}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                          ))}
                          
                          {/* Add Variation Inline */}
                          <div className="flex items-center gap-1">
                            <Input
                              value={newVariation}
                              onChange={(e) => setNewVariation(e.target.value)}
                              placeholder="+ Nova variação"
                              className="h-8 w-32 text-sm"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  addVariation(key.id);
                                }
                              }}
                            />
                            {newVariation && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => addVariation(key.id)}
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Spintax Preview */}
                        {key.variations.length >= 2 && (
                          <div className="p-2.5 rounded-lg bg-background/80 border border-border/30">
                            <p className="text-xs text-muted-foreground mb-1">Código Spintax:</p>
                            <code className="text-xs font-mono text-primary break-all">
                              {getSpintaxCode(key)}
                            </code>
                          </div>
                        )}

                        {key.variations.length < 2 && (
                          <p className="text-xs text-amber-500 flex items-center gap-1">
                            ⚠️ Adicione pelo menos 2 variações para usar este Spintax
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* How to Use */}
          <div className="p-3 rounded-lg bg-muted/30 border border-border/30 text-sm space-y-1">
            <p className="font-medium text-muted-foreground">💡 Como usar</p>
            <p className="text-muted-foreground/80 text-xs">
              1. Crie KEYs com variações • 2. Insira na mensagem com o botão ✨ • 3. O sistema escolhe aleatoriamente
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}