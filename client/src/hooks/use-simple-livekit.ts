import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Room,
  RoomEvent,
  RemoteTrack,
  RemoteTrackPublication,
  RemoteParticipant,
  createLocalTracks,
  LocalAudioTrack,
} from 'livekit-client';

export type VoiceStatus = 'idle' | 'connecting' | 'connected' | 'listening' | 'speaking' | 'error';

interface UseSimpleLiveKitVoiceOptions {
  onTranscript?: (text: string) => void;
  onError?: (error: string) => void;
}

interface UseSimpleLiveKitVoiceReturn {
  status: VoiceStatus;
  isConnected: boolean;
  isListening: boolean;
  transcript: string;
  connect: () => Promise<void>;
  disconnect: () => void;
  startListening: () => void;
  stopListening: () => void;
  playAudio: (text: string) => Promise<void>;
  error: string | null;
}

// Get or create a persistent client identity and room for this browser session
function getClientSession(): { identity: string; room: string } {
  const identityKey = 'livekit_client_identity';
  const roomKey = 'livekit_room_name';
  
  let identity = sessionStorage.getItem(identityKey);
  let room = sessionStorage.getItem(roomKey);
  
  if (!identity || !room) {
    // Use timestamp + random to ensure uniqueness
    const timestamp = Date.now();
    identity = `client_${timestamp}_${Math.random().toString(36).substring(2, 9)}`;
    room = `booking_${timestamp}`;
    
    sessionStorage.setItem(identityKey, identity);
    sessionStorage.setItem(roomKey, room);
    console.log('🆕 Created new session:', { identity, room });
  } else {
    console.log('♻️ Reusing existing session:', { identity, room });
  }
  
  return { identity, room };
}

// Clear the session to force new room/identity creation
function clearSession(): void {
  sessionStorage.removeItem('livekit_client_identity');
  sessionStorage.removeItem('livekit_room_name');
  console.log('🗑️ Session cleared');
}

// Simple Web Speech API fallback for LiveKit
export function useSimpleLiveKitVoice(
  options: UseSimpleLiveKitVoiceOptions = {}
): UseSimpleLiveKitVoiceReturn {
  const { onTranscript, onError } = options;

  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const roomRef = useRef<Room | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioTrackRef = useRef<LocalAudioTrack | null>(null);
  const isConnectingRef = useRef(false); // Prevent duplicate connection attempts

  // Initialize speech recognition (browser fallback)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = 
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          }
        }

        if (finalTranscript) {
          setTranscript(finalTranscript);
          if (onTranscript) {
            onTranscript(finalTranscript);
          }
          recognition.stop();
        }
      };

      recognition.onerror = (event: any) => {
        const errorMessage = `Speech recognition error: ${event.error}`;
        setError(errorMessage);
        setStatus('error');
        setIsListening(false);
        if (onError) {
          onError(errorMessage);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        if (status === 'listening') {
          setStatus('connected');
        }
      };

      recognitionRef.current = recognition;
    }

    // Initialize LiveKit room
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      reconnectPolicy: {
        nextRetryDelayInMs: (context) => {
          return Math.min(context.retryCount * 2000, 10000);
        },
        maxAttempts: 5,
      },
    });

    room.on(RoomEvent.Connected, () => {
      console.log('✅ Connected to LiveKit room');
      setIsConnected(true);
      setStatus('connected');
      setError(null);
    });

    room.on(RoomEvent.Disconnected, (reason) => {
      const reasons: { [key: number]: string } = {
        0: 'CLIENT_INITIATED',
        1: 'DUPLICATE_IDENTITY',
        2: 'SERVER_SHUTDOWN',
        3: 'PARTICIPANT_REMOVED',
        4: 'ROOM_DELETED',
        5: 'STATE_MISMATCH',
        6: 'JOIN_FAILURE',
      };
      const reasonText = reasons[reason as number] || reason;
      console.log('❌ Disconnected from LiveKit. Reason:', reasonText);
      
      // If duplicate identity, clear session storage and regenerate
      if (reason === 1) {
        console.log('🔄 Duplicate identity detected, clearing session...');
        clearSession();
      }
      
      setIsConnected(false);
      setIsListening(false);
      
      // Only set to idle if it's an intentional disconnect
      if (status !== 'error') {
        setStatus('idle');
      }
    });

    room.on(RoomEvent.Reconnecting, () => {
      console.log('🔄 Reconnecting to LiveKit...');
      setStatus('connecting');
    });

    room.on(RoomEvent.Reconnected, () => {
      console.log('✅ Reconnected to LiveKit');
      setIsConnected(true);
      setStatus('connected');
    });

    roomRef.current = room;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      room.disconnect();
    };
  }, [onTranscript, onError, status]);

  const connect = useCallback(async () => {
    if (!roomRef.current) return;

    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current) {
      console.log('⏳ Connection already in progress, skipping...');
      return;
    }

    isConnectingRef.current = true;

    // Disconnect first if already connected to prevent duplicate identity
    if (roomRef.current.state === 'connected' || roomRef.current.state === 'connecting') {
      console.log('🔄 Already connected/connecting, disconnecting first...');
      await roomRef.current.disconnect();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setStatus('connecting');
    setError(null);

    try {
      // Get or reuse client identity and room from session storage
      const session = getClientSession();
      console.log('🔑 Using session:', session);
      
      // Get token from backend with persistent identity and room
      const response = await fetch(`/api/livekit/token?t=${Date.now()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          roomName: session.room,
          identity: session.identity,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get LiveKit token');
      }

      const { token, url } = await response.json();

      console.log('LiveKit connection details:', { 
        hasToken: !!token, 
        tokenType: typeof token,
        tokenLength: token?.length,
        url 
      });

      if (!token || typeof token !== 'string') {
        throw new Error('Invalid token received from server');
      }

      // Connect to LiveKit room
      await roomRef.current.connect(url, token, {
        autoSubscribe: true,
      });

      console.log('✅ LiveKit room connected successfully');

      // We're using browser STT/TTS, not LiveKit audio, so no need to publish tracks
      // Just mark as connected
      setStatus('connected');
      console.log('✅ LiveKit fully connected and ready');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to LiveKit';
      console.error('❌ LiveKit connection error:', errorMessage);
      setError(errorMessage);
      setStatus('error');
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      isConnectingRef.current = false;
    }
  }, [onError]);

  const disconnect = useCallback(async () => {
    console.log('🔌 Disconnecting from LiveKit...');
    
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn('Speech recognition stop error:', e);
      }
    }
    
    if (audioTrackRef.current) {
      try {
        audioTrackRef.current.stop();
        audioTrackRef.current = null;
      } catch (e) {
        console.warn('Audio track stop error:', e);
      }
    }
    
    if (roomRef.current) {
      try {
        await roomRef.current.disconnect(true); // true = stop all tracks
        console.log('✅ Disconnected from LiveKit room');
      } catch (e) {
        console.warn('Room disconnect error:', e);
      }
    }
    
    setIsListening(false);
    setIsConnected(false);
    setStatus('idle');
  }, [isListening]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || !isConnected) {
      console.warn('Cannot start listening: not connected or no speech recognition');
      return;
    }

    try {
      setTranscript('');
      setError(null);
      setIsListening(true);
      setStatus('listening');
      recognitionRef.current.start();
      console.log('🎤 Started listening...');
    } catch (err) {
      console.error('Failed to start listening:', err);
    }
  }, [isConnected]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setStatus('connected');
    }
  }, [isListening]);

  const playAudio = useCallback(async (text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        setStatus('speaking');
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        utterance.onend = () => {
          setStatus('connected');
          resolve();
        };

        utterance.onerror = (event) => {
          console.error('Speech synthesis error:', event);
          setStatus('connected');
          reject(new Error('Speech synthesis failed'));
        };

        window.speechSynthesis.cancel(); // Cancel any ongoing speech
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        setStatus('connected');
        reject(err);
      }
    });
  }, []);

  return {
    status,
    isConnected,
    isListening,
    transcript,
    connect,
    disconnect,
    startListening,
    stopListening,
    playAudio,
    error,
  };
}
