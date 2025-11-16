export function doesRentalOverlapMonth(rental, monthString) {
  if (!monthString) return true;
  const rentalStart = new Date(rental.start_date);
  const rentalEnd = new Date(rental.end_date);
  const [year, month] = monthString.split("-").map(Number);
  const filterMonthStart = new Date(year, month - 1, 1);
  const filterMonthEnd = new Date(year, month, 0);
  return rentalStart <= filterMonthEnd && rentalEnd >= filterMonthStart;
}

export function filterRentalsByMonth(rentals, monthString) {
  if (!monthString) return rentals;
  return rentals.filter((rental) => doesRentalOverlapMonth(rental, monthString));
}

export function monthStringFromDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function generateMonthOptions(range = { past: 6, future: 12 }) {
  const options = [{ value: "", label: "All Months" }];
  const currentDate = new Date();
  for (let offset = -range.past; offset <= range.future; offset += 1) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
    options.push({ value, label });
  }
  return options;
}
