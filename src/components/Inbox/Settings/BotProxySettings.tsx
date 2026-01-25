import { useState, useEffect } from 'react';
import { Bot, Phone, Tag, Smartphone, Power, Users, XCircle, Plus, Trash2, ArrowRightLeft, CreditCard, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useBotProxy, BotProxyReplacement } from '@/hooks/useBotProxy';
import { useInboxLabels } from '@/hooks/useInboxLabels';
import { useWhatsAppInstances } from '@/hooks/useWhatsAppInstances';

function ReplacementItem({
  replacement, 
  onUpdate, 
  onDelete,
  onToggle 
}: { 
  replacement: BotProxyReplacement;
  onUpdate: (id: string, search: string, replace: string) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, active: boolean) => void;
}) {
  const [searchText, setSearchText] = useState(replacement.search_text);
  const [replaceText, setReplaceText] = useState(replacement.replace_text);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setSearchText(replacement.search_text);
    setReplaceText(replacement.replace_text);
    setIsDirty(false);
  }, [replacement]);

  const handleUpdate = () => {
    if (searchText.trim() && replaceText.trim()) {
      onUpdate(replacement.id, searchText, replaceText);
      setIsDirty(false);
    }
  };

  return (
    <div className={`p-3 rounded-lg border ${replacement.is_active ? 'bg-muted/30' : 'bg-muted/10 opacity-60'}`}>
      <div className="flex items-center gap-2 mb-2">
        <Switch
          checked={replacement.is_active}
          onCheckedChange={(checked) => onToggle(replacement.id, checked)}
          className="scale-75"
        />
        <span className="text-xs text-muted-foreground">
          {replacement.is_active ? 'Ativa' : 'Inativa'}
        </span>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(replacement.id)}
          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center">
        <Input
          value={searchText}
          onChange={(e) => { setSearchText(e.target.value); setIsDirty(true); }}
          placeholder="Texto original"
          className="text-sm"
        />
        <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
        <Input
          value={replaceText}
          onChange={(e) => { setReplaceText(e.target.value); setIsDirty(true); }}
          placeholder="Substituir por"
          className="text-sm"
        />
      </div>
      {isDirty && (
        <div className="flex justify-end mt-2">
          <Button size="sm" onClick={handleUpdate} className="h-7 text-xs">
            Salvar alteração
          </Button>
        </div>
      )}
    </div>
  );
}

export function BotProxySettings() {
  const { 
    config, 
    sessions, 
    replacements,
    isLoading, 
    isSaving, 
    saveConfig, 
    toggleActive, 
    endSession,
    addReplacement,
    updateReplacement,
    deleteReplacement,
    toggleReplacement
  } = useBotProxy();
  const { labels, isLoading: labelsLoading } = useInboxLabels();
  const { instances, isLoading: instancesLoading } = useWhatsAppInstances();

  const [botPhone, setBotPhone] = useState('');
  const [triggerLabelId, setTriggerLabelId] = useState<string>('');
  const [instanceId, setInstanceId] = useState<string>('');
  const [isActive, setIsActive] = useState(true);
  const [ownerPaymentInfo, setOwnerPaymentInfo] = useState('');
  const [blockBotPayment, setBlockBotPayment] = useState(false);

  // New replacement form
  const [newSearchText, setNewSearchText] = useState('');
  const [newReplaceText, setNewReplaceText] = useState('');

  // Load config into form
  useEffect(() => {
    if (config) {
      setBotPhone(config.bot_phone || '');
      setTriggerLabelId(config.trigger_label_id || '');
      setInstanceId(config.instance_id || '');
      setIsActive(config.is_active);
      setOwnerPaymentInfo(config.owner_payment_info || '');
      setBlockBotPayment(config.block_bot_payment || false);
    }
  }, [config]);

  const handleSave = async () => {
    if (!botPhone.trim()) {
      return;
    }

    await saveConfig({
      bot_phone: botPhone,
      trigger_label_id: triggerLabelId || null,
      instance_id: instanceId || null,
      is_active: isActive,
      owner_payment_info: ownerPaymentInfo.trim() || null,
      block_bot_payment: blockBotPayment,
    });
  };

  const handleAddReplacement = async () => {
    if (!newSearchText.trim() || !newReplaceText.trim()) return;
    
    const result = await addReplacement(newSearchText.trim(), newReplaceText.trim());
    if (result) {
      setNewSearchText('');
      setNewReplaceText('');
    }
  };

  const connectedInstances = instances.filter(i => i.status === 'connected');

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Ponte de Bot
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Encaminhe mensagens entre clientes e um bot externo automaticamente
        </p>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Status da Ponte</CardTitle>
            <Switch
              checked={config?.is_active ?? false}
              onCheckedChange={toggleActive}
              disabled={!config}
            />
          </div>
          <CardDescription>
            {config?.is_active ? (
              <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
                <Power className="h-3 w-3 mr-1" />
                Ativo
              </Badge>
            ) : (
              <Badge variant="secondary">
                <Power className="h-3 w-3 mr-1" />
                Inativo
              </Badge>
            )}
          </CardDescription>
        </CardHeader>
        {config && sessions.length > 0 && (
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{sessions.length} sessão(ões) ativa(s)</span>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuração</CardTitle>
          <CardDescription>
            Defina o número do bot e as regras de encaminhamento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Bot Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="bot-phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Número do Bot
            </Label>
            <Input
              id="bot-phone"
              placeholder="5511999998888"
              value={botPhone}
              onChange={(e) => setBotPhone(e.target.value.replace(/\D/g, ''))}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Número do bot externo que receberá as mensagens dos clientes
            </p>
          </div>

          {/* Trigger Label */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Etiqueta de Ativação
            </Label>
            <Select value={triggerLabelId} onValueChange={setTriggerLabelId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma etiqueta..." />
              </SelectTrigger>
              <SelectContent>
                {labelsLoading ? (
                  <SelectItem value="_loading" disabled>Carregando...</SelectItem>
                ) : labels.length === 0 ? (
                  <SelectItem value="_empty" disabled>Nenhuma etiqueta criada</SelectItem>
                ) : (
                  labels.map((label) => (
                    <SelectItem key={label.id} value={label.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: label.color }}
                        />
                        {label.name}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Conversas com esta etiqueta terão mensagens encaminhadas para o bot
            </p>
          </div>

          {/* WhatsApp Instance */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Instância WhatsApp
            </Label>
            <Select value={instanceId} onValueChange={setInstanceId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma instância..." />
              </SelectTrigger>
              <SelectContent>
                {instancesLoading ? (
                  <SelectItem value="_loading" disabled>Carregando...</SelectItem>
                ) : connectedInstances.length === 0 ? (
                  <SelectItem value="_empty" disabled>Nenhuma instância conectada</SelectItem>
                ) : (
                  connectedInstances.map((instance) => (
                    <SelectItem key={instance.id} value={instance.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        {instance.instance_name}
                        {instance.phone_connected && (
                          <span className="text-muted-foreground text-xs">
                            ({instance.phone_connected})
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Instância usada para enviar mensagens ao bot (pode ser diferente da do cliente)
            </p>
          </div>

          <Button onClick={handleSave} disabled={isSaving || !botPhone.trim()}>
            {isSaving ? 'Salvando...' : config ? 'Atualizar Configuração' : 'Criar Configuração'}
          </Button>
        </CardContent>
      </Card>

      {/* Payment Override */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <CardTitle className="text-base">Bloqueio de Pagamento do Bot</CardTitle>
            </div>
            <Switch
              checked={blockBotPayment}
              onCheckedChange={setBlockBotPayment}
            />
          </div>
          <CardDescription>
            {blockBotPayment ? (
              <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
                <ShieldCheck className="h-3 w-3 mr-1" />
                Ativo - Seus dados serão enviados
              </Badge>
            ) : (
              <Badge variant="secondary">
                Desativado - Mensagens do bot passam normalmente
              </Badge>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="owner-payment-info">
              Seus Dados de Pagamento
            </Label>
            <Textarea
              id="owner-payment-info"
              placeholder={`Ex:\n💳 *Dados para Pagamento*\n\nPIX: seu-email@gmail.com\nChave: CPF ou Celular\nNome: Seu Nome\nValor: R$ XX,XX`}
              value={ownerPaymentInfo}
              onChange={(e) => setOwnerPaymentInfo(e.target.value)}
              rows={6}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Quando o bot enviar uma mensagem com palavras como "pix", "pagamento", "chave pix", etc., 
              essa mensagem será <strong>bloqueada</strong> e substituída pelos seus dados acima.
            </p>
          </div>
          
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <p className="text-xs text-amber-600 dark:text-amber-400">
              <strong>⚠️ Palavras-chave detectadas:</strong> pix, pagamento, pagar, chave pix, transferir, 
              deposito, depositar, banco, conta, R$, reais, cpf, cnpj
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Text Replacements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            Substituição de Texto
          </CardTitle>
          <CardDescription>
            Modifique automaticamente textos nas mensagens do bot antes de enviar ao cliente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new replacement */}
          <div className="p-3 rounded-lg border border-dashed bg-muted/20">
            <p className="text-sm font-medium mb-2">Adicionar nova regra</p>
            <div className="grid grid-cols-[1fr,auto,1fr,auto] gap-2 items-center">
              <Input
                value={newSearchText}
                onChange={(e) => setNewSearchText(e.target.value)}
                placeholder="Texto original (ex: R$ 5.00)"
                className="text-sm"
              />
              <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
              <Input
                value={newReplaceText}
                onChange={(e) => setNewReplaceText(e.target.value)}
                placeholder="Substituir por (ex: R$ 10.00)"
                className="text-sm"
              />
              <Button 
                size="sm" 
                onClick={handleAddReplacement}
                disabled={!newSearchText.trim() || !newReplaceText.trim() || !config}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {!config && (
              <p className="text-xs text-amber-500 mt-2">
                Salve a configuração primeiro para adicionar regras
              </p>
            )}
          </div>

          {/* Existing replacements */}
          {replacements.length > 0 ? (
            <div className="space-y-2">
              {replacements.map((replacement) => (
                <ReplacementItem
                  key={replacement.id}
                  replacement={replacement}
                  onUpdate={updateReplacement}
                  onDelete={deleteReplacement}
                  onToggle={toggleReplacement}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma regra de substituição configurada
            </p>
          )}
        </CardContent>
      </Card>

      {/* Active Sessions */}
      {sessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sessões Ativas</CardTitle>
            <CardDescription>
              Clientes atualmente conectados ao bot via ponte
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <div>
                      <p className="font-mono text-sm">{session.client_phone}</p>
                      <p className="text-xs text-muted-foreground">
                        Última atividade: {new Date(session.last_activity_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => endSession(session.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* How it works */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Como funciona?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>1. Configure o número do bot externo acima</p>
          <p>2. Selecione uma etiqueta que ativará a ponte (ex: "🤖 Bot")</p>
          <p>3. Quando você adicionar essa etiqueta em uma conversa, as mensagens serão encaminhadas automaticamente</p>
          <p>4. O bot responde → você recebe → sistema encaminha para o cliente</p>
          <p>5. <strong>Novo!</strong> Configure regras de substituição para ajustar preços ou textos</p>
          <p>6. Para desativar, remova a etiqueta da conversa</p>
        </CardContent>
      </Card>
    </div>
  );
}
