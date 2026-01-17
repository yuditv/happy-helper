import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QRCodeTimerProps {
  duration?: number; // in seconds
  onExpire?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function QRCodeTimer({ 
  duration = 60, 
  onExpire, 
  onRefresh,
  isRefreshing = false 
}: QRCodeTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isExpired, setIsExpired] = useState(false);

  const resetTimer = useCallback(() => {
    setTimeLeft(duration);
    setIsExpired(false);
  }, [duration]);

  useEffect(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    if (timeLeft <= 0) {
      setIsExpired(true);
      onExpire?.();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onExpire]);

  const handleRefresh = () => {
    resetTimer();
    onRefresh?.();
  };

  const progress = (timeLeft / duration) * 100;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const getColor = () => {
    if (progress > 50) return 'from-emerald-500 to-green-500';
    if (progress > 25) return 'from-amber-500 to-yellow-500';
    return 'from-red-500 to-orange-500';
  };

  const getTextColor = () => {
    if (progress > 50) return 'text-emerald-400';
    if (progress > 25) return 'text-amber-400';
    return 'text-red-400';
  };

  if (isExpired) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-3 p-4"
      >
        <div className="text-red-400 text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4" />
          QR Code expirado
        </div>
        <Button
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
        >
          {isRefreshing ? (
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Gerar Novo
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Circular Progress */}
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="40"
            cy="40"
            r="35"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            className="text-muted/20"
          />
          {/* Progress circle */}
          <motion.circle
            cx="40"
            cy="40"
            r="35"
            stroke="url(#timerGradient)"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={220}
            initial={{ strokeDashoffset: 0 }}
            animate={{ strokeDashoffset: 220 - (220 * progress) / 100 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
          <defs>
            <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" className={`${progress > 50 ? 'stop-color-emerald' : progress > 25 ? 'stop-color-amber' : 'stop-color-red'}`} style={{ stopColor: progress > 50 ? '#10b981' : progress > 25 ? '#f59e0b' : '#ef4444' }} />
              <stop offset="100%" className={`${progress > 50 ? 'stop-color-green' : progress > 25 ? 'stop-color-yellow' : 'stop-color-orange'}`} style={{ stopColor: progress > 50 ? '#22c55e' : progress > 25 ? '#eab308' : '#f97316' }} />
            </linearGradient>
          </defs>
        </svg>
        
        {/* Time display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span 
            key={timeLeft}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`text-lg font-bold font-mono ${getTextColor()}`}
          >
            {minutes}:{seconds.toString().padStart(2, '0')}
          </motion.span>
        </div>
      </div>

      {/* Status text */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>Tempo restante para escanear</span>
      </div>

      {/* Progress bar alternative */}
      <div className="w-full max-w-[200px] h-1.5 bg-muted/20 rounded-full overflow-hidden">
        <motion.div
          className={`h-full bg-gradient-to-r ${getColor()} rounded-full`}
          initial={{ width: '100%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
