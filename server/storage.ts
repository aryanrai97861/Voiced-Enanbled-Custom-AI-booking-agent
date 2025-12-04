import type { Booking, InsertBooking } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getBooking(id: string): Promise<Booking | undefined>;
  getAllBookings(): Promise<Booking[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBookingStatus(id: string, status: Booking["status"]): Promise<Booking | undefined>;
  deleteBooking(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private bookings: Map<string, Booking>;

  constructor() {
    this.bookings = new Map();
  }

  async getBooking(id: string): Promise<Booking | undefined> {
    return this.bookings.get(id);
  }

  async getAllBookings(): Promise<Booking[]> {
    return Array.from(this.bookings.values()).sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const bookingId = `BK-${randomUUID().slice(0, 8).toUpperCase()}`;
    const booking: Booking = {
      ...insertBooking,
      bookingId,
      status: "confirmed",
      createdAt: new Date().toISOString(),
    };
    this.bookings.set(bookingId, booking);
    return booking;
  }

  async updateBookingStatus(
    id: string,
    status: Booking["status"]
  ): Promise<Booking | undefined> {
    const booking = this.bookings.get(id);
    if (!booking) {
      return undefined;
    }
    const updated = { ...booking, status };
    this.bookings.set(id, updated);
    return updated;
  }

  async deleteBooking(id: string): Promise<boolean> {
    const exists = this.bookings.has(id);
    if (exists) {
      const booking = this.bookings.get(id)!;
      booking.status = "cancelled";
      this.bookings.set(id, booking);
    }
    return exists;
  }
}

export const storage = new MemStorage();
