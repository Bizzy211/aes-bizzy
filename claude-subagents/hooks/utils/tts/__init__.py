"""
Text-to-Speech (TTS) Integration Utilities

Providers:
- ElevenLabs (High-quality voices)
- OpenAI (TTS API)
- pyttsx3 (Local/offline)
"""

from .elevenlabs_tts import ElevenLabsTTS
from .openai_tts import OpenAITTS
from .pyttsx3_tts import LocalTTS

__all__ = ["ElevenLabsTTS", "OpenAITTS", "LocalTTS"]
