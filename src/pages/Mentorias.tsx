import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, type Variants, type Transition } from "framer-motion";
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
  ArrowRight,
  Zap,
  Heart
} from "lucide-react";

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2
    }
  }
};

const item: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 12
    } as Transition
  }
};

const features = [
  {
    icon: GraduationCap,
    title: "Mentorias 1:1",
    description: "Sessões personalizadas com especialistas para acelerar seu crescimento profissional.",
    color: "blue",
    gradient: "from-blue-500/20 to-blue-600/10"
  },
  {
    icon: Users,
    title: "Grupos de Estudo",
    description: "Aprenda em comunidade com grupos focados em habilidades específicas.",
    color: "purple",
    gradient: "from-purple-500/20 to-purple-600/10"
  },
  {
    icon: BookOpen,
    title: "Cursos Práticos",
    description: "Conteúdo direto ao ponto para você aplicar imediatamente nos seus projetos.",
    color: "pink",
    gradient: "from-pink-500/20 to-pink-600/10"
  },
  {
    icon: Zap,
    title: "Workshops Intensivos",
    description: "Sessões práticas e intensivas para dominar habilidades específicas rapidamente.",
    color: "yellow",
    gradient: "from-yellow-500/20 to-yellow-600/10"
  },
  {
    icon: Heart,
    title: "Comunidade VIP",
    description: "Acesso exclusivo à comunidade de mentores e alunos para networking.",
    color: "red",
    gradient: "from-red-500/20 to-red-600/10"
  },
  {
    icon: Target,
    title: "Plano de Carreira",
    description: "Orientação personalizada para traçar e alcançar seus objetivos profissionais.",
    color: "green",
    gradient: "from-green-500/20 to-green-600/10"
  }
];

const stats = [
  { icon: Trophy, value: "100+", label: "Mentores Especialistas", color: "text-yellow-500" },
  { icon: Target, value: "50+", label: "Áreas de Atuação", color: "text-green-500" },
  { icon: Users, value: "1000+", label: "Alunos Esperados", color: "text-blue-500" },
  { icon: Star, value: "5★", label: "Qualidade Premium", color: "text-purple-500" }
];

export default function Mentorias() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          className="absolute top-20 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div 
          className="absolute bottom-20 right-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.5, 0.3, 0.5],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        />
        <motion.div 
          className="absolute top-1/2 left-10 w-32 h-32 bg-pink-500/20 rounded-full blur-2xl"
          animate={{
            y: [-10, 10, -10]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Hero Section */}
      <motion.div 
        className="relative overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-purple-500/5 to-pink-500/10" />
        
        <div className="container mx-auto px-4 py-16 relative z-10">
          <motion.div 
            className="text-center max-w-3xl mx-auto space-y-6"
            variants={container}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={item}>
              <Badge className="px-4 py-2 text-sm bg-primary/10 text-primary border-primary/20">
                <motion.span 
                  className="flex items-center"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Em Breve
                </motion.span>
              </Badge>
            </motion.div>
            
            <motion.h1 
              variants={item}
              className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-foreground via-primary to-purple-500 bg-clip-text text-transparent"
            >
              Mentorias Exclusivas
            </motion.h1>
            
            <motion.p 
              variants={item}
              className="text-lg md:text-xl text-muted-foreground"
            >
              Aprenda com os melhores. Transforme seu conhecimento em resultados reais 
              com mentorias personalizadas e conteúdo de alta qualidade.
            </motion.p>

            <motion.div 
              variants={item}
              className="flex flex-wrap gap-4 justify-center pt-4"
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button size="lg" className="gap-2 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg shadow-primary/25">
                  <Rocket className="h-5 w-5" />
                  Lista de Espera
                </Button>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button size="lg" variant="outline" className="gap-2">
                  <Play className="h-5 w-5" />
                  Saiba Mais
                </Button>
              </motion.div>
            </motion.div>

            {/* Floating Icons */}
            <div className="relative h-20 mt-8">
              <motion.div
                className="absolute left-1/4 -translate-x-1/2"
                animate={{ y: [-5, 5, -5], rotate: [-5, 5, -5] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="p-3 rounded-xl bg-blue-500/20 backdrop-blur-sm">
                  <GraduationCap className="h-6 w-6 text-blue-500" />
                </div>
              </motion.div>
              <motion.div
                className="absolute left-1/2 -translate-x-1/2"
                animate={{ y: [5, -5, 5], rotate: [5, -5, 5] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              >
                <div className="p-3 rounded-xl bg-purple-500/20 backdrop-blur-sm">
                  <Star className="h-6 w-6 text-purple-500" />
                </div>
              </motion.div>
              <motion.div
                className="absolute left-3/4 -translate-x-1/2"
                animate={{ y: [-5, 5, -5], rotate: [-5, 5, -5] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              >
                <div className="p-3 rounded-xl bg-pink-500/20 backdrop-blur-sm">
                  <Trophy className="h-6 w-6 text-pink-500" />
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Features Grid */}
      <div className="container mx-auto px-4 py-16">
        <motion.div 
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              whileHover={{ y: -8, transition: { duration: 0.3 } }}
            >
              <Card className="group h-full hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 border-primary/10 hover:border-primary/30 bg-card/50 backdrop-blur-sm overflow-hidden">
                <CardContent className="p-6 space-y-4 relative">
                  <motion.div 
                    className={`p-3 w-fit rounded-xl bg-gradient-to-br ${feature.gradient}`}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <feature.icon className={`h-8 w-8 text-${feature.color}-500`} />
                  </motion.div>
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                  <div className={`flex items-center gap-2 text-sm text-${feature.color}-500`}>
                    <Clock className="h-4 w-4" />
                    <span>Em desenvolvimento</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Stats Section */}
      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Card className="bg-gradient-to-r from-primary/5 via-purple-500/5 to-pink-500/5 border-primary/10 overflow-hidden">
            <CardContent className="p-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                {stats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, scale: 0.5 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    className="space-y-2"
                    whileHover={{ scale: 1.05 }}
                  >
                    <motion.div 
                      className="flex justify-center"
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: index * 0.3 }}
                    >
                      <stat.icon className={`h-8 w-8 ${stat.color}`} />
                    </motion.div>
                    <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Card className="overflow-hidden relative">
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-primary via-purple-600 to-pink-600"
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: "linear"
              }}
              style={{ backgroundSize: "200% 200%" }}
            />
            <CardContent className="p-12 relative z-10 text-center space-y-6">
              <motion.h2 
                className="text-3xl md:text-4xl font-bold text-white"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                Seja o Primeiro a Saber
              </motion.h2>
              <motion.p 
                className="text-lg text-white/80 max-w-2xl mx-auto"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
              >
                Entre na lista de espera e receba acesso antecipado às nossas mentorias 
                exclusivas com condições especiais de lançamento.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button size="lg" variant="secondary" className="gap-2 text-primary font-semibold shadow-xl">
                  Entrar na Lista de Espera
                  <motion.span
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <ArrowRight className="h-5 w-5" />
                  </motion.span>
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
