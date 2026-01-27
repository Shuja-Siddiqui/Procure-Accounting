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
import type { TransactionWithRelations } from "@/types/transactions";

interface PurchasePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: TransactionWithRelations | null;
}

export function PurchasePrintModal({ isOpen, onClose, purchase }: PurchasePrintModalProps) {
  const { toast } = useToast();
  const [letterhead, setLetterhead] = useState<'maknisa' | 'adil-steel'>('maknisa');

  if (!purchase) return null;

  const formatCurrency = (amount: string | number | null) => {
    if (!amount) return '₨0';
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numAmount);
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const generatePDF = () => {
    if (!purchase) return;

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

    // Calculate totals
    const totalAmount = typeof purchase.total_amount === 'string' 
      ? parseFloat(purchase.total_amount) 
      : (purchase.total_amount || 0);
    const remainingAmount = typeof purchase.remaining_payment === 'string'
      ? parseFloat(purchase.remaining_payment)
      : (purchase.remaining_payment || 0);
    const amountPaid = totalAmount - remainingAmount;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Purchase ${purchase.id}</title>
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
          .invoice-info, .vendor-info {
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
          .products-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          .products-table th,
          .products-table td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
          }
          .products-table th {
            background-color: #f5f5f5;
            font-weight: bold;
          }
          .products-table .text-right {
            text-align: right;
          }
          .summary-section {
            margin-top: 20px;
            text-align: right;
          }
          .summary-row {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 8px;
          }
          .summary-label {
            width: 200px;
            text-align: right;
            padding-right: 20px;
            font-weight: bold;
          }
          .summary-value {
            width: 150px;
            text-align: right;
          }
          .total-amount {
            font-size: 20px;
            font-weight: bold;
            color: #333;
            border-top: 2px solid #333;
            padding-top: 10px;
            margin-top: 10px;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 20px;
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

          <div class="invoice-title">PURCHASE RECEIPT</div>

          <div class="invoice-details">
            <div class="invoice-info">
              <div class="info-section">
                <h3>Purchase Details</h3>
                <p><strong>Transaction ID:</strong> ${purchase.id}</p>
                <p><strong>Date:</strong> ${formatDate(purchase.date)}</p>
                <p><strong>Description:</strong> ${purchase.description || '-'}</p>
              </div>
            </div>
            <div class="vendor-info">
              <div class="info-section">
                <h3>Vendor</h3>
                <p><strong>${purchase.account_payable_name || 'N/A'}</strong></p>
              </div>
            </div>
          </div>

          ${purchase.productJunctions && purchase.productJunctions.length > 0 ? `
          <table class="products-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Brand</th>
                <th>Unit</th>
                <th class="text-right">Quantity</th>
                <th class="text-right">Unit Price</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${purchase.productJunctions.map(item => `
                <tr>
                  <td>${item.product_name || '-'}</td>
                  <td>${item.product_brand || '-'}</td>
                  <td>${item.unit || item.product_unit || '-'}</td>
                  <td class="text-right">${item.quantity}</td>
                  <td class="text-right">${formatCurrency(item.per_unit_rate)}</td>
                  <td class="text-right">${formatCurrency(item.total_amount)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ` : ''}

          <div class="summary-section">
            <div class="summary-row">
              <div class="summary-label">Total Amount:</div>
              <div class="summary-value">${formatCurrency(purchase.total_amount)}</div>
            </div>
            <div class="summary-row">
              <div class="summary-label">Amount Paid:</div>
              <div class="summary-value">${formatCurrency(amountPaid)}</div>
            </div>
            <div class="summary-row">
              <div class="summary-label">Remaining Amount:</div>
              <div class="summary-value">${formatCurrency(purchase.remaining_payment)}</div>
            </div>
            <div class="summary-row total-amount">
              <div class="summary-label">Total:</div>
              <div class="summary-value">${formatCurrency(purchase.total_amount)}</div>
            </div>
          </div>

          <div class="footer">
            <p>Thank you for your business!</p>
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
      description: "Purchase PDF generated successfully",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-md" data-testid="purchase-print-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Print Purchase
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
            <h4 className="font-medium mb-2">Purchase Details</h4>
            <div className="text-sm space-y-1">
              <p><strong>Transaction ID:</strong> {purchase.id}</p>
              <p><strong>Vendor:</strong> {purchase.account_payable_name || 'N/A'}</p>
              <p><strong>Total Amount:</strong> {formatCurrency(purchase.total_amount)}</p>
              <p><strong>Products:</strong> {purchase.productJunctions?.length || 0} item(s)</p>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={generatePDF} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Generate PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

