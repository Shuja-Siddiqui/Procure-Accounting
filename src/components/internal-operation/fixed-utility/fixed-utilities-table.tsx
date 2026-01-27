import { useState, useMemo } from "react";
import { TransactionTable, type TransactionTableItem } from "../shared/transaction-table";
import { FiltersSection } from "../shared/filters-section";

interface FixedUtilityTransaction extends TransactionTableItem {}

interface FixedUtilitiesTableProps {
  fixedUtilities: FixedUtilityTransaction[];
  isLoading: boolean;
  onView: (fixedUtility: FixedUtilityTransaction) => void;
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

export function FixedUtilitiesTable({ fixedUtilities, isLoading, onView, filters, onFiltersChange }: FixedUtilitiesTableProps) {
  const [sourceAccountFilter, setSourceAccountFilter] = useState<string>(filters.source_account_id || "");
  const [dateFromFilter, setDateFromFilter] = useState<string>(filters.date_from || "");
  const [dateToFilter, setDateToFilter] = useState<string>(filters.date_to || "");

  const filteredFixedUtilities = useMemo(() => {
    return fixedUtilities.filter((fixedUtility) => {
      if (sourceAccountFilter && fixedUtility.source_account_id !== sourceAccountFilter) {
        return false;
      }

      if (dateFromFilter || dateToFilter) {
        const fixedUtilityDate = new Date(fixedUtility.date);
        if (dateFromFilter) {
          const fromDate = new Date(dateFromFilter);
          if (fixedUtilityDate < fromDate) return false;
        }
        if (dateToFilter) {
          const toDate = new Date(dateToFilter);
          toDate.setHours(23, 59, 59, 999);
          if (fixedUtilityDate > toDate) return false;
        }
      }

      return true;
    });
  }, [fixedUtilities, sourceAccountFilter, dateFromFilter, dateToFilter]);

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
        transactions={filteredFixedUtilities}
        isLoading={isLoading}
        onView={onView}
      />
    </div>
  );
}

