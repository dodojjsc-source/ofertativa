import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { normalizarTelefone, PhoneNormalizationResult } from "@/lib/phoneNormalization";
import { useState, useEffect } from "react";
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  onNormalized?: (result: PhoneNormalizationResult) => void;
  className?: string;
  placeholder?: string;
}

export function PhoneInput({ 
  value, 
  onChange, 
  onNormalized, 
  className,
  placeholder = "(11) 99999-9999" 
}: PhoneInputProps) {
  const [result, setResult] = useState<PhoneNormalizationResult | null>(null);

  useEffect(() => {
    if (value.length >= 8) {
      const normalized = normalizarTelefone(value);
      setResult(normalized);
      onNormalized?.(normalized);
    } else {
      setResult(null);
    }
  }, [value, onNormalized]);

  const getIcon = () => {
    if (!result) return null;
    if (result.validacao === "ok") return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (result.validacao === "incompleto") return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    return <XCircle className="h-4 w-4 text-red-600" />;
  };

  const getVariant = () => {
    if (!result) return "outline";
    if (result.validacao === "ok") return "default";
    if (result.validacao === "incompleto") return "secondary";
    return "destructive";
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input 
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={className}
        />
        {result && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {getIcon()}
          </div>
        )}
      </div>
      {result && (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant={getVariant()}>
              {result.validacao.toUpperCase()}
            </Badge>
            {result.display_local && (
              <span className="text-sm text-muted-foreground">
                {result.display_local}
              </span>
            )}
          </div>
          {result.motivo_validacao && (
            <p className="text-xs text-muted-foreground">
              {result.motivo_validacao}
            </p>
          )}
          {result.validacao === "ok" && (
            <div className="text-xs space-y-0.5 text-muted-foreground">
              <div>E.164: {result.e164}</div>
              <div>Tipo: {result.is_mobile ? "Móvel" : "Fixo"}</div>
              {result.ddd && <div>DDD: {result.ddd}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
