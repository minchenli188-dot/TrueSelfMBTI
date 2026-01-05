"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Star, Send, ThumbsUp, ThumbsDown, Check } from "lucide-react";
import { useAnalytics } from "@/hooks/useAnalytics";

interface FeedbackButtonProps {
  sessionId?: string;
  mbtiResult?: string;
  variant?: "floating" | "inline";
}

type FeedbackStep = "type" | "rating" | "text" | "success";

export function FeedbackButton({
  sessionId,
  mbtiResult,
  variant = "floating",
}: FeedbackButtonProps) {
  const { submitResultRating, submitGeneralFeedback, buttonClick } = useAnalytics();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<FeedbackStep>("type");
  const [feedbackType, setFeedbackType] = useState<"result" | "general" | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleOpen = () => {
    buttonClick("feedback_open");
    setIsOpen(true);
    setStep("type");
  };
  
  const handleClose = () => {
    setIsOpen(false);
    // Reset state after animation
    setTimeout(() => {
      setStep("type");
      setFeedbackType(null);
      setRating(0);
      setComment("");
    }, 300);
  };
  
  const handleTypeSelect = (type: "result" | "general") => {
    buttonClick("feedback_type_select", { type });
    setFeedbackType(type);
    setStep("rating");
  };
  
  const handleRatingSelect = (value: number) => {
    setRating(value);
  };
  
  const handleSubmit = async () => {
    if (rating === 0) return;
    
    setIsSubmitting(true);
    buttonClick("feedback_submit", { type: feedbackType, rating });
    
    try {
      if (feedbackType === "result") {
        await submitResultRating(rating, sessionId, mbtiResult, comment || undefined);
      } else {
        await submitGeneralFeedback(comment, rating, sessionId);
      }
      setStep("success");
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    }
    
    setIsSubmitting(false);
  };
  
  const renderTypeStep = () => (
    <div className="space-y-4">
      <p className="text-sm text-foreground-muted text-center mb-4">
        选择反馈类型
      </p>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleTypeSelect("result")}
          className="flex flex-col items-center gap-2 p-4 rounded-xl bg-background-tertiary hover:bg-background-tertiary/80 transition-colors border border-transparent hover:border-analyst/30"
        >
          <div className="w-10 h-10 rounded-full bg-diplomat/20 flex items-center justify-center">
            <ThumbsUp className="w-5 h-5 text-diplomat" />
          </div>
          <span className="text-sm font-medium">结果准确度</span>
          <span className="text-xs text-foreground-subtle">
            评价你的测试结果
          </span>
        </button>
        
        <button
          onClick={() => handleTypeSelect("general")}
          className="flex flex-col items-center gap-2 p-4 rounded-xl bg-background-tertiary hover:bg-background-tertiary/80 transition-colors border border-transparent hover:border-analyst/30"
        >
          <div className="w-10 h-10 rounded-full bg-analyst/20 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-analyst" />
          </div>
          <span className="text-sm font-medium">使用体验</span>
          <span className="text-xs text-foreground-subtle">
            分享你的想法
          </span>
        </button>
      </div>
    </div>
  );
  
  const renderRatingStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-sm text-foreground-muted mb-2">
          {feedbackType === "result"
            ? "你觉得测试结果准确吗？"
            : "你的使用体验如何？"}
        </p>
        <p className="text-xs text-foreground-subtle">
          {feedbackType === "result"
            ? `你的结果：${mbtiResult || "未知"}`
            : "请选择1-5分评价"}
        </p>
      </div>
      
      {/* Star Rating */}
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            onClick={() => handleRatingSelect(value)}
            className="p-2 transition-transform hover:scale-110"
          >
            <Star
              className={`w-8 h-8 transition-colors ${
                value <= rating
                  ? "fill-explorer text-explorer"
                  : "text-foreground-subtle"
              }`}
            />
          </button>
        ))}
      </div>
      
      {/* Rating Labels */}
      <div className="flex justify-between text-xs text-foreground-subtle px-2">
        <span>{feedbackType === "result" ? "不准确" : "很差"}</span>
        <span>{feedbackType === "result" ? "非常准确" : "很棒"}</span>
      </div>
      
      {/* Comment Input */}
      <div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={
            feedbackType === "result"
              ? "告诉我们哪里不够准确...（可选）"
              : "分享你的建议或想法...（可选）"
          }
          rows={3}
          className="w-full px-4 py-3 rounded-xl bg-background-tertiary text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-analyst/50 resize-none text-sm"
        />
      </div>
      
      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={rating === 0 || isSubmitting}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-analyst text-white font-medium hover:bg-analyst/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          "提交中..."
        ) : (
          <>
            <Send className="w-4 h-4" />
            提交反馈
          </>
        )}
      </button>
    </div>
  );
  
  const renderSuccessStep = () => (
    <div className="py-8 text-center space-y-4">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", damping: 15 }}
        className="w-16 h-16 rounded-full bg-diplomat/20 flex items-center justify-center mx-auto"
      >
        <Check className="w-8 h-8 text-diplomat" />
      </motion.div>
      <div>
        <h3 className="text-lg font-semibold mb-1">感谢你的反馈！</h3>
        <p className="text-sm text-foreground-muted">
          你的意见对我们很重要
        </p>
      </div>
      <button
        onClick={handleClose}
        className="px-6 py-2 rounded-xl bg-background-tertiary text-foreground-muted hover:text-foreground transition-colors"
      >
        关闭
      </button>
    </div>
  );
  
  if (variant === "inline") {
    return (
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-background-tertiary hover:bg-background-secondary text-foreground-muted hover:text-foreground transition-colors text-sm"
      >
        <MessageSquare className="w-4 h-4" />
        <span>反馈</span>
      </button>
    );
  }
  
  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={handleOpen}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 2, type: "spring", damping: 15 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-analyst text-white shadow-lg shadow-analyst/30 flex items-center justify-center"
      >
        <MessageSquare className="w-5 h-5" />
      </motion.button>
      
      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-x-4 bottom-20 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 z-50 max-w-sm mx-auto"
            >
              <div className="bg-background-secondary rounded-2xl border border-border overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="relative px-6 py-4 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-analyst/20 flex items-center justify-center">
                      <MessageSquare className="w-4 h-4 text-analyst" />
                    </div>
                    <h2 className="text-lg font-semibold">给我们反馈</h2>
                  </div>
                  <button
                    onClick={handleClose}
                    className="absolute top-3 right-3 p-2 rounded-lg hover:bg-background-tertiary transition-colors"
                  >
                    <X className="w-5 h-5 text-foreground-muted" />
                  </button>
                </div>
                
                {/* Content */}
                <div className="px-6 py-6">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      {step === "type" && renderTypeStep()}
                      {step === "rating" && renderRatingStep()}
                      {step === "success" && renderSuccessStep()}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default FeedbackButton;


