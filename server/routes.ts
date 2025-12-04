import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { processConversation, generateSeatingResponse } from "./gemini";
import { getWeatherForDate } from "./weather";
import { registerLiveKitRoutes } from "./livekit";
import { chatRequestSchema, insertBookingSchema } from "@shared/schema";
import type { BookingContext, ChatResponse, InsertBooking } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Register LiveKit routes
  registerLiveKitRoutes(app);

  app.post("/api/chat", async (req: Request, res: Response) => {
    try {
      const parseResult = chatRequestSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid request",
          details: parseResult.error.errors,
        });
      }

      const { message, context } = parseResult.data;

      if (context.step === "fetch_weather" && context.location && context.bookingDate) {
        const weather = await getWeatherForDate(context.bookingDate, context.location);
        
        if (weather) {
          const seatingResponse = generateSeatingResponse(
            weather.condition,
            weather.temperature
          );

          const updatedContext: BookingContext = {
            ...context,
            weatherInfo: weather,
            seatingPreference: seatingResponse.preference,
            step: "suggest_seating",
          };

          const response: ChatResponse = {
            response: seatingResponse.response,
            context: updatedContext,
          };

          return res.json(response);
        }
      }

      if (context.step === "suggest_seating") {
        const lowerMessage = message.toLowerCase();
        let preference: "indoor" | "outdoor" | "no_preference" = context.seatingPreference || "no_preference";
        
        if (lowerMessage.includes("outdoor") || lowerMessage.includes("outside") || lowerMessage.includes("patio")) {
          preference = "outdoor";
        } else if (lowerMessage.includes("indoor") || lowerMessage.includes("inside")) {
          preference = "indoor";
        } else if (lowerMessage.includes("yes") || lowerMessage.includes("sure") || lowerMessage.includes("sounds good")) {
          preference = context.seatingPreference || "indoor";
        }

        const updatedContext: BookingContext = {
          ...context,
          seatingPreference: preference,
          step: "collect_special_requests",
        };

        const response: ChatResponse = {
          response: `Great choice! ${preference === "outdoor" ? "Outdoor" : "Indoor"} seating it is. Do you have any special requests? For example, is this for a birthday, anniversary, or do you have any dietary requirements? If not, just say "no special requests".`,
          context: updatedContext,
        };

        return res.json(response);
      }

      if (context.step === "collect_special_requests") {
        const lowerMessage = message.toLowerCase();
        const hasNoRequests = lowerMessage.includes("no") || lowerMessage.includes("none") || lowerMessage.includes("nothing");
        
        const specialRequests = hasNoRequests ? undefined : message;

        const updatedContext: BookingContext = {
          ...context,
          specialRequests,
          step: "confirm_booking",
        };

        const summary = buildBookingSummary(updatedContext);
        const response: ChatResponse = {
          response: `Perfect! Let me confirm your booking details:\n\n${summary}\n\nIs everything correct? Say "yes" or "confirm" to complete your booking, or let me know what you'd like to change.`,
          context: updatedContext,
        };

        return res.json(response);
      }

      if (context.step === "confirm_booking") {
        const lowerMessage = message.toLowerCase();
        const isConfirmed = 
          lowerMessage.includes("yes") || 
          lowerMessage.includes("confirm") || 
          lowerMessage.includes("correct") ||
          lowerMessage.includes("looks good") ||
          lowerMessage.includes("that's right");

        if (isConfirmed) {
          const bookingData: InsertBooking = {
            customerName: context.customerName || "Guest",
            numberOfGuests: context.numberOfGuests || 2,
            bookingDate: context.bookingDate || new Date().toISOString().split("T")[0],
            bookingTime: context.bookingTime || "7:00 PM",
            cuisinePreference: context.cuisinePreference || "Any",
            location: context.location || "Unknown",
            specialRequests: context.specialRequests,
            weatherInfo: context.weatherInfo,
            seatingPreference: context.seatingPreference || "no_preference",
          };

          const booking = await storage.createBooking(bookingData);

          const updatedContext: BookingContext = {
            ...context,
            step: "booking_complete",
          };

          const response: ChatResponse = {
            response: `Wonderful! Your booking has been confirmed! Your booking ID is ${booking.bookingId}. We look forward to seeing you, ${booking.customerName}, on ${formatDate(booking.bookingDate)} at ${booking.bookingTime}. Thank you for choosing our restaurant!`,
            context: updatedContext,
            bookingComplete: true,
            booking,
          };

          return res.json(response);
        }
      }

      let geminiContext = { ...context };
      
      if (context.step === "greeting") {
        geminiContext.step = "collect_name";
      }

      const result = await processConversation(message, geminiContext);

      if (
        result.context.location && 
        result.context.bookingDate && 
        !result.context.weatherInfo &&
        result.context.step !== "fetch_weather"
      ) {
        result.context.step = "fetch_weather";
        
        const weather = await getWeatherForDate(result.context.bookingDate, result.context.location);
        
        if (weather) {
          const seatingResponse = generateSeatingResponse(weather.condition, weather.temperature);
          result.context.weatherInfo = weather;
          result.context.seatingPreference = seatingResponse.preference;
          result.context.step = "suggest_seating";
          result.response = `${result.response}\n\n${seatingResponse.response}`;
        }
      }

      return res.json(result);
    } catch (error) {
      console.error("Chat API error:", error);
      return res.status(500).json({
        error: "Failed to process message",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.post("/api/bookings", async (req: Request, res: Response) => {
    try {
      const parseResult = insertBookingSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid booking data",
          details: parseResult.error.errors,
        });
      }

      const booking = await storage.createBooking(parseResult.data);
      return res.status(201).json(booking);
    } catch (error) {
      console.error("Create booking error:", error);
      return res.status(500).json({
        error: "Failed to create booking",
      });
    }
  });

  app.get("/api/bookings", async (_req: Request, res: Response) => {
    try {
      const bookings = await storage.getAllBookings();
      return res.json(bookings);
    } catch (error) {
      console.error("Get bookings error:", error);
      return res.status(500).json({
        error: "Failed to fetch bookings",
      });
    }
  });

  app.get("/api/bookings/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const booking = await storage.getBooking(id);
      
      if (!booking) {
        return res.status(404).json({
          error: "Booking not found",
        });
      }

      return res.json(booking);
    } catch (error) {
      console.error("Get booking error:", error);
      return res.status(500).json({
        error: "Failed to fetch booking",
      });
    }
  });

  app.delete("/api/bookings/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteBooking(id);
      
      if (!deleted) {
        return res.status(404).json({
          error: "Booking not found",
        });
      }

      return res.json({
        message: "Booking cancelled successfully",
        bookingId: id,
      });
    } catch (error) {
      console.error("Delete booking error:", error);
      return res.status(500).json({
        error: "Failed to cancel booking",
      });
    }
  });

  app.get("/api/weather/:location/:date", async (req: Request, res: Response) => {
    try {
      const { location, date } = req.params;
      const weather = await getWeatherForDate(date, location);
      
      if (!weather) {
        return res.status(404).json({
          error: "Weather data not available",
        });
      }

      return res.json(weather);
    } catch (error) {
      console.error("Weather API error:", error);
      return res.status(500).json({
        error: "Failed to fetch weather",
      });
    }
  });

  return httpServer;
}

function buildBookingSummary(context: BookingContext): string {
  const lines: string[] = [];
  
  if (context.customerName) lines.push(`Name: ${context.customerName}`);
  if (context.numberOfGuests) lines.push(`Party size: ${context.numberOfGuests} guests`);
  if (context.bookingDate) lines.push(`Date: ${formatDate(context.bookingDate)}`);
  if (context.bookingTime) lines.push(`Time: ${context.bookingTime}`);
  if (context.cuisinePreference) lines.push(`Cuisine: ${context.cuisinePreference}`);
  if (context.location) lines.push(`Location: ${context.location}`);
  if (context.seatingPreference && context.seatingPreference !== "no_preference") {
    lines.push(`Seating: ${context.seatingPreference}`);
  }
  if (context.specialRequests) lines.push(`Special requests: ${context.specialRequests}`);

  return lines.join("\n");
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
}
