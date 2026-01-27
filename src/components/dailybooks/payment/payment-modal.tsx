import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { DollarSign, Package, Building2, Calendar, FileText } from "lucide-react";
import type { TransactionWithRelations } from "@/types/transactions";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: TransactionWithRelations | null;
}

export function PaymentModal({ isOpen, onClose, purchase }: PaymentModalProps) {
  if (!purchase) return null;

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

  const isUnpaid = (remainingPayment: string | number | null): boolean => {
    if (!remainingPayment) return false;
    const remaining = typeof remainingPayment === 'string' ? parseFloat(remainingPayment) : remainingPayment;
    return remaining > 0;
  };

  const paidAmount = typeof purchase.paid_amount === 'string' 
    ? parseFloat(purchase.paid_amount) 
    : (purchase.paid_amount || 0);
  const remainingAmount = typeof purchase.remaining_payment === 'string'
    ? parseFloat(purchase.remaining_payment)
    : (purchase.remaining_payment || 0);
  const amountPaid = paidAmount - remainingAmount;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Payment Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Transaction Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Transaction Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Transaction ID</p>
                  <p className="font-medium">{purchase.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {formatDate(purchase.date)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="font-medium">{purchase.description || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment Mode</p>
                  <p className="font-medium">{getModeOfPaymentLabel(purchase.mode_of_payment)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
                  <p className="text-2xl font-bold">{formatCurrency(purchase.total_amount)}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Amount Paid</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(amountPaid)}</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Remaining Amount</p>
                  <p className="text-2xl font-bold text-orange-600">{formatCurrency(purchase.remaining_payment)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">Status:</p>
                {isUnpaid(purchase.remaining_payment) ? (
                  <Badge variant="destructive">Unpaid</Badge>
                ) : (
                  <Badge variant="default" className="bg-green-600">Paid</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Account Payable */}
          {purchase.account_payable_name && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Account Payable (Vendor)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium text-lg">{purchase.account_payable_name}</p>
              </CardContent>
            </Card>
          )}

          {/* Products */}
          {purchase.productJunctions && purchase.productJunctions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Products ({purchase.productJunctions.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {purchase.productJunctions.map((junction, index) => (
                    <div key={junction.id || index}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{junction.product_name || 'Unknown Product'}</p>
                          {junction.product_brand && (
                            <p className="text-sm text-muted-foreground">Brand: {junction.product_brand}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span>Quantity: {junction.quantity} {junction.unit || junction.product_unit || ''}</span>
                            {junction.per_unit_rate && (
                              <span>Rate: {formatCurrency(junction.per_unit_rate)} per {junction.unit || junction.product_unit || 'unit'}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(junction.total_amount)}</p>
                        </div>
                      </div>
                      {index < purchase.productJunctions!.length - 1 && <Separator className="mt-4" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

