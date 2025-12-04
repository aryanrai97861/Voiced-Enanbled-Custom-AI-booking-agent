import { GoogleGenAI } from "@google/genai";
import type { BookingContext, ChatResponse } from "@shared/schema";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const SYSTEM_PROMPT = `You are a friendly and professional restaurant booking assistant. Your goal is to help customers book a table at our restaurant through natural conversation.

You must collect the following information step by step:
1. Customer's name
2. Number of guests (1-20)
3. Preferred date (in YYYY-MM-DD format)
4. Preferred time (e.g., "7:00 PM", "19:00")
5. Cuisine preference (e.g., Italian, Chinese, Indian, Mexican, American, etc.)
6. Location/City for weather-based seating suggestions
7. Special requests (birthdays, anniversaries, dietary restrictions, etc.)

IMPORTANT RULES:
- Be conversational and friendly, not robotic
- Ask for one piece of information at a time
- If the user provides multiple pieces of information at once, acknowledge all of them
- Validate the information makes sense (e.g., date should be in the future, guests 1-20)
- When you have all the required information, summarize the booking and ask for confirmation
- Handle variations in user input naturally (e.g., "me and my wife" = 2 guests)
- If the user says something off-topic, gently guide them back to the booking

For dates, convert natural language to YYYY-MM-DD format:
- "tomorrow" → calculate tomorrow's date
- "next Friday" → calculate next Friday's date
- "December 25" → 2024-12-25 or 2025-12-25 depending on current date

For times, use 12-hour format with AM/PM.

Current date: ${new Date().toISOString().split('T')[0]}

Response format: You must respond with a JSON object:
{
  "response": "Your conversational response to the user",
  "extractedData": {
    "customerName": "extracted name or null",
    "numberOfGuests": extracted number or null,
    "bookingDate": "YYYY-MM-DD or null",
    "bookingTime": "HH:MM AM/PM or null",
    "cuisinePreference": "cuisine type or null",
    "location": "city name or null",
    "specialRequests": "any special requests or null"
  },
  "nextStep": "one of: collect_name, collect_guests, collect_date, collect_time, collect_cuisine, collect_location, fetch_weather, suggest_seating, collect_special_requests, confirm_booking, booking_complete",
  "isConfirmed": true if user confirmed the booking, false otherwise
}`;

export async function processConversation(
  userMessage: string,
  context: BookingContext
): Promise<ChatResponse> {
  const contextSummary = buildContextSummary(context);

  const prompt = `${SYSTEM_PROMPT}

Current booking context:
${contextSummary}

Current step: ${context.step}
User message: "${userMessage}"

Respond with only the JSON object, no additional text.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const text = response.text || "";
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return createFallbackResponse(userMessage, context);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const updatedContext = updateContext(context, parsed);

    return {
      response: parsed.response || "I'm sorry, I didn't understand that. Could you please repeat?",
      context: updatedContext,
      bookingComplete: parsed.isConfirmed === true && updatedContext.step === "booking_complete",
    };
  } catch (error) {
    console.error("Gemini API error:", error);
    return createFallbackResponse(userMessage, context);
  }
}

function buildContextSummary(context: BookingContext): string {
  const parts: string[] = [];
  
  if (context.customerName) parts.push(`Name: ${context.customerName}`);
  if (context.numberOfGuests) parts.push(`Guests: ${context.numberOfGuests}`);
  if (context.bookingDate) parts.push(`Date: ${context.bookingDate}`);
  if (context.bookingTime) parts.push(`Time: ${context.bookingTime}`);
  if (context.cuisinePreference) parts.push(`Cuisine: ${context.cuisinePreference}`);
  if (context.location) parts.push(`Location: ${context.location}`);
  if (context.specialRequests) parts.push(`Special Requests: ${context.specialRequests}`);
  if (context.seatingPreference) parts.push(`Seating: ${context.seatingPreference}`);
  if (context.weatherInfo) {
    parts.push(`Weather: ${context.weatherInfo.description}, ${context.weatherInfo.temperature}°C`);
  }

  return parts.length > 0 ? parts.join("\n") : "No information collected yet.";
}

function updateContext(
  context: BookingContext,
  parsed: {
    extractedData?: Partial<BookingContext>;
    nextStep?: string;
    isConfirmed?: boolean;
  }
): BookingContext {
  const updated = { ...context };

  if (parsed.extractedData) {
    const data = parsed.extractedData;
    
    if (data.customerName) updated.customerName = data.customerName;
    if (data.numberOfGuests && typeof data.numberOfGuests === "number") {
      updated.numberOfGuests = Math.min(20, Math.max(1, data.numberOfGuests));
    }
    if (data.bookingDate) updated.bookingDate = data.bookingDate;
    if (data.bookingTime) updated.bookingTime = data.bookingTime;
    if (data.cuisinePreference) updated.cuisinePreference = data.cuisinePreference;
    if (data.location) updated.location = data.location;
    if (data.specialRequests) updated.specialRequests = data.specialRequests;
  }

  if (parsed.nextStep && isValidStep(parsed.nextStep)) {
    updated.step = parsed.nextStep as BookingContext["step"];
  }

  return updated;
}

function isValidStep(step: string): boolean {
  const validSteps = [
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
  ];
  return validSteps.includes(step);
}

function createFallbackResponse(
  userMessage: string,
  context: BookingContext
): ChatResponse {
  const lowerMessage = userMessage.toLowerCase();

  if (context.step === "greeting" || lowerMessage.includes("hello") || lowerMessage.includes("hi")) {
    return {
      response: "Hello! Welcome to our restaurant booking service. I'd be happy to help you reserve a table. May I have your name, please?",
      context: { ...context, step: "collect_name" },
    };
  }

  if (context.step === "collect_name" && !context.customerName) {
    const words = userMessage.split(" ");
    const name = words.length <= 3 ? userMessage : words.slice(0, 2).join(" ");
    return {
      response: `Nice to meet you, ${name}! How many guests will be joining you for dinner?`,
      context: { ...context, customerName: name, step: "collect_guests" },
    };
  }

  if (context.step === "collect_guests") {
    const numMatch = userMessage.match(/\d+/);
    if (numMatch) {
      const guests = Math.min(20, Math.max(1, parseInt(numMatch[0])));
      return {
        response: `Wonderful! A table for ${guests}. What date would you like to book? You can say something like "tomorrow" or give me a specific date.`,
        context: { ...context, numberOfGuests: guests, step: "collect_date" },
      };
    }
  }

  return {
    response: "I'm sorry, I didn't quite catch that. Could you please repeat?",
    context,
  };
}

export function generateSeatingResponse(
  weatherCondition: string,
  temperature: number
): { response: string; preference: "indoor" | "outdoor" | "no_preference" } {
  const condition = weatherCondition.toLowerCase();
  
  if (condition.includes("rain") || condition.includes("storm") || condition.includes("snow")) {
    return {
      response: `It looks like there might be some ${condition} on your booking date. I'd recommend our cozy indoor seating area where you can enjoy your meal comfortably. Does that sound good?`,
      preference: "indoor",
    };
  }

  if (temperature > 30) {
    return {
      response: `It's going to be quite warm at ${Math.round(temperature)}°C on your booking date. Our air-conditioned indoor seating would be more comfortable. Would you prefer that?`,
      preference: "indoor",
    };
  }

  if (temperature < 10) {
    return {
      response: `It's going to be a bit chilly at ${Math.round(temperature)}°C on your booking date. Our warm indoor seating would be perfect. Sound good?`,
      preference: "indoor",
    };
  }

  if (condition.includes("clear") || condition.includes("sunny")) {
    return {
      response: `Great news! The weather looks beautiful on your booking date - ${Math.round(temperature)}°C and ${condition}! Would you like outdoor seating to enjoy the lovely weather?`,
      preference: "outdoor",
    };
  }

  return {
    response: `The weather on your booking date looks fine - around ${Math.round(temperature)}°C. Would you prefer indoor or outdoor seating?`,
    preference: "no_preference",
  };
}
