"""
Ollama (Local LLM) Client for Hook Utilities

Simple wrapper for making Ollama API calls from hooks.
Useful for offline operation or privacy-sensitive tasks.
"""

import os
import json
from typing import Any
import urllib.request
import urllib.error


class OllamaClient:
    """Simple Ollama API client for hooks."""

    DEFAULT_MODEL = "llama3.2"
    DEFAULT_URL = "http://localhost:11434"

    def __init__(
        self,
        model: str | None = None,
        base_url: str | None = None
    ):
        """
        Initialize the Ollama client.

        Args:
            model: Model to use (default: llama3.2)
            base_url: Ollama server URL (default: http://localhost:11434)
        """
        self.model = model or os.environ.get("OLLAMA_MODEL", self.DEFAULT_MODEL)
        self.base_url = base_url or os.environ.get("OLLAMA_URL", self.DEFAULT_URL)

    def is_available(self) -> bool:
        """Check if Ollama is running and accessible."""
        try:
            req = urllib.request.Request(f"{self.base_url}/api/tags")
            with urllib.request.urlopen(req, timeout=2) as response:
                return response.status == 200
        except (urllib.error.URLError, TimeoutError):
            return False

    def complete(
        self,
        prompt: str,
        system: str = "",
        max_tokens: int = 1024,
        temperature: float = 0.0
    ) -> str | None:
        """
        Get a completion from Ollama.

        Args:
            prompt: User message
            system: System prompt
            max_tokens: Maximum tokens to generate (num_predict)
            temperature: Sampling temperature

        Returns:
            Generated text or None on error
        """
        if not self.is_available():
            return None

        full_prompt = prompt
        if system:
            full_prompt = f"{system}\n\n{prompt}"

        payload = {
            "model": self.model,
            "prompt": full_prompt,
            "stream": False,
            "options": {
                "num_predict": max_tokens,
                "temperature": temperature,
            }
        }

        try:
            data = json.dumps(payload).encode("utf-8")

            req = urllib.request.Request(
                f"{self.base_url}/api/generate",
                data=data,
                headers={"Content-Type": "application/json"}
            )

            with urllib.request.urlopen(req, timeout=60) as response:
                result = json.loads(response.read().decode("utf-8"))
                return result.get("response", "")

        except (urllib.error.URLError, json.JSONDecodeError, KeyError):
            pass

        return None

    def chat(
        self,
        messages: list[dict],
        max_tokens: int = 1024,
        temperature: float = 0.0
    ) -> str | None:
        """
        Chat completion with message history.

        Args:
            messages: List of {"role": "user/assistant", "content": "..."}
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature

        Returns:
            Generated response or None on error
        """
        if not self.is_available():
            return None

        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "options": {
                "num_predict": max_tokens,
                "temperature": temperature,
            }
        }

        try:
            data = json.dumps(payload).encode("utf-8")

            req = urllib.request.Request(
                f"{self.base_url}/api/chat",
                data=data,
                headers={"Content-Type": "application/json"}
            )

            with urllib.request.urlopen(req, timeout=60) as response:
                result = json.loads(response.read().decode("utf-8"))
                return result.get("message", {}).get("content", "")

        except (urllib.error.URLError, json.JSONDecodeError, KeyError):
            pass

        return None

    def list_models(self) -> list[str]:
        """List available models."""
        try:
            req = urllib.request.Request(f"{self.base_url}/api/tags")
            with urllib.request.urlopen(req, timeout=5) as response:
                result = json.loads(response.read().decode("utf-8"))
                models = result.get("models", [])
                return [m.get("name", "") for m in models]
        except (urllib.error.URLError, json.JSONDecodeError):
            return []
