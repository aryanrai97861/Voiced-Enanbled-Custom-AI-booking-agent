/**
 * Web Speech API Hook
 * 
 * Custom React hook that provides speech recognition (STT) and synthesis (TTS) capabilities
 * using the browser's Web Speech API. Includes automatic retry logic for network errors
 * and graceful error handling.
 * 
 * Features:
 * - Speech-to-text (recognition)
 * - Text-to-speech (synthesis)
 * - Automatic retry on network errors (up to 3 attempts)
 * - Real-time transcript updates
 * - Error state management
 */

import { useState, useCallback, useRef, useEffect } from "react";

// TypeScript interfaces for Web Speech API (not included in standard types)

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

export type SpeechStatus = "idle" | "listening" | "processing" | "speaking" | "error";

interface UseSpeechOptions {
  onResult?: (transcript: string) => void;
  onTranscript?: (transcript: string) => void; // Alias for onResult
  onError?: (error: string) => void;
  continuous?: boolean;
  language?: string;
}

interface UseSpeechReturn {
  status: SpeechStatus;
  isListening: boolean;
  isSpeaking: boolean;
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string) => Promise<void>;
  cancelSpeech: () => void;
  transcript: string;
  error: string | null;
  isSupported: boolean;
}

/**
 * React hook for speech recognition and synthesis
 * 
 * @param options - Configuration options
 * @param options.onResult - Callback when final transcript is available
 * @param options.onTranscript - Alias for onResult
 * @param options.onError - Callback when an error occurs
 * @param options.continuous - Whether to continuously listen (default: false)
 * @param options.language - Recognition language (default: "en-US")
 * 
 * @returns Object with speech control functions and state
 * 
 * @example
 * const { startListening, speak, transcript, error } = useSpeech({
 *   onResult: (text) => console.log('User said:', text),
 *   onError: (err) => console.error('Speech error:', err)
 * });
 */
export function useSpeech(options: UseSpeechOptions = {}): UseSpeechReturn {
  const { 
    onResult, 
    onTranscript, 
    onError, 
    continuous = false, 
    language = "en-US" 
  } = options;

  // Use onResult or onTranscript (they're the same)
  const handleResult = onResult || onTranscript;

  const [status, setStatus] = useState<SpeechStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) &&
    "speechSynthesis" in window;

  useEffect(() => {
    if (!isSupported) {
      console.warn('Speech Recognition API not supported in this browser');
      setError('Speech recognition not supported');
      return;
    }

    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        throw new Error('SpeechRecognition constructor not found');
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = continuous;
      recognition.interimResults = true;
      recognition.lang = language;

      recognition.onstart = () => {
        console.log('🎤 Speech recognition started');
        setStatus("listening");
        setError(null);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = "";
        let interimTranscript = "";

        // Extract transcripts from the event results
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        const currentTranscript = finalTranscript || interimTranscript;
        setTranscript(currentTranscript);

        if (finalTranscript && handleResult) {
          console.log('✅ Final transcript:', finalTranscript);
          handleResult(finalTranscript);
          // Auto-stop after getting final transcript
          if (!continuous) {
            recognition.stop();
          }
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('❌ Speech recognition error:', event.error);
        const errorMessage = getErrorMessage(event.error);
        
        // Auto-retry on network errors (up to maxRetries)
        if (event.error === 'network' && retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          console.log(`🔄 Retrying... (${retryCountRef.current}/${maxRetries})`);
          
          setTimeout(() => {
            try {
              recognition.start();
            } catch (e) {
              console.warn('Retry failed:', e);
              // If retry fails, set error state
              setError(errorMessage);
              setStatus("error");
              if (onError) {
                onError(errorMessage);
              }
            }
          }, 1000);
          return;
        }
        
        // After retries exhausted or on other errors, set error state
        console.log('❌ Setting error state after retries exhausted');
        retryCountRef.current = 0; // Reset for next attempt
        setError(errorMessage);
        setStatus("error");
        if (onError) {
          onError(errorMessage);
        }
      };

      recognition.onend = () => {
        console.log('🛑 Speech recognition ended');
        if (status === "listening") {
          setStatus("idle");
        }
      };

      recognitionRef.current = recognition;
      synthRef.current = window.speechSynthesis;

      console.log('✅ Speech recognition initialized successfully');

      return () => {
        try {
          recognition.abort();
          window.speechSynthesis.cancel();
        } catch (e) {
          console.warn('Cleanup error:', e);
        }
      };
    } catch (err) {
      console.error('Failed to initialize speech recognition:', err);
      setError('Failed to initialize speech recognition');
      if (onError) {
        onError('Failed to initialize speech recognition');
      }
    }
  }, [isSupported, continuous, language, handleResult, onError]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      console.error('Recognition not initialized');
      return;
    }

    setTranscript("");
    setError(null);
    retryCountRef.current = 0; // Reset retry count

    try {
      recognitionRef.current.start();
      console.log('🎤 Starting speech recognition...');
    } catch (err) {
      if ((err as Error).message.includes("already started")) {
        console.log('⚠️ Recognition already started, stopping first...');
        recognitionRef.current.stop();
        setTimeout(() => {
          recognitionRef.current?.start();
        }, 100);
      } else {
        console.error('Failed to start recognition:', err);
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setStatus("idle");
  }, []);

  const speak = useCallback((text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!synthRef.current) {
        reject(new Error("Speech synthesis not supported"));
        return;
      }

      synthRef.current.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.rate = 1;
      utterance.pitch = 1;

      utterance.onstart = () => {
        setStatus("speaking");
      };

      utterance.onend = () => {
        setStatus("idle");
        resolve();
      };

      utterance.onerror = (event) => {
        setStatus("error");
        reject(new Error(event.error));
      };

      synthRef.current.speak(utterance);
    });
  }, [language]);

  const cancelSpeech = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setStatus("idle");
    }
  }, []);

  return {
    status,
    isListening: status === "listening",
    isSpeaking: status === "speaking",
    startListening,
    stopListening,
    speak,
    cancelSpeech,
    transcript,
    error,
    isSupported,
  };
}

function getErrorMessage(error: string): string {
  switch (error) {
    case "no-speech":
      return "No speech detected. Please try speaking again.";
    case "audio-capture":
      return "Microphone not found. Please check your microphone connection.";
    case "not-allowed":
      return "Microphone access denied. Please allow microphone permissions in your browser.";
    case "network":
      return "Network error connecting to speech service. Retrying...";
    case "aborted":
      return "Speech recognition was stopped.";
    case "language-not-supported":
      return "Language not supported by your browser.";
    case "service-not-allowed":
      return "Speech recognition service not allowed.";
    default:
      return `Speech error: ${error}. Please try again.`;
  }
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor;
    webkitSpeechRecognition: SpeechRecognitionConstructor;
  }
}
