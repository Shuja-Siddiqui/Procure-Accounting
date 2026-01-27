import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AccountsTable } from "@/components/accounts/accounts-table";
import { AccountFormModal } from "@/components/accounts/account-form-modal";
import { AccountDeleteModal } from "@/components/accounts/account-delete-modal";
import type { Account } from "@shared/schema";

export default function Accounts() {
  const [, setLocation] = useLocation();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  const { data: accountsResponse, isLoading } = useQuery<{
    success: boolean;
    data: Account[];
    count: number;
  }>({
    queryKey: ['/api/accounts'],
  });

  const accounts = accountsResponse?.data || [];

  const handleEdit = (account: Account) => {
    setSelectedAccount(account);
    setIsEditModalOpen(true);
  };

  const handleView = (account: Account) => {
    setLocation(`/accounts/${account.id}`);
  };

  const handleDelete = (account: Account) => {
    setSelectedAccount(account);
    setIsDeleteModalOpen(true);
  };

  const handleCloseModals = () => {
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setSelectedAccount(null);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 sm:p-6" data-testid="accounts-content">
      <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Account Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage all accounts in your construction procurement system
          </p>
        </div>
        <Button 
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center justify-center space-x-2 w-full sm:w-auto"
          data-testid="button-create-account"
        >
          <Plus className="w-4 h-4" />
          <span>Create Account</span>
        </Button>
      </div>

      <AccountsTable
        accounts={accounts || []}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={handleView}
      />

      <AccountFormModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseModals}
        mode="create"
      />

      <AccountFormModal
        isOpen={isEditModalOpen}
        onClose={handleCloseModals}
        mode="edit"
        account={selectedAccount}
      />

      <AccountDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseModals}
        account={selectedAccount}
      />
    </div>
  );
}
