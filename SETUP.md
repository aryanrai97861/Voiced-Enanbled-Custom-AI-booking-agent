# 🚀 Setup Instructions

## Prerequisites Checklist

Before you begin, make sure you have:

- ✅ Node.js 18 or higher installed
- ✅ npm (comes with Node.js)
- ✅ A modern browser (Chrome or Edge recommended for voice features)
- ✅ Internet connection
- ✅ Microphone access for voice input

## Step-by-Step Setup

### 1. Get Your API Keys

#### Google Gemini API Key (Required)

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Get API Key" or "Create API Key"
4. Copy your API key
5. **Important**: The key is free but has usage limits

#### OpenWeatherMap API Key (Already Provided)

The OpenWeatherMap API key is already included in the `.env` file:


**Note**: This key may take 1-2 hours to activate after signup.

### 2. Install Dependencies

Open your terminal in the project directory and run:

```bash
npm install
```

This will install all required packages including:
- React and React DOM
- Express.js
- Google Gemini AI SDK
- TypeScript and build tools
- UI components (Shadcn/UI)
- And many more...

### 3. Configure Environment Variables

1. Open the `.env` file in the root directory
2. Replace `your_gemini_api_key_here` with your actual Gemini API key:

```env
GEMINI_API_KEY=AIzaSy... # Your actual key here
```

3. Optionally change the session secret:

```env
SESSION_SECRET=a-long-random-string-for-security
```

### 4. Start the Development Server

Run the following command:

```bash
npm run dev
```

You should see output like:
```
12:08:43 PM [express] serving on port 5000
```

### 5. Access the Application

Open your browser and navigate to:
```
http://localhost:5000
```

### 6. Test Voice Features

1. Click on the voice agent page
2. Allow microphone permissions when prompted
3. Click the microphone button 🎤
4. Start speaking: "I'd like to book a table"
5. Follow the conversation flow

## Common Issues & Solutions

### Issue: "NODE_ENV is not recognized"
**Solution**: Already fixed! The project uses `cross-env` for Windows compatibility.

### Issue: "Cannot find module 'dotenv'"
**Solution**: Run `npm install` to install all dependencies.

### Issue: Microphone not working
**Solutions**:
- Check browser permissions (click the lock icon in address bar)
- Use Chrome or Edge browser (Safari has limited support)
- Ensure you're using HTTPS or localhost
- Check your system microphone settings

### Issue: "Gemini API error"
**Solutions**:
- Verify your API key is correctly copied (no extra spaces)
- Check your API key is active at [Google AI Studio](https://makersuite.google.com/)
- Ensure you haven't exceeded the free tier limits
- Try regenerating the API key

### Issue: "Weather API error" or "401 Unauthorized"
**Solutions**:
- Wait 1-2 hours for the API key to activate
- Check the key in `.env` matches: `17dfdc56fd57a7a98261541bb6405a24`
- Verify internet connection
- Try accessing: `http://api.openweathermap.org/data/2.5/weather?q=London&APPID=17dfdc56fd57a7a98261541bb6405a24`

### Issue: Port 5000 already in use
**Solution**: Change the PORT in `.env` file:
```env
PORT=3000
```

### Issue: "Module not found" errors
**Solution**: Delete `node_modules` and reinstall:
```bash
rm -rf node_modules
npm install
```

## Testing the Application

### Manual Test Flow

1. **Start Conversation**
   - Click microphone or type: "Hello" or "I want to book a table"

2. **Provide Name**
   - Say: "My name is John Smith"

3. **Number of Guests**
   - Say: "4 people" or "Table for 4"

4. **Booking Date**
   - Say: "Tomorrow" or "December 15th"

5. **Booking Time**
   - Say: "7 PM" or "19:00"

6. **Cuisine Preference**
   - Say: "Italian" or "Chinese food"

7. **Location**
   - Say: "London" or "New York"

8. **Weather Check**
   - The system automatically fetches weather
   - Agent suggests indoor/outdoor seating

9. **Special Requests**
   - Say: "Birthday celebration" or "Vegetarian menu"

10. **Confirm Booking**
    - Say: "Yes, confirm" or "That's correct"

### Expected Result

You should receive a confirmation with a booking ID like:
```
Your booking is confirmed! Booking ID: BK-ABC12345
```

The booking will be stored and visible in the bookings list.

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run check` | Type check with TypeScript |

## Browser Requirements

### Fully Supported
- ✅ Chrome 25+ (Windows, Mac, Linux)
- ✅ Edge 79+ (Windows, Mac)

### Partially Supported
- ⚠️ Safari 14.1+ (Mac, iOS) - Limited voice features
- ⚠️ Firefox - Text input only (no Web Speech API)

### Not Supported
- ❌ Internet Explorer
- ❌ Opera Mini
- ❌ Older browsers

## Project Structure

```
AskNeedMake/
├── client/               # Frontend (React + TypeScript)
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── hooks/        # Custom hooks (use-speech.ts)
│   │   ├── pages/        # Page components
│   │   └── lib/          # Utilities
│   └── index.html
├── server/               # Backend (Express + TypeScript)
│   ├── index.ts          # Entry point
│   ├── routes.ts         # API endpoints
│   ├── gemini.ts         # AI integration
│   ├── weather.ts        # Weather API
│   └── storage.ts        # Data storage
├── shared/               # Shared types
│   └── schema.ts         # Zod schemas
├── .env                  # Environment variables
├── package.json          # Dependencies
└── README.md             # Documentation
```

## API Endpoints

### Chat Endpoint
```http
POST /api/chat
Content-Type: application/json

{
  "message": "I want to book a table",
  "context": {
    "step": "greeting"
  }
}
```

### Create Booking
```http
POST /api/bookings
Content-Type: application/json

{
  "customerName": "John Smith",
  "numberOfGuests": 4,
  "bookingDate": "2025-12-10",
  "bookingTime": "7:00 PM",
  "cuisinePreference": "Italian",
  "location": "London",
  "seatingPreference": "outdoor"
}
```

### Get All Bookings
```http
GET /api/bookings
```

### Get Single Booking
```http
GET /api/bookings/:id
```

### Cancel Booking
```http
DELETE /api/bookings/:id
```

## Next Steps

1. ✅ Get Gemini API key
2. ✅ Install dependencies (`npm install`)
3. ✅ Configure `.env` file
4. ✅ Run `npm run dev`
5. ✅ Open http://localhost:5000
6. ✅ Allow microphone access
7. ✅ Start booking!

## Need Help?

- **Documentation**: See main README.md
- **API Issues**: Check API keys and internet connection
- **Voice Issues**: Verify browser and microphone permissions
- **Other Issues**: Check the troubleshooting section

## Additional Resources

- [Google Gemini Documentation](https://ai.google.dev/docs)
- [OpenWeatherMap API](https://openweathermap.org/api)
- [Web Speech API Guide](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

**Ready to Start?** Run `npm run dev` and open http://localhost:5000

Happy Booking! 🎉
