/**
 * Zustand store for global chat state
 * This is a simpler alternative to useChatSession hook for cases
 * where you need to share state across components without prop drilling
 */
import { create } from "zustand";

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

interface ChatState {
  // Session
  sessionId: string | null;
  depth: AnalysisDepth | null;
  isStarted: boolean;
  
  // Messages
  messages: ChatMessage[];
  
  // UI state
  isLoading: boolean;
  isTyping: boolean;
  
  // Progress
  progress: number;
  currentPrediction: string;
  confidenceScore: number;
  currentRound: number;
  
  // Completion
  isFinished: boolean;
  resultData: ResultData | null;
  
  // Actions
  setSessionId: (id: string) => void;
  setDepth: (depth: AnalysisDepth) => void;
  setIsStarted: (started: boolean) => void;
  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  setIsLoading: (loading: boolean) => void;
  setIsTyping: (typing: boolean) => void;
  setProgress: (progress: number) => void;
  setCurrentPrediction: (prediction: string) => void;
  setConfidenceScore: (score: number) => void;
  setCurrentRound: (round: number) => void;
  setIsFinished: (finished: boolean) => void;
  setResultData: (data: ResultData | null) => void;
  reset: () => void;
}

const initialState = {
  sessionId: null,
  depth: null,
  isStarted: false,
  messages: [],
  isLoading: false,
  isTyping: false,
  progress: 0,
  currentPrediction: "Unknown",
  confidenceScore: 0,
  currentRound: 0,
  isFinished: false,
  resultData: null,
};

export const useChatStore = create<ChatState>((set) => ({
  ...initialState,
  
  setSessionId: (sessionId) => set({ sessionId }),
  setDepth: (depth) => set({ depth }),
  setIsStarted: (isStarted) => set({ isStarted }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setMessages: (messages) => set({ messages }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setIsTyping: (isTyping) => set({ isTyping }),
  setProgress: (progress) => set({ progress }),
  setCurrentPrediction: (currentPrediction) => set({ currentPrediction }),
  setConfidenceScore: (confidenceScore) => set({ confidenceScore }),
  setCurrentRound: (currentRound) => set({ currentRound }),
  setIsFinished: (isFinished) => set({ isFinished }),
  setResultData: (resultData) => set({ resultData }),
  reset: () => set(initialState),
}));
