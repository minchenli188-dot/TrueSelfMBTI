"use client";

import { useEffect, useCallback, useRef } from "react";
import {
  initializeAnalytics,
  getAnonymousId,
  trackEvent,
  trackPageView,
  trackButtonClick,
  trackSessionStart,
  trackSessionComplete,
  trackMessageSent,
  trackResultView,
  trackDepthSelect,
  trackImageGenerate,
  submitFeedback,
  createOrUpdateProfile,
  flushEventQueue,
  extractUserInsights,
  EventNames,
  EventCategories,
  type UserProfileData,
  type UserFeedback,
} from "@/lib/analytics";

/**
 * Hook for analytics tracking in React components.
 * 
 * Provides methods for:
 * - Page view tracking
 * - Event tracking
 * - Session tracking
 * - Feedback submission
 * - User profile management
 */
export function useAnalytics() {
  const initialized = useRef(false);
  
  // Initialize analytics on mount
  useEffect(() => {
    if (!initialized.current) {
      initializeAnalytics();
      initialized.current = true;
    }
    
    // Cleanup on unmount
    return () => {
      flushEventQueue();
    };
  }, []);
  
  // Get anonymous ID
  const anonymousId = useCallback(() => getAnonymousId(), []);
  
  // Track page view
  const pageView = useCallback((pageName?: string) => {
    trackPageView(pageName);
  }, []);
  
  // Track button click
  const buttonClick = useCallback(
    (buttonName: string, context?: Record<string, unknown>) => {
      trackButtonClick(buttonName, context);
    },
    []
  );
  
  // Track custom event
  const customEvent = useCallback(
    (
      eventName: string,
      eventCategory: string,
      eventData?: Record<string, unknown>,
      sessionId?: string
    ) => {
      trackEvent(eventName, eventCategory, eventData, sessionId);
    },
    []
  );
  
  // Track session start
  const sessionStart = useCallback((sessionId: string, depth: string) => {
    trackSessionStart(sessionId, depth);
  }, []);
  
  // Track session complete
  const sessionComplete = useCallback(
    (sessionId: string, mbtiType: string, totalRounds: number) => {
      trackSessionComplete(sessionId, mbtiType, totalRounds);
    },
    []
  );
  
  // Track message sent
  const messageSent = useCallback((sessionId: string, roundNumber: number) => {
    trackMessageSent(sessionId, roundNumber);
  }, []);
  
  // Track result view
  const resultView = useCallback((sessionId: string, mbtiType: string) => {
    trackResultView(sessionId, mbtiType);
  }, []);
  
  // Track depth selection
  const depthSelect = useCallback((depth: string) => {
    trackDepthSelect(depth);
  }, []);
  
  // Track image generation
  const imageGenerate = useCallback((sessionId: string, mbtiType: string) => {
    trackImageGenerate(sessionId, mbtiType);
  }, []);
  
  // Submit feedback
  const feedback = useCallback(
    async (data: Omit<UserFeedback, "anonymous_id">) => {
      await submitFeedback(data);
    },
    []
  );
  
  // Update user profile
  const updateProfile = useCallback(
    async (data: Partial<UserProfileData>) => {
      await createOrUpdateProfile(data);
    },
    []
  );
  
  // Submit NPS score
  const submitNPS = useCallback(
    async (score: number, sessionId?: string, mbtiResult?: string) => {
      await submitFeedback({
        session_id: sessionId,
        feedback_type: "nps",
        nps_score: score,
        mbti_result: mbtiResult,
      });
    },
    []
  );
  
  // Submit result accuracy rating
  const submitResultRating = useCallback(
    async (rating: number, sessionId?: string, mbtiResult?: string, comment?: string) => {
      await submitFeedback({
        session_id: sessionId,
        feedback_type: "result_rating",
        result_accuracy: rating,
        mbti_result: mbtiResult,
        feedback_text: comment,
      });
    },
    []
  );
  
  // Submit general feedback
  const submitGeneralFeedback = useCallback(
    async (text: string, rating?: number, sessionId?: string) => {
      await submitFeedback({
        session_id: sessionId,
        feedback_type: "general",
        experience_rating: rating,
        feedback_text: text,
      });
    },
    []
  );
  
  // Extract user insights from completed session
  const extractInsights = useCallback(async (sessionId: string) => {
    await extractUserInsights(sessionId);
  }, []);
  
  return {
    // Identifiers
    anonymousId,
    
    // Page tracking
    pageView,
    
    // Event tracking
    buttonClick,
    customEvent,
    
    // Session tracking
    sessionStart,
    sessionComplete,
    messageSent,
    resultView,
    depthSelect,
    imageGenerate,
    
    // Feedback
    feedback,
    submitNPS,
    submitResultRating,
    submitGeneralFeedback,
    
    // Profile
    updateProfile,
    
    // Insights
    extractInsights,
    
    // Constants
    EventNames,
    EventCategories,
  };
}

export default useAnalytics;

