"use client";

import { useState, useRef, useEffect, type KeyboardEvent, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Send, Loader2 } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
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

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [value]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (value.trim() && !isLoading && !disabled) {
      onSend();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isLoading && !disabled) {
        onSend();
      }
    }
  };

  const canSend = value.trim().length > 0 && !isLoading && !disabled;

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full p-4 glass border-t border-border/50"
    >
      <div className="max-w-3xl mx-auto">
        <div
          className={`
            relative flex items-end gap-3 p-1 rounded-2xl
            bg-background-secondary border transition-all duration-300
            ${isFocused ? "border-transparent" : "border-border"}
          `}
          style={
            isFocused
              ? {
                  boxShadow: `0 0 0 2px ${colors.primary}, 0 0 20px -5px rgba(${colors.primaryRgb}, 0.3)`,
                }
              : undefined
          }
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled || isLoading}
            placeholder={placeholder}
            rows={1}
            className={`
              flex-1 px-4 py-3 bg-transparent resize-none
              text-foreground placeholder:text-foreground-subtle
              focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed
              min-h-[52px] max-h-[200px]
            `}
          />

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
          <span>按 Enter 发送，Shift + Enter 换行</span>
          <span>{value.length} / 5000</span>
        </div>
      </div>
    </motion.form>
  );
}






