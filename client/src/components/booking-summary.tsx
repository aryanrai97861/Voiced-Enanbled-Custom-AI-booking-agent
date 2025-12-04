import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Calendar,
  Clock,
  Utensils,
  MapPin,
  Cloud,
  MessageSquare,
  Check,
  X,
  Sun,
  CloudRain,
  CloudSnow,
  CloudFog,
  Wind,
} from "lucide-react";
import type { BookingContext, WeatherInfo } from "@shared/schema";

interface BookingSummaryProps {
  context: BookingContext;
  onConfirm?: () => void;
  onCancel?: () => void;
  isConfirming?: boolean;
  showActions?: boolean;
}

export function BookingSummary({
  context,
  onConfirm,
  onCancel,
  isConfirming = false,
  showActions = false,
}: BookingSummaryProps) {
  const hasAnyData =
    context.customerName ||
    context.numberOfGuests ||
    context.bookingDate ||
    context.bookingTime ||
    context.cuisinePreference ||
    context.location;

  if (!hasAnyData) {
    return null;
  }

  const getProgressPercent = () => {
    let filled = 0;
    const required = ["customerName", "numberOfGuests", "bookingDate", "bookingTime", "cuisinePreference", "location"];
    required.forEach((field) => {
      if (context[field as keyof BookingContext]) filled++;
    });
    return Math.round((filled / required.length) * 100);
  };

  return (
    <Card data-testid="card-booking-summary">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-lg">Booking Details</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {getProgressPercent()}% complete
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {context.customerName && (
            <DetailItem
              icon={<Users className="h-4 w-4" />}
              label="Name"
              value={context.customerName}
              testId="text-customer-name"
            />
          )}
          {context.numberOfGuests && (
            <DetailItem
              icon={<Users className="h-4 w-4" />}
              label="Guests"
              value={`${context.numberOfGuests} ${context.numberOfGuests === 1 ? "guest" : "guests"}`}
              testId="text-guest-count"
            />
          )}
          {context.bookingDate && (
            <DetailItem
              icon={<Calendar className="h-4 w-4" />}
              label="Date"
              value={formatDate(context.bookingDate)}
              testId="text-booking-date"
            />
          )}
          {context.bookingTime && (
            <DetailItem
              icon={<Clock className="h-4 w-4" />}
              label="Time"
              value={context.bookingTime}
              testId="text-booking-time"
            />
          )}
          {context.cuisinePreference && (
            <DetailItem
              icon={<Utensils className="h-4 w-4" />}
              label="Cuisine"
              value={context.cuisinePreference}
              testId="text-cuisine"
            />
          )}
          {context.location && (
            <DetailItem
              icon={<MapPin className="h-4 w-4" />}
              label="Location"
              value={context.location}
              testId="text-location"
            />
          )}
        </div>

        {context.weatherInfo && (
          <WeatherCard weather={context.weatherInfo} />
        )}

        {context.seatingPreference && context.seatingPreference !== "no_preference" && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-muted">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              {context.seatingPreference === "outdoor" ? (
                <Sun className="h-4 w-4 text-primary" />
              ) : (
                <Cloud className="h-4 w-4 text-primary" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium">Seating Preference</p>
              <p className="text-xs text-muted-foreground capitalize" data-testid="text-seating">
                {context.seatingPreference} seating
              </p>
            </div>
          </div>
        )}

        {context.specialRequests && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-muted">
            <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">Special Requests</p>
              <p className="text-xs text-muted-foreground" data-testid="text-special-requests">
                {context.specialRequests}
              </p>
            </div>
          </div>
        )}

        {showActions && context.step === "confirm_booking" && (
          <div className="flex gap-2 pt-2">
            <Button
              onClick={onConfirm}
              disabled={isConfirming}
              className="flex-1"
              data-testid="button-confirm-booking"
            >
              <Check className="h-4 w-4 mr-2" />
              Confirm Booking
            </Button>
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isConfirming}
              data-testid="button-cancel-booking"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DetailItem({
  icon,
  label,
  value,
  testId,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  testId: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate" data-testid={testId}>
          {value}
        </p>
      </div>
    </div>
  );
}

function WeatherCard({ weather }: { weather: WeatherInfo }) {
  const getWeatherIcon = () => {
    const condition = weather.condition.toLowerCase();
    if (condition.includes("rain") || condition.includes("drizzle")) {
      return <CloudRain className="h-6 w-6" />;
    }
    if (condition.includes("snow")) {
      return <CloudSnow className="h-6 w-6" />;
    }
    if (condition.includes("fog") || condition.includes("mist")) {
      return <CloudFog className="h-6 w-6" />;
    }
    if (condition.includes("wind")) {
      return <Wind className="h-6 w-6" />;
    }
    if (condition.includes("cloud")) {
      return <Cloud className="h-6 w-6" />;
    }
    return <Sun className="h-6 w-6" />;
  };

  return (
    <div className="p-4 rounded-md bg-gradient-to-br from-chart-3/10 to-chart-2/10 border border-chart-3/20" data-testid="card-weather">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-background/80 flex items-center justify-center text-chart-3">
            {getWeatherIcon()}
          </div>
          <div>
            <p className="text-sm font-medium" data-testid="text-weather-condition">
              {weather.description}
            </p>
            <p className="text-xs text-muted-foreground">Weather forecast</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold" data-testid="text-weather-temp">
            {Math.round(weather.temperature)}°C
          </p>
          {weather.humidity && (
            <p className="text-xs text-muted-foreground">
              Humidity: {weather.humidity}%
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
}
