import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Calendar } from "lucide-react";

interface FiltersSectionProps {
  sourceAccountFilter: string;
  dateFromFilter: string;
  dateToFilter: string;
  onSourceAccountChange: (value: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onClearFilters: () => void;
  accountLabel?: string;
}

export function FiltersSection({
  sourceAccountFilter,
  dateFromFilter,
  dateToFilter,
  onSourceAccountChange,
  onDateFromChange,
  onDateToChange,
  onClearFilters,
  accountLabel = "Source Account",
}: FiltersSectionProps) {
  // Fetch accounts for filter dropdowns
  const { data: accountsResponse } = useQuery({
    queryKey: ['/api/accounts'],
    queryFn: () => apiRequest('GET', '/api/accounts'),
  });

  const accounts = accountsResponse?.data || [];

  const handleQuickFilter = (filter: 'all' | 'today' | 'last_week') => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (filter === 'all') {
      onDateFromChange('');
      onDateToChange('');
    } else if (filter === 'today') {
      const todayStr = today.toISOString().split('T')[0];
      onDateFromChange(todayStr);
      onDateToChange(todayStr);
    } else if (filter === 'last_week') {
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);
      const lastWeekStr = lastWeek.toISOString().split('T')[0];
      const todayStr = today.toISOString().split('T')[0];
      onDateFromChange(lastWeekStr);
      onDateToChange(todayStr);
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="w-full sm:w-[200px]">
              <Label htmlFor="source-account-filter">{accountLabel}</Label>
              <Select value={sourceAccountFilter || "all"} onValueChange={(value) => onSourceAccountChange(value === "all" ? "" : value)}>
                <SelectTrigger id="source-account-filter" className="w-full">
                  <SelectValue placeholder="All Accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {accounts.map((acc: any) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-[180px]">
              <Label htmlFor="date-from-filter">Date From</Label>
              <Input
                id="date-from-filter"
                type="date"
                value={dateFromFilter}
                onChange={(e) => onDateFromChange(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="w-full sm:w-[180px]">
              <Label htmlFor="date-to-filter">Date To</Label>
              <Input
                id="date-to-filter"
                type="date"
                value={dateToFilter}
                onChange={(e) => onDateToChange(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="w-full sm:w-auto">
              <Button 
                variant="secondary" 
                onClick={onClearFilters}
                className="w-full sm:w-auto"
              >
                Clear Filters
              </Button>
            </div>
          </div>
          
          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-muted-foreground">Quick Filters:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickFilter('all')}
              className="h-8"
            >
              All Time
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickFilter('today')}
              className="h-8"
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickFilter('last_week')}
              className="h-8"
            >
              Last Week
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

