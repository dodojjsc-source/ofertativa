import { Phone, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface PhoneLinkProps {
  phone?: string;
  e164?: string;
  whatsappUrl?: string;
  display?: string;
  className?: string;
  showIcon?: boolean;
  showWhatsApp?: boolean;
}

export function PhoneLink({ 
  phone, 
  e164, 
  whatsappUrl, 
  display,
  className, 
  showIcon = true,
  showWhatsApp = false 
}: PhoneLinkProps) {
  // Sanitize display (remove quotes)
  const displayPhone = (display || e164 || phone || "").replace(/^['"]+|['"]+$/g, "");
  
  // Build tel link - prefer e164, fallback to robust digit parsing
  let telLink: string;
  if (e164) {
    telLink = `tel:${e164}`;
  } else {
    const digits = (phone || "").replace(/\D/g, "");
    if (digits.startsWith("55") && digits.length >= 12) {
      telLink = `tel:+${digits}`;
    } else if (digits.length === 11 || digits.length === 10) {
      telLink = `tel:+55${digits}`;
    } else {
      telLink = `tel:+${digits}`;
    }
  }
  
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
          className="h-8 w-8 hover:bg-green-50"
          onClick={(e) => {
            e.preventDefault();
            window.open(whatsappUrl, "_blank");
          }}
          title="Abrir no WhatsApp Web"
        >
          <MessageCircle className="h-5 w-5 text-green-600 fill-green-100" />
        </Button>
      )}
    </div>
  );
}
