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

interface Invoice {
  id: string;
  account_receivable_id: string;
  invoice_number: string;
  total_amount: string;
  status: 'pending' | 'paid' | 'cancelled';
  created_at: string;
  updated_at: string;
  accountReceivable: {
    id: string;
    name: string;
    number?: string;
    cnic?: string;
    city?: string;
    address?: string;
    status: 'active' | 'inactive';
  };
  products: Array<{
    id: string;
    product_id: string;
    units_of_product: number;
    amount_of_product: string;
    created_at: string;
    product: {
      id: string;
      name: string;
      brand?: string;
      unit?: string;
      current_price?: number;
      construction_category?: 'grey' | 'finishing' | 'both';
    };
  }>;
}

interface InvoicePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
}

export function InvoicePrintModal({ isOpen, onClose, invoice }: InvoicePrintModalProps) {
  const { toast } = useToast();
  const [letterhead, setLetterhead] = useState<'maknisa' | 'adil-steel'>('maknisa');

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numAmount);
  };

  const getAdilSteelHeader = () => {
    const baseUrl = window.location.origin;
    return `
      <div class="adil-header">
        <div class="adil-header-content">
          <div class="adil-logo-section">
            <img src="${baseUrl}/images/adil-steel/logo.png" alt="Adil Steel Logo" class="adil-logo" onerror="this.style.display='none'">
          </div>
          <div class="adil-center-section">
            <div class="adil-company-name">Adil Steel</div>
            <div class="adil-company-tagline">All kind of Graded Steel (Brands) Deformed G-60,G-40</div>
          </div>
          <div class="adil-image-section">
            <img src="${baseUrl}/images/adil-steel/header-image.png" alt="Steel Bars" class="adil-header-image" onerror="this.style.display='none'">
          </div>
        </div>
      </div>
    `;
  };

  const getAdilSteelFooter = () => {
    return `
      <div class="adil-footer">
        <div class="adil-footer-content">
          <p>Godown: Dera Chahal Opposite Elite Police Academy Bedian Road Lahore,</p>
          <p>Phone: 0333489944 (Jameel Siddique) 03004835067 (Asif Noor)</p>
        </div>
      </div>
    `;
  };

  const getMaknisaHeader = (companyName: string, address: string, phone: string, email: string) => {
    return `
      <div class="header">
        <div class="company-name">${companyName}</div>
        <div class="company-details">
          ${address}<br>
          Phone: ${phone} | Email: ${email}
        </div>
      </div>
    `;
  };

  const getMaknisaFooter = () => {
    return `
      <div class="footer">
        <p>Thank you for your business!</p>
        <p>Generated on ${new Date().toLocaleString()}</p>
      </div>
    `;
  };

  const generatePDF = () => {
    if (!invoice) return;

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
    const isAdilSteel = letterhead === 'adil-steel';

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${invoice.invoice_number}</title>
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
          /* Adil Steel Header Styles */
          .adil-header {
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #333;
          }
          .adil-header-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
          }
          .adil-logo-section {
            flex: 0 0 auto;
            width: 120px;
          }
          .adil-logo {
            max-width: 100%;
            height: auto;
            max-height: 100px;
          }
          .adil-center-section {
            flex: 1;
            text-align: center;
            padding: 0 20px;
          }
          .adil-company-name {
            font-size: 32px;
            font-weight: bold;
            color: #333;
            font-family: 'Times New Roman', serif;
            margin-bottom: 8px;
          }
          .adil-company-tagline {
            font-size: 14px;
            color: #333;
            font-family: 'Times New Roman', serif;
            line-height: 1.4;
          }
          .adil-image-section {
            flex: 0 0 auto;
            width: 150px;
            text-align: right;
          }
          .adil-header-image {
            max-width: 100%;
            height: auto;
            max-height: 100px;
          }
          /* Adil Steel Footer Styles */
          .adil-footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
          }
          .adil-footer-content {
            text-align: center;
            font-size: 13px;
            color: #333;
            line-height: 1.6;
          }
          .adil-footer-content p {
            margin: 4px 0;
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
          .invoice-info, .account-receivable-info {
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
          .total-section {
            text-align: right;
            margin-top: 20px;
          }
          .total-amount {
            font-size: 20px;
            font-weight: bold;
            color: #333;
            border-top: 2px solid #333;
            padding-top: 10px;
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
            .adil-header-content {
              display: flex !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          ${isAdilSteel ? getAdilSteelHeader() : getMaknisaHeader(selectedLetterhead.companyName, selectedLetterhead.address, selectedLetterhead.phone, selectedLetterhead.email)}

          <div class="invoice-title">INVOICE</div>

          <div class="invoice-details">
            <div class="invoice-info">
              <div class="info-section">
                <h3>Invoice Details</h3>
                <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
                <p><strong>Date:</strong> ${new Date(invoice.created_at).toLocaleDateString()}</p>
                <p><strong>Status:</strong> ${invoice.status.toUpperCase()}</p>
              </div>
            </div>
            <div class="account-receivable-info">
              <div class="info-section">
                <h3>Bill To</h3>
                <p><strong>${invoice.accountReceivable.name}</strong></p>
                ${invoice.accountReceivable.number ? `<p>Phone: ${invoice.accountReceivable.number}</p>` : ''}
                ${invoice.accountReceivable.city ? `<p>City: ${invoice.accountReceivable.city}</p>` : ''}
                ${invoice.accountReceivable.address ? `<p>Address: ${invoice.accountReceivable.address}</p>` : ''}
              </div>
            </div>
          </div>

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
              ${invoice.products.map(item => `
                <tr>
                  <td>${item.product.name}</td>
                  <td>${item.product.brand || '-'}</td>
                  <td>${item.product.unit || '-'}</td>
                  <td class="text-right">${item.units_of_product}</td>
                  <td class="text-right">${formatCurrency(item.amount_of_product)}</td>
                  <td class="text-right">${formatCurrency(item.units_of_product * parseFloat(item.amount_of_product))}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="total-section">
            <div class="total-amount">
              Total Amount: ${formatCurrency(invoice.total_amount)}
            </div>
          </div>

          ${isAdilSteel ? getAdilSteelFooter() : getMaknisaFooter()}
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
      description: "Invoice PDF generated successfully",
    });
  };

  if (!invoice) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-md" data-testid="invoice-print-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Print Invoice
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
            <h4 className="font-medium mb-2">Invoice Details</h4>
            <div className="text-sm space-y-1">
              <p><strong>Invoice:</strong> {invoice.invoice_number}</p>
              <p><strong>Account Receivable:</strong> {invoice.accountReceivable.name}</p>
              <p><strong>Amount:</strong> {formatCurrency(invoice.total_amount)}</p>
              <p><strong>Products:</strong> {invoice.products.length} item(s)</p>
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






