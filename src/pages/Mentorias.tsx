import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  GraduationCap, 
  Sparkles, 
  Star, 
  Trophy, 
  Target,
  Rocket,
  Users,
  BookOpen,
  Play,
  Clock,
  ArrowRight
} from "lucide-react";

export default function Mentorias() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-purple-500/5 to-pink-500/10" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        
        <div className="container mx-auto px-4 py-16 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <Badge className="px-4 py-2 text-sm bg-primary/10 text-primary border-primary/20 animate-fade-in">
              <Sparkles className="h-4 w-4 mr-2" />
              Em Breve
            </Badge>
            
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-foreground via-primary to-purple-500 bg-clip-text text-transparent animate-fade-in">
              Mentorias Exclusivas
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground animate-fade-in">
              Aprenda com os melhores. Transforme seu conhecimento em resultados reais 
              com mentorias personalizadas e conteúdo de alta qualidade.
            </p>

            <div className="flex flex-wrap gap-4 justify-center pt-4 animate-fade-in">
              <Button size="lg" className="gap-2 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90">
                <Rocket className="h-5 w-5" />
                Lista de Espera
              </Button>
              <Button size="lg" variant="outline" className="gap-2">
                <Play className="h-5 w-5" />
                Saiba Mais
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="group hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 border-primary/10 hover:border-primary/30 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6 space-y-4">
              <div className="p-3 w-fit rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 group-hover:scale-110 transition-transform duration-300">
                <GraduationCap className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold">Mentorias 1:1</h3>
              <p className="text-muted-foreground">
                Sessões personalizadas com especialistas para acelerar seu crescimento profissional.
              </p>
              <div className="flex items-center gap-2 text-sm text-primary">
                <Clock className="h-4 w-4" />
                <span>Em desenvolvimento</span>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 border-purple-500/10 hover:border-purple-500/30 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6 space-y-4">
              <div className="p-3 w-fit rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 group-hover:scale-110 transition-transform duration-300">
                <Users className="h-8 w-8 text-purple-500" />
              </div>
              <h3 className="text-xl font-semibold">Grupos de Estudo</h3>
              <p className="text-muted-foreground">
                Aprenda em comunidade com grupos focados em habilidades específicas.
              </p>
              <div className="flex items-center gap-2 text-sm text-purple-500">
                <Clock className="h-4 w-4" />
                <span>Em desenvolvimento</span>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl hover:shadow-pink-500/10 transition-all duration-300 border-pink-500/10 hover:border-pink-500/30 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6 space-y-4">
              <div className="p-3 w-fit rounded-xl bg-gradient-to-br from-pink-500/20 to-pink-600/10 group-hover:scale-110 transition-transform duration-300">
                <BookOpen className="h-8 w-8 text-pink-500" />
              </div>
              <h3 className="text-xl font-semibold">Cursos Práticos</h3>
              <p className="text-muted-foreground">
                Conteúdo direto ao ponto para você aplicar imediatamente nos seus projetos.
              </p>
              <div className="flex items-center gap-2 text-sm text-pink-500">
                <Clock className="h-4 w-4" />
                <span>Em desenvolvimento</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Stats Section */}
      <div className="container mx-auto px-4 py-16">
        <Card className="bg-gradient-to-r from-primary/5 via-purple-500/5 to-pink-500/5 border-primary/10">
          <CardContent className="p-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div className="space-y-2">
                <div className="flex justify-center">
                  <Trophy className="h-8 w-8 text-yellow-500" />
                </div>
                <p className="text-3xl font-bold text-foreground">100+</p>
                <p className="text-sm text-muted-foreground">Mentores Especialistas</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-center">
                  <Target className="h-8 w-8 text-green-500" />
                </div>
                <p className="text-3xl font-bold text-foreground">50+</p>
                <p className="text-sm text-muted-foreground">Áreas de Atuação</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-center">
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
                <p className="text-3xl font-bold text-foreground">1000+</p>
                <p className="text-sm text-muted-foreground">Alunos Esperados</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-center">
                  <Star className="h-8 w-8 text-purple-500" />
                </div>
                <p className="text-3xl font-bold text-foreground">5★</p>
                <p className="text-sm text-muted-foreground">Qualidade Premium</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-16">
        <Card className="overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-600 to-pink-600 opacity-90" />
          <CardContent className="p-12 relative z-10 text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Seja o Primeiro a Saber
            </h2>
            <p className="text-lg text-white/80 max-w-2xl mx-auto">
              Entre na lista de espera e receba acesso antecipado às nossas mentorias 
              exclusivas com condições especiais de lançamento.
            </p>
            <Button size="lg" variant="secondary" className="gap-2 text-primary font-semibold">
              Entrar na Lista de Espera
              <ArrowRight className="h-5 w-5" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
