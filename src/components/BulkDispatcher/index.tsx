import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Send, RotateCcw, Save, FolderOpen } from 'lucide-react';
import { InstanceSelector } from './InstanceSelector';
import { MessageComposer } from './MessageComposer';
import { ContactsManager, Contact } from './ContactsManager';
import { TimingConfig } from './TimingConfig';
import { SendingWindow } from './SendingWindow';
import { DispatchProgress } from './DispatchProgress';
import { useBulkDispatch, DispatchMessage } from '@/hooks/useBulkDispatch';
import { useWhatsAppInstances } from '@/hooks/useWhatsAppInstances';
import { useToast } from '@/hooks/use-toast';

export function BulkDispatcher() {
  const { toast } = useToast();
  const { instances, isLoading: instancesLoading, refetch: fetchInstances, checkNumbers } = useWhatsAppInstances();
  const {
    config,
    contacts,
    progress,
    setContacts,
    updateConfig,
    resetConfig,
    startDispatch,
    pauseDispatch,
    resumeDispatch,
    cancelDispatch,
  } = useBulkDispatch();

  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationProgress, setVerificationProgress] = useState(0);

  // Convert contacts to dispatch format
  const handleContactsChange = useCallback((newContacts: Contact[]) => {
    setContacts(newContacts.map(c => ({
      phone: c.phone,
      name: c.name,
      plan: c.plan,
      expires_at: c.expires_at,
      link: c.link,
      email: c.email,
      variables: c.variables
    })));
  }, [setContacts]);

  // Verify contacts WhatsApp numbers
  const handleVerifyContacts = useCallback(async () => {
    if (contacts.length === 0 || !config.instanceIds[0]) {
      toast({
        title: 'Aviso',
        description: 'Selecione uma instância e adicione contatos primeiro',
        variant: 'destructive'
      });
      return;
    }

    setIsVerifying(true);
    setVerificationProgress(0);

    const instance = instances.find(i => i.id === config.instanceIds[0]);
    if (!instance) {
      setIsVerifying(false);
      return;
    }

    const batchSize = 10;
    const verified: Contact[] = [];

    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);
      const phones = batch.map(c => c.phone);

      try {
        const results = await checkNumbers(instance.id, phones, true);
        
        if (results) {
          batch.forEach((contact, idx) => {
            const result = results.find(r => r.phone.includes(contact.phone.slice(-8)));
            verified.push({
              ...contact,
              isValid: result?.exists ?? undefined,
              whatsappName: result?.whatsappName
            } as Contact);
          });
        } else {
          batch.forEach(contact => {
            verified.push({ ...contact, isValid: undefined } as Contact);
          });
        }
      } catch (error) {
        batch.forEach(contact => {
          verified.push({ ...contact, isValid: undefined } as Contact);
        });
      }

      setVerificationProgress(((i + batch.length) / contacts.length) * 100);
    }

    handleContactsChange(verified);
    setIsVerifying(false);
    
    const validCount = verified.filter(c => c.isValid === true).length;
    const invalidCount = verified.filter(c => c.isValid === false).length;
    
    toast({
      title: 'Verificação Concluída',
      description: `${validCount} válidos, ${invalidCount} inválidos`,
    });
  }, [contacts, config.instanceIds, instances, checkNumbers, toast, handleContactsChange]);

  // Handle messages change
  const handleMessagesChange = useCallback((messages: DispatchMessage[]) => {
    updateConfig({ messages });
  }, [updateConfig]);

  // Validation
  const canStart = 
    config.instanceIds.length > 0 &&
    config.messages.length > 0 &&
    config.messages.some(m => m.content.trim().length > 0) &&
    contacts.length > 0 &&
    !progress.isRunning;

  const handleStart = () => {
    const selectedInstances = instances.filter(i => config.instanceIds.includes(i.id));
    startDispatch(selectedInstances);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Send className="w-6 h-6 text-primary" />
            Disparo em Massa
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure e execute disparos WhatsApp com controle total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={resetConfig}>
            <RotateCcw className="w-4 h-4 mr-1" />
            Resetar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Instance Selector */}
          <InstanceSelector
            instances={instances}
            selectedIds={config.instanceIds}
            balancingMode={config.balancingMode}
            onSelectionChange={(ids) => updateConfig({ instanceIds: ids })}
            onBalancingModeChange={(mode) => updateConfig({ balancingMode: mode })}
            onRefresh={fetchInstances}
            isLoading={instancesLoading}
          />

          {/* Message Composer */}
          <MessageComposer
            messages={config.messages}
            randomizeOrder={config.randomizeOrder}
            onMessagesChange={handleMessagesChange}
            onRandomizeChange={(randomize) => updateConfig({ randomizeOrder: randomize })}
          />

          {/* Contacts Manager */}
          <ContactsManager
            contacts={contacts.map(c => ({ ...c, isValid: undefined })) as Contact[]}
            verifyNumbers={config.verifyNumbers}
            onContactsChange={handleContactsChange}
            onVerifyChange={(verify) => updateConfig({ verifyNumbers: verify })}
            isVerifying={isVerifying}
            verificationProgress={verificationProgress}
          />

          {/* Verify Button */}
          {config.verifyNumbers && contacts.length > 0 && config.instanceIds.length > 0 && (
            <Button
              variant="outline"
              onClick={handleVerifyContacts}
              disabled={isVerifying}
              className="w-full"
            >
              {isVerifying ? 'Verificando...' : 'Verificar Números WhatsApp'}
            </Button>
          )}
        </div>

        {/* Right Column - Settings & Progress */}
        <div className="space-y-6">
          {/* Sending Window */}
          <SendingWindow
            enabled={config.businessHoursEnabled}
            startTime={config.businessHoursStart}
            endTime={config.businessHoursEnd}
            allowedDays={config.allowedDays}
            onEnabledChange={(enabled) => updateConfig({ businessHoursEnabled: enabled })}
            onStartTimeChange={(time) => updateConfig({ businessHoursStart: time })}
            onEndTimeChange={(time) => updateConfig({ businessHoursEnd: time })}
            onAllowedDaysChange={(days) => updateConfig({ allowedDays: days })}
          />

          {/* Timing Config */}
          <TimingConfig
            minDelay={config.minDelay}
            maxDelay={config.maxDelay}
            pauseAfterMessages={config.pauseAfterMessages}
            pauseDurationMinutes={config.pauseDurationMinutes}
            stopAfterMessages={config.stopAfterMessages}
            smartDelay={config.smartDelay}
            attentionCall={false}
            autoArchive={false}
            aiPersonalization={false}
            onConfigChange={(updates) => updateConfig(updates as any)}
          />

          {/* Progress */}
          <DispatchProgress
            progress={progress}
            onStart={handleStart}
            onPause={pauseDispatch}
            onResume={resumeDispatch}
            onCancel={cancelDispatch}
            canStart={canStart}
          />
        </div>
      </div>
    </div>
  );
}

export default BulkDispatcher;
