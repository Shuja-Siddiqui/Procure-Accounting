import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface TrialBalanceData {
  debit: {
    capitalAccount: { id: string; name: string; balance: number } | null;
    otherBankCashAccounts: Array<{ id: string; name: string; balance: number }>;
    accountReceivablesPositive: Array<{ id: string; name: string; balance: number }>;
    advanceToSuppliers: Array<{ id: string; name: string; balance: number }>;
    inventory: number;
    payrollExpense: number;
    fixedUtilityExpense: number;
    fixedExpense: number;
    miscellaneousExpense: number;
    otherExpense: number;
    lostAndDamageExpense: number;
    expenses: number; // Total for backward compatibility
    total: number;
  };
  credit: {
    accountPayablesPositive: Array<{ id: string; name: string; balance: number }>;
    accountReceivablesNegative: Array<{ id: string; name: string; balance: number }>;
    capital: number;
    salesRevenue: number;
    total: number;
  };
  difference: number;
  debug?: {
    totalPurchases: number;
    totalPurchaseReturns: number;
    totalSales: number;
    totalSaleReturns: number;
    netSales: number;
    totalExpenses: number;
    breakdown: {
      debitComponents: Record<string, number>;
      creditComponents: Record<string, number>;
    };
  };
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export default function TrialBalance() {
  const { data, isLoading, error } = useQuery<{
    success: boolean;
    data: TrialBalanceData;
  }>({
    queryKey: ["/api/accounts/trial-balance"],
    queryFn: async () => {
      const response = await fetch("/api/accounts/trial-balance", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch trial balance");
      }
      return await response.json();
    },
  });

  const trialBalance = data?.data;

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <p className="text-destructive">Error loading trial balance. Please try again.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Trial Balance</h1>
          <p className="text-muted-foreground">
            Complete trial balance showing all accounts, transactions, and balances
          </p>
        </div>

        {/* Trial Balance Table */}
        <Card>
          <CardHeader>
            <CardTitle>Trial Balance</CardTitle>
            <CardDescription>
              As of {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold">Account Name</th>
                    <th className="text-right p-3 font-semibold">Debit (PKR)</th>
                    <th className="text-right p-3 font-semibold">Credit (PKR)</th>
                  </tr>
                </thead>
                <tbody>
                  {/* DEBIT SIDE */}
                  <tr className="bg-muted/50">
                    <td colSpan={3} className="p-3 font-bold">DEBIT SIDE</td>
                  </tr>

                  {/* Bank – Capital Account */}
                  {trialBalance?.debit.capitalAccount && (
                    <tr className="border-b">
                      <td className="p-2 pl-6">Bank – Capital Account</td>
                      <td className="text-right p-2">{formatCurrency(trialBalance.debit.capitalAccount.balance)}</td>
                      <td className="text-right p-2">-</td>
                    </tr>
                  )}

                  {/* Cash / Other Banks */}
                  {trialBalance?.debit.otherBankCashAccounts && trialBalance.debit.otherBankCashAccounts.length > 0 && (
                    <>
                      <tr className="bg-muted/30">
                        <td colSpan={3} className="p-2 pl-6 font-semibold">Cash / Other Banks</td>
                      </tr>
                      {trialBalance.debit.otherBankCashAccounts.map((account) => (
                        <tr key={account.id} className="border-b">
                          <td className="p-2 pl-10">{account.name}</td>
                          <td className="text-right p-2">{formatCurrency(account.balance)}</td>
                          <td className="text-right p-2">-</td>
                        </tr>
                      ))}
                    </>
                  )}

                  {/* Accounts Receivable */}
                  {trialBalance?.debit.accountReceivablesPositive && trialBalance.debit.accountReceivablesPositive.length > 0 && (
                    <>
                      <tr className="bg-muted/30">
                        <td colSpan={3} className="p-2 pl-6 font-semibold">Accounts Receivable</td>
                      </tr>
                      {trialBalance.debit.accountReceivablesPositive.map((ar) => (
                        <tr key={ar.id} className="border-b">
                          <td className="p-2 pl-10">{ar.name}</td>
                          <td className="text-right p-2">{formatCurrency(ar.balance)}</td>
                          <td className="text-right p-2">-</td>
                        </tr>
                      ))}
                    </>
                  )}

                  {/* Advance to Suppliers */}
                  {trialBalance?.debit.advanceToSuppliers && trialBalance.debit.advanceToSuppliers.length > 0 && (
                    <>
                      {trialBalance.debit.advanceToSuppliers.length === 1 ? (
                        <tr className="border-b">
                          <td className="p-2 pl-6">Advance to Suppliers</td>
                          <td className="text-right p-2">{formatCurrency(trialBalance.debit.advanceToSuppliers[0].balance)}</td>
                          <td className="text-right p-2">-</td>
                        </tr>
                      ) : (
                        <>
                          <tr className="bg-muted/30">
                            <td colSpan={3} className="p-2 pl-6 font-semibold">Advance to Suppliers</td>
                          </tr>
                          {trialBalance.debit.advanceToSuppliers.map((ap) => (
                            <tr key={ap.id} className="border-b">
                              <td className="p-2 pl-10">{ap.name}</td>
                              <td className="text-right p-2">{formatCurrency(ap.balance)}</td>
                              <td className="text-right p-2">-</td>
                            </tr>
                          ))}
                        </>
                      )}
                    </>
                  )}

                  {/* Inventory */}
                  {trialBalance && trialBalance.debit.inventory > 0 && (
                    <tr className="border-b">
                      <td className="p-2 pl-6">Inventory</td>
                      <td className="text-right p-2">{formatCurrency(trialBalance.debit.inventory)}</td>
                      <td className="text-right p-2">-</td>
                    </tr>
                  )}

                  {/* Payroll Expense */}
                  {trialBalance && trialBalance.debit.payrollExpense > 0 && (
                    <tr className="border-b">
                      <td className="p-2 pl-6">Payroll Expense</td>
                      <td className="text-right p-2">{formatCurrency(trialBalance.debit.payrollExpense)}</td>
                      <td className="text-right p-2">-</td>
                    </tr>
                  )}

                  {/* Fixed Utility Expense */}
                  {trialBalance && trialBalance.debit.fixedUtilityExpense > 0 && (
                    <tr className="border-b">
                      <td className="p-2 pl-6">Fixed Utility Expense</td>
                      <td className="text-right p-2">{formatCurrency(trialBalance.debit.fixedUtilityExpense)}</td>
                      <td className="text-right p-2">-</td>
                    </tr>
                  )}

                  {/* Fixed Expense */}
                  {trialBalance && trialBalance.debit.fixedExpense > 0 && (
                    <tr className="border-b">
                      <td className="p-2 pl-6">Fixed Expense</td>
                      <td className="text-right p-2">{formatCurrency(trialBalance.debit.fixedExpense)}</td>
                      <td className="text-right p-2">-</td>
                    </tr>
                  )}

                  {/* Miscellaneous Expense */}
                  {trialBalance && trialBalance.debit.miscellaneousExpense > 0 && (
                    <tr className="border-b">
                      <td className="p-2 pl-6">Miscellaneous Expense</td>
                      <td className="text-right p-2">{formatCurrency(trialBalance.debit.miscellaneousExpense)}</td>
                      <td className="text-right p-2">-</td>
                    </tr>
                  )}

                  {/* Other Expense */}
                  {trialBalance && trialBalance.debit.otherExpense > 0 && (
                    <tr className="border-b">
                      <td className="p-2 pl-6">Other Expense</td>
                      <td className="text-right p-2">{formatCurrency(trialBalance.debit.otherExpense)}</td>
                      <td className="text-right p-2">-</td>
                    </tr>
                  )}

                  {/* Lost and Damage Expense */}
                  {trialBalance && trialBalance.debit.lostAndDamageExpense > 0 && (
                    <tr className="border-b">
                      <td className="p-2 pl-6">Lost and Damage Expense</td>
                      <td className="text-right p-2">{formatCurrency(trialBalance.debit.lostAndDamageExpense)}</td>
                      <td className="text-right p-2">-</td>
                    </tr>
                  )}



                  {/* DEBIT TOTAL */}
                  <tr className="bg-muted font-bold border-t-2 border-b-2">
                    <td className="p-3">TOTAL DEBIT</td>
                    <td className="text-right p-3">{formatCurrency(trialBalance?.debit.total || 0)}</td>
                    <td className="text-right p-3">-</td>
                  </tr>

                  {/* CREDIT SIDE */}
                  <tr className="bg-muted/50">
                    <td colSpan={3} className="p-3 font-bold">CREDIT SIDE</td>
                  </tr>

                  {/* Accounts Payable */}
                  {trialBalance?.credit.accountPayablesPositive && trialBalance.credit.accountPayablesPositive.length > 0 && (
                    <>
                      <tr className="bg-muted/30">
                        <td colSpan={3} className="p-2 pl-6 font-semibold">Accounts Payable</td>
                      </tr>
                      {trialBalance.credit.accountPayablesPositive.map((ap) => (
                        <tr key={ap.id} className="border-b">
                          <td className="p-2 pl-10">{ap.name}</td>
                          <td className="text-right p-2">-</td>
                          <td className="text-right p-2">{formatCurrency(ap.balance)}</td>
                        </tr>
                      ))}
                    </>
                  )}

                  {/* Account Receivables (Negative - We Owe Customers) */}
                  {trialBalance?.credit.accountReceivablesNegative && trialBalance.credit.accountReceivablesNegative.length > 0 && (
                    <>
                      <tr className="bg-muted/30">
                        <td colSpan={3} className="p-2 pl-6 font-semibold">Account Receivables (We Owe Customers)</td>
                      </tr>
                      {trialBalance.credit.accountReceivablesNegative.map((ar) => (
                        <tr key={ar.id} className="border-b">
                          <td className="p-2 pl-10">{ar.name}</td>
                          <td className="text-right p-2">-</td>
                          <td className="text-right p-2">{formatCurrency(ar.balance)}</td>
                        </tr>
                      ))}
                    </>
                  )}

                  {/* Sales Revenue */}
                  {trialBalance && trialBalance.credit.salesRevenue > 0 && (
                    <tr className="border-b">
                      <td className="p-2 pl-6">Sales Revenue</td>
                      <td className="text-right p-2">-</td>
                      <td className="text-right p-2">{formatCurrency(trialBalance.credit.salesRevenue)}</td>
                    </tr>
                  )}

                  {/* Capital */}
                  {trialBalance && trialBalance.credit.capital > 0 && (
                    <tr className="border-b">
                      <td className="p-2 pl-6">Capital</td>
                      <td className="text-right p-2">-</td>
                      <td className="text-right p-2">{formatCurrency(trialBalance.credit.capital)}</td>
                    </tr>
                  )}



                  {/* CREDIT TOTAL */}
                  <tr className="bg-muted font-bold border-t-2 border-b-2">
                    <td className="p-3">TOTAL CREDIT</td>
                    <td className="text-right p-3">-</td>
                    <td className="text-right p-3">{formatCurrency(trialBalance?.credit.total || 0)}</td>
                  </tr>

                  {/* DIFFERENCE */}
                  <tr className={`font-bold border-t-4 ${Math.abs(trialBalance?.difference || 0) < 0.01 ? 'bg-green-50' : 'bg-yellow-50'}`}>
                    <td className="p-3">
                      {Math.abs(trialBalance?.difference || 0) < 0.01 ? '✓ BALANCED' : 'DIFFERENCE (Rounding)'}
                    </td>
                    <td className={`text-right p-3 ${trialBalance?.difference > 0 ? 'text-red-600' : ''}`}>
                      {trialBalance?.difference > 0 ? formatCurrency(trialBalance.difference) : '-'}
                    </td>
                    <td className={`text-right p-3 ${Math.abs(trialBalance?.difference || 0) < 0.01 ? 'text-green-600' : trialBalance?.difference < 0 ? 'text-blue-600' : ''}`}>
                      {Math.abs(trialBalance?.difference || 0) < 0.01 
                        ? '0.00' 
                        : trialBalance?.difference < 0 
                          ? formatCurrency(Math.abs(trialBalance.difference)) 
                          : '-'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {trialBalance && (
              <div className="mt-4 space-y-4">
                {Math.abs(trialBalance.difference) >= 0.01 && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800 font-semibold mb-2">
                      ⚠️ Trial Balance Difference: {formatCurrency(Math.abs(trialBalance.difference))}
                    </p>
                    <p className="text-sm text-yellow-800 mb-2">
                      The trial balance shows a difference. Please review the calculations.
                    </p>
                  </div>
                )}
                
                {trialBalance.debug && (
                  <details className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <summary className="cursor-pointer text-sm font-semibold text-gray-700 mb-2">
                      Debug Information (Click to expand)
                    </summary>
                    <div className="mt-3 space-y-2 text-xs text-gray-600">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="font-semibold mb-1">Debit Components:</p>
                          <ul className="list-disc list-inside space-y-1">
                            {Object.entries(trialBalance.debug.breakdown.debitComponents).map(([key, value]) => (
                              <li key={key}>
                                {key}: {formatCurrency(value)}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="font-semibold mb-1">Credit Components:</p>
                          <ul className="list-disc list-inside space-y-1">
                            {Object.entries(trialBalance.debug.breakdown.creditComponents).map(([key, value]) => (
                              <li key={key}>
                                {key}: {formatCurrency(value)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t">
                        <p><strong>Total Purchases:</strong> {formatCurrency(trialBalance.debug.totalPurchases)}</p>
                        <p><strong>Total Purchase Returns:</strong> {formatCurrency(trialBalance.debug.totalPurchaseReturns)}</p>
                        <p><strong>Total Sales:</strong> {formatCurrency(trialBalance.debug.totalSales)}</p>
                        <p><strong>Total Sale Returns:</strong> {formatCurrency(trialBalance.debug.totalSaleReturns)}</p>
                        <p><strong>Net Sales Revenue:</strong> {formatCurrency(trialBalance.debug.netSales)}</p>
                        <p><strong>Total Expenses:</strong> {formatCurrency(trialBalance.debug.totalExpenses)}</p>
                      </div>
                    </div>
                  </details>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
