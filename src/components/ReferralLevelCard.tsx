import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  getCurrentLevel, 
  getNextLevel, 
  getLevelProgress,
  REFERRAL_LEVELS,
  formatCurrency 
} from '@/lib/referralLevels';
import { Trophy, Star, TrendingUp, Gift } from 'lucide-react';

interface ReferralLevelCardProps {
  completedReferrals: number;
}

export function ReferralLevelCard({ completedReferrals }: ReferralLevelCardProps) {
  const currentLevel = getCurrentLevel(completedReferrals);
  const nextLevel = getNextLevel(completedReferrals);
  const progress = getLevelProgress(completedReferrals);

  return (
    <div className="space-y-4">
      {/* Current Level Display */}
      <div className={`rounded-xl p-4 border-2 ${currentLevel.bgColor} ${currentLevel.borderColor}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`text-3xl`}>{currentLevel.icon}</div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Seu Nível</p>
              <h3 className={`text-xl font-bold ${currentLevel.color}`}>{currentLevel.name}</h3>
            </div>
          </div>
          <Badge className={`${currentLevel.bgColor} ${currentLevel.color} border ${currentLevel.borderColor}`}>
            {formatCurrency(currentLevel.discountPerReferral)}/indicação
          </Badge>
        </div>

        {/* Benefits */}
        <div className="space-y-1.5 mt-4">
          {currentLevel.benefits.map((benefit, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <Star className={`h-3 w-3 ${currentLevel.color}`} />
              <span className="text-muted-foreground">{benefit}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Progress to Next Level */}
      {nextLevel && (
        <div className="rounded-lg bg-muted/20 border border-border/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Próximo nível</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">{nextLevel.icon}</span>
              <span className={`text-sm font-semibold ${nextLevel.color}`}>{nextLevel.name}</span>
            </div>
          </div>
          
          <Progress value={progress.percentage} className="h-2 mb-2" />
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{progress.current} de {progress.target} indicações</span>
            <span className="flex items-center gap-1">
              <Gift className="h-3 w-3" />
              Faltam {progress.referralsToNext}
            </span>
          </div>

          {/* Next Level Preview */}
          <div className={`mt-3 p-2 rounded-lg ${nextLevel.bgColor} border ${nextLevel.borderColor}`}>
            <p className="text-xs text-muted-foreground mb-1">Ao atingir:</p>
            <p className={`text-sm font-semibold ${nextLevel.color}`}>
              {formatCurrency(nextLevel.discountPerReferral)} por indicação
            </p>
          </div>
        </div>
      )}

      {/* Max Level Achieved */}
      {!nextLevel && (
        <div className="rounded-lg bg-gradient-to-br from-purple-500/10 to-cyan-500/10 border border-purple-500/30 p-4 text-center">
          <Trophy className="h-8 w-8 text-purple-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-purple-400">Nível Máximo Alcançado!</p>
          <p className="text-xs text-muted-foreground mt-1">
            Parabéns! Você é um parceiro diamante e aproveita os melhores benefícios.
          </p>
        </div>
      )}

      {/* All Levels Preview */}
      <div className="rounded-lg border border-border/30 p-4">
        <p className="text-sm font-medium mb-3 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          Níveis de Recompensa
        </p>
        <div className="space-y-2">
          {REFERRAL_LEVELS.map((level) => {
            const isCurrentLevel = level.id === currentLevel.id;
            const isUnlocked = completedReferrals >= level.minReferrals;
            
            return (
              <div 
                key={level.id} 
                className={`flex items-center justify-between p-2 rounded-lg transition-all ${
                  isCurrentLevel 
                    ? `${level.bgColor} border ${level.borderColor}` 
                    : isUnlocked 
                      ? 'bg-muted/10' 
                      : 'bg-muted/5 opacity-60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{level.icon}</span>
                  <span className={`text-sm font-medium ${isCurrentLevel ? level.color : ''}`}>
                    {level.name}
                  </span>
                  {isCurrentLevel && (
                    <Badge variant="outline" className="text-xs">Atual</Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-muted-foreground">{level.minReferrals}+ indicações</span>
                  <span className={`font-semibold ${level.color}`}>
                    {formatCurrency(level.discountPerReferral)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
