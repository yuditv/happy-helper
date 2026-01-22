import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Type,
  Image,
  Video,
  Mic,
  Send,
  List,
  Calendar,
  User,
  Settings2,
  Loader2,
  CheckCircle2,
  Wifi,
  WifiOff,
  Clock,
} from 'lucide-react';
import { WhatsAppInstance } from '@/hooks/useWhatsAppInstances';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { MediaUploader, MediaType as UploaderMediaType } from '@/components/BulkDispatcher/MediaUploader';

interface WhatsAppStatusProps {
  instances: WhatsAppInstance[];
}

type StatusType = 'text' | 'image' | 'video' | 'audio';
type BalanceMode = 'manual' | 'round-robin' | 'random';

const BACKGROUND_COLORS = [
  // Row 1 - Yellows
  '#F7DC6F', '#F4D03F', '#F39C12', '#E67E22',
  // Row 2 - Greens
  '#82E0AA', '#58D68D', '#48C9B0', '#76D7C4',
  // Row 3 - Blues
  '#85C1E9', '#7FB3D5', '#BB8FCE', '#C39BD3',
  // Row 4 - Pinks/Magentas
  '#F1948A', '#EC7063', '#E74C3C', '#F9E79F',
  // Row 5 - Grays
  '#BDC3C7', '#ABB2B9', '#8E44AD', '#6C3483',
];

const FONT_STYLES = [
  { id: 0, name: 'Padrão', className: 'font-normal' },
  { id: 1, name: 'Negrito', className: 'font-bold' },
  { id: 2, name: 'Itálico', className: 'italic' },
  { id: 3, name: 'Condensado', className: 'font-condensed tracking-tighter' },
  { id: 4, name: 'Largo', className: 'tracking-widest' },
  { id: 5, name: 'Serif', className: 'font-serif' },
  { id: 6, name: 'Mono', className: 'font-mono' },
  { id: 7, name: 'Decorativo', className: 'font-bold italic' },
  { id: 8, name: 'Personalizado', className: 'font-medium' },
];

export function WhatsAppStatus({ instances }: WhatsAppStatusProps) {
  const [activeTab, setActiveTab] = useState('single');
  const [statusType, setStatusType] = useState<StatusType>('text');
  const [text, setText] = useState('');
  const [backgroundColor, setBackgroundColor] = useState(BACKGROUND_COLORS[18]);
  const [fontStyle, setFontStyle] = useState(0);
  const [balanceMode, setBalanceMode] = useState<BalanceMode>('manual');
  const [selectedInstances, setSelectedInstances] = useState<Set<string>>(new Set());
  const [isSending, setIsSending] = useState(false);
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaFilename, setMediaFilename] = useState('');
  const [mediaMimetype, setMediaMimetype] = useState('');
  const [batchList, setBatchList] = useState<Array<{
    id: string;
    type: StatusType;
    text: string;
    backgroundColor: string;
    fontStyle: number;
    mediaUrl?: string;
    mediaFilename?: string;
  }>>([]);

  const connectedInstances = useMemo(() => 
    instances.filter(i => i.status === 'connected'),
    [instances]
  );

  const toggleInstance = (instanceId: string) => {
    setSelectedInstances(prev => {
      const newSet = new Set(prev);
      if (newSet.has(instanceId)) {
        newSet.delete(instanceId);
      } else {
        newSet.add(instanceId);
      }
      return newSet;
    });
  };

  const selectAllInstances = () => {
    setSelectedInstances(new Set(connectedInstances.map(i => i.id)));
  };

  const clearInstanceSelection = () => {
    setSelectedInstances(new Set());
  };

  const handleSendStatus = async () => {
    if (selectedInstances.size === 0) {
      toast.error('Selecione pelo menos uma instância');
      return;
    }

    if (statusType === 'text' && !text.trim()) {
      toast.error('Digite o texto do status');
      return;
    }

    if ((statusType === 'image' || statusType === 'video' || statusType === 'audio') && !mediaUrl) {
      const mediaLabel = statusType === 'image' ? 'uma imagem' : statusType === 'video' ? 'um vídeo' : 'um áudio';
      toast.error(`Selecione ${mediaLabel}`);
      return;
    }

    setIsSending(true);
    
    // Simulate sending - in real implementation, call Supabase edge function
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    toast.success(`Status enviado para ${selectedInstances.size} instância(s)!`);
    setIsSending(false);
  };

  const handleStatusTypeChange = (newType: StatusType) => {
    setStatusType(newType);
    setMediaUrl('');
    setMediaFilename('');
    setMediaMimetype('');
  };

  const handleMediaUpload = (url: string, filename: string, mimetype: string) => {
    setMediaUrl(url);
    setMediaFilename(filename);
    setMediaMimetype(mimetype);
  };

  const handleMediaRemove = () => {
    setMediaUrl('');
    setMediaFilename('');
    setMediaMimetype('');
  };

  const handleAddToBatch = () => {
    if (statusType === 'text' && !text.trim()) {
      toast.error('Digite o texto do status');
      return;
    }

    if ((statusType === 'image' || statusType === 'video' || statusType === 'audio') && !mediaUrl) {
      const mediaLabel = statusType === 'image' ? 'uma imagem' : statusType === 'video' ? 'um vídeo' : 'um áudio';
      toast.error(`Selecione ${mediaLabel}`);
      return;
    }

    setBatchList(prev => [...prev, {
      id: Date.now().toString(),
      type: statusType,
      text,
      backgroundColor,
      fontStyle,
      mediaUrl,
      mediaFilename,
    }]);

    setText('');
    handleMediaRemove();
    toast.success('Adicionado à lista de lote!');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><Wifi className="w-3 h-3 mr-1" /> Conectado</Badge>;
      case 'disconnected':
        return <Badge variant="destructive"><WifiOff className="w-3 h-3 mr-1" /> Desconectado</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Aguardando</Badge>;
    }
  };

  const selectedFontStyle = FONT_STYLES.find(f => f.id === fontStyle) || FONT_STYLES[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold">Status Automático</h2>
        <p className="text-muted-foreground text-sm">
          Envie stories (status) com texto, imagem, vídeo ou áudio para suas instâncias do WhatsApp. 
          Use o modo único para envios imediatos ou o modo lote para múltiplos status e agendamentos.
        </p>
      </div>

      {/* Instance Selection Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Seleção de Instâncias
            <Badge variant="outline" className="ml-2">WhatsApp API</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Modo de Balanceamento</Label>
            <Select value={balanceMode} onValueChange={(v) => setBalanceMode(v as BalanceMode)}>
              <SelectTrigger>
                <Settings2 className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="round-robin">Round Robin</SelectItem>
                <SelectItem value="random">Aleatório</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Você controla quais instâncias usar e como distribuir os contatos
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Instâncias Disponíveis ({selectedInstances.size} selecionadas)</Label>
              <div className="flex gap-2">
                <Button variant="link" size="sm" onClick={selectAllInstances} className="text-primary h-auto p-0">
                  Selecionar Todas
                </Button>
                <Button variant="link" size="sm" onClick={clearInstanceSelection} className="h-auto p-0">
                  Limpar
                </Button>
              </div>
            </div>

            {connectedInstances.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border rounded-lg">
                <Settings2 className="h-12 w-12 mb-4 opacity-30" />
                <p className="font-medium">Nenhuma instância conectada</p>
                <p className="text-sm">Configure suas instâncias nas configurações</p>
              </div>
            ) : (
              <ScrollArea className="h-[200px] border rounded-lg p-4">
                <div className="space-y-2">
                  {connectedInstances.map((instance) => (
                    <div
                      key={instance.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer",
                        selectedInstances.has(instance.id)
                          ? "border-primary bg-primary/10"
                          : "border-border/50 hover:border-primary/50"
                      )}
                      onClick={() => toggleInstance(instance.id)}
                    >
                      <Checkbox
                        checked={selectedInstances.has(instance.id)}
                        onCheckedChange={() => toggleInstance(instance.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{instance.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {instance.phone_connected || 'Não conectado'}
                        </p>
                      </div>
                      {getStatusBadge(instance.status)}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Status Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="single" className="gap-2">
            <User className="h-4 w-4" />
            Status Único
          </TabsTrigger>
          <TabsTrigger value="batch" className="gap-2">
            <List className="h-4 w-4" />
            Lote de Status
          </TabsTrigger>
          <TabsTrigger value="schedule" className="gap-2">
            <Calendar className="h-4 w-4" />
            Agendamentos
          </TabsTrigger>
        </TabsList>

        {/* Single Status Tab */}
        <TabsContent value="single" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Type, Content, Options */}
            <div className="space-y-6">
              {/* Status Type */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Tipo de Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'text', icon: Type, label: 'Texto', desc: 'Status com texto e cor de fundo' },
                      { id: 'image', icon: Image, label: 'Imagem', desc: 'Imagem com legenda opcional' },
                      { id: 'video', icon: Video, label: 'Vídeo', desc: 'Vídeo com thumbnail e legenda' },
                      { id: 'audio', icon: Mic, label: 'Áudio', desc: 'Áudio normal ou mensagem de voz' },
                    ].map((type) => (
                      <button
                        key={type.id}
                        onClick={() => handleStatusTypeChange(type.id as StatusType)}
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all text-center",
                          statusType === type.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <type.icon className="h-8 w-8" />
                        <span className="font-medium">{type.label}</span>
                        <span className="text-xs text-muted-foreground">{type.desc}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Content */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Conteúdo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {statusType === 'text' && (
                    <>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Texto do Status</Label>
                          <span className="text-xs text-muted-foreground">{656 - text.length}/656</span>
                        </div>
                        <Textarea
                          value={text}
                          onChange={(e) => setText(e.target.value.slice(0, 656))}
                          placeholder="Digite o texto do seu status aqui..."
                          className="min-h-[120px] resize-none"
                        />
                        <p className="text-xs text-muted-foreground">
                          Máximo de 656 caracteres. Este texto será usado como conteúdo principal ou legenda para mídia.
                        </p>
                      </div>
                    </>
                  )}

                  {statusType === 'image' && (
                    <div className="space-y-4">
                      <MediaUploader
                        type="image"
                        currentUrl={mediaUrl}
                        currentFilename={mediaFilename}
                        onUpload={handleMediaUpload}
                        onRemove={handleMediaRemove}
                      />
                      <div className="space-y-2">
                        <Label>Legenda (opcional)</Label>
                        <Textarea
                          value={text}
                          onChange={(e) => setText(e.target.value.slice(0, 656))}
                          placeholder="Digite uma legenda..."
                          className="min-h-[80px] resize-none"
                        />
                      </div>
                    </div>
                  )}

                  {statusType === 'video' && (
                    <div className="space-y-4">
                      <MediaUploader
                        type="video"
                        currentUrl={mediaUrl}
                        currentFilename={mediaFilename}
                        onUpload={handleMediaUpload}
                        onRemove={handleMediaRemove}
                      />
                      <div className="space-y-2">
                        <Label>Legenda (opcional)</Label>
                        <Textarea
                          value={text}
                          onChange={(e) => setText(e.target.value.slice(0, 656))}
                          placeholder="Digite uma legenda..."
                          className="min-h-[80px] resize-none"
                        />
                      </div>
                    </div>
                  )}

                  {statusType === 'audio' && (
                    <div className="space-y-4">
                      <MediaUploader
                        type="audio"
                        currentUrl={mediaUrl}
                        currentFilename={mediaFilename}
                        onUpload={handleMediaUpload}
                        onRemove={handleMediaRemove}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Background Color (for text status) */}
              {statusType === 'text' && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Cor de Fundo</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-4 gap-2">
                      {BACKGROUND_COLORS.map((color, index) => (
                        <button
                          key={index}
                          onClick={() => setBackgroundColor(color)}
                          className={cn(
                            "h-12 rounded-lg transition-all border-2",
                            backgroundColor === color
                              ? "border-foreground ring-2 ring-foreground ring-offset-2 ring-offset-background"
                              : "border-transparent hover:scale-105"
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Cores de 1-3: tons de amarelo • 4-6: tons de verde • 7-9: tons de azul • 10-12: tons de lilás • 13: magenta • 14-15: tons de rosa • 16: marrom claro • 17-19: tons de cinza
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Font Style (for text status) */}
              {statusType === 'text' && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Estilo da Fonte</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                      {FONT_STYLES.map((style) => (
                        <button
                          key={style.id}
                          onClick={() => setFontStyle(style.id)}
                          className={cn(
                            "py-3 px-4 rounded-lg transition-all border",
                            style.className,
                            fontStyle === style.id
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          {style.name}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Estilos de fonte de 0-8. Apenas aplicável para status de texto.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button 
                  onClick={handleSendStatus}
                  disabled={isSending || selectedInstances.size === 0}
                  className="w-full h-12 gap-2"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      Enviar Status Agora
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleAddToBatch}
                  className="w-full h-12 gap-2"
                >
                  <List className="h-5 w-5" />
                  Adicionar à Lista para Lote
                </Button>
              </div>
            </div>

            {/* Right Column - Preview */}
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Preview do Status</CardTitle>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline">
                      <Type className="h-3 w-3 mr-1" />
                      Text
                    </Badge>
                    <Badge variant="outline">
                      Cor: {BACKGROUND_COLORS.indexOf(backgroundColor) + 1}
                    </Badge>
                    <Badge variant="outline">
                      Fonte: {fontStyle}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center">
                    <div 
                      className="w-64 h-[400px] rounded-2xl flex items-center justify-center p-6 text-center shadow-lg overflow-hidden"
                      style={{ backgroundColor: statusType === 'text' ? backgroundColor : '#6B7280' }}
                    >
                      {statusType === 'text' ? (
                        <p className={cn("text-white text-lg leading-relaxed", selectedFontStyle.className)}>
                          {text || 'Seu texto aparecerá aqui...'}
                        </p>
                      ) : statusType === 'image' ? (
                        mediaUrl ? (
                          <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center gap-4 text-white/60">
                            <Image className="h-16 w-16" />
                            <span>Preview da imagem</span>
                          </div>
                        )
                      ) : statusType === 'video' ? (
                        mediaUrl ? (
                          <video src={mediaUrl} className="w-full h-full object-cover" controls />
                        ) : (
                          <div className="flex flex-col items-center gap-4 text-white/60">
                            <Video className="h-16 w-16" />
                            <span>Preview do vídeo</span>
                          </div>
                        )
                      ) : (
                        mediaUrl ? (
                          <div className="flex flex-col items-center gap-4 text-white w-full">
                            <Mic className="h-16 w-16" />
                            <audio src={mediaUrl} controls className="w-full" />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-4 text-white/60">
                            <Mic className="h-16 w-16" />
                            <span>Preview do áudio</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                    <p className="font-medium">Preview do Status WhatsApp</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Este é um preview aproximado de como seu status aparecerá</li>
                      <li>O layout real pode variar ligeiramente no WhatsApp</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Batch Tab */}
        <TabsContent value="batch" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <List className="h-5 w-5" />
                Lista de Status para Lote
              </CardTitle>
              <CardDescription>
                {batchList.length} status na lista
              </CardDescription>
            </CardHeader>
            <CardContent>
              {batchList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <List className="h-12 w-12 mb-4 opacity-30" />
                  <p className="font-medium">Nenhum status na lista</p>
                  <p className="text-sm">Adicione status usando a aba "Status Único"</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {batchList.map((item, index) => (
                      <div 
                        key={item.id}
                        className="flex items-center gap-4 p-4 rounded-lg border"
                      >
                        <div 
                          className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-xs"
                          style={{ backgroundColor: item.backgroundColor }}
                        >
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.text || 'Status de mídia'}</p>
                          <p className="text-xs text-muted-foreground">
                            Tipo: {item.type} • Fonte: {item.fontStyle}
                          </p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setBatchList(prev => prev.filter(i => i.id !== item.id))}
                        >
                          Remover
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {batchList.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <Button 
                    onClick={() => {
                      toast.success('Lote de status enviado!');
                      setBatchList([]);
                    }}
                    disabled={selectedInstances.size === 0}
                    className="w-full gap-2"
                  >
                    <Send className="h-4 w-4" />
                    Enviar {batchList.length} Status em Lote
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Agendamentos
              </CardTitle>
              <CardDescription>
                Agende seus status para serem enviados automaticamente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mb-4 opacity-30" />
                <p className="font-medium">Nenhum agendamento</p>
                <p className="text-sm">Funcionalidade em desenvolvimento</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
