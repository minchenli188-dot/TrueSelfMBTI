"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import { Brain, Sparkles, Radio, Target } from "lucide-react";

interface StatusBarProps {
  progress: number;
  currentPrediction: string;
  confidenceScore: number;
  currentRound: number;
  isLoading?: boolean;
  isDeepMode?: boolean;
  developmentLevel?: string | null;
}

// Development level translations
// Note: AI may return variations, so we map common aliases
const DEVELOPMENT_LEVEL_LABELS: Record<string, string> = {
  // Standard keys
  Low: "发展初期",
  Medium: "平衡期",
  High: "成熟期",
  // Common English variations
  low: "发展初期",
  medium: "平衡期",
  high: "成熟期",
  Early: "发展初期",
  early: "发展初期",
  Developing: "平衡期",
  developing: "平衡期",
  Mature: "成熟期",
  mature: "成熟期",
  Advanced: "成熟期",
  advanced: "成熟期",
  Beginner: "发展初期",
  beginner: "发展初期",
  Intermediate: "平衡期",
  intermediate: "平衡期",
};

// Confidence level display configuration
type ConfidenceLevel = "scanning" | "emerging" | "matching";

interface ConfidenceDisplay {
  label: string;
  showType: boolean;
  level: ConfidenceLevel;
  icon: React.ReactNode;
}

function getConfidenceDisplay(
  confidence: number,
  prediction: string,
  colors: { primary: string }
): ConfidenceDisplay {
  if (confidence < 50) {
    return {
      label: "系统还需要更多对话内容",
      showType: false,
      level: "scanning",
      icon: <Radio className="w-4 h-4 animate-pulse" style={{ color: colors.primary }} />,
    };
  } else if (confidence < 70) {
    return {
      label: `轮廓出现：${prediction}`,
      showType: true,
      level: "emerging",
      icon: <Sparkles className="w-4 h-4" style={{ color: colors.primary }} />,
    };
  } else {
    return {
      label: `高度吻合特征：${prediction}`,
      showType: true,
      level: "matching",
      icon: <Target className="w-4 h-4" style={{ color: colors.primary }} />,
    };
  }
}

// Confidence level styles
const confidenceLevelStyles: Record<ConfidenceLevel, string> = {
  scanning: "text-foreground-muted",
  emerging: "text-foreground-secondary",
  matching: "text-foreground font-semibold",
};

export function StatusBar({
  progress,
  currentPrediction,
  confidenceScore,
  currentRound,
  isLoading,
  isDeepMode = false,
  developmentLevel,
}: StatusBarProps) {
  const { colors } = useTheme();
  
  // Only show prediction section when we have a valid prediction
  const hasPrediction = currentPrediction && currentPrediction !== "Unknown";
  const confidenceDisplay = hasPrediction 
    ? getConfidenceDisplay(confidenceScore, currentPrediction, colors)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full px-4 py-3 glass border-b border-border/50"
    >
      <div className="max-w-3xl mx-auto">
        {/* Progress bar */}
        <div className="relative h-2 bg-background-tertiary rounded-full overflow-hidden mb-3">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{ backgroundColor: colors.primary }}
          />
          
          {/* Shimmer effect when loading */}
          {isLoading && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
          )}
        </div>

        {/* Status info */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            {/* Round counter */}
            <div className="flex items-center gap-1.5 text-foreground-muted">
              <Brain className="w-4 h-4" />
              <span>第 {currentRound} 轮</span>
            </div>
          </div>

          {/* Confidence display - 4-level system */}
          <AnimatePresence mode="wait">
            {confidenceDisplay && (
              <motion.div
                key={confidenceDisplay.level}
                initial={{ opacity: 0, scale: 0.9, x: 10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9, x: -10 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-2 flex-wrap justify-end"
              >
                {confidenceDisplay.icon}
                
                {confidenceDisplay.level === "scanning" ? (
                  // Scanning state - just show the message with animation
                  <motion.span 
                    className={`${confidenceLevelStyles[confidenceDisplay.level]}`}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {confidenceDisplay.label}
                  </motion.span>
                ) : (
                  // Other states - show styled prediction
                  <>
                    <span
                      className={`font-medium px-2 py-0.5 rounded-md ${confidenceLevelStyles[confidenceDisplay.level]}`}
                      style={{
                        backgroundColor: `rgba(${colors.primaryRgb}, ${
                          confidenceDisplay.level === "matching" ? 0.2 : 0.1
                        })`,
                        color: colors.primary,
                      }}
                    >
                      {confidenceDisplay.label}
                    </span>
                    
                    {/* Development level for deep mode */}
                    {isDeepMode && developmentLevel && (
                      <span
                        className="font-medium px-2 py-0.5 rounded-md text-xs"
                        style={{
                          color: colors.primary,
                          backgroundColor: `rgba(${colors.primaryRgb}, 0.1)`,
                        }}
                      >
                        {DEVELOPMENT_LEVEL_LABELS[developmentLevel] || developmentLevel}
                      </span>
                    )}
                    
                    {/* Confidence percentage - only show when matching */}
                    {confidenceDisplay.level === "matching" && (
                      <span className="text-foreground-subtle text-xs">
                        ({confidenceScore}%)
                      </span>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
