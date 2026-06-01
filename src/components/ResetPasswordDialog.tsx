import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Copy, Eye, EyeOff, RefreshCw, Check } from "lucide-react";
import type { AppUser } from "@/contexts/UsersContext";

const ADMIN_TOKEN = "BzOferta!2026_xK9pQ";

function gerarSenhaForte(tamanho = 12) {
  const letras = "abcdefghijkmnpqrstuvwxyz";
  const maius = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const nums = "23456789";
  const esp = "!@#$%&*";
  const todos = letras + maius + nums + esp;
  const obrigatorios = [
    letras[Math.floor(Math.random() * letras.length)],
    maius[Math.floor(Math.random() * maius.length)],
    nums[Math.floor(Math.random() * nums.length)],
    esp[Math.floor(Math.random() * esp.length)],
  ];
  const restante = Array.from({ length: tamanho - obrigatorios.length }, () =>
    todos[Math.floor(Math.random() * todos.length)],
  );
  return [...obrigatorios, ...restante]
    .sort(() => Math.random() - 0.5)
    .join("");
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AppUser | null;
}

export function ResetPasswordDialog({ open, onOpenChange, user }: Props) {
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (open) {
      setSenha(gerarSenhaForte());
      setMostrarSenha(true);
      setCopiado(false);
    }
  }, [open]);

  const senhaValida = useMemo(() => {
    return (
      senha.length >= 8 &&
      /[A-Z]/.test(senha) &&
      /[a-z]/.test(senha) &&
      /[0-9]/.test(senha) &&
      /[^A-Za-z0-9]/.test(senha)
    );
  }, [senha]);

  const handleCopiar = async () => {
    try {
      await navigator.clipboard.writeText(senha);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast({
        title: "Não foi possível copiar",
        description: "Selecione a senha e copie manualmente.",
        variant: "destructive",
      });
    }
  };

  const handleSalvar = async () => {
    if (!user) return;
    if (!senhaValida) {
      toast({
        title: "Senha fraca",
        description:
          "Min. 8 caracteres com maiúscula, minúscula, número e caractere especial.",
        variant: "destructive",
      });
      return;
    }
    setSalvando(true);
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-token": ADMIN_TOKEN,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ user_id: user.id, password: senha }),
        },
      );
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || data?.error) {
        throw new Error(data?.error || `HTTP ${resp.status}`);
      }
      await handleCopiar();
      toast({
        title: "Senha redefinida",
        description: `Nova senha de ${user.name} copiada. Envie ao usuário.`,
      });
      onOpenChange(false);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Falha ao redefinir";
      toast({
        title: "Erro ao redefinir senha",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Redefinir senha</DialogTitle>
          <DialogDescription>
            {user ? (
              <>
                Define uma nova senha para <strong>{user.name}</strong> ({user.email}).
                O usuário entra com essa senha e pode trocar depois.
              </>
            ) : (
              "Selecione um usuário."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="nova-senha">Nova senha</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="nova-senha"
                  type={mostrarSenha ? "text" : "password"}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="pr-10 font-mono"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={mostrarSenha ? "Esconder senha" : "Mostrar senha"}
                >
                  {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setSenha(gerarSenhaForte())}
                title="Gerar outra senha"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopiar}
                title="Copiar"
              >
                {copiado ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className={`text-xs ${senhaValida ? "text-muted-foreground" : "text-destructive"}`}>
              Min. 8 caracteres com maiúscula, minúscula, número e caractere especial.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={salvando || !senhaValida || !user}>
            {salvando ? "Salvando..." : "Salvar e copiar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
