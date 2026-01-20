import React, { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Loader2, User, Bot } from "lucide-react";
import type { ConversationMessage } from "@shared/schema";

interface ConversationDisplayProps {
  messages: ConversationMessage[];
  isLoading?: boolean;
  currentTranscript?: string;
}

export function ConversationDisplay({
  messages,
  isLoading = false,
  currentTranscript = "",
}: ConversationDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentTranscript, isLoading]);

  if (messages.length === 0 && !currentTranscript && !isLoading) {
    return (
      <Card className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
            <Bot className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold" data-testid="text-welcome-title">
              Welcome to Restaurant Booking
            </h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              Tap the microphone and speak to start booking your table
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex-1 overflow-hidden">
      <ScrollArea className="h-[400px] p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          
          {currentTranscript && (
            <div className="flex justify-end gap-2">
              <div className="max-w-[80%] px-4 py-3 rounded-2xl bg-primary/10 text-foreground border border-primary/20">
                <p className="text-sm italic opacity-70">{currentTranscript}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="max-w-[80%] px-4 py-3 rounded-2xl bg-muted">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </Card>
  );
}

function MessageBubble({ message }: { message: ConversationMessage }) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}
      data-testid={`message-${message.role}-${message.id}`}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
          <Bot className="h-4 w-4 text-primary-foreground" />
        </div>
      )}
      <div
        className={`
          max-w-[80%] px-4 py-3 rounded-2xl
          ${isUser 
            ? "bg-primary text-primary-foreground" 
            : "bg-muted text-foreground"
          }
        `}
      >
        <p className={`text-sm ${!isUser ? "text-base" : ""}`}>
          {message.content}
        </p>
        <p
          className={`text-xs mt-1 ${
            isUser ? "text-primary-foreground/70" : "text-muted-foreground"
          }`}
        >
          {formatTime(message.timestamp)}
        </p>
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
