/**
 * Voice Agent Component
 * 
 * Main component for the voice-enabled restaurant booking interface.
 * Handles the complete booking flow from greeting to confirmation.
 * 
 * Features:
 * - Voice input/output using Web Speech API
 * - Text input fallback for accessibility
 * - Real-time conversation display
 * - Weather-based seating recommendations
 * - Booking confirmation
 * 
 * Flow:
 * 1. Initialize with greeting from AI
 * 2. Collect booking details through conversation
 * 3. Fetch weather and suggest seating
 * 4. Confirm and create booking
 * 5. Display booking confirmation
 */

import { useState, useCallback, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useSpeech } from "@/hooks/use-speech";
import { useToast } from "@/hooks/use-toast";
import { MicrophoneButton } from "@/components/microphone-button";
import { ConversationDisplay } from "@/components/conversation-display";
import { BookingSummary } from "@/components/booking-summary";
import { BookingConfirmation } from "@/components/booking-confirmation";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Utensils, Volume2, VolumeX, RefreshCw, AlertCircle, Send } from "lucide-react";
import type {
  ConversationMessage,
  BookingContext,
  Booking,
  ChatResponse,
} from "@shared/schema";

const initialContext: BookingContext = {
  step: "greeting",
};

export default function VoiceAgent() {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [context, setContext] = useState<BookingContext>(initialContext);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [textInput, setTextInput] = useState("");

  const { toast } = useToast();

  const handleSpeechResult = useCallback(
    (transcript: string) => {
      if (transcript.trim()) {
        sendMessage(transcript.trim());
      }
    },
    []
  );

  const handleSpeechError = useCallback(
    (error: string) => {
      toast({
        title: "Speech Error",
        description: error,
        variant: "destructive",
      });
    },
    [toast]
  );

  const {
    status,
    isListening,
    isSpeaking,
    startListening,
    stopListening,
    speak,
    transcript,
    isSupported,
    error,
  } = useSpeech({
    onResult: handleSpeechResult,
    onError: handleSpeechError,
  });

  // Debug: log error state
  useEffect(() => {
    console.log('Error state:', error);
  }, [error]);

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("POST", "/api/chat", {
        message,
        context,
      });
      return response.json() as Promise<ChatResponse>;
    },
    onSuccess: async (data) => {
      const assistantMessage: ConversationMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setContext(data.context);

      if (data.bookingComplete && data.booking) {
        setConfirmedBooking(data.booking);
      }

      if (voiceEnabled) {
        try {
          await speak(data.response);
        } catch {
          console.log("Speech synthesis failed, continuing silently");
        }
      }
      setIsProcessing(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process your request",
        variant: "destructive",
      });
      setIsProcessing(false);
    },
  });

  const sendMessage = useCallback(
    (message: string) => {
      const userMessage: ConversationMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: message,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsProcessing(true);
      chatMutation.mutate(message);
    },
    [chatMutation]
  );

  useEffect(() => {
    const initializeGreeting = async () => {
      setIsProcessing(true);
      try {
        const response = await apiRequest("POST", "/api/chat", {
          message: "hello",
          context: initialContext,
        });
        const data = (await response.json()) as ChatResponse;

        const assistantMessage: ConversationMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.response,
          timestamp: new Date().toISOString(),
        };
        setMessages([assistantMessage]);
        setContext(data.context);

        if (voiceEnabled) {
          // Add a small delay to ensure speech synthesis is ready
          setTimeout(async () => {
            try {
              await speak(data.response);
            } catch (err) {
              console.log("Initial speech failed:", err);
            }
          }, 500);
        }
      } catch (error) {
        console.error("Failed to initialize greeting:", error);
      } finally {
        setIsProcessing(false);
      }
    };

    if (messages.length === 0 && !confirmedBooking) {
      initializeGreeting();
    }
  }, []);

  const handleNewBooking = () => {
    setMessages([]);
    setContext(initialContext);
    setConfirmedBooking(null);
    
    const initializeNewBooking = async () => {
      setIsProcessing(true);
      try {
        const response = await apiRequest("POST", "/api/chat", {
          message: "hello",
          context: initialContext,
        });
        const data = (await response.json()) as ChatResponse;

        const assistantMessage: ConversationMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.response,
          timestamp: new Date().toISOString(),
        };
        setMessages([assistantMessage]);
        setContext(data.context);

        if (voiceEnabled) {
          try {
            await speak(data.response);
          } catch {
            console.log("Speech failed");
          }
        }
      } catch (error) {
        console.error("Failed to initialize new booking:", error);
      } finally {
        setIsProcessing(false);
      }
    };

    initializeNewBooking();
  };

  const handleStartListening = () => {
    if (isSpeaking) return;
    startListening();
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim() && !isProcessing) {
      sendMessage(textInput.trim());
      setTextInput("");
    }
  };

  if (!isSupported) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold">Browser Not Supported</h2>
          <p className="text-muted-foreground">
            Your browser doesn't support the Web Speech API. Please use a modern browser like Chrome, Edge, or Safari.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
              <Utensils className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-semibold text-lg leading-tight">
                Restaurant Booking
              </h1>
              <p className="text-xs text-muted-foreground">Voice Assistant</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant={voiceEnabled ? "default" : "outline"}
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              data-testid="button-toggle-voice"
            >
              {voiceEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {confirmedBooking ? (
          <BookingConfirmation
            booking={confirmedBooking}
            onNewBooking={handleNewBooking}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-6">
            <div className="space-y-6">
              <ConversationDisplay
                messages={messages}
                isLoading={isProcessing || chatMutation.isPending}
                currentTranscript={isListening ? transcript : ""}
              />

              <div className="flex flex-col items-center gap-4 py-4">
                <MicrophoneButton
                  status={isProcessing ? "processing" : status}
                  isListening={isListening}
                  isSpeaking={isSpeaking}
                  onStart={handleStartListening}
                  onStop={stopListening}
                  disabled={isProcessing || chatMutation.isPending}
                />

                {/* Text input fallback when speech fails */}
                {error && (
                  <form onSubmit={handleTextSubmit} className="w-full max-w-md">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder="Type your message here..."
                        className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-800 dark:border-gray-700"
                        disabled={isProcessing || chatMutation.isPending}
                      />
                      <Button
                        type="submit"
                        size="icon"
                        disabled={!textInput.trim() || isProcessing || chatMutation.isPending}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Speech not working? Type your response above
                    </p>
                  </form>
                )}

                {messages.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNewBooking}
                    className="text-muted-foreground"
                    data-testid="button-start-over"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Start Over
                  </Button>
                )}
              </div>
            </div>

            <div className="lg:w-80 flex-shrink-0">
              <div className="lg:sticky lg:top-24 space-y-4">
                  <BookingSummary
                    context={context}
                    showActions={false}
                  />

                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-chart-2 animate-pulse" />
                      <span className="text-sm font-medium">Status</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs">
                        Step: {formatStep(context.step)}
                      </Badge>
                      <Badge
                        variant={isListening ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {isListening ? "Listening" : "Ready"}
                      </Badge>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
        )}
      </main>

      <footer className="border-t mt-auto">
        <div className="max-w-4xl mx-auto px-4 py-4 text-center">
          <p className="text-xs text-muted-foreground">
            Powered by Web Speech API and Gemini AI
          </p>
        </div>
      </footer>
    </div>
  );
}

function formatStep(step: string): string {
  return step
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
