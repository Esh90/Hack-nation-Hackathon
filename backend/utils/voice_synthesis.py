"""
ElevenLabs voice synthesis for Shadow Council
(Optional - only if you have ElevenLabs credits)
"""

import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env from backend directory
_backend_dir = Path(__file__).resolve().parent.parent
load_dotenv(_backend_dir / ".env")

# Rachel voice ID (ElevenLabs default voice)
RACHEL_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"

# Pre-generate key responses to save time during demo
PREGENERATED_RESPONSES = {
    "intro": "I'm analyzing your organization's intelligence layer. Let me consult the Shadow Council.",
    "processing": "The Optimist and Skeptic are debating. One moment.",
    "complete": "The Shadow Council has reached consensus. Here's their guidance.",
}


def generate_voice(text: str, voice_id: str = RACHEL_VOICE_ID) -> bytes | None:
    """
    Generate voice audio using ElevenLabs

    Args:
        text: Text to synthesize
        voice_id: ElevenLabs voice ID (default: Rachel)

    Returns:
        Audio bytes (MP3), or None if disabled/error
    """
    api_key = (os.getenv("ELEVENLABS_API_KEY") or "").strip()

    if not api_key:
        print("⚠️  No ElevenLabs API key found. Voice synthesis disabled.")
        return None

    try:
        from elevenlabs import ElevenLabs

        client = ElevenLabs(api_key=api_key)
        audio = client.text_to_speech.convert(
            voice_id=voice_id,
            text=text,
            model_id="eleven_monolingual_v1",
            output_format="mp3_44100_128",
        )

        if isinstance(audio, bytes):
            return audio
        if hasattr(audio, "read"):
            return audio.read()
        # Handle iterator of chunks
        return b"".join(audio) if audio else None

    except ImportError:
        print("⚠️  elevenlabs package not installed. Run: pip install elevenlabs")
        return None
    except Exception as e:
        print(f"❌ Voice synthesis error: {e}")
        return None


def transcribe_audio(audio_bytes: bytes, content_type: str = "audio/webm") -> str | None:
    """
    Transcribe audio to text using ElevenLabs Speech-to-Text (Scribe).

    Args:
        audio_bytes: Raw audio bytes (e.g. webm, mp3, wav).
        content_type: MIME type of the audio (e.g. audio/webm, audio/mpeg).

    Returns:
        Transcribed text, or None if disabled/error.
    """
    api_key = (os.getenv("ELEVENLABS_API_KEY") or "").strip()
    if not api_key:
        print("⚠️  No ElevenLabs API key. Speech-to-text disabled.")
        return None

    import io

    # Pick filename for API (Scribe supports webm, mp3, wav, etc.)
    ext = "webm"
    if "mpeg" in content_type or "mp3" in content_type:
        ext = "mp3"
    elif "wav" in content_type:
        ext = "wav"
    filename = f"audio.{ext}"

    try:
        import httpx

        with httpx.Client(timeout=60.0) as client:
            response = client.post(
                "https://api.elevenlabs.io/v1/speech-to-text",
                headers={"xi-api-key": api_key, "Accept": "application/json"},
                files={"file": (filename, io.BytesIO(audio_bytes), content_type)},
                data={"model_id": "scribe_v2"},
            )
        if response.status_code != 200:
            print(f"❌ Speech-to-text API error: {response.status_code} {response.text[:200]}")
            return None
        data = response.json()
        text = (data.get("text") or "").strip()
        return text or None
    except ImportError:
        print("⚠️  httpx not installed. Run: pip install httpx")
        return None
    except Exception as e:
        print(f"❌ Speech-to-text error: {e}")
        return None


# Sound effects for UI - pleasing, distinct sounds per action (ElevenLabs Sound Effects API)
SOUND_EFFECTS = {
    "click": "Soft UI button click, short and subtle, digital, half second",
    "confirm": "Warm positive confirmation chime, gentle and reassuring, half second",
    "tab": "Light tab switch, soft whoosh, interface transition, half second",
    "soft": "Very soft tap, minimal, subtle UI feedback, quarter second",
}


def generate_sound_effect(text: str, duration_seconds: float = 0.5) -> bytes | None:
    """
    Generate a sound effect using ElevenLabs Text-to-Sound-Effects API.

    Args:
        text: Description of the sound (e.g. "Soft UI button click, short").
        duration_seconds: Length in seconds (0.5–30). Short for clicks.

    Returns:
        MP3 bytes, or None if disabled/error.
    """
    api_key = (os.getenv("ELEVENLABS_API_KEY") or "").strip()
    if not api_key:
        return None
    try:
        import httpx

        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                "https://api.elevenlabs.io/v1/sound-generation",
                headers={
                    "xi-api-key": api_key,
                    "Content-Type": "application/json",
                    "Accept": "audio/mpeg",
                },
                json={
                    "text": text,
                    "duration_seconds": max(0.5, min(30, duration_seconds)),
                    "model_id": "eleven_text_to_sound_v2",
                },
            )
        if response.status_code != 200:
            print(f"❌ Sound effect API error: {response.status_code}")
            return None
        return response.content
    except Exception as e:
        print(f"❌ Sound effect error: {e}")
        return None


def pregenerate_sound_effects() -> None:
    """Pre-generate UI sound effects to data/audio/sfx/ (click, confirm, tab, soft)."""
    sfx_dir = _backend_dir / "data" / "audio" / "sfx"
    sfx_dir.mkdir(parents=True, exist_ok=True)
    for key, text in SOUND_EFFECTS.items():
        print(f"🔊 Generating sound effect: {key}")
        audio = generate_sound_effect(text, duration_seconds=0.6 if key == "confirm" else 0.5)
        if audio:
            (sfx_dir / f"{key}.mp3").write_bytes(audio)
            print(f"   ✅ {key}.mp3")
        else:
            print(f"   ⚠️  Skipped (no API key or error)")


def pregenerate_common_responses() -> None:
    """
    Pre-generate common responses to avoid latency during demo
    """
    audio_dir = _backend_dir / "data" / "audio"
    audio_dir.mkdir(parents=True, exist_ok=True)

    for key, text in PREGENERATED_RESPONSES.items():
        print(f"🎤 Generating audio for: {key}")

        audio = generate_voice(text)

        if audio:
            filename = audio_dir / f"{key}.mp3"
            filename.write_bytes(audio)
            print(f"✅ Generated: {filename}")
        else:
            print(f"⚠️  Skipped: {key} (no API key or error)")


if __name__ == "__main__":
    print("🎙️  Voice Synthesis & Sound Effects Pre-generation")
    print("=" * 60)
    print("This is OPTIONAL - only run if you have ElevenLabs credits")
    print("=" * 60)

    pregenerate_sound_effects()
    pregenerate_common_responses()

    print("\n✨ Pre-generation complete!")
    print("💰 Estimated cost: ~$0.50 for phrases + sound effects")
