"""
OpenAI (GPT) Client for Hook Utilities

Simple wrapper for making OpenAI API calls from hooks.
"""

import os
import json
from typing import Any
import urllib.request
import urllib.error


class OpenAIClient:
    """Simple OpenAI API client for hooks."""

    DEFAULT_MODEL = "gpt-4o-mini"
    API_URL = "https://api.openai.com/v1/chat/completions"

    def __init__(self, api_key: str | None = None, model: str | None = None):
        """
        Initialize the OpenAI client.

        Args:
            api_key: OpenAI API key (or use OPENAI_API_KEY env var)
            model: Model to use (default: gpt-4o-mini for speed/cost)
        """
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY", "")
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
        Get a completion from OpenAI.

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

        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model,
            "max_tokens": max_tokens,
            "messages": messages,
            "temperature": temperature,
        }

        try:
            data = json.dumps(payload).encode("utf-8")

            req = urllib.request.Request(
                self.API_URL,
                data=data,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.api_key}",
                }
            )

            with urllib.request.urlopen(req, timeout=30) as response:
                result = json.loads(response.read().decode("utf-8"))
                choices = result.get("choices", [])
                if choices:
                    return choices[0].get("message", {}).get("content", "")

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

    def embed(self, text: str) -> list[float] | None:
        """
        Get embeddings for text.

        Args:
            text: Text to embed

        Returns:
            Embedding vector or None on error
        """
        if not self.is_available():
            return None

        payload = {
            "model": "text-embedding-3-small",
            "input": text[:8000],
        }

        try:
            data = json.dumps(payload).encode("utf-8")

            req = urllib.request.Request(
                "https://api.openai.com/v1/embeddings",
                data=data,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.api_key}",
                }
            )

            with urllib.request.urlopen(req, timeout=30) as response:
                result = json.loads(response.read().decode("utf-8"))
                data_list = result.get("data", [])
                if data_list:
                    return data_list[0].get("embedding")

        except (urllib.error.URLError, json.JSONDecodeError, KeyError):
            pass

        return None
