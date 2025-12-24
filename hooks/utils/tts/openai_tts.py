"""
OpenAI TTS Client for Hook Utilities

Text-to-speech using OpenAI's TTS API.
"""

import os
import json
from typing import Any
import urllib.request
import urllib.error


class OpenAITTS:
    """OpenAI TTS client for hooks."""

    API_URL = "https://api.openai.com/v1/audio/speech"

    # Available voices
    VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"]

    def __init__(
        self,
        api_key: str | None = None,
        voice: str = "alloy",
        model: str = "tts-1"
    ):
        """
        Initialize the OpenAI TTS client.

        Args:
            api_key: OpenAI API key (or use OPENAI_API_KEY env var)
            voice: Voice to use (alloy, echo, fable, onyx, nova, shimmer)
            model: Model to use (tts-1 or tts-1-hd)
        """
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY", "")
        self.voice = voice if voice in self.VOICES else "alloy"
        self.model = model

    def is_available(self) -> bool:
        """Check if the client is properly configured."""
        return bool(self.api_key)

    def speak(
        self,
        text: str,
        output_path: str | None = None,
        response_format: str = "mp3"
    ) -> bytes | None:
        """
        Convert text to speech.

        Args:
            text: Text to convert
            output_path: Optional path to save audio file
            response_format: Output format (mp3, opus, aac, flac)

        Returns:
            Audio bytes or None on error
        """
        if not self.is_available():
            return None

        payload = {
            "model": self.model,
            "input": text[:4096],
            "voice": self.voice,
            "response_format": response_format,
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

            with urllib.request.urlopen(req, timeout=60) as response:
                audio_data = response.read()

                if output_path:
                    with open(output_path, "wb") as f:
                        f.write(audio_data)

                return audio_data

        except (urllib.error.URLError, IOError):
            pass

        return None

    def list_voices(self) -> list[str]:
        """List available voices."""
        return self.VOICES.copy()
