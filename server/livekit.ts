import type { Express, Request, Response } from "express";
import { AccessToken } from "livekit-server-sdk";
import crypto from "crypto";

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "";
const LIVEKIT_WS_URL = process.env.LIVEKIT_WS_URL || "";

export function registerLiveKitRoutes(app: Express) {
  // Get LiveKit access token
  app.post("/api/livekit/token", async (req: Request, res: Response) => {
    try {
      const { identity, roomName } = req.body;

      if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
        return res.status(500).json({
          error: "LiveKit credentials not configured",
          message: "Please add LIVEKIT_API_KEY and LIVEKIT_API_SECRET to .env file",
        });
      }

      // Use provided identity or generate a new one
      // Client should provide consistent identity from sessionStorage
      const participantIdentity = identity || `server_${crypto.randomUUID()}`;
      const room = roomName || "restaurant-booking";

      const token = new AccessToken(
        LIVEKIT_API_KEY,
        LIVEKIT_API_SECRET,
        {
          identity: participantIdentity,
          name: participantIdentity,
        }
      );

      token.addGrant({
        room,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      });

      const jwt = await token.toJwt();
      
      console.log(`Generated token for ${participantIdentity} in room ${room}`);

      return res.json({
        token: jwt,
        url: LIVEKIT_WS_URL,
        room,
      });
    } catch (error) {
      console.error("Error generating LiveKit token:", error);
      return res.status(500).json({
        error: "Failed to generate token",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Get LiveKit configuration status
  app.get("/api/livekit/status", (_req: Request, res: Response) => {
    const isConfigured = !!(LIVEKIT_API_KEY && LIVEKIT_API_SECRET && LIVEKIT_WS_URL);

    return res.json({
      configured: isConfigured,
      hasApiKey: !!LIVEKIT_API_KEY,
      hasApiSecret: !!LIVEKIT_API_SECRET,
      hasWsUrl: !!LIVEKIT_WS_URL,
      wsUrl: LIVEKIT_WS_URL,
    });
  });
  
  // Test token generation
  app.get("/api/livekit/test-token", async (_req: Request, res: Response) => {
    try {
      const token = new AccessToken(
        LIVEKIT_API_KEY,
        LIVEKIT_API_SECRET,
        {
          identity: "test_user",
        }
      );

      token.addGrant({
        room: "test-room",
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
      });

      const jwt = await token.toJwt();
      
      return res.json({
        success: true,
        tokenLength: jwt.length,
        tokenPreview: jwt.substring(0, 50) + "...",
        apiKeyUsed: LIVEKIT_API_KEY,
        wsUrl: LIVEKIT_WS_URL,
      });
    } catch (error) {
      return res.json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}
