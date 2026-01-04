"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  startSession as apiStartSession,
  sendMessage as apiSendMessage,
  generateImage as apiGenerateImage,
  finishSession as apiFinishSession,
  upgradeSession as apiUpgradeSession,
  getChatHistory as apiGetChatHistory,
  getSessionStatus as apiGetSessionStatus,
  type StartSessionResponse,
  type SendMessageResponse,
  type FinishSessionResponse,
  type UpgradeSessionResponse,
  APIError,
} from "@/lib/api";
import { useTheme } from "@/context/ThemeContext";
import { useToast } from "@/context/ToastContext";
import { extractUserInsights } from "@/lib/analytics";

// ============================================================
// Session Persistence (localStorage)
// ============================================================

const SESSION_STORAGE_KEY = "mbti_session_id";

function saveSessionToStorage(sessionId: string): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    } catch {
      // localStorage not available or quota exceeded
    }
  }
}

function getSessionFromStorage(): string | null {
  if (typeof window !== "undefined") {
    try {
      return localStorage.getItem(SESSION_STORAGE_KEY);
    } catch {
      return null;
    }
  }
  return null;
}

function clearSessionFromStorage(): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Ignore errors
    }
  }
}

// ============================================================
// Types
// ============================================================

export type AnalysisDepth = "shallow" | "standard" | "deep";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  metadata?: {
    current_prediction?: string;
    confidence_score?: number;
    progress?: number;
    is_finished?: boolean;
  };
}

export interface ResultData {
  mbti_type: string;
  type_name: string;
  group: string;
  confidence_score: number;
  cognitive_stack: string[] | null;
  development_level: string | null;
  total_rounds: number;
  analysis_report: string | null;
}

export interface ChatSessionState {
  // Session state
  sessionId: string | null;
  depth: AnalysisDepth | null;
  isStarted: boolean;
  isRestoring: boolean;
  
  // Messages
  messages: ChatMessage[];
  
  // UI state
  input: string;
  isLoading: boolean;
  isTyping: boolean;
  
  // Progress
  progress: number;
  currentPrediction: string;
  confidenceScore: number;
  currentRound: number;
  maxRounds: number;
  developmentLevel: string | null;
  
  // Completion
  isFinished: boolean;
  isAtMaxRounds: boolean;
  isFinishing: boolean;
  resultData: ResultData | null;
  
  // Image generation
  isGeneratingImage: boolean;
  generatedImageUrl: string | null;
  
  // Error handling
  error: string | null;
  lastFailedMessage: string | null;
  retryCount: number;
}

export interface ChatSessionActions {
  setInput: (input: string) => void;
  startSession: (depth: AnalysisDepth, language?: string) => Promise<void>;
  sendMessage: (content?: string) => Promise<void>;
  retryLastMessage: () => Promise<void>;
  clearError: () => void;
  generateImage: () => Promise<void>;
  finishSession: () => Promise<void>;
  upgradeToStandard: () => Promise<void>;
  upgradeToDeep: () => Promise<void>;
  reset: () => void;
}

// ============================================================
// MBTI Type Names
// ============================================================

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
  // Colors for shallow mode
  Purple: "分析家气质",
  Green: "外交家气质",
  Blue: "守卫者气质",
  Yellow: "探索者气质",
};

const MBTI_GROUPS: Record<string, string> = {
  INTJ: "analyst", INTP: "analyst", ENTJ: "analyst", ENTP: "analyst",
  INFJ: "diplomat", INFP: "diplomat", ENFJ: "diplomat", ENFP: "diplomat",
  ISTJ: "sentinel", ISFJ: "sentinel", ESTJ: "sentinel", ESFJ: "sentinel",
  ISTP: "explorer", ISFP: "explorer", ESTP: "explorer", ESFP: "explorer",
  Purple: "analyst", Green: "diplomat", Blue: "sentinel", Yellow: "explorer",
};

// Depth configuration for progress calculation
const DEPTH_MAX_ROUNDS: Record<AnalysisDepth, number> = {
  shallow: 5,
  standard: 15,
  deep: 30,
};

// Calculate progress based on current round and depth
function calculateProgress(currentRound: number, depth: AnalysisDepth | null): number {
  if (!depth) return 0;
  const maxRounds = DEPTH_MAX_ROUNDS[depth];
  // Use a formula that makes progress feel natural (not linear)
  // Progress grows faster at start, slower as it approaches 100%
  const linearProgress = (currentRound / maxRounds) * 100;
  return Math.min(100, Math.round(linearProgress));
}

// ============================================================
// Initial State
// ============================================================

const initialState: ChatSessionState = {
  sessionId: null,
  depth: null,
  isStarted: false,
  isRestoring: false,
  messages: [],
  input: "",
  isLoading: false,
  isTyping: false,
  progress: 0,
  currentPrediction: "Unknown",
  confidenceScore: 0,
  currentRound: 0,
  maxRounds: 15,
  developmentLevel: null,
  isFinished: false,
  isAtMaxRounds: false,
  isFinishing: false,
  resultData: null,
  isGeneratingImage: false,
  generatedImageUrl: null,
  error: null,
  lastFailedMessage: null,
  retryCount: 0,
};

// ============================================================
// Hook Implementation
// ============================================================

export function useChatSession(): [ChatSessionState, ChatSessionActions] {
  const [state, setState] = useState<ChatSessionState>(initialState);
  const { setThemeFromPrediction } = useTheme();
  const { error: showError, success: showSuccess, info: showInfo } = useToast();
  
  // Ref to track if we should update theme
  const lastPredictionRef = useRef<string>("");
  // Ref to prevent multiple restoration attempts
  const restorationAttemptedRef = useRef(false);
  // Ref to track if restoration is in progress
  const isRestoringRef = useRef(false);

  // Restore session from localStorage on mount
  useEffect(() => {
    async function restoreSession() {
      // Only attempt restoration once
      if (restorationAttemptedRef.current || isRestoringRef.current) {
        return;
      }
      
      const storedSessionId = getSessionFromStorage();
      if (!storedSessionId) {
        restorationAttemptedRef.current = true;
        return;
      }

      isRestoringRef.current = true;
      restorationAttemptedRef.current = true;
      
      // Set loading state
      setState((prev) => ({ ...prev, isRestoring: true }));

      try {
        // First, check if the session is still valid
        const sessionStatus = await apiGetSessionStatus(storedSessionId);
        
        // If session is complete, we can restore the result view
        // If session is active, we can restore the chat
        // If session is neither, it might be invalid
        
        // Get the full chat history
        const chatHistory = await apiGetChatHistory(storedSessionId);
        
        // Convert API messages to ChatMessage format
        const messages: ChatMessage[] = chatHistory.messages.map((msg) => ({
          id: `msg-${msg.id}`,
          role: msg.role === "model" ? "assistant" : "user",
          content: msg.content,
          timestamp: new Date(msg.created_at),
          metadata: msg.ai_metadata
            ? {
                current_prediction: msg.ai_metadata.current_prediction as string | undefined,
                confidence_score: msg.ai_metadata.confidence_score as number | undefined,
                progress: msg.ai_metadata.progress as number | undefined,
                is_finished: msg.ai_metadata.is_finished as boolean | undefined,
              }
            : undefined,
        }));

        // Calculate progress based on current round and depth
        const depth = sessionStatus.depth as AnalysisDepth;
        const calculatedProgress = calculateProgress(
          sessionStatus.current_round,
          depth
        );

        // Determine max rounds based on depth
        const maxRounds = DEPTH_MAX_ROUNDS[depth];

        // Check if at max rounds
        const isAtMaxRounds = sessionStatus.current_round >= maxRounds;

        // If session is complete, we need to fetch the result data
        let resultData: ResultData | null = null;
        if (sessionStatus.is_complete && sessionStatus.current_prediction && sessionStatus.current_prediction !== "Unknown") {
          try {
            const finishResponse = await apiFinishSession({ session_id: storedSessionId });
            resultData = {
              mbti_type: finishResponse.mbti_type,
              type_name: finishResponse.type_name,
              group: finishResponse.group,
              confidence_score: finishResponse.confidence_score,
              cognitive_stack: finishResponse.cognitive_stack,
              development_level: finishResponse.development_level,
              total_rounds: finishResponse.total_rounds,
              analysis_report: finishResponse.analysis_report,
            };
          } catch {
            // Failed to get result data, session will show as in-progress
            console.warn("Failed to restore result data, showing chat interface");
          }
        }

        // Restore state
        setState({
          sessionId: storedSessionId,
          depth,
          isStarted: true,
          isRestoring: false,
          messages,
          input: "",
          isLoading: false,
          isTyping: false,
          progress: sessionStatus.is_complete ? 100 : calculatedProgress,
          currentPrediction: sessionStatus.current_prediction || "Unknown",
          confidenceScore: sessionStatus.confidence_score || 0,
          currentRound: sessionStatus.current_round,
          maxRounds,
          developmentLevel: sessionStatus.development_level || null,
          isFinished: sessionStatus.is_complete && resultData !== null,
          isAtMaxRounds,
          isFinishing: false,
          resultData,
          isGeneratingImage: false,
          generatedImageUrl: null,
          error: null,
          lastFailedMessage: null,
          retryCount: 0,
        });

        // Update theme if there's a prediction
        if (sessionStatus.current_prediction && sessionStatus.current_prediction !== "Unknown") {
          setThemeFromPrediction(sessionStatus.current_prediction);
          lastPredictionRef.current = sessionStatus.current_prediction;
        }

        if (resultData) {
          showInfo("已恢复测试结果", `你的性格类型是 ${resultData.mbti_type}`);
        } else {
          showInfo("会话已恢复", "继续之前的对话");
        }
      } catch (err) {
        // Session not found or invalid - clear storage and start fresh
        console.warn("Failed to restore session:", err);
        clearSessionFromStorage();
        setState((prev) => ({ ...prev, isRestoring: false }));
      } finally {
        isRestoringRef.current = false;
      }
    }

    restoreSession();
  }, [setThemeFromPrediction, showInfo]);

  // Update theme when prediction changes
  useEffect(() => {
    if (
      state.currentPrediction &&
      state.currentPrediction !== "Unknown" &&
      state.currentPrediction !== lastPredictionRef.current
    ) {
      lastPredictionRef.current = state.currentPrediction;
      setThemeFromPrediction(state.currentPrediction);
    }
  }, [state.currentPrediction, setThemeFromPrediction]);

  // ============================================================
  // Actions
  // ============================================================

  const setInput = useCallback((input: string) => {
    setState((prev) => ({ ...prev, input }));
  }, []);

  const startSession = useCallback(
    async (depth: AnalysisDepth, language = "zh-CN") => {
      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        const response: StartSessionResponse = await apiStartSession({
          depth,
          language,
        });

        // Create greeting message
        const greetingMessage: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: "assistant",
          content: response.greeting,
          timestamp: new Date(),
          metadata: {
            current_prediction: "Unknown",
            confidence_score: 0,
            progress: 0,
            is_finished: false,
          },
        };

        setState((prev) => ({
          ...prev,
          sessionId: response.session_id,
          depth,
          isStarted: true,
          isLoading: false,
          messages: [greetingMessage],
        }));

        // Save session ID to localStorage for persistence across refreshes
        saveSessionToStorage(response.session_id);

        showInfo("会话已开始", `已选择${depth === "shallow" ? "快速" : depth === "standard" ? "标准" : "深度"}模式`);
      } catch (err) {
        setState((prev) => ({ ...prev, isLoading: false }));
        
        if (err instanceof APIError) {
          if (err.status === 429) {
            showError("请求过于频繁", err.message);
          } else {
            showError("启动失败", err.message);
          }
        } else {
          showError("网络错误", "无法连接到服务器，请检查网络后重试");
        }
        throw err;
      }
    },
    [showError, showInfo]
  );

  const sendMessage = useCallback(
    async (content?: string) => {
      const messageContent = content ?? state.input.trim();
      
      if (!messageContent || !state.sessionId) {
        return;
      }

      // Clear any previous error (but keep retryCount for tracking)
      setState((prev) => ({
        ...prev,
        error: null,
        lastFailedMessage: null,
      }));

      // Check if this message already exists (to avoid duplicates on retry)
      const messageExists = state.messages.some(
        (m) => m.role === "user" && m.content === messageContent
      );

      // Create user message only if it doesn't exist
      if (!messageExists) {
        const userMessage: ChatMessage = {
          id: `msg-${Date.now()}-user`,
          role: "user",
          content: messageContent,
          timestamp: new Date(),
        };

        setState((prev) => ({
          ...prev,
          messages: [...prev.messages, userMessage],
          input: "",
          isLoading: true,
          isTyping: true,
        }));
      } else {
        // Just set loading state for retry
        setState((prev) => ({
          ...prev,
          input: "",
          isLoading: true,
          isTyping: true,
        }));
      }

      try {
        const response: SendMessageResponse = await apiSendMessage({
          session_id: state.sessionId,
          content: messageContent,
        });

        // Calculate progress based on rounds, not AI estimation (prevents jumping)
        const calculatedProgress = calculateProgress(response.current_round, state.depth);

        // Create assistant message
        const assistantMessage: ChatMessage = {
          id: `msg-${response.message_id}`,
          role: "assistant",
          content: response.reply_text,
          timestamp: new Date(),
          metadata: {
            current_prediction: response.current_prediction,
            confidence_score: response.confidence_score,
            progress: calculatedProgress,
            is_finished: response.is_finished,
          },
        };

        setState((prev) => {
          // Always add assistant message to chat
          const newMessages = [...prev.messages, assistantMessage];

          return {
            ...prev,
            messages: newMessages,
            isLoading: false,
            isTyping: false,
            progress: calculatedProgress,
            currentPrediction: response.current_prediction,
            confidenceScore: response.confidence_score,
            currentRound: response.current_round,
            maxRounds: response.max_rounds,
            developmentLevel: response.development_level || prev.developmentLevel,
            isFinished: response.is_finished, // Trust backend for is_finished (true at max rounds)
            isAtMaxRounds: response.is_at_max_rounds,
            resultData: null,
            error: null,
            lastFailedMessage: null,
            retryCount: 0, // Reset retry count on success
          };
        });
      } catch (err) {
        let errorMessage = "消息发送失败，请检查网络";
        
        if (err instanceof APIError) {
          if (err.status === 429) {
            errorMessage = "请求过于频繁，请稍后重试";
          } else if (err.status === 503) {
            errorMessage = "AI 服务暂时不可用，请稍后重试";
          } else if (err.status === 500) {
            errorMessage = "服务器错误，请稍后重试";
          } else {
            errorMessage = err.message;
          }
        }

        setState((prev) => ({
          ...prev,
          isLoading: false,
          isTyping: false,
          error: errorMessage,
          lastFailedMessage: messageContent,
          retryCount: prev.retryCount + 1, // Increment retry count on error
        }));
      }
    },
    [state.sessionId, state.input, state.messages, state.depth]
  );

  const retryLastMessage = useCallback(async () => {
    if (state.lastFailedMessage) {
      await sendMessage(state.lastFailedMessage);
    }
  }, [state.lastFailedMessage, sendMessage]);

  const clearError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      error: null,
      lastFailedMessage: null,
    }));
  }, []);

  const generateImage = useCallback(async () => {
    if (!state.sessionId) {
      showError("无法生成图片", "会话不存在");
      return;
    }

    setState((prev) => ({ ...prev, isGeneratingImage: true }));

    try {
      const response = await apiGenerateImage(state.sessionId);
      
      if (response.status === "success" && response.image_url) {
        setState((prev) => ({
          ...prev,
          isGeneratingImage: false,
          generatedImageUrl: response.image_url,
        }));
        showSuccess("生成成功", response.message);
      } else if (response.status === "pending") {
        showInfo("生成中", response.message);
        setState((prev) => ({ ...prev, isGeneratingImage: false }));
      } else {
        showError("生成失败", response.message);
        setState((prev) => ({ ...prev, isGeneratingImage: false }));
      }
    } catch (err) {
      setState((prev) => ({ ...prev, isGeneratingImage: false }));
      
      if (err instanceof APIError) {
        showError("生成失败", err.message);
      } else {
        showError("网络错误", "无法连接到图片服务");
      }
    }
  }, [state.sessionId, showError, showInfo, showSuccess]);

  const finishSession = useCallback(async () => {
    if (!state.sessionId) {
      showError("无法完成测试", "会话不存在");
      return;
    }

    setState((prev) => ({ ...prev, isFinishing: true, isLoading: true }));

    try {
      const response: FinishSessionResponse = await apiFinishSession({
        session_id: state.sessionId,
      });

      // Build result data from the finish response
const resultData: ResultData = {
          mbti_type: response.mbti_type,
          type_name: response.type_name,
          group: response.group,
          confidence_score: response.confidence_score,
          cognitive_stack: response.cognitive_stack,
          development_level: response.development_level,
          total_rounds: response.total_rounds,
          analysis_report: response.analysis_report,
        };

      setState((prev) => ({
        ...prev,
        isLoading: false,
        isFinishing: false,
        isFinished: true,
        resultData,
        progress: 100,
      }));

      showSuccess("测试完成！", `你的性格类型是 ${response.mbti_type}`);
      
      // Extract user insights in background (non-blocking)
      extractUserInsights(state.sessionId).catch((err) => {
        console.warn("Failed to extract user insights:", err);
      });
    } catch (err) {
      setState((prev) => ({ ...prev, isLoading: false, isFinishing: false }));

      let errorMessage = "无法完成测试";
      if (err instanceof APIError) {
        if (err.status === 503) {
          errorMessage = "AI 服务暂时不可用，请稍后重试";
        } else {
          errorMessage = err.message;
        }
      }

      showError("完成失败", errorMessage);
    }
  }, [state.sessionId, showError, showSuccess]);

  const upgradeToStandard = useCallback(async () => {
    if (!state.sessionId) {
      showError("无法升级", "会话不存在");
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, isTyping: true }));

    try {
      const response: UpgradeSessionResponse = await apiUpgradeSession({
        session_id: state.sessionId,
      });

      // Create AI message with the question from the server
      // This ensures AI asks first, not waiting for user input
      const aiMessage: ChatMessage = {
        id: `msg-upgrade-${Date.now()}`,
        role: "assistant",
        content: response.ai_question,
        timestamp: new Date(),
        metadata: {
          // Keep the current prediction stable!
          current_prediction: state.currentPrediction,
          confidence_score: state.confidenceScore,
          progress: Math.round((state.currentRound / 15) * 100),
        },
      };

      setState((prev) => ({
        ...prev,
        depth: "standard",
        isFinished: false,
        isAtMaxRounds: false,  // Reset max rounds flag
        resultData: null,
        isLoading: false,
        isTyping: false,
        messages: [...prev.messages, aiMessage],
        // Keep prediction stable!
        currentPrediction: prev.currentPrediction,
        confidenceScore: prev.confidenceScore,
        // Update max rounds for standard mode
        maxRounds: 15,
        // Recalculate progress for standard mode (15 total questions)
        progress: Math.round((prev.currentRound / 15) * 100),
      }));

      showSuccess("升级成功", response.message);
    } catch (err) {
      setState((prev) => ({ ...prev, isLoading: false, isTyping: false }));

      if (err instanceof APIError) {
        showError("升级失败", err.message);
      } else {
        showError("网络错误", "无法连接到服务器");
      }
    }
  }, [state.sessionId, state.currentPrediction, state.confidenceScore, state.currentRound, showError, showSuccess]);

  const upgradeToDeep = useCallback(async () => {
    if (!state.sessionId) {
      showError("无法升级", "会话不存在");
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, isTyping: true }));

    try {
      const response: UpgradeSessionResponse = await apiUpgradeSession({
        session_id: state.sessionId,
      });

      // Create AI message with the question from the server
      // This ensures AI asks first, not waiting for user input
      const aiMessage: ChatMessage = {
        id: `msg-upgrade-${Date.now()}`,
        role: "assistant",
        content: response.ai_question,
        timestamp: new Date(),
        metadata: {
          // Keep the current prediction stable!
          current_prediction: state.currentPrediction,
          confidence_score: state.confidenceScore,
          progress: Math.round((state.currentRound / 30) * 100),
        },
      };

      setState((prev) => ({
        ...prev,
        depth: "deep",
        isFinished: false,
        isAtMaxRounds: false,  // Reset max rounds flag
        resultData: null,
        isLoading: false,
        isTyping: false,
        messages: [...prev.messages, aiMessage],
        // Keep prediction stable!
        currentPrediction: prev.currentPrediction,
        confidenceScore: prev.confidenceScore,
        // Update max rounds for deep mode
        maxRounds: 30,
        // Recalculate progress for deep mode (30 total questions)
        progress: Math.round((prev.currentRound / 30) * 100),
      }));

      showSuccess("升级成功", response.message);
    } catch (err) {
      setState((prev) => ({ ...prev, isLoading: false, isTyping: false }));

      if (err instanceof APIError) {
        showError("升级失败", err.message);
      } else {
        showError("网络错误", "无法连接到服务器");
      }
    }
  }, [state.sessionId, state.currentPrediction, state.confidenceScore, state.currentRound, showError, showSuccess]);

  const reset = useCallback(() => {
    // Clear persisted session from localStorage
    clearSessionFromStorage();
    setState(initialState);
    lastPredictionRef.current = "";
    // Reset restoration flag so new session can be started
    restorationAttemptedRef.current = true; // Keep true to prevent re-restoration
  }, []);

  return [
    state,
    {
      setInput,
      startSession,
      sendMessage,
      retryLastMessage,
      clearError,
      generateImage,
      finishSession,
      upgradeToStandard,
      upgradeToDeep,
      reset,
    },
  ];
}
