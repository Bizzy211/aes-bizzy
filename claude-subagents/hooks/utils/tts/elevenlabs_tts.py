"""
ElevenLabs TTS Client for Hook Utilities

High-quality text-to-speech for hook audio feedback.
"""

import os
import json
from typing import Any
import urllib.request
import urllib.error


class ElevenLabsTTS:
    """ElevenLabs TTS client for hooks."""

    API_URL = "https://api.elevenlabs.io/v1"

    # Popular voice IDs
    VOICES = {
        "rachel": "21m00Tcm4TlvDq8ikWAM",
        "adam": "pNInz6obpgDQGcFmaJgB",
        "sam": "yoZ06aMxZJJ28mfd3POQ",
        "elli": "MF3mGyEYCl7XYWbV9V6O",
        "josh": "TxGEqnHWrfWFTfGW9XjX",
    }

    def __init__(self, api_key: str | None = None, voice: str = "rachel"):
        """
        Initialize the ElevenLabs client.

        Args:
            api_key: ElevenLabs API key (or use ELEVENLABS_API_KEY env var)
            voice: Voice name or ID to use
        """
        self.api_key = api_key or os.environ.get("ELEVENLABS_API_KEY", "")
        self.voice_id = self.VOICES.get(voice.lower(), voice)

    def is_available(self) -> bool:
        """Check if the client is properly configured."""
        return bool(self.api_key)

    def speak(
        self,
        text: str,
        output_path: str | None = None,
        model_id: str = "eleven_monolingual_v1"
    ) -> bytes | None:
        """
        Convert text to speech.

        Args:
            text: Text to convert
            output_path: Optional path to save audio file
            model_id: Model to use for synthesis

        Returns:
            Audio bytes or None on error
        """
        if not self.is_available():
            return None

        payload = {
            "text": text[:5000],
            "model_id": model_id,
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75,
            }
        }

        try:
            data = json.dumps(payload).encode("utf-8")

            req = urllib.request.Request(
                f"{self.API_URL}/text-to-speech/{self.voice_id}",
                data=data,
                headers={
                    "Content-Type": "application/json",
                    "xi-api-key": self.api_key,
                    "Accept": "audio/mpeg",
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

    def list_voices(self) -> list[dict]:
        """List available voices."""
        if not self.is_available():
            return list(self.VOICES.keys())

        try:
            req = urllib.request.Request(
                f"{self.API_URL}/voices",
                headers={"xi-api-key": self.api_key}
            )

            with urllib.request.urlopen(req, timeout=10) as response:
                result = json.loads(response.read().decode("utf-8"))
                return [
                    {"name": v.get("name", ""), "id": v.get("voice_id", "")}
                    for v in result.get("voices", [])
                ]

        except (urllib.error.URLError, json.JSONDecodeError):
            pass

        return []
