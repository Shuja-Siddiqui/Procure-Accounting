import { useLocation } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Eye, ExternalLink } from "lucide-react";
import { CopyableId } from "@/components/ui/copyable-id";

export interface TransactionTableItem {
  id: string;
  source_account_id?: string | null;
  paid_amount: string | number;
  mode_of_payment?: string | null;
  date: string;
  description?: string | null;
  sourceAccount?: {
    id: string;
    name: string;
    account_number?: string;
    account_type?: string;
  } | null;
}

interface TransactionTableProps {
  transactions: TransactionTableItem[];
  isLoading: boolean;
  onView: (transaction: TransactionTableItem) => void;
}

export function TransactionTable({ transactions, isLoading, onView }: TransactionTableProps) {
  const [, setLocation] = useLocation();

  const formatCurrency = (amount: string | number | null) => {
    if (!amount) return '₨0.00';
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 2,
    }).format(numAmount);
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleAccountClick = (accountId: string) => {
    setLocation(`/accounts/${accountId}`);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-0">
          <div className="space-y-2 p-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No transactions found</h3>
            <p className="text-muted-foreground">
              No transactions available for the selected filters.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[120px]">
                      ID
                    </TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[200px]">
                      Source Account
                    </TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[120px]">
                      Amount
                    </TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[120px]">
                      Payment Mode
                    </TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[150px]">
                      Transaction Date
                    </TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[200px]">
                      Description
                    </TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[120px]">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => {
                    const amount = typeof transaction.paid_amount === 'string' 
                      ? parseFloat(transaction.paid_amount) 
                      : transaction.paid_amount || 0;

                    return (
                      <TableRow 
                        key={transaction.id}
                        className="hover:bg-muted/50"
                      >
                        <TableCell className="whitespace-nowrap text-sm">
                          <CopyableId id={transaction.id} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {transaction.sourceAccount?.name ? (
                            <button
                              onClick={() => handleAccountClick((transaction as any).destination_account_id || transaction.source_account_id!)}
                              className="text-blue-600 hover:text-blue-800 hover:underline flex items-center space-x-1 transition-colors"
                              title={`View ${transaction.sourceAccount.name} details`}
                            >
                              <span>{transaction.sourceAccount.name}</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm font-medium">
                          {formatCurrency(amount)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {transaction.mode_of_payment || '-'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatDate(transaction.date)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {transaction.description || '-'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onView(transaction)}
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4 p-4">
              {transactions.map((transaction) => {
                const amount = typeof transaction.paid_amount === 'string' 
                  ? parseFloat(transaction.paid_amount) 
                  : transaction.paid_amount || 0;

                return (
                  <Card key={transaction.id} className="border">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CopyableId id={transaction.id} />
                          <p className="text-xs text-muted-foreground">
                            {formatDate(transaction.date)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onView(transaction)}
                          className="h-8 w-8"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Account:</span>
                          <span className="text-sm font-medium">
                            {transaction.sourceAccount?.name || '-'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Amount:</span>
                          <span className="text-sm font-semibold">
                            {formatCurrency(amount)}
                          </span>
                        </div>
                        {transaction.mode_of_payment && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Mode:</span>
                            <span className="text-sm">
                              {transaction.mode_of_payment}
                            </span>
                          </div>
                        )}
                        {transaction.description && (
                          <div className="pt-2 border-t">
                            <p className="text-xs text-muted-foreground">{transaction.description}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

