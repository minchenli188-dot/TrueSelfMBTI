"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, AlertCircle, Home, RefreshCw, Play } from "lucide-react";

import { DynamicBackground } from "@/components/chat/DynamicBackground";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { ResultView } from "@/components/ResultView";
import { AIQAView } from "@/components/AIQAView";
import { FeedbackButton } from "@/components/FeedbackButton";
import { useTheme } from "@/context/ThemeContext";
import { useToast } from "@/context/ToastContext";
import {
  getSessionStatus,
  finishSession,
  generateImage as apiGenerateImage,
  getChatHistory as apiGetChatHistory,
  type SessionStatusResponse,
  type FinishSessionResponse,
  APIError,
} from "@/lib/api";

// Chat message interface for displaying conversation
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// Session storage key (same as useChatSession)
const SESSION_STORAGE_KEY = "mbti_session_id";

// MBTI type to group mapping
const MBTI_GROUPS: Record<string, string> = {
  INTJ: "analyst", INTP: "analyst", ENTJ: "analyst", ENTP: "analyst",
  INFJ: "diplomat", INFP: "diplomat", ENFJ: "diplomat", ENFP: "diplomat",
  ISTJ: "sentinel", ISFJ: "sentinel", ESTJ: "sentinel", ESFJ: "sentinel",
  ISTP: "explorer", ISFP: "explorer", ESTP: "explorer", ESFP: "explorer",
  Purple: "analyst", Green: "diplomat", Blue: "sentinel", Yellow: "explorer",
};

// MBTI type names in Chinese
const MBTI_TYPE_NAMES: Record<string, string> = {
  INTJ: "建筑师",
  INTP: "逻辑学家",
  ENTJ: "指挥官",
  ENTP: "辩论家",
  INFJ: "提倡者",
  INFP: "调停者",
  ENFJ: "主人公",
  ENFP: "竞选者",
  ISTJ: "物流师",
  ISFJ: "守卫者",
  ESTJ: "总经理",
  ESFJ: "执政官",
  ISTP: "鉴赏家",
  ISFP: "探险家",
  ESTP: "企业家",
  ESFP: "表演者",
  Purple: "分析家气质",
  Green: "外交家气质",
  Blue: "守卫者气质",
  Yellow: "探索者气质",
};

// Check if shallow mode (color type)
const COLOR_TYPES = ["Purple", "Green", "Blue", "Yellow"];

interface ResultData {
  mbti_type: string;
  type_name: string;
  group: string;
  confidence_score: number;
  cognitive_stack: string[] | null;
  development_level: string | null;
  total_rounds: number;
  analysis_report: string | null;
}

type AnalysisDepth = "shallow" | "standard" | "deep";

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const { setThemeFromPrediction, setTheme } = useTheme();
  const { info: showInfo } = useToast();
  
  const sessionId = params.sessionId as string;
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resultData, setResultData] = useState<ResultData | null>(null);
  const [depth, setDepth] = useState<AnalysisDepth>("standard");
  const [showQAView, setShowQAView] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  
  // For incomplete sessions that can be continued
  const [canContinue, setCanContinue] = useState(false);
  
  // Image generation state
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

  // Conversation view state
  const [showConversation, setShowConversation] = useState(false);
  const [conversationMessages, setConversationMessages] = useState<ChatMessage[]>([]);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);

  // Check if this is a shallow mode result
  const isShallowMode = resultData ? COLOR_TYPES.includes(resultData.mbti_type) : false;
  const isStandardMode = depth === "standard" && !isShallowMode;

  // Load session data on mount
  useEffect(() => {
    async function loadSession() {
      if (!sessionId) {
        setError("无效的会话链接");
        setIsLoading(false);
        return;
      }

      try {
        // First get session status
        const status: SessionStatusResponse = await getSessionStatus(sessionId);
        
        // Check if session has a valid prediction
        if (!status.current_prediction || status.current_prediction === "Unknown") {
          setError("此会话尚未完成测试，无法查看结果");
          setIsLoading(false);
          return;
        }

        // Set depth for Q&A context
        setDepth(status.depth as AnalysisDepth);

        // If session is complete, fetch the full result
        if (status.is_complete) {
          try {
            // Get the full result data
            const finishResponse: FinishSessionResponse = await finishSession({ session_id: sessionId });
            
            const result: ResultData = {
              mbti_type: finishResponse.mbti_type,
              type_name: finishResponse.type_name,
              group: finishResponse.group,
              confidence_score: finishResponse.confidence_score,
              cognitive_stack: finishResponse.cognitive_stack,
              development_level: finishResponse.development_level,
              total_rounds: finishResponse.total_rounds,
              analysis_report: finishResponse.analysis_report,
            };
            
            setResultData(result);
            setThemeFromPrediction(finishResponse.mbti_type);
            setCanContinue(false);
          } catch (err) {
            console.warn("Failed to get full result, using status data:", err);
            // Fallback to constructing from status
            const mbtiType = status.current_prediction;
            const result: ResultData = {
              mbti_type: mbtiType,
              type_name: MBTI_TYPE_NAMES[mbtiType] || mbtiType,
              group: MBTI_GROUPS[mbtiType] || "analyst",
              confidence_score: status.confidence_score || 0,
              cognitive_stack: status.cognitive_stack,
              development_level: status.development_level,
              total_rounds: status.current_round,
              analysis_report: null,
            };
            
            setResultData(result);
            setThemeFromPrediction(mbtiType);
            setCanContinue(false);
          }
        } else {
          // Session is not complete but has a prediction
          // User can continue from where they left off
          const mbtiType = status.current_prediction;
          const result: ResultData = {
            mbti_type: mbtiType,
            type_name: MBTI_TYPE_NAMES[mbtiType] || mbtiType,
            group: MBTI_GROUPS[mbtiType] || "analyst",
            confidence_score: status.confidence_score || 0,
            cognitive_stack: status.cognitive_stack,
            development_level: status.development_level,
            total_rounds: status.current_round,
            analysis_report: null,
          };
          
          setResultData(result);
          setThemeFromPrediction(mbtiType);
          setCanContinue(true);
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Failed to load session:", err);
        
        if (err instanceof APIError) {
          if (err.status === 404) {
            setError("未找到此测试结果，链接可能已失效");
          } else {
            setError(err.message || "加载结果失败");
          }
        } else {
          setError("网络错误，请检查网络后重试");
        }
        
        setIsLoading(false);
      }
    }

    loadSession();
  }, [sessionId, setThemeFromPrediction]);

  // Save sessionId to localStorage and redirect to main page for continuing
  const saveAndContinue = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    }
    showInfo("正在恢复会话", "即将跳转到测试页面继续");
    router.push("/");
  }, [sessionId, router, showInfo]);

  // Handle upgrade to standard mode
  const handleUpgradeToStandard = useCallback(async () => {
    setIsUpgrading(true);
    // Save sessionId to localStorage so main page can restore and upgrade
    if (typeof window !== "undefined") {
      localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    }
    showInfo("正在升级", "即将跳转继续完成标准模式测试");
    // Small delay for toast to show
    setTimeout(() => {
      router.push("/?upgrade=standard");
    }, 500);
  }, [sessionId, router, showInfo]);

  // Handle upgrade to deep mode
  const handleUpgradeToDeep = useCallback(async () => {
    setIsUpgrading(true);
    // Save sessionId to localStorage so main page can restore and upgrade
    if (typeof window !== "undefined") {
      localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    }
    showInfo("正在升级", "即将跳转继续完成深度模式测试");
    // Small delay for toast to show
    setTimeout(() => {
      router.push("/?upgrade=deep");
    }, 500);
  }, [sessionId, router, showInfo]);

  // Handle image generation
  const handleGenerateImage = useCallback(async () => {
    if (!sessionId) return;

    setIsGeneratingImage(true);

    try {
      const response = await apiGenerateImage(sessionId);
      
      if (response.status === "success" && response.image_url) {
        setGeneratedImageUrl(response.image_url);
      }
    } catch (err) {
      console.error("Image generation failed:", err);
    } finally {
      setIsGeneratingImage(false);
    }
  }, [sessionId]);

  // Handle going back to home
  const handleGoHome = () => {
    setTheme("neutral");
    router.push("/");
  };

  // Handle opening Q&A view
  const handleOpenQA = () => {
    setShowQAView(true);
  };

  // Handle going back from Q&A view
  const handleBackFromQA = () => {
    setShowQAView(false);
  };

  // Handle viewing conversation history
  const handleViewConversation = useCallback(async () => {
    if (conversationMessages.length > 0) {
      // Already loaded, just show
      setShowConversation(true);
      return;
    }

    setIsLoadingConversation(true);
    try {
      const chatHistory = await apiGetChatHistory(sessionId);
      
      // Convert API messages to ChatMessage format
      const messages: ChatMessage[] = chatHistory.messages.map((msg) => ({
        id: `msg-${msg.id}`,
        role: msg.role === "model" ? "assistant" : "user",
        content: msg.content,
        timestamp: new Date(msg.created_at),
      }));

      setConversationMessages(messages);
      setShowConversation(true);
    } catch (err) {
      console.error("Failed to load conversation:", err);
    } finally {
      setIsLoadingConversation(false);
    }
  }, [sessionId, conversationMessages.length]);

  // Handle going back from conversation view
  const handleBackFromConversation = () => {
    setShowConversation(false);
  };

  // Handle restart (go to home to start new test)
  const handleRestart = () => {
    // Clear any stored session
    if (typeof window !== "undefined") {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
    setTheme("neutral");
    router.push("/");
  };

  // Handle retry loading
  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
    window.location.reload();
  };

  // Loading state
  if (isLoading) {
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
            <span className="text-foreground-muted">正在加载测试结果...</span>
          </motion.div>
        </div>
      </DynamicBackground>
    );
  }

  // Error state
  if (error) {
    return (
      <DynamicBackground>
        <div className="min-h-screen flex flex-col items-center justify-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-6 max-w-md text-center"
          >
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            
            <div>
              <h1 className="text-2xl font-display mb-2">无法加载结果</h1>
              <p className="text-foreground-muted">{error}</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={handleRetry}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl glass hover:bg-background-tertiary transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>重试</span>
              </button>
              
              <button
                onClick={handleGoHome}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-analyst to-diplomat text-white font-medium"
              >
                <Home className="w-4 h-4" />
                <span>返回首页</span>
              </button>
            </div>
          </motion.div>
        </div>
      </DynamicBackground>
    );
  }

  // Conversation view (read-only)
  if (showConversation && resultData) {
    return (
      <DynamicBackground>
        <div className="h-screen flex flex-col">
          {/* Header with back to result button */}
          <header className="sticky top-0 z-50">
            <div className="px-6 py-3 glass border-b border-border/50">
              <div className="max-w-3xl mx-auto flex items-center justify-between">
                <button
                  onClick={handleBackFromConversation}
                  className="flex items-center gap-2 text-foreground-muted hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>返回结果</span>
                </button>
                <h1 className="font-display text-lg text-gradient">
                  对话记录
                </h1>
                <div className="w-20" />
              </div>
            </div>
          </header>

          {/* Chat messages (read-only) */}
          <main className="flex-1 overflow-y-auto scrollbar-hide">
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              <AnimatePresence mode="popLayout">
                {conversationMessages.map((message) => (
                  <ChatBubble
                    key={message.id}
                    role={message.role}
                    content={message.content}
                    timestamp={message.timestamp}
                    isLatest={false}
                  />
                ))}
              </AnimatePresence>
            </div>
          </main>

          {/* Disabled input area with hint */}
          <div className="w-full p-4 glass border-t border-border/50">
            <div className="max-w-3xl mx-auto">
              <div className="relative flex items-center justify-center p-4 rounded-2xl bg-background-secondary border border-border opacity-60">
                <span className="text-foreground-muted text-sm">
                  对话已结束，仅供查看
                </span>
              </div>
              <div className="flex items-center justify-center mt-3">
                <button
                  onClick={handleBackFromConversation}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-analyst to-diplomat text-white font-medium transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>返回查看结果</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </DynamicBackground>
    );
  }

  // Q&A view
  if (showQAView && resultData) {
    return (
      <DynamicBackground>
        <AIQAView
          sessionId={sessionId}
          resultData={resultData}
          onBack={handleBackFromQA}
          depth={depth}
        />
      </DynamicBackground>
    );
  }

  // Incomplete session - show continue option
  if (canContinue && resultData) {
    return (
      <DynamicBackground>
        <div className="min-h-screen flex flex-col items-center justify-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-6 max-w-md text-center"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-analyst/20 to-diplomat/20 flex items-center justify-center">
              <span className="text-3xl font-bold font-mono" style={{ color: "var(--analyst)" }}>
                {resultData.mbti_type}
              </span>
            </div>
            
            <div>
              <h1 className="text-2xl font-display mb-2">发现未完成的测试</h1>
              <p className="text-foreground-muted mb-1">
                当前预测: <span className="font-semibold text-foreground">{resultData.type_name}</span>
              </p>
              <p className="text-foreground-muted text-sm">
                已完成 {resultData.total_rounds} 轮对话，置信度 {resultData.confidence_score}%
              </p>
            </div>
            
            <div className="flex flex-col items-center gap-3 w-full">
              <motion.button
                onClick={saveAndContinue}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-analyst to-diplomat text-white font-medium"
              >
                <Play className="w-5 h-5" />
                <span>继续测试</span>
              </motion.button>
              
              <button
                onClick={handleGoHome}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl glass hover:bg-background-tertiary transition-colors text-foreground-muted"
              >
                <span>开始新测试</span>
              </button>
            </div>
          </motion.div>
        </div>
      </DynamicBackground>
    );
  }

  // Result view
  if (resultData) {
    return (
      <DynamicBackground>
        <div className="min-h-screen flex flex-col">
          {/* Header */}
          <header className="sticky top-0 z-50 px-6 py-4 glass border-b border-border/50">
            <div className="max-w-3xl mx-auto flex items-center justify-between">
              <button
                onClick={handleGoHome}
                className="flex items-center gap-2 text-foreground-muted hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>首页</span>
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
              resultData={resultData}
              isGeneratingImage={isGeneratingImage || isLoadingConversation}
              generatedImageUrl={generatedImageUrl}
              onGenerateImage={handleGenerateImage}
              onRestart={handleRestart}
              onOpenQA={handleOpenQA}
              onViewConversation={handleViewConversation}
              currentDepth={depth}
              sessionId={sessionId}
              // Enable upgrade options based on current depth
              onUpgradeToStandard={isShallowMode ? handleUpgradeToStandard : undefined}
              onUpgradeToDeep={isStandardMode ? handleUpgradeToDeep : undefined}
              isUpgrading={isUpgrading}
            />
          </main>
          
          {/* Feedback Button */}
          <FeedbackButton
            sessionId={sessionId}
            mbtiResult={resultData.mbti_type}
          />
        </div>
      </DynamicBackground>
    );
  }

  // Should not reach here
  return null;
}
