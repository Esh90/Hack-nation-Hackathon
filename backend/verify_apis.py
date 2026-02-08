"""
Verify LLM and ElevenLabs API keys are set and working.
Run from backend dir: python verify_apis.py
(Start the API server first: python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000)
"""

import json
import os
import sys
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

# Load .env from backend directory
BACKEND_DIR = Path(__file__).resolve().parent
env_path = BACKEND_DIR / ".env"
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                key, value = key.strip(), value.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = value

GROQ_KEY = (os.getenv("GROQ_API_KEY") or "").strip()
OPENAI_KEY = (os.getenv("OPENAI_API_KEY") or "").strip()
GEMINI_KEY = (os.getenv("GEMINI_API_KEY") or "").strip()
ELEVENLABS_KEY = (os.getenv("ELEVENLABS_API_KEY") or "").strip()
BASE_URL = os.getenv("API_BASE", "http://localhost:8000")


def mask_key(key: str, prefix: int = 6, suffix: int = 4) -> str:
    if len(key) <= prefix + suffix:
        return "***"
    return key[:prefix] + "..." + key[-suffix:]


def check_openai_via_api() -> tuple[bool, str]:
    """POST to council/query; if 200 and has final_answer, OpenAI (or fallback) is working."""
    try:
        req = Request(
            f"{BASE_URL}/api/council/query",
            data=json.dumps({"question": "Reply with exactly: OK"}).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode())
            if resp.status == 200 and data.get("final_answer"):
                return True, "Council query succeeded (API credits in use)."
            return False, "Unexpected response (no final_answer)."
    except HTTPError as e:
        body = e.read().decode() if e.fp else ""
        return False, f"HTTP {e.code}: {body[:200]}"
    except URLError as e:
        return False, f"Connection error: {e.reason}. Is the backend running on {BASE_URL}?"
    except Exception as e:
        return False, str(e)


def check_elevenlabs_via_api() -> tuple[bool, str]:
    """POST to audio/synthesize; if 200 and audio returned, ElevenLabs is working."""
    try:
        req = Request(
            f"{BASE_URL}/api/audio/synthesize",
            data=json.dumps({"text": "Test"}).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urlopen(req, timeout=15) as resp:
            if resp.status == 200:
                ct = resp.headers.get("Content-Type", "")
                if "audio" in ct or len(resp.read()) > 100:
                    return True, "Voice synthesis succeeded (ElevenLabs credits in use)."
            return False, "Unexpected response."
    except HTTPError as e:
        body = e.read().decode() if e.fp else ""
        if e.code == 503:
            return False, "Voice synthesis unavailable (check ELEVENLABS_API_KEY)."
        return False, f"HTTP {e.code}: {body[:200]}"
    except URLError as e:
        return False, f"Connection error: {e.reason}. Is the backend running on {BASE_URL}?"
    except Exception as e:
        return False, str(e)


def main():
    print("=" * 60)
    print("API key & usage verification")
    print("=" * 60)

    # 1. Key presence (masked – never print full keys)
    print("\n1. API keys in .env")
    if GROQ_KEY and GROQ_KEY.startswith("gsk_"):
        print(f"   Groq (default): set ({mask_key(GROQ_KEY, 4, 4)})")
    else:
        print("   Groq (default): not set or invalid (should start with gsk_)")
    if GEMINI_KEY and GEMINI_KEY.startswith("AIza"):
        print(f"   Gemini: set ({mask_key(GEMINI_KEY, 4, 4)})")
    else:
        print("   Gemini: not set or invalid")
    if OPENAI_KEY and (OPENAI_KEY.startswith("sk-") or OPENAI_KEY.startswith("sk-proj-")):
        print(f"   OpenAI: set ({mask_key(OPENAI_KEY)})")
    else:
        print("   OpenAI: not set or invalid")
    if ELEVENLABS_KEY:
        print(f"   ElevenLabs: set ({mask_key(ELEVENLABS_KEY, 4, 4)})")
    else:
        print("   ElevenLabs: not set")

    # 2. Backend reachable
    print("\n2. Backend server")
    try:
        with urlopen(f"{BASE_URL}/", timeout=5) as resp:
            print(f"   Reachable at {BASE_URL}")
    except Exception as e:
        print(f"   Not reachable: {e}")
        print("   Start it with: python -m uvicorn api.main:app --host 0.0.0.0 --port 8000")
        sys.exit(1)

    # 3. OpenAI (Shadow Council)
    print("\n3. OpenAI (Shadow Council)")
    ok, msg = check_openai_via_api()
    if ok:
        print(f"   OK — {msg}")
    else:
        print(f"   Failed — {msg}")

    # 4. ElevenLabs (voice)
    print("\n4. ElevenLabs (voice synthesis)")
    ok, msg = check_elevenlabs_via_api()
    if ok:
        print(f"   OK — {msg}")
    else:
        print(f"   Failed — {msg}")

    print("\n" + "=" * 60)


if __name__ == "__main__":
    main()
