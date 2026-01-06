"use client";

import { useState, useCallback } from "react";
import { sendQAMessage, APIError } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import type { ResultData } from "@/hooks/useChatSession";

// ============================================================
// Types
// ============================================================

export interface QAMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface QASessionState {
  messages: QAMessage[];
  input: string;
  isLoading: boolean;
  error: string | null;
}

export interface QASessionActions {
  setInput: (input: string) => void;
  sendMessage: (content?: string) => Promise<void>;
  sendPresetQuestion: (question: string) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

// ============================================================
// Preset Questions
// ============================================================

export interface PresetQuestion {
  id: string;
  label: string;
  question: string;
  icon: string;
}

export type AnalysisDepth = "shallow" | "standard" | "deep";

// Normalize development level to Chinese display
const DEVELOPMENT_LEVEL_DISPLAY: Record<string, string> = {
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

function getDevelopmentLevelDisplay(level: string): string {
  return DEVELOPMENT_LEVEL_DISPLAY[level] || level;
}

export function getPresetQuestions(
  resultData: ResultData | null,
  depth?: AnalysisDepth
): PresetQuestion[] {
  if (!resultData) return [];

  const mbtiType = resultData.mbti_type;
  const hasFullType = mbtiType.length === 4;
  const hasCognitiveStack =
    resultData.cognitive_stack && resultData.cognitive_stack.length > 0;
  const hasDevelopmentLevel = !!resultData.development_level;
  
  // Only show cognitive stack and development level for deep mode
  const isDeepMode = depth === "deep";

  const questions: PresetQuestion[] = [];

  // Color interpretation (always available)
  questions.push({
    id: "color",
    label: "解读颜色",
    question: `请详细解读我的性格颜色群体（${resultData.group}）的含义，这个颜色代表什么样的性格特质？与其他颜色群体有什么不同？`,
    icon: "🎨",
  });

  // Development level (only for deep mode)
  if (hasDevelopmentLevel && isDeepMode) {
    const displayLevel = getDevelopmentLevelDisplay(resultData.development_level!);
    questions.push({
      id: "development",
      label: "解读发展阶段",
      question: `我的人格发展阶段是"${displayLevel}"，请帮我解读这意味着什么？我目前的发展状态如何？有什么建议可以帮助我进一步成长？`,
      icon: "📈",
    });
  }

  // Four letters interpretation (if full type)
  if (hasFullType) {
    questions.push({
      id: "letters",
      label: "解读四个字母",
      question: `请详细解读我的人格类型 ${mbtiType} 中每个字母的含义：\n1. ${mbtiType[0]}（能量方向）代表什么？\n2. ${mbtiType[1]}（信息获取）代表什么？\n3. ${mbtiType[2]}（决策方式）代表什么？\n4. ${mbtiType[3]}（生活方式）代表什么？\n这四个维度如何共同塑造了我的性格？`,
      icon: "🔤",
    });
  }

  // Cognitive function stack (only for deep mode)
  if (hasCognitiveStack && isDeepMode) {
    const stackStr = resultData.cognitive_stack!.join(" → ");
    questions.push({
      id: "cognitive",
      label: "解读认知功能栈",
      question: `请详细解读我的认知功能栈：${stackStr}\n\n1. 每个功能分别代表什么含义？\n2. 它们在我日常生活中是如何运作的？\n3. 主导功能和辅助功能如何配合？\n4. 第三和第四功能对我有什么影响？`,
      icon: "🧠",
    });
  }

  // Personality traits
  questions.push({
    id: "traits",
    label: "性格特点解读",
    question: `作为一个 ${mbtiType} 类型的人，我有哪些典型的性格特点？我的优势是什么？可能存在的挑战是什么？`,
    icon: "✨",
  });

  // Career and relationships
  questions.push({
    id: "life",
    label: "职业与关系",
    question: `作为 ${mbtiType} 类型，在职业选择和人际关系方面有什么建议？什么类型的工作环境最适合我？与哪些类型的人容易相处？`,
    icon: "💼",
  });

  return questions;
}

// ============================================================
// Initial State
// ============================================================

const initialState: QASessionState = {
  messages: [],
  input: "",
  isLoading: false,
  error: null,
};

// ============================================================
// Hook Implementation
// ============================================================

export function useQASession(
  sessionId: string | null,
  resultData: ResultData | null
): [QASessionState, QASessionActions] {
  const [state, setState] = useState<QASessionState>(initialState);
  const { error: showError } = useToast();

  const setInput = useCallback((input: string) => {
    setState((prev) => ({ ...prev, input }));
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  const sendMessage = useCallback(
    async (content?: string) => {
      const messageContent = content ?? state.input.trim();

      if (!messageContent || !sessionId) {
        return;
      }

      // Clear any previous error
      setState((prev) => ({
        ...prev,
        error: null,
      }));

      // Create user message
      const userMessage: QAMessage = {
        id: `qa-${Date.now()}-user`,
        role: "user",
        content: messageContent,
        timestamp: new Date(),
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage],
        input: "",
        isLoading: true,
      }));

      // Build history for the API
      const history = state.messages.map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        content: msg.content,
      }));

      try {
        const response = await sendQAMessage({
          session_id: sessionId,
          question: messageContent,
          history: history.length > 0 ? history : undefined,
        });

        // Create assistant message
        const assistantMessage: QAMessage = {
          id: `qa-${Date.now()}-assistant`,
          role: "assistant",
          content: response.answer,
          timestamp: new Date(),
        };

        setState((prev) => ({
          ...prev,
          messages: [...prev.messages, assistantMessage],
          isLoading: false,
        }));
      } catch (err) {
        let errorMessage = "消息发送失败，请检查网络";

        if (err instanceof APIError) {
          if (err.status === 429) {
            errorMessage = "请求过于频繁，请稍后重试";
          } else if (err.status === 503) {
            errorMessage = "AI 服务暂时不可用，请稍后重试";
          } else {
            errorMessage = err.message;
          }
        }

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));

        showError("发送失败", errorMessage);
      }
    },
    [sessionId, state.input, state.messages, showError]
  );

  const sendPresetQuestion = useCallback(
    async (question: string) => {
      await sendMessage(question);
    },
    [sendMessage]
  );

  return [
    state,
    {
      setInput,
      sendMessage,
      sendPresetQuestion,
      clearError,
      reset,
    },
  ];
}




