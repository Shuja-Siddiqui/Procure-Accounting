import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeftRight,
  Wallet,
  Users,
  Zap,
  Receipt,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OperationCard {
  name: string;
  route: string;
  icon: any;
  description: string;
  color: string;
}

const operationCards: OperationCard[] = [
  {
    name: "Transfer",
    route: "/internal-operation/transfer",
    icon: ArrowLeftRight,
    description: "Transfer funds between accounts",
    color: "text-blue-600 bg-blue-100 hover:bg-blue-200",
  },
  {
    name: "Deposit",
    route: "/internal-operation/deposit",
    icon: Wallet,
    description: "Record deposits to accounts",
    color: "text-green-600 bg-green-100 hover:bg-green-200",
  },
  {
    name: "Payroll",
    route: "/internal-operation/payroll",
    icon: Users,
    description: "Manage employee payroll",
    color: "text-purple-600 bg-purple-100 hover:bg-purple-200",
  },
  {
    name: "Fixed Utility",
    route: "/internal-operation/fixed-utility",
    icon: Zap,
    description: "Record fixed utility expenses",
    color: "text-orange-600 bg-orange-100 hover:bg-orange-200",
  },
  {
    name: "Fixed Expense",
    route: "/internal-operation/fixed-expense",
    icon: Receipt,
    description: "Record fixed expense transactions",
    color: "text-red-600 bg-red-100 hover:bg-red-200",
  },
  {
    name: "Miscellaneous",
    route: "/internal-operation/miscellaneous",
    icon: MoreHorizontal,
    description: "Record miscellaneous transactions",
    color: "text-gray-600 bg-gray-100 hover:bg-gray-200",
  },
];

export function OperationCards() {
  const [, setLocation] = useLocation();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {operationCards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.name}
            className={cn(
              "cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 border-2 hover:border-primary/50"
            )}
            onClick={() => setLocation(card.route)}
          >
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div
                  className={cn(
                    "w-16 h-16 rounded-lg flex items-center justify-center transition-colors",
                    card.color
                  )}
                >
                  <Icon className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {card.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {card.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

