import { OperationCards } from "@/components/internal-operation/operation-cards";

export default function InternalOperation() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Internal Operation
          </h1>
          <p className="text-muted-foreground">
            Manage internal operations and transactions
          </p>
        </div>
      </div>

      {/* Cards Grid */}
      <OperationCards />
    </div>
  );
}

