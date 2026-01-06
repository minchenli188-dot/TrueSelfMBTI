"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle, Shield, Brain, Sparkles, Palette, MessagesSquare, User, Bot, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type FeatureKey = "natural-chat" | "jung-theory" | "cognitive-functions" | "personalized-results" | "portrait" | "ai-qa";

interface FeatureDemoProps {
  feature: FeatureKey | null;
  onClose: () => void;
  onStartTest: () => void;
}

// Simulated chat messages for the natural chat demo
const CHAT_DEMO_MESSAGES = [
  {
    role: "assistant" as const,
    content: "嗨！我是你的人格测试助手。让我们用聊天的方式来了解你吧！\n\n想象一下：周末早上醒来，没有任何安排。你第一反应想做什么？",
    delay: 0,
  },
  {
    role: "user" as const,
    content: "我可能会先赖床一会儿，然后想想今天想做什么。如果天气好的话，可能会出去走走，或者约朋友出来玩。",
    delay: 2500,
  },
  {
    role: "assistant" as const,
    content: "听起来你比较享受随性的感觉！那当你和朋友相处时，你更倾向于提出建议带领大家行动，还是喜欢配合朋友的想法呢？",
    delay: 5000,
  },
  {
    role: "user" as const,
    content: "看情况吧，如果是我熟悉的领域我会主动提建议，但大部分时候我更喜欢听听大家的想法，找到大家都开心的方案。",
    delay: 8000,
  },
  {
    role: "assistant" as const,
    content: "有意思！你似乎很重视和谐的氛围。我注意到你在决策时会考虑大家的感受，这是 F（情感）功能的体现。继续聊聊...",
    delay: 11000,
  },
];

// Jung theory content
const JUNG_THEORY_CONTENT = {
  title: "荣格心理学理论",
  subtitle: "科学的人格分析基础",
  sections: [
    {
      title: "心理类型理论",
      content: "卡尔·荣格在1921年提出的心理类型理论是16型人格的理论基础。他认为人格可以通过四个维度来理解：能量获取方式、信息收集方式、决策方式和生活态度。",
    },
    {
      title: "认知功能",
      content: "荣格提出了8种认知功能：外倾/内倾的直觉(Ne/Ni)、感觉(Se/Si)、思维(Te/Ti)和情感(Fe/Fi)。每个人都会优先使用其中几种功能。",
    },
    {
      title: "功能栈",
      content: "每种人格类型都有独特的功能栈，包括主导功能、辅助功能、第三功能和劣势功能。这种层次结构决定了我们如何感知世界和做出决策。",
    },
  ],
};

// Cognitive functions content
const COGNITIVE_FUNCTIONS_CONTENT = {
  title: "认知功能分析",
  functions: [
    { code: "Ni", name: "内倾直觉", desc: "洞察未来趋势，把握深层含义", color: "#88619a" },
    { code: "Ne", name: "外倾直觉", desc: "发散思维，探索无限可能性", color: "#4298b4" },
    { code: "Si", name: "内倾感觉", desc: "注重细节，依赖过往经验", color: "#33a474" },
    { code: "Se", name: "外倾感觉", desc: "活在当下，追求感官体验", color: "#e4ae3a" },
    { code: "Ti", name: "内倾思维", desc: "追求逻辑一致，深度分析", color: "#88619a" },
    { code: "Te", name: "外倾思维", desc: "注重效率，善于组织执行", color: "#4298b4" },
    { code: "Fi", name: "内倾情感", desc: "坚守内心价值，追求真实", color: "#33a474" },
    { code: "Fe", name: "外倾情感", desc: "重视和谐，关注他人感受", color: "#e4ae3a" },
  ],
};

// Personalized results demo
const PERSONALIZED_RESULTS_CONTENT = {
  title: "个性化结果示例",
  mbtiType: "INFP",
  typeName: "调停者",
  highlights: [
    "你对美和艺术有着敏锐的感知力",
    "内心世界丰富，常常陷入深思",
    "重视真诚和真实，难以接受虚伪",
    "有强烈的理想主义倾向",
  ],
  insight: "基于你分享的经历，我发现你在面对冲突时倾向于寻求内心的平衡而非外在的对抗。这体现了你的Fi（内倾情感）主导功能在工作...",
};

// Portrait demo content
const PORTRAIT_CONTENT = {
  title: "AI 专属画像",
  description: "根据你的性格类型和对话内容，AI 会为你生成独一无二的视觉形象",
  features: [
    "融合你的性格特质",
    "体现你的认知功能",
    "展现你的精神气质",
    "每次生成都独一无二",
  ],
};

// AI QA demo messages
const AI_QA_DEMO_MESSAGES = [
  {
    role: "user" as const,
    content: "为什么我的结果是 INFP？我觉得自己有时候也挺理性的。",
    delay: 0,
  },
  {
    role: "assistant" as const,
    content: "这是个很好的问题！INFP 确实可以很理性，因为你们有 Ti（内倾思维）作为影子功能。\n\n关键区别在于决策时的优先级：当面对价值观冲突时，你更倾向于听从内心（Fi），而不是纯逻辑分析（Ti）。\n\n在对话中你提到...",
    delay: 2000,
  },
];

// Chat bubble component for demo
function DemoChatBubble({ 
  role, 
  content,
  isVisible 
}: { 
  role: "user" | "assistant"; 
  content: string;
  isVisible: boolean;
}) {
  const isUser = role === "user";
  const primaryColor = "#88619a"; // analyst color

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.19, 1, 0.22, 1] }}
      className={cn("flex gap-3 max-w-[90%]", isUser ? "ml-auto flex-row-reverse" : "")}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center",
          isUser
            ? "bg-white/10 border border-white/20"
            : "border"
        )}
        style={
          !isUser
            ? {
                backgroundColor: `rgba(136, 97, 154, 0.15)`,
                borderColor: `rgba(136, 97, 154, 0.3)`,
              }
            : undefined
        }
      >
        {isUser ? (
          <User className="w-3.5 h-3.5 text-white/60" />
        ) : (
          <Bot className="w-3.5 h-3.5" style={{ color: primaryColor }} />
        )}
      </div>

      {/* Message bubble */}
      <div
        className={cn(
          "relative px-3.5 py-2.5 rounded-2xl text-sm",
          isUser
            ? "bg-white/10 border border-white/20 rounded-br-sm"
            : "rounded-bl-sm"
        )}
        style={
          !isUser
            ? {
                backgroundColor: `rgba(136, 97, 154, 0.08)`,
                borderWidth: "1px",
                borderColor: `rgba(136, 97, 154, 0.2)`,
              }
            : undefined
        }
      >
        <div className="whitespace-pre-wrap break-words text-white/90 leading-relaxed">
          {content}
        </div>
      </div>
    </motion.div>
  );
}

// Typing indicator for demo
function DemoTypingIndicator({ isVisible }: { isVisible: boolean }) {
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex gap-3 max-w-[90%]"
    >
      <div
        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center border"
        style={{
          backgroundColor: `rgba(136, 97, 154, 0.15)`,
          borderColor: `rgba(136, 97, 154, 0.3)`,
        }}
      >
        <Bot className="w-3.5 h-3.5" style={{ color: "#88619a" }} />
      </div>
      <div
        className="px-3.5 py-2.5 rounded-2xl rounded-bl-sm flex items-center gap-1"
        style={{
          backgroundColor: `rgba(136, 97, 154, 0.08)`,
          borderWidth: "1px",
          borderColor: `rgba(136, 97, 154, 0.2)`,
        }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: "#88619a" }}
            animate={{ y: [0, -4, 0] }}
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

// Natural chat demo component
function NaturalChatDemo() {
  const [visibleMessages, setVisibleMessages] = useState<number>(0);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (visibleMessages >= CHAT_DEMO_MESSAGES.length) return;

    const nextMessage = CHAT_DEMO_MESSAGES[visibleMessages];
    const delay = visibleMessages === 0 ? 500 : nextMessage.delay - CHAT_DEMO_MESSAGES[visibleMessages - 1].delay;

    // Show typing indicator before assistant messages
    if (nextMessage.role === "assistant" && visibleMessages > 0) {
      const typingTimer = setTimeout(() => {
        setIsTyping(true);
      }, delay - 1500);

      const messageTimer = setTimeout(() => {
        setIsTyping(false);
        setVisibleMessages(prev => prev + 1);
      }, delay);

      return () => {
        clearTimeout(typingTimer);
        clearTimeout(messageTimer);
      };
    } else {
      const timer = setTimeout(() => {
        setVisibleMessages(prev => prev + 1);
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [visibleMessages]);

  // Reset animation when component unmounts and remounts
  useEffect(() => {
    setVisibleMessages(0);
    setIsTyping(false);
    
    // Start the first message after a short delay
    const timer = setTimeout(() => {
      setVisibleMessages(1);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Demo header */}
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-white mb-1">自然对话体验</h3>
        <p className="text-sm text-white/60">像和朋友聊天一样，轻松完成性格测试</p>
      </div>

      {/* Chat demo area */}
      <div className="flex-1 overflow-y-auto space-y-3 px-2 py-3 rounded-xl bg-black/20 min-h-[300px]">
        {CHAT_DEMO_MESSAGES.slice(0, visibleMessages).map((msg, index) => (
          <DemoChatBubble
            key={index}
            role={msg.role}
            content={msg.content}
            isVisible={true}
          />
        ))}
        <DemoTypingIndicator isVisible={isTyping} />
      </div>

      {/* Demo note */}
      <div className="mt-4 text-center">
        <p className="text-xs text-white/40">
          这是模拟演示 · 实际对话会根据你的回答智能调整
        </p>
      </div>
    </div>
  );
}

// Jung theory demo component
function JungTheoryDemo() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-[#88619a]/30 to-[#4298b4]/30 border border-[#88619a]/30 mb-3">
          <Shield className="w-6 h-6 text-[#88619a]" />
        </div>
        <h3 className="text-lg font-semibold text-white">{JUNG_THEORY_CONTENT.title}</h3>
        <p className="text-sm text-white/60">{JUNG_THEORY_CONTENT.subtitle}</p>
      </div>

      {/* Content sections */}
      <div className="space-y-4 flex-1">
        {JUNG_THEORY_CONTENT.sections.map((section, index) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.15 }}
            className="p-4 rounded-xl bg-white/5 border border-white/10"
          >
            <h4 className="text-sm font-medium text-[#88619a] mb-2">{section.title}</h4>
            <p className="text-sm text-white/70 leading-relaxed">{section.content}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Cognitive functions demo component
function CognitiveFunctionsDemo() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="text-center mb-5">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-[#e4ae3a]/30 to-[#88619a]/30 border border-[#e4ae3a]/30 mb-3">
          <Brain className="w-6 h-6 text-[#e4ae3a]" />
        </div>
        <h3 className="text-lg font-semibold text-white">{COGNITIVE_FUNCTIONS_CONTENT.title}</h3>
        <p className="text-sm text-white/60">8 大认知功能，揭示思维的底层逻辑</p>
      </div>

      {/* Functions grid */}
      <div className="grid grid-cols-2 gap-2.5 flex-1">
        {COGNITIVE_FUNCTIONS_CONTENT.functions.map((func, index) => (
          <motion.div
            key={func.code}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="px-2 py-0.5 rounded text-xs font-mono font-semibold"
                style={{ backgroundColor: `${func.color}30`, color: func.color }}
              >
                {func.code}
              </span>
              <span className="text-xs font-medium text-white/90">{func.name}</span>
            </div>
            <p className="text-xs text-white/50 leading-relaxed">{func.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Personalized results demo component
function PersonalizedResultsDemo() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="text-center mb-5">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-[#33a474]/30 to-[#e4ae3a]/30 border border-[#33a474]/30 mb-3">
          <Sparkles className="w-6 h-6 text-[#33a474]" />
        </div>
        <h3 className="text-lg font-semibold text-white">{PERSONALIZED_RESULTS_CONTENT.title}</h3>
      </div>

      {/* Demo result card */}
      <div className="flex-1">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl bg-gradient-to-br from-[#33a474]/10 to-[#33a474]/5 border border-[#33a474]/20"
        >
          {/* Type badge */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center border-2 border-[#33a474]" style={{ backgroundColor: 'rgba(51, 164, 116, 0.2)' }}>
              <span className="text-xl font-bold font-mono text-[#33a474]">{PERSONALIZED_RESULTS_CONTENT.mbtiType}</span>
            </div>
            <div>
              <div className="text-lg font-semibold text-white">{PERSONALIZED_RESULTS_CONTENT.typeName}</div>
              <div className="text-xs text-white/50">外交家 · Diplomat</div>
            </div>
          </div>

          {/* Highlights */}
          <div className="space-y-2 mb-4">
            {PERSONALIZED_RESULTS_CONTENT.highlights.map((highlight, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className="flex items-start gap-2 text-sm"
              >
                <span className="text-[#33a474] mt-0.5">✦</span>
                <span className="text-white/80">{highlight}</span>
              </motion.div>
            ))}
          </div>

          {/* Insight preview */}
          <div className="p-3 rounded-xl bg-black/20 border border-white/5">
            <div className="text-xs text-[#33a474] font-medium mb-1">专属洞察</div>
            <p className="text-xs text-white/60 leading-relaxed">{PERSONALIZED_RESULTS_CONTENT.insight}</p>
          </div>
        </motion.div>
      </div>

      {/* Note */}
      <p className="text-xs text-white/40 text-center mt-4">
        每个人的结果报告都是基于对话内容生成的独特分析
      </p>
    </div>
  );
}

// Portrait demo component
function PortraitDemo() {
  // Simulate generation animation, then show pre-generated image
  const [isGenerating, setIsGenerating] = useState(true);
  const [showImage, setShowImage] = useState(false);
  const demoImageUrl = "/demo-portrait-infp.png";

  useEffect(() => {
    // Simulate AI generation time (2.5 seconds)
    const generatingTimer = setTimeout(() => {
      setIsGenerating(false);
      // Small delay before showing image for smooth transition
      setTimeout(() => setShowImage(true), 200);
    }, 2500);

    return () => clearTimeout(generatingTimer);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="text-center mb-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-[#e4ae3a]/30 to-[#88619a]/30 border border-[#e4ae3a]/30 mb-3">
          <Palette className="w-6 h-6 text-[#e4ae3a]" />
        </div>
        <h3 className="text-lg font-semibold text-white">{PORTRAIT_CONTENT.title}</h3>
        <p className="text-sm text-white/60">{PORTRAIT_CONTENT.description}</p>
      </div>

      {/* Portrait preview - simulates live generation */}
      <div className="flex-1 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative w-40 h-60 rounded-2xl overflow-hidden mb-3 border border-white/10"
          style={{ backgroundColor: isGenerating ? 'rgba(136, 97, 154, 0.15)' : 'transparent' }}
        >
          {/* Loading animation */}
          <AnimatePresence>
            {isGenerating && (
              <motion.div
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center"
              >
                {/* Gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#88619a]/30 via-[#4298b4]/20 to-[#33a474]/30" />
                
                {/* Shimmer effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                
                {/* Sparkles animation */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="relative z-10"
                >
                  <Sparkles className="w-10 h-10 text-[#e4ae3a]" />
                </motion.div>
                <p className="text-xs text-white/70 mt-3 relative z-10">AI 正在创作...</p>
                
                {/* Progress dots */}
                <div className="flex gap-1 mt-2 relative z-10">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-[#e4ae3a]"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Generated image */}
          <AnimatePresence>
            {showImage && (
              <motion.img
                src={demoImageUrl}
                alt="INFP Demo Portrait - 调停者"
                className="w-full h-full object-contain"
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            )}
          </AnimatePresence>

          {/* Subtle glow effect after loaded */}
          {showImage && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: [0.5, 1, 0.5],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                background: 'radial-gradient(ellipse at center, rgba(228, 174, 58, 0.15) 0%, transparent 70%)',
              }}
            />
          )}
        </motion.div>

        {/* Features list */}
        <div className="space-y-2 w-full max-w-xs">
          {PORTRAIT_CONTENT.features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="flex items-center gap-2 text-sm text-white/70"
            >
              <ChevronRight className="w-4 h-4 text-[#e4ae3a]" />
              <span>{feature}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// AI QA demo component
function AIQADemo() {
  const [visibleMessages, setVisibleMessages] = useState<number>(0);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    setVisibleMessages(0);
    setIsTyping(false);

    // Show first message
    const timer1 = setTimeout(() => {
      setVisibleMessages(1);
    }, 500);

    // Show typing indicator
    const timer2 = setTimeout(() => {
      setIsTyping(true);
    }, 1500);

    // Show second message
    const timer3 = setTimeout(() => {
      setIsTyping(false);
      setVisibleMessages(2);
    }, 3500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="text-center mb-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-[#4298b4]/30 to-[#88619a]/30 border border-[#4298b4]/30 mb-3">
          <MessagesSquare className="w-6 h-6 text-[#4298b4]" />
        </div>
        <h3 className="text-lg font-semibold text-white">AI 深度解答</h3>
        <p className="text-sm text-white/60">测试后随时和 AI 对话，深入了解你的性格</p>
      </div>

      {/* Chat demo area */}
      <div className="flex-1 overflow-y-auto space-y-3 px-2 py-3 rounded-xl bg-black/20 min-h-[200px]">
        {AI_QA_DEMO_MESSAGES.slice(0, visibleMessages).map((msg, index) => (
          <DemoChatBubble
            key={index}
            role={msg.role}
            content={msg.content}
            isVisible={true}
          />
        ))}
        <DemoTypingIndicator isVisible={isTyping} />
      </div>

      {/* Example questions */}
      <div className="mt-4">
        <p className="text-xs text-white/50 mb-2">你可以问 AI：</p>
        <div className="flex flex-wrap gap-2">
          {["为什么是这个类型？", "如何发展弱势功能？", "职业建议"].map((q, i) => (
            <span key={i} className="px-3 py-1 rounded-full text-xs bg-white/5 border border-white/10 text-white/60">
              {q}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// Main FeatureDemo component
export function FeatureDemo({ feature, onClose, onStartTest }: FeatureDemoProps) {
  const renderContent = useCallback(() => {
    switch (feature) {
      case "natural-chat":
        return <NaturalChatDemo />;
      case "jung-theory":
        return <JungTheoryDemo />;
      case "cognitive-functions":
        return <CognitiveFunctionsDemo />;
      case "personalized-results":
        return <PersonalizedResultsDemo />;
      case "portrait":
        return <PortraitDemo />;
      case "ai-qa":
        return <AIQADemo />;
      default:
        return null;
    }
  }, [feature]);

  return (
    <AnimatePresence>
      {feature && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          />

          {/* Modal Container - Centers the modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-[420px] max-h-[80vh] rounded-2xl overflow-hidden pointer-events-auto"
            >
              <div className="relative h-full max-h-[80vh] bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1a] border border-white/10 rounded-2xl flex flex-col">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-3 right-3 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
              >
                <X className="w-4 h-4 text-white/70" />
              </button>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-5 pt-8">
                {renderContent()}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-white/10 bg-black/20">
                <button
                  onClick={onStartTest}
                  className="w-full py-3 rounded-xl font-semibold text-sm shadow-lg hover:opacity-90 transition-opacity"
                  style={{
                    background: "linear-gradient(135deg, #f59e0b 0%, #eab308 50%, #d97706 100%)",
                    color: "#1a1a1a",
                  }}
                >
                  开始测试（快速模式）
                </button>
              </div>
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

export type { FeatureKey };

