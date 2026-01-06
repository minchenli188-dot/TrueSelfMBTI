"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, Mic, MicOff, AlertCircle } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

// Voice wave animation component
function VoiceWaveAnimation() {
  return (
    <div className="flex items-center justify-center gap-[3px] h-5">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full bg-current"
          animate={{
            height: ["8px", "20px", "8px"],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.1,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

export function ChatInput({
  value,
  onChange,
  onSend,
  isLoading,
  disabled,
  placeholder = "输入你的想法...",
}: ChatInputProps) {
  const { colors } = useTheme();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Speech recognition hook
  const [speechState, speechActions] = useSpeechRecognition("zh-CN");

  // Sync speech transcript with input value
  useEffect(() => {
    if (speechState.transcript) {
      onChange(speechState.transcript);
    }
  }, [speechState.transcript, onChange]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [value]);

  // Handle form submit
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (value.trim() && !isLoading && !disabled) {
      // Stop listening if currently recording
      if (speechState.isListening) {
        speechActions.stopListening();
      }
      speechActions.resetTranscript();
      onSend();
    }
  };

  // Toggle voice input
  const handleVoiceToggle = () => {
    if (speechState.isListening) {
      speechActions.stopListening();
    } else {
      // Reset transcript when starting new recording
      speechActions.resetTranscript();
      onChange(""); // Clear input when starting voice
      speechActions.startListening();
    }
  };

  const canSend = value.trim().length > 0 && !isLoading && !disabled;
  const showVoiceButton = speechState.isSupported && !isLoading && !disabled;

  // Display text: show interim results while recording
  const displayValue = speechState.isListening && speechState.interimTranscript
    ? value + speechState.interimTranscript
    : value;

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full p-4 glass border-t border-border/50"
    >
      <div className="max-w-3xl mx-auto">
        {/* Voice recognition error message */}
        <AnimatePresence>
          {speechState.error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{speechState.error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recording indicator */}
        <AnimatePresence>
          {speechState.isListening && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mb-3 flex items-center justify-center gap-3 py-2"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-3 h-3 rounded-full bg-red-500"
              />
              <span className="text-sm text-foreground-muted">正在录音... 点击麦克风停止</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div
          className={`
            relative flex items-end gap-3 p-1 rounded-2xl
            bg-background-secondary border transition-all duration-300
            ${isFocused ? "border-transparent" : "border-border"}
            ${speechState.isListening ? "ring-2 ring-red-500/50" : ""}
          `}
          style={
            isFocused && !speechState.isListening
              ? {
                  boxShadow: `0 0 0 2px ${colors.primary}, 0 0 20px -5px rgba(${colors.primaryRgb}, 0.3)`,
                }
              : undefined
          }
        >
          <textarea
            ref={textareaRef}
            value={displayValue}
            onChange={(e) => {
              onChange(e.target.value);
              // If user manually types, reset the transcript
              if (speechState.transcript && e.target.value !== speechState.transcript) {
                speechActions.resetTranscript();
              }
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled || isLoading}
            placeholder={
              speechState.isListening
                ? "正在聆听..."
                : placeholder
            }
            rows={1}
            className={`
              flex-1 px-4 py-3 bg-transparent resize-none
              text-foreground placeholder:text-foreground-subtle
              focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed
              min-h-[52px] max-h-[200px]
            `}
          />

          {/* Voice input button */}
          {showVoiceButton && (
            <motion.button
              type="button"
              onClick={handleVoiceToggle}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`
                flex-shrink-0 w-11 h-11 rounded-xl
                flex items-center justify-center
                transition-all duration-300
              `}
              style={{
                backgroundColor: speechState.isListening
                  ? "rgba(239, 68, 68, 0.2)"
                  : "transparent",
                color: speechState.isListening
                  ? "#ef4444"
                  : undefined,
              }}
              title={speechState.isListening ? "停止录音" : "开始语音输入"}
            >
              {speechState.isListening ? (
                <VoiceWaveAnimation />
              ) : (
                <Mic className="w-5 h-5 text-foreground-muted hover:text-foreground transition-colors" />
              )}
            </motion.button>
          )}

          {/* Send button */}
          <motion.button
            type="submit"
            disabled={!canSend}
            whileHover={canSend ? { scale: 1.05 } : undefined}
            whileTap={canSend ? { scale: 0.95 } : undefined}
            className={`
              flex-shrink-0 w-11 h-11 rounded-xl
              flex items-center justify-center
              transition-all duration-300
              disabled:opacity-40 disabled:cursor-not-allowed
            `}
            style={{
              backgroundColor: canSend ? colors.primary : "transparent",
              color: canSend ? "white" : undefined,
            }}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-foreground-muted" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </motion.button>
        </div>

        {/* Character count and hints */}
        <div className="flex items-center justify-between mt-2 px-2 text-xs text-foreground-subtle">
          <span>
            {speechState.isListening ? (
              <span className="text-red-400">录音中，再次点击停止</span>
            ) : speechState.isSupported ? (
              "点击麦克风语音输入，点击箭头发送"
            ) : (
              "点击箭头发送"
            )}
          </span>
          <span>{value.length} / 5000</span>
        </div>
      </div>
    </motion.form>
  );
}
