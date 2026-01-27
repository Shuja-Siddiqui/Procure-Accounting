import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getApiUrl } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Filter, Users, MapPin, ShoppingCart } from "lucide-react";
import { PurchasersTable } from "@/components/purchasers/purchasers-table";
import { PurchaserFormModal } from "@/components/purchasers/purchaser-form-modal";
import { PurchaserDeleteModal } from "@/components/purchasers/purchaser-delete-modal";

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

interface PurchaserStats {
  totalPurchasers: number;
  statusBreakdown: Array<{ status: string; count: number }>;
  cityBreakdown: Array<{ city: string; count: number }>;
}

export default function PurchasersPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedPurchaser, setSelectedPurchaser] = useState<Purchaser | null>(null);

  // Fetch purchasers with filters
  const { data: purchasersData, isLoading: purchasersLoading, refetch: refetchPurchasers } = useQuery<{
    success: boolean;
    data: Purchaser[];
  }>({
    queryKey: ['/api/purchasers', searchTerm, statusFilter, cityFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (cityFilter !== 'all') params.append('city', cityFilter);
      
      const response = await fetch(getApiUrl(`/api/purchasers?${params.toString()}`), { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    },
  });

  // Fetch purchaser statistics
  const { data: statsData, isLoading: statsLoading } = useQuery<{
    success: boolean;
    data: PurchaserStats;
  }>({
    queryKey: ['/api/purchasers/stats'],
    queryFn: async () => {
      const response = await fetch(getApiUrl('/api/purchasers/stats'), { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    },
  });

  const purchasers = purchasersData?.data || [];
  const stats = statsData?.data || {
    totalPurchasers: 0,
    statusBreakdown: [],
    cityBreakdown: []
  };

  const handleCreatePurchaser = () => {
    setSelectedPurchaser(null);
    setIsCreateModalOpen(true);
  };

  const handleViewPurchaser = (purchaser: Purchaser) => {
    setLocation(`/purchasers/${purchaser.id}`);
  };

  const handleEditPurchaser = (purchaser: Purchaser) => {
    setSelectedPurchaser(purchaser);
    setIsEditModalOpen(true);
  };

  const handleDeletePurchaser = (purchaser: Purchaser) => {
    setSelectedPurchaser(purchaser);
    setIsDeleteModalOpen(true);
  };

  const handleModalClose = () => {
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setSelectedPurchaser(null);
  };

  const handleSuccess = () => {
    refetchPurchasers();
    handleModalClose();
  };

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

  return (
    <div className="flex-1 overflow-auto p-4 sm:p-6" data-testid="purchasers-page">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Purchasers</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage your purchasers and their information
            </p>
          </div>
          <Button onClick={handleCreatePurchaser} data-testid="create-purchaser-button" className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Add Purchaser
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Purchasers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-xl sm:text-2xl font-bold">{stats.totalPurchasers}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Purchasers</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-xl sm:text-2xl font-bold">
                  {stats.statusBreakdown.find(s => s.status === 'active')?.count || 0}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cities</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-xl sm:text-2xl font-bold">{stats.cityBreakdown.length}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search purchasers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="search-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger data-testid="status-filter">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">City</label>
                <Select value={cityFilter} onValueChange={setCityFilter}>
                  <SelectTrigger data-testid="city-filter">
                    <SelectValue placeholder="All cities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cities</SelectItem>
                    {stats.cityBreakdown.map((city) => (
                      <SelectItem key={city.city} value={city.city}>
                        {city.city} ({city.count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Purchasers Table */}
        <Card>
          <CardHeader>
            <CardTitle>Purchasers</CardTitle>
            <CardDescription>
              {purchasersLoading ? "Loading purchasers..." : `${purchasers.length} purchaser${purchasers.length !== 1 ? 's' : ''} found`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PurchasersTable
              purchasers={purchasers}
              isLoading={purchasersLoading}
              onView={handleViewPurchaser}
              onEdit={handleEditPurchaser}
              onDelete={handleDeletePurchaser}
            />
          </CardContent>
        </Card>

        {/* Modals */}
        <PurchaserFormModal
          isOpen={isCreateModalOpen || isEditModalOpen}
          onClose={handleModalClose}
          mode={isCreateModalOpen ? 'create' : 'edit'}
          purchaser={selectedPurchaser}
          onSuccess={handleSuccess}
        />

        <PurchaserDeleteModal
          isOpen={isDeleteModalOpen}
          onClose={handleModalClose}
          purchaser={selectedPurchaser}
          onSuccess={handleSuccess}
        />
      </div>
    </div>
  );
}
