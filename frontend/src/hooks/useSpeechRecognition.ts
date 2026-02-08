import { useState, useCallback, useRef, useEffect } from "react";

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

export interface UseSpeechRecognitionResult {
  isListening: boolean;
  startListening: () => void;
  stopListening: () => void;
  supported: boolean;
  error: string | null;
}

export function useSpeechRecognition(onResult: (transcript: string) => void): UseSpeechRecognitionResult {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const Recognition = typeof window !== "undefined" && (window.SpeechRecognition ?? window.webkitSpeechRecognition);
  const supported = Boolean(Recognition);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (!Recognition) {
      setError("Speech recognition not supported in this browser");
      return;
    }
    setError(null);
    try {
      const recognition = new Recognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .map((r) => r[0].transcript)
          .join(" ")
          .trim();
        if (transcript) onResult(transcript);
      };
      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error !== "aborted") setError(event.error);
        setIsListening(false);
        recognitionRef.current = null;
      };
      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start");
    }
  }, [Recognition, onResult]);

  useEffect(() => () => stopListening(), [stopListening]);

  return { isListening, startListening, stopListening, supported, error };
}
