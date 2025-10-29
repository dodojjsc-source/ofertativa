import { Phone } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface PhoneLinkProps {
  phone: string;
  className?: string;
  showIcon?: boolean;
}

export function PhoneLink({ phone, className, showIcon = true }: PhoneLinkProps) {
  // Remove caracteres não numéricos para o tel: link
  const cleanPhone = phone.replace(/\D/g, '');
  
  const handleClick = (e: React.MouseEvent) => {
    // Em desktop, copia o número
    if (window.innerWidth > 768) {
      e.preventDefault();
      navigator.clipboard.writeText(phone);
      toast({
        title: "Número copiado!",
        description: phone,
        duration: 2000,
      });
    }
    // Em mobile, o tel: link abre o discador automaticamente
  };

  return (
    <a
      href={`tel:+55${cleanPhone}`}
      onClick={handleClick}
      className={cn(
        "inline-flex items-center gap-1.5 text-primary hover:underline hover:text-primary/80 transition-colors cursor-pointer font-medium",
        className
      )}
    >
      {showIcon && <Phone className="h-3.5 w-3.5" />}
      <span>{phone}</span>
    </a>
  );
}
