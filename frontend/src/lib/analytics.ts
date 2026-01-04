/**
 * Analytics client for user tracking and feedback collection.
 * 
 * This module provides:
 * - Anonymous user identification
 * - Event tracking
 * - User profile management
 * - Feedback submission
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ============================================================
// Types
// ============================================================

export interface UserProfileData {
  anonymous_id: string;
  age_range?: string;
  gender?: string;
  occupation?: string;
  education?: string;
  country?: string;
  referral_source?: string;
  previous_mbti?: string;
  mbti_familiarity?: string;
  language?: string;
  marketing_consent?: boolean;
  email?: string;
  device_type?: string;
  browser?: string;
  os?: string;
  screen_resolution?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

export interface UserEvent {
  anonymous_id: string;
  session_id?: string;
  event_name: string;
  event_category: string;
  event_data?: Record<string, unknown>;
  page_path?: string;
  page_title?: string;
  duration_seconds?: number;
}

export interface UserFeedback {
  anonymous_id: string;
  session_id?: string;
  feedback_type: string;
  nps_score?: number;
  result_accuracy?: number;
  experience_rating?: number;
  feedback_text?: string;
  mbti_result?: string;
  page_context?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================
// Constants
// ============================================================

export const EventNames = {
  // Page/Navigation events
  PAGE_VIEW: "page_view",
  PAGE_LEAVE: "page_leave",
  
  // Session lifecycle
  SESSION_START: "session_start",
  SESSION_COMPLETE: "session_complete",
  SESSION_ABANDON: "session_abandon",
  SESSION_UPGRADE: "session_upgrade",
  
  // Chat events
  MESSAGE_SENT: "message_sent",
  MESSAGE_RECEIVED: "message_received",
  
  // Result events
  RESULT_VIEW: "result_view",
  RESULT_SHARE: "result_share",
  IMAGE_GENERATE: "image_generate",
  IMAGE_DOWNLOAD: "image_download",
  
  // Q&A events
  QA_START: "qa_start",
  QA_QUESTION: "qa_question",
  
  // User engagement
  BUTTON_CLICK: "button_click",
  DEPTH_SELECT: "depth_select",
  RESTART: "restart",
  
  // Feedback
  FEEDBACK_SUBMIT: "feedback_submit",
  NPS_SUBMIT: "nps_submit",
} as const;

export const EventCategories = {
  NAVIGATION: "navigation",
  CHAT: "chat",
  RESULT: "result",
  FEEDBACK: "feedback",
  ENGAGEMENT: "engagement",
  SYSTEM: "system",
} as const;

// ============================================================
// Anonymous ID Management
// ============================================================

const ANONYMOUS_ID_KEY = "mbti_anonymous_id";

function generateAnonymousId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${randomPart}`;
}

export function getAnonymousId(): string {
  if (typeof window === "undefined") {
    return generateAnonymousId();
  }
  
  let anonymousId = localStorage.getItem(ANONYMOUS_ID_KEY);
  
  if (!anonymousId) {
    anonymousId = generateAnonymousId();
    localStorage.setItem(ANONYMOUS_ID_KEY, anonymousId);
  }
  
  return anonymousId;
}

// ============================================================
// Device Detection
// ============================================================

export function getDeviceInfo() {
  if (typeof window === "undefined") {
    return {};
  }
  
  const ua = navigator.userAgent;
  
  // Device type
  let device_type = "desktop";
  if (/Mobi|Android/i.test(ua)) {
    device_type = /Tablet|iPad/i.test(ua) ? "tablet" : "mobile";
  }
  
  // Browser
  let browser = "unknown";
  if (/Chrome/i.test(ua) && !/Edge|Edg/i.test(ua)) browser = "Chrome";
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
  else if (/Firefox/i.test(ua)) browser = "Firefox";
  else if (/Edge|Edg/i.test(ua)) browser = "Edge";
  else if (/Opera|OPR/i.test(ua)) browser = "Opera";
  
  // OS
  let os = "unknown";
  if (/Windows/i.test(ua)) os = "Windows";
  else if (/Mac/i.test(ua)) os = "macOS";
  else if (/Linux/i.test(ua)) os = "Linux";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iOS|iPhone|iPad/i.test(ua)) os = "iOS";
  
  // Screen resolution
  const screen_resolution = `${window.screen.width}x${window.screen.height}`;
  
  return {
    device_type,
    browser,
    os,
    screen_resolution,
  };
}

// ============================================================
// UTM Parameter Extraction
// ============================================================

export function getUTMParams() {
  if (typeof window === "undefined") {
    return {};
  }
  
  const params = new URLSearchParams(window.location.search);
  
  return {
    utm_source: params.get("utm_source") || undefined,
    utm_medium: params.get("utm_medium") || undefined,
    utm_campaign: params.get("utm_campaign") || undefined,
  };
}

// ============================================================
// API Functions
// ============================================================

async function fetchAnalytics<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
    
    if (!response.ok) {
      console.warn(`Analytics API error: ${response.status}`);
      return null;
    }
    
    return response.json();
  } catch (error) {
    // Silently fail for analytics - don't interrupt user experience
    console.warn("Analytics request failed:", error);
    return null;
  }
}

// ============================================================
// Profile API
// ============================================================

export async function createOrUpdateProfile(
  data: Partial<UserProfileData>
): Promise<void> {
  const anonymousId = getAnonymousId();
  const deviceInfo = getDeviceInfo();
  const utmParams = getUTMParams();
  
  await fetchAnalytics("/api/analytics/profile", {
    method: "POST",
    body: JSON.stringify({
      anonymous_id: anonymousId,
      ...deviceInfo,
      ...utmParams,
      ...data,
    }),
  });
}

// ============================================================
// Event Tracking API
// ============================================================

export async function trackEvent(
  eventName: string,
  eventCategory: string,
  eventData?: Record<string, unknown>,
  sessionId?: string
): Promise<void> {
  const anonymousId = getAnonymousId();
  
  const event: UserEvent = {
    anonymous_id: anonymousId,
    session_id: sessionId,
    event_name: eventName,
    event_category: eventCategory,
    event_data: eventData,
    page_path: typeof window !== "undefined" ? window.location.pathname : undefined,
    page_title: typeof document !== "undefined" ? document.title : undefined,
  };
  
  await fetchAnalytics("/api/analytics/event", {
    method: "POST",
    body: JSON.stringify(event),
  });
}

// Event queue for batch sending
let eventQueue: UserEvent[] = [];
let flushTimeout: NodeJS.Timeout | null = null;

export function queueEvent(
  eventName: string,
  eventCategory: string,
  eventData?: Record<string, unknown>,
  sessionId?: string
): void {
  const anonymousId = getAnonymousId();
  
  eventQueue.push({
    anonymous_id: anonymousId,
    session_id: sessionId,
    event_name: eventName,
    event_category: eventCategory,
    event_data: eventData,
    page_path: typeof window !== "undefined" ? window.location.pathname : undefined,
    page_title: typeof document !== "undefined" ? document.title : undefined,
  });
  
  // Flush after 5 seconds of inactivity or when queue reaches 10 events
  if (flushTimeout) {
    clearTimeout(flushTimeout);
  }
  
  if (eventQueue.length >= 10) {
    flushEventQueue();
  } else {
    flushTimeout = setTimeout(flushEventQueue, 5000);
  }
}

export async function flushEventQueue(): Promise<void> {
  if (eventQueue.length === 0) return;
  
  const events = [...eventQueue];
  eventQueue = [];
  
  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }
  
  await fetchAnalytics("/api/analytics/events/batch", {
    method: "POST",
    body: JSON.stringify({ events }),
  });
}

// ============================================================
// Feedback API
// ============================================================

export async function submitFeedback(
  feedback: Omit<UserFeedback, "anonymous_id">
): Promise<void> {
  const anonymousId = getAnonymousId();
  
  await fetchAnalytics("/api/analytics/feedback", {
    method: "POST",
    body: JSON.stringify({
      anonymous_id: anonymousId,
      ...feedback,
    }),
  });
}

// ============================================================
// User Insight Extraction
// ============================================================

export async function extractUserInsights(
  sessionId: string
): Promise<void> {
  const anonymousId = getAnonymousId();
  
  await fetchAnalytics("/api/analytics/extract-insights", {
    method: "POST",
    body: JSON.stringify({
      session_id: sessionId,
      anonymous_id: anonymousId,
    }),
  });
}

// ============================================================
// Convenience Functions
// ============================================================

export function trackPageView(pageName?: string): void {
  trackEvent(
    EventNames.PAGE_VIEW,
    EventCategories.NAVIGATION,
    { page_name: pageName || document.title }
  );
}

export function trackButtonClick(
  buttonName: string,
  context?: Record<string, unknown>
): void {
  trackEvent(
    EventNames.BUTTON_CLICK,
    EventCategories.ENGAGEMENT,
    { button_name: buttonName, ...context }
  );
}

export function trackSessionStart(sessionId: string, depth: string): void {
  trackEvent(
    EventNames.SESSION_START,
    EventCategories.CHAT,
    { depth },
    sessionId
  );
}

export function trackSessionComplete(
  sessionId: string,
  mbtiType: string,
  totalRounds: number
): void {
  trackEvent(
    EventNames.SESSION_COMPLETE,
    EventCategories.CHAT,
    { mbti_type: mbtiType, total_rounds: totalRounds },
    sessionId
  );
}

export function trackMessageSent(sessionId: string, roundNumber: number): void {
  queueEvent(
    EventNames.MESSAGE_SENT,
    EventCategories.CHAT,
    { round: roundNumber },
    sessionId
  );
}

export function trackResultView(
  sessionId: string,
  mbtiType: string
): void {
  trackEvent(
    EventNames.RESULT_VIEW,
    EventCategories.RESULT,
    { mbti_type: mbtiType },
    sessionId
  );
}

export function trackDepthSelect(depth: string): void {
  trackEvent(
    EventNames.DEPTH_SELECT,
    EventCategories.ENGAGEMENT,
    { depth }
  );
}

export function trackImageGenerate(
  sessionId: string,
  mbtiType: string
): void {
  trackEvent(
    EventNames.IMAGE_GENERATE,
    EventCategories.RESULT,
    { mbti_type: mbtiType },
    sessionId
  );
}

// ============================================================
// Lifecycle Hooks
// ============================================================

export function initializeAnalytics(): void {
  if (typeof window === "undefined") return;
  
  // Create/update user profile on first visit
  const deviceInfo = getDeviceInfo();
  const utmParams = getUTMParams();
  
  createOrUpdateProfile({
    ...deviceInfo,
    ...utmParams,
  });
  
  // Track initial page view
  trackPageView();
  
  // Flush events before page unload
  window.addEventListener("beforeunload", () => {
    flushEventQueue();
  });
  
  // Track page visibility changes (for session duration)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushEventQueue();
    }
  });
}

