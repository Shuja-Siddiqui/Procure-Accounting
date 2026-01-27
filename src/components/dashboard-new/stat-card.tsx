import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative";
  bgColor: string;
  textColor?: string;
  icon?: LucideIcon;
}

export function StatCard({
  title,
  value,
  change,
  changeType = "positive",
  bgColor,
  textColor = "text-black",
  icon: Icon,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-lg p-6 bg-white overflow-hidden w-auto border border-black/20",
        // bgColor
      )}
    >
      {/* Overlay gradient effects */}
      <div
        className="absolute inset-0 pointer-events-none"
       
      />
      {/* Decorative dots pattern in top right */}
      {/* <div className="absolute top-4 right-4 opacity-90 z-10">
        <div className="grid grid-cols-9 gap-1.5">
          {Array.from({ length: 27 }).map((_, i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-primary"
            />
          ))}
        </div>
      </div> */}

      {/* Content */}
      <div className="relative z-10">
        {/* Title with Icon on right */}
        <div className={cn("text-xl font-medium mb-3  flex items-center justify-between", "opacity-90")}>
          <span>{title}</span>
          {Icon && <Icon className="w-5 h-5" />}
        </div>

        {/* Value and Change */}
        <div className="flex items-baseline justify-between mb-4">
          <div className={cn("text-3xl font-bold tracking-tight", textColor)}>
            {value}
          </div>
          
        </div>

        {/* Decorative line */}
        <div className={cn("w-[50%] h-[2px] bg-black/50 rounded-full text-black", "opacity-60")} />
      </div>
    </div>
  );
}
