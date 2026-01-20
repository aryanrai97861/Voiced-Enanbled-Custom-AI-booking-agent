import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Calendar,
  Clock,
  Users,
  Utensils,
  MapPin,
  RefreshCw,
} from "lucide-react";
import type { Booking } from "@shared/schema";

interface BookingConfirmationProps {
  booking: Booking;
  onNewBooking: () => void;
}

export function BookingConfirmation({
  booking,
  onNewBooking,
}: BookingConfirmationProps) {
  return (
    <Card className="overflow-hidden" data-testid="card-booking-confirmation">
      <div className="bg-gradient-to-r from-chart-2 to-chart-3 p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Booking Confirmed!</h2>
            <p className="text-white/80 text-sm">
              Your table has been reserved
            </p>
          </div>
        </div>
      </div>

      <CardContent className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-muted-foreground">Booking ID</p>
            <p className="font-mono text-sm" data-testid="text-booking-id">
              {booking.bookingId}
            </p>
          </div>
          <Badge
            variant={booking.status === "confirmed" ? "default" : "secondary"}
            className="capitalize"
            data-testid="badge-booking-status"
          >
            {booking.status}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <ConfirmationItem
            icon={<Users className="h-4 w-4" />}
            label="Guest Name"
            value={booking.customerName}
          />
          <ConfirmationItem
            icon={<Users className="h-4 w-4" />}
            label="Party Size"
            value={`${booking.numberOfGuests} guests`}
          />
          <ConfirmationItem
            icon={<Calendar className="h-4 w-4" />}
            label="Date"
            value={formatDate(booking.bookingDate)}
          />
          <ConfirmationItem
            icon={<Clock className="h-4 w-4" />}
            label="Time"
            value={booking.bookingTime}
          />
          <ConfirmationItem
            icon={<Utensils className="h-4 w-4" />}
            label="Cuisine"
            value={booking.cuisinePreference}
          />
          <ConfirmationItem
            icon={<MapPin className="h-4 w-4" />}
            label="Location"
            value={booking.location}
          />
        </div>

        {booking.seatingPreference !== "no_preference" && (
          <div className="p-3 rounded-md bg-muted text-center">
            <p className="text-sm">
              <span className="text-muted-foreground">Seating: </span>
              <span className="font-medium capitalize">
                {booking.seatingPreference}
              </span>
            </p>
          </div>
        )}

        {booking.specialRequests && (
          <div className="p-3 rounded-md bg-muted">
            <p className="text-xs text-muted-foreground mb-1">
              Special Requests
            </p>
            <p className="text-sm">{booking.specialRequests}</p>
          </div>
        )}

        <Button
          onClick={onNewBooking}
          variant="outline"
          className="w-full"
          data-testid="button-new-booking"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Make Another Booking
        </Button>
      </CardContent>
    </Card>
  );
}

function ConfirmationItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="w-6 h-6 rounded bg-muted flex items-center justify-center text-muted-foreground flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
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
    });
  } catch {
    return dateString;
  }
}
