/**
 * API client for MBTI Assistant backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ============================================================
// Types
// ============================================================

export interface StartSessionRequest {
  depth: "shallow" | "standard" | "deep";
  language?: string;
  user_name?: string;
}

export interface StartSessionResponse {
  session_id: string;
  depth: string;
  language: string;
  greeting: string;
  rate_limit: {
    sessions_today: number;
    sessions_limit: number;
    messages_today: number;
    messages_limit: number;
  };
}

export interface SendMessageRequest {
  session_id: string;
  content: string;
}

export interface SendMessageResponse {
  message_id: number;
  reply_text: string;
  is_finished: boolean;
  is_at_max_rounds: boolean;
  current_prediction: string;
  confidence_score: number;
  progress: number;
  current_round: number;
  max_rounds: number;
  cognitive_stack: string[] | null;
  development_level: string | null;
}

export interface FinishSessionRequest {
  session_id: string;
}

export interface FinishSessionResponse {
  session_id: string;
  mbti_type: string;
  type_name: string;
  group: string;
  confidence_score: number;
  analysis_report: string;
  total_rounds: number;
  cognitive_stack: string[] | null;
  development_level: string | null;
}

export interface ImageGenerationResponse {
  status: string;
  message: string;
  image_url: string | null;
}

export interface ChatHistoryResponse {
  session_id: string;
  depth: string;
  current_round: number;
  is_complete: boolean;
  current_prediction: string | null;
  confidence_score: number | null;
  messages: Array<{
    id: number;
    role: string;
    content: string;
    ai_metadata: Record<string, unknown> | null;
    created_at: string;
  }>;
}

export interface SessionStatusResponse {
  session_id: string;
  depth: string;
  language: string;
  is_active: boolean;
  is_complete: boolean;
  current_round: number;
  current_prediction: string | null;
  confidence_score: number | null;
  progress: number | null;
  cognitive_stack: string[] | null;
  development_level: string | null;
  created_at: string;
  updated_at: string;
}

export interface RateLimitResponse {
  client_ip: string;
  usage: {
    sessions_today: number;
    sessions_limit: number;
    messages_today: number;
    messages_limit: number;
  };
  limits: {
    sessions_per_day: number;
    messages_per_day: number;
    messages_per_minute: number;
  };
}

export interface QAMessageRequest {
  session_id: string;
  question: string;
  history?: Array<{ role: string; content: string }>;
}

export interface QAMessageResponse {
  answer: string;
  mbti_type: string;
  type_name: string;
}

export interface UpgradeSessionRequest {
  session_id: string;
}

export interface UpgradeSessionResponse {
  session_id: string;
  new_depth: string;
  remaining_rounds: number;
  message: string;
  ai_question: string; // New: AI-generated question after upgrade
}

export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public detail?: unknown
  ) {
    super(message);
    this.name = "APIError";
  }
}

// ============================================================
// Base Fetch Wrapper
// ============================================================

async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    // Handle rate limit errors specifically
    if (response.status === 429) {
      const error = await response.json();
      throw new APIError(
        error.detail?.message || "Rate limit exceeded",
        429,
        error.detail
      );
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new APIError(
        error.detail || `API Error: ${response.status}`,
        response.status,
        error
      );
    }

    return response.json();
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    // Network or parsing error
    throw new APIError(
      error instanceof Error ? error.message : "Network error",
      0
    );
  }
}

// ============================================================
// API Functions
// ============================================================

export async function startSession(
  data: StartSessionRequest
): Promise<StartSessionResponse> {
  return fetchAPI<StartSessionResponse>("/api/chat/start", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function sendMessage(
  data: SendMessageRequest
): Promise<SendMessageResponse> {
  return fetchAPI<SendMessageResponse>("/api/chat/message", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function generateImage(
  sessionId: string
): Promise<ImageGenerationResponse> {
  return fetchAPI<ImageGenerationResponse>(
    `/api/chat/image?session_id=${sessionId}`,
    {
      method: "POST",
    }
  );
}

export async function getChatHistory(
  sessionId: string
): Promise<ChatHistoryResponse> {
  return fetchAPI<ChatHistoryResponse>(`/api/chat/history/${sessionId}`);
}

export async function getSessionStatus(
  sessionId: string
): Promise<SessionStatusResponse> {
  return fetchAPI<SessionStatusResponse>(`/api/chat/status/${sessionId}`);
}

export async function getRateLimitInfo(): Promise<RateLimitResponse> {
  return fetchAPI<RateLimitResponse>("/rate-limit");
}

export async function healthCheck(): Promise<{ status: string }> {
  return fetchAPI<{ status: string }>("/health");
}

export async function sendQAMessage(
  data: QAMessageRequest
): Promise<QAMessageResponse> {
  return fetchAPI<QAMessageResponse>("/api/chat/qa", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function finishSession(
  data: FinishSessionRequest
): Promise<FinishSessionResponse> {
  return fetchAPI<FinishSessionResponse>("/api/chat/finish", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function upgradeSession(
  data: UpgradeSessionRequest
): Promise<UpgradeSessionResponse> {
  return fetchAPI<UpgradeSessionResponse>("/api/chat/upgrade", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
