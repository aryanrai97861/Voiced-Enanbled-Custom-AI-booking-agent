# 🎙️ Restaurant Booking Voice Agent

A full-stack voice-enabled AI agent that helps users book restaurant tables through natural conversation. Built with React, Node.js, Express, and Google Gemini AI.

## 🌟 Features

- **Voice Interaction**: Real-time speech-to-text and text-to-speech using Web Speech API
- **Natural Conversation**: Powered by Google Gemini AI for intelligent dialogue
- **Weather Integration**: Real-time weather forecasts from OpenWeatherMap API
- **Smart Seating Suggestions**: Indoor/outdoor recommendations based on weather conditions
- **Complete Booking Flow**: Collects all necessary information through conversation
- **Modern UI**: Built with React, TypeScript, and Tailwind CSS
- **RESTful API**: Express backend with proper validation using Zod

## 📋 Technical Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Shadcn/UI** components
- **Web Speech API** for voice interaction
- **Wouter** for routing
- **TanStack Query** for data fetching

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **Google Gemini AI** for conversational intelligence
- **OpenWeatherMap API** for weather data
- **Zod** for schema validation
- **In-memory storage** (can be extended to MongoDB)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- OpenWeatherMap API key (provided)
- Google Gemini API key (required)

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd AskNeedMake
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**

Edit the `.env` file in the root directory:

```env
# OpenWeather API Configuration
OPENWEATHER_API_KEY=openweather_api_key_here

# Google Gemini API Configuration
# Get your API key from: https://makersuite.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# Session Configuration
SESSION_SECRET=your-secure-session-secret-here

# Server Configuration
PORT=5000
NODE_ENV=development
```

**⚠️ IMPORTANT**: You need to get a free Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

4. **Start the development server**
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## 🎯 How It Works

### Booking Flow

1. **Greeting**: Agent welcomes the user
2. **Name Collection**: Asks for customer name
3. **Guest Count**: Collects number of guests (1-20)
4. **Date Selection**: User provides preferred date
5. **Time Selection**: User specifies preferred time
6. **Cuisine Preference**: Collects cuisine type (Italian, Chinese, Indian, etc.)
7. **Location**: Asks for city to check weather
8. **Weather Check**: Fetches real-time weather forecast
9. **Seating Suggestion**: Recommends indoor/outdoor based on weather
10. **Special Requests**: Collects any special requirements
11. **Confirmation**: Reviews all details and confirms booking
12. **Completion**: Creates booking with unique ID

### Voice Interaction

- Click the microphone button to start speaking
- The agent will respond with voice
- You can also type your responses
- The conversation is natural and handles variations in input

### Weather-Based Recommendations

The system fetches real-time weather data and suggests:

- **Outdoor seating**: When weather is clear and temperature is comfortable (10-30°C)
- **Indoor seating**: When it's rainy, too hot (>30°C), or too cold (<10°C)

## 📡 API Endpoints

### Bookings

```http
POST /api/bookings
```
Create a new booking

**Request Body:**
```json
{
  "customerName": "John Doe",
  "numberOfGuests": 4,
  "bookingDate": "2025-12-10",
  "bookingTime": "7:00 PM",
  "cuisinePreference": "Italian",
  "location": "London",
  "specialRequests": "Birthday celebration",
  "seatingPreference": "outdoor"
}
```

```http
GET /api/bookings
```
Get all bookings

```http
GET /api/bookings/:id
```
Get a specific booking by ID

```http
DELETE /api/bookings/:id
```
Cancel a booking (marks as cancelled)

### Chat

```http
POST /api/chat
```
Process conversation with the AI agent

**Request Body:**
```json
{
  "message": "I'd like to book a table",
  "context": {
    "step": "greeting"
  }
}
```

## 🗂️ Project Structure

```
AskNeedMake/
├── client/                  # Frontend React application
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── ui/        # Shadcn UI components
│   │   │   ├── booking-confirmation.tsx
│   │   │   ├── booking-summary.tsx
│   │   │   ├── conversation-display.tsx
│   │   │   └── microphone-button.tsx
│   │   ├── hooks/         # Custom React hooks
│   │   │   ├── use-speech.ts     # Speech recognition hook
│   │   │   └── use-toast.ts
│   │   ├── pages/         # Page components
│   │   │   └── voice-agent.tsx   # Main voice agent page
│   │   └── lib/           # Utilities
│   └── index.html
├── server/                 # Backend Express application
│   ├── index.ts           # Server entry point
│   ├── routes.ts          # API routes
│   ├── gemini.ts          # Gemini AI integration
│   ├── weather.ts         # OpenWeather API integration
│   ├── storage.ts         # Data storage layer
│   ├── static.ts          # Static file serving
│   └── vite.ts            # Vite development server
├── shared/                # Shared types and schemas
│   └── schema.ts          # Zod schemas
├── .env                   # Environment variables
├── package.json
└── README.md
```

## 🔧 Key Components

### Frontend

- **`voice-agent.tsx`**: Main page orchestrating the booking flow
- **`use-speech.ts`**: Custom hook for Web Speech API integration
- **`conversation-display.tsx`**: Displays chat messages
- **`microphone-button.tsx`**: Voice input control
- **`booking-summary.tsx`**: Shows collected booking information

### Backend

- **`gemini.ts`**: Handles AI conversation using Google Gemini
- **`weather.ts`**: Integrates with OpenWeatherMap API
- **`storage.ts`**: In-memory data storage (extensible to MongoDB)
- **`routes.ts`**: Defines all API endpoints

## 🌤️ Weather Integration

The system uses OpenWeatherMap API to fetch real-time weather forecasts:

```typescript
// Example weather fetch
const weather = await getWeatherForDate("2025-12-10", "London");
// Returns: { condition, temperature, description, icon, humidity, windSpeed }
```

Weather data influences seating recommendations:
- **Rainy/Stormy**: Indoor seating recommended
- **Too Hot (>30°C)**: Indoor with AC recommended
- **Too Cold (<10°C)**: Indoor with heating recommended
- **Clear/Sunny (10-30°C)**: Outdoor seating suggested

## 🧪 Testing

### Manual Testing

1. Start the application
2. Click the microphone button
3. Say: "I'd like to book a table"
4. Follow the conversation flow
5. Provide: name, guest count, date, time, cuisine, location
6. Confirm the booking

### Sample Conversation

```
Agent: Hello! Welcome to our restaurant. How can I help you today?
You: I'd like to book a table for tomorrow

Agent: Great! May I have your name please?
You: John Smith

Agent: Nice to meet you, John! How many guests will be joining you?
You: Four people

Agent: Perfect! A table for 4. What time would you prefer?
You: 7 PM

Agent: Excellent! What type of cuisine would you like?
You: Italian

Agent: Wonderful! What city will you be dining in?
You: London

Agent: Let me check the weather... [fetches weather]
Agent: Great news! The weather looks beautiful - 20°C and sunny! 
      Would you like outdoor seating?
You: Yes, outdoor please

Agent: Any special requests?
You: It's a birthday celebration

Agent: Perfect! Let me confirm your booking:
      - Name: John Smith
      - Guests: 4
      - Date: [tomorrow's date]
      - Time: 7:00 PM
      - Cuisine: Italian
      - Location: London
      - Seating: Outdoor
      - Special: Birthday celebration
      
      Is everything correct?
You: Yes, confirm

Agent: Excellent! Your booking is confirmed! Your booking ID is BK-ABC12345
```

## 📝 Database Schema

### Booking Object

```typescript
{
  bookingId: string;           // e.g., "BK-ABC12345"
  customerName: string;
  numberOfGuests: number;      // 1-20
  bookingDate: string;         // "YYYY-MM-DD"
  bookingTime: string;         // "HH:MM AM/PM"
  cuisinePreference: string;
  location: string;
  specialRequests?: string;
  weatherInfo?: {
    condition: string;
    temperature: number;
    description: string;
    icon: string;
    humidity?: number;
    windSpeed?: number;
  };
  seatingPreference: "indoor" | "outdoor" | "no_preference";
  status: "pending" | "confirmed" | "cancelled";
  createdAt: string;           // ISO timestamp
}
```

## 🎨 UI Components

Built with **Shadcn/UI** and **Tailwind CSS**:

- Buttons, Cards, Dialogs
- Form inputs with validation
- Toasts for notifications
- Responsive design
- Dark mode support (theme toggle available)

## 🔐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENWEATHER_API_KEY` | OpenWeatherMap API key | Yes |
| `GEMINI_API_KEY` | Google Gemini API key | Yes |
| `SESSION_SECRET` | Session encryption secret | Yes |
| `PORT` | Server port (default: 5000) | No |
| `NODE_ENV` | Environment (development/production) | No |

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

### Start Production Server

```bash
npm start
```

### Deploy to Cloud

This application can be deployed to:
- **Vercel**: For full-stack deployment
- **Heroku**: With Procfile
- **AWS**: EC2 or Elastic Beanstalk
- **Azure**: App Service
- **DigitalOcean**: App Platform

## 🐛 Troubleshooting

### "NODE_ENV is not recognized" Error
✅ Fixed! The project now uses `cross-env` for Windows compatibility.

### Microphone Not Working
- Check browser permissions for microphone access
- Ensure you're using HTTPS (or localhost)
- Web Speech API requires Chrome/Edge browser

### Gemini API Error
- Verify your `GEMINI_API_KEY` in `.env`
- Check API quota at [Google AI Studio](https://makersuite.google.com/)
- Ensure the key is active (may take a couple hours)

### Weather API Error
- Wait 2 hours for OpenWeather API key activation
- Check if the key is correctly set in `.env`
- Verify internet connection

## 📚 API Documentation

### Web Speech API
- [MDN Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)

### Google Gemini
- [Get API Key](https://makersuite.google.com/app/apikey)
- [Documentation](https://ai.google.dev/docs)

### OpenWeatherMap
- [API Documentation](https://openweathermap.org/api)

## 🎓 Learning Resources

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

## 📄 License

MIT

## 👨‍💻 Author

Built for Vaiu AI Software Developer Internship Assignment

## 🙏 Acknowledgments

- Google Gemini for AI capabilities
- OpenWeatherMap for weather data
- Shadcn for beautiful UI components
- Vercel for hosting platform

---

**Need Help?** Open an issue or contact the developer.

**Happy Booking! 🍽️**
