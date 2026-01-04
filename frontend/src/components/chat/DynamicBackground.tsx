"use client";

import { motion } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";

interface DynamicBackgroundProps {
  children: React.ReactNode;
}

export function DynamicBackground({ children }: DynamicBackgroundProps) {
  const { theme, colors } = useTheme();

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Base gradient layer */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background-secondary to-background" />

      {/* Animated orbs based on theme */}
      <motion.div
        key={`orb-1-${theme}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
        className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[100px] animate-float"
        style={{
          background: `radial-gradient(circle, rgba(${colors.primaryRgb}, 0.15) 0%, transparent 70%)`,
        }}
      />

      <motion.div
        key={`orb-2-${theme}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, delay: 0.3 }}
        className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full blur-[80px] animate-float"
        style={{
          background: `radial-gradient(circle, rgba(${colors.primaryRgb}, 0.12) 0%, transparent 70%)`,
          animationDelay: "-3s",
        }}
      />

      <motion.div
        key={`orb-3-${theme}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, delay: 0.6 }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] animate-pulse-slow"
        style={{
          background: `radial-gradient(circle, rgba(${colors.primaryRgb}, 0.08) 0%, transparent 70%)`,
        }}
      />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
        }}
      />

      {/* Noise texture */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}





