import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, type Variants, type Transition } from "framer-motion";
import { 
  LayoutDashboard, 
  Sparkles, 
  Settings,
  Server,
  Shield,
  Globe,
  Zap,
  BarChart3,
  Users,
  Clock,
  ArrowRight,
  Monitor,
  Database,
  Cpu
} from "lucide-react";

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.15
    }
  }
};

const item: Variants = {
  hidden: { opacity: 0, y: 25 },
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

const panels = [
  {
    icon: Server,
    title: "Painel de Servidores",
    description: "Gerencie seus servidores com ferramentas avançadas de monitoramento e controle.",
    color: "cyan",
    gradient: "from-cyan-500/20 to-cyan-600/10",
    status: "Em breve"
  },
  {
    icon: Shield,
    title: "Painel de Segurança",
    description: "Proteção completa com firewall, anti-DDoS e monitoramento em tempo real.",
    color: "emerald",
    gradient: "from-emerald-500/20 to-emerald-600/10",
    status: "Em breve"
  },
  {
    icon: BarChart3,
    title: "Painel de Analytics",
    description: "Métricas detalhadas e relatórios para acompanhar o crescimento do seu negócio.",
    color: "violet",
    gradient: "from-violet-500/20 to-violet-600/10",
    status: "Em breve"
  },
  {
    icon: Users,
    title: "Painel de Usuários",
    description: "Gestão completa de usuários, permissões e acessos em um só lugar.",
    color: "orange",
    gradient: "from-orange-500/20 to-orange-600/10",
    status: "Em breve"
  },
  {
    icon: Database,
    title: "Painel de Dados",
    description: "Backup automático, sincronização e gerenciamento de dados em nuvem.",
    color: "blue",
    gradient: "from-blue-500/20 to-blue-600/10",
    status: "Em breve"
  },
  {
    icon: Globe,
    title: "Painel CDN",
    description: "Distribuição global de conteúdo com baixa latência e alta disponibilidade.",
    color: "rose",
    gradient: "from-rose-500/20 to-rose-600/10",
    status: "Em breve"
  }
];

const features = [
  { icon: Zap, label: "Ultra Rápido", description: "Performance otimizada" },
  { icon: Shield, label: "100% Seguro", description: "Criptografia avançada" },
  { icon: Globe, label: "Multi-região", description: "Servidores globais" },
  { icon: Cpu, label: "Alta Capacidade", description: "Recursos escaláveis" }
];

export default function Paineis() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-cyan-500/5 overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          className="absolute top-10 right-1/4 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.5, 0.3],
            x: [0, 30, 0]
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div 
          className="absolute bottom-10 left-1/4 w-72 h-72 bg-violet-500/15 rounded-full blur-3xl"
          animate={{
            scale: [1.3, 1, 1.3],
            opacity: [0.5, 0.3, 0.5],
            y: [0, -30, 0]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        />
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* Hero Section */}
      <motion.div 
        className="relative overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-violet-500/5 to-emerald-500/10" />
        
        <div className="container mx-auto px-4 py-16 relative z-10">
          <motion.div 
            className="text-center max-w-3xl mx-auto space-y-6"
            variants={container}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={item}>
              <Badge className="px-4 py-2 text-sm bg-cyan-500/10 text-cyan-500 border-cyan-500/20">
                <motion.span 
                  className="flex items-center"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Central de Controle
                </motion.span>
              </Badge>
            </motion.div>
            
            <motion.h1 
              variants={item}
              className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-foreground via-cyan-500 to-violet-500 bg-clip-text text-transparent"
            >
              Painéis de Controle
            </motion.h1>
            
            <motion.p 
              variants={item}
              className="text-lg md:text-xl text-muted-foreground"
            >
              Gerencie toda sua infraestrutura em um único lugar. 
              Painéis intuitivos, poderosos e em tempo real.
            </motion.p>

            <motion.div 
              variants={item}
              className="flex flex-wrap gap-4 justify-center pt-4"
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button size="lg" className="gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-500/90 hover:to-violet-600/90 shadow-lg shadow-cyan-500/25">
                  <LayoutDashboard className="h-5 w-5" />
                  Acessar Demo
                </Button>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button size="lg" variant="outline" className="gap-2 border-cyan-500/30 hover:bg-cyan-500/10">
                  <Settings className="h-5 w-5" />
                  Configurar
                </Button>
              </motion.div>
            </motion.div>

            {/* Floating Dashboard Preview */}
            <motion.div
              className="relative mt-12"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
            >
              <motion.div
                className="mx-auto max-w-2xl bg-card/80 backdrop-blur-xl rounded-2xl border border-cyan-500/20 p-6 shadow-2xl shadow-cyan-500/10"
                animate={{ y: [-5, 5, -5] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="ml-4 text-sm text-muted-foreground">dashboard.control</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="h-16 rounded-lg bg-gradient-to-br from-cyan-500/10 to-violet-500/10 border border-white/5"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.8 + i * 0.1 }}
                    />
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* Features Bar */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-wrap justify-center gap-6 md:gap-12">
          {features.map((feature, index) => (
            <motion.div
              key={feature.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="flex items-center gap-3 text-center"
              whileHover={{ scale: 1.05 }}
            >
              <motion.div
                className="p-2 rounded-lg bg-cyan-500/10"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: index * 0.5 }}
              >
                <feature.icon className="h-5 w-5 text-cyan-500" />
              </motion.div>
              <div className="text-left">
                <p className="font-semibold text-sm">{feature.label}</p>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Panels Grid */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {panels.map((panel, index) => (
            <motion.div
              key={panel.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              whileHover={{ y: -8, transition: { duration: 0.3 } }}
            >
              <Card className="group h-full hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-300 border-cyan-500/10 hover:border-cyan-500/30 bg-card/50 backdrop-blur-sm overflow-hidden relative">
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                />
                <CardContent className="p-6 space-y-4 relative">
                  <div className="flex items-start justify-between">
                    <motion.div 
                      className={`p-3 rounded-xl bg-gradient-to-br ${panel.gradient}`}
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      <panel.icon className={`h-8 w-8 text-${panel.color}-500`} />
                    </motion.div>
                    <Badge variant="outline" className="text-xs border-cyan-500/30 text-cyan-500">
                      {panel.status}
                    </Badge>
                  </div>
                  <h3 className="text-xl font-semibold">{panel.title}</h3>
                  <p className="text-muted-foreground text-sm">{panel.description}</p>
                  <div className="flex items-center gap-2 text-sm text-cyan-500 pt-2">
                    <Clock className="h-4 w-4" />
                    <span>Em desenvolvimento</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Stats Section */}
      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Card className="bg-gradient-to-r from-cyan-500/5 via-violet-500/5 to-emerald-500/5 border-cyan-500/10 overflow-hidden">
            <CardContent className="p-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                {[
                  { value: "99.9%", label: "Uptime Garantido", icon: Server },
                  { value: "50ms", label: "Latência Média", icon: Zap },
                  { value: "24/7", label: "Suporte Técnico", icon: Users },
                  { value: "∞", label: "Escalabilidade", icon: BarChart3 }
                ].map((stat, index) => (
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
                      animate={{ y: [-3, 3, -3] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: index * 0.2 }}
                    >
                      <stat.icon className="h-8 w-8 text-cyan-500" />
                    </motion.div>
                    <p className="text-3xl font-bold bg-gradient-to-r from-cyan-500 to-violet-500 bg-clip-text text-transparent">
                      {stat.value}
                    </p>
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
              className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-violet-600 to-emerald-500"
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "linear"
              }}
              style={{ backgroundSize: "200% 200%" }}
            />
            <CardContent className="p-12 relative z-10 text-center space-y-6">
              <motion.div
                className="flex justify-center mb-4"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <Monitor className="h-16 w-16 text-white/80" />
              </motion.div>
              <motion.h2 
                className="text-3xl md:text-4xl font-bold text-white"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                Pronto para Assumir o Controle?
              </motion.h2>
              <motion.p 
                className="text-lg text-white/80 max-w-2xl mx-auto"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
              >
                Seja notificado assim que nossos painéis estiverem disponíveis. 
                Acesso antecipado com recursos exclusivos.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button size="lg" variant="secondary" className="gap-2 font-semibold shadow-xl">
                  Notificar-me
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
