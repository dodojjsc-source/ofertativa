import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface WhatsAppButtonProps {
  whatsappUrl: string;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function WhatsAppButton({ 
  whatsappUrl, 
  className, 
  variant = "outline",
  size = "sm" 
}: WhatsAppButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => window.open(whatsappUrl, "_blank")}
      className={cn("gap-2", className)}
    >
      <MessageCircle className="h-4 w-4 text-green-600" />
      WhatsApp
    </Button>
  );
}
