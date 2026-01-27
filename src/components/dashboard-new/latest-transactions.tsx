import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

interface Transaction {
  id: string;
  type: string;
  total_amount: string;
  source_account_name?: string;
  destination_account_name?: string;
  account_payable_name?: string;
  account_receivable_name?: string;
  purchaser_name?: string;
  description?: string;
  date: string;
  created_at: string;
  // For sale/purchase transactions - product info
  productJunctions?: Array<{
    product_name?: string;
    per_unit_rate?: string;
    unit_price?: string;
    quantity?: string;
    total_amount?: string;
  }>;
}

export function LatestTransactions() {
  const { data: transactionsData, isLoading } = useQuery<{
    success: boolean;
    data: Transaction[];
  }>({
    queryKey: ['/api/transactions', 'latest'],
    queryFn: async () => {
      const response = await fetch('/api/transactions?limit=5&page=1', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch transactions');
      return response.json();
    },
  });

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 2,
    }).format(numAmount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTransactionDescription = (transaction: Transaction): string => {
    const amount = formatCurrency(transaction.total_amount || '0');
    
    switch (transaction.type) {
      case 'deposit':
        return `Rs: ${amount} deposit to ${transaction.destination_account_name || 'destination account'}`;
      
      case 'transfer':
      case 'transfer_out':
      case 'transfer_in':
        return `Rs: ${amount} transferred from ${transaction.source_account_name || 'source'} to ${transaction.destination_account_name || 'destination'}`;
      
      case 'sale':
        if (transaction.productJunctions && transaction.productJunctions.length > 0) {
          const product = transaction.productJunctions[0];
          const productName = product.product_name || 'Product';
          const price = product.per_unit_rate || product.unit_price;
          const priceFormatted = price ? formatCurrency(price) : '';
          return `${productName} sale on ${priceFormatted} (${amount})`;
        }
        return `Sale transaction of ${amount}`;
      
      case 'purchase':
        return `Purchase of ${amount}${transaction.account_payable_name ? ` from ${transaction.account_payable_name}` : ''}`;
      
      case 'sale_return':
        return `Sale return of ${amount}`;
      
      case 'purchase_return':
        return `Purchase return of ${amount}`;
      
      case 'pay_able':
      case 'pay_able_client':
        return `Rs: ${amount} paid${transaction.account_payable_name ? ` to ${transaction.account_payable_name}` : ''}`;
      
      case 'receive_able':
      case 'receive_able_vendor':
        return `Rs: ${amount} received${transaction.account_receivable_name ? ` from ${transaction.account_receivable_name}` : ''}`;
      
      case 'payroll':
        return `Payroll payment of ${amount}`;
      
      case 'fixed_utility':
        return `Utility payment of ${amount}`;
      
      case 'fixed_expense':
        return `Fixed expense of ${amount}`;
      
      case 'miscellaneous':
        return `Miscellaneous expense of ${amount}`;
      
      case 'loan':
        return `Loan of ${amount}${transaction.destination_account_name ? ` to ${transaction.destination_account_name}` : ''}`;
      
      case 'loan_return':
        return `Loan return of ${amount}`;
      
      case 'other_expense':
        return `Other expense of ${amount}`;
      
      case 'lost_and_damage':
        return `Lost and damage of ${amount}`;
      
      default:
        return transaction.description || `Transaction of ${amount}`;
    }
  };

  const getTransactionTypeColor = (type: string): string => {
    const colorMap: Record<string, string> = {
      deposit: 'text-blue-600 bg-blue-50',
      sale: 'text-green-600 bg-green-50',
      purchase: 'text-orange-600 bg-orange-50',
      transfer: 'text-purple-600 bg-purple-50',
      pay_able: 'text-red-600 bg-red-50',
      receive_able: 'text-emerald-600 bg-emerald-50',
      payroll: 'text-indigo-600 bg-indigo-50',
      loan: 'text-yellow-600 bg-yellow-50',
    };
    return colorMap[type] || 'text-gray-600 bg-gray-50';
  };

  const transactions = transactionsData?.data || [];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Latest Transactions
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No transactions found
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-start justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={cn(
                        "px-2 py-1 rounded-md text-xs font-medium capitalize",
                        getTransactionTypeColor(transaction.type)
                      )}
                    >
                      {transaction.type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(transaction.date || transaction.created_at)}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {formatTransactionDescription(transaction)}
                  </p>
                </div>
                <div className="ml-4 text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-foreground">
                    {formatCurrency(transaction.total_amount || '0')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
