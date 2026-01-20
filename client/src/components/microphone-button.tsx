import React from "react";
import { Mic, MicOff, Loader2, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SpeechStatus } from "@/hooks/use-speech";

interface MicrophoneButtonProps {
  status: SpeechStatus;
  isListening: boolean;
  isSpeaking: boolean;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
}

export function MicrophoneButton({
  status,
  isListening,
  isSpeaking,
  onStart,
  onStop,
  disabled = false,
}: MicrophoneButtonProps) {
  const getStatusText = () => {
    switch (status) {
      case "listening":
        return "Listening...";
      case "processing":
        return "Processing...";
      case "speaking":
        return "Speaking...";
      case "error":
        return "Error occurred";
      default:
        return "Tap to speak";
    }
  };

  const getButtonContent = () => {
    if (status === "processing") {
      return <Loader2 className="h-8 w-8 animate-spin" />;
    }
    if (isSpeaking) {
      return <Volume2 className="h-8 w-8" />;
    }
    if (isListening) {
      return <MicOff className="h-8 w-8" />;
    }
    return <Mic className="h-8 w-8" />;
  };

  const handleClick = () => {
    if (isListening) {
      onStop();
    } else if (!isSpeaking && status !== "processing") {
      onStart();
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        {isListening && (
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
        )}
        {isSpeaking && (
          <div className="absolute inset-0 rounded-full bg-chart-2/20 animate-pulse" />
        )}
        <Button
          size="icon"
          variant={isListening ? "default" : "outline"}
          className={`
            relative w-20 h-20 rounded-full transition-all duration-300
            ${isListening ? "bg-primary text-primary-foreground scale-110" : ""}
            ${isSpeaking ? "bg-chart-2 text-white border-chart-2" : ""}
            ${status === "error" ? "bg-destructive text-destructive-foreground border-destructive" : ""}
          `}
          onClick={handleClick}
          disabled={disabled || status === "processing"}
          data-testid="button-microphone"
        >
          {getButtonContent()}
        </Button>
      </div>
      <p
        className={`
          text-sm font-medium transition-colors
          ${isListening ? "text-primary" : ""}
          ${isSpeaking ? "text-chart-2" : ""}
          ${status === "error" ? "text-destructive" : ""}
          ${status === "idle" ? "text-muted-foreground" : ""}
        `}
        data-testid="text-speech-status"
      >
        {getStatusText()}
      </p>
    </div>
  );
}
