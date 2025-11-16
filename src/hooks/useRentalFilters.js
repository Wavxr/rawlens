import { useEffect, useMemo, useState } from "react";

const DEFAULT_STATUS = "needs_action";

const STATUS_FILTERS = [
  { key: "needs_action", label: "Needs Action" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "payment_pending", label: "Payment Pending" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const MONTH_RANGE = { past: 6, future: 12 };

export function needsAdminAction(rental) {
  return (
    rental.rental_status === "pending" ||
    (rental.rental_status === "confirmed" &&
      rental.shipping_status === "in_transit_to_owner")
  );
}

function doesRentalOverlapMonth(rental, monthString) {
  if (!monthString) return true;
  const rentalStart = new Date(rental.start_date);
  const rentalEnd = new Date(rental.end_date);
  const [year, month] = monthString.split("-").map(Number);
  const filterMonthStart = new Date(year, month - 1, 1);
  const filterMonthEnd = new Date(year, month, 0);
  return rentalStart <= filterMonthEnd && rentalEnd >= filterMonthStart;
}

function matchesSearchTerm(rental, term) {
  if (!term) return true;
  const searchLower = term.toLowerCase();
  const fullName = `${rental.users?.first_name || ""} ${rental.users?.last_name || ""}`.toLowerCase();
  return (
    fullName.includes(searchLower) ||
    rental.users?.email?.toLowerCase().includes(searchLower) ||
    rental.cameras?.name?.toLowerCase().includes(searchLower)
  );
}

function includeByStatus(rental, status) {
  if (status === "needs_action") {
    return needsAdminAction(rental);
  }
  if (status === "payment_pending") {
    return (
      rental.rental_status === "confirmed" &&
      rental.payment_status === "submitted"
    );
  }
  return rental.rental_status === status;
}

function filterRentals(rentals, { status, searchTerm, selectedMonth }) {
  return rentals.filter((rental) =>
    includeByStatus(rental, status) &&
    matchesSearchTerm(rental, searchTerm) &&
    doesRentalOverlapMonth(rental, selectedMonth)
  );
}

function getMonthOptions() {
  const options = [{ value: "", label: "All Months" }];
  const currentDate = new Date();
  for (let offset = -MONTH_RANGE.past; offset <= MONTH_RANGE.future; offset += 1) {
    const date = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + offset,
      1
    );
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });
    options.push({ value, label });
  }
  return options;
}

function monthStringFromDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function deriveFilterStatus(rental) {
  if (needsAdminAction(rental)) return "needs_action";
  if (
    rental.rental_status === "confirmed" &&
    rental.payment_status === "submitted"
  ) {
    return "payment_pending";
  }
  return rental.rental_status;
}

function buildStatusFilters(allRentals, selectedMonth) {
  const base = allRentals.filter((rental) =>
    doesRentalOverlapMonth(rental, selectedMonth)
  );
  return STATUS_FILTERS.map((filter) => {
    const count = base.filter((rental) => includeByStatus(rental, filter.key)).length;
    return { ...filter, count };
  });
}

export function useRentalFilters({ allRentals, searchParams, setSearchParams }) {
  const [selectedStatus, setSelectedStatus] = useState(
    () => searchParams.get("status") || DEFAULT_STATUS
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(
    () => searchParams.get("month") || ""
  );
  const [highlightId, setHighlightId] = useState(
    () => searchParams.get("highlightId") || null
  );

  useEffect(() => {
    setHighlightId(searchParams.get("highlightId"));
  }, [searchParams]);

  useEffect(() => {
    const statusParam = searchParams.get("status") || DEFAULT_STATUS;
    setSelectedStatus((prevStatus) => {
      if (prevStatus === statusParam) return prevStatus;
      console.log("[RentalFilters] Syncing status from search params", {
        statusParam,
        previousStatus: prevStatus,
      });
      return statusParam;
    });

    const monthParam = searchParams.get("month") || "";
    setSelectedMonth((prevMonth) => {
      if (prevMonth === monthParam) return prevMonth;
      console.log("[RentalFilters] Syncing month from search params", {
        monthParam,
        previousMonth: prevMonth,
      });
      return monthParam;
    });
  }, [searchParams]);

  const highlightRental = useMemo(() => {
    if (!highlightId || !allRentals.length) return null;
    return allRentals.find((rental) => String(rental.id) === String(highlightId)) || null;
  }, [allRentals, highlightId]);

  useEffect(() => {
    if (!highlightRental) return;
    const visibleWithCurrentFilters = filterRentals(allRentals, {
      status: selectedStatus,
      searchTerm,
      selectedMonth,
    }).some((rental) => String(rental.id) === String(highlightRental.id));
    if (!visibleWithCurrentFilters) {
      const nextStatus = deriveFilterStatus(highlightRental);
      if (nextStatus !== selectedStatus) {
        setSelectedStatus(nextStatus);
        const params = new URLSearchParams(searchParams);
        params.set("status", nextStatus);
        setSearchParams(params);
      }
    }
  }, [
    highlightRental,
    allRentals,
    selectedStatus,
    searchTerm,
    selectedMonth,
    searchParams,
    setSearchParams,
  ]);

  const filteredRentals = useMemo(() => {
    const base = filterRentals(allRentals, {
      status: selectedStatus,
      searchTerm,
      selectedMonth,
    });
    if (!highlightRental) return base;
    const isAlreadyIncluded = base.some(
      (rental) => String(rental.id) === String(highlightRental.id)
    );
    if (isAlreadyIncluded) return base;
    const allIds = new Set();
    const merged = [highlightRental, ...base].filter((rental) => {
      const id = String(rental.id);
      if (allIds.has(id)) return false;
      allIds.add(id);
      return true;
    });
    return merged;
  }, [allRentals, selectedStatus, searchTerm, selectedMonth, highlightRental]);

  const statusFilters = useMemo(
    () => buildStatusFilters(allRentals, selectedMonth),
    [allRentals, selectedMonth]
  );

  const monthOptions = useMemo(() => getMonthOptions(), []);

  const handleStatusChange = (status) => {
    console.log("[RentalFilters] handleStatusChange", {
      currentStatus: selectedStatus,
      nextStatus: status,
    });
    setSelectedStatus(status);
    const params = new URLSearchParams(searchParams);
    params.set("status", status);
    setSearchParams(params);
  };

  const handleMonthChange = (month) => {
    setSelectedMonth(month);
    const params = new URLSearchParams(searchParams);
    if (month) {
      params.set("month", month);
    } else {
      params.delete("month");
    }
    setSearchParams(params);
  };

  const handlePrevMonth = () => {
    const base = selectedMonth
      ? (() => {
          const [year, month] = selectedMonth.split("-").map(Number);
          return new Date(year, month - 1, 1);
        })()
      : new Date();
    const previous = new Date(base.getFullYear(), base.getMonth() - 1, 1);
    handleMonthChange(monthStringFromDate(previous));
  };

  const handleNextMonth = () => {
    const base = selectedMonth
      ? (() => {
          const [year, month] = selectedMonth.split("-").map(Number);
          return new Date(year, month - 1, 1);
        })()
      : new Date();
    const next = new Date(base.getFullYear(), base.getMonth() + 1, 1);
    handleMonthChange(monthStringFromDate(next));
  };

  return {
    rentals: filteredRentals,
    searchTerm,
    setSearchTerm,
    selectedStatus,
    handleStatusChange,
    selectedMonth,
    handleMonthChange,
    handlePrevMonth,
    handleNextMonth,
    monthOptions,
    statusFilters,
    highlightId,
    setHighlightId,
    setHighlightParam: (nextId) => {
      const params = new URLSearchParams(searchParams);
      if (nextId) {
        params.set("highlightId", nextId);
      } else {
        params.delete("highlightId");
      }
      setSearchParams(params);
      setHighlightId(nextId || null);
    },
    highlightRental,
  };
}
