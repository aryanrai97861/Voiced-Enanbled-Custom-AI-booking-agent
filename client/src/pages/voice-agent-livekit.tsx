import { useState, useCallback, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { Utensils, Volume2, VolumeX, RefreshCw, AlertCircle } from "lucide-react";
import type {
  ConversationMessage,
  BookingContext,
  Booking,
  ChatResponse,
} from "@shared/schema";

const initialContext: BookingContext = {
  step: "greeting",
};

export default function VoiceAgentLiveKit() {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [context, setContext] = useState<BookingContext>(initialContext);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const { toast } = useToast();

  // Use Web Speech API for voice interaction
  const speech = useSpeech({
    onTranscript: (text: string) => {
      if (text.trim()) {
        sendMessage(text.trim());
      }
    },
    onError: (error: string) => {
      toast({
        title: "Voice Error",
        description: error,
        variant: "destructive",
      });
    },
  });

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
          speech.speak(data.response);
        } catch {
          console.log("Speech synthesis failed, continuing silently");
        }
      }
      setIsProcessing(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
      setIsProcessing(false);
    },
  });

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim() || isProcessing) return;

      const userMessage: ConversationMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsProcessing(true);

      chatMutation.mutate(text);
    },
    [isProcessing, chatMutation]
  );

  const handleVoiceStart = useCallback(() => {
    speech.startListening();
  }, [speech]);

  const handleVoiceStop = useCallback(() => {
    speech.stopListening();
  }, [speech]);

  const handleReset = useCallback(() => {
    setMessages([]);
    setContext(initialContext);
    setConfirmedBooking(null);
    speech.stopListening();
  }, [liveKit]);

  useEffect(() => {
    if (!voiceEnabled) {
      window.speechSynthesis.cancel();
    }
  }, [voiceEnabled]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-500 rounded-xl shadow-lg">
              <Utensils className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Restaurant Booking Agent
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Voice-powered table reservations
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button
              variant="outline"
              size="icon"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              title={voiceEnabled ? "Disable voice" : "Enable voice"}
            >
              {voiceEnabled ? (
                <Volume2 className="h-5 w-5" />
              ) : (
                <VolumeX className="h-5 w-5" />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleReset}
              title="Reset conversation"
            >
              <RefreshCw className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* LiveKit Status */}
        {liveKitStatus?.configured && (
          <Card className="mb-6 p-4">
            <div className="flex items-center gap-3">
              <Radio className="w-5 h-5 text-orange-500" />
              <div className="flex-1">
                <p className="text-sm font-semibold">LiveKit Voice Agent</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Using LiveKit for voice + Gemini AI for conversation
                </p>
              </div>
              <Badge variant={liveKit.isConnected ? "default" : "secondary"}>
                {liveKit.isConnected ? "🟢 Connected" : "⚫ Disconnected"}
              </Badge>
            </div>
          </Card>
        )}

        {/* Browser Support Warning */}
        {!liveKitStatus?.configured && (
          <Card className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
                  LiveKit Not Configured
                </h3>
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                  Add LiveKit credentials to .env file to enable voice features. See GET_LIVEKIT_KEYS.md
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversation Area */}
          <div className="lg:col-span-2 space-y-6">
            <ConversationDisplay
              messages={messages}
              isProcessing={isProcessing}
              transcript={speech.transcript}
            />

            {/* Voice Controls */}
            <Card className="p-6">
              <div className="flex flex-col items-center gap-4">
                <MicrophoneButton
                                  isListening={speech.isListening}
                                  isSpeaking={speech.isSpeaking}
                                  onStart={handleVoiceStart}
                                  onStop={handleVoiceStop} status={"error"}                />
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Status: {liveKit.status}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    LiveKit + Gemini AI • {liveKit.isConnected ? 'Click to speak' : 'Click to connect'}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Booking Summary */}
          <div className="lg:col-span-1">
            {confirmedBooking ? (
              <BookingConfirmation booking={confirmedBooking} onNewBooking={function (): void {
                              throw new Error("Function not implemented.");
                          } } />
            ) : (
              <BookingSummary context={context} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
