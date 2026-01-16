"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ============================================================
// Types
// ============================================================

export interface SpeechRecognitionState {
  // Current recognition state
  isListening: boolean;
  isSupported: boolean;
  
  // Recognition results
  transcript: string;
  interimTranscript: string;
  
  // Error handling
  error: string | null;
  
  // Browser info
  browserName: string;
}

export interface SpeechRecognitionActions {
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

// ============================================================
// Browser Detection
// ============================================================

function getBrowserName(): string {
  if (typeof window === "undefined") return "unknown";
  
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (userAgent.includes("chrome") && !userAgent.includes("edg")) {
    return "Chrome";
  } else if (userAgent.includes("safari") && !userAgent.includes("chrome")) {
    return "Safari";
  } else if (userAgent.includes("firefox")) {
    return "Firefox";
  } else if (userAgent.includes("edg")) {
    return "Edge";
  } else if (userAgent.includes("opera") || userAgent.includes("opr")) {
    return "Opera";
  }
  
  return "unknown";
}

// ============================================================
// Web Speech API Types
// ============================================================

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  onspeechend: (() => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

// ============================================================
// Error Messages (Chinese)
// ============================================================

const ERROR_MESSAGES: Record<string, string> = {
  "no-speech": "未检测到语音，请再试一次",
  "audio-capture": "无法访问麦克风，请检查权限设置",
  "not-allowed": "麦克风权限被拒绝，请在浏览器设置中允许",
  "network": "网络错误，请检查网络连接",
  "aborted": "语音识别被中断",
  "service-not-allowed": "语音服务不可用",
  "bad-grammar": "语音识别语法错误",
  "language-not-supported": "不支持该语言",
};

// ============================================================
// Hook Implementation
// ============================================================

export function useSpeechRecognition(
  language: string = "zh-CN"
): [SpeechRecognitionState, SpeechRecognitionActions] {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [browserName, setBrowserName] = useState("unknown");
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isManualStopRef = useRef(false);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window === "undefined") return;

    setBrowserName(getBrowserName());

    // Check for browser support
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    // Create recognition instance
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.maxAlternatives = 1;

    // Handle results
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      let currentInterim = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          currentInterim += result[0].transcript;
        }
      }

      if (finalTranscript) {
        setTranscript((prev) => prev + finalTranscript);
        setInterimTranscript("");
      } else {
        setInterimTranscript(currentInterim);
      }
    };

    // Handle errors
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const errorMessage = ERROR_MESSAGES[event.error] || `识别错误: ${event.error}`;
      setError(errorMessage);
      setIsListening(false);
    };

    // Handle end
    recognition.onend = () => {
      // Only restart if we didn't manually stop and should still be listening
      if (!isManualStopRef.current && isListening) {
        try {
          recognition.start();
        } catch {
          // Ignore - might already be stopped
        }
      } else {
        setIsListening(false);
      }
    };

    // Handle start
    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, [language]);

  // Update language when it changes
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = language;
    }
  }, [language]);

  // Start listening
  const startListening = useCallback(() => {
    if (!recognitionRef.current || !isSupported) {
      setError("您的浏览器不支持语音识别");
      return;
    }

    isManualStopRef.current = false;
    setError(null);
    setInterimTranscript("");

    try {
      recognitionRef.current.start();
    } catch (err) {
      // Handle case where recognition is already started
      if (err instanceof Error && err.message.includes("already started")) {
        // Already listening, ignore
      } else {
        setError("启动语音识别失败，请重试");
      }
    }
  }, [isSupported]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;

    isManualStopRef.current = true;

    try {
      recognitionRef.current.stop();
    } catch {
      // Ignore stop errors
    }

    setIsListening(false);
    setInterimTranscript("");
  }, []);

  // Reset transcript
  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
    setError(null);
  }, []);

  return [
    {
      isListening,
      isSupported,
      transcript,
      interimTranscript,
      error,
      browserName,
    },
    {
      startListening,
      stopListening,
      resetTranscript,
    },
  ];
}






