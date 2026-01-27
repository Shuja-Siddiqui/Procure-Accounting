import { useMemo } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export interface LedgerTransaction {
    id: string;
    date: string | null;
    description: string | null;
    amount: string | number | null;
    total_payment?: string | number | null;
    remaining_payment?: string | number | null;
    type?: string | null;
    created_at?: string | null;
}

export interface LedgerTableProps {
    openingBalance: number;
    transactions: LedgerTransaction[];
    isLoading: boolean;
    dateFrom?: string;
    onViewBook: (transactionId: string) => void;
}

export function AccountReceivableLedgerTable({
    openingBalance,
    transactions,
    isLoading,
    dateFrom,
    onViewBook,
}: LedgerTableProps) {
    const rows = useMemo(() => {
        let running = openingBalance || 0;

        // Sort by date ascending, then by created_at (oldest first, newest last)
        // This ensures transactions on the same date are in chronological order
        const sorted = [...transactions].sort((a, b) => {
            const da = a.date ? new Date(a.date).getTime() : 0;
            const db = b.date ? new Date(b.date).getTime() : 0;
            if (da !== db) {
                return da - db; // Sort by date first
            }
            // If dates are the same, sort by created_at
            const ca = a.created_at ? new Date(a.created_at).getTime() : 0;
            const cb = b.created_at ? new Date(b.created_at).getTime() : 0;
            return ca - cb;
        });

        return sorted.map((tx) => {
            let debit = 0;
            let credit = 0;

            // Determine debit/credit based on transaction type
            // Standard Accounting: Debit = what client owes (increases receivable), Credit = payments received (decreases receivable)
            // For A/R (Asset): Debit increases asset, Credit decreases asset
            if (
                tx.type === "sale" ||
                tx.type === "Sale" ||
                tx.type === "SALE" ||
                tx.type === "receivable_advance" ||
                tx.type === "advance_sale_inventory" ||
                tx.type === "advance_sale_payment" // Advance payment from client
            ) {
                // Sale/Advance: Debit = total_amount (what client owes - increases receivable), Credit = paid_amount (advance payment received - decreases receivable)
                // Standard accounting: Debit increases asset, Credit decreases asset
                // For advance_sale_payment: Debit = 0, Credit = paid_amount (client paid us advance - decreases receivable)
                const invoiceTotal = Number((tx as any).total_amount ?? tx.amount ?? 0) || 0;
                const advancePayment = Number((tx as any).paid_amount ?? tx.total_payment ?? 0) || 0;
                
                if (tx.type === "advance_sale_payment") {
                    debit = 0;
                    credit = advancePayment;
                } else {
                    debit = invoiceTotal;
                    credit = advancePayment;
                }
            } else if (
                tx.type === "receive_able" ||
                tx.type === "advance_account_receivable_payment"
            ) {
                // Receipt from client: reduces receivable (CREDIT)
                // Standard accounting: Credit decreases asset
                credit = Number((tx as any).paid_amount ?? tx.amount ?? 0) || 0;
                debit = 0;
            } else if (tx.type === "pay_able_client") {
                // Pay client back (when client has credit/negative balance)
                // DEBIT = paid_amount (increases balance - reduces credit, moves toward zero)
                // Works for: partial payment, full payment, or overpayment
                const paymentAmount = Number((tx as any).paid_amount ?? tx.amount ?? 0) || 0;
                debit = paymentAmount;
                credit = 0;
            } else if (tx.type === "sale_return") {
                // Sales return / credit note: Debit = -(total_amount), Credit = -(paid_amount)
                // This shows reversal of the original sale transaction
                const returnAmount = Number((tx as any).total_amount ?? tx.total_payment ?? tx.amount ?? 0) || 0;
                const paidAmount = Number((tx as any).paid_amount ?? 0) || 0;
                debit = -(returnAmount); // Negative of total_amount
                credit = -(paidAmount); // Negative of paid_amount
            } else {
                // Other transaction types: use amount as debit if positive (standard accounting)
                const amt = Number(tx.amount ?? 0) || 0;
                if (amt > 0) {
                    debit = amt;
                } else if (amt < 0) {
                    credit = Math.abs(amt);
                }
            }

            // Standard accounting: balance = previous + debit - credit (for asset accounts)
            running = running + debit - credit;

            return {
                ...tx,
                debit,
                credit,
                balance: running,
            };
        });
    }, [transactions, openingBalance]);

    const formatDate = (date: string | null) => {
        if (!date) return "-";
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const formatCurrency = (amount: number) => {
        if (amount === 0) return "0.00";
        const formatted = new Intl.NumberFormat("en-PK", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(Math.abs(amount));
        return formatted;
    };

    const formatCurrencyWithSign = (amount: number, isNegative: boolean = false) => {
        if (amount === 0) return "0.00";
        const formatted = formatCurrency(amount);
        return isNegative ? `-${formatted}` : formatted;
    };

    const formatBalance = (amount: number) => {
        if (amount === 0) return "0.00";
        const formatted = formatCurrency(amount);
        return amount < 0 ? `(${formatted})` : formatted;
    };

    const getBookReference = (tx: LedgerTransaction) => {
        if (
            tx.type === 'sale' ||
            tx.type === 'receivable_advance' ||
            tx.type === 'advance_sale_inventory'
        ) {
            return `S# ${tx.id.substring(0, 6).toUpperCase()}`;
        } else if (
            tx.type === 'receive_able' ||
            tx.type === 'advance_sale_payment' ||
            tx.type === 'advance_account_receivable_payment'
        ) {
            return `RV${tx.id.substring(0, 5).toUpperCase()}`;
        } else if (tx.type === 'pay_able_client') {
            return `PY${tx.id.substring(0, 5).toUpperCase()}`;
        } else if (tx.type === 'sale_return') {
            return `CN${tx.id.substring(0, 4).toUpperCase()}`;
        }
        return tx.id.substring(0, 8).toUpperCase();
    };

    const getDescription = (tx: LedgerTransaction) => {
        if (tx.description) {
            return tx.description;
        }
        // Default descriptions based on type
        if (tx.type === 'sale' || tx.type === 'advance_sale_inventory') {
            return 'Sold goods';
        } else if (tx.type === 'receivable_advance') {
            return 'Advance Receivable';
        } else if (tx.type === 'advance_sale_payment') {
            return 'Advance Payment from Client';
        } else if (tx.type === 'receive_able' || tx.type === 'advance_account_receivable_payment') {
            return 'Client paid';
        } else if (tx.type === 'pay_able_client') {
            return 'Paid client';
        } else if (tx.type === 'sale_return') {
            return 'Client returned goods';
        }
        return '-';
    };

    return (
        <Card>
            <CardContent className="p-4">
                {/* Opening Balance Display Above Table */}
                {!isLoading && (
                    <div className="mb-4 p-3 bg-muted/50 rounded-lg border">
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="text-sm font-medium text-muted-foreground">Opening Balance:</span>
                                <span className={`ml-2 text-lg font-semibold ${
                                    openingBalance > 0 
                                        ? 'text-green-600 dark:text-green-400' 
                                        : openingBalance < 0 
                                        ? 'text-red-600 dark:text-red-400' 
                                        : ''
                                }`}>
                                    {formatBalance(openingBalance || 0)}
                                </span>
                            </div>
                           
                        </div>
                    </div>
                )}
            </CardContent>
            <CardContent className="p-0 pt-0">
                    {isLoading ? (
                        <div className="p-4 space-y-2">
                            <Skeleton className="h-6 w-32" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead className="w-[120px]">DATE</TableHead>
                                            <TableHead className="w-[120px]">BOOKS</TableHead>
                                            <TableHead>DESCRIPTION</TableHead>
                                            <TableHead className="text-right w-[130px]">DEBIT</TableHead>
                                            <TableHead className="text-right w-[130px]">CREDIT</TableHead>
                                            <TableHead className="text-right w-[130px]">BALANCE</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {/* Opening Balance Row */}
                                        {!isLoading && (
                                            <TableRow className="bg-muted/30 font-semibold">
                                                <TableCell className="text-sm font-medium">Opening Balance</TableCell>
                                                <TableCell className="text-sm">-</TableCell>
                                                <TableCell className="text-sm">-</TableCell>
                                                <TableCell className="text-right text-sm">-</TableCell>
                                                <TableCell className="text-right text-sm">-</TableCell>
                                                <TableCell className={`text-right font-semibold text-sm ${
                                                    openingBalance > 0 
                                                        ? 'text-green-600 dark:text-green-400' 
                                                        : openingBalance < 0 
                                                        ? 'text-red-600 dark:text-red-400' 
                                                        : ''
                                                }`}>
                                                    {formatBalance(openingBalance || 0)}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                        {rows.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                                    No transactions found for the selected filters.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            rows.map((row) => (
                                                <TableRow key={row.id}>
                                                    <TableCell className="text-sm">
                                                        {formatDate(row.date)}
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        <Button
                                                            size="sm"
                                                            variant="link"
                                                            className="h-auto p-0 text-blue-600 hover:text-blue-800"
                                                            onClick={() => onViewBook(row.id)}
                                                        >
                                                            {getBookReference(row)}
                                                        </Button>
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        {getDescription(row)}
                                                    </TableCell>
                                                    <TableCell className="text-right text-sm">
                                                        {(() => {
                                                            if (row.type === "sale_return") {
                                                                const totalAmount = Number((row as any).total_amount ?? (row as any).total_payment ?? row.amount ?? 0);
                                                                // DEBIT is negative for sale_return (reverses the sale)
                                                                // Show negative value if total_amount exists and is not 0
                                                                if (!totalAmount || totalAmount === 0) return "-";
                                                                // row.debit is already negative, so we show it as negative
                                                                return formatCurrencyWithSign(Math.abs(row.debit), true);
                                                            }
                                                            return row.debit > 0 ? formatCurrency(row.debit) : "-";
                                                        })()}
                                                    </TableCell>
                                                    <TableCell className="text-right text-sm">
                                                        {(() => {
                                                            if (row.type === "sale_return") {
                                                                const paidAmount = Number((row as any).paid_amount ?? 0);
                                                                // CREDIT is negative for sale_return (reverses the payment)
                                                                // Show negative value only if paid_amount exists and is not 0
                                                                if (!paidAmount || paidAmount === 0) return "-";
                                                                // row.credit is already negative, so we show it as negative
                                                                return formatCurrencyWithSign(Math.abs(row.credit), true);
                                                            }
                                                            return row.credit > 0 ? formatCurrency(row.credit) : "-";
                                                        })()}
                                                    </TableCell>
                                                    <TableCell className={`text-right font-medium text-sm ${
                                                        row.balance > 0 
                                                            ? 'text-green-600 dark:text-green-400' 
                                                            : row.balance < 0 
                                                            ? 'text-red-600 dark:text-red-400' 
                                                            : ''
                                                    }`}>
                                                        {formatBalance(row.balance)}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden space-y-3 p-4">
                                {/* Opening Balance Card */}
                                {!isLoading && (
                                    <div className="border rounded-lg p-4 space-y-2 bg-muted/30">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-semibold">Opening Balance</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                                            <div>
                                                <div className="text-xs text-muted-foreground">DEBIT</div>
                                                <div className="text-sm font-medium">-</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-muted-foreground">CREDIT</div>
                                                <div className="text-sm font-medium">-</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-muted-foreground">BALANCE</div>
                                                <div className={`text-sm font-semibold ${
                                                    openingBalance > 0 
                                                        ? 'text-green-600 dark:text-green-400' 
                                                        : openingBalance < 0 
                                                        ? 'text-red-600 dark:text-red-400' 
                                                        : ''
                                                }`}>
                                                    {formatBalance(openingBalance || 0)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {rows.length === 0 ? (
                                    <div className="py-8 text-center text-muted-foreground">
                                        No transactions found for the selected filters.
                                    </div>
                                ) : (
                                    rows.map((row) => (
                                        <div key={row.id} className="border rounded-lg p-4 space-y-2 bg-card">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium">{formatDate(row.date)}</span>
                                                <Button
                                                    size="sm"
                                                    variant="link"
                                                    className="h-auto p-0 text-blue-600 hover:text-blue-800 text-xs"
                                                    onClick={() => onViewBook(row.id)}
                                                >
                                                    {getBookReference(row)}
                                                </Button>
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {getDescription(row)}
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                                                <div>
                                                    <div className="text-xs text-muted-foreground">DEBIT</div>
                                                    <div className="text-sm font-medium">
                                                        {(() => {
                                                            if (row.type === "sale_return") {
                                                                const totalAmount = Number((row as any).total_amount ?? (row as any).total_payment ?? row.amount ?? 0);
                                                                // DEBIT is negative for sale_return (reverses the sale)
                                                                // Show negative value if total_amount exists and is not 0
                                                                if (!totalAmount || totalAmount === 0) return "-";
                                                                // row.debit is already negative, so we show it as negative
                                                                return formatCurrencyWithSign(Math.abs(row.debit), true);
                                                            }
                                                            return row.debit > 0 ? formatCurrency(row.debit) : "-";
                                                        })()}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-muted-foreground">CREDIT</div>
                                                    <div className="text-sm font-medium">
                                                        {(() => {
                                                            if (row.type === "sale_return") {
                                                                const paidAmount = Number((row as any).paid_amount ?? 0);
                                                                // CREDIT is negative for sale_return (reverses the payment)
                                                                // Show negative value only if paid_amount exists and is not 0
                                                                if (!paidAmount || paidAmount === 0) return "-";
                                                                return formatCurrencyWithSign(Math.abs(row.credit), true);
                                                            }
                                                            return row.credit > 0 ? formatCurrency(row.credit) : "-";
                                                        })()}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-muted-foreground">BALANCE</div>
                                                    <div className={`text-sm font-medium ${
                                                        row.balance > 0 
                                                            ? 'text-green-600 dark:text-green-400' 
                                                            : row.balance < 0 
                                                            ? 'text-red-600 dark:text-red-400' 
                                                            : ''
                                                    }`}>
                                                        {formatBalance(row.balance)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
    );
}


