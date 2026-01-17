import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { useClients } from '@/hooks/useClients';
import { usePlanSettings } from '@/hooks/usePlanSettings';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useContactsSupabase } from '@/hooks/useContactsSupabase';
import { useSentContacts } from '@/hooks/useSentContacts';
import { SentContactsList } from '@/components/SentContactsList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getDaysUntilExpiration } from '@/types/client';
// openWhatsApp is no longer needed - we use Uazapi API directly

// Media types (placeholder - will be reimplemented with new WhatsApp integration)
type MediaType = 'image' | 'video' | 'audio' | 'document';

interface MediaAttachment {
  file: File;
  type: MediaType;
  preview?: string;
}

const getMediaTypeFromFile = (file: File): MediaType => {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'document';
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });
};

// Send WhatsApp text message via Uazapi API
const sendWhatsAppText = async (
  phone: string,
  message: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase.functions.invoke('send-whatsapp-text', {
      body: { phone, message },
    });

    if (error) {
      console.error('Error sending WhatsApp text:', error);
      return { success: false, error: error.message };
    }

    if (!data?.success) {
      return { success: false, error: data?.error || 'Unknown error' };
    }

    return { success: true };
  } catch (err) {
    console.error('Exception sending WhatsApp text:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
};

// Send WhatsApp media via Uazapi API
const sendWhatsAppMedia = async (
  phone: string,
  base64: string,
  type: MediaType,
  filename: string,
  mimetype: string,
  caption?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase.functions.invoke('send-whatsapp-media', {
      body: {
        phone,
        mediaBase64: base64,
        mediaType: type,
        fileName: filename,
        mimetype,
        message: caption,
      },
    });

    if (error) {
      console.error('Error sending WhatsApp media:', error);
      return { success: false, error: error.message };
    }

    if (!data?.success) {
      return { success: false, error: data?.error || 'Unknown error' };
    }

    return { success: true };
  } catch (err) {
    console.error('Exception sending WhatsApp media:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
};
import {
  Zap,
  Send,
  MessageCircle,
  Mail,
  Users,
  Calendar as CalendarIcon,
  Clock,
  Filter,
  Loader2,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Phone,
  Plus,
  X,
  UserPlus,
  Save,
  Copy,
  Shuffle,
  FolderOpen,
  Trash2,
  Upload,
  FileSpreadsheet,
  Sun,
  Moon,
  Sparkles,
  Eye,
  RefreshCw,
  FileText,
  Image,
  Video,
  Music,
  File,
  Paperclip,
  Pause,
  Play,
  Timer,
  Settings2
} from 'lucide-react';

interface PhoneGroup {
  id: string;
  name: string;
  phone_numbers: string[];
  created_at: string;
}

type MessageMode = 'whatsapp' | 'email';
type SendMode = 'immediate' | 'scheduled';
type TargetMode = 'clients' | 'numbers' | 'contacts' | 'sent';
type ClientFilter = 'all' | 'expiring7' | 'expiring3' | 'expiring1' | 'expired';

const filterLabels: Record<ClientFilter, string> = {
  all: 'Todos os clientes',
  expiring7: 'Vencendo em 7 dias',
  expiring3: 'Vencendo em 3 dias',
  expiring1: 'Vencendo amanhã',
  expired: 'Já vencidos',
};

const defaultMessage = `Olá! 👋

Temos uma oferta especial para você!

Entre em contato para saber mais. 😊`;

const defaultClientMessage = `Olá {nome}! 👋

Seu plano *{plano}* vence em *{dias} dia(s)* ({vencimento}).

Aproveite para renovar com antecedência e garantir a continuidade dos serviços!

Qualquer dúvida, estamos à disposição. 😊`;

// Random auto-replies for the preview
const autoReplies = [
  "Obrigado pela mensagem! Vou verificar agora. 👍",
  "Ótimo, já estou providenciando! 😊",
  "Perfeito! Qualquer coisa é só chamar. ✅",
  "Recebi! Vou analisar e já te respondo. 📩",
  "Maravilha! Agradeço o contato! 🙌",
  "Entendido! Vou dar uma olhada aqui. 🔍",
  "Top! Já vou resolver isso pra você. 💪",
  "Anotado! Em breve te dou um retorno. 📝",
  "Show! Muito obrigado pelo aviso! 🎉",
  "Beleza! Fico no aguardo então. ⏳",
];

const getRandomReply = () => {
  return autoReplies[Math.floor(Math.random() * autoReplies.length)];
};

// Message variation templates
interface VariationTemplate {
  id: string;
  name: string;
  category: 'renewal' | 'promotion' | 'welcome' | 'general';
  variations: string[];
}

const variationTemplates: VariationTemplate[] = [
  {
    id: 'renewal-friendly',
    name: 'Renovação Amigável',
    category: 'renewal',
    variations: [
      `Olá {nome}! 👋\n\nSeu plano *{plano}* vence em *{dias} dia(s)* ({vencimento}).\n\nRenove agora para continuar aproveitando! 😊`,
      `Oi {nome}! 💫\n\nPassando pra lembrar: seu plano *{plano}* expira em *{dias} dia(s)*.\n\nQualquer dúvida, estou aqui! 🙌`,
      `E aí, {nome}! 🌟\n\nSeu *{plano}* tá chegando ao fim ({dias} dias).\n\nVamos renovar? Conte comigo! ✨`,
      `{nome}, tudo bem? 👋\n\nSó um lembrete: *{plano}* vence dia {vencimento}.\n\nMe chama se precisar de ajuda! 💪`,
      `Oi {nome}! 🚀\n\nSeu plano *{plano}* vence em breve ({dias} dias).\n\nGarantir a renovação? É rapidinho! ⚡`,
    ]
  },
  {
    id: 'renewal-urgent',
    name: 'Renovação Urgente',
    category: 'renewal',
    variations: [
      `⚠️ {nome}, atenção!\n\nSeu plano *{plano}* vence em *{dias} dia(s)*!\n\nRenove agora para não perder acesso. 🔐`,
      `🚨 Olá {nome}!\n\nÚltimos *{dias} dia(s)* do seu *{plano}*!\n\nNão deixe expirar - renove já! ⏰`,
      `❗ {nome}, urgente!\n\nPlano *{plano}* expira em {dias} dia(s).\n\nEvite interrupção, renove agora! 🔄`,
      `⏳ {nome}, corre!\n\n*{plano}* vence {vencimento}.\n\nGaranta sua renovação antes que expire! 💨`,
      `🔔 Atenção {nome}!\n\n*{dias} dia(s)* para o *{plano}* expirar.\n\nRenove hoje e continue com a gente! ✅`,
    ]
  },
  {
    id: 'promotion-discount',
    name: 'Promoção com Desconto',
    category: 'promotion',
    variations: [
      `🔥 {nome}, PROMOÇÃO!\n\nRenove seu *{plano}* HOJE e ganhe desconto especial!\n\nApenas para você! 🎁`,
      `💰 Opa {nome}!\n\nCondição exclusiva pra renovação do *{plano}*!\n\nVálido só hoje, aproveita! 🚀`,
      `🎉 {nome}, temos novidade!\n\nDesconto IMPERDÍVEL no *{plano}*!\n\nNão perca essa oportunidade! ⭐`,
      `✨ Oferta especial {nome}!\n\nRenovando o *{plano}* agora você economiza!\n\nChama pra saber mais! 💬`,
      `🏷️ {nome}, exclusivo pra você!\n\nPromo especial no *{plano}*!\n\nVálido por tempo limitado! ⏰`,
    ]
  },
  {
    id: 'welcome-new',
    name: 'Boas-vindas',
    category: 'welcome',
    variations: [
      `🎊 Bem-vindo(a), {nome}!\n\nSeu *{plano}* já está ativo!\n\nDúvidas? Estou à disposição! 😊`,
      `✨ Olá {nome}, seja muito bem-vindo(a)!\n\n*{plano}* liberado com sucesso!\n\nConte comigo! 🙌`,
      `🚀 {nome}, tudo pronto!\n\nSeu *{plano}* está funcionando!\n\nAproveite ao máximo! 💪`,
      `🎉 Parabéns {nome}!\n\n*{plano}* ativado!\n\nQualquer coisa, me chama! 📱`,
      `👋 Oi {nome}!\n\nBem-vindo(a) ao *{plano}*!\n\nVamos juntos nessa! 🌟`,
    ]
  },
  {
    id: 'general-contact',
    name: 'Contato Geral',
    category: 'general',
    variations: [
      `Olá! 👋\n\nTemos uma oferta especial para você!\n\nEntre em contato para saber mais. 😊`,
      `Oi! 🌟\n\nPassando pra te apresentar nossos serviços!\n\nPosso ajudar? 💬`,
      `E aí! 🚀\n\nTemos novidades incríveis!\n\nQuer saber mais? Me chama! ✨`,
      `Olá! ✨\n\nOportunidade exclusiva disponível!\n\nVamos conversar? 📱`,
      `Oi! 💫\n\nConheça nossas soluções!\n\nEstou aqui para ajudar! 🙌`,
    ]
  }
];

const categoryLabels: Record<string, string> = {
  renewal: '🔄 Renovação',
  promotion: '🎁 Promoção',
  welcome: '👋 Boas-vindas',
  general: '💬 Geral'
};

export function BulkDispatcher({ onComplete }: { onComplete?: () => void }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { clients } = useClients();
  const { getPlanName } = usePlanSettings();
  const { contacts, refetch: refetchContacts } = useContactsSupabase();
  const { moveContactsToSent, getSentPhoneNumbers, sentContacts } = useSentContacts();
  
  const [messageMode, setMessageMode] = useState<MessageMode>('whatsapp');
  const [sendMode, setSendMode] = useState<SendMode>('immediate');
  const [targetMode, setTargetMode] = useState<TargetMode>(() => {
    const target = searchParams.get('target');
    if (target === 'contacts' || target === 'numbers' || target === 'clients' || target === 'sent') {
      return target as TargetMode;
    }
    return 'clients';
  });
  const [clientFilter, setClientFilter] = useState<ClientFilter>('expiring7');
  const [customMessage, setCustomMessage] = useState(defaultClientMessage);
  
  // Clear URL params after reading
  useEffect(() => {
    if (searchParams.get('target')) {
      searchParams.delete('target');
      setSearchParams(searchParams, { replace: true });
    }
  }, []);
  
  // Message variations system
  const [useVariations, setUseVariations] = useState(false);
  const [messageVariations, setMessageVariations] = useState<string[]>([defaultClientMessage]);
  const [showVariationsPanel, setShowVariationsPanel] = useState(false);
  const [showTemplatesPanel, setShowTemplatesPanel] = useState(false);
  const [previewVariationMessage, setPreviewVariationMessage] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [showClientList, setShowClientList] = useState(false);
  
  // Custom numbers state
  const [phoneNumbers, setPhoneNumbers] = useState<string[]>([]);
  const [newNumber, setNewNumber] = useState('');
  
  // Personal contacts state
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [showContactList, setShowContactList] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [contactsDisplayLimit, setContactsDisplayLimit] = useState(50);
  
  // Groups state
  const [phoneGroups, setPhoneGroups] = useState<PhoneGroup[]>([]);
  const [showSaveGroupDialog, setShowSaveGroupDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [savingGroup, setSavingGroup] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  
  // Media attachments state
  const [mediaAttachments, setMediaAttachments] = useState<MediaAttachment[]>([]);
  const [useMediaMode, setUseMediaMode] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  
  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Preview state
  const [previewTheme, setPreviewTheme] = useState<'dark' | 'light'>('dark');
  const [showTypingAnimation, setShowTypingAnimation] = useState(true);
  const [showMessageSent, setShowMessageSent] = useState(false);
  const [showReplyAnimation, setShowReplyAnimation] = useState(false);
  const [showReplyMessage, setShowReplyMessage] = useState(false);
  const [currentReply, setCurrentReply] = useState('');

  // Play send sound effect
  const playSendSound = () => {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    
    // Create a "pop" sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
  };

  const handlePreviewSend = () => {
    playSendSound();
    
    // Haptic feedback (vibration)
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    setShowMessageSent(true);
    setShowTypingAnimation(false);
    setShowReplyMessage(false);
    
    // After 1s, show reply typing animation
    setTimeout(() => {
      setShowMessageSent(false);
      setShowReplyAnimation(true);
    }, 1000);
    
    // After 2.5s, show reply message with random reply
    setTimeout(() => {
      setShowReplyAnimation(false);
      setCurrentReply(getRandomReply());
      setShowReplyMessage(true);
      // Play receive sound
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.05);
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
      if (navigator.vibrate) navigator.vibrate(30);
    }, 2500);
    
    // After 5s, reset to initial state
    setTimeout(() => {
      setShowReplyMessage(false);
      setShowTypingAnimation(true);
    }, 5000);
  };
  
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
  
  // WhatsApp connection status
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    phone?: string;
    name?: string;
    loading: boolean;
    error?: string;
    lastChecked?: Date;
  }>({ connected: false, loading: true });
  
  const statusRetryCount = useRef(0);
  const maxRetries = 3;

  // Check WhatsApp connection status - silent error handling
  const checkConnectionStatus = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setConnectionStatus(prev => ({ ...prev, loading: true }));
    }
    
    try {
      const { data, error } = await supabase.functions.invoke('uazapi-status');
      
      if (error) {
        // Silent fail - just log to console, don't show error to user
        console.warn('Status check failed:', error.message);
        statusRetryCount.current++;
        
        // Only update error state after max retries
        if (statusRetryCount.current >= maxRetries) {
          setConnectionStatus(prev => ({ 
            ...prev, 
            loading: false, 
            error: 'Não foi possível verificar',
            lastChecked: new Date()
          }));
        }
        return;
      }
      
      // Reset retry count on success
      statusRetryCount.current = 0;
      
      setConnectionStatus({
        connected: data?.connected || false,
        phone: data?.phone,
        name: data?.name,
        loading: false,
        error: data?.error,
        lastChecked: new Date()
      });
    } catch (err) {
      // Silent fail - only log, don't show toast or update UI aggressively
      console.warn('Status check exception:', err);
      statusRetryCount.current++;
      
      if (statusRetryCount.current >= maxRetries) {
        setConnectionStatus(prev => ({ 
          ...prev, 
          loading: false,
          lastChecked: new Date()
        }));
      }
    }
  }, []);

  // Check connection on mount and periodically (less frequently)
  useEffect(() => {
    checkConnectionStatus(true);
    const interval = setInterval(() => checkConnectionStatus(false), 120000); // Check every 2 minutes
    return () => clearInterval(interval);
  }, [checkConnectionStatus]);
  
  // Delay and pause control
  const [delaySecondsInput, setDelaySecondsInput] = useState('3');
  const [pauseAfterCountInput, setPauseAfterCountInput] = useState('10');
  const [enableAutoPause, setEnableAutoPause] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const pauseRef = useRef(false);
  const abortRef = useRef(false);
  const sendStartTime = useRef<number>(0);
  const pauseCount = useRef<number>(0);

  // Computed values from inputs
  const delaySeconds = parseInt(delaySecondsInput) || 1;
  const pauseAfterCount = parseInt(pauseAfterCountInput) || 0;

  // Sound effect functions
  const playPauseSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      
      // Create a "ding" sound for pause
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(523, audioContext.currentTime); // C5
      oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1); // E5
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
      
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    } catch (e) {
      console.log('Audio not supported');
    }
  };

  const playCompleteSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      
      // Create a "success" melody
      const now = audioContext.currentTime;
      
      // First note - C5
      const osc1 = audioContext.createOscillator();
      const gain1 = audioContext.createGain();
      osc1.connect(gain1);
      gain1.connect(audioContext.destination);
      osc1.frequency.setValueAtTime(523, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc1.start(now);
      osc1.stop(now + 0.15);
      
      // Second note - E5
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.frequency.setValueAtTime(659, now + 0.15);
      gain2.gain.setValueAtTime(0.3, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.3);
      
      // Third note - G5
      const osc3 = audioContext.createOscillator();
      const gain3 = audioContext.createGain();
      osc3.connect(gain3);
      gain3.connect(audioContext.destination);
      osc3.frequency.setValueAtTime(784, now + 0.3);
      gain3.gain.setValueAtTime(0.3, now + 0.3);
      gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc3.start(now + 0.3);
      osc3.stop(now + 0.5);
      
      if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
    } catch (e) {
      console.log('Audio not supported');
    }
  };

  // Update ref when state changes
  useEffect(() => {
    pauseRef.current = isPaused;
  }, [isPaused]);

  // Wait function that respects pause state
  const waitWithPause = async (ms: number): Promise<boolean> => {
    const interval = 100; // Check every 100ms
    let elapsed = 0;
    
    while (elapsed < ms) {
      if (abortRef.current) return false; // Aborted
      
      if (pauseRef.current) {
        // While paused, keep checking but don't count time
        await new Promise(resolve => setTimeout(resolve, interval));
        continue;
      }
      
      await new Promise(resolve => setTimeout(resolve, interval));
      elapsed += interval;
    }
    
    return true; // Completed
  };

  // Auto pause function
  const checkAutoPause = async (currentIndex: number): Promise<boolean> => {
    if (!enableAutoPause || pauseAfterCount <= 0) return true;
    
    // Check if we should pause (every X messages, starting after the first batch)
    if ((currentIndex + 1) % pauseAfterCount === 0 && currentIndex > 0) {
      setIsPaused(true);
      pauseRef.current = true;
      pauseCount.current++;
      playPauseSound();
      toast.info(`Pausa automática após ${pauseAfterCount} mensagens. Clique em "Continuar" para prosseguir.`);
      
      // Wait until unpaused or aborted
      while (pauseRef.current && !abortRef.current) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (abortRef.current) return false;
    }
    
    return true;
  };

  const handlePauseToggle = () => {
    setIsPaused(!isPaused);
  };

  const handleAbort = () => {
    abortRef.current = true;
    setIsPaused(false);
  };

  // Load phone groups
  const fetchPhoneGroups = async () => {
    if (!user) return;
    setLoadingGroups(true);
    try {
      const { data, error } = await supabase
        .from('phone_groups')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPhoneGroups(data || []);
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoadingGroups(false);
    }
  };

  useEffect(() => {
    fetchPhoneGroups();
  }, [user]);

  // Update message template when target mode changes
  useEffect(() => {
    if (targetMode === 'numbers' || targetMode === 'contacts') {
      setCustomMessage(defaultMessage);
      setMessageVariations([defaultMessage]);
      setMessageMode('whatsapp'); // Force WhatsApp for custom numbers and contacts
    } else {
      setCustomMessage(defaultClientMessage);
      setMessageVariations([defaultClientMessage]);
    }
    setUseVariations(false);
  }, [targetMode]);

  // Message variation functions
  const addVariation = () => {
    if (messageVariations.length >= 10) {
      toast.error('Máximo de 10 variações permitidas');
      return;
    }
    setMessageVariations([...messageVariations, '']);
  };

  const updateVariation = (index: number, value: string) => {
    const updated = [...messageVariations];
    updated[index] = value;
    setMessageVariations(updated);
    // Update main message with first variation
    if (index === 0) {
      setCustomMessage(value);
    }
  };

  const removeVariation = (index: number) => {
    if (messageVariations.length <= 1) {
      toast.error('Você precisa de pelo menos uma mensagem');
      return;
    }
    const updated = messageVariations.filter((_, i) => i !== index);
    setMessageVariations(updated);
    // Update main message if first was removed
    if (index === 0) {
      setCustomMessage(updated[0]);
    }
  };

  const duplicateVariation = (index: number) => {
    if (messageVariations.length >= 10) {
      toast.error('Máximo de 10 variações permitidas');
      return;
    }
    const updated = [...messageVariations];
    updated.splice(index + 1, 0, messageVariations[index]);
    setMessageVariations(updated);
  };

  const getRandomVariation = (): string => {
    const validVariations = messageVariations.filter(v => v.trim() !== '');
    if (validVariations.length === 0) return customMessage;
    return validVariations[Math.floor(Math.random() * validVariations.length)];
  };

  // Apply a template to message variations
  const applyTemplate = (template: VariationTemplate) => {
    const variations = targetMode === 'numbers' 
      ? template.variations.map(v => v.replace(/{nome}|{plano}|{dias}|{vencimento}/g, '').trim())
      : template.variations;
    setMessageVariations(variations);
    setCustomMessage(variations[0]);
    setUseVariations(true);
    setShowTemplatesPanel(false);
    toast.success(`Template "${template.name}" aplicado com ${variations.length} variações`);
  };

  // Refresh random variation preview
  const refreshPreviewVariation = () => {
    const variation = getRandomVariation();
    setPreviewVariationMessage(variation);
  };

  // Media attachment functions
  const handleMediaUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newAttachments: MediaAttachment[] = [];
    
    Array.from(files).forEach(file => {
      // Check file size (max 16MB for WhatsApp)
      if (file.size > 16 * 1024 * 1024) {
        toast.error(`Arquivo "${file.name}" excede o limite de 16MB`);
        return;
      }

      const mediaType = getMediaTypeFromFile(file);
      
      // Create preview for images and videos
      let preview: string | undefined;
      if (mediaType === 'image' || mediaType === 'video') {
        preview = URL.createObjectURL(file);
      }

      newAttachments.push({ file, type: mediaType, preview });
    });

    if (newAttachments.length > 0) {
      // Allow multiple media attachments as variations (max 10)
      setMediaAttachments(prev => {
        const combined = [...prev, ...newAttachments];
        if (combined.length > 10) {
          toast.error('Máximo de 10 variações de mídia');
          return combined.slice(0, 10);
        }
        return combined;
      });
      setUseMediaMode(true);
      toast.success(`${newAttachments.length} mídia(s) anexada(s)`);
    }

    // Reset input
    if (mediaInputRef.current) {
      mediaInputRef.current.value = '';
    }
  };

  const removeMediaAttachment = (index: number) => {
    setMediaAttachments(prev => {
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length === 0) {
        setUseMediaMode(false);
      }
      return updated;
    });
  };

  const getRandomMediaAttachment = (): MediaAttachment | undefined => {
    if (mediaAttachments.length === 0) return undefined;
    return mediaAttachments[Math.floor(Math.random() * mediaAttachments.length)];
  };

  const getMediaIcon = (type: MediaType) => {
    switch (type) {
      case 'image': return <Image className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'audio': return <Music className="h-4 w-4" />;
      case 'document': return <File className="h-4 w-4" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Filter clients based on selection - memoized for performance
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const days = getDaysUntilExpiration(client.expiresAt);
      switch (clientFilter) {
        case 'expiring7': return days >= 0 && days <= 7;
        case 'expiring3': return days >= 0 && days <= 3;
        case 'expiring1': return days >= 0 && days <= 1;
        case 'expired': return days < 0;
        default: return true;
      }
    });
  }, [clients, clientFilter]);

  // Auto-select all filtered clients when filter changes
  useEffect(() => {
    setSelectedClientIds(new Set(filteredClients.map(c => c.id)));
  }, [filteredClients]);

  const toggleClient = (id: string) => {
    setSelectedClientIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = () => setSelectedClientIds(new Set(filteredClients.map(c => c.id)));
  const deselectAll = () => setSelectedClientIds(new Set());

  // Personal contacts management - memoized filter for performance
  const filteredContacts = useMemo(() => {
    if (!contactSearch.trim()) return contacts;
    const lower = contactSearch.toLowerCase();
    return contacts.filter(contact => 
      contact.name.toLowerCase().includes(lower) ||
      contact.phone.includes(contactSearch)
    );
  }, [contacts, contactSearch]);

  // Limit displayed contacts to avoid browser freeze
  const displayedContacts = useMemo(() => 
    filteredContacts.slice(0, contactsDisplayLimit), 
    [filteredContacts, contactsDisplayLimit]
  );
  const hasMoreContacts = filteredContacts.length > contactsDisplayLimit;

  const toggleContact = (id: string) => {
    setSelectedContactIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAllContacts = () => setSelectedContactIds(new Set(filteredContacts.map(c => c.id)));
  const deselectAllContacts = () => setSelectedContactIds(new Set());

  // Batch selection - memoized callback for performance
  const selectNextBatch = useCallback((batchSize: number) => {
    setSelectedContactIds(prev => {
      const newSet = new Set(prev);
      let added = 0;
      for (const contact of filteredContacts) {
        if (added >= batchSize) break;
        if (!newSet.has(contact.id)) {
          newSet.add(contact.id);
          added++;
        }
      }
      return newSet;
    });
  }, [filteredContacts]);
  
  const loadMoreContacts = () => {
    setContactsDisplayLimit(prev => prev + 50);
  };

  // Phone number management
  const addPhoneNumber = () => {
    const cleaned = newNumber.replace(/\D/g, '');
    if (cleaned.length < 10) {
      toast.error('Número inválido. Use formato: DDD + número');
      return;
    }
    if (phoneNumbers.includes(cleaned)) {
      toast.error('Número já adicionado');
      return;
    }
    setPhoneNumbers(prev => [...prev, cleaned]);
    setNewNumber('');
  };

  const removePhoneNumber = (number: string) => {
    setPhoneNumbers(prev => prev.filter(n => n !== number));
  };

  const formatPhoneDisplay = (number: string) => {
    if (number.length === 11) {
      return `(${number.slice(0, 2)}) ${number.slice(2, 7)}-${number.slice(7)}`;
    }
    if (number.length === 10) {
      return `(${number.slice(0, 2)}) ${number.slice(2, 6)}-${number.slice(6)}`;
    }
    return number;
  };

  const parseNumbersFromText = (text: string) => {
    const numbers = text.split(/[\n,;]+/).map(n => n.replace(/\D/g, '')).filter(n => n.length >= 10);
    const uniqueNumbers = [...new Set([...phoneNumbers, ...numbers])];
    setPhoneNumbers(uniqueNumbers);
    toast.success(`${numbers.length} número(s) adicionado(s)`);
  };

  // Group management
  const saveCurrentAsGroup = async () => {
    if (!user || !newGroupName.trim() || phoneNumbers.length === 0) return;
    
    setSavingGroup(true);
    try {
      const { error } = await supabase.from('phone_groups').insert({
        user_id: user.id,
        name: newGroupName.trim(),
        phone_numbers: phoneNumbers,
      });
      
      if (error) throw error;
      
      toast.success('Grupo salvo com sucesso!');
      setNewGroupName('');
      setShowSaveGroupDialog(false);
      fetchPhoneGroups();
    } catch (error) {
      console.error('Error saving group:', error);
      toast.error('Erro ao salvar grupo');
    } finally {
      setSavingGroup(false);
    }
  };

  const loadGroup = (groupId: string) => {
    const group = phoneGroups.find(g => g.id === groupId);
    if (group) {
      setPhoneNumbers(group.phone_numbers);
      setSelectedGroupId(groupId);
      toast.success(`Grupo "${group.name}" carregado`);
    }
  };

  const deleteGroup = async (groupId: string) => {
    try {
      const { error } = await supabase
        .from('phone_groups')
        .delete()
        .eq('id', groupId);
      
      if (error) throw error;
      
      toast.success('Grupo excluído');
      fetchPhoneGroups();
      if (selectedGroupId === groupId) {
        setSelectedGroupId('');
      }
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('Erro ao excluir grupo');
    }
  };

  // File import
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'csv' || fileExtension === 'txt') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const numbers = extractNumbersFromText(text);
        const uniqueNumbers = [...new Set([...phoneNumbers, ...numbers])];
        setPhoneNumbers(uniqueNumbers);
        toast.success(`${numbers.length} número(s) importado(s) do arquivo`);
      };
      reader.readAsText(file);
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      // For Excel files, use XLSX library to properly parse
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const workbook = XLSX.read(buffer, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          
          // Convert sheet to text to extract numbers
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' }) as any[][];
          const allText = jsonData.flat().join(' ');
          
          const numbers = extractNumbersFromText(allText);
          if (numbers.length > 0) {
            const uniqueNumbers = [...new Set([...phoneNumbers, ...numbers])];
            setPhoneNumbers(uniqueNumbers);
            toast.success(`${numbers.length} número(s) importado(s) do arquivo Excel`);
          } else {
            toast.error('Nenhum número de telefone encontrado no arquivo.');
          }
        } catch (error) {
          console.error('Error reading Excel file:', error);
          toast.error('Erro ao ler arquivo Excel.');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      toast.error('Formato não suportado. Use CSV, TXT ou Excel.');
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const extractNumbersFromText = (text: string): string[] => {
    // Extract phone numbers using regex patterns
    const phonePattern = /\b\d{10,11}\b/g;
    const formattedPattern = /\(?\d{2}\)?[\s.-]?\d{4,5}[\s.-]?\d{4}/g;
    
    const matches1 = text.match(phonePattern) || [];
    const matches2 = (text.match(formattedPattern) || []).map(n => n.replace(/\D/g, ''));
    
    const allMatches = [...matches1, ...matches2];
    return [...new Set(allMatches)].filter(n => n.length >= 10 && n.length <= 11);
  };

  const handleSend = async () => {
    if (targetMode === 'clients' && selectedClientIds.size === 0) {
      toast.error('Selecione pelo menos um cliente');
      return;
    }

    if (targetMode === 'numbers' && phoneNumbers.length === 0) {
      toast.error('Adicione pelo menos um número');
      return;
    }

    if (targetMode === 'contacts' && selectedContactIds.size === 0) {
      toast.error('Selecione pelo menos um contato');
      return;
    }

    if (sendMode === 'scheduled' && !scheduledDate) {
      toast.error('Selecione uma data para o agendamento');
      return;
    }

    // Check WhatsApp connection for immediate WhatsApp sends
    if (messageMode === 'whatsapp' && sendMode === 'immediate' && !connectionStatus.connected) {
      toast.error('WhatsApp não está conectado. Verifique a conexão antes de enviar.');
      checkConnectionStatus();
      return;
    }

    // Reset abort and pause flags
    abortRef.current = false;
    setIsPaused(false);
    sendStartTime.current = Date.now();
    pauseCount.current = 0;

    if (targetMode === 'numbers' || targetMode === 'contacts') {
      // Get phone numbers from either custom numbers or personal contacts
      const numbersToSend = targetMode === 'numbers' 
        ? phoneNumbers 
        : contacts.filter(c => selectedContactIds.has(c.id)).map(c => c.phone.replace(/\D/g, ''));

      // Send to custom phone numbers or personal contacts
      setIsSending(true);
      setProgress({ current: 0, total: numbersToSend.length, success: 0, failed: 0 });

      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < numbersToSend.length; i++) {
        // Check if aborted
        if (abortRef.current) {
          toast.info(`Envio cancelado. ${successCount} enviado(s), ${failCount} falha(s)`);
          break;
        }

        const number = numbersToSend[i];
        const messageToSend = useVariations ? getRandomVariation() : customMessage;
        
        if (useMediaMode && mediaAttachments.length > 0) {
          // Get random media variation
          const randomMedia = getRandomMediaAttachment()!;
          try {
            const mediaBase64 = await fileToBase64(randomMedia.file);
            const result = await sendWhatsAppMedia(
              number,
              mediaBase64,
              randomMedia.type,
              randomMedia.file.name,
              randomMedia.file.type,
              messageToSend || undefined
            );
            if (result.success) {
              successCount++;
            } else {
              failCount++;
            }
          } catch {
            failCount++;
          }
        } else {
          // Send text message via API
          const result = await sendWhatsAppText(number, messageToSend);
          if (result.success) {
            successCount++;
          } else {
            console.error(`Failed to send to ${number}:`, result.error);
            failCount++;
          }
        }
        
        setProgress({ current: i + 1, total: numbersToSend.length, success: successCount, failed: failCount });

        // Check for auto-pause
        const shouldContinueAfterPause = await checkAutoPause(i);
        if (!shouldContinueAfterPause) {
          toast.info(`Envio cancelado. ${successCount} enviado(s), ${failCount} falha(s)`);
          break;
        }

        // Wait with delay (respects pause) - skip delay on last item
        if (i < numbersToSend.length - 1) {
          const shouldContinue = await waitWithPause(delaySeconds * 1000);
          if (!shouldContinue) {
            toast.info(`Envio cancelado. ${successCount} enviado(s), ${failCount} falha(s)`);
            break;
          }
        }
      }

      // Save to history with detailed info
      const sendDuration = Math.round((Date.now() - sendStartTime.current) / 1000);
      if (!abortRef.current) {
        await supabase.from('bulk_dispatch_history').insert({
          user_id: user!.id,
          dispatch_type: 'whatsapp',
          target_type: targetMode === 'contacts' ? 'contacts' : 'numbers',
          total_recipients: numbersToSend.length,
          success_count: successCount,
          failed_count: failCount,
          message_content: customMessage,
          phone_group_id: targetMode === 'numbers' ? (selectedGroupId || null) : null,
          metadata: {
            delay_seconds: delaySeconds,
            pause_after_count: pauseAfterCount,
            auto_pause_enabled: enableAutoPause,
            total_pauses: pauseCount.current,
            send_duration_seconds: sendDuration,
            had_media: useMediaMode,
            variations_used: useVariations,
            variations_count: useVariations ? messageVariations.length : 0,
          },
        });

        // Move sent contacts to sent_contacts table (only for personal contacts mode)
        if (targetMode === 'contacts' && successCount > 0) {
          const sentContactsList = contacts
            .filter(c => selectedContactIds.has(c.id))
            .map(c => ({
              id: c.id,
              name: c.name,
              phone: c.phone,
              email: c.email,
              notes: c.notes,
            }));
          
          await moveContactsToSent(sentContactsList);
          setSelectedContactIds(new Set());
          refetchContacts();
          toast.info(`${sentContactsList.length} contato(s) movido(s) para "Contatos Enviados"`);
        }

        // Play completion sound
        playCompleteSound();

        const recipientLabel = targetMode === 'contacts' ? 'contato(s)' : 'número(s)';
        if (useMediaMode) {
          if (successCount > 0) toast.success(`${successCount} mídia(s) enviada(s) em ${sendDuration}s!`);
          if (failCount > 0) toast.error(`${failCount} envio(s) falhou(aram)`);
        } else {
          toast.success(`${successCount} mensagem(ns) enviada(s) via API em ${sendDuration}s!`);
        }
      }
      
      setIsSending(false);
      setIsPaused(false);
      onComplete?.();
      return;
    }

    // Original client-based logic
    const selectedClients = clients.filter(c => selectedClientIds.has(c.id));
    setIsSending(true);
    setProgress({ current: 0, total: selectedClients.length, success: 0, failed: 0 });

    if (sendMode === 'scheduled') {
      // Schedule messages
      const [hours, minutes] = scheduledTime.split(':').map(Number);
      const scheduledAt = new Date(scheduledDate!);
      scheduledAt.setHours(hours, minutes, 0, 0);

      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < selectedClients.length; i++) {
        const client = selectedClients[i];
        try {
          // Use random variation if enabled
          const messageToSchedule = useVariations ? getRandomVariation() : customMessage;
          const { error } = await supabase.from('scheduled_messages').insert({
            user_id: user!.id,
            client_id: client.id,
            message_type: messageMode,
            custom_message: messageToSchedule,
            scheduled_at: scheduledAt.toISOString(),
            status: 'pending',
          });

          if (error) throw error;
          successCount++;
        } catch {
          failCount++;
        }
        setProgress({ current: i + 1, total: selectedClients.length, success: successCount, failed: failCount });
      }

      toast.success(`${successCount} mensagem(ns) agendada(s) para ${format(scheduledAt, "dd/MM 'às' HH:mm")}`);
    } else {
      // Immediate send
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < selectedClients.length; i++) {
        // Check if aborted
        if (abortRef.current) {
          toast.info(`Envio cancelado. ${successCount} enviado(s), ${failCount} falha(s)`);
          break;
        }

        const client = selectedClients[i];
        const planName = getPlanName(client.plan);
        const daysRemaining = getDaysUntilExpiration(client.expiresAt);
        const expiresAtFormatted = format(client.expiresAt, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

        // Use random variation if enabled
        const baseMessage = useVariations ? getRandomVariation() : customMessage;
        const personalizedMessage = baseMessage
          .replace(/{nome}/g, client.name)
          .replace(/{plano}/g, planName)
          .replace(/{dias}/g, String(Math.abs(daysRemaining)))
          .replace(/{vencimento}/g, expiresAtFormatted);

        if (messageMode === 'whatsapp') {
          if (useMediaMode && mediaAttachments.length > 0) {
            // Get random media variation
            const randomMedia = getRandomMediaAttachment()!;
            try {
              const mediaBase64 = await fileToBase64(randomMedia.file);
              const result = await sendWhatsAppMedia(
                client.whatsapp,
                mediaBase64,
                randomMedia.type,
                randomMedia.file.name,
                randomMedia.file.type,
                personalizedMessage || undefined
              );
              if (result.success) {
                successCount++;
              } else {
                failCount++;
              }
            } catch {
              failCount++;
            }
          } else {
            // Send text message via API
            const result = await sendWhatsAppText(client.whatsapp, personalizedMessage);
            if (result.success) {
              successCount++;
            } else {
              console.error(`Failed to send to ${client.whatsapp}:`, result.error);
              failCount++;
            }
          }
        } else {
          try {
            const { error } = await supabase.functions.invoke('send-expiration-reminder', {
              body: {
                clientId: client.id,
                clientName: client.name,
                clientEmail: client.email,
                planName,
                daysRemaining,
                expiresAt: expiresAtFormatted,
              },
            });

            if (error) throw error;
            successCount++;

            // Record notification
            await supabase.from('notification_history').insert({
              client_id: client.id,
              user_id: user!.id,
              notification_type: 'email',
              subject: `Lembrete de vencimento - ${planName}`,
              status: 'sent',
              days_until_expiration: daysRemaining,
            });
          } catch {
            failCount++;
          }
        }
        setProgress({ current: i + 1, total: selectedClients.length, success: successCount, failed: failCount });

        // Check for auto-pause
        const shouldContinueAfterPause = await checkAutoPause(i);
        if (!shouldContinueAfterPause) {
          toast.info(`Envio cancelado. ${successCount} enviado(s), ${failCount} falha(s)`);
          break;
        }

        // Wait with delay (respects pause) - skip delay on last item
        if (i < selectedClients.length - 1) {
          const shouldContinue = await waitWithPause(delaySeconds * 1000);
          if (!shouldContinue) {
            toast.info(`Envio cancelado. ${successCount} enviado(s), ${failCount} falha(s)`);
            break;
          }
        }
      }

      // Save to history with detailed info
      const sendDuration = Math.round((Date.now() - sendStartTime.current) / 1000);
      if (!abortRef.current) {
        await supabase.from('bulk_dispatch_history').insert({
          user_id: user!.id,
          dispatch_type: messageMode,
          target_type: 'clients',
          total_recipients: selectedClients.length,
          success_count: successCount,
          failed_count: failCount,
          message_content: customMessage,
          client_filter: clientFilter,
          metadata: {
            delay_seconds: delaySeconds,
            pause_after_count: pauseAfterCount,
            auto_pause_enabled: enableAutoPause,
            total_pauses: pauseCount.current,
            send_duration_seconds: sendDuration,
            had_media: useMediaMode,
            variations_used: useVariations,
            variations_count: useVariations ? messageVariations.length : 0,
            media_count: mediaAttachments.length,
          },
        });

        // Play completion sound
        playCompleteSound();

        if (messageMode === 'whatsapp') {
          if (useMediaMode) {
            if (successCount > 0) toast.success(`${successCount} mídia(s) enviada(s) em ${sendDuration}s!`);
            if (failCount > 0) toast.error(`${failCount} envio(s) falhou(aram)`);
          } else {
            toast.success(`${successCount} mensagem(ns) enviada(s) via API em ${sendDuration}s!`);
          }
        } else {
          if (successCount > 0) toast.success(`${successCount} email(s) enviado(s) em ${sendDuration}s!`);
          if (failCount > 0) toast.error(`${failCount} email(s) falhou(aram)`);
        }
      }
    }

    setIsSending(false);
    setIsPaused(false);
    onComplete?.();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          Disparador em Massa
        </CardTitle>
        <CardDescription>
          Envie mensagens para clientes ou números personalizados
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* WhatsApp Connection Status */}
        {messageMode === 'whatsapp' && (
          <div 
            className={cn(
              "flex items-center justify-between p-3 rounded-lg border transition-colors",
              connectionStatus.loading ? "bg-muted/50 border-muted" :
              connectionStatus.connected ? "bg-green-500/10 border-green-500/30" : "bg-destructive/10 border-destructive/30"
            )}
          >
            <div className="flex items-center gap-3">
              {connectionStatus.loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : connectionStatus.connected ? (
                <div className="relative">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                </div>
              ) : (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              )}
              <div className="flex flex-col">
                <span className={cn(
                  "text-sm font-medium",
                  connectionStatus.connected ? "text-green-600 dark:text-green-400" : 
                  connectionStatus.loading ? "text-muted-foreground" : "text-destructive"
                )}>
                  {connectionStatus.loading ? "Verificando conexão..." :
                   connectionStatus.connected ? "WhatsApp Conectado" : "WhatsApp Desconectado"}
                </span>
                {connectionStatus.connected && connectionStatus.phone && (
                  <span className="text-xs text-muted-foreground">
                    {connectionStatus.name ? `${connectionStatus.name} • ` : ''}{connectionStatus.phone}
                  </span>
                )}
                {!connectionStatus.loading && connectionStatus.error && (
                  <span className="text-xs text-destructive">{connectionStatus.error}</span>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => checkConnectionStatus(true)}
              disabled={connectionStatus.loading}
              className="gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", connectionStatus.loading && "animate-spin")} />
              <span className="hidden sm:inline">Atualizar</span>
            </Button>
          </div>
        )}

        {/* Target Mode Selection */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Enviar para</Label>
          <Tabs value={targetMode} onValueChange={(v) => setTargetMode(v as TargetMode)} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="clients" className="gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Clientes</span>
              </TabsTrigger>
              <TabsTrigger value="contacts" className="gap-2">
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Contatos</span>
                {contacts.length > 0 && (
                  <Badge variant="secondary" className="ml-1 hidden sm:flex">{contacts.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="sent" className="gap-2">
                <CheckCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Enviados</span>
                {sentContacts.length > 0 && (
                  <Badge variant="outline" className="ml-1 hidden sm:flex">{sentContacts.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="numbers" className="gap-2">
                <Phone className="h-4 w-4" />
                <span className="hidden sm:inline">Avulsos</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>


        {/* Mode Selection - only show email option for clients */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Canal de envio</Label>
            <div className={cn("grid gap-2", targetMode === 'clients' ? "grid-cols-2" : "grid-cols-1")}>
              <Button
                variant={messageMode === 'whatsapp' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMessageMode('whatsapp')}
                className="gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </Button>
              {targetMode === 'clients' && (
                <Button
                  variant={messageMode === 'email' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMessageMode('email')}
                  className="gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Email
                </Button>
              )}
            </div>
          </div>
          {targetMode === 'clients' && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Modo de envio</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={sendMode === 'immediate' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSendMode('immediate')}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  Agora
                </Button>
                <Button
                  variant={sendMode === 'scheduled' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSendMode('scheduled')}
                  className="gap-2"
                >
                  <Clock className="h-4 w-4" />
                  Agendar
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Sent Contacts Section */}
        {targetMode === 'sent' && (
          <SentContactsList />
        )}

        {/* Custom Numbers Section */}
        {targetMode === 'numbers' && (
          <div className="space-y-4">
            {/* Load saved group */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <FolderOpen className="h-3 w-3" />
                Carregar grupo salvo
              </Label>
              <div className="flex gap-2">
                <Select value={selectedGroupId} onValueChange={loadGroup}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={loadingGroups ? "Carregando..." : "Selecione um grupo"} />
                  </SelectTrigger>
                  <SelectContent>
                    {phoneGroups.length === 0 ? (
                      <SelectItem value="none" disabled>Nenhum grupo salvo</SelectItem>
                    ) : (
                      phoneGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name} ({group.phone_numbers.length} números)
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {selectedGroupId && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => deleteGroup(selectedGroupId)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Import from file */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Upload className="h-3 w-3" />
                Importar arquivo
              </Label>
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileImport}
                  accept=".csv,.txt,.xlsx,.xls"
                  className="hidden"
                />
                <Button 
                  variant="outline" 
                  className="flex-1 gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Importar CSV/Excel
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Suporta arquivos CSV, TXT ou Excel com números de telefone
              </p>
            </div>

            {/* Add individual number */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" />
                Adicionar número
              </Label>
              <div className="flex gap-2">
                <Input
                  value={newNumber}
                  onChange={(e) => setNewNumber(e.target.value)}
                  placeholder="(11) 99999-9999"
                  onKeyDown={(e) => e.key === 'Enter' && addPhoneNumber()}
                />
                <Button onClick={addPhoneNumber} size="icon" variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Bulk add numbers */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Adicionar vários números</Label>
              <Textarea
                placeholder="Cole aqui vários números separados por vírgula, ponto e vírgula ou quebra de linha..."
                rows={3}
                onBlur={(e) => {
                  if (e.target.value.trim()) {
                    parseNumbersFromText(e.target.value);
                    e.target.value = '';
                  }
                }}
              />
            </div>

            {/* Numbers List */}
            {phoneNumbers.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">
                    Números adicionados
                  </Label>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{phoneNumbers.length}</Badge>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowSaveGroupDialog(true)}
                      className="h-6 px-2 gap-1"
                    >
                      <Save className="h-3 w-3" />
                      Salvar grupo
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        setPhoneNumbers([]);
                        setSelectedGroupId('');
                      }}
                      className="text-destructive hover:text-destructive h-6 px-2"
                    >
                      Limpar
                    </Button>
                  </div>
                </div>
                <div className="border rounded-lg p-3 max-h-32 overflow-y-auto flex flex-wrap gap-2">
                  {phoneNumbers.map((number) => (
                    <Badge key={number} variant="secondary" className="gap-1 pr-1">
                      {formatPhoneDisplay(number)}
                      <button
                        onClick={() => removePhoneNumber(number)}
                        className="ml-1 hover:bg-destructive/20 rounded p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Personal Contacts Section */}
        {targetMode === 'contacts' && (
          <div className="space-y-4">
            {contacts.length === 0 ? (
              <div className="text-center py-8 border border-dashed rounded-lg">
                <UserPlus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-2">
                  Nenhum contato pessoal cadastrado
                </p>
                <p className="text-xs text-muted-foreground">
                  Acesse a aba "Contatos" no menu para adicionar contatos
                </p>
              </div>
            ) : (
              <>
                {/* Search contacts */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Filter className="h-3 w-3" />
                    Buscar contatos
                  </Label>
                  <Input
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    placeholder="Buscar por nome ou telefone..."
                  />
                </div>

                {/* Selection controls */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">
                      {selectedContactIds.size} de {filteredContacts.length} selecionados
                    </Badge>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={selectAllContacts} className="h-7 px-2">
                        Todos
                      </Button>
                      <Button variant="ghost" size="sm" onClick={deselectAllContacts} className="h-7 px-2">
                        Limpar
                      </Button>
                    </div>
                  </div>
                  
                  {/* Batch selection buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">Selecionar:</span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => selectNextBatch(10)} 
                      className="h-7 px-2 text-xs"
                    >
                      +10
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => selectNextBatch(100)} 
                      className="h-7 px-2 text-xs"
                    >
                      +100
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => selectNextBatch(500)} 
                      className="h-7 px-2 text-xs"
                    >
                      +500
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => selectNextBatch(1000)} 
                      className="h-7 px-2 text-xs"
                    >
                      +1000
                    </Button>
                    <div className="flex items-center gap-1 ml-2">
                      <Input
                        type="number"
                        min="1"
                        placeholder="Qtd"
                        className="h-7 w-20 text-xs"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const value = parseInt((e.target as HTMLInputElement).value);
                            if (value > 0) {
                              selectNextBatch(value);
                              (e.target as HTMLInputElement).value = '';
                            }
                          }
                        }}
                      />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={(e) => {
                          const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                          const value = parseInt(input.value);
                          if (value > 0) {
                            selectNextBatch(value);
                            input.value = '';
                          }
                        }}
                        className="h-7 px-2 text-xs"
                      >
                        +
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Contacts list - with load more to avoid browser freeze */}
                <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                  {displayedContacts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum contato encontrado
                    </p>
                  ) : (
                    <>
                      {displayedContacts.map((contact) => (
                        <div
                          key={contact.id}
                          className={cn(
                            "flex items-center gap-3 p-2 rounded-lg transition-colors cursor-pointer",
                            selectedContactIds.has(contact.id)
                              ? "bg-primary/10 border border-primary/30"
                              : "hover:bg-muted/50 border border-transparent"
                          )}
                          onClick={() => toggleContact(contact.id)}
                        >
                          <Checkbox
                            checked={selectedContactIds.has(contact.id)}
                            onCheckedChange={() => toggleContact(contact.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{contact.name}</p>
                            <p className="text-xs text-muted-foreground">{formatPhoneDisplay(contact.phone)}</p>
                          </div>
                        </div>
                      ))}
                      {hasMoreContacts && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2"
                          onClick={loadMoreContacts}
                        >
                          Carregar mais ({filteredContacts.length - contactsDisplayLimit} restantes)
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Client Selection Section */}
        {targetMode === 'clients' && (
          <>
            {/* Client Filter */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Filter className="h-3 w-3" />
                Filtrar clientes
              </Label>
              <Select value={clientFilter} onValueChange={(v) => setClientFilter(v as ClientFilter)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(filterLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selected Clients */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Clientes selecionados
                </Label>
                <Badge variant="secondary">{selectedClientIds.size} de {filteredClients.length}</Badge>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between"
                onClick={() => setShowClientList(!showClientList)}
              >
                <span>Ver lista de clientes</span>
                {showClientList ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>

              {showClientList && (
                <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                  <div className="flex gap-2 mb-2">
                    <Button variant="outline" size="sm" onClick={selectAll}>Selecionar todos</Button>
                    <Button variant="outline" size="sm" onClick={deselectAll}>Limpar seleção</Button>
                  </div>
                  {filteredClients.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum cliente encontrado com este filtro
                    </p>
                  ) : (
                    filteredClients.map(client => (
                      <div key={client.id} className="flex items-center gap-2">
                        <Checkbox
                          id={client.id}
                          checked={selectedClientIds.has(client.id)}
                          onCheckedChange={() => toggleClient(client.id)}
                        />
                        <Label htmlFor={client.id} className="text-sm flex-1 cursor-pointer">
                          {client.name}
                          <span className="text-xs text-muted-foreground ml-2">
                            ({getDaysUntilExpiration(client.expiresAt)}d)
                          </span>
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Schedule Options */}
        {sendMode === 'scheduled' && targetMode === 'clients' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !scheduledDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduledDate ? format(scheduledDate, "dd/MM/yyyy") : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={scheduledDate}
                    onSelect={setScheduledDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Horário</Label>
              <Input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Media Attachments Section */}
        {messageMode === 'whatsapp' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground flex items-center gap-2">
                <Paperclip className="h-3 w-3" />
                Anexar mídia (opcional)
              </Label>
              {mediaAttachments.length > 1 && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Shuffle className="h-3 w-3" />
                  {mediaAttachments.length} variações
                </Badge>
              )}
            </div>
            
            {/* Hidden file input */}
            <input
              type="file"
              ref={mediaInputRef}
              onChange={handleMediaUpload}
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
              multiple
              className="hidden"
            />
            
            {/* Attached media grid */}
            {mediaAttachments.length > 0 && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {mediaAttachments.map((attachment, index) => (
                    <div 
                      key={index} 
                      className="relative group aspect-square border rounded-lg overflow-hidden bg-muted/30"
                    >
                      {/* Preview */}
                      {attachment.preview && attachment.type === 'image' ? (
                        <img 
                          src={attachment.preview} 
                          alt={`Mídia ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : attachment.preview && attachment.type === 'video' ? (
                        <div className="relative w-full h-full">
                          <video 
                            src={attachment.preview} 
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <Video className="h-6 w-6 text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-2">
                          {getMediaIcon(attachment.type)}
                          <span className="text-[10px] text-muted-foreground mt-1 truncate w-full text-center">
                            {attachment.file.name.slice(0, 15)}...
                          </span>
                        </div>
                      )}
                      
                      {/* Variation number badge */}
                      <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                        #{index + 1}
                      </div>
                      
                      {/* Remove button overlay */}
                      <button
                        onClick={() => removeMediaAttachment(index)}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                
                {/* Info about variations */}
                {mediaAttachments.length > 1 && (
                  <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg">
                    <Shuffle className="h-4 w-4 text-primary" />
                    <p className="text-xs text-muted-foreground">
                      <strong>{mediaAttachments.length}</strong> mídias serão enviadas aleatoriamente (anti-spam)
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Upload buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => mediaInputRef.current?.click()}
                className="gap-2"
                disabled={mediaAttachments.length >= 10}
              >
                <Plus className="h-4 w-4" />
                {mediaAttachments.length === 0 ? 'Adicionar mídia' : 'Adicionar mais'}
              </Button>
              {mediaAttachments.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setMediaAttachments([]);
                    setUseMediaMode(false);
                  }}
                  className="gap-2 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Limpar todas
                </Button>
              )}
            </div>
            
            <p className="text-xs text-muted-foreground">
              Adicione até 10 mídias. Uma será sorteada para cada destinatário. Máximo 16MB por arquivo.
            </p>
          </div>
        )}

        {/* Message Variations Toggle */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Shuffle className="h-3 w-3" />
                Variações de mensagem
              </Label>
              <Badge variant="secondary" className="text-xs">
                Anti-spam
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="use-variations"
                checked={useVariations}
                onCheckedChange={(checked) => {
                  setUseVariations(checked === true);
                  if (checked && messageVariations.length === 1) {
                    // Keep first variation synced with main message
                    setMessageVariations([customMessage]);
                  }
                }}
              />
              <Label htmlFor="use-variations" className="text-sm cursor-pointer">
                Usar variações
              </Label>
            </div>
          </div>

          {useVariations ? (
            <div className="space-y-3">
              {/* Templates Button */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTemplatesPanel(!showTemplatesPanel)}
                  className="gap-1"
                >
                  <FileText className="h-3 w-3" />
                  {showTemplatesPanel ? 'Fechar Templates' : 'Templates Prontos'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addVariation}
                  disabled={messageVariations.length >= 10}
                  className="gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Adicionar
                </Button>
              </div>

              {/* Templates Panel */}
              {showTemplatesPanel && (
                <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <Label className="text-sm font-medium">Templates de Variações</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Escolha um template pronto com 5 variações de mensagem pré-definidas.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {variationTemplates.map((template) => (
                      <Button
                        key={template.id}
                        variant="outline"
                        size="sm"
                        onClick={() => applyTemplate(template)}
                        className="justify-start gap-2 h-auto py-2"
                      >
                        <span>{categoryLabels[template.category]}</span>
                        <span className="text-muted-foreground">{template.name}</span>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {template.variations.length}
                        </Badge>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Crie até 10 variações diferentes da mensagem. Uma será escolhida aleatoriamente para cada destinatário.
              </p>

              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {messageVariations.map((variation, index) => (
                  <div key={index} className="space-y-2 p-3 border rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          Variação {index + 1}
                        </Badge>
                      </Label>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => duplicateVariation(index)}
                          title="Duplicar variação"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        {messageVariations.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => removeVariation(index)}
                            title="Remover variação"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <Textarea
                      value={variation}
                      onChange={(e) => updateVariation(index, e.target.value)}
                      rows={4}
                      placeholder={`Escreva a variação ${index + 1} da mensagem...`}
                      className="text-sm"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg">
                <Shuffle className="h-4 w-4 text-primary" />
                <p className="text-xs text-muted-foreground">
                  <strong>{messageVariations.filter(v => v.trim()).length}</strong> variações válidas serão usadas aleatoriamente
                </p>
              </div>

              {/* Random Variation Preview */}
              {messageVariations.filter(v => v.trim()).length > 1 && (
                <div className="border rounded-lg p-4 bg-gradient-to-br from-primary/5 to-accent/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-primary" />
                      <Label className="text-sm font-medium">Preview Aleatório</Label>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={refreshPreviewVariation}
                      className="gap-1"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Sortear
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Veja como será uma variação aleatória antes de enviar.
                  </p>
                  {previewVariationMessage ? (
                    <div className="p-3 bg-background rounded-lg border">
                      <p className="text-sm whitespace-pre-wrap">
                        {targetMode === 'clients' && filteredClients.length > 0
                          ? previewVariationMessage
                              .replace(/{nome}/g, filteredClients[0]?.name || 'João')
                              .replace(/{plano}/g, filteredClients[0]?.plan ? getPlanName(filteredClients[0].plan) : 'Mensal')
                              .replace(/{dias}/g, String(Math.abs(getDaysUntilExpiration(filteredClients[0]?.expiresAt || new Date()))))
                              .replace(/{vencimento}/g, format(filteredClients[0]?.expiresAt || new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }))
                          : previewVariationMessage
                        }
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic text-center py-2">
                      Clique em "Sortear" para ver uma variação aleatória
                    </p>
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                {targetMode === 'clients' 
                  ? <>Variáveis disponíveis: {'{nome}'}, {'{plano}'}, {'{dias}'}, {'{vencimento}'}</>
                  : 'Escreva mensagens diferentes para evitar detecção de spam'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Mensagem</Label>
              <Textarea
                value={customMessage}
                onChange={(e) => {
                  setCustomMessage(e.target.value);
                  setMessageVariations([e.target.value]);
                }}
                rows={5}
                placeholder="Escreva sua mensagem..."
              />
              <p className="text-xs text-muted-foreground">
                {targetMode === 'clients' 
                  ? <>Variáveis: {'{nome}'}, {'{plano}'}, {'{dias}'}, {'{vencimento}'}</>
                  : 'Escreva a mensagem que será enviada para todos os números'
                }
              </p>
            </div>
          )}
        </div>

        {/* Message Preview - Phone Mockup */}
        {customMessage.trim() && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                Prévia da mensagem
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewTheme(previewTheme === 'dark' ? 'light' : 'dark')}
                  className="h-7 px-2 gap-1"
                >
                  {previewTheme === 'dark' ? (
                    <>
                      <Sun className="h-3 w-3" />
                      <span className="text-xs">Claro</span>
                    </>
                  ) : (
                    <>
                      <Moon className="h-3 w-3" />
                      <span className="text-xs">Escuro</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            {/* Phone Frame */}
            <div className="flex justify-center">
              <div className="relative w-[280px] h-[520px] bg-black rounded-[40px] p-2 shadow-2xl border-4 border-gray-800">
                {/* Phone notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-b-2xl z-20" />
                
                {/* Phone screen */}
                <div className={cn(
                  "w-full h-full rounded-[32px] overflow-hidden flex flex-col transition-colors duration-300",
                  previewTheme === 'dark' ? "bg-[#0B141A]" : "bg-[#EFEAE2]"
                )}>
                  {/* WhatsApp Header */}
                  <div className={cn(
                    "px-3 py-2 flex items-center gap-3 transition-colors duration-300",
                    previewTheme === 'dark' ? "bg-[#1F2C33]" : "bg-[#008069]"
                  )}>
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      previewTheme === 'dark' ? "bg-gray-600" : "bg-white/20"
                    )}>
                      <Users className={cn("h-4 w-4", previewTheme === 'dark' ? "text-gray-300" : "text-white")} />
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium truncate">
                        {targetMode === 'clients' && filteredClients.length > 0
                          ? filteredClients[0]?.name
                          : 'Destinatário'
                        }
                      </p>
                      <p className={cn(
                        "text-xs transition-colors",
                        previewTheme === 'dark' ? "text-gray-400" : "text-white/80"
                      )}>
                        {showTypingAnimation ? 'digitando...' : 'online'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Chat background */}
                  <div 
                    className="flex-1 p-3 overflow-y-auto flex flex-col justify-end gap-2"
                    style={{
                      backgroundImage: previewTheme === 'dark' 
                        ? `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                        : `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                      backgroundColor: previewTheme === 'dark' ? '#0B141A' : '#EFEAE2'
                    }}
                  >
                    {/* Typing indicator (initial) */}
                    {showTypingAnimation && (
                      <div className={cn(
                        "p-3 rounded-lg max-w-[70%] shadow-sm rounded-tl-none animate-fade-in",
                        previewTheme === 'dark' ? "bg-[#1F2C33]" : "bg-white"
                      )}>
                        <div className="flex items-center gap-1">
                          <div className={cn(
                            "w-2 h-2 rounded-full animate-bounce",
                            previewTheme === 'dark' ? "bg-gray-400" : "bg-gray-500"
                          )} style={{ animationDelay: '0ms' }} />
                          <div className={cn(
                            "w-2 h-2 rounded-full animate-bounce",
                            previewTheme === 'dark' ? "bg-gray-400" : "bg-gray-500"
                          )} style={{ animationDelay: '150ms' }} />
                          <div className={cn(
                            "w-2 h-2 rounded-full animate-bounce",
                            previewTheme === 'dark' ? "bg-gray-400" : "bg-gray-500"
                          )} style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    )}
                    
                    {/* Message bubble - sent by user */}
                    <div className={cn(
                      "p-2 rounded-lg max-w-[90%] ml-auto shadow-md rounded-tr-none transition-all duration-300",
                      previewTheme === 'dark' ? "bg-[#005C4B]" : "bg-[#D9FDD3]",
                      showMessageSent ? "animate-scale-in" : "animate-fade-in"
                    )}>
                      {/* Media Preview */}
                      {useMediaMode && mediaAttachments.length > 0 && (
                        <div className="mb-2">
                          {mediaAttachments[0].type === 'image' && mediaAttachments[0].preview ? (
                            <img 
                              src={mediaAttachments[0].preview} 
                              alt="Media preview" 
                              className="w-full max-h-40 object-cover rounded-lg"
                            />
                          ) : mediaAttachments[0].type === 'video' && mediaAttachments[0].preview ? (
                            <div className="relative">
                              <video 
                                src={mediaAttachments[0].preview} 
                                className="w-full max-h-40 object-cover rounded-lg"
                              />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center">
                                  <Video className="h-5 w-5 text-white" />
                                </div>
                              </div>
                            </div>
                          ) : mediaAttachments[0].type === 'audio' ? (
                            <div className={cn(
                              "flex items-center gap-2 p-2 rounded-lg",
                              previewTheme === 'dark' ? "bg-[#004438]" : "bg-[#c5f0c5]"
                            )}>
                              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                <Music className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1">
                                <div className={cn(
                                  "h-1 rounded-full",
                                  previewTheme === 'dark' ? "bg-gray-500" : "bg-gray-400"
                                )}>
                                  <div className="h-full w-1/3 bg-primary rounded-full" />
                                </div>
                                <span className={cn(
                                  "text-[10px]",
                                  previewTheme === 'dark' ? "text-gray-400" : "text-gray-600"
                                )}>
                                  {mediaAttachments[0].file.name}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className={cn(
                              "flex items-center gap-2 p-2 rounded-lg",
                              previewTheme === 'dark' ? "bg-[#004438]" : "bg-[#c5f0c5]"
                            )}>
                              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                                <File className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={cn(
                                  "text-[11px] font-medium truncate",
                                  previewTheme === 'dark' ? "text-white" : "text-gray-800"
                                )}>
                                  {mediaAttachments[0].file.name}
                                </p>
                                <span className={cn(
                                  "text-[10px]",
                                  previewTheme === 'dark' ? "text-gray-400" : "text-gray-600"
                                )}>
                                  {formatFileSize(mediaAttachments[0].file.size)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Message text (as caption if media is attached) */}
                      {customMessage.trim() && (
                        <p className={cn(
                          "text-[13px] whitespace-pre-wrap leading-relaxed px-1",
                          previewTheme === 'dark' ? "text-white" : "text-gray-800"
                        )}>
                          {targetMode === 'clients' && filteredClients.length > 0
                            ? customMessage
                                .replace(/{nome}/g, filteredClients[0]?.name || 'João')
                                .replace(/{plano}/g, filteredClients[0]?.plan ? getPlanName(filteredClients[0].plan) : 'Mensal')
                                .replace(/{dias}/g, String(Math.abs(getDaysUntilExpiration(filteredClients[0]?.expiresAt || new Date()))))
                                .replace(/{vencimento}/g, format(filteredClients[0]?.expiresAt || new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }))
                            : customMessage
                          }
                        </p>
                      )}
                      
                      <div className="flex items-center justify-end gap-1 mt-1 px-1">
                        <span className={cn(
                          "text-[10px]",
                          previewTheme === 'dark' ? "text-gray-300" : "text-gray-500"
                        )}>
                          {format(new Date(), 'HH:mm')}
                        </span>
                        <svg className="w-4 h-3 text-blue-400" viewBox="0 0 16 11" fill="currentColor">
                          <path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.405-2.272a.463.463 0 0 0-.336-.146.47.47 0 0 0-.343.146l-.311.31a.445.445 0 0 0-.14.337c0 .136.047.25.14.343l2.996 2.996a.724.724 0 0 0 .241.178.644.644 0 0 0 .724-.14l6.67-8.227a.46.46 0 0 0 .102-.39.485.485 0 0 0-.178-.336l-.285-.311zm3.618 0a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-1.026-.968-.96.96 1.704 1.704a.724.724 0 0 0 .241.178.644.644 0 0 0 .724-.14l6.67-8.227a.46.46 0 0 0 .102-.39.485.485 0 0 0-.178-.336l-.285-.311-.117-.182z"/>
                        </svg>
                      </div>
                    </div>
                    
                    {/* Reply typing animation */}
                    {showReplyAnimation && (
                      <div className={cn(
                        "p-3 rounded-lg max-w-[70%] shadow-sm rounded-tl-none animate-fade-in",
                        previewTheme === 'dark' ? "bg-[#1F2C33]" : "bg-white"
                      )}>
                        <div className="flex items-center gap-1">
                          <div className={cn(
                            "w-2 h-2 rounded-full animate-bounce",
                            previewTheme === 'dark' ? "bg-gray-400" : "bg-gray-500"
                          )} style={{ animationDelay: '0ms' }} />
                          <div className={cn(
                            "w-2 h-2 rounded-full animate-bounce",
                            previewTheme === 'dark' ? "bg-gray-400" : "bg-gray-500"
                          )} style={{ animationDelay: '150ms' }} />
                          <div className={cn(
                            "w-2 h-2 rounded-full animate-bounce",
                            previewTheme === 'dark' ? "bg-gray-400" : "bg-gray-500"
                          )} style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    )}
                    
                    {/* Reply message */}
                    {showReplyMessage && (
                      <div className={cn(
                        "p-3 rounded-lg max-w-[80%] shadow-sm rounded-tl-none animate-scale-in",
                        previewTheme === 'dark' ? "bg-[#1F2C33]" : "bg-white"
                      )}>
                        <p className={cn(
                          "text-[13px] leading-relaxed",
                          previewTheme === 'dark' ? "text-white" : "text-gray-800"
                        )}>
                          {currentReply || "Obrigado pela mensagem! 👍"}
                        </p>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className={cn(
                            "text-[10px]",
                            previewTheme === 'dark' ? "text-gray-300" : "text-gray-500"
                          )}>
                            {format(new Date(), 'HH:mm')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Input bar */}
                  <div className={cn(
                    "px-3 py-2 flex items-center gap-2 transition-colors duration-300",
                    previewTheme === 'dark' ? "bg-[#1F2C33]" : "bg-[#F0F2F5]"
                  )}>
                    <div className={cn(
                      "flex-1 rounded-full px-4 py-2 transition-colors duration-300",
                      previewTheme === 'dark' ? "bg-[#2A3942]" : "bg-white"
                    )}>
                      <span className={cn(
                        "text-sm",
                        previewTheme === 'dark' ? "text-gray-500" : "text-gray-400"
                      )}>Mensagem</span>
                    </div>
                    <button 
                      onClick={handlePreviewSend}
                      className={cn(
                        "w-10 h-10 rounded-full bg-[#00A884] flex items-center justify-center transition-transform active:scale-90 hover:bg-[#008f72]",
                        showMessageSent && "animate-pulse"
                      )}
                    >
                      <Send className="h-5 w-5 text-white" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground italic text-center">
              {targetMode === 'clients' && filteredClients.length > 0 
                ? `Exemplo com: ${filteredClients[0]?.name}` 
                : 'Prévia de como a mensagem aparecerá'
              }
            </p>
          </div>
        )}

        {/* Delay and Auto-Pause Settings */}
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Configurações de Envio</Label>
          </div>

          {/* Delay Input */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Timer className="h-3 w-3" />
                Intervalo entre mensagens
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  inputMode="numeric"
                  value={delaySecondsInput}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setDelaySecondsInput(val);
                  }}
                  onBlur={() => {
                    const num = parseInt(delaySecondsInput) || 1;
                    setDelaySecondsInput(String(Math.max(1, Math.min(60, num))));
                  }}
                  disabled={isSending}
                  className="w-20 text-center"
                />
                <span className="text-sm text-muted-foreground">segundos</span>
              </div>
            </div>

            {/* Auto-Pause Input */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Pause className="h-3 w-3" />
                Pausar a cada
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  inputMode="numeric"
                  value={pauseAfterCountInput}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setPauseAfterCountInput(val);
                  }}
                  onBlur={() => {
                    const num = parseInt(pauseAfterCountInput) || 0;
                    setPauseAfterCountInput(String(Math.max(0, Math.min(100, num))));
                  }}
                  disabled={isSending}
                  className="w-20 text-center"
                />
                <span className="text-sm text-muted-foreground">envios</span>
              </div>
            </div>
          </div>

          {/* Enable Auto-Pause Checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="enableAutoPause"
              checked={enableAutoPause}
              onCheckedChange={(checked) => setEnableAutoPause(checked === true)}
              disabled={isSending}
            />
            <Label htmlFor="enableAutoPause" className="text-sm cursor-pointer">
              Ativar pausa automática a cada {pauseAfterCount} mensagens
            </Label>
          </div>

          {/* Time Estimate */}
          {(() => {
            const totalRecipients = targetMode === 'clients' ? selectedClientIds.size : phoneNumbers.length;
            if (totalRecipients === 0) return null;
            
            const totalSeconds = (totalRecipients - 1) * delaySeconds;
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            const pauseCount = enableAutoPause && pauseAfterCount > 0 
              ? Math.floor(totalRecipients / pauseAfterCount) 
              : 0;
            
            return (
              <div className="rounded-md bg-muted/50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Tempo estimado
                  </span>
                  <Badge variant="outline" className="font-mono text-primary">
                    {minutes > 0 ? `${minutes}min ` : ''}{seconds}s
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>📊 {totalRecipients} destinatário(s) × {delaySeconds}s de intervalo</p>
                  {pauseCount > 0 && (
                    <p>⏸️ {pauseCount} pausa(s) automática(s) durante o envio</p>
                  )}
                </div>
              </div>
            );
          })()}

          <p className="text-xs text-muted-foreground">
            💡 A pausa automática permite que você revise o progresso e decida se quer continuar enviando.
          </p>
        </div>

        {/* Progress Bar - Always visible when there are recipients */}
        {(() => {
          const totalRecipients = targetMode === 'clients' ? selectedClientIds.size : phoneNumbers.length;
          if (totalRecipients === 0) return null;

          const progressValue = isSending 
            ? (progress.current / progress.total) * 100 
            : 0;

          return (
            <div className="space-y-3 rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {isSending ? 'Enviando...' : 'Pronto para enviar'}
                </span>
                <span className="text-muted-foreground">
                  {isSending ? `${progress.current} de ${progress.total}` : `0 de ${totalRecipients}`}
                </span>
              </div>
              <Progress value={progressValue} className="h-3" />
              
              {isSending && (
                <>
                  <div className="flex gap-4 text-xs">
                    <span className="text-green-500 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" /> {progress.success} sucesso
                    </span>
                    {progress.failed > 0 && (
                      <span className="text-red-500 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> {progress.failed} falhas
                      </span>
                    )}
                    {/* Remaining time estimate */}
                    {progress.current < progress.total && (
                      <span className="text-muted-foreground flex items-center gap-1 ml-auto">
                        <Clock className="h-3 w-3" />
                        ~{Math.ceil((progress.total - progress.current) * delaySeconds / 60)}min restante
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })()}

        {/* Pause/Resume and Cancel buttons - only when sending */}
        {isSending && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button
                variant={isPaused ? "default" : "outline"}
                size="sm"
                className="flex-1 gap-2"
                onClick={handlePauseToggle}
              >
                {isPaused ? (
                  <>
                    <Play className="h-4 w-4" />
                    Continuar
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4" />
                    Pausar
                  </>
                )}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="gap-2"
                onClick={handleAbort}
              >
                <X className="h-4 w-4" />
                Cancelar
              </Button>
            </div>

            {isPaused && (
              <div className="flex items-center gap-2 p-2 rounded-md bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                <Pause className="h-4 w-4" />
                <span className="text-xs font-medium">Envio pausado. Clique em "Continuar" para retomar.</span>
              </div>
            )}
          </div>
        )}

        {/* Send Button */}
        <Button
          className="w-full gap-2"
          size="lg"
          onClick={handleSend}
          disabled={isSending || (
            targetMode === 'clients' 
              ? selectedClientIds.size === 0 
              : targetMode === 'contacts' 
                ? selectedContactIds.size === 0 
                : phoneNumbers.length === 0
          )}
        >
          {isSending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {useMediaMode ? 'Enviando mídia...' : 'Enviando...'}
            </>
          ) : targetMode === 'contacts' ? (
            <>
              {useMediaMode ? <Paperclip className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              {useMediaMode 
                ? `Enviar mídia para ${selectedContactIds.size} contato(s)` 
                : `Enviar para ${selectedContactIds.size} contato(s)`
              }
            </>
          ) : targetMode === 'numbers' ? (
            <>
              {useMediaMode ? <Paperclip className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              {useMediaMode 
                ? `Enviar mídia para ${phoneNumbers.length} número(s)` 
                : `Enviar para ${phoneNumbers.length} número(s)`
              }
            </>
          ) : sendMode === 'scheduled' ? (
            <>
              <Clock className="h-4 w-4" />
              Agendar {selectedClientIds.size} mensagem(ns)
            </>
          ) : (
            <>
              {useMediaMode ? <Paperclip className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              {useMediaMode 
                ? `Enviar mídia para ${selectedClientIds.size} cliente(s)` 
                : `Enviar para ${selectedClientIds.size} cliente(s)`
              }
            </>
          )}
        </Button>
      </CardContent>

      {/* Save Group Dialog */}
      <Dialog open={showSaveGroupDialog} onOpenChange={setShowSaveGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar Grupo de Números</DialogTitle>
            <DialogDescription>
              Salve esta lista de {phoneNumbers.length} número(s) como um grupo reutilizável.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do grupo</Label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Ex: Clientes região Sul"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveGroupDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={saveCurrentAsGroup} 
              disabled={!newGroupName.trim() || savingGroup}
            >
              {savingGroup ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
