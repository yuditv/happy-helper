import { useEffect, useState } from "react";
import { ReferralLevel } from "@/lib/referralLevels";
import { Trophy, Star, Sparkles } from "lucide-react";

interface LevelUpCelebrationProps {
  level: ReferralLevel;
  onComplete: () => void;
}

const LevelUpCelebration = ({ level, onComplete }: LevelUpCelebrationProps) => {
  const [stage, setStage] = useState<"enter" | "show" | "exit">("enter");

  useEffect(() => {
    const enterTimer = setTimeout(() => setStage("show"), 100);
    const showTimer = setTimeout(() => setStage("exit"), 3000);
    const exitTimer = setTimeout(onComplete, 3500);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(showTimer);
      clearTimeout(exitTimer);
    };
  }, [onComplete]);

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-500 ${
        stage === "enter" ? "opacity-0" : stage === "exit" ? "opacity-0" : "opacity-100"
      }`}
      style={{ backgroundColor: "rgba(0, 0, 0, 0.8)" }}
    >
      {/* Confetti particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-confetti"
            style={{
              left: `${Math.random() * 100}%`,
              top: "-20px",
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          >
            <div
              className="w-3 h-3 rounded-sm"
              style={{
                backgroundColor: ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7"][
                  Math.floor(Math.random() * 6)
                ],
                transform: `rotate(${Math.random() * 360}deg)`,
              }}
            />
          </div>
        ))}
      </div>

      {/* Main celebration card */}
      <div 
        className={`relative bg-card rounded-2xl p-8 shadow-2xl transform transition-all duration-500 ${
          stage === "show" ? "scale-100" : "scale-75"
        }`}
        style={{ maxWidth: "90vw", width: "400px" }}
      >
        {/* Glow effect */}
        <div 
          className="absolute inset-0 rounded-2xl opacity-50 blur-xl -z-10"
          style={{ backgroundColor: level.color }}
        />
        
        {/* Stars decoration */}
        <div className="absolute -top-4 -left-4">
          <Star className="h-8 w-8 text-yellow-400 animate-pulse" fill="currentColor" />
        </div>
        <div className="absolute -top-2 -right-6">
          <Sparkles className="h-6 w-6 text-yellow-400 animate-pulse" style={{ animationDelay: "0.3s" }} />
        </div>
        <div className="absolute -bottom-3 -right-3">
          <Star className="h-6 w-6 text-yellow-400 animate-pulse" style={{ animationDelay: "0.6s" }} fill="currentColor" />
        </div>

        <div className="text-center space-y-4">
          {/* Trophy with level color */}
          <div 
            className="inline-flex items-center justify-center w-20 h-20 rounded-full animate-bounce"
            style={{ backgroundColor: `${level.color}20` }}
          >
            <Trophy className="h-10 w-10" style={{ color: level.color }} />
          </div>

          {/* Level up text */}
          <div>
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Parabéns! Você subiu de nível
            </p>
            <h2 
              className="text-3xl font-bold mt-1"
              style={{ color: level.color }}
            >
              {level.name}
            </h2>
          </div>

          {/* Benefits */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium">Seus novos benefícios:</p>
            <div className="flex items-center justify-center gap-2 text-lg font-bold" style={{ color: level.color }}>
              R$ {level.discountPerReferral.toFixed(2)}
              <span className="text-sm font-normal text-muted-foreground">por indicação</span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1">
              {level.benefits.slice(0, 2).map((benefit, i) => (
                <li key={i} className="flex items-center gap-1 justify-center">
                  <Star className="h-3 w-3" style={{ color: level.color }} />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Add confetti animation styles */}
      <style>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotateZ(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotateZ(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
      `}</style>
    </div>
  );
};

export default LevelUpCelebration;
