import { useState, useMemo } from "react";
import { TransactionTable, type TransactionTableItem } from "../shared/transaction-table";
import { FiltersSection } from "../shared/filters-section";

interface DepositTransaction extends TransactionTableItem {
  // Add any deposit-specific fields if needed
}

interface DepositsTableProps {
  deposits: DepositTransaction[];
  isLoading: boolean;
  onView: (deposit: DepositTransaction) => void;
  filters: {
    destination_account_id?: string;
    date_from?: string;
    date_to?: string;
  };
  onFiltersChange: (filters: {
    destination_account_id?: string;
    date_from?: string;
    date_to?: string;
  }) => void;
}

export function DepositsTable({ deposits, isLoading, onView, filters, onFiltersChange }: DepositsTableProps) {
  const [destinationAccountFilter, setDestinationAccountFilter] = useState<string>(filters.destination_account_id || "");
  const [dateFromFilter, setDateFromFilter] = useState<string>(filters.date_from || "");
  const [dateToFilter, setDateToFilter] = useState<string>(filters.date_to || "");

  // Apply filters
  const filteredDeposits = useMemo(() => {
    return deposits.filter((deposit) => {
      if (destinationAccountFilter && (deposit as any).destination_account_id !== destinationAccountFilter) {
        return false;
      }

      if (dateFromFilter || dateToFilter) {
        const depositDate = new Date(deposit.date);
        if (dateFromFilter) {
          const fromDate = new Date(dateFromFilter);
          if (depositDate < fromDate) return false;
        }
        if (dateToFilter) {
          const toDate = new Date(dateToFilter);
          toDate.setHours(23, 59, 59, 999);
          if (depositDate > toDate) return false;
        }
      }

      return true;
    });
  }, [deposits, destinationAccountFilter, dateFromFilter, dateToFilter]);

  // Update parent filters when local filters change
  useMemo(() => {
    const newFilters: typeof filters = {};
    if (destinationAccountFilter) newFilters.destination_account_id = destinationAccountFilter;
    if (dateFromFilter) newFilters.date_from = dateFromFilter;
    if (dateToFilter) newFilters.date_to = dateToFilter;
    onFiltersChange(newFilters);
  }, [destinationAccountFilter, dateFromFilter, dateToFilter, onFiltersChange]);

  const handleClearFilters = () => {
    setDestinationAccountFilter("");
    setDateFromFilter("");
    setDateToFilter("");
  };

  return (
    <div className="space-y-6">
      <FiltersSection
        sourceAccountFilter={destinationAccountFilter}
        dateFromFilter={dateFromFilter}
        dateToFilter={dateToFilter}
        onSourceAccountChange={setDestinationAccountFilter}
        onDateFromChange={setDateFromFilter}
        onDateToChange={setDateToFilter}
        onClearFilters={handleClearFilters}
        accountLabel="Destination Account"
      />

      <TransactionTable
        transactions={filteredDeposits}
        isLoading={isLoading}
        onView={onView}
      />
    </div>
  );
}

