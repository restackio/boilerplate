import type { Column, FiltersState } from "../core/types";
import {
  optionFilterFn,
  multiOptionFilterFn,
  textFilterFn,
  numberFilterFn,
  dateFilterFn,
} from "./filter-fns";

/**
 * Applies client-side filtering to data based on the current filters state
 */
export function applyClientFilters<TData>(
  data: TData[],
  columns: Column<TData>[],
  filters: FiltersState
): TData[] {
  if (filters.length === 0) {
    return data;
  }

  return data.filter((row) => {
    // All filters must pass for the row to be included
    return filters.every((filter) => {
      const column = columns.find((col) => col.id === filter.columnId);
      if (!column) return true; // If column not found, don't filter

      const value = column.accessor(row);

      switch (filter.type) {
        case "text":
          return textFilterFn(value as string, filter as any);
        case "option":
          return optionFilterFn(value as string, filter as any);
        case "multiOption":
          return multiOptionFilterFn(value as string[], filter as any);
        case "number":
          return numberFilterFn(value as number, filter as any);
        case "date":
          return dateFilterFn(value as Date, filter as any);
        default:
          return true;
      }
    });
  });
}
