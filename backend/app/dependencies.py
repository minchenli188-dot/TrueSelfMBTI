"""
FastAPI dependencies for MBTI Assistant.
Includes rate limiting, authentication, and common request processing.
"""
import logging
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from pydantic import BaseModel

logger = logging.getLogger(__name__)


# ============================================================
# Rate Limiter Configuration
# ============================================================

class RateLimitConfig(BaseModel):
    """Configuration for rate limiting (testing mode - no limits)."""
    # Session creation limits
    max_sessions_per_day: int = 999999
    
    # Message sending limits
    max_messages_per_day: int = 999999
    max_messages_per_minute: int = 999999
    
    # Window durations
    day_window_hours: int = 24
    minute_window_seconds: int = 60


RATE_LIMIT_CONFIG = RateLimitConfig()


# ============================================================
# In-Memory Rate Limiter
# ============================================================

class InMemoryRateLimiter:
    """
    Simple in-memory rate limiter for MVP.
    
    In production, this should be replaced with Redis-based implementation
    for distributed rate limiting across multiple server instances.
    """
    
    def __init__(self):
        # Structure: {ip: [(timestamp, count_type), ...]}
        self._session_counts: dict[str, list[datetime]] = defaultdict(list)
        self._message_counts: dict[str, list[datetime]] = defaultdict(list)
        self._last_cleanup = datetime.utcnow()
        self._cleanup_interval = timedelta(hours=1)
    
    def _cleanup_old_entries(self) -> None:
        """Remove expired entries to prevent memory leaks."""
        now = datetime.utcnow()
        
        # Only run cleanup periodically
        if now - self._last_cleanup < self._cleanup_interval:
            return
        
        cutoff_day = now - timedelta(hours=RATE_LIMIT_CONFIG.day_window_hours)
        
        # Clean session counts
        for ip in list(self._session_counts.keys()):
            self._session_counts[ip] = [
                ts for ts in self._session_counts[ip] if ts > cutoff_day
            ]
            if not self._session_counts[ip]:
                del self._session_counts[ip]
        
        # Clean message counts
        for ip in list(self._message_counts.keys()):
            self._message_counts[ip] = [
                ts for ts in self._message_counts[ip] if ts > cutoff_day
            ]
            if not self._message_counts[ip]:
                del self._message_counts[ip]
        
        self._last_cleanup = now
        logger.debug("Rate limiter cleanup completed")
    
    def _get_recent_count(
        self,
        timestamps: list[datetime],
        window: timedelta,
    ) -> int:
        """Count entries within the given time window."""
        cutoff = datetime.utcnow() - window
        return sum(1 for ts in timestamps if ts > cutoff)
    
    def check_session_limit(self, ip: str) -> tuple[bool, Optional[str]]:
        """
        Check if IP can create a new session.
        
        Returns:
            (is_allowed, error_message)
        """
        self._cleanup_old_entries()
        
        day_window = timedelta(hours=RATE_LIMIT_CONFIG.day_window_hours)
        current_count = self._get_recent_count(self._session_counts[ip], day_window)
        
        if current_count >= RATE_LIMIT_CONFIG.max_sessions_per_day:
            remaining_time = self._get_reset_time(self._session_counts[ip], day_window)
            return False, f"Session limit exceeded. Try again in {remaining_time}"
        
        return True, None
    
    def check_message_limit(self, ip: str) -> tuple[bool, Optional[str]]:
        """
        Check if IP can send a new message.
        
        Returns:
            (is_allowed, error_message)
        """
        self._cleanup_old_entries()
        
        # Check daily limit
        day_window = timedelta(hours=RATE_LIMIT_CONFIG.day_window_hours)
        day_count = self._get_recent_count(self._message_counts[ip], day_window)
        
        if day_count >= RATE_LIMIT_CONFIG.max_messages_per_day:
            remaining_time = self._get_reset_time(self._message_counts[ip], day_window)
            return False, f"Daily message limit exceeded. Try again in {remaining_time}"
        
        # Check per-minute limit (burst protection)
        minute_window = timedelta(seconds=RATE_LIMIT_CONFIG.minute_window_seconds)
        minute_count = self._get_recent_count(self._message_counts[ip], minute_window)
        
        if minute_count >= RATE_LIMIT_CONFIG.max_messages_per_minute:
            return False, "Too many messages. Please wait a moment."
        
        return True, None
    
    def record_session_created(self, ip: str) -> None:
        """Record a session creation."""
        self._session_counts[ip].append(datetime.utcnow())
    
    def record_message_sent(self, ip: str) -> None:
        """Record a message sent."""
        self._message_counts[ip].append(datetime.utcnow())
    
    def _get_reset_time(
        self,
        timestamps: list[datetime],
        window: timedelta,
    ) -> str:
        """Calculate human-readable time until limit resets."""
        if not timestamps:
            return "0 minutes"
        
        oldest_in_window = min(
            ts for ts in timestamps
            if ts > datetime.utcnow() - window
        )
        reset_time = oldest_in_window + window
        remaining = reset_time - datetime.utcnow()
        
        hours = int(remaining.total_seconds() // 3600)
        minutes = int((remaining.total_seconds() % 3600) // 60)
        
        if hours > 0:
            return f"{hours}h {minutes}m"
        return f"{minutes} minutes"
    
    def get_usage_stats(self, ip: str) -> dict:
        """Get current usage statistics for an IP."""
        day_window = timedelta(hours=RATE_LIMIT_CONFIG.day_window_hours)
        
        return {
            "sessions_today": self._get_recent_count(self._session_counts[ip], day_window),
            "sessions_limit": RATE_LIMIT_CONFIG.max_sessions_per_day,
            "messages_today": self._get_recent_count(self._message_counts[ip], day_window),
            "messages_limit": RATE_LIMIT_CONFIG.max_messages_per_day,
        }


# Singleton rate limiter instance
rate_limiter = InMemoryRateLimiter()


# ============================================================
# FastAPI Dependencies
# ============================================================

def get_client_ip(request: Request) -> str:
    """
    Extract the real client IP from the request.
    Handles common proxy headers.
    """
    # Check for forwarded headers (when behind proxy/load balancer)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # Take the first IP in the chain (original client)
        return forwarded_for.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    
    # Fall back to direct connection IP
    if request.client:
        return request.client.host
    
    return "unknown"


async def verify_session_rate_limit(request: Request) -> str:
    """
    Dependency to verify session creation rate limit.
    
    Raises:
        HTTPException: 429 if rate limit exceeded
        
    Returns:
        Client IP address
    """
    client_ip = get_client_ip(request)
    
    is_allowed, error_message = rate_limiter.check_session_limit(client_ip)
    
    if not is_allowed:
        logger.warning(
            "Session rate limit exceeded for IP: %s",
            client_ip
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "rate_limit_exceeded",
                "message": error_message,
                "type": "session_limit",
            }
        )
    
    return client_ip


async def verify_message_rate_limit(request: Request) -> str:
    """
    Dependency to verify message sending rate limit.
    
    Raises:
        HTTPException: 429 if rate limit exceeded
        
    Returns:
        Client IP address
    """
    client_ip = get_client_ip(request)
    
    is_allowed, error_message = rate_limiter.check_message_limit(client_ip)
    
    if not is_allowed:
        logger.warning(
            "Message rate limit exceeded for IP: %s",
            client_ip
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "rate_limit_exceeded",
                "message": error_message,
                "type": "message_limit",
            }
        )
    
    return client_ip


async def get_rate_limit_stats(request: Request) -> dict:
    """Get current rate limit usage for the client."""
    client_ip = get_client_ip(request)
    return rate_limiter.get_usage_stats(client_ip)


