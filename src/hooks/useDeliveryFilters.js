import { useEffect, useMemo, useState } from "react";
import {
  DELIVERY_FILTERS,
  getDeliveryFilterKey,
  includeRentalByDeliveryFilter,
} from "../utils/deliveryFormatting";
import {
  filterRentalsByMonth,
  generateMonthOptions,
  monthStringFromDate,
} from "../utils/monthFiltering";

const DEFAULT_FILTER = "needs_action";

export function useDeliveryFilters({ allRentals, searchParams, setSearchParams }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState(
    () => searchParams.get("filter") || DEFAULT_FILTER
  );
  const [selectedMonth, setSelectedMonth] = useState(
    () => searchParams.get("month") || ""
  );
  const [highlightId, setHighlightId] = useState(
    () => searchParams.get("rentalId") || null
  );

  useEffect(() => {
    setSelectedMonth(searchParams.get("month") || "");
    setHighlightId(searchParams.get("rentalId"));
  }, [searchParams]);

  const filteredBySearch = useMemo(() => {
    if (!searchTerm) return allRentals;
    const query = searchTerm.toLowerCase();
    return allRentals.filter((rental) => {
      const fullName = `${rental.users?.first_name || ""} ${rental.users?.last_name || ""}`.toLowerCase();
      return (
        fullName.includes(query) ||
        rental.users?.email?.toLowerCase().includes(query) ||
        rental.cameras?.name?.toLowerCase().includes(query)
      );
    });
  }, [allRentals, searchTerm]);

  const monthFilteredRentals = useMemo(() => {
    if (!selectedMonth) return filteredBySearch;
    return filterRentalsByMonth(filteredBySearch, selectedMonth);
  }, [filteredBySearch, selectedMonth]);

  const rentals = useMemo(() => {
    return monthFilteredRentals.filter((rental) =>
      includeRentalByDeliveryFilter(rental, selectedFilter)
    );
  }, [monthFilteredRentals, selectedFilter]);

  const filterCounts = useMemo(() => {
    const base = selectedMonth ? monthFilteredRentals : allRentals;
    return DELIVERY_FILTERS.reduce((acc, filter) => {
      acc[filter.key] = base.filter((rental) =>
        includeRentalByDeliveryFilter(rental, filter.key)
      ).length;
      return acc;
    }, {});
  }, [allRentals, monthFilteredRentals, selectedMonth]);

  useEffect(() => {
    if (!highlightId) return;
    const target = allRentals.find((rental) => String(rental.id) === String(highlightId));
    if (!target) return;
    const requiredFilter = getDeliveryFilterKey(target);
    if (requiredFilter !== selectedFilter) {
      setSelectedFilter(requiredFilter);
      const params = new URLSearchParams(searchParams);
      params.set("filter", requiredFilter);
      setSearchParams(params, { replace: true });
    }
  }, [highlightId, allRentals, selectedFilter, searchParams, setSearchParams]);

  const highlightRental = useMemo(() => {
    if (!highlightId) return null;
    return allRentals.find((rental) => String(rental.id) === String(highlightId)) || null;
  }, [allRentals, highlightId]);

  const handleFilterChange = (filterKey) => {
    setSelectedFilter(filterKey);
    const params = new URLSearchParams(searchParams);
    params.set("filter", filterKey);
    setSearchParams(params, { replace: true });
  };

  const handleMonthChange = (month) => {
    setSelectedMonth(month);
    const params = new URLSearchParams(searchParams);
    if (month) {
      params.set("month", month);
    } else {
      params.delete("month");
    }
    setSearchParams(params, { replace: true });
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

  const setHighlightParam = (nextId) => {
    const params = new URLSearchParams(searchParams);
    if (nextId) {
      params.set("rentalId", nextId);
    } else {
      params.delete("rentalId");
    }
    setSearchParams(params, { replace: true });
    setHighlightId(nextId || null);
  };

  const monthOptions = useMemo(() => generateMonthOptions(), []);

  return {
    rentals,
    searchTerm,
    setSearchTerm,
    selectedFilter,
    handleFilterChange,
    selectedMonth,
    handleMonthChange,
    handlePrevMonth,
    handleNextMonth,
    monthOptions,
    filterCounts,
    highlightId,
    highlightRental,
    setHighlightParam,
  };
}
export { DELIVERY_FILTERS };
