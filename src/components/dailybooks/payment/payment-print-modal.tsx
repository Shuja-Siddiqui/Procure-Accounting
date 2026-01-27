import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Printer, Download, FileText } from "lucide-react";

interface PaymentTransaction {
  id: string;
  type: string;
  account_payable_id: string;
  source_account_id?: string | null;
  total_amount: string | number;
  paid_amount?: string | number;
  remaining_payment?: string | number;
  description?: string | null;
  mode_of_payment?: string | null;
  date: string;
  payment_invoice_number?: string | null;
  created_at: string;
  updated_at: string;
  accountPayable?: {
    id: string;
    name: string;
    number?: string;
    city?: string;
    address?: string;
  } | null;
  account_payable?: {
    id: string;
    name: string;
    number?: string;
    city?: string;
    address?: string;
  } | null;
  source_account?: {
    id: string;
    name: string;
    account_type?: string | null;
  } | null;
}

interface PaymentPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: PaymentTransaction | null;
  keepDetailModalOpen?: boolean; // If true, don't close detail modal when this opens
}

export function PaymentPrintModal({ isOpen, onClose, payment, keepDetailModalOpen }: PaymentPrintModalProps) {
  const { toast } = useToast();
  const [letterhead, setLetterhead] = useState<'maknisa' | 'adil-steel'>('maknisa');

  const formatCurrency = (amount: string | number | null) => {
    if (!amount) return '₨0.00';
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numAmount);
  };

  const getModeOfPaymentLabel = (mode: string | null) => {
    if (!mode) return '-';
    const modeMap: Record<string, string> = {
      'check': 'Check',
      'cash': 'Cash',
      'bank_transfer': 'Bank Transfer',
      'pay_order': 'Pay Order',
    };
    return modeMap[mode] || mode.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getPaymentTypeInvoiceHeading = (type: string | null) => {
    if (type === 'advance_purchase_payment') {
      return 'ADVANCE PAYMENT INVOICE';
    }
    return 'PAYMENT INVOICE';
  };

  const getPaymentTypeHeading = (type: string | null) => {
    if (type === 'advance_purchase_payment') {
      return 'Advance Payment Invoice';
    }
    return 'Payment Invoice';
  };

  const generatePDF = () => {
    if (!payment) return;

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const letterheadData = {
      maknisa: {
        companyName: "MAKNISA PROCUREMENT",
        address: "123 Business Street, Karachi, Pakistan",
        phone: "+92 300 1234567",
        email: "info@maknisa.com"
      },
      'adil-steel': {
        companyName: "ADIL STEEL",
        address: "456 Steel Avenue, Lahore, Pakistan", 
        phone: "+92 300 7654321",
        email: "info@adilsteel.com"
      }
    };

    const selectedLetterhead = letterheadData[letterhead];
    const accountPayable = payment.accountPayable || payment.account_payable;

    const invoiceNumber = payment.payment_invoice_number || payment.id.substring(0, 8).toUpperCase();
    
    // For payment transactions:
    // total_amount = account payable balance at time of payment
    // paid_amount = amount paid
    // remaining_payment = remaining balance after payment
    const pendingBalance = typeof payment.total_amount === 'string' ? parseFloat(payment.total_amount) : payment.total_amount || 0;
    const paidAmount = typeof payment.paid_amount === 'string' ? parseFloat(payment.paid_amount) : payment.paid_amount || 0;
    const remaining = typeof payment.remaining_payment === 'string' ? parseFloat(payment.remaining_payment) : payment.remaining_payment || 0;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Invoice ${invoiceNumber}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: white;
            color: black;
          }
          .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            border: 1px solid #ddd;
            padding: 30px;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .company-name {
            font-size: 28px;
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
          }
          .company-details {
            font-size: 14px;
            color: #666;
            line-height: 1.5;
          }
          .invoice-title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
            text-align: center;
          }
          .invoice-details {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
          }
          .invoice-info, .account-payable-info {
            flex: 1;
          }
          .info-section h3 {
            margin: 0 0 10px 0;
            font-size: 16px;
            color: #333;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
          }
          .info-section p {
            margin: 5px 0;
            font-size: 14px;
          }
          .payment-summary {
            border-top: 2px solid #333;
            padding-top: 15px;
            margin-top: 10px;
            display: flex;
            justify-content: flex-end;
          }
          .summary-box {
            width: 260px;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 6px;
            font-size: 14px;
          }
          .summary-row.total span:last-child {
            font-size: 16px;
            font-weight: 600;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 20px;
          }
          .description {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
          }
          .description h4 {
            margin: 0 0 10px 0;
            font-size: 14px;
            font-weight: 600;
            color: #333;
          }
          .description p {
            margin: 0;
            font-size: 13px;
            color: #666;
            white-space: pre-wrap;
          }
          @media print {
            body { margin: 0; }
            .invoice-container { border: none; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header">
            <div class="company-name">${selectedLetterhead.companyName}</div>
            <div class="company-details">
              ${selectedLetterhead.address}<br>
              Phone: ${selectedLetterhead.phone} | Email: ${selectedLetterhead.email}
            </div>
          </div>

          <div class="invoice-title">${getPaymentTypeInvoiceHeading(payment.type)}</div>

          <div class="invoice-details">
            <div class="invoice-info">
              <div class="info-section">
                <h3>Payment Details</h3>
                <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
                <p><strong>Payment Date:</strong> ${new Date(payment.date).toLocaleDateString()}</p>
                ${payment.mode_of_payment ? `<p><strong>Payment Mode:</strong> ${getModeOfPaymentLabel(payment.mode_of_payment)}</p>` : ''}
                ${payment.source_account ? `<p><strong>Paid From Account:</strong> ${payment.source_account.name}</p>` : ''}
                <p><strong>Status:</strong> PAID</p>
              </div>
            </div>
            <div class="account-payable-info">
              <div class="info-section">
                <h3>Account Payable Details</h3>
                <p><strong>${accountPayable?.name || 'Unknown Account Payable'}</strong></p>
                ${accountPayable?.number ? `<p>Phone: ${accountPayable.number}</p>` : ''}
                ${accountPayable?.city ? `<p>City: ${accountPayable.city}</p>` : ''}
                ${accountPayable?.address ? `<p>Address: ${accountPayable.address}</p>` : ''}
              </div>
            </div>
          </div>

          <div class="payment-summary">
            <div class="summary-box">
              <div class="summary-row">
                <span>Pending Balance:</span>
                <span style="color: orange; font-weight: 600;">${formatCurrency(pendingBalance)}</span>
              </div>
              <div class="summary-row">
                <span>Paid Amount:</span>
                <span style="color: green; font-weight: 600;">${formatCurrency(paidAmount)}</span>
              </div>
              <div class="summary-row total">
                <span>Remaining:</span>
                <span style="color: orange; font-weight: 600;">${formatCurrency(remaining)}</span>
              </div>
            </div>
          </div>

          ${payment.description ? `
          <div class="description">
            <h4>Notes</h4>
            <p>${payment.description}</p>
          </div>
          ` : ''}

          <div class="footer">
            <p>Payment received. Thank you!</p>
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
        </div>
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

    toast({
      title: "Success",
      description: "Payment Invoice PDF generated successfully",
    });
  };

  if (!payment) return null;

  const accountPayable = payment.accountPayable || payment.account_payable;
  const pendingBalance = typeof payment.total_amount === 'string' ? parseFloat(payment.total_amount) : payment.total_amount || 0;
  const paidAmount = typeof payment.paid_amount === 'string' ? parseFloat(payment.paid_amount) : payment.paid_amount || 0;
  const remaining = typeof payment.remaining_payment === 'string' ? parseFloat(payment.remaining_payment) : payment.remaining_payment || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-md" data-testid="payment-print-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Print {getPaymentTypeHeading(payment.type)}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Select Letterhead</h3>
            <RadioGroup value={letterhead} onValueChange={(value: 'maknisa' | 'adil-steel') => setLetterhead(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="maknisa" id="maknisa" />
                <Label htmlFor="maknisa" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Maknisa Procurement
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="adil-steel" id="adil-steel" />
                <Label htmlFor="adil-steel" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Adil Steel
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">Payment Details</h4>
            <div className="text-sm space-y-1">
              <p><strong>Payment ID:</strong> {payment.id}</p>
              <p><strong>Account Payable:</strong> {accountPayable?.name || 'Unknown'}</p>
              <p><strong>Pending Balance:</strong> {formatCurrency(pendingBalance)}</p>
              <p><strong>Paid Amount:</strong> {formatCurrency(paidAmount)}</p>
              <p><strong>Remaining:</strong> {formatCurrency(remaining)}</p>
              <p><strong>Invoice Number:</strong> {payment.payment_invoice_number || '-'}</p>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => {
              generatePDF();
              // Close modal after printing
              setTimeout(() => {
                onClose();
              }, 1000);
            }} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Generate PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

