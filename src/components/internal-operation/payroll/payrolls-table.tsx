import { useState, useMemo } from "react";
import { TransactionTable, type TransactionTableItem } from "../shared/transaction-table";
import { FiltersSection } from "../shared/filters-section";

interface PayrollTransaction extends TransactionTableItem {
  // Add any payroll-specific fields if needed
}

interface PayrollsTableProps {
  payrolls: PayrollTransaction[];
  isLoading: boolean;
  onView: (payroll: PayrollTransaction) => void;
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

export function PayrollsTable({ payrolls, isLoading, onView, filters, onFiltersChange }: PayrollsTableProps) {
  const [sourceAccountFilter, setSourceAccountFilter] = useState<string>(filters.source_account_id || "");
  const [dateFromFilter, setDateFromFilter] = useState<string>(filters.date_from || "");
  const [dateToFilter, setDateToFilter] = useState<string>(filters.date_to || "");

  const filteredPayrolls = useMemo(() => {
    return payrolls.filter((payroll) => {
      if (sourceAccountFilter && payroll.source_account_id !== sourceAccountFilter) {
        return false;
      }

      if (dateFromFilter || dateToFilter) {
        const payrollDate = new Date(payroll.date);
        if (dateFromFilter) {
          const fromDate = new Date(dateFromFilter);
          if (payrollDate < fromDate) return false;
        }
        if (dateToFilter) {
          const toDate = new Date(dateToFilter);
          toDate.setHours(23, 59, 59, 999);
          if (payrollDate > toDate) return false;
        }
      }

      return true;
    });
  }, [payrolls, sourceAccountFilter, dateFromFilter, dateToFilter]);

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
        transactions={filteredPayrolls}
        isLoading={isLoading}
        onView={onView}
      />
    </div>
  );
}

