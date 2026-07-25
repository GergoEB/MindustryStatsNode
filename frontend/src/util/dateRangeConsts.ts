export type DateRangeOption = "1d" | "7d" | "14d" | "3m" | "12m" | "custom";

export interface DateRange {
  label: string;
  value: DateRangeOption;
  hours?: number;
}

export const DATE_RANGE_OPTIONS: DateRange[] = [
  { label: "1 Day", value: "1d", hours: 24 },
  { label: "7 Days", value: "7d", hours: 168 },
  { label: "14 Days", value: "14d", hours: 336 },
  { label: "3 Months", value: "3m", hours: 2190 },
  { label: "12 Months", value: "12m", hours: 8760 },
  { label: "Custom", value: "custom" },
];