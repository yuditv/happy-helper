import { memo } from "react";

// Premium subtle animated background
export const AnimatedBackground = memo(function AnimatedBackground() {
  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none -z-10"
      aria-hidden="true"
    >
      {/* Base gradient - subtle and elegant */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 100% 80% at 20% 0%, hsl(0 85% 55% / 0.06), transparent 60%),
            radial-gradient(ellipse 60% 50% at 80% 100%, hsl(15 90% 55% / 0.04), transparent 50%),
            radial-gradient(ellipse 80% 60% at 50% 50%, hsl(240 20% 8% / 0.02), transparent)
          `,
        }}
      />
      
      {/* Floating orbs - very subtle */}
      <div 
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-30 float-slow"
        style={{
          background: "radial-gradient(circle, hsl(0 85% 55% / 0.08), transparent 70%)",
        }}
      />
      <div 
        className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl opacity-20"
        style={{
          background: "radial-gradient(circle, hsl(15 90% 55% / 0.06), transparent 70%)",
          animation: "float-slow 10s ease-in-out infinite reverse",
        }}
      />
      
      {/* Corner accents */}
      <div 
        className="absolute top-0 left-0 w-1/3 h-1/3"
        style={{
          background: "radial-gradient(ellipse at top left, hsl(0 85% 55% / 0.04), transparent 50%)",
        }}
      />
      <div 
        className="absolute bottom-0 right-0 w-1/2 h-1/2"
        style={{
          background: "radial-gradient(ellipse at bottom right, hsl(15 90% 55% / 0.03), transparent 50%)",
        }}
      />
      
      {/* Subtle noise texture overlay */}
      <div 
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
});
