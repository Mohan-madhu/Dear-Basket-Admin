export function normalizeDate(input) {
  if (!input) return null;
  const date =
    typeof input === "string" || typeof input === "number"
      ? new Date(input)
      : new Date(input);

  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

export function hasValidBookingDates(booking) {
  if (!booking?.bookingstartdate || !booking?.bookingenddate) return false;
  return Boolean(
    normalizeDate(booking.bookingstartdate) &&
      normalizeDate(booking.bookingenddate)
  );
}

export function getValidBookings(bookings) {
  return Array.isArray(bookings) ? bookings.filter(hasValidBookingDates) : [];
}

export function getBookingPhase(bookings) {
  const today = normalizeDate(new Date());
  const validBookings = getValidBookings(bookings).sort((a, b) => {
    const aEnd = normalizeDate(a.bookingenddate)?.getTime() || 0;
    const bEnd = normalizeDate(b.bookingenddate)?.getTime() || 0;
    return bEnd - aEnd;
  });

  if (!today || validBookings.length === 0) {
    return {
      phase: "not_booked",
      activeBookings: [],
      latestBooking: null,
      validBookings: [],
    };
  }

  const activeBookings = validBookings.filter((booking) => {
    const start = normalizeDate(booking.bookingstartdate);
    const end = normalizeDate(booking.bookingenddate);
    return start && end && today >= start && today <= end;
  });

  if (activeBookings.length > 0) {
    return {
      phase: "active",
      activeBookings,
      latestBooking: activeBookings[0],
      validBookings,
    };
  }

  const futureBookings = validBookings
    .filter((booking) => {
      const start = normalizeDate(booking.bookingstartdate);
      return start && today < start;
    })
    .sort((a, b) => {
      const aStart = normalizeDate(a.bookingstartdate)?.getTime() || 0;
      const bStart = normalizeDate(b.bookingstartdate)?.getTime() || 0;
      return aStart - bStart;
    });

  if (futureBookings.length > 0) {
    return {
      phase: "future",
      activeBookings: futureBookings,
      latestBooking: futureBookings[0],
      validBookings,
    };
  }

  return {
    phase: "expired",
    activeBookings: [],
    latestBooking: validBookings[0],
    validBookings,
  };
}

export function formatDisplayDate(value) {
  const date = normalizeDate(value);
  if (!date) return "N/A";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
