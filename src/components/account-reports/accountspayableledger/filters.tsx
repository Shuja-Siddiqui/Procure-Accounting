import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface AccountPayable {
  id: string;
  name: string;
  number?: string | null;
}

export interface LedgerFilterValues {
  account_payable_id: string;
  date_from: string;
  date_to: string;
}

interface FiltersProps {
  onApply: (values: LedgerFilterValues) => void;
  isLoadingLedger: boolean;
}

export function AccountPayableLedgerFilters({
  onApply,
  isLoadingLedger,
}: FiltersProps) {
  const today = new Date().toISOString().split('T')[0];
  const [accountId, setAccountId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: accountsResponse, isLoading: isAccountsLoading } = useQuery({
    queryKey: ["/api/account-payables", "ledger-dropdown"],
    queryFn: async () => {
      const res = await fetch("/api/account-payables?status=active", {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to fetch account payables");
      }
      return res.json();
    },
  });

  const accounts: AccountPayable[] = accountsResponse?.data ?? [];

  const canApply = !!accountId && !!dateFrom && !!dateTo;

  const handleApply = () => {
    if (!canApply) return;
    onApply({
      account_payable_id: accountId,
      date_from: dateFrom,
      date_to: dateTo,
    });
  };

  const handleReset = () => {
    setAccountId("");
    setDateFrom("");
    setDateTo("");
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4 items-end">
          <div className="space-y-2">
            <Label>Account Payable</Label>
            <Select
              value={accountId}
              onValueChange={setAccountId}
              disabled={isAccountsLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select vendor" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acct) => (
                  <SelectItem key={acct.id} value={acct.id}>
                    {acct.name}
                    {acct.number ? ` (${acct.number})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Date from</Label>
            <Input
              type="date"
              max={today}
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Date to</Label>
            <Input
              type="date"
              max={today}
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={handleApply}
              disabled={!canApply || isLoadingLedger}
            >
              View Ledger
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={isLoadingLedger}
            >
              Clear
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

