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
    print("🎙️  Voice Synthesis Pre-generation")
    print("=" * 60)
    print("This is OPTIONAL - only run if you have ElevenLabs credits")
    print("=" * 60)

    pregenerate_common_responses()

    print("\n✨ Pre-generation complete!")
    print("💰 Estimated cost: ~$0.50 for all phrases")
