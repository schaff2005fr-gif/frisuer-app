export type BookingStatus = "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

export type WorkingHoursRow = {
  day: number; // 0=So ... 6=Sa
  isOpen: boolean;
  startMin: number;
  endMin: number;
};

export type AppSettings = {
  stepMin: number;
  workingHours: WorkingHoursRow[];
  extendIfFirstHourFull: boolean;
  extendStepMin: number;
  earliestLimitMin: number;
};

export type BookingView = {
  id: number;
  status: BookingStatus;
  customer: { id: number; name: string; phone: string | null } | null;
  service: { key: string; name: string; durationMin: number } | null;
  windowStart: number;
  windowEnd: number;
  exactTime: number | null;
  timeHHMM: string | null;
  note: string | null;
  createdAt: string;
};

export type DayBookingsResponse = {
  date: string;
  count: number;
  bookings: BookingView[];
};
