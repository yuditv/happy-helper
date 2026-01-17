import { useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

interface FloatingOrb {
  id: number;
  x: string;
  y: string;
  size: number;
  color: string;
  duration: number;
  delay: number;
}

export function AnimatedBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate particles with useMemo to avoid regeneration
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 1,
      duration: Math.random() * 20 + 15,
      delay: Math.random() * 5,
      opacity: Math.random() * 0.5 + 0.1,
    }));
  }, []);

  // Generate floating orbs
  const orbs = useMemo<FloatingOrb[]>(() => [
    {
      id: 1,
      x: "10%",
      y: "20%",
      size: 300,
      color: "hsl(260 100% 65% / 0.08)",
      duration: 25,
      delay: 0,
    },
    {
      id: 2,
      x: "80%",
      y: "60%",
      size: 400,
      color: "hsl(200 100% 50% / 0.06)",
      duration: 30,
      delay: 2,
    },
    {
      id: 3,
      x: "50%",
      y: "80%",
      size: 250,
      color: "hsl(160 100% 45% / 0.05)",
      duration: 20,
      delay: 4,
    },
    {
      id: 4,
      x: "25%",
      y: "70%",
      size: 200,
      color: "hsl(280 100% 60% / 0.07)",
      duration: 22,
      delay: 1,
    },
    {
      id: 5,
      x: "70%",
      y: "15%",
      size: 350,
      color: "hsl(220 100% 55% / 0.05)",
      duration: 28,
      delay: 3,
    },
  ], []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 overflow-hidden pointer-events-none -z-10"
      aria-hidden="true"
    >
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-background" />

      {/* Animated mesh gradient */}
      <div className="absolute inset-0 opacity-60">
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
      </div>

      {/* Floating orbs */}
      {orbs.map((orb) => (
        <motion.div
          key={orb.id}
          className="absolute rounded-full blur-3xl"
          style={{
            left: orb.x,
            top: orb.y,
            width: orb.size,
            height: orb.size,
            background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
            transform: "translate(-50%, -50%)",
          }}
          animate={{
            x: [0, 50, -30, 0],
            y: [0, -40, 30, 0],
            scale: [1, 1.2, 0.9, 1],
          }}
          transition={{
            duration: orb.duration,
            delay: orb.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Particle field */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-primary/30"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
          }}
          animate={{
            y: [0, -100, 0],
            x: [0, Math.random() * 40 - 20, 0],
            opacity: [particle.opacity, particle.opacity * 1.5, particle.opacity],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
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

      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-transparent blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-accent/10 to-transparent blur-3xl" />

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
