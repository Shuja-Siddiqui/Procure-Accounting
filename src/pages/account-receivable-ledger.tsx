import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { AccountReceivableLedgerFilters, LedgerFilterValues } from "../components/account-reports/accountreceavbleledger/filters";
import { AccountReceivableLedgerTable, LedgerTransaction } from "../components/account-reports/accountreceavbleledger/ledger-table";
import { TransactionBookModal } from "../components/account-reports/accountreceavbleledger/transaction-book-modal";

interface LedgerResponse {
  openingBalance: number;
  transactions: LedgerTransaction[];
}

interface AccountReceivable {
  id: string;
  name: string;
  number?: string | null;
  initial_balance?: string | number | null;
}

export default function AccountReceivableLedger() {
  const [filters, setFilters] = useState<LedgerFilterValues | null>(null);
  const [trigger, setTrigger] = useState(0);
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);

  // Fetch account receivable details for print header
  const { data: accountReceivableData } = useQuery<{
    success: boolean;
    data: AccountReceivable;
  }>({
    queryKey: ["/api/account-receivables", filters?.account_receivable_id],
    queryFn: async () => {
      if (!filters?.account_receivable_id) return null;
      const response = await fetch(`/api/account-receivables/${filters.account_receivable_id}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch account receivable");
      }
      return await response.json();
    },
    enabled: !!filters?.account_receivable_id,
  });

  const accountReceivable = accountReceivableData?.data;

  const { data, isFetching } = useQuery<LedgerResponse | null>({
    queryKey: ["account-receivable-ledger", filters, trigger],
    queryFn: async () => {
      if (!filters?.account_receivable_id || !filters.date_from || !filters.date_to) {
        return null;
      }

      // Main period
      const params = new URLSearchParams({
        account_receivable_id: filters.account_receivable_id,
        date_from: filters.date_from,
        date_to: filters.date_to,
      });
      const resMain = await fetch(`/api/transactions?${params.toString()}`, {
        credentials: "include",
      });
      if (!resMain.ok) {
        throw new Error("Failed to fetch ledger transactions");
      }
      const mainJson = await resMain.json();
      let mainTx: LedgerTransaction[] = mainJson.data ?? [];

      // Sort transactions by date and created_at to ensure chronological order
      mainTx = mainTx.sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
        if (da !== db) {
          return da - db; // Sort by date first
        }
        // If dates are the same, sort by created_at
        const ca = (a as any).created_at ? new Date((a as any).created_at).getTime() : 0;
        const cb = (b as any).created_at ? new Date((b as any).created_at).getTime() : 0;
        return ca - cb;
      });

      // Opening balance: calculate from all transactions before date_from
      // Get all transactions for this client (no date filter)
      const paramsAll = new URLSearchParams({
        account_receivable_id: filters.account_receivable_id,
      });
      const resAll = await fetch(`/api/transactions?${paramsAll.toString()}`, {
        credentials: "include",
      });
      if (!resAll.ok) {
        throw new Error("Failed to fetch all transactions");
      }
      const allJson = await resAll.json();
      const allTx: any[] = allJson.data ?? [];

      // Filter to only transactions before date_from
      const dateFrom = new Date(filters.date_from);
      dateFrom.setHours(0, 0, 0, 0);
      const prevTx = allTx.filter((tx) => {
        if (!tx.date) return false;
        const txDate = new Date(tx.date);
        txDate.setHours(0, 0, 0, 0);
        return txDate < dateFrom;
      });

      // Fetch account receivable to get initial_balance
      const resAR = await fetch(`/api/account-receivables/${filters.account_receivable_id}`, {
        credentials: "include",
      });
      let initialBalance = 0;
      if (resAR.ok) {
        const arJson = await resAR.json();
        if (arJson.success && arJson.data?.initial_balance) {
          initialBalance = parseFloat(String(arJson.data.initial_balance)) || 0;
        }
      }

      // Calculate opening balance: initial_balance + sum of transactions before start_date
      let openingBalance = initialBalance;
      if (prevTx.length > 0) {
        // Sort by date ascending, then by created_at
        prevTx.sort((a, b) => {
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

        // Calculate running balance from all previous transactions using standard accounting logic
        // Formula: SUM(remaining from sales + advances) - SUM(paid_amount from receipts)
        // Standard Accounting: Debit = what client owes (increases receivable), Credit = payments received (decreases receivable)
        prevTx.forEach((tx) => {
          let debit = 0;
          let credit = 0;

          if (
            tx.type === 'sale' || 
            tx.type === 'Sale' || 
            tx.type === 'SALE' || 
            tx.type === 'receivable_advance' ||
            tx.type === 'advance_sale_inventory' ||
            tx.type === 'advance_sale_payment' // Advance payment from client
          ) {
            // Sale/Advance: Debit = total_amount (what client owes - increases receivable), Credit = paid_amount (advance payment received - decreases receivable)
            // Standard accounting: Debit increases asset, Credit decreases asset
            // For advance_sale_payment: Debit = 0, Credit = paid_amount (client paid us advance - decreases receivable)
            const invoiceTotal = Number(tx.total_amount ?? 0) || 0;
            const advancePayment = Number(tx.paid_amount ?? 0) || 0;
            
            if (tx.type === 'advance_sale_payment') {
              // Advance payment: Debit = 0, Credit = paid_amount (client paid us advance - decreases receivable)
              debit = 0;
              credit = advancePayment;
            } else {
              // Regular sale: Debit = invoice total (increases receivable), Credit = advance payment (decreases receivable)
              debit = invoiceTotal;
              credit = advancePayment;
            }
          } else if (tx.type === 'receive_able') {
            // Receipt: Credit = paid_amount (reduces what client owes - decreases receivable)
            // Standard accounting: Credit decreases asset
            const receiptAmount = Number(tx.paid_amount ?? 0) || 0;
            credit = receiptAmount;
            debit = 0;
          } else if (tx.type === 'pay_able_client') {
            // Pay client back (when client has credit/negative balance)
            // DEBIT = paid_amount (increases balance - reduces credit, moves toward zero)
            // Works for: partial payment, full payment, or overpayment
            const paymentAmount = Number(tx.paid_amount ?? 0) || 0;
            debit = paymentAmount;
            credit = 0;
          } else if (tx.type === 'sale_return') {
            // Sale Return: Debit = -(total_amount), Credit = -(paid_amount)
            // Reverses the original sale transaction
            const returnAmount = Number(tx.total_amount ?? 0) || 0;
            const paidAmount = Number(tx.paid_amount ?? 0) || 0;
            debit = -(returnAmount); // Negative of total_amount
            credit = -(paidAmount); // Negative of paid_amount
          } else {
            const amt = Number(tx.total_amount ?? 0) || 0;
            if (amt > 0) {
              debit = amt;
            } else if (amt < 0) {
              credit = Math.abs(amt);
            }
          }

          // Standard accounting: balance = previous + debit - credit (for asset accounts)
          openingBalance = openingBalance + debit - credit;
        });
      }

      return {
        openingBalance,
        transactions: mainTx,
      };
    },
    enabled: !!filters?.account_receivable_id && !!filters.date_from && !!filters.date_to,
  });

  const handleApplyFilters = (values: LedgerFilterValues) => {
    setFilters(values);
    setTrigger((t) => t + 1);
  };

  const handlePrint = () => {
    if (!data || !accountReceivable || !filters) return;

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

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
        tx.type === 'advance_sale_payment'
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
      if (tx.type === 'sale' || tx.type === 'advance_sale_inventory') {
        return 'Sold goods';
      } else if (tx.type === 'receivable_advance') {
        return 'Advance Receivable';
      } else if (tx.type === 'advance_sale_payment') {
        return 'Advance Payment from Client';
      } else if (tx.type === 'receive_able') {
        return 'Client paid';
      } else if (tx.type === 'pay_able_client') {
        return 'Paid client';
      } else if (tx.type === 'sale_return') {
        return 'Client returned goods';
      }
      return '-';
    };

    // Calculate rows with running balance
    let running = data.openingBalance || 0;
    const sorted = [...data.transactions].sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      if (da !== db) {
        return da - db;
      }
      const ca = a.created_at ? new Date(a.created_at).getTime() : 0;
      const cb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return ca - cb;
    });

    const rows = sorted.map((tx) => {
      let debit = 0;
      let credit = 0;

      if (
        tx.type === "sale" || 
        tx.type === "Sale" || 
        tx.type === "SALE" || 
        tx.type === "receivable_advance" ||
        tx.type === "advance_sale_inventory"
      ) {
        // Sale/Advance: Debit = total_amount (what client owes - increases receivable), Credit = paid_amount (advance payment received - decreases receivable)
        // Standard accounting: Debit increases asset, Credit decreases asset
        const invoiceTotal = Number((tx as any).total_amount ?? 0) || 0;
        const advancePayment = Number((tx as any).paid_amount ?? 0) || 0;
        debit = invoiceTotal;
        credit = advancePayment;
      } else if (tx.type === "advance_sale_payment") {
        // Advance payment: Credit = paid_amount (reduces what client owes - decreases receivable, same as receive_able)
        const advancePayment = Number((tx as any).paid_amount ?? 0) || 0;
        credit = advancePayment;
        debit = 0;
      } else if (tx.type === "receive_able") {
        // Receipt: Credit = paid_amount (reduces what client owes - decreases receivable)
        // Standard accounting: Credit decreases asset
        credit = Number((tx as any).paid_amount ?? 0) || 0;
        debit = 0;
      } else if (tx.type === "pay_able_client") {
        // Pay client back (when client has credit/negative balance)
        // DEBIT = paid_amount (increases balance - reduces credit, moves toward zero)
        // Works for: partial payment, full payment, or overpayment
        const paymentAmount = Number((tx as any).paid_amount ?? 0) || 0;
        debit = paymentAmount;
        credit = 0;
      } else if (tx.type === "sale_return") {
        // Sale Return: Debit = -(total_amount), Credit = -(paid_amount)
        // Reverses the original sale transaction
        const returnAmount = Number((tx as any).total_amount ?? 0) || 0;
        const paidAmount = Number((tx as any).paid_amount ?? 0) || 0;
        debit = -(returnAmount); // Negative of total_amount
        credit = -(paidAmount); // Negative of paid_amount
      } else {
        const amt = Number((tx as any).total_amount ?? 0) || 0;
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

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Account Receivable Ledger - ${accountReceivable.name}</title>
        <style>
          @media print {
            @page {
              margin: 1cm;
            }
            body {
              margin: 0;
              padding: 0;
            }
            .no-print {
              display: none !important;
            }
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            color: #000;
            padding: 20px;
          }
          .print-header {
            margin-bottom: 20px;
            border-bottom: 2px solid #000;
            padding-bottom: 15px;
          }
          .print-header h1 {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .print-header .date-range {
            font-size: 14px;
            color: #333;
          }
          .opening-balance {
            margin: 15px 0;
            padding: 10px;
            background-color: #f5f5f5;
            border: 1px solid #ddd;
            border-radius: 4px;
          }
          .opening-balance-label {
            font-weight: bold;
            margin-right: 10px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          th, td {
            padding: 8px;
            text-align: left;
            border: 1px solid #ddd;
          }
          th {
            background-color: #f0f0f0;
            font-weight: bold;
            text-align: left;
          }
          th.text-right, td.text-right {
            text-align: right;
          }
          tbody tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          .debit {
            text-align: right;
          }
          .credit {
            text-align: right;
          }
          .balance {
            text-align: right;
            font-weight: bold;
          }
          .balance-positive {
            color: #059669;
          }
          .balance-negative {
            color: #dc2626;
          }
        </style>
      </head>
      <body>
        <div class="print-header">
          <h1>${accountReceivable.name}</h1>
          <div class="date-range">
            Date Range: ${formatDate(filters.date_from)} to ${formatDate(filters.date_to)}
          </div>
        </div>

        <div class="opening-balance">
          <span class="opening-balance-label">Opening Balance:</span>
          <span>${formatBalance(data.openingBalance || 0)}</span>
        </div>

        <table>
          <thead>
            <tr>
              <th>DATE</th>
              <th>BOOKS</th>
              <th>DESCRIPTION</th>
              <th class="text-right">DEBIT</th>
              <th class="text-right">CREDIT</th>
              <th class="text-right">BALANCE</th>
            </tr>
          </thead>
          <tbody>
            ${rows.length === 0 ? `
              <tr>
                <td colspan="6" style="text-align: center; padding: 20px;">
                  No transactions found for the selected filters.
                </td>
              </tr>
            ` : rows.map((row) => `
              <tr>
                <td>${formatDate(row.date)}</td>
                <td>${getBookReference(row)}</td>
                <td>${getDescription(row)}</td>
                <td class="text-right">${
                  row.type === "sale_return" 
                    ? (() => {
                        const totalAmount = Number((row as any).total_amount ?? 0);
                        if (!totalAmount || totalAmount === 0) return "-";
                        return `-${formatCurrency(Math.abs(row.debit))}`;
                      })()
                    : row.debit > 0 ? formatCurrency(row.debit) : "-"
                }</td>
                <td class="text-right">${
                  row.type === "sale_return" 
                    ? (() => {
                        const paidAmount = Number((row as any).paid_amount ?? 0);
                        if (!paidAmount || paidAmount === 0) return "-";
                        return `-${formatCurrency(Math.abs(row.credit))}`;
                      })()
                    : row.credit > 0 ? formatCurrency(row.credit) : "-"
                }</td>
                <td class="text-right balance ${row.balance > 0 ? 'balance-positive' : row.balance < 0 ? 'balance-negative' : ''}">
                  ${formatBalance(row.balance)}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();

    // Wait for content to load then print
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <>
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            padding: 0;
          }
        }
      `}</style>
      <div className="flex-1 overflow-auto p-6" data-testid="account-receivable-ledger-page">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between no-print">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Account Receivable Ledger</h1>
              <p className="text-muted-foreground">
                Proper ledger view with opening balance and book details
              </p>
            </div>
            <div className="md:block hidden">
              {data && data.transactions.length > 0 && (
                <Button variant="outline" onClick={handlePrint} className="no-print">
                  <Printer className="h-4 w-4 mr-2" />
                  Print Ledger
                </Button>
              )}
            </div>
          </div>

          <div className="no-print">
            <AccountReceivableLedgerFilters
              onApply={handleApplyFilters}
              isLoadingLedger={isFetching}
            />
          </div>
          <div className="md:hidden block w-full">
            {data && data.transactions.length > 0 && (
              <Button variant="outline" onClick={handlePrint} className="no-print w-full">
                <Printer className="h-4 w-4 mr-2 text-primary" />
                Print Ledger
              </Button>
            )}
            </div>

          <AccountReceivableLedgerTable
            openingBalance={data?.openingBalance ?? 0}
            transactions={data?.transactions ?? []}
            isLoading={isFetching}
            dateFrom={filters?.date_from}
            onViewBook={(id: string) => setSelectedTxId(id)}
          />

          <TransactionBookModal
            isOpen={!!selectedTxId}
            transactionId={selectedTxId}
            onClose={() => setSelectedTxId(null)}
          />
        </div>
      </div>
    </>
  );
}

