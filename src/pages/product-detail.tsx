import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Package,
  Edit2,
  Trash2,
  ArrowLeft,
  Calendar,
  DollarSign,
  Hash,
  Tag,
  Building,
  Scale,
  TrendingUp,
  AlertTriangle,
  Users,
  Phone,
  MapPin,
  Clock,
  ShoppingCart,
  MoreHorizontal,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  BarChart3,
  Edit
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ProductFormModal } from "@/components/products/product-form-modal";
import { ProductDeleteModal } from "@/components/products/product-delete-modal";
import { InventoryHistoryTable } from "@/components/products/inventory-history-table";
import { useState } from "react";
import type { Product } from "@shared/schema";

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

interface AccountPayable {
  id: string;
  ap_id: string;
  name: string;
  number?: string;
  address?: string;
  city?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  junction_id: string;
  junction_created_at: string;
}

interface Purchaser {
  id: string;
  name: string;
  number?: string;
  cnic?: string;
  city?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  junction_id: string;
  junction_created_at: string;
}

export default function ProductDetail() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, params] = useRoute("/products/:id");
  const [, setLocation] = useLocation();
  const id = params?.id;

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const { data: productResponse, isLoading, error } = useQuery<{
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

  // Fetch inventory history from transaction_product_junction (replacing inventory_history API)
  const { data: historyResponse, isLoading: isHistoryLoading } = useQuery<{
    success: boolean;
    data: InventoryHistoryRecord[];
    count: number;
  }>({
    queryKey: ['/api/products', id, 'inventory-history'],
    queryFn: async () => {
      // Use productsService.getProductInventoryHistory which now uses transaction_product_junction
      const response = await fetch(`/api/products/${id}/inventory-history`);
      if (!response.ok) {
        throw new Error('Failed to fetch inventory history');
      }
      const data = await response.json();
      // Transform transaction_product_junction data to InventoryHistoryRecord format
      const transformedData = {
        ...data,
        data: (data.data || []).map((record: any) => ({
          id: record.id,
          product_id: record.product_id,
          transaction_id: record.transaction_id,
          type: record.type || record.transaction_type || 'purchase',
          quantity_change: record.quantity || '0',
          quantity_before: record.quantity_before || '0',
          quantity_after: record.quantity_after || '0',
          price_per_unit: record.unit_price || record.per_unit_rate || undefined,
          total_amount: record.total_amount || undefined,
          notes: record.notes || undefined,
          created_at: record.created_at,
          updated_at: record.updated_at,
          batch_id: record.batch_id,
        })),
      };
      return transformedData;
    },
    enabled: !!id,
  });

  // Fetch accountPayables for this product
  const { data: accountPayablesResponse, isLoading: isAccountPayablesLoading } = useQuery<{
    success: boolean;
    data: AccountPayable[];
  }>({
    queryKey: ['/api/account-payable-products/product', id],
    queryFn: async () => {
      const response = await fetch(`/api/account-payable-products/product/${id}`, { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to fetch accountPayables for product');
      }
      return response.json();
    },
    enabled: !!id,
  });

  // Fetch purchasers for this product
  const { data: purchasersResponse, isLoading: isPurchasersLoading } = useQuery<{
    success: boolean;
    data: Purchaser[];
  }>({
    queryKey: ['/api/purchaser-products/product', id],
    queryFn: async () => {
      const response = await fetch(`/api/purchaser-products/product/${id}`, { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to fetch purchasers for product');
      }
      return response.json();
    },
    enabled: !!id,
  });

  const product = productResponse?.data;
  const inventoryHistory = historyResponse?.data || [];
  const accountPayables = accountPayablesResponse?.data || [];
  const purchasers = purchasersResponse?.data || [];

  // Delete purchaser relationship mutation
  const deletePurchaserMutation = useMutation({
    mutationFn: (junctionId: string) =>
      apiRequest('DELETE', `/api/purchaser-products/${junctionId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchaser-products/product', id] });
      toast({
        title: "Success",
        description: "Purchaser relationship removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove purchaser relationship",
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getConstructionCategoryColor = (category: string) => {
    switch (category) {
      case 'grey':
        return 'bg-gray-100 text-gray-800';
      case 'finishing':
        return 'bg-blue-100 text-blue-800';
      case 'both':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleEdit = () => {
    if (product) {
      setSelectedProduct(product);
      setIsEditModalOpen(true);
    }
  };

  const handleDelete = () => {
    if (product) {
      setSelectedProduct(product);
      setIsDeleteModalOpen(true);
    }
  };

  const handleCloseModals = () => {
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setSelectedProduct(null);
  };

  const handleDeletePurchaser = (purchaser: Purchaser) => {
    deletePurchaserMutation.mutate(purchaser.junction_id);
  };

  // Calculate product statistics from inventory history
  const calculateProductStats = () => {
    if (!inventoryHistory || inventoryHistory.length === 0) {
      return {
        totalPurchases: 0,
        totalSales: 0,
        totalStockIn: 0,
        totalStockOut: 0,
        purchaseValue: 0,
        salesValue: 0,
        netStockChange: 0,
        purchaseTransactions: 0,
        salesTransactions: 0
      };
    }

    let totalPurchases = 0;
    let totalSales = 0;
    let totalStockIn = 0;
    let totalStockOut = 0;
    let purchaseValue = 0;
    let salesValue = 0;
    let purchaseTransactions = 0;
    let salesTransactions = 0;

    inventoryHistory.forEach(record => {
      const quantityChange = parseFloat(record.quantity_change);
      const totalAmount = parseFloat(record.total_amount || '0');

      if (record.type === 'purchase') {
        totalPurchases += Math.abs(quantityChange);
        totalStockIn += Math.abs(quantityChange);
        purchaseValue += totalAmount;
        purchaseTransactions++;
      } else if (record.type === 'sale') {
        totalSales += Math.abs(quantityChange);
        totalStockOut += Math.abs(quantityChange);
        salesValue += totalAmount;
        salesTransactions++;
      } else if (quantityChange > 0) {
        totalStockIn += quantityChange;
      } else if (quantityChange < 0) {
        totalStockOut += Math.abs(quantityChange);
      }
    });

    return {
      totalPurchases,
      totalSales,
      totalStockIn,
      totalStockOut,
      purchaseValue,
      salesValue,
      netStockChange: totalStockIn - totalStockOut,
      purchaseTransactions,
      salesTransactions
    };
  };

  const stats = calculateProductStats();

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto p-6" data-testid="product-detail-content">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Skeleton className="w-8 h-8" />
              <Skeleton className="h-8 w-48" />
            </div>
            <div className="flex space-x-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-20" />
            </div>
          </div>

          {/* Content Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex-1 overflow-auto p-6" data-testid="product-detail-content">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
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
    <div className="max-w-7xl mx-auto space-y-6 p-4 sm:p-6" data-testid="product-detail-content">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/products')}
              className="h-8 w-8 border flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="min-w-0 flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground truncate">{product.name}</h1>
              {product.quantity > 0 ? (
                <Badge className="bg-emerald-100 text-emerald-800">
                  In Stock
                </Badge>
              ) : (
                <Badge className="bg-red-100 text-red-800">
                  Out of Stock
                </Badge>
              )}
            </div>
          </div>
          <div className="flex space-x-2 flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => setLocation(`/products/${id}/productBatchs`)}
              className="flex-1 sm:flex-initial"
            >
              <Hash className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">View Batches</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleEdit}
              data-testid="button-edit"
              className="flex-1 sm:flex-initial"
            >
              <Edit className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleDelete}
              data-testid="button-delete"
              className="flex-1 sm:flex-initial"
            >
              <Trash2 className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Product Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card data-testid="card-basic-info">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="w-5 h-5" />
                  <span>Basic Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Desktop Grid View */}
                <div className="hidden md:grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Brand</label>
                    <p className="text-lg text-foreground">{product.brand || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Construction Category</label>
                    <div className="mt-1">
                      <Badge className={getConstructionCategoryColor(product.construction_category || '')}>
                        {product.construction_category || 'Not specified'}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Product Category</label>
                    <p className="text-lg text-foreground">{product.product_category || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Company</label>
                    <p className="text-lg text-foreground">{product.company_name || 'Not specified'}</p>
                  </div>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                  <div className="pb-3 border-b">
                    <label className="text-xs font-medium text-muted-foreground">Brand</label>
                    <p className="text-base text-foreground mt-1">{product.brand || 'Not specified'}</p>
                  </div>
                  <div className="pb-3 border-b">
                    <label className="text-xs font-medium text-muted-foreground">Construction Category</label>
                    <div className="mt-1">
                      <Badge className={getConstructionCategoryColor(product.construction_category || '')}>
                        {product.construction_category || 'Not specified'}
                      </Badge>
                    </div>
                  </div>
                  <div className="pb-3 border-b">
                    <label className="text-xs font-medium text-muted-foreground">Product Category</label>
                    <p className="text-base text-foreground mt-1">{product.product_category || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Company</label>
                    <p className="text-base text-foreground mt-1">{product.company_name || 'Not specified'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Inventory Information */}
            <Card data-testid="card-inventory-info">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Scale className="w-5 h-5" />
                  <span>Inventory Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Desktop Grid View */}
                <div className="hidden sm:grid sm:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <Hash className="w-8 h-8 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground">{product.quantity}</p>
                    <p className="text-sm text-muted-foreground">Quantity</p>
                    {product.unit && (
                      <p className="text-xs text-muted-foreground mt-1">{product.unit}</p>
                    )}
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <DollarSign className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(product.current_price)}</p>
                    <p className="text-sm text-muted-foreground">Unit Price</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <TrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground">
                      {formatCurrency(product.quantity * product.current_price)}
                    </p>
                    <p className="text-sm text-muted-foreground">Total Value</p>
                  </div>
                </div>

                {/* Mobile Card View */}
                <div className="sm:hidden space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Hash className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Quantity</p>
                        <p className="text-lg font-bold text-foreground">{product.quantity}</p>
                        {product.unit && (
                          <p className="text-xs text-muted-foreground">{product.unit}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-5 h-5 text-emerald-600" />
                      <div>
                        <p className="text-xs text-muted-foreground">Unit Price</p>
                        <p className="text-lg font-bold text-foreground">{formatCurrency(product.current_price)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-5 h-5 text-purple-600" />
                      <div>
                        <p className="text-xs text-muted-foreground">Total Value</p>
                        <p className="text-lg font-bold text-foreground">
                          {formatCurrency(product.quantity * product.current_price)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Sidebar Information */}
          <div className="space-y-6">
            {/* Product Statistics */}
            <Card data-testid="card-product-stats">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5" />
                  <span>Product Statistics</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Stock In */}
                  <div className="text-center p-2 bg-blue-50 rounded-lg border border-blue-200">
                    <ArrowUp className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                    <p className="text-base font-bold text-blue-800">{stats.totalStockIn.toFixed(2)}</p>
                    <p className="text-xs text-blue-600 font-medium">Stock In</p>
                    <p className="text-xs text-blue-500">{product.unit || 'units'}</p>
                  </div>

                  {/* Stock Out */}
                  <div className="text-center p-2 bg-red-50 rounded-lg border border-red-200">
                    <ArrowDown className="w-4 h-4 text-red-600 mx-auto mb-1" />
                    <p className="text-base font-bold text-red-800">{stats.totalStockOut.toFixed(2)}</p>
                    <p className="text-xs text-red-600 font-medium">Stock Out</p>
                    <p className="text-xs text-red-500">{product.unit || 'units'}</p>
                  </div>

                  {/* Total Purchases */}
                  <div className="text-center p-2 bg-green-50 rounded-lg border border-green-200">
                    <TrendingUp className="w-4 h-4 text-green-600 mx-auto mb-1" />
                    <p className="text-base font-bold text-green-800">{stats.totalPurchases.toFixed(2)}</p>
                    <p className="text-xs text-green-600 font-medium">Purchases</p>
                    <p className="text-xs text-green-500">{stats.purchaseTransactions} txns</p>
                  </div>

                  {/* Total Sales */}
                  <div className="text-center p-2 bg-purple-50 rounded-lg border border-purple-200">
                    <TrendingDown className="w-4 h-4 text-purple-600 mx-auto mb-1" />
                    <p className="text-base font-bold text-purple-800">{stats.totalSales.toFixed(2)}</p>
                    <p className="text-xs text-purple-600 font-medium">Sales</p>
                    <p className="text-xs text-purple-500">{stats.salesTransactions} txns</p>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="pt-10 border-t border-gray-200">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">Purchase Value</p>
                      <p className="text-xs font-semibold text-green-600">{formatCurrency(stats.purchaseValue)}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">Sales Value</p>
                      <p className="text-xs font-semibold text-purple-600">{formatCurrency(stats.salesValue)}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">Net Stock Change</p>
                      <p className={`text-xs font-semibold ${stats.netStockChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {stats.netStockChange >= 0 ? '+' : ''}{stats.netStockChange.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Associated AccountPayables */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Associated AccountPayables
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                AccountPayables that supply this product
              </p>
            </CardHeader>
            <CardContent>
              {isAccountPayablesLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : accountPayables.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {accountPayables.length} accountPayable{accountPayables.length !== 1 ? 's' : ''} associated
                    </span>
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>AP ID</TableHead>
                          <TableHead>AccountPayable Name</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Added</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {accountPayables.map((accountPayable) => (
                          <TableRow key={accountPayable.id}>
                            <TableCell>
                              <span className="text-xs font-mono text-muted-foreground">
                                {accountPayable.ap_id}
                              </span>
                            </TableCell>
                            <TableCell className="font-medium">
                              <Link href={`/account-payables/${accountPayable.id}`} className="hover:underline">
                                {accountPayable.name}
                              </Link>
                            </TableCell>
                            <TableCell>
                              {accountPayable.number ? (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  <span className="text-sm">{accountPayable.number}</span>
                                </div>
                              ) : '-'}
                            </TableCell>
                            <TableCell>
                              {accountPayable.city ? (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  <span className="text-sm">{accountPayable.city}</span>
                                </div>
                              ) : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={accountPayable.status === 'active' ? 'default' : 'secondary'}>
                                {accountPayable.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">
                              <div className="flex items-center justify-end gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(accountPayable.junction_created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-3">
                    {accountPayables.map((accountPayable) => (
                      <div key={accountPayable.id} className="border rounded-lg p-4 space-y-2 bg-card">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <Link href={`/account-payables/${accountPayable.id}`} className="hover:underline">
                              <div className="font-medium text-sm">{accountPayable.name}</div>
                            </Link>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs text-muted-foreground">AP ID</span>
                              <span className="text-xs font-mono text-muted-foreground">
                                {accountPayable.ap_id}
                              </span>
                            </div>
                          </div>
                          <Badge variant={accountPayable.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                            {accountPayable.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t">
                          <div>
                            <span className="text-xs text-muted-foreground">Contact</span>
                            <div className="text-xs">
                              {accountPayable.number ? (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {accountPayable.number}
                                </div>
                              ) : '-'}
                            </div>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground">Location</span>
                            <div className="text-xs">
                              {accountPayable.city ? (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {accountPayable.city}
                                </div>
                              ) : '-'}
                            </div>
                          </div>
                        </div>
                        <div className="pt-2 border-t">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Added</span>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {new Date(accountPayable.junction_created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2" />
                  <p>No accountPayables associated with this product</p>
                  <p className="text-sm">AccountPayables can be added when creating or editing a accountPayable</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Associated Purchasers */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Associated Purchasers
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Purchasers that deal with this product
              </p>
            </CardHeader>
            <CardContent>
              {isPurchasersLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : purchasers.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {purchasers.length} purchaser{purchasers.length !== 1 ? 's' : ''} associated
                    </span>
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Purchaser Name</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Added</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {purchasers.map((purchaser) => (
                          <TableRow key={purchaser.id}>
                            <TableCell className="font-medium">
                              <Link
                                href={`/purchasers/${purchaser.id}`}
                                className="hover:underline hover:text-blue-600 transition-colors"
                              >
                                {purchaser.name}
                              </Link>
                            </TableCell>
                            <TableCell>
                              {purchaser.number ? (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  <span className="text-sm">{purchaser.number}</span>
                                </div>
                              ) : '-'}
                            </TableCell>
                            <TableCell>
                              {purchaser.city ? (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  <span className="text-sm">{purchaser.city}</span>
                                </div>
                              ) : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={purchaser.status === 'active' ? 'default' : 'secondary'}>
                                {purchaser.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">
                              <div className="flex items-center justify-end gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(purchaser.junction_created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => handleDeletePurchaser(purchaser)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Remove Purchaser
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-3">
                    {purchasers.map((purchaser) => (
                      <div key={purchaser.id} className="border rounded-lg p-4 space-y-2 bg-card">
                        <div className="flex items-center justify-between">
                          <Link
                            href={`/purchasers/${purchaser.id}`}
                            className="hover:underline hover:text-blue-600 transition-colors flex-1 min-w-0"
                          >
                            <div className="font-medium text-sm">{purchaser.name}</div>
                          </Link>
                          <div className="flex items-center gap-2">
                            <Badge variant={purchaser.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                              {purchaser.status}
                            </Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleDeletePurchaser(purchaser)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Remove Purchaser
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t">
                          <div>
                            <span className="text-xs text-muted-foreground">Contact</span>
                            <div className="text-xs">
                              {purchaser.number ? (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {purchaser.number}
                                </div>
                              ) : '-'}
                            </div>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground">Location</span>
                            <div className="text-xs">
                              {purchaser.city ? (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {purchaser.city}
                                </div>
                              ) : '-'}
                            </div>
                          </div>
                        </div>
                        <div className="pt-2 border-t">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Added</span>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {new Date(purchaser.junction_created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="h-8 w-8 mx-auto mb-2" />
                  <p>No purchasers associated with this product</p>
                  <p className="text-sm">Purchasers can be added when creating or editing a purchaser</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Inventory History */}
        <div className="mt-8">
          <InventoryHistoryTable
            history={inventoryHistory}
            isLoading={isHistoryLoading}
          />
        </div>
      </div>

      {/* Modals */}
      <ProductFormModal
        isOpen={isEditModalOpen}
        onClose={handleCloseModals}
        mode="edit"
        product={selectedProduct}
      />

      <ProductDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseModals}
        product={selectedProduct}
      />
    </div>
  );
}
