import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock } from "lucide-react";

interface Payable {
  id: string;
  account_payable_id: string;
  transaction_id: string;
  amount: string | number;
  total_payment: string | number;
  remaining_payment: string | number;
  status: 'pending' | 'partial_pending' | 'paid';
  description?: string | null;
  due_date?: string | null;
  accountPayable?: {
    id: string;
    name: string;
  };
}

interface PayableEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  payable: Payable | null;
}

export function PayableEditModal({ isOpen, onClose, payable }: PayableEditModalProps) {
  const formatCurrency = (amount: string | number | null) => {
    if (!amount) return '₨0.00';
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 2,
    }).format(numAmount);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '';
    return new Date(date).toISOString().split('T')[0];
  };

  if (!payable) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
            Edit Payable (Read-Only)
            <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payable Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="payable-id">Payable ID</Label>
                <Input
                  id="payable-id"
                  value={payable.id}
                  disabled
                  className="font-mono"
                />
              </div>

              <div>
                <Label htmlFor="vendor">Vendor</Label>
                <Input
                  id="vendor"
                  value={payable.accountPayable?.name || 'Unknown'}
                  disabled
                />
              </div>

              <div>
                <Label htmlFor="amount">Total Amount</Label>
                <Input
                  id="amount"
                  value={formatCurrency(payable.amount)}
                  disabled
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="total-payment">Amount Paid</Label>
                  <Input
                    id="total-payment"
                    value={formatCurrency(payable.total_payment)}
                    disabled
                  />
                </div>
                <div>
                  <Label htmlFor="remaining-payment">Amount Remaining</Label>
                  <Input
                    id="remaining-payment"
                    value={formatCurrency(payable.remaining_payment)}
                    disabled
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={payable.status} disabled>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="partial_pending">Partial Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="due-date">Due Date</Label>
                <Input
                  id="due-date"
                  type="date"
                  value={formatDate(payable.due_date)}
                  disabled
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={payable.description || ''}
                  disabled
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Edit functionality will be available in a future update.
            </p>
          </div>

          <div className="flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

