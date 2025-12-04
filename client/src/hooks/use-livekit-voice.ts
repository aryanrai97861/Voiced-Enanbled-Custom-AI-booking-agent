import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Room,
  RoomEvent,
  Track,
  LocalParticipant,
  RemoteParticipant,
  RemoteTrackPublication,
  RemoteTrack,
  createLocalTracks,
} from 'livekit-client';

export type LiveKitStatus = 'idle' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'error';

interface UseLiveKitVoiceOptions {
  onTranscript?: (text: string) => void;
  onResponse?: (text: string) => void;
  onError?: (error: string) => void;
}

interface UseLiveKitVoiceReturn {
  status: LiveKitStatus;
  isConnected: boolean;
  transcript: string;
  connect: () => Promise<void>;
  disconnect: () => void;
  speak: (text: string) => void;
  error: string | null;
  isSupported: boolean;
}

export function useLiveKitVoice(
  options: UseLiveKitVoiceOptions = {}
): UseLiveKitVoiceReturn {
  const { onTranscript, onResponse, onError } = options;

  const [status, setStatus] = useState<LiveKitStatus>('idle');
  const [isConnected, setIsConnected] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const roomRef = useRef<Room | null>(null);
  const isSupported = true; // LiveKit works in all modern browsers

  useEffect(() => {
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });

    room.on(RoomEvent.Connected, () => {
      console.log('Connected to LiveKit room');
      setIsConnected(true);
      setStatus('connected');
    });

    room.on(RoomEvent.Disconnected, () => {
      console.log('Disconnected from LiveKit room');
      setIsConnected(false);
      setStatus('idle');
    });

    room.on(RoomEvent.TrackSubscribed, (
      track: RemoteTrack,
      publication: RemoteTrackPublication,
      participant: RemoteParticipant
    ) => {
      if (track.kind === Track.Kind.Audio) {
        const audioElement = track.attach();
        document.body.appendChild(audioElement);
      }
    });

    room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
      const decoder = new TextDecoder();
      const message = decoder.decode(payload);
      
      try {
        const data = JSON.parse(message);
        
        if (data.type === 'transcript') {
          setTranscript(data.text);
          if (onTranscript) {
            onTranscript(data.text);
          }
        } else if (data.type === 'response') {
          if (onResponse) {
            onResponse(data.text);
          }
        }
      } catch (e) {
        console.error('Failed to parse data:', e);
      }
    });

    roomRef.current = room;

    return () => {
      room.disconnect();
    };
  }, [onTranscript, onResponse]);

  const connect = useCallback(async () => {
    if (!roomRef.current) return;

    setStatus('connecting');
    setError(null);

    try {
      // Get token from backend
      const response = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: `user_${Date.now()}` }),
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
      await roomRef.current.connect(url, token);

      // Enable microphone
      const tracks = await createLocalTracks({
        audio: true,
        video: false,
      });

      for (const track of tracks) {
        await roomRef.current.localParticipant.publishTrack(track);
      }

      setStatus('connected');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to LiveKit';
      setError(errorMessage);
      setStatus('error');
      if (onError) {
        onError(errorMessage);
      }
    }
  }, [onError]);

  const disconnect = useCallback(() => {
    if (roomRef.current) {
      roomRef.current.disconnect();
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (!roomRef.current || !isConnected) return;

    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify({ type: 'speak', text }));
    roomRef.current.localParticipant.publishData(data, { reliable: true });
  }, [isConnected]);

  return {
    status,
    isConnected,
    transcript,
    connect,
    disconnect,
    speak,
    error,
    isSupported,
  };
}
