"use client";

import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  MessageSquare,
  Sparkles,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { ChatBubble, TypingIndicator } from "@/components/chat/ChatBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import {
  useQASession,
  getPresetQuestions,
  type PresetQuestion,
  type AnalysisDepth,
} from "@/hooks/useQASession";
import type { ResultData } from "@/hooks/useChatSession";

interface AIQAViewProps {
  sessionId: string;
  resultData: ResultData;
  onBack: () => void;
  depth: AnalysisDepth;
}

export function AIQAView({ sessionId, resultData, onBack, depth }: AIQAViewProps) {
  const { colors } = useTheme();
  const [state, actions] = useQASession(sessionId, resultData);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const presetQuestions = getPresetQuestions(resultData, depth);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [state.messages, state.isLoading]);

  const handlePresetClick = async (preset: PresetQuestion) => {
    await actions.sendPresetQuestion(preset.question);
  };

  // Show welcome state when no messages
  const showWelcome = state.messages.length === 0 && !state.isLoading;

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50">
        <div className="px-6 py-4 glass border-b border-border/50">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-foreground-muted hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">返回结果</span>
            </button>

            <div className="flex items-center gap-2">
              <MessageSquare
                className="w-5 h-5"
                style={{ color: colors.primary }}
              />
              <h1
                className="font-display text-lg"
                style={{ color: colors.primary }}
              >
                AI 解答
              </h1>
            </div>

            <div className="w-24 flex justify-end">
              <span
                className="text-sm font-mono px-2 py-1 rounded-lg"
                style={{
                  backgroundColor: `rgba(${colors.primaryRgb}, 0.15)`,
                  color: colors.primary,
                }}
              >
                {resultData.mbti_type}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto scrollbar-hide"
      >
        <div className="max-w-3xl mx-auto px-4 py-6">
          <AnimatePresence mode="popLayout">
            {/* Welcome State */}
            {showWelcome && (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* Welcome message */}
                <div className="text-center py-8">
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 10 }}
                    className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                    style={{
                      backgroundColor: `rgba(${colors.primaryRgb}, 0.15)`,
                    }}
                  >
                    <HelpCircle
                      className="w-8 h-8"
                      style={{ color: colors.primary }}
                    />
                  </motion.div>
                  <h2 className="text-2xl font-display mb-2">
                    有什么想了解的吗？
                  </h2>
                  <p className="text-foreground-muted max-w-md mx-auto">
                    我可以帮你深入解读你的 MBTI 结果
                    <span
                      className="font-mono font-semibold mx-1"
                      style={{ color: colors.primary }}
                    >
                      {resultData.mbti_type}
                    </span>
                    的各个方面，包括性格特点、认知功能、职业建议等。
                  </p>
                </div>

                {/* Preset Questions Grid */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-foreground-muted">
                    <Sparkles className="w-4 h-4" />
                    <span>快速提问</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {presetQuestions.map((preset, index) => (
                      <motion.button
                        key={preset.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handlePresetClick(preset)}
                        disabled={state.isLoading}
                        className="group relative p-4 rounded-xl text-left transition-all duration-300 glass border border-border hover:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          ["--hover-border" as string]: colors.primary,
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div
                          className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                          style={{
                            boxShadow: `0 0 0 2px ${colors.primary}, 0 0 20px -5px rgba(${colors.primaryRgb}, 0.3)`,
                          }}
                        />
                        <div className="relative flex items-start gap-3">
                          <span className="text-2xl">{preset.icon}</span>
                          <div>
                            <div className="font-medium mb-1">
                              {preset.label}
                            </div>
                            <div className="text-sm text-foreground-muted line-clamp-2">
                              {preset.question.split("\n")[0]}
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Messages */}
            {state.messages.map((message, index) => (
              <div key={message.id} className="mb-6">
                <ChatBubble
                  role={message.role}
                  content={message.content}
                  timestamp={message.timestamp}
                  isLatest={
                    message.role === "assistant" &&
                    index === state.messages.length - 1 &&
                    !state.isLoading
                  }
                />
              </div>
            ))}

            {/* Typing indicator */}
            {state.isLoading && (
              <div className="mb-6">
                <TypingIndicator key="typing" />
              </div>
            )}

            {/* Error display */}
            {state.error && !state.isLoading && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 mb-6"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{state.error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />

          {/* Preset buttons when there are messages */}
          {!showWelcome && !state.isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 pt-4 border-t border-border/30"
            >
              <div className="flex items-center gap-2 text-sm text-foreground-muted mb-3">
                <Sparkles className="w-4 h-4" />
                <span>继续探索</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {presetQuestions.slice(0, 4).map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetClick(preset)}
                    disabled={state.isLoading}
                    className="px-3 py-2 rounded-lg text-sm glass border border-border hover:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={
                      {
                        ["--hover-border" as string]: colors.primary,
                      } as React.CSSProperties
                    }
                  >
                    <span className="mr-1.5">{preset.icon}</span>
                    {preset.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </main>

      {/* Input area */}
      <ChatInput
        value={state.input}
        onChange={actions.setInput}
        onSend={() => actions.sendMessage()}
        isLoading={state.isLoading}
        disabled={false}
        placeholder="输入你想了解的问题..."
      />
    </div>
  );
}




