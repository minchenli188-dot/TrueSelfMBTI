"use client";

import { useRef, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Sparkles, MessageCircle, Brain, RefreshCw, AlertCircle, PartyPopper, Loader2, Palette, MessagesSquare, Award, Shield } from "lucide-react";

import { useChatSession, type AnalysisDepth } from "@/hooks/useChatSession";
import { useAnalytics } from "@/hooks/useAnalytics";
import { DynamicBackground } from "@/components/chat/DynamicBackground";
import { StatusBar } from "@/components/chat/StatusBar";
import { ChatBubble, TypingIndicator } from "@/components/chat/ChatBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { ResultView } from "@/components/ResultView";
import { DepthSelector } from "@/components/DepthSelector";
import { AIQAView } from "@/components/AIQAView";
import { FeedbackButton } from "@/components/FeedbackButton";
import { FeatureDemo, type FeatureKey } from "@/components/FeatureDemo";
import { useTheme } from "@/context/ThemeContext";

// Wrapper component to handle Suspense for useSearchParams
export default function HomePage() {
  return (
    <Suspense fallback={<HomePageLoading />}>
      <HomePageContent />
    </Suspense>
  );
}

// Loading fallback component
function HomePageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-foreground-muted" />
    </div>
  );
}

// Main page content
function HomePageContent() {
  const [state, actions] = useChatSession();
  const { colors, setTheme } = useTheme();
  const analytics = useAnalytics();
  const searchParams = useSearchParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [showQAView, setShowQAView] = useState(false);
  const [pendingUpgrade, setPendingUpgrade] = useState<"standard" | "deep" | null>(null);
  const upgradeTriggeredRef = useRef(false);
  const [activeFeatureDemo, setActiveFeatureDemo] = useState<FeatureKey | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [state.messages, state.isTyping]);

  // Handle upgrade parameter from URL (from results page redirect)
  useEffect(() => {
    const upgradeParam = searchParams.get("upgrade");
    if (upgradeParam === "standard" || upgradeParam === "deep") {
      setPendingUpgrade(upgradeParam);
    }
  }, [searchParams]);

  // Trigger upgrade when session is restored and ready
  useEffect(() => {
    // Only trigger once, when session is restored and finished
    if (
      pendingUpgrade &&
      !upgradeTriggeredRef.current &&
      state.isStarted &&
      !state.isRestoring &&
      state.isFinished &&
      !state.isLoading
    ) {
      upgradeTriggeredRef.current = true;
      
      // Clear the URL parameter
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("upgrade");
        window.history.replaceState({}, "", url.toString());
      }
      
      // Trigger the upgrade
      if (pendingUpgrade === "standard") {
        actions.upgradeToStandard();
      } else if (pendingUpgrade === "deep") {
        actions.upgradeToDeep();
      }
      
      setPendingUpgrade(null);
    }
  }, [pendingUpgrade, state.isStarted, state.isRestoring, state.isFinished, state.isLoading, actions]);
  
  // Handle depth selection
  const handleDepthSelect = async (depth: AnalysisDepth) => {
    analytics.depthSelect(depth);
    try {
      await actions.startSession(depth);
    } catch {
      // Error is handled in the hook
    }
  };

  // Handle restart
  const handleRestart = () => {
    analytics.customEvent("restart", "engagement", { 
      from_session: state.sessionId,
      was_finished: state.isFinished 
    });
    actions.reset();
    setTheme("neutral");
    setShowQAView(false);
  };

  // Handle opening Q&A view
  const handleOpenQA = () => {
    setShowQAView(true);
  };

  // Handle going back from Q&A view
  const handleBackFromQA = () => {
    setShowQAView(false);
  };

  // Handle upgrading to standard mode
  const handleUpgradeToStandard = async () => {
    await actions.upgradeToStandard();
    // After upgrade, user will continue chatting (isFinished becomes false)
  };

  // Handle upgrading to deep mode
  const handleUpgradeToDeep = async () => {
    await actions.upgradeToDeep();
    // After upgrade, user will continue chatting (isFinished becomes false)
  };

  // Render loading state while restoring session
  if (state.isRestoring) {
    return (
      <DynamicBackground>
        <div className="min-h-screen flex flex-col items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center gap-4"
          >
            <Loader2 className="w-10 h-10 text-foreground-muted animate-spin" />
            <span className="text-foreground-muted">正在恢复会话...</span>
          </motion.div>
        </div>
      </DynamicBackground>
    );
  }

  // Render landing page if not started
  if (!state.isStarted) {
    return (
      <DynamicBackground>
        <div className="min-h-screen flex flex-col">
          {/* Hero Section */}
          <div className="flex-1 flex flex-col items-center justify-center py-12">
            {/* Brand Logo */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6"
            >
              <span className="font-display text-2xl md:text-3xl tracking-wide text-gradient">
                TrueSelf16.com
              </span>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="font-display text-5xl md:text-7xl lg:text-8xl tracking-tight text-center mb-6 px-4"
            >
              <span className="block text-foreground">发现你的</span>
              <span className="text-gradient">真实自我</span>
            </motion.h1>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-lg md:text-2xl text-foreground max-w-2xl mx-auto text-center px-6 mb-6 font-medium"
            >
              用最懂你的方式，帮助你更好地了解自己，成为更好的自己
            </motion.p>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="text-sm md:text-base text-foreground-muted max-w-xl mx-auto text-center px-6 mb-16"
            >
              告别无聊的选择题，通过自然对话让 AI 深入理解你的性格
            </motion.p>

            {/* Depth Selector */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="w-full"
            >
              <DepthSelector onSelect={handleDepthSelect} isLoading={state.isLoading} />
            </motion.div>
          </div>

          {/* Product Introduction - Unified Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="py-12 border-t border-border/30"
          >
            <div className="max-w-5xl mx-auto px-6">
              {/* Section Header */}
              <div className="text-center mb-8">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7 }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-analyst/20 via-diplomat/20 to-explorer/20 border border-analyst/30 mb-4"
                >
                  <Award className="w-4 h-4 text-analyst" />
                  <span className="text-sm text-foreground font-semibold">市面上最专业的 16型人格 测试</span>
                </motion.div>
                <h2 className="font-display text-2xl md:text-3xl mb-3 text-foreground">
                  为什么选择 <span className="text-gradient">TrueSelf16</span>？
                </h2>
                <p className="text-foreground-muted text-sm md:text-base">
                  基于荣格心理学理论打造的专业级人格分析平台
                </p>
              </div>

              {/* Core Features - Detailed Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { 
                    icon: MessageCircle, 
                    title: "自然对话", 
                    description: "像和朋友聊天一样，用最自然的方式表达自己",
                    demoKey: "natural-chat" as FeatureKey,
                    color: "#4298b4", // Blue
                  },
                  { 
                    icon: Shield, 
                    title: "荣格理论", 
                    description: "基于卡尔·荣格原型心理学，提供有学术支撑的分析",
                    demoKey: "jung-theory" as FeatureKey,
                    color: "#88619a", // Purple
                  },
                  { 
                    icon: Brain, 
                    title: "认知功能分析", 
                    description: "深入分析 8 大认知功能栈，揭示思维运作的底层逻辑",
                    demoKey: "cognitive-functions" as FeatureKey,
                    color: "#e4ae3a", // Gold
                  },
                  { 
                    icon: Sparkles, 
                    title: "个性化结果", 
                    description: "获得独属于你的深度洞察，而非千篇一律的描述",
                    demoKey: "personalized-results" as FeatureKey,
                    color: "#33a474", // Green
                  },
                  { 
                    icon: Palette, 
                    title: "专属画像", 
                    description: "AI 生成专属于你的人格视觉肖像",
                    demoKey: "portrait" as FeatureKey,
                    color: "#e4ae3a", // Gold
                  },
                  { 
                    icon: MessagesSquare, 
                    title: "AI 解答", 
                    description: "测试后与 AI 实时对话，解答关于结果的任何疑问",
                    demoKey: "ai-qa" as FeatureKey,
                    color: "#4298b4", // Blue
                  },
                ].map((feature, index) => (
                  <motion.button
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.75 + index * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveFeatureDemo(feature.demoKey)}
                    className="group p-5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-all duration-300 text-left cursor-pointer"
                    style={{ 
                      borderColor: `${feature.color}20`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = `${feature.color}40`;
                      e.currentTarget.style.backgroundColor = `${feature.color}10`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = `${feature.color}20`;
                      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div 
                        className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
                        style={{ backgroundColor: `${feature.color}20` }}
                      >
                        <feature.icon className="w-5 h-5 transition-colors" style={{ color: feature.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium mb-1 text-foreground">{feature.title}</h3>
                        <p className="text-xs text-foreground-muted leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Feature Demo Modal */}
              <FeatureDemo 
                feature={activeFeatureDemo} 
                onClose={() => setActiveFeatureDemo(null)}
                onStartTest={() => {
                  setActiveFeatureDemo(null);
                  handleDepthSelect("shallow");
                }}
              />

            </div>
          </motion.div>
        </div>
      </DynamicBackground>
    );
  }

  // Render Q&A view if active
  if (state.isFinished && state.resultData && showQAView && state.sessionId) {
    return (
      <DynamicBackground>
        <AIQAView
          sessionId={state.sessionId}
          resultData={state.resultData}
          onBack={handleBackFromQA}
          depth={state.depth || "standard"}
        />
      </DynamicBackground>
    );
  }

  // Render result view if finished
  if (state.isFinished && state.resultData) {
    return (
      <DynamicBackground>
        <div className="min-h-screen flex flex-col">
          {/* Header */}
          <header className="sticky top-0 z-50 px-6 py-4 glass border-b border-border/50">
            <div className="max-w-3xl mx-auto flex items-center justify-between">
              <button
                onClick={handleRestart}
                className="flex items-center gap-2 text-foreground-muted hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>重新开始</span>
              </button>
              <h1 className="font-display text-xl text-gradient">
                TrueSelf16
              </h1>
              <div className="w-20" />
            </div>
          </header>

          {/* Result */}
          <main className="flex-1">
            <ResultView
              resultData={state.resultData}
              isGeneratingImage={state.isGeneratingImage}
              generatedImageUrl={state.generatedImageUrl}
              onGenerateImage={actions.generateImage}
              onRestart={handleRestart}
              onOpenQA={handleOpenQA}
              onUpgradeToStandard={handleUpgradeToStandard}
              onUpgradeToDeep={handleUpgradeToDeep}
              isUpgrading={state.isLoading}
              currentDepth={state.depth || "standard"}
              sessionId={state.sessionId || undefined}
            />
          </main>
          
          {/* Feedback Button */}
          <FeedbackButton
            sessionId={state.sessionId || undefined}
            mbtiResult={state.resultData.mbti_type}
          />
        </div>
      </DynamicBackground>
    );
  }

  // Render chat interface
  return (
    <DynamicBackground>
      <div className="h-screen flex flex-col">
        {/* Header with status */}
        <header className="sticky top-0 z-50">
          <div className="px-6 py-3 glass border-b border-border/50">
            <div className="max-w-3xl mx-auto flex items-center justify-between">
              <button
                onClick={handleRestart}
                className="flex items-center gap-2 text-foreground-muted hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">退出</span>
              </button>
              <h1 className="font-display text-lg text-gradient">
                TrueSelf16
              </h1>
              <div className="w-16" />
            </div>
          </div>

          {/* Progress bar */}
          <StatusBar
            progress={state.progress}
            currentPrediction={state.currentPrediction}
            confidenceScore={state.confidenceScore}
            currentRound={state.currentRound}
            isLoading={state.isLoading}
            isDeepMode={state.depth === "deep"}
            developmentLevel={state.developmentLevel}
          />
        </header>

        {/* Chat messages */}
        <main
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto scrollbar-hide"
        >
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            <AnimatePresence mode="popLayout">
              {state.messages.map((message, index) => (
                <ChatBubble
                  key={message.id}
                  role={message.role}
                  content={message.content}
                  timestamp={message.timestamp}
                  isLatest={
                    message.role === "assistant" &&
                    index === state.messages.length - 1 &&
                    !state.isTyping
                  }
                />
              ))}

              {/* Typing indicator */}
              {state.isTyping && (
                <TypingIndicator key="typing" />
              )}

              {/* Error display with retry button */}
              {state.error && !state.isTyping && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col items-center gap-4 py-6"
                >
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm">{state.error}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={actions.retryLastMessage}
                      disabled={state.isLoading}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-background-tertiary border border-border hover:border-foreground-subtle transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${state.isLoading ? 'animate-spin' : ''}`} />
                      <span>重试</span>
                    </button>
                    <span className="text-foreground-muted text-sm">或</span>
                    <button
                      onClick={() => window.location.reload()}
                      className="text-sm text-foreground-muted hover:text-foreground underline transition-colors"
                    >
                      刷新网页
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Action buttons when at max rounds */}
              {(state.isAtMaxRounds || state.isFinished) && !state.isTyping && !state.error && !state.resultData && (
                <motion.div
                  key="finish-buttons"
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ type: "spring", damping: 20, stiffness: 300 }}
                  className="flex flex-col items-center gap-5 py-8"
                >
                  {/* Primary: View Results button */}
                  <motion.div
                    animate={{ 
                      boxShadow: [
                        `0 0 20px 0px rgba(${colors.primaryRgb}, 0.3)`,
                        `0 0 40px 5px rgba(${colors.primaryRgb}, 0.5)`,
                        `0 0 20px 0px rgba(${colors.primaryRgb}, 0.3)`,
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="rounded-2xl"
                  >
                    <motion.button
                      onClick={actions.finishSession}
                      disabled={state.isFinishing || state.isLoading}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      className="relative flex items-center gap-3 px-8 py-4 rounded-2xl font-medium text-white overflow-hidden disabled:cursor-not-allowed"
                      style={{ backgroundColor: colors.primary }}
                    >
                      {/* Shimmer effect */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                        animate={{ x: ["-100%", "100%"] }}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                      />
                      
                      <span className="relative flex items-center gap-3">
                        {state.isFinishing ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>生成分析报告中...</span>
                          </>
                        ) : (
                          <>
                            <PartyPopper className="w-5 h-5" />
                            <span>查看我的结果</span>
                            <Sparkles className="w-5 h-5" />
                          </>
                        )}
                      </span>
                    </motion.button>
                  </motion.div>
                  
                  {/* Show message when at max rounds */}
                  <p className="text-sm text-foreground-muted text-center max-w-sm px-4">
                    已完成所有对话轮次，点击上方按钮查看你的专属分析报告
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Input area */}
        <ChatInput
          value={state.input}
          onChange={actions.setInput}
          onSend={() => actions.sendMessage()}
          isLoading={state.isLoading}
          disabled={state.isFinished || state.isAtMaxRounds}
          placeholder={
            state.isLoading
              ? "AI 正在思考..."
              : state.isAtMaxRounds || state.isFinished
              ? "已完成所有对话，请点击上方按钮查看结果"
              : "分享你的想法..."
          }
        />
      </div>
    </DynamicBackground>
  );
}
