import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { 
  Coins, 
  Sparkles, 
  Zap,
  Star,
  Crown,
  Rocket,
  Gift,
  CheckCircle,
  ArrowRight,
  Gem,
  TrendingUp,
  Shield,
  Clock,
  MessageSquare
} from "lucide-react";

const packages = [
  {
    id: "starter",
    name: "Starter",
    credits: 100,
    price: 29.90,
    originalPrice: 49.90,
    popular: false,
    color: "blue",
    gradient: "from-blue-500 to-blue-600",
    features: [
      "100 créditos",
      "Válido por 30 dias",
      "Suporte básico",
      "Ideal para testes"
    ]
  },
  {
    id: "pro",
    name: "Profissional",
    credits: 500,
    price: 99.90,
    originalPrice: 199.90,
    popular: true,
    color: "purple",
    gradient: "from-purple-500 via-pink-500 to-purple-600",
    features: [
      "500 créditos",
      "Válido por 60 dias",
      "Suporte prioritário",
      "Bônus: +50 créditos",
      "Acesso antecipado"
    ]
  },
  {
    id: "enterprise",
    name: "Enterprise",
    credits: 2000,
    price: 299.90,
    originalPrice: 599.90,
    popular: false,
    color: "amber",
    gradient: "from-amber-400 via-orange-500 to-amber-600",
    features: [
      "2000 créditos",
      "Válido por 90 dias",
      "Suporte VIP 24/7",
      "Bônus: +300 créditos",
      "Recursos exclusivos",
      "Gerente dedicado"
    ]
  }
];

const benefits = [
  { icon: Zap, title: "Uso Imediato", description: "Créditos liberados instantaneamente" },
  { icon: Shield, title: "100% Seguro", description: "Pagamento criptografado" },
  { icon: Gift, title: "Bônus Extras", description: "Ganhe créditos adicionais" },
  { icon: Clock, title: "Sem Expirar Rápido", description: "Validade estendida" }
];

export default function Creditos() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-purple-500/5 overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2],
            rotate: [0, 180, 360]
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div 
          className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500/15 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div 
          className="absolute top-1/3 right-10 w-64 h-64 bg-amber-500/10 rounded-full blur-2xl"
          animate={{
            y: [-20, 20, -20],
            x: [-10, 10, -10]
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Floating Coins */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`
            }}
            animate={{
              y: [-20, 20, -20],
              rotate: [0, 360],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{
              duration: 4 + i,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.5
            }}
          >
            <Coins className="h-8 w-8 text-amber-500/40" />
          </motion.div>
        ))}
      </div>

      {/* Hero Section */}
      <motion.div 
        className="relative overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/5 to-amber-500/10" />
        
        <div className="container mx-auto px-4 py-12 relative z-10">
          <motion.div 
            className="text-center max-w-4xl mx-auto space-y-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Sale Badge */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            >
              <Badge className="px-6 py-3 text-lg bg-gradient-to-r from-red-500 to-pink-500 text-white border-0 shadow-lg shadow-red-500/25">
                <motion.span 
                  className="flex items-center gap-2"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <Zap className="h-5 w-5" />
                  🔥 OFERTA ESPECIAL - ATÉ 50% OFF 🔥
                  <Zap className="h-5 w-5" />
                </motion.span>
              </Badge>
            </motion.div>

            {/* Main Icon */}
            <motion.div
              className="flex justify-center"
              animate={{ 
                y: [-5, 5, -5],
                rotate: [-5, 5, -5]
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="relative">
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full blur-2xl opacity-50"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <div className="relative p-6 rounded-full bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 shadow-2xl shadow-amber-500/50">
                  <Coins className="h-16 w-16 text-white" />
                </div>
              </div>
            </motion.div>
            
            <motion.h1 
              className="text-4xl md:text-6xl font-bold"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <span className="bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-500 bg-clip-text text-transparent">
                Lovable Créditos
              </span>
            </motion.h1>
            
            <motion.p 
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              Potencialize suas criações com créditos Lovable. 
              Mais poder, mais possibilidades, mais resultados.
            </motion.p>

            {/* Trust Badges */}
            <motion.div
              className="flex flex-wrap justify-center gap-6 pt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {benefits.map((benefit, index) => (
                <motion.div
                  key={benefit.title}
                  className="flex items-center gap-2 text-sm"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="p-2 rounded-lg bg-primary/10">
                    <benefit.icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-muted-foreground">{benefit.title}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* Pricing Cards */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {packages.map((pkg, index) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15, duration: 0.5 }}
              whileHover={{ y: -10, transition: { duration: 0.3 } }}
              className={pkg.popular ? "md:-mt-4 md:mb-4" : ""}
            >
              <Card className={`relative h-full overflow-hidden transition-all duration-300 ${
                pkg.popular 
                  ? "border-2 border-purple-500 shadow-2xl shadow-purple-500/20" 
                  : "border-primary/10 hover:border-primary/30"
              } bg-card/80 backdrop-blur-sm`}>
                {pkg.popular && (
                  <motion.div 
                    className="absolute top-0 left-0 right-0 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 text-white text-center py-2 text-sm font-bold"
                    animate={{
                      backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                    style={{ backgroundSize: "200% 200%" }}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <Crown className="h-4 w-4" />
                      MAIS POPULAR
                      <Crown className="h-4 w-4" />
                    </span>
                  </motion.div>
                )}
                
                <CardHeader className={`text-center ${pkg.popular ? "pt-12" : "pt-6"}`}>
                  <motion.div
                    className={`mx-auto p-4 rounded-2xl bg-gradient-to-br ${pkg.gradient} mb-4 w-fit`}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    {pkg.id === "starter" && <Star className="h-10 w-10 text-white" />}
                    {pkg.id === "pro" && <Gem className="h-10 w-10 text-white" />}
                    {pkg.id === "enterprise" && <Crown className="h-10 w-10 text-white" />}
                  </motion.div>
                  
                  <CardTitle className="text-2xl">{pkg.name}</CardTitle>
                  
                  <div className="pt-4">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-lg text-muted-foreground line-through">
                        R$ {pkg.originalPrice.toFixed(2)}
                      </span>
                      <Badge variant="destructive" className="text-xs">
                        -{Math.round((1 - pkg.price / pkg.originalPrice) * 100)}%
                      </Badge>
                    </div>
                    <motion.div 
                      className="text-4xl font-bold mt-2"
                      initial={{ scale: 0.5 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ type: "spring", stiffness: 200 }}
                    >
                      <span className={`bg-gradient-to-r ${pkg.gradient} bg-clip-text text-transparent`}>
                        R$ {pkg.price.toFixed(2)}
                      </span>
                    </motion.div>
                    <p className="text-sm text-muted-foreground mt-1">pagamento único</p>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Credits Display */}
                  <motion.div 
                    className={`text-center p-4 rounded-xl bg-gradient-to-r ${pkg.gradient} bg-opacity-10`}
                    style={{ background: `linear-gradient(135deg, var(--${pkg.color}-500) / 0.1, var(--${pkg.color}-600) / 0.05)` }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Coins className={`h-6 w-6 text-${pkg.color}-500`} />
                      <span className="text-3xl font-bold">{pkg.credits.toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">créditos</p>
                  </motion.div>

                  {/* Features List */}
                  <ul className="space-y-3">
                    {pkg.features.map((feature, i) => (
                      <motion.li
                        key={i}
                        className="flex items-center gap-3"
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <CheckCircle className={`h-5 w-5 text-${pkg.color}-500 flex-shrink-0`} />
                        <span className="text-sm">{feature}</span>
                      </motion.li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button 
                      className={`w-full h-12 text-lg font-semibold gap-2 ${
                        pkg.popular 
                          ? `bg-gradient-to-r ${pkg.gradient} hover:opacity-90 shadow-lg shadow-purple-500/25` 
                          : ""
                      }`}
                      variant={pkg.popular ? "default" : "outline"}
                    >
                      <Rocket className="h-5 w-5" />
                      Comprar Agora
                      <motion.span
                        animate={{ x: [0, 5, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <ArrowRight className="h-5 w-5" />
                      </motion.span>
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Card className="bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-amber-500/5 border-purple-500/10 overflow-hidden">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-center mb-8">Por que escolher Lovable Créditos?</h2>
              <div className="grid md:grid-cols-4 gap-6">
                {[
                  { icon: TrendingUp, title: "Melhor Custo-Benefício", description: "Economize até 50% em créditos" },
                  { icon: Zap, title: "Ativação Instantânea", description: "Use seus créditos imediatamente" },
                  { icon: Shield, title: "Garantia Total", description: "Satisfação ou reembolso" },
                  { icon: MessageSquare, title: "Suporte Premium", description: "Atendimento prioritário" }
                ].map((item, index) => (
                  <motion.div
                    key={item.title}
                    className="text-center space-y-3"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ y: -5 }}
                  >
                    <motion.div
                      className="mx-auto p-4 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/10 w-fit"
                      animate={{ rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: index * 0.3 }}
                    >
                      <item.icon className="h-8 w-8 text-purple-500" />
                    </motion.div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Urgency CTA */}
      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Card className="overflow-hidden relative">
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500"
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "linear"
              }}
              style={{ backgroundSize: "200% 200%" }}
            />
            <CardContent className="p-12 relative z-10 text-center space-y-6">
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles className="h-16 w-16 text-white mx-auto" />
              </motion.div>
              <motion.h2 
                className="text-3xl md:text-4xl font-bold text-white"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                ⏰ Oferta por Tempo Limitado!
              </motion.h2>
              <motion.p 
                className="text-lg text-white/90 max-w-2xl mx-auto"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
              >
                Aproveite os descontos exclusivos antes que acabem. 
                Garanta seus créditos agora e economize até 50%!
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button size="lg" variant="secondary" className="gap-2 font-bold text-lg px-8 shadow-2xl">
                  <Gift className="h-6 w-6" />
                  Garantir Meus Créditos
                  <motion.span
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
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
