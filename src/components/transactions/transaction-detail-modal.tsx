import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import type { Transaction } from "@shared/schema";
import { format } from "date-fns";

interface ProductJunction {
  id: string;
  product_id: string;
  quantity: string;
  unit?: string;
  per_unit_rate?: string;
  unit_price?: string;
  total_amount?: string;
  product_name?: string;
  product_brand?: string;
  product_unit?: string;
  product_current_price?: string;
  discount?: string;
  discount_per_unit?: string;
}

interface TransactionWithProducts extends Transaction {
  productJunctions?: ProductJunction[];
}

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionId: string | null;
}

export function TransactionDetailModal({ isOpen, onClose, transactionId }: TransactionDetailModalProps) {
  const { data: transaction, isLoading } = useQuery({
    queryKey: ['/api/transactions', transactionId],
    queryFn: () => apiRequest('GET', `/api/transactions/${transactionId}/relations`),
    enabled: !!transactionId && isOpen,
  });

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
    return format(new Date(date), 'PPP');
  };

  const getTransactionTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      'deposit': 'Deposit',
      'transfer': 'Transfer',
      'purchase': 'Purchase',
      'purchase_return': 'Purchase Return',
      'sale': 'Sale',
      'sale_return': 'Sale Return',
      'advance_purchase_inventory': 'Advance Purchase Inventory',
      'advance_sale_payment': 'Advance Sale Payment',
      'advance_purchase_payment': 'Advance Purchase Payment',
      'advance_sale_inventory': 'Advance Sale Inventory',
      'asset_purchase': 'Asset Purchase',
      'loan': 'Loan',
      'loan_return': 'Loan Return',
      'other_expense': 'Other Expense',
      'lost_and_damage': 'Lost and Damage',
      'pay_able': 'Payable',
      'receive_able': 'Receivable',
      'payroll': 'Payroll',
      'fixed_utility': 'Fixed Utility',
      'fixed_expense': 'Fixed Expense',
      'miscellaneous': 'Miscellaneous',
    };
    return typeMap[type] || type;
  };

  const getModeOfPaymentLabel = (mode: string | null) => {
    if (!mode) return '-';
    const modeMap: Record<string, string> = {
      'check': 'Check',
      'cash': 'Cash',
      'bank_transfer': 'Bank Transfer',
      'pay_order': 'Pay Order',
    };
    return modeMap[mode] || mode;
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-32 w-full" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const transactionData = transaction?.data as TransactionWithProducts;

  if (!transactionData) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Transaction not found</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="transaction-detail-modal">
        <DialogHeader>
          <DialogTitle>Transaction Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Transaction Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {getTransactionTypeLabel(transactionData.type)}
                </CardTitle>
                <Badge variant="outline" className="capitalize">
                  {transactionData.type}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Amount</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(transactionData.paid_amount || transactionData.total_amount || '0')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Date</p>
                  <p className="text-lg">{formatDate(transactionData.date)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transaction Details */}
          <Card>
            <CardHeader>
              <CardTitle>Transaction Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p className="text-sm">{transactionData.description || 'No description'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Payment Mode</p>
                  <p className="text-sm">{getModeOfPaymentLabel(transactionData.mode_of_payment)}</p>
                </div>
                {transactionData.total_amount && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                    <p className="text-sm">{formatCurrency(transactionData.total_amount)}</p>
                  </div>
                )}
                {transactionData.paid_amount && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Paid Amount</p>
                    <p className="text-sm">{formatCurrency(transactionData.paid_amount)}</p>
                  </div>
                )}
                {transactionData.remaining_payment && parseFloat(transactionData.remaining_payment.toString()) !== 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Remaining Payment</p>
                    <p className="text-sm">{formatCurrency(transactionData.remaining_payment)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Account Information */}
          {(transactionData.source_account || transactionData.destination_account) && (
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {transactionData.source_account && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Source Account</p>
                    <div className="mt-1 p-3 bg-muted rounded-md">
                      <p className="text-sm font-medium">{transactionData.source_account.name}</p>
                      {/* <p className="text-xs text-muted-foreground">
                        {transactionData.source_account.account_number} • {transactionData.source_account.account_type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Balance: {formatCurrency(transactionData.source_account.balance)}
                      </p> */}
                    </div>
                  </div>
                )}
                {transactionData.destination_account && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Destination Account</p>
                    <div className="mt-1 p-3 bg-muted rounded-md">
                      <p className="text-sm font-medium">{transactionData.destination_account.name}</p>
                      {/* <p className="text-xs text-muted-foreground">
                        {transactionData.destination_account.account_number} • {transactionData.destination_account.account_type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Balance: {formatCurrency(transactionData.destination_account.balance)}
                      </p> */}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Purchased Products - Show for purchase transactions */}
          {transactionData.type === 'purchase' && transactionData.productJunctions && transactionData.productJunctions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Purchased Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {transactionData.productJunctions.map((product: ProductJunction, index: number) => (
                    <div key={product.id || index} className="p-4 border rounded-lg bg-muted/50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-sm">{product.product_name || 'Unknown Product'}</h4>
                          {product.product_brand && (
                            <p className="text-xs text-muted-foreground">Brand: {product.product_brand}</p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {product.quantity} {product.unit || product.product_unit || 'units'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div>
                          <p className="text-muted-foreground">Rate per Unit</p>
                          <p className="font-medium">{formatCurrency(product.unit_price || product.per_unit_rate)}</p>
                          {product.discount_per_unit && parseFloat(product.discount_per_unit) > 0 && (
                            <p className="text-xs text-muted-foreground line-through">
                              {formatCurrency(parseFloat(product.per_unit_rate || '0') + parseFloat(product.discount_per_unit))}
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total Amount</p>
                          <p className="font-medium">{formatCurrency(product.total_amount)}</p>
                          {product.discount && parseFloat(product.discount) > 0 && (
                            <p className="text-xs text-green-600">
                              Discount: -{formatCurrency(product.discount)}
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-muted-foreground">Current Price</p>
                          <p className="font-medium">{formatCurrency(product.product_current_price)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Product ID</p>
                          <p className="font-mono text-xs">{product.product_id}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Total Products:</span>
                      <span className="text-sm font-bold">{transactionData.productJunctions.length}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Purchase Return Products - Show for purchase_return transactions */}
          {transactionData.type === 'purchase_return' && transactionData.productJunctions && transactionData.productJunctions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Returned Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {transactionData.productJunctions.map((product: ProductJunction, index: number) => (
                    <div key={product.id || index} className="p-4 border rounded-lg bg-purple-50 border-purple-200">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-sm text-purple-800">{product.product_name || 'Unknown Product'}</h4>
                          {product.product_brand && (
                            <p className="text-xs text-purple-600">Brand: {product.product_brand}</p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800 border-purple-300">
                          {product.quantity} {product.unit || product.product_unit || 'units'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div>
                          <p className="text-purple-600 font-medium">Return Price per Unit</p>
                          <p className="font-medium text-purple-800">{formatCurrency(product.per_unit_rate)}</p>
                        </div>
                        <div>
                          <p className="text-purple-600 font-medium">Total Return Amount</p>
                          <p className="font-medium text-purple-800">{formatCurrency(product.total_amount)}</p>
                        </div>
                        <div>
                          <p className="text-purple-600 font-medium">Discount/Unit</p>
                          <p className="font-medium text-purple-800">
                            {product.discount_per_unit ? formatCurrency(product.discount_per_unit) : '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-purple-600 font-medium">Discount</p>
                          <p className="font-medium text-purple-800">
                            {product.discount ? formatCurrency(product.discount) : '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-purple-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-purple-800">Total Products Returned:</span>
                      <span className="text-sm font-bold text-purple-800">{transactionData.productJunctions.length}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sold Products - Show for sale transactions */}
          {transactionData.type === 'sale' && transactionData.productJunctions && transactionData.productJunctions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Sold Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {transactionData.productJunctions.map((product: ProductJunction, index: number) => (
                    <div key={product.id || index} className="p-4 border rounded-lg bg-green-50 border-green-200">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-sm text-green-800">{product.product_name || 'Unknown Product'}</h4>
                          {product.product_brand && (
                            <p className="text-xs text-green-600">Brand: {product.product_brand}</p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs bg-green-100 text-green-800 border-green-300">
                          {product.quantity} {product.unit || product.product_unit || 'units'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div>
                          <p className="text-green-600 font-medium">Sale Price per Unit</p>
                          <p className="font-medium text-green-800">{formatCurrency(product.per_unit_rate)}</p>
                        </div>
                        <div>
                          <p className="text-green-600 font-medium">Total Sale Amount</p>
                          <p className="font-medium text-green-800">{formatCurrency(product.total_amount)}</p>
                        </div>
                        <div>
                          <p className="text-green-600 font-medium">Current Inventory Price</p>
                          <p className="font-medium text-green-800">{formatCurrency(product.product_current_price)}</p>
                        </div>
                        <div>
                          <p className="text-green-600 font-medium">Product ID</p>
                          <p className="font-mono text-xs text-green-800">{product.product_id}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-green-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-green-800">Total Products Sold:</span>
                      <span className="text-sm font-bold text-green-800">{transactionData.productJunctions.length}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Related Entities */}
          {(transactionData.accountPayable || transactionData.accountReceivable || transactionData.purchaser || transactionData.product) && (
            <Card>
              <CardHeader>
                <CardTitle>Related Entities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {transactionData.accountPayable && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Account Payable</p>
                    <div className="mt-1 p-3 bg-muted rounded-md">
                      <p className="text-sm font-medium">{transactionData.accountPayable.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {transactionData.accountPayable.number} • {transactionData.accountPayable.city}
                      </p>
                    </div>
                  </div>
                )}
                {transactionData.accountReceivable && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Account Receivable</p>
                    <div className="mt-1 p-3 bg-muted rounded-md">
                      <p className="text-sm font-medium">{transactionData.accountReceivable.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {transactionData.accountReceivable.number} • {transactionData.accountReceivable.city}
                      </p>
                    </div>
                  </div>
                )}
                {transactionData.purchaser && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Purchaser</p>
                    <div className="mt-1 p-3 bg-muted rounded-md">
                      <p className="text-sm font-medium">{transactionData.purchaser.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {transactionData.purchaser.number} • {transactionData.purchaser.city}
                      </p>
                    </div>
                  </div>
                )}
                {transactionData.product && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Product</p>
                    <div className="mt-1 p-3 bg-muted rounded-md">
                      <p className="text-sm font-medium">{transactionData.product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {transactionData.product.brand} • {transactionData.product.unit}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Current Price: {formatCurrency(transactionData.product.current_price)}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Balance Information */}
          {(transactionData.opening_balance || transactionData.closing_balance) && (
            <Card>
              <CardHeader>
                <CardTitle>Balance Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Opening Balance</p>
                    <p className="text-lg font-semibold">{formatCurrency(transactionData.opening_balance)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Closing Balance</p>
                    <p className="text-lg font-semibold">{formatCurrency(transactionData.closing_balance)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timestamps */}
          <Card>
            <CardHeader>
              <CardTitle>Timestamps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Created At</p>
                  <p className="text-sm">{formatDate(transactionData.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Updated At</p>
                  <p className="text-sm">{formatDate(transactionData.updated_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
