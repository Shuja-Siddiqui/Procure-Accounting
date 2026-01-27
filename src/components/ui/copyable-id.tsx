import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CopyableIdProps {
  id: string;
  displayLength?: number;
  className?: string;
  showFullOnHover?: boolean;
}

export function CopyableId({ 
  id, 
  displayLength = 8, 
  className = "",
  showFullOnHover = true 
}: CopyableIdProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Transaction ID copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy ID",
        variant: "destructive",
      });
    }
  };

  const displayId = displayLength ? id.substring(0, displayLength) + "..." : id;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span 
        className="font-mono text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
        title={showFullOnHover ? id : undefined}
      >
        {displayId}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        className="h-6 w-6 p-0 hover:bg-muted"
      >
        {copied ? (
          <Check className="h-3 w-3 text-green-600" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
}
