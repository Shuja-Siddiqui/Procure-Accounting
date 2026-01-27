import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, Phone, MapPin, ShoppingCart, Calendar, User, Package, Trash2, Plus, Building2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { PurchaserFormModal } from "@/components/purchasers/purchaser-form-modal";
import { PurchaserDeleteModal } from "@/components/purchasers/purchaser-delete-modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

interface Purchaser {
  id: string;
  name: string;
  number?: string;
  cnic?: string;
  city?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

interface Product {
  id: string;
  name: string;
  brand?: string;
  unit?: string;
  current_price?: number;
  construction_category?: 'grey' | 'finishing' | 'both';
  created_at: string;
  updated_at: string;
  junction_id: string;
  junction_created_at: string;
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

export default function PurchaserDetailPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/purchasers/:id");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const purchaserId = params?.id;

  // Fetch purchaser details
  const { data: purchaserData, isLoading: purchaserLoading, refetch } = useQuery<{
    success: boolean;
    data: Purchaser;
  }>({
    queryKey: ['/api/purchasers', purchaserId],
    queryFn: async () => {
      const response = await fetch(`/api/purchasers/${purchaserId}`, { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    },
    enabled: !!purchaserId,
  });

  // Fetch products for this purchaser
  const { data: productsData, isLoading: productsLoading } = useQuery<{
    success: boolean;
    data: Product[];
  }>({
    queryKey: ['/api/purchaser-products/purchaser', purchaserId],
    queryFn: async () => {
      const response = await fetch(`/api/purchaser-products/purchaser/${purchaserId}`, { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    },
    enabled: !!purchaserId,
  });

  const purchaser = purchaserData?.data;
  const products = productsData?.data || [];

  // Fetch account payables for this purchaser
  const { data: accountPayablesData, isLoading: accountPayablesLoading } = useQuery<{
    success: boolean;
    data: AccountPayable[];
  }>({
    queryKey: ['/api/purchaser-account-payables/purchaser', purchaserId],
    queryFn: async () => {
      const response = await fetch(`/api/purchaser-account-payables/purchaser/${purchaserId}`, { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    },
    enabled: !!purchaserId,
  });

  const accountPayables = accountPayablesData?.data || [];

  // Delete product relationship mutation
  const deleteProductMutation = useMutation({
    mutationFn: (junctionId: string) =>
      apiRequest('DELETE', `/api/purchaser-products/${junctionId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchaser-products/purchaser', purchaserId] });
      toast({
        title: "Success",
        description: "Product relationship removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove product relationship",
        variant: "destructive",
      });
    },
  });

  // Delete account payable relationship mutation
  const deleteAccountPayableMutation = useMutation({
    mutationFn: (junctionId: string) =>
      apiRequest('DELETE', `/api/purchaser-account-payables/${junctionId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchaser-account-payables/purchaser', purchaserId] });
      toast({
        title: "Success",
        description: "Account Payable relationship removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove account payable relationship",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
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

  const handleDeleteProduct = (product: Product) => {
    deleteProductMutation.mutate(product.junction_id);
  };

  const handleDeleteAccountPayable = (accountPayable: AccountPayable) => {
    deleteAccountPayableMutation.mutate(accountPayable.junction_id);
  };

  const handleEdit = () => {
    if (purchaser) {
      setIsEditModalOpen(true);
    }
  };

  const handleDelete = () => {
    if (purchaser) {
      setIsDeleteModalOpen(true);
    }
  };

  const handleModalClose = () => {
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
  };

  const handleSuccess = () => {
    refetch();
    handleModalClose();
  };

  const handleDeleteSuccess = () => {
    toast({
      title: "Success",
      description: "Purchaser deleted successfully",
    });
    setLocation('/purchasers');
  };

  if (purchaserLoading) {
    return (
      <div className="flex-1 overflow-auto p-6" data-testid="purchaser-detail-page">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (!purchaser) {
    return (
      <div className="flex-1 overflow-auto p-6" data-testid="purchaser-detail-page">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center py-12">
            <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">Purchaser not found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              The purchaser you're looking for doesn't exist.
            </p>
            <Button
              onClick={() => setLocation('/purchasers')}
              className="mt-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Purchasers
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 sm:p-6" data-testid="purchaser-detail-page">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/purchasers')}
              className="h-8 w-8 border flex-shrink-0"
              data-testid="back-button"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">{purchaser.name}</h1>
              <p className="text-sm sm:text-base text-muted-foreground">Purchaser Details</p>
            </div>
          </div>
          {/* <div className="flex space-x-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={handleEdit} className="flex-1 sm:flex-initial">
              <Edit className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleDelete} className="flex-1 sm:flex-initial">
              <Trash2 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          </div> */}
        </div>

        {/* Purchaser Information */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <p className="text-lg font-semibold">{purchaser.name}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="mt-1">
                  <Badge className={getStatusColor(purchaser.status)}>
                    {purchaser.status}
                  </Badge>
                </div>
              </div>

              {purchaser.cnic && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">CNIC</label>
                  <p className="text-lg">{purchaser.cnic}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {purchaser.number ? (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
                  <p className="text-lg">{purchaser.number}</p>
                </div>
              ) : (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
                  <p className="text-lg text-muted-foreground">Not provided</p>
                </div>
              )}

              {purchaser.city ? (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">City</label>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <p className="text-lg">{purchaser.city}</p>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">City</label>
                  <p className="text-lg text-muted-foreground">Not provided</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Associated AccountPayables */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Associated AccountPayables
            </CardTitle>
            <CardDescription>
              AccountPayables that this purchaser deals with
            </CardDescription>
          </CardHeader>
          <CardContent>
            {accountPayablesLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : accountPayables.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No accountPayables associated</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  This purchaser is not associated with any accountPayables yet.
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>AP ID</TableHead>
                        <TableHead>AccountPayable Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Added</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accountPayables.map((accountPayable) => (
                        <TableRow key={accountPayable.id} className="hover:bg-muted/50">
                          <TableCell>
                            <span className="text-xs font-mono text-muted-foreground">
                              {accountPayable.ap_id}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              {/* <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                                <Building2 className="h-5 w-5 text-green-600" />
                              </div> */}
                              <div>
                                <Link
                                  href={`/account-payables/${accountPayable.id}`}
                                  className="font-medium hover:underline hover:text-blue-600 transition-colors"
                                >
                                  {accountPayable.name}
                                </Link>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {accountPayable.number || <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell>
                            {accountPayable.address || <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell>
                            {accountPayable.city || <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getStatusColor(accountPayable.status)}>
                              {accountPayable.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(accountPayable.junction_created_at), 'MMM d, yyyy')}
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
                                  onClick={() => handleDeleteAccountPayable(accountPayable)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Remove AccountPayable
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
                  {accountPayables.map((accountPayable) => (
                    <div key={accountPayable.id} className="border rounded-lg p-4 space-y-2 bg-card">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          {/* <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 flex-shrink-0">
                            <Building2 className="h-5 w-5 text-green-600" />
                          </div> */}
                          <div className="flex-1 min-w-0">
                            <Link
                              href={`/account-payables/${accountPayable.id}`}
                              className="font-medium hover:underline hover:text-blue-600 transition-colors text-sm"
                            >
                              {accountPayable.name}
                            </Link>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs text-muted-foreground">AP ID</span>
                              <span className="text-xs font-mono text-muted-foreground">
                                {accountPayable.ap_id}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`${getStatusColor(accountPayable.status)} text-xs`}>
                            {accountPayable.status}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 flex-shrink-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleDeleteAccountPayable(accountPayable)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove AccountPayable
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t">
                        <div>
                          <span className="text-xs text-muted-foreground">Contact</span>
                          <div className="text-xs">{accountPayable.number || '-'}</div>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">City</span>
                          <div className="text-xs">{accountPayable.city || '-'}</div>
                        </div>
                        {accountPayable.address && (
                          <div className="col-span-2">
                            <span className="text-xs text-muted-foreground">Address</span>
                            <div className="text-xs">{accountPayable.address}</div>
                          </div>
                        )}
                      </div>
                      <div className="pt-2 border-t">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Added</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(accountPayable.junction_created_at), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Associated Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Associated Products
            </CardTitle>
            <CardDescription>
              Products that this purchaser deals with
            </CardDescription>
          </CardHeader>
          <CardContent>
            {productsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No products associated</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  This purchaser is not associated with any products yet.
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product Name</TableHead>
                        <TableHead>Brand</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Added</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <TableRow key={product.id} className="hover:bg-muted/50">
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                                <Package className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <Link
                                  href={`/products/${product.id}`}
                                  className="font-medium hover:underline hover:text-blue-600 transition-colors"
                                >
                                  {product.name}
                                </Link>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {product.brand || <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell>
                            {product.unit || <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell>
                            {product.current_price ? (
                              <span className="font-medium">${product.current_price}</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {product.construction_category ? (
                              <Badge variant="outline" className={getCategoryColor(product.construction_category)}>
                                {product.construction_category}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(product.junction_created_at), 'MMM d, yyyy')}
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
                                  onClick={() => handleDeleteProduct(product)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Remove Product
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
                  {products.map((product) => (
                    <div key={product.id} className="border rounded-lg p-4 space-y-2 bg-card">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 flex-shrink-0">
                            <Package className="h-5 w-5 text-blue-600" />
                          </div>
                          <Link
                            href={`/products/${product.id}`}
                            className="font-medium hover:underline hover:text-blue-600 transition-colors text-sm flex-1 min-w-0"
                          >
                            {product.name}
                          </Link>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 flex-shrink-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleDeleteProduct(product)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove Product
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t">
                        <div>
                          <span className="text-xs text-muted-foreground">Brand</span>
                          <div className="text-xs">{product.brand || '-'}</div>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Unit</span>
                          <div className="text-xs">{product.unit || '-'}</div>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Price</span>
                          <div className="text-xs font-medium">
                            {product.current_price ? `$${product.current_price}` : '-'}
                          </div>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Category</span>
                          <div>
                            {product.construction_category ? (
                              <Badge variant="outline" className={`${getCategoryColor(product.construction_category)} text-xs`}>
                                {product.construction_category}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="pt-2 border-t">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Added</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(product.junction_created_at), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Additional Information */}
        {/* <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Additional Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Created</label>
                <p className="text-lg">
                  {format(new Date(purchaser.created_at), 'MMMM d, yyyy \'at\' h:mm a')}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                <p className="text-lg">
                  {format(new Date(purchaser.updated_at), 'MMMM d, yyyy \'at\' h:mm a')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card> */}
      </div>

      {/* Edit Modal */}
      <PurchaserFormModal
        isOpen={isEditModalOpen}
        onClose={handleModalClose}
        mode="edit"
        purchaser={purchaser}
        onSuccess={handleSuccess}
      />

      {/* Delete Modal */}
      <PurchaserDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={handleModalClose}
        purchaser={purchaser}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}
