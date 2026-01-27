import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ProductsTable } from "@/components/products/products-table";
import { ProductFormModal } from "@/components/products/product-form-modal";
import { ProductDeleteModal } from "@/components/products/product-delete-modal";
import { useAuth } from "@/contexts/auth-context";
import type { Product } from "@shared/schema";

interface ProductFilters {
  search?: string;
  company_id?: string;
  construction_category?: string;
  available_only?: boolean;
}

export default function Products() {
  const { user } = useAuth();
  const isSeller = user?.role === 'seller';
  const [, setLocation] = useLocation();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [filters, setFilters] = useState<ProductFilters>({});

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [filters.search, filters.company_id, filters.construction_category]);

  const { data: productsResponse, isLoading } = useQuery<{
    success: boolean;
    data: Product[];
    count: number;
    totalCount?: number;
  }>({
    queryKey: ['/api/products', page, pageSize, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(pageSize));
      if (filters.search) params.append('search', filters.search);
      if (filters.company_id) params.append('company_id', filters.company_id);
      if (filters.construction_category) params.append('construction_category', filters.construction_category);
      if (filters.available_only) params.append('available_only', 'true');
      
      const response = await fetch(`/api/products?${params.toString()}`, { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      return await response.json();
    },
  });

  const products = productsResponse?.data || [];
  const totalCount = productsResponse?.totalCount || 0;

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setIsEditModalOpen(true);
  };

  const handleView = (product: Product) => {
    setLocation(`/products/${product.id}`);
  };

  const handleDelete = (product: Product) => {
    setSelectedProduct(product);
    setIsDeleteModalOpen(true);
  };

  const handleCloseModals = () => {
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setSelectedProduct(null);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 sm:p-6" data-testid="products-content">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">
            Manage and track all products in your construction procurement system
          </p>
        </div>
        {!isSeller && (
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center space-x-2"
            data-testid="button-create-product"
          >
            <Plus className="w-4 h-4" />
            <span>Create Product</span>
          </Button>
        )}
      </div>

      <ProductsTable
        products={products || []}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={handleView}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
        <span className="text-sm text-muted-foreground text-center sm:text-left">
          Page {page} • Showing {products.length} product{products.length === 1 ? '' : 's'}
          {totalCount > 0 && ` of ${totalCount}`}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!totalCount || page * pageSize >= totalCount}
            onClick={() => {
              if (totalCount && page * pageSize < totalCount) {
                setPage((p) => p + 1);
              }
            }}
          >
            Next
          </Button>
        </div>
      </div>

      <ProductFormModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseModals}
        mode="create"
      />

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








