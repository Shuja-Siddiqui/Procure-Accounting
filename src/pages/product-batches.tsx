import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Package, Hash, Calendar } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Product } from "@shared/schema";

interface Batch {
  id: string;
  product_id: string;
  batch_number: string;
  original_quantity: string;
  available_quantity: string;
  purchase_price_per_unit: string;
  purchase_total_price: string;
  transaction_id: string;
  purchaser_id?: string | null;
  purchase_date: string;
  status: "active" | "exhausted" | "expired";
  unit?: string | null;
  created_at: string;
  updated_at: string;
  product_name: string;
}

export default function ProductBatches() {
  const [, params] = useRoute("/products/:id/productBatchs");
  const [, setLocation] = useLocation();
  const id = params?.id;

  const { data: productResponse, isLoading: isProductLoading } = useQuery<{
    success: boolean;
    data: Product;
  }>({
    queryKey: ['/api/products', id],
    queryFn: async () => {
      const response = await fetch(`/api/products/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch product');
      }
      return response.json();
    },
    enabled: !!id,
  });

  const { data: batchesResponse, isLoading: isBatchesLoading } = useQuery<{
    success: boolean;
    data: Batch[];
    count: number;
  }>({
    queryKey: ['/api/batch-inventory/product', id],
    queryFn: () =>
      apiRequest(
        'GET',
        `/api/batch-inventory/product/${id}?includeExhausted=true`,
      ),
    enabled: !!id,
  });

  const product = productResponse?.data;
  const batches = batchesResponse?.data || [];

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatNumber = (value: string) => {
    const num = parseFloat(value || "0");
    return isNaN(num) ? "0.00" : num.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getStatusBadge = (status: Batch["status"]) => {
    switch (status) {
      case "active":
        return <Badge className="bg-emerald-100 text-emerald-800">Active</Badge>;
      case "exhausted":
        return <Badge className="bg-red-100 text-red-800">Exhausted</Badge>;
      case "expired":
        return <Badge className="bg-amber-100 text-amber-800">Expired</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (isProductLoading) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Skeleton className="w-8 h-8" />
              <Skeleton className="h-8 w-48" />
            </div>
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-40 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-foreground mb-2">Product Not Found</h3>
            <p className="text-muted-foreground mb-4">
              The product you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => setLocation('/products')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Products
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation(`/products/${id}`)}
            className="h-8 w-8 border flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0 flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground truncate">
              Batches for {product.name}
            </h1>
            <Badge variant="outline">
              <Package className="w-3 h-3 mr-1" />
              {product.unit || "Unit"}
            </Badge>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Batch Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          {isBatchesLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : batches.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">
              No batches found for this product.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch Number</TableHead>
                    <TableHead>Original Quantity</TableHead>
                    <TableHead>Available Quantity</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Price / Unit</TableHead>
                    <TableHead>Total Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Purchase Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell>{batch.batch_number}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <span>{formatNumber(batch.original_quantity)}</span>
                          {batch.unit && <span className="text-xs text-muted-foreground">{batch.unit}</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <span>{formatNumber(batch.available_quantity)}</span>
                          {batch.unit && <span className="text-xs text-muted-foreground">{batch.unit}</span>}
                        </div>
                      </TableCell>
                      <TableCell>{batch.unit || "-"}</TableCell>
                      <TableCell>{formatNumber(batch.purchase_price_per_unit)}</TableCell>
                      <TableCell>{formatNumber(batch.purchase_total_price)}</TableCell>
                      <TableCell>{getStatusBadge(batch.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>{formatDate(batch.purchase_date)}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


