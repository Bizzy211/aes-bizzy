"""
Anthropic (Claude) Client for Hook Utilities

Simple wrapper for making Claude API calls from hooks.
Used for intelligent hook decisions and content analysis.
"""

import os
import json
from typing import Any
import urllib.request
import urllib.error


class AnthropicClient:
    """Simple Anthropic API client for hooks."""

    DEFAULT_MODEL = "claude-3-haiku-20240307"
    API_URL = "https://api.anthropic.com/v1/messages"

    def __init__(self, api_key: str | None = None, model: str | None = None):
        """
        Initialize the Anthropic client.

        Args:
            api_key: Anthropic API key (or use ANTHROPIC_API_KEY env var)
            model: Model to use (default: claude-3-haiku for speed/cost)
        """
        self.api_key = api_key or os.environ.get("ANTHROPIC_API_KEY", "")
        self.model = model or self.DEFAULT_MODEL

    def is_available(self) -> bool:
        """Check if the client is properly configured."""
        return bool(self.api_key)

    def complete(
        self,
        prompt: str,
        system: str = "",
        max_tokens: int = 1024,
        temperature: float = 0.0
    ) -> str | None:
        """
        Get a completion from Claude.

        Args:
            prompt: User message
            system: System prompt
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature

        Returns:
            Generated text or None on error
        """
        if not self.is_available():
            return None

        messages = [{"role": "user", "content": prompt}]

        payload = {
            "model": self.model,
            "max_tokens": max_tokens,
            "messages": messages,
            "temperature": temperature,
        }

        if system:
            payload["system"] = system

        try:
            data = json.dumps(payload).encode("utf-8")

            req = urllib.request.Request(
                self.API_URL,
                data=data,
                headers={
                    "Content-Type": "application/json",
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                }
            )

            with urllib.request.urlopen(req, timeout=30) as response:
                result = json.loads(response.read().decode("utf-8"))
                if "content" in result and result["content"]:
                    return result["content"][0].get("text", "")

        except (urllib.error.URLError, json.JSONDecodeError, KeyError):
            pass

        return None

    def analyze_code(self, code: str, question: str) -> str | None:
        """
        Analyze code with a specific question.

        Args:
            code: Code to analyze
            question: Question about the code

        Returns:
            Analysis result
        """
        system = "You are a code analysis assistant. Be concise and direct."
        prompt = f"Code:\n```\n{code[:4000]}\n```\n\nQuestion: {question}"

        return self.complete(prompt, system=system, max_tokens=500)

    def should_block(self, content: str, reason: str) -> bool:
        """
        Ask Claude if content should be blocked.

        Args:
            content: Content to evaluate
            reason: Reason for potential blocking

        Returns:
            True if should block, False otherwise
        """
        system = "You are a security filter. Answer only YES or NO."
        prompt = f"Should this content be blocked? Reason: {reason}\n\nContent:\n{content[:2000]}"

        result = self.complete(prompt, system=system, max_tokens=10)
        if result:
            return "YES" in result.upper()
        return False  # Default to allow if uncertain
