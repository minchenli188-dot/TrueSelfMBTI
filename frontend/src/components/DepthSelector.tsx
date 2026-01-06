"use client";

import { motion } from "framer-motion";
import { Clock, Zap, Brain, Sparkles, Palette, MessageSquare, FileText, Crown, Gift, Timer } from "lucide-react";
import type { AnalysisDepth } from "@/hooks/useChatSession";

interface DepthSelectorProps {
  onSelect: (depth: AnalysisDepth) => void;
  isLoading: boolean;
}

interface FeatureTag {
  icon: typeof Clock;
  label: string;
  tier?: "basic" | "standard" | "pro";
}

const DEPTH_OPTIONS: Array<{
  depth: AnalysisDepth;
  title: string;
  subtitle: string;
  duration: string;
  icon: typeof Clock;
  color: string;
  description: string;
  features: FeatureTag[];
  badge?: string;
  badgeType?: "free" | "limited-free" | "limited-quantity-free";
}> = [
  {
    depth: "shallow",
    title: "快速模式",
    subtitle: "发现你的气质颜色",
    duration: "5 题",
    icon: Zap,
    color: "#e2a03f",
    description: "快速识别你属于四大气质类型中的哪一种：分析家、外交家、守卫者或探索者",
    features: [
      { icon: FileText, label: "性格报告", tier: "basic" },
    ],
    badge: "免费",
    badgeType: "free",
  },
  {
    depth: "standard",
    title: "标准模式",
    subtitle: "确定完整人格类型",
    duration: "15 题",
    icon: Brain,
    color: "#4298b4",
    description: "通过深入对话，确定你的 4 字母人格类型（如 INTJ、ENFP 等）",
    features: [
      { icon: Palette, label: "专属画像", tier: "standard" },
      { icon: MessageSquare, label: "AI 解答", tier: "standard" },
      { icon: FileText, label: "详细报告", tier: "standard" },
    ],
    badge: "免费",
    badgeType: "free",
  },
  {
    depth: "deep",
    title: "深度模式",
    subtitle: "探索认知功能",
    duration: "30 题",
    icon: Sparkles,
    color: "#88619a",
    description: "基于荣格理论，分析你的认知功能栈和发展阶段，获得最深入的洞察",
    features: [
      { icon: Palette, label: "专属画像", tier: "standard" },
      { icon: MessageSquare, label: "深度 AI 解答", tier: "pro" },
      { icon: Crown, label: "专业心理报告", tier: "pro" },
    ],
    badge: "限时免费",
    badgeType: "limited-free",
  },
];

export function DepthSelector({ onSelect, isLoading }: DepthSelectorProps) {
  return (
    <div className="w-full max-w-3xl mx-auto px-6">
      {/* Options */}
      <div className="grid gap-4 md:gap-6">
        {DEPTH_OPTIONS.map((option, index) => (
          <motion.button
            key={option.depth}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onSelect(option.depth)}
            disabled={isLoading}
            className="group relative w-full p-6 rounded-2xl glass text-left transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              borderLeft: `4px solid ${option.color}`,
            }}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Glow on hover */}
            <div
              className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"
              style={{
                boxShadow: `0 0 40px -10px ${option.color}`,
              }}
            />

            <div className="flex items-start gap-4">
              {/* Icon */}
              <div
                className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                style={{
                  backgroundColor: `${option.color}20`,
                }}
              >
                <option.icon className="w-6 h-6" style={{ color: option.color }} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-lg font-semibold">{option.title}</h3>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: `${option.color}20`,
                      color: option.color,
                    }}
                  >
                    {option.duration}
                  </span>
                  {/* Free badge */}
                  {option.badge && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{
                        backgroundColor: option.badgeType === "free" ? "#22c55e20" : "#ef444420",
                        color: option.badgeType === "free" ? "#22c55e" : "#ef4444",
                        border: `1px solid ${option.badgeType === "free" ? "#22c55e40" : "#ef444440"}`,
                      }}
                    >
                      {option.badgeType === "limited-free" && <Timer className="w-3 h-3" />}
                      {option.badgeType === "free" && <Gift className="w-3 h-3" />}
                      {option.badge}
                    </span>
                  )}
                </div>
                <p className="text-foreground-muted text-sm mb-2">
                  {option.subtitle}
                </p>
                <p className="text-foreground-subtle text-xs mb-3">
                  {option.description}
                </p>
                {/* Feature tags */}
                <div className="flex flex-wrap gap-2">
                  {option.features.map((feature) => {
                    const tierStyles = {
                      basic: {
                        bg: "rgba(255,255,255,0.06)",
                        color: "rgba(255,255,255,0.6)",
                        border: "rgba(255,255,255,0.08)",
                        badge: null,
                      },
                      standard: {
                        bg: `${option.color}20`,
                        color: option.color,
                        border: `${option.color}40`,
                        badge: "限时免费",
                        badgeColor: "#ef4444",
                      },
                      pro: {
                        bg: `${option.color}30`,
                        color: option.color,
                        border: `${option.color}60`,
                        badge: "限时免费",
                        badgeColor: "#ef4444",
                      },
                    };
                    const style = tierStyles[feature.tier || "basic"];
                    return (
                      <span
                        key={feature.label}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                        style={{
                          backgroundColor: style.bg,
                          color: style.color,
                          border: `1px solid ${style.border}`,
                        }}
                      >
                        <feature.icon className="w-3 h-3" />
                        {feature.label}
                        {style.badge && (
                          <span 
                            className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded ml-0.5 font-semibold"
                            style={{
                              backgroundColor: `${style.badgeColor}20`,
                              color: style.badgeColor,
                            }}
                          >
                            <Timer className="w-2.5 h-2.5" />
                            {style.badge}
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Arrow */}
              <div className="flex-shrink-0 self-center">
                <motion.div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${option.color}20` }}
                  whileHover={{ x: 4 }}
                >
                  <svg
                    className="w-4 h-4"
                    style={{ color: option.color }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </motion.div>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Recommended tag */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-center text-foreground-subtle text-sm mt-8"
      >
        💡 推荐首次用户尝试 <span className="text-explorer">快速模式</span>，体验后可随时升级
      </motion.p>
    </div>
  );
}
