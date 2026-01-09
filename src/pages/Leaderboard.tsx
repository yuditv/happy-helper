import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, Medal, Award, Crown, Star } from "lucide-react";
import { getCurrentLevel } from "@/lib/referralLevels";

interface LeaderboardEntry {
  user_id: string;
  display_name: string | null;
  completed_count: number;
  total_discount: number;
}

const Leaderboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [user]);

  const fetchLeaderboard = async () => {
    try {
      // Fetch all completed referrals grouped by referrer
      const { data: referralsData, error: referralsError } = await supabase
        .from("referrals")
        .select("referrer_id, discount_amount")
        .eq("status", "completed");

      if (referralsError) throw referralsError;

      // Group by referrer and calculate totals
      const referrerStats: Record<string, { count: number; total: number }> = {};
      
      referralsData?.forEach((ref) => {
        if (!referrerStats[ref.referrer_id]) {
          referrerStats[ref.referrer_id] = { count: 0, total: 0 };
        }
        referrerStats[ref.referrer_id].count++;
        referrerStats[ref.referrer_id].total += Number(ref.discount_amount);
      });

      // Get unique referrer IDs
      const referrerIds = Object.keys(referrerStats);

      if (referrerIds.length === 0) {
        setLeaderboard([]);
        setIsLoading(false);
        return;
      }

      // Fetch profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", referrerIds);

      if (profilesError) throw profilesError;

      // Build leaderboard
      const leaderboardData: LeaderboardEntry[] = referrerIds.map((userId) => {
        const profile = profilesData?.find((p) => p.user_id === userId);
        return {
          user_id: userId,
          display_name: profile?.display_name || "Usuário Anônimo",
          completed_count: referrerStats[userId].count,
          total_discount: referrerStats[userId].total,
        };
      });

      // Sort by completed count (descending)
      leaderboardData.sort((a, b) => b.completed_count - a.completed_count);

      // Find user's rank
      if (user) {
        const rank = leaderboardData.findIndex((entry) => entry.user_id === user.id);
        setUserRank(rank >= 0 ? rank + 1 : null);
      }

      setLeaderboard(leaderboardData.slice(0, 50)); // Top 50
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Medal className="h-6 w-6 text-amber-600" />;
      default:
        return <span className="text-muted-foreground font-bold w-6 text-center">{rank}</span>;
    }
  };

  const getRankBgClass = (rank: number, isCurrentUser: boolean) => {
    if (isCurrentUser) return "bg-primary/10 border-primary";
    switch (rank) {
      case 1:
        return "bg-yellow-500/10 border-yellow-500/30";
      case 2:
        return "bg-gray-400/10 border-gray-400/30";
      case 3:
        return "bg-amber-600/10 border-amber-600/30";
      default:
        return "bg-card border-border";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-yellow-500" />
              <h1 className="text-xl font-bold">Ranking de Indicadores</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {userRank && (
          <Card className="mb-6 bg-primary/5 border-primary/20">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Star className="h-5 w-5 text-primary" />
                  <span className="font-medium">Sua posição no ranking</span>
                </div>
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  #{userRank}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Top Indicadores
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Nenhuma indicação completada ainda.</p>
                <p className="text-sm">Seja o primeiro a aparecer no ranking!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry, index) => {
                  const rank = index + 1;
                  const isCurrentUser = entry.user_id === user?.id;
                  const level = getCurrentLevel(entry.completed_count);

                  return (
                    <div
                      key={entry.user_id}
                      className={`flex items-center gap-4 p-3 rounded-lg border transition-all ${getRankBgClass(rank, isCurrentUser)}`}
                    >
                      <div className="flex items-center justify-center w-8">
                        {getRankIcon(rank)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium truncate ${isCurrentUser ? "text-primary" : ""}`}>
                            {entry.display_name}
                            {isCurrentUser && " (você)"}
                          </span>
                          <Badge 
                            variant="outline" 
                            className="text-xs shrink-0"
                            style={{ 
                              borderColor: level.color,
                              color: level.color 
                            }}
                          >
                            {level.name}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {entry.completed_count} indicações • R$ {entry.total_discount.toFixed(2)} em descontos
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Leaderboard;
