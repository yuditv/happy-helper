import { memo } from "react";
import cyberpunkBg from "@/assets/cyberpunk-bg.jpg";

// Optimized static background with cyberpunk image
export const AnimatedBackground = memo(function AnimatedBackground() {
  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none -z-10"
      aria-hidden="true"
    >
      {/* Cyberpunk background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${cyberpunkBg})`,
        }}
      />
      
      {/* Dark overlay for readability */}
      <div 
        className="absolute inset-0 bg-background/85 dark:bg-background/80"
      />
      
      {/* Subtle gradient overlay - Red themed */}
      <div 
        className="absolute inset-0 opacity-60"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% -20%, hsl(0 90% 60% / 0.12), transparent),
            radial-gradient(ellipse 60% 40% at 100% 100%, hsl(15 100% 55% / 0.08), transparent),
            radial-gradient(ellipse 50% 50% at 0% 50%, hsl(0 90% 60% / 0.06), transparent)
          `,
        }}
      />

      {/* Static corner accents */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-primary/8 to-transparent blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-accent/8 to-transparent blur-3xl" />

      {/* Vignette effect */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, transparent 0%, hsl(var(--background)) 100%)",
          opacity: 0.5,
        }}
      />
      
      {/* Scanlines effect - subtle */}
      <div 
        className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            hsl(0 0% 0%) 2px,
            hsl(0 0% 0%) 4px
          )`,
        }}
      />
    </div>
  );
});
