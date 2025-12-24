"""
pyttsx3 (Local) TTS Client for Hook Utilities

Offline text-to-speech using system voices.
No API key required - uses local speech synthesis.
"""

import os
import subprocess
from typing import Any


class LocalTTS:
    """Local TTS client using pyttsx3 or system commands."""

    def __init__(self, voice: str | None = None, rate: int = 150):
        """
        Initialize the local TTS client.

        Args:
            voice: Voice ID (platform-specific)
            rate: Speech rate (words per minute)
        """
        self.voice = voice
        self.rate = rate
        self._engine = None

    def _init_engine(self):
        """Initialize pyttsx3 engine (lazy loading)."""
        if self._engine is None:
            try:
                import pyttsx3
                self._engine = pyttsx3.init()
                self._engine.setProperty("rate", self.rate)
                if self.voice:
                    self._engine.setProperty("voice", self.voice)
            except ImportError:
                self._engine = False  # Mark as unavailable

    def is_available(self) -> bool:
        """Check if local TTS is available."""
        try:
            import pyttsx3
            return True
        except ImportError:
            # Check for system TTS commands
            if os.name == "nt":  # Windows
                return True  # SAPI available
            elif os.name == "posix":
                # Check for say (macOS) or espeak (Linux)
                for cmd in ["say", "espeak"]:
                    try:
                        subprocess.run(
                            [cmd, "--version"],
                            capture_output=True,
                            timeout=2
                        )
                        return True
                    except (FileNotFoundError, subprocess.TimeoutExpired):
                        pass
        return False

    def speak(
        self,
        text: str,
        output_path: str | None = None,
        blocking: bool = True
    ) -> bool:
        """
        Convert text to speech.

        Args:
            text: Text to speak
            output_path: Optional path to save audio file (may not be supported)
            blocking: Whether to wait for speech to complete

        Returns:
            True if successful, False otherwise
        """
        # Try pyttsx3 first
        try:
            self._init_engine()
            if self._engine:
                if output_path:
                    self._engine.save_to_file(text, output_path)
                    self._engine.runAndWait()
                elif blocking:
                    self._engine.say(text)
                    self._engine.runAndWait()
                else:
                    self._engine.say(text)
                    self._engine.startLoop(False)
                return True
        except Exception:
            pass

        # Fall back to system commands
        return self._speak_system(text, blocking)

    def _speak_system(self, text: str, blocking: bool = True) -> bool:
        """Use system TTS commands."""
        # Sanitize text for shell
        safe_text = text.replace('"', "'").replace("\\", "")[:1000]

        if os.name == "nt":  # Windows
            # Use PowerShell SAPI
            cmd = f'powershell -Command "Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak(\'{safe_text}\')"'
        elif os.name == "posix":
            # Try macOS say first
            if subprocess.run(["which", "say"], capture_output=True).returncode == 0:
                cmd = f'say "{safe_text}"'
            # Then try espeak
            elif subprocess.run(["which", "espeak"], capture_output=True).returncode == 0:
                cmd = f'espeak "{safe_text}"'
            else:
                return False
        else:
            return False

        try:
            if blocking:
                subprocess.run(cmd, shell=True, timeout=60)
            else:
                subprocess.Popen(cmd, shell=True)
            return True
        except (subprocess.TimeoutExpired, FileNotFoundError):
            return False

    def list_voices(self) -> list[dict]:
        """List available voices."""
        voices = []

        try:
            self._init_engine()
            if self._engine:
                for voice in self._engine.getProperty("voices"):
                    voices.append({
                        "id": voice.id,
                        "name": voice.name,
                        "languages": voice.languages,
                    })
        except Exception:
            pass

        return voices
