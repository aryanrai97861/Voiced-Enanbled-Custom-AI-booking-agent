import type { WeatherInfo } from "@shared/schema";

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || "";
const BASE_URL = "https://api.openweathermap.org/data/2.5";

interface OpenWeatherResponse {
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  main: {
    temp: number;
    humidity: number;
  };
  wind: {
    speed: number;
  };
  name: string;
}

interface ForecastResponse {
  list: Array<{
    dt: number;
    dt_txt: string;
    weather: Array<{
      main: string;
      description: string;
      icon: string;
    }>;
    main: {
      temp: number;
      humidity: number;
    };
    wind: {
      speed: number;
    };
  }>;
  city: {
    name: string;
  };
}

export async function getWeatherForDate(
  date: string,
  location: string
): Promise<WeatherInfo | null> {
  if (!OPENWEATHER_API_KEY) {
    console.warn("OpenWeather API key not configured, using mock data");
    return getMockWeather(date);
  }

  try {
    const targetDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return getMockWeather(date);
    }

    if (diffDays <= 5) {
      return await getForecastWeather(location, date);
    } else {
      return await getCurrentWeatherAsEstimate(location);
    }
  } catch (error) {
    console.error("Weather API error:", error);
    return getMockWeather(date);
  }
}

async function getForecastWeather(
  location: string,
  date: string
): Promise<WeatherInfo | null> {
  const url = `${BASE_URL}/forecast?q=${encodeURIComponent(location)}&appid=${OPENWEATHER_API_KEY}&units=metric`;

  const response = await fetch(url);
  
  if (!response.ok) {
    if (response.status === 401) {
      console.error("Invalid OpenWeather API key");
    }
    throw new Error(`Weather API error: ${response.status}`);
  }

  const data: ForecastResponse = await response.json();
  
  const targetDate = date.split("T")[0];
  const targetForecast = data.list.find((item) => {
    const itemDate = item.dt_txt.split(" ")[0];
    const itemHour = parseInt(item.dt_txt.split(" ")[1].split(":")[0]);
    return itemDate === targetDate && itemHour >= 12 && itemHour <= 15;
  });

  const forecast = targetForecast || data.list.find((item) => {
    const itemDate = item.dt_txt.split(" ")[0];
    return itemDate === targetDate;
  }) || data.list[0];

  if (!forecast) {
    return null;
  }

  return {
    condition: forecast.weather[0].main,
    temperature: forecast.main.temp,
    description: capitalizeWords(forecast.weather[0].description),
    icon: forecast.weather[0].icon,
    humidity: forecast.main.humidity,
    windSpeed: forecast.wind.speed,
  };
}

async function getCurrentWeatherAsEstimate(
  location: string
): Promise<WeatherInfo | null> {
  const url = `${BASE_URL}/weather?q=${encodeURIComponent(location)}&appid=${OPENWEATHER_API_KEY}&units=metric`;

  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status}`);
  }

  const data: OpenWeatherResponse = await response.json();

  return {
    condition: data.weather[0].main,
    temperature: data.main.temp,
    description: `${capitalizeWords(data.weather[0].description)} (estimate)`,
    icon: data.weather[0].icon,
    humidity: data.main.humidity,
    windSpeed: data.wind.speed,
  };
}

function getMockWeather(date: string): WeatherInfo {
  const dateHash = date.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  const conditions = [
    { condition: "Clear", description: "Clear sky", temp: 25 },
    { condition: "Clouds", description: "Partly cloudy", temp: 22 },
    { condition: "Rain", description: "Light rain", temp: 18 },
    { condition: "Sunny", description: "Sunny and warm", temp: 28 },
  ];
  
  const selected = conditions[dateHash % conditions.length];
  
  return {
    condition: selected.condition,
    temperature: selected.temp + (dateHash % 5) - 2,
    description: selected.description,
    icon: "01d",
    humidity: 50 + (dateHash % 30),
    windSpeed: 2 + (dateHash % 8),
  };
}

function capitalizeWords(str: string): string {
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export async function validateLocation(location: string): Promise<boolean> {
  if (!OPENWEATHER_API_KEY) {
    return true;
  }

  try {
    const url = `${BASE_URL}/weather?q=${encodeURIComponent(location)}&appid=${OPENWEATHER_API_KEY}`;
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}
