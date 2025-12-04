import { z } from "zod";

export const weatherInfoSchema = z.object({
  condition: z.string(),
  temperature: z.number(),
  description: z.string(),
  icon: z.string(),
  humidity: z.number().optional(),
  windSpeed: z.number().optional(),
});

export type WeatherInfo = z.infer<typeof weatherInfoSchema>;

export const bookingSchema = z.object({
  bookingId: z.string(),
  customerName: z.string(),
  numberOfGuests: z.number().min(1).max(20),
  bookingDate: z.string(),
  bookingTime: z.string(),
  cuisinePreference: z.string(),
  location: z.string(),
  specialRequests: z.string().optional(),
  weatherInfo: weatherInfoSchema.optional(),
  seatingPreference: z.enum(["indoor", "outdoor", "no_preference"]),
  status: z.enum(["pending", "confirmed", "cancelled"]),
  createdAt: z.string(),
});

export type Booking = z.infer<typeof bookingSchema>;

export const insertBookingSchema = bookingSchema.omit({
  bookingId: true,
  createdAt: true,
  status: true,
});

export type InsertBooking = z.infer<typeof insertBookingSchema>;

export const conversationMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  timestamp: z.string(),
});

export type ConversationMessage = z.infer<typeof conversationMessageSchema>;

export const bookingContextSchema = z.object({
  customerName: z.string().optional(),
  numberOfGuests: z.number().optional(),
  bookingDate: z.string().optional(),
  bookingTime: z.string().optional(),
  cuisinePreference: z.string().optional(),
  location: z.string().optional(),
  specialRequests: z.string().optional(),
  seatingPreference: z.enum(["indoor", "outdoor", "no_preference"]).optional(),
  weatherInfo: weatherInfoSchema.optional(),
  step: z.enum([
    "greeting",
    "collect_name",
    "collect_guests",
    "collect_date",
    "collect_time",
    "collect_cuisine",
    "collect_location",
    "fetch_weather",
    "suggest_seating",
    "collect_special_requests",
    "confirm_booking",
    "booking_complete",
  ]),
});

export type BookingContext = z.infer<typeof bookingContextSchema>;

export const chatRequestSchema = z.object({
  message: z.string(),
  context: bookingContextSchema,
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const chatResponseSchema = z.object({
  response: z.string(),
  context: bookingContextSchema,
  bookingComplete: z.boolean().optional(),
  booking: bookingSchema.optional(),
});

export type ChatResponse = z.infer<typeof chatResponseSchema>;

export const users = {
  id: "",
  username: "",
  password: "",
};

export const insertUserSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users;
