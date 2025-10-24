export default function DateFilterInput({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  minStartDate = null,
  minEndDate = null,
  disabled = false,
  idPrefix = "date-filter",
  layout = "vertical",
  ignoreStartMin = false,
  theme = "light",
}) {
  const isDark = theme === "dark";

  // ---------- Date Calculation ----------
  const getPhilippinesToday = () =>
    new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));

  const isAfterCutoffHour = (date, cutoffHour = 17) =>
    date.getHours() >= cutoffHour;

  const getDefaultMinStartDate = () => {
    if (minStartDate) return minStartDate;

    const todayPH = getPhilippinesToday();
    const startDate =
      isAfterCutoffHour(todayPH) ? addDays(todayPH, 1) : todayPH;

    return formatAsISODate(startDate);
  };

  const addDays = (date, days) => {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
  };

  const formatAsISODate = (date) => date.toISOString().split("T")[0];

  const calculatedMinStartDate = ignoreStartMin ? null : getDefaultMinStartDate();
  const calculatedMinEndDate =
    minEndDate || startDate || (!ignoreStartMin ? calculatedMinStartDate : undefined);

  // ---------- Layout ----------
  const containerClass =
    layout === "horizontal"
      ? "w-full grid grid-cols-2 gap-4"
      : "w-full space-y-3";

  const labelClass = isDark
    ? "block text-xs mb-1.5 text-gray-300"
    : "block text-xs text-gray-600 mb-1.5";

  const inputClass = [
    "w-full px-3 py-2.5 text-sm rounded-lg border focus:outline-none focus:ring-2 transition-all duration-150",
    isDark
      ? "bg-gray-800 border-gray-600 text-gray-100 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-700 disabled:text-gray-400"
      : "bg-white border-gray-300 focus:ring-[#052844] focus:border-[#052844] disabled:bg-gray-100 disabled:text-gray-500",
  ].join(" ");

  // ---------- Render ----------
  return (
    <div className={containerClass}>
      <DateInput
        id={`${idPrefix}-start-date`}
        label="Start Date"
        value={startDate}
        onChange={onStartDateChange}
        min={!ignoreStartMin ? calculatedMinStartDate : undefined}
        disabled={disabled}
        labelClass={labelClass}
        inputClass={inputClass}
      />

      <DateInput
        id={`${idPrefix}-end-date`}
        label="End Date"
        value={endDate}
        onChange={onEndDateChange}
        min={calculatedMinEndDate}
        disabled={disabled}
        labelClass={labelClass}
        inputClass={inputClass}
      />
    </div>
  );
}

// ---------- Helper Component ----------
function DateInput({ id, label, value, onChange, min, disabled, labelClass, inputClass }) {
  return (
    <div className="relative">
      <label htmlFor={id} className={labelClass}>{label}</label>
      <input
        type="date"
        id={id}
        value={value}
        onChange={onChange}
        min={min}
        disabled={disabled}
        className={inputClass}
      />
    </div>
  );
}
