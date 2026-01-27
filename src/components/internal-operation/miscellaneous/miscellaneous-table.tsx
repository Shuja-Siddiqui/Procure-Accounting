import { useState, useMemo } from "react";
import { TransactionTable, type TransactionTableItem } from "../shared/transaction-table";
import { FiltersSection } from "../shared/filters-section";

interface MiscellaneousTransaction extends TransactionTableItem {}

interface MiscellaneousTableProps {
  miscellaneous: MiscellaneousTransaction[];
  isLoading: boolean;
  onView: (miscellaneous: MiscellaneousTransaction) => void;
  filters: {
    source_account_id?: string;
    date_from?: string;
    date_to?: string;
  };
  onFiltersChange: (filters: {
    source_account_id?: string;
    date_from?: string;
    date_to?: string;
  }) => void;
}

export function MiscellaneousTable({ miscellaneous, isLoading, onView, filters, onFiltersChange }: MiscellaneousTableProps) {
  const [sourceAccountFilter, setSourceAccountFilter] = useState<string>(filters.source_account_id || "");
  const [dateFromFilter, setDateFromFilter] = useState<string>(filters.date_from || "");
  const [dateToFilter, setDateToFilter] = useState<string>(filters.date_to || "");

  const filteredMiscellaneous = useMemo(() => {
    return miscellaneous.filter((item) => {
      if (sourceAccountFilter && item.source_account_id !== sourceAccountFilter) {
        return false;
      }

      if (dateFromFilter || dateToFilter) {
        const itemDate = new Date(item.date);
        if (dateFromFilter) {
          const fromDate = new Date(dateFromFilter);
          if (itemDate < fromDate) return false;
        }
        if (dateToFilter) {
          const toDate = new Date(dateToFilter);
          toDate.setHours(23, 59, 59, 999);
          if (itemDate > toDate) return false;
        }
      }

      return true;
    });
  }, [miscellaneous, sourceAccountFilter, dateFromFilter, dateToFilter]);

  useMemo(() => {
    const newFilters: typeof filters = {};
    if (sourceAccountFilter) newFilters.source_account_id = sourceAccountFilter;
    if (dateFromFilter) newFilters.date_from = dateFromFilter;
    if (dateToFilter) newFilters.date_to = dateToFilter;
    onFiltersChange(newFilters);
  }, [sourceAccountFilter, dateFromFilter, dateToFilter, onFiltersChange]);

  const handleClearFilters = () => {
    setSourceAccountFilter("");
    setDateFromFilter("");
    setDateToFilter("");
  };

  return (
    <div className="space-y-6">
      <FiltersSection
        sourceAccountFilter={sourceAccountFilter}
        dateFromFilter={dateFromFilter}
        dateToFilter={dateToFilter}
        onSourceAccountChange={setSourceAccountFilter}
        onDateFromChange={setDateFromFilter}
        onDateToChange={setDateToFilter}
        onClearFilters={handleClearFilters}
      />

      <TransactionTable
        transactions={filteredMiscellaneous}
        isLoading={isLoading}
        onView={onView}
      />
    </div>
  );
}

