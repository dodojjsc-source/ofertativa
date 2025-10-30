import { Phone, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface PhoneLinkProps {
  phone?: string;
  e164?: string;
  whatsappUrl?: string;
  className?: string;
  showIcon?: boolean;
  showWhatsApp?: boolean;
}

export function PhoneLink({ 
  phone, 
  e164, 
  whatsappUrl, 
  className, 
  showIcon = true,
  showWhatsApp = false 
}: PhoneLinkProps) {
  const displayPhone = phone || e164 || "";
  const telLink = e164 || `tel:+55${phone?.replace(/\D/g, '')}`;
  
  const handleClick = (e: React.MouseEvent) => {
    if (window.innerWidth > 768) {
      e.preventDefault();
      navigator.clipboard.writeText(displayPhone);
      toast({
        title: "Número copiado!",
        description: displayPhone,
        duration: 2000,
      });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <a
        href={telLink}
        onClick={handleClick}
        className={cn(
          "inline-flex items-center gap-1.5 text-primary hover:underline cursor-pointer font-medium",
          className
        )}
      >
        {showIcon && <Phone className="h-3.5 w-3.5" />}
        <span>{displayPhone}</span>
      </a>
      {showWhatsApp && whatsappUrl && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => window.open(whatsappUrl, "_blank")}
        >
          <MessageCircle className="h-4 w-4 text-green-600" />
        </Button>
      )}
    </div>
  );
}
