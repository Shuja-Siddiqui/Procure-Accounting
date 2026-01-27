import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertTriangle,
  Package,
  Calendar,
  Hash,
  DollarSign
} from "lucide-react";
import { CopyableId } from "@/components/ui/copyable-id";
interface InventoryHistoryRecord {
  id: string;
  product_id: string;
  transaction_id: string;
  type: string;
  quantity_change: string;
  quantity_before: string;
  quantity_after: string;
  price_per_unit?: string;
  total_amount?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  transaction_type?: string;
  transaction_date?: string;
}

interface InventoryHistoryTableProps {
  history: InventoryHistoryRecord[];
  isLoading: boolean;
}

export function InventoryHistoryTable({ history, isLoading }: InventoryHistoryTableProps) {
  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 2,
    }).format(parseFloat(amount));
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMovementTypeDetails = (quantityChange: string) => {
    const quantity = parseFloat(quantityChange);
    if (quantity > 0) {
      return { 
        color: 'bg-emerald-100 text-emerald-800', 
        icon: <TrendingUp className="w-4 h-4" />, 
        label: 'In' 
      };
    } else if (quantity < 0) {
      return { 
        color: 'bg-red-100 text-red-800', 
        icon: <TrendingDown className="w-4 h-4" />, 
        label: 'Out' 
      };
    } else {
      return { 
        color: 'bg-gray-100 text-gray-800', 
        icon: <Minus className="w-4 h-4" />, 
        label: 'No Change' 
      };
    }
  };

  if (isLoading) {
    return (
      <Card data-testid="inventory-history-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="w-5 h-5" />
            <span>Inventory History</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="inventory-history-card">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Package className="w-5 h-5" />
          <span>Inventory History</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="text-center py-8">
            <AlertTriangle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No inventory history found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Inventory movements will appear here when products are added or removed
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Transaction ID
                    </TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Type
                    </TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Movement
                    </TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Before
                    </TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      After
                    </TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Unit Rate
                    </TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Total Amount
                    </TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Date
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((record) => {
                    const movementDetails = getMovementTypeDetails(record.quantity_change);
                    return (
                      <TableRow 
                        key={record.id}
                        className="hover:bg-muted/30 transition-colors"
                        data-testid={`history-row-${record.id}`}
                      >
                        <TableCell className="whitespace-nowrap">
                          <CopyableId id={record.transaction_id} />
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant="outline" className="capitalize">
                            {record.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${movementDetails.color}`}>
                              {movementDetails.icon}
                            </div>
                            <span className="text-sm font-medium text-foreground">
                              {parseFloat(record.quantity_change) > 0 ? '+' : ''}{record.quantity_change}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {record.quantity_before}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {record.quantity_after}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm font-medium text-foreground">
                          {record.price_per_unit ? formatCurrency(record.price_per_unit) : '-'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm font-medium text-foreground">
                          {record.total_amount ? formatCurrency(record.total_amount) : '-'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(record.created_at.toString())}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {history.map((record) => {
                const movementDetails = getMovementTypeDetails(record.quantity_change);
                return (
                  <div key={record.id} className="border rounded-lg p-4 space-y-2 bg-card">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Transaction ID</span>
                      <CopyableId id={record.transaction_id} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize text-xs">
                        {record.type}
                      </Badge>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${movementDetails.color}`}>
                        {movementDetails.icon}
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {parseFloat(record.quantity_change) > 0 ? '+' : ''}{record.quantity_change}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t">
                      <div>
                        <span className="text-xs text-muted-foreground">Before</span>
                        <div className="text-xs">{record.quantity_before}</div>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">After</span>
                        <div className="text-xs">{record.quantity_after}</div>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Unit Rate</span>
                        <div className="text-xs font-medium">
                          {record.price_per_unit ? formatCurrency(record.price_per_unit) : '-'}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Total Amount</span>
                        <div className="text-xs font-medium">
                          {record.total_amount ? formatCurrency(record.total_amount) : '-'}
                        </div>
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Date</span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {formatDate(record.created_at.toString())}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
        
        {history.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-emerald-100 rounded-full"></div>
                  <span>In</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-100 rounded-full"></div>
                  <span>Out</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gray-100 rounded-full"></div>
                  <span>No Change</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Hash className="w-4 h-4" />
                <span>{history.length} records</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}





