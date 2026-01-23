import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send, RotateCcw, Zap, Users, MessageSquare, Smartphone } from 'lucide-react';
import { InstanceSelector } from './InstanceSelector';
import { MessageComposer } from './MessageComposer';
import { ContactsManager, Contact, SavedContact } from './ContactsManager';
import { TimingConfig } from './TimingConfig';
import { SendingWindow } from './SendingWindow';
import { DispatchProgress } from './DispatchProgress';
import { ConfigManager } from './ConfigManager';
import { useBulkDispatch, DispatchMessage } from '@/hooks/useBulkDispatch';
import { useDispatchConfigs } from '@/hooks/useDispatchConfigs';
import { useWhatsAppInstances } from '@/hooks/useWhatsAppInstances';
import { useContactsSupabase } from '@/hooks/useContactsSupabase';
import { useToast } from '@/hooks/use-toast';

export function BulkDispatcher() {
  const { toast } = useToast();
  const { instances, isLoading: instancesLoading, refetch: fetchInstances, checkNumbers, refreshAllStatus } = useWhatsAppInstances();
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
    loadConfig,
  } = useBulkDispatch();
  
  const {
    configs: savedConfigs,
    isLoading: configsLoading,
    saveConfig,
    updateConfig: updateSavedConfig,
    deleteConfig,
    configToDispatchConfig,
  } = useDispatchConfigs();

  // Saved contacts from database - lazy load only when needed
  const {
    contacts: savedContactsRaw,
    isLoading: savedContactsLoading,
    refetch: refreshSavedContacts,
    importContacts,
    loadMoreContacts,
    pagination: savedContactsPagination,
    hasInitialLoad: savedContactsInitialized,
    searchContactsRemote,
  } = useContactsSupabase();

  // Map saved contacts to the expected format
  const [savedContacts, setSavedContacts] = useState<SavedContact[]>([]);
  const [shouldLoadSavedContacts, setShouldLoadSavedContacts] = useState(false);
  
  // Load saved contacts when tab is accessed
  useEffect(() => {
    if (shouldLoadSavedContacts && !savedContactsInitialized) {
      refreshSavedContacts();
    }
  }, [shouldLoadSavedContacts, savedContactsInitialized, refreshSavedContacts]);
  
  useEffect(() => {
    setSavedContacts(savedContactsRaw.map(c => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email || undefined,
      notes: c.notes || undefined
    })));
  }, [savedContactsRaw]);

  const [isSavingContacts, setIsSavingContacts] = useState(false);

  // Save contacts to permanent list
  const handleSaveContacts = useCallback(async (contactsToSave: { name: string; phone: string; email?: string }[]) => {
    setIsSavingContacts(true);
    try {
      await importContacts(contactsToSave.map(c => ({
        name: c.name,
        phone: c.phone,
        email: c.email || ''
      })));
      return true;
    } catch (error) {
      console.error('Error saving contacts:', error);
      return false;
    } finally {
      setIsSavingContacts(false);
    }
  }, [importContacts]);

  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationProgress, setVerificationProgress] = useState(0);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-refresh instances status every 30 seconds
  useEffect(() => {
    const autoRefresh = async () => {
      if (!isRefreshingStatus && !progress.isRunning) {
        setIsRefreshingStatus(true);
        try {
          await refreshAllStatus();
        } finally {
          setIsRefreshingStatus(false);
        }
      }
    };

    // Initial check
    autoRefresh();

    // Set up interval
    refreshIntervalRef.current = setInterval(autoRefresh, 30000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [refreshAllStatus, progress.isRunning]);

  // Manual refresh handler with loading state
  const handleManualRefresh = useCallback(async () => {
    setIsRefreshingStatus(true);
    try {
      await refreshAllStatus();
    } finally {
      setIsRefreshingStatus(false);
    }
  }, [refreshAllStatus]);

  // Convert contacts to dispatch format
  const handleContactsChange = useCallback((newContacts: Contact[]) => {
    setContacts(newContacts.map(c => ({
      phone: c.phone,
      name: c.name,
      plan: c.plan,
      expires_at: c.expires_at,
      link: c.link,
      email: c.email,
      variables: c.variables,
      originalId: c.originalId // Pass originalId to track saved contacts
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

  const handleStart = async () => {
    const selectedInstances = instances.filter(i => config.instanceIds.includes(i.id));
    await startDispatch(selectedInstances);
    // Refresh saved contacts after dispatch to reflect moved contacts
    refreshSavedContacts();
  };

  // Config management handlers
  const handleSaveConfig = useCallback(async (name: string) => {
    await saveConfig(name, config);
  }, [saveConfig, config]);

  const handleLoadConfig = useCallback((savedConfig: any) => {
    const dispatchConfig = configToDispatchConfig(savedConfig);
    loadConfig(dispatchConfig);
  }, [configToDispatchConfig, loadConfig]);

  const handleUpdateConfig = useCallback(async (id: string, name: string) => {
    await updateSavedConfig(id, name, config);
  }, [updateSavedConfig, config]);

  const handleDeleteConfig = useCallback(async (id: string) => {
    await deleteConfig(id);
  }, [deleteConfig]);

  // Stats for header
  const connectedInstances = instances.filter(i => i.status === 'connected').length;
  const totalMessages = config.messages.length;

  return (
    <div className="space-y-6 pb-8">
      {/* Premium Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-background to-accent/5 p-6 border border-white/10"
      >
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <motion.div 
              className="page-header-icon"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Send className="w-7 h-7" />
            </motion.div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold">Disparo em Massa</h2>
                <Badge className="bg-gradient-to-r from-primary/20 to-accent/20 text-primary border-primary/30">
                  <Zap className="w-3 h-3 mr-1" />
                  Premium
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Configure e execute disparos WhatsApp com controle total
              </p>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="flex items-center gap-3">
            <motion.div 
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-background/60 backdrop-blur-sm border border-white/10"
              whileHover={{ scale: 1.02 }}
            >
              <Smartphone className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-medium">{connectedInstances} conectada(s)</span>
            </motion.div>
            <motion.div 
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-background/60 backdrop-blur-sm border border-white/10"
              whileHover={{ scale: 1.02 }}
            >
              <Users className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{contacts.length} contato(s)</span>
            </motion.div>
            <motion.div 
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-background/60 backdrop-blur-sm border border-white/10"
              whileHover={{ scale: 1.02 }}
            >
              <MessageSquare className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium">{totalMessages} msg(s)</span>
            </motion.div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="relative flex items-center gap-2 mt-4 pt-4 border-t border-white/10">
          <ConfigManager
            configs={savedConfigs}
            currentConfig={config}
            isLoading={configsLoading}
            onSave={handleSaveConfig}
            onLoad={handleLoadConfig}
            onUpdate={handleUpdateConfig}
            onDelete={handleDeleteConfig}
          />
          <Button variant="outline" size="sm" onClick={resetConfig} className="gap-1.5">
            <RotateCcw className="w-4 h-4" />
            Resetar
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Configuration */}
        <motion.div 
          className="lg:col-span-2 space-y-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Instance Selector */}
          <InstanceSelector
            instances={instances}
            selectedIds={config.instanceIds}
            balancingMode={config.balancingMode}
            onSelectionChange={(ids) => updateConfig({ instanceIds: ids })}
            onBalancingModeChange={(mode) => updateConfig({ balancingMode: mode })}
            onRefresh={handleManualRefresh}
            isLoading={instancesLoading || isRefreshingStatus}
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
            savedContacts={savedContacts}
            isLoadingSaved={savedContactsLoading}
            onRefreshSaved={refreshSavedContacts}
            onSaveContacts={handleSaveContacts}
            isSaving={isSavingContacts}
            onTabChange={(tab) => {
              if (tab === 'saved') {
                setShouldLoadSavedContacts(true);
              }
            }}
            savedContactsTotal={savedContactsPagination.totalCount}
            hasMoreSavedContacts={savedContactsPagination.hasMore}
            onLoadMoreSavedContacts={loadMoreContacts}
            onSearchSavedContacts={searchContactsRemote}
          />

          {/* Verify Button */}
          {config.verifyNumbers && contacts.length > 0 && config.instanceIds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Button
                variant="outline"
                onClick={handleVerifyContacts}
                disabled={isVerifying}
                className="w-full h-12 gap-2 text-base"
              >
                {isVerifying ? 'Verificando...' : 'Verificar Números WhatsApp'}
              </Button>
            </motion.div>
          )}
        </motion.div>

        {/* Right Column - Settings & Progress */}
        <motion.div 
          className="space-y-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
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
        </motion.div>
      </div>
    </div>
  );
}

export default BulkDispatcher;
