"use client";

import { motion } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import { User, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatBubbleProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
  isLatest?: boolean;
}

export function ChatBubble({ role, content, timestamp, isLatest }: ChatBubbleProps) {
  const { colors } = useTheme();
  const isUser = role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.19, 1, 0.22, 1] }}
      className={cn("flex gap-3 max-w-[85%]", isUser ? "ml-auto flex-row-reverse" : "")}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser
            ? "bg-background-tertiary border border-border"
            : "border"
        )}
        style={
          !isUser
            ? {
                backgroundColor: `rgba(${colors.primaryRgb}, 0.15)`,
                borderColor: `rgba(${colors.primaryRgb}, 0.3)`,
              }
            : undefined
        }
      >
        {isUser ? (
          <User className="w-4 h-4 text-foreground-muted" />
        ) : (
          <Bot className="w-4 h-4" style={{ color: colors.primary }} />
        )}
      </div>

      {/* Message bubble */}
      <div
        className={cn(
          "relative px-4 py-3 rounded-2xl transition-all duration-300",
          isUser
            ? "bg-background-tertiary border border-border rounded-br-sm"
            : "rounded-bl-sm"
        )}
        style={
          !isUser
            ? {
                backgroundColor: `rgba(${colors.primaryRgb}, 0.08)`,
                borderWidth: "1px",
                borderColor: `rgba(${colors.primaryRgb}, 0.2)`,
              }
            : undefined
        }
      >
        {/* Content with markdown-like formatting */}
        <div className="whitespace-pre-wrap break-words" style={{ color: "#fafafa" }}>
          {content.split("\n").map((line, i) => {
            // Skip empty lines but preserve spacing
            if (!line.trim()) {
              return <br key={i} />;
            }

            // Clean up markdown artifacts
            let cleanedLine = line;
            
            // Remove markdown headers (####, ###, ##, #)
            cleanedLine = cleanedLine.replace(/^#{1,6}\s*/, "");
            
            // Convert asterisk bullets to cleaner format
            cleanedLine = cleanedLine.replace(/^\*\s+/, "• ");
            
            // Convert dash bullets to cleaner format
            cleanedLine = cleanedLine.replace(/^-\s+/, "• ");
            
            // Handle bold text marked with ** - same color as regular text (white)
            const formattedLine = cleanedLine.split(/(\*\*[^*]+\*\*)/).map((part, j) => {
              if (part.startsWith("**") && part.endsWith("**")) {
                return (
                  <strong key={j} className="font-semibold" style={{ color: "#fafafa" }}>
                    {part.slice(2, -2)}
                  </strong>
                );
              }
              return <span key={j} style={{ color: "#fafafa" }}>{part}</span>;
            });

            return (
              <span key={i}>
                {formattedLine}
                {i < content.split("\n").length - 1 && <br />}
              </span>
            );
          })}
        </div>

        {/* Timestamp */}
        {timestamp && (
          <div className="mt-2 text-xs text-foreground-subtle">
            {timestamp.toLocaleTimeString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        )}

        {/* Glow effect for latest assistant message */}
        {!isUser && isLatest && (
          <motion.div
            className="absolute inset-0 rounded-2xl rounded-bl-sm -z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 0.1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              boxShadow: `0 0 30px -5px rgba(${colors.primaryRgb}, 0.3)`,
            }}
          />
        )}
      </div>
    </motion.div>
  );
}

// Typing indicator component
export function TypingIndicator() {
  const { colors } = useTheme();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex gap-3 max-w-[85%]"
    >
      {/* Avatar */}
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border"
        style={{
          backgroundColor: `rgba(${colors.primaryRgb}, 0.15)`,
          borderColor: `rgba(${colors.primaryRgb}, 0.3)`,
        }}
      >
        <Bot className="w-4 h-4" style={{ color: colors.primary }} />
      </div>

      {/* Typing dots */}
      <div
        className="px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1"
        style={{
          backgroundColor: `rgba(${colors.primaryRgb}, 0.08)`,
          borderWidth: "1px",
          borderColor: `rgba(${colors.primaryRgb}, 0.2)`,
        }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: colors.primary }}
            animate={{ y: [0, -6, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.15,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}


