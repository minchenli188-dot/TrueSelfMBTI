"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Copy,
  Check,
  Share2,
  Loader2,
  ImageIcon,
  ArrowRight,
  RefreshCw,
  MessageSquare,
  ChevronDown,
  FileText,
  Download,
  Printer,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import type { ResultData } from "@/hooks/useChatSession";

interface ResultViewProps {
  resultData: ResultData;
  isGeneratingImage: boolean;
  generatedImageUrl: string | null;
  onGenerateImage: () => void;
  onRestart: () => void;
  onOpenQA?: () => void;
  onUpgradeToStandard?: () => void;
  onUpgradeToDeep?: () => void;
  isUpgrading?: boolean;
  currentDepth?: "shallow" | "standard" | "deep";
}

const GROUP_INFO: Record<string, { name: string; description: string }> = {
  analyst: {
    name: "分析家",
    description: "以理性和战略思维著称，追求知识与能力的极致",
  },
  diplomat: {
    name: "外交家",
    description: "以同理心和理想主义著称，追求意义与和谐",
  },
  sentinel: {
    name: "守卫者",
    description: "以责任感和可靠性著称，追求秩序与安全",
  },
  explorer: {
    name: "探索者",
    description: "以灵活性和实用主义著称，追求自由与体验",
  },
};

// Color types for shallow mode (temperament colors)
const COLOR_TYPES = ["Purple", "Green", "Blue", "Yellow"];


// Cognitive function descriptions for deep mode
const COGNITIVE_FUNCTION_INFO: Record<string, { name: string; description: string }> = {
  Ni: { name: "内倾直觉 (Ni)", description: "一种深层的洞察力，能够预见未来趋势和可能性，常常在不知不觉中得出结论" },
  Ne: { name: "外倾直觉 (Ne)", description: "能够迅速看到多种可能性和联系，善于头脑风暴和创新思维" },
  Si: { name: "内倾感觉 (Si)", description: "依赖过去经验和记忆，注重细节、传统和个人历史" },
  Se: { name: "外倾感觉 (Se)", description: "活在当下，对物理环境高度敏感，追求实际体验和感官享受" },
  Ti: { name: "内倾思维 (Ti)", description: "追求内在逻辑的一致性，喜欢分析和理解事物运作的原理" },
  Te: { name: "外倾思维 (Te)", description: "注重效率和组织，善于制定计划和实现可衡量的目标" },
  Fi: { name: "内倾情感 (Fi)", description: "深度个人价值观导向，追求真实性和内心的道德指南" },
  Fe: { name: "外倾情感 (Fe)", description: "重视人际和谐，善于理解和回应他人的情感需求" },
};

// Development level descriptions
const DEVELOPMENT_LEVEL_INFO: Record<string, { title: string; description: string; characteristics: string[] }> = {
  Low: {
    title: "发展初期",
    description: "主要依赖主导功能，辅助和第三功能尚在发展中。在压力下可能表现出劣势功能的负面特征。",
    characteristics: [
      "主导功能主导决策和行为",
      "对劣势功能的触发点较敏感",
      "需要发展辅助功能来平衡",
      "成长空间巨大"
    ]
  },
  Medium: {
    title: "平衡发展期",
    description: "主导和辅助功能配合良好，正在发展第三功能。能够意识到自己的劣势功能并尝试管理。",
    characteristics: [
      "主导和辅助功能协调工作",
      "开始整合第三功能",
      "能够识别压力触发点",
      "在熟悉领域表现出色"
    ]
  },
  High: {
    title: "成熟整合期",
    description: "能够灵活运用所有四个主要功能，甚至有意识地使用阴影功能。展现出类型的灵活性和成熟度。",
    characteristics: [
      "四个主要功能运作流畅",
      "能够有意识地调用不同功能",
      "在压力下保持相对平衡",
      "展现个性化的成长"
    ]
  },
};

export function ResultView({
  resultData,
  isGeneratingImage,
  generatedImageUrl,
  onGenerateImage,
  onRestart,
  onOpenQA,
  onUpgradeToStandard,
  onUpgradeToDeep,
  isUpgrading,
  currentDepth = "standard",
}: ResultViewProps) {
  const { colors } = useTheme();
  const [copied, setCopied] = useState(false);
  const [showReport, setShowReport] = useState(true); // Show report by default
  const reportRef = useRef<HTMLDivElement>(null);

  const groupInfo = GROUP_INFO[resultData.group] || GROUP_INFO.analyst;
  
  // Check if this is shallow mode (color type result)
  const isShallowMode = COLOR_TYPES.includes(resultData.mbti_type);
  const isStandardMode = currentDepth === "standard" && !isShallowMode;
  const isDeepMode = currentDepth === "deep";

  // Auto-scroll to report when expanded
  useEffect(() => {
    if (showReport && reportRef.current) {
      reportRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showReport]);

  const handleDownloadImage = () => {
    if (!generatedImageUrl) return;
    
    // Create a temporary link element
    const link = document.createElement('a');
    link.href = generatedImageUrl;
    link.download = `${resultData.mbti_type}_TrueSelfMBTI.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintReport = () => {
    window.print();
  };

  const handleCopy = async () => {
    // Build result text based on depth mode
    let resultText = "";
    
    if (isShallowMode) {
      // Shallow mode: Show temperament color only
      resultText = `我的气质类型：${resultData.type_name}（${groupInfo.name}）`;
    } else if (isDeepMode) {
      // Deep mode: Show full MBTI + cognitive stack + development level
      const cognitiveStack = resultData.cognitive_stack 
        ? `\n认知功能栈：${resultData.cognitive_stack.join(" → ")}`
        : "";
      const devLevel = resultData.development_level
        ? `\n发展阶段：${DEVELOPMENT_LEVEL_INFO[resultData.development_level]?.title || resultData.development_level}`
        : "";
      resultText = `我的 MBTI 类型：${resultData.mbti_type}（${resultData.type_name}）${cognitiveStack}${devLevel}`;
    } else {
      // Standard mode: Show MBTI type and group
      const cognitiveStack = resultData.cognitive_stack 
        ? `\n认知功能栈：${resultData.cognitive_stack.join(" → ")}`
        : "";
      resultText = `我的 MBTI 类型：${resultData.mbti_type}（${resultData.type_name}）${cognitiveStack}`;
    }
    
    const shareText = `和朋友聊天一样的 MBTI 测试
聊着聊着，就发现了真正的自己

这是我的结果，你也来试试
${resultText}

TrueSelfMBTI.com`;

    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = shareText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center min-h-[60vh] px-6 py-12"
    >
      {/* Celebration effect */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", duration: 0.8 }}
        className="relative mb-8"
      >
        {/* Glowing ring */}
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{
            boxShadow: [
              `0 0 60px 20px rgba(${colors.primaryRgb}, 0.3)`,
              `0 0 80px 30px rgba(${colors.primaryRgb}, 0.5)`,
              `0 0 60px 20px rgba(${colors.primaryRgb}, 0.3)`,
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />

        {/* Type badge */}
        <div
          className="relative w-32 h-32 rounded-full flex items-center justify-center border-4"
          style={{
            backgroundColor: `rgba(${colors.primaryRgb}, 0.2)`,
            borderColor: colors.primary,
          }}
        >
          <span
            className="text-4xl font-bold font-mono"
            style={{ color: colors.primary }}
          >
            {resultData.mbti_type}
          </span>
        </div>
      </motion.div>

      {/* Type name */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="font-display text-4xl md:text-5xl text-center mb-2"
      >
        {resultData.type_name}
      </motion.h1>

      {/* Group info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-center mb-8"
      >
        <span
          className="inline-block px-3 py-1 rounded-full text-sm font-medium mb-2"
          style={{
            backgroundColor: `rgba(${colors.primaryRgb}, 0.15)`,
            color: colors.primary,
          }}
        >
          {groupInfo.name}
        </span>
        <p className="text-foreground-muted max-w-md">{groupInfo.description}</p>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-2 gap-4 mb-8 w-full max-w-md"
      >
        <StatCard
          label="置信度"
          value={`${resultData.confidence_score}%`}
          color={colors.primary}
        />
        <StatCard
          label="对话轮数"
          value={`${resultData.total_rounds}`}
          color={colors.primary}
        />
      </motion.div>

      {/* Cognitive stack (if available) - Hidden for shallow mode */}
      {!isShallowMode && resultData.cognitive_stack && resultData.cognitive_stack.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className={`mb-8 p-4 rounded-2xl glass w-full ${isDeepMode ? 'max-w-2xl' : 'max-w-md'}`}
        >
          <h3 className="text-sm font-medium text-foreground-muted mb-3">
            认知功能栈
          </h3>
          <div className="flex items-center justify-center gap-2 flex-wrap mb-4">
            {resultData.cognitive_stack.map((func, i) => (
              <div key={func} className="flex items-center">
                <span
                  className="px-3 py-1.5 rounded-lg text-sm font-mono font-medium"
                  style={{
                    backgroundColor: `rgba(${colors.primaryRgb}, ${0.3 - i * 0.05})`,
                    color: colors.primary,
                  }}
                >
                  {func}
                </span>
                {i < resultData.cognitive_stack!.length - 1 && (
                  <ArrowRight className="w-4 h-4 mx-1 text-foreground-subtle" />
                )}
              </div>
            ))}
          </div>
          
          {/* Deep mode: Show detailed cognitive function explanations */}
          {isDeepMode && (
            <div className="border-t border-border/30 pt-4 mt-4 space-y-3">
              <h4 className="text-xs font-medium text-foreground-muted uppercase tracking-wide mb-3">
                功能详解
              </h4>
              {resultData.cognitive_stack.map((func, i) => {
                const funcInfo = COGNITIVE_FUNCTION_INFO[func];
                const positionLabels = ["主导功能", "辅助功能", "第三功能", "劣势功能"];
                return funcInfo ? (
                  <div key={func} className="p-3 rounded-xl bg-background-tertiary/50">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          backgroundColor: `rgba(${colors.primaryRgb}, 0.2)`,
                          color: colors.primary,
                        }}
                      >
                        {positionLabels[i] || `第${i + 1}功能`}
                      </span>
                      <span className="text-sm font-medium">{funcInfo.name}</span>
                    </div>
                    <p className="text-xs text-foreground-muted leading-relaxed">
                      {funcInfo.description}
                    </p>
                  </div>
                ) : null;
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* Development Level - Only for deep mode */}
      {isDeepMode && resultData.development_level && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="mb-8 p-5 rounded-2xl glass w-full max-w-2xl"
        >
          <h3 className="text-sm font-medium text-foreground-muted mb-3">
            发展阶段分析
          </h3>
          {(() => {
            const levelInfo = DEVELOPMENT_LEVEL_INFO[resultData.development_level];
            if (!levelInfo) return null;
            return (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className="px-3 py-1 rounded-full text-sm font-medium"
                    style={{
                      backgroundColor: `rgba(${colors.primaryRgb}, 0.2)`,
                      color: colors.primary,
                    }}
                  >
                    {levelInfo.title}
                  </span>
                </div>
                <p className="text-foreground-muted text-sm leading-relaxed mb-4">
                  {levelInfo.description}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {levelInfo.characteristics.map((char, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-xs text-foreground-muted"
                    >
                      <span style={{ color: colors.primary }}>✦</span>
                      <span>{char}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </motion.div>
      )}

      {/* Analysis Report Section */}
      {resultData.analysis_report && (
        <motion.div
          ref={reportRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="w-full max-w-2xl mb-8"
        >
          {/* Collapsible Header */}
          <div
            className="flex items-center justify-between p-4 rounded-t-2xl glass border-b border-border/30"
            style={{ backgroundColor: showReport ? `rgba(${colors.primaryRgb}, 0.05)` : undefined }}
          >
            <button
              onClick={() => setShowReport(!showReport)}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity flex-1"
            >
              <FileText className="w-5 h-5" style={{ color: colors.primary }} />
              <span className="font-medium">详细分析报告</span>
              <motion.div
                animate={{ rotate: showReport ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-5 h-5 text-foreground-muted" />
              </motion.div>
            </button>
            
            {/* Print button */}
            <button
              onClick={handlePrintReport}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm hover:bg-background-tertiary transition-colors print:hidden"
              style={{ color: colors.primary }}
              title="下载/打印报告"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">下载报告</span>
            </button>
          </div>

          {/* Collapsible Content */}
          <AnimatePresence initial={false}>
            {showReport && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="p-6 rounded-b-2xl glass">
                  <div className="prose prose-invert prose-sm max-w-none">
                    <AnalysisReportContent content={resultData.analysis_report} colors={colors} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Upgrade to Standard Mode CTA - Only for shallow mode */}
      {isShallowMode && onUpgradeToStandard && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="w-full max-w-md mb-4"
        >
          <motion.button
            onClick={onUpgradeToStandard}
            disabled={isUpgrading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="relative w-full py-4 px-6 rounded-2xl font-medium text-white overflow-hidden group disabled:cursor-not-allowed disabled:opacity-70"
            style={{ backgroundColor: "#4298b4" }}
          >
            {/* Shimmer effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            />

            <span className="relative flex items-center justify-center gap-3">
              {isUpgrading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>升级中...</span>
                </>
              ) : (
                <>
                  <ArrowRight className="w-5 h-5" />
                  <span>继续探索完整 MBTI 类型</span>
                  <Sparkles className="w-5 h-5" />
                </>
              )}
            </span>

            {/* Badge */}
            <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-white/20 text-xs">
              只需再答 10 题
            </span>
          </motion.button>
          <p className="text-center text-xs text-foreground-muted mt-2">
            保留当前对话，继续完成标准模式测试，获取 4 字母 MBTI 类型
          </p>
        </motion.div>
      )}

      {/* Upgrade to Deep Mode CTA - Only for standard mode */}
      {isStandardMode && onUpgradeToDeep && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="w-full max-w-md mb-4"
        >
          <motion.button
            onClick={onUpgradeToDeep}
            disabled={isUpgrading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="relative w-full py-4 px-6 rounded-2xl font-medium text-white overflow-hidden group disabled:cursor-not-allowed disabled:opacity-70"
            style={{ backgroundColor: "#88619a" }}
          >
            {/* Shimmer effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            />

            <span className="relative flex items-center justify-center gap-3">
              {isUpgrading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>升级中...</span>
                </>
              ) : (
                <>
                  <ArrowRight className="w-5 h-5" />
                  <span>深入探索认知功能</span>
                  <Sparkles className="w-5 h-5" />
                </>
              )}
            </span>

            {/* Badge */}
            <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-white/20 text-xs">
              只需再答 15 题
            </span>
          </motion.button>
          <p className="text-center text-xs text-foreground-muted mt-2">
            想深度拆解认知功能栈？快试试深度模式
          </p>
        </motion.div>
      )}

      {/* AI Q&A CTA - Only for standard and deep modes (not shallow) */}
      {onOpenQA && !isShallowMode && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="w-full max-w-md mb-4"
        >
          <motion.button
            onClick={onOpenQA}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="relative w-full py-4 px-6 rounded-2xl font-medium overflow-hidden group"
            style={{ 
              backgroundColor: `rgba(${colors.primaryRgb}, 0.15)`,
              border: `2px solid ${colors.primary}`,
              color: colors.primary
            }}
          >
            {/* Subtle shimmer effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
            />

            <span className="relative flex items-center justify-center gap-3">
              <MessageSquare className="w-5 h-5" />
              <span>AI 深度解读</span>
              <ArrowRight className="w-5 h-5" />
            </span>

            {/* Hot badge */}
            <span 
              className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs text-white"
              style={{ backgroundColor: colors.primary }}
            >
              新功能
            </span>
          </motion.button>
          <p className="text-center text-xs text-foreground-muted mt-2">
            点击与 AI 对话，深入了解你的性格类型
          </p>
        </motion.div>
      )}

      {/* Image generation CTA - Only for standard and deep modes (not shallow) */}
      {!isShallowMode && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="w-full max-w-md mb-6"
        >
          {!generatedImageUrl ? (
            <motion.button
              onClick={onGenerateImage}
              disabled={isGeneratingImage}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative w-full py-4 px-6 rounded-2xl font-medium text-white overflow-hidden group disabled:cursor-not-allowed"
              style={{ backgroundColor: colors.primary }}
            >
              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
              />

              <span className="relative flex items-center justify-center gap-3">
                {isGeneratingImage ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>生成中...</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-5 h-5" />
                    <span>生成我的灵魂形象</span>
                    <Sparkles className="w-5 h-5" />
                  </>
                )}
              </span>

              {/* Free badge */}
              <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-white/20 text-xs">
                免费
              </span>
            </motion.button>
          ) : (
            <div className="p-4 rounded-2xl glass">
              <div className="aspect-[9/16] rounded-xl bg-background-tertiary border border-border flex items-center justify-center mb-4 overflow-hidden relative">
                {/* Generated image */}
                {generatedImageUrl ? (
                  <img
                    src={generatedImageUrl}
                    alt={`${resultData.mbti_type} personality avatar`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center">
                    <ImageIcon className="w-16 h-16 mx-auto mb-3 text-foreground-subtle" />
                    <p className="text-foreground-muted text-sm">
                      图片生成失败，请重试
                    </p>
                  </div>
                )}
                {/* Loading overlay when regenerating */}
                {isGeneratingImage && (
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center backdrop-blur-sm">
                    <Loader2 className="w-10 h-10 animate-spin text-white mb-3" />
                    <p className="text-white text-sm font-medium">正在重新生成...</p>
                  </div>
                )}
              </div>
              {/* Action buttons */}
              <div className="flex gap-2">
                {/* Download button */}
                <button
                  onClick={handleDownloadImage}
                  disabled={isGeneratingImage}
                  className="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: colors.primary }}
                >
                  <Download className="w-4 h-4" />
                  <span>下载图片</span>
                </button>
                {/* Regenerate button */}
                <button
                  onClick={onGenerateImage}
                  disabled={isGeneratingImage}
                  className="flex-1 py-2.5 rounded-xl glass hover:bg-background-tertiary transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isGeneratingImage ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>生成中...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>重新生成</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="flex items-center gap-4"
      >
        {/* Copy result */}
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl glass hover:bg-background-tertiary transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-diplomat" />
              <span>已复制</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>复制结果</span>
            </>
          )}
        </button>

        {/* Share button (simulated) */}
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl glass hover:bg-background-tertiary transition-colors"
        >
          <Share2 className="w-4 h-4" />
          <span>分享</span>
        </button>

        {/* Restart */}
        <button
          onClick={onRestart}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl glass hover:bg-background-tertiary transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>重新测试</span>
        </button>
      </motion.div>
    </motion.div>
  );
}

// Stat card component
function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="p-4 rounded-xl glass text-center">
      <div className="text-2xl font-bold mb-1" style={{ color }}>
        {value}
      </div>
      <div className="text-xs text-foreground-muted">{label}</div>
    </div>
  );
}

// Analysis report content renderer
function AnalysisReportContent({
  content,
  colors,
}: {
  content: string;
  colors: { primary: string; primaryRgb: string };
}) {
  // Clean content by removing broken/garbled characters (replacement characters, broken emojis)
  const cleanContent = (text: string): string => {
    // Remove Unicode replacement character (U+FFFD) which shows as ?
    let cleaned = text.replace(/\uFFFD/g, '');
    // Remove common broken emoji patterns (question marks at start of lines, isolated question marks)
    cleaned = cleaned.replace(/^[?�]+\s*/gm, '');
    // Remove sequences of question marks that might be broken emojis
    cleaned = cleaned.replace(/[?]{2,}/g, '');
    // Remove isolated special characters at the start of lines that might be broken emojis
    cleaned = cleaned.replace(/^[\u2000-\u3300]+\s*/gm, '');
    return cleaned;
  };

  // Parse and render the content with simple formatting
  // The AI typically returns content with:
  // - **bold** text
  // - Numbered lists (1. 2. 3.)
  // - Line breaks for paragraphs

  const renderContent = (text: string) => {
    // Clean the content first
    const cleanedText = cleanContent(text);
    
    // Split by double line breaks for paragraphs
    const paragraphs = cleanedText.split(/\n\n+/);

    return paragraphs.map((paragraph, pIndex) => {
      // Check if this is a numbered list item
      const lines = paragraph.split(/\n/);

      return (
        <div key={pIndex} className="mb-4 last:mb-0">
          {lines.map((line, lIndex) => {
            let trimmedLine = line.trim();
            if (!trimmedLine) return null;
            
            // Clean any remaining broken characters at the start of lines
            trimmedLine = trimmedLine.replace(/^[?�\uFFFD]+\s*/, '');
            if (!trimmedLine) return null;

            // Check for numbered list (1. text)
            const numberedMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/);
            if (numberedMatch) {
              return (
                <div key={lIndex} className="flex gap-3 mb-2">
                  <span
                    className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
                    style={{
                      backgroundColor: `rgba(${colors.primaryRgb}, 0.2)`,
                      color: colors.primary,
                    }}
                  >
                    {numberedMatch[1]}
                  </span>
                  <span className="flex-1 text-foreground-muted">
                    {renderFormattedText(numberedMatch[2])}
                  </span>
                </div>
              );
            }

            // Regular paragraph text (removed emoji bullet handling as AI is now instructed not to use them)
            return (
              <p key={lIndex} className="text-foreground-muted leading-relaxed mb-2 last:mb-0">
                {renderFormattedText(trimmedLine)}
              </p>
            );
          })}
        </div>
      );
    });
  };

  // Handle bold text (**text**) and other inline formatting
  const renderFormattedText = (text: string) => {
    // Clean the text first
    const cleanedText = cleanContent(text);
    
    // Split by bold markers
    const parts = cleanedText.split(/(\*\*[^*]+\*\*)/g);

    return parts.map((part, index) => {
      // Check for bold text
      const boldMatch = part.match(/^\*\*([^*]+)\*\*$/);
      if (boldMatch) {
        return (
          <strong
            key={index}
            className="font-semibold"
            style={{ color: colors.primary }}
          >
            {boldMatch[1]}
          </strong>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return <>{renderContent(content)}</>;
}

