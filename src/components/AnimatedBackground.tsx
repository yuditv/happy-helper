import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  parallaxFactor: number;
}

interface FloatingOrb {
  id: number;
  x: string;
  y: string;
  size: number;
  color: string;
  duration: number;
  delay: number;
  parallaxFactor: number;
}

export function AnimatedBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 });

  // Smooth spring animation for mouse position
  const springConfig = { damping: 25, stiffness: 120 };
  const mouseXSpring = useSpring(0.5, springConfig);
  const mouseYSpring = useSpring(0.5, springConfig);

  // Update springs when mouse moves
  useEffect(() => {
    mouseXSpring.set(mousePosition.x);
    mouseYSpring.set(mousePosition.y);
  }, [mousePosition, mouseXSpring, mouseYSpring]);

  // Mouse move handler
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;
    setMousePosition({ x, y });
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  // Generate particles with parallax factor
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 1,
      duration: Math.random() * 20 + 15,
      delay: Math.random() * 5,
      opacity: Math.random() * 0.5 + 0.1,
      parallaxFactor: Math.random() * 30 + 10,
    }));
  }, []);

  // Generate floating orbs with parallax
  const orbs = useMemo<FloatingOrb[]>(() => [
    {
      id: 1,
      x: "10%",
      y: "20%",
      size: 300,
      color: "hsl(260 100% 65% / 0.08)",
      duration: 25,
      delay: 0,
      parallaxFactor: 40,
    },
    {
      id: 2,
      x: "80%",
      y: "60%",
      size: 400,
      color: "hsl(200 100% 50% / 0.06)",
      duration: 30,
      delay: 2,
      parallaxFactor: 60,
    },
    {
      id: 3,
      x: "50%",
      y: "80%",
      size: 250,
      color: "hsl(160 100% 45% / 0.05)",
      duration: 20,
      delay: 4,
      parallaxFactor: 30,
    },
    {
      id: 4,
      x: "25%",
      y: "70%",
      size: 200,
      color: "hsl(280 100% 60% / 0.07)",
      duration: 22,
      delay: 1,
      parallaxFactor: 50,
    },
    {
      id: 5,
      x: "70%",
      y: "15%",
      size: 350,
      color: "hsl(220 100% 55% / 0.05)",
      duration: 28,
      delay: 3,
      parallaxFactor: 45,
    },
  ], []);

  // Transform mouse position to parallax offset
  const orbTransformX = useTransform(mouseXSpring, [0, 1], [-1, 1]);
  const orbTransformY = useTransform(mouseYSpring, [0, 1], [-1, 1]);
  const gridTransformX = useTransform(mouseXSpring, [0, 1], [10, -10]);
  const gridTransformY = useTransform(mouseYSpring, [0, 1], [10, -10]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 overflow-hidden pointer-events-none -z-10"
      aria-hidden="true"
    >
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-background" />

      {/* Animated mesh gradient with parallax */}
      <motion.div 
        className="absolute inset-0 opacity-60"
        style={{
          x: useTransform(mouseXSpring, [0, 1], [-20, 20]),
          y: useTransform(mouseYSpring, [0, 1], [-20, 20]),
        }}
      >
        <motion.div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 50% at 50% -20%, hsl(260 100% 65% / 0.15), transparent),
              radial-gradient(ellipse 60% 40% at 100% 100%, hsl(200 100% 50% / 0.12), transparent),
              radial-gradient(ellipse 50% 50% at 0% 50%, hsl(160 100% 45% / 0.08), transparent)
            `,
          }}
          animate={{
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.div>

      {/* Floating orbs with parallax */}
      {orbs.map((orb) => {
        const parallaxX = useTransform(mouseXSpring, [0, 1], [-orb.parallaxFactor, orb.parallaxFactor]);
        const parallaxY = useTransform(mouseYSpring, [0, 1], [-orb.parallaxFactor, orb.parallaxFactor]);
        
        return (
          <motion.div
            key={orb.id}
            className="absolute rounded-full blur-3xl"
            style={{
              left: orb.x,
              top: orb.y,
              width: orb.size,
              height: orb.size,
              background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
              x: parallaxX,
              y: parallaxY,
            }}
            animate={{
              scale: [1, 1.15, 0.95, 1],
            }}
            transition={{
              duration: orb.duration,
              delay: orb.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        );
      })}

      {/* Particle field with parallax */}
      {particles.map((particle) => {
        const pX = useTransform(mouseXSpring, [0, 1], [-particle.parallaxFactor, particle.parallaxFactor]);
        const pY = useTransform(mouseYSpring, [0, 1], [-particle.parallaxFactor, particle.parallaxFactor]);
        
        return (
          <motion.div
            key={particle.id}
            className="absolute rounded-full bg-primary/30"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: particle.size,
              height: particle.size,
              x: pX,
              y: pY,
            }}
            animate={{
              opacity: [particle.opacity, particle.opacity * 1.5, particle.opacity],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        );
      })}

      {/* Grid overlay with parallax */}
      <motion.div
        className="absolute inset-[-50px] opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          x: gridTransformX,
          y: gridTransformY,
        }}
      />

      {/* Animated scan line */}
      <motion.div
        className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"
        animate={{
          top: ["-10%", "110%"],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* Corner accents with parallax */}
      <motion.div 
        className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-transparent blur-3xl"
        style={{
          x: useTransform(mouseXSpring, [0, 1], [-30, 30]),
          y: useTransform(mouseYSpring, [0, 1], [-30, 30]),
        }}
      />
      <motion.div 
        className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-accent/10 to-transparent blur-3xl"
        style={{
          x: useTransform(mouseXSpring, [0, 1], [30, -30]),
          y: useTransform(mouseYSpring, [0, 1], [30, -30]),
        }}
      />

      {/* Vignette effect */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, transparent 0%, hsl(var(--background)) 100%)",
          opacity: 0.4,
        }}
      />
    </div>
  );
}
