import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";

const passwordSchema = z.string()
  .min(8, "A senha deve ter no mínimo 8 caracteres")
  .regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiúscula")
  .regex(/[a-z]/, "A senha deve conter pelo menos uma letra minúscula")
  .regex(/[0-9]/, "A senha deve conter pelo menos um número")
  .regex(/[^A-Za-z0-9]/, "A senha deve conter pelo menos um caractere especial");

let recoverySessionPromise: Promise<boolean> | null = null;

const waitForSession = async (attempts = 20) => {
  for (let index = 0; index < attempts; index += 1) {
    const { data } = await supabase.auth.getSession();
    if (data.session) return true;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return false;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  return error instanceof Error ? error.message : fallback;
};

const establishRecoverySession = () => {
  if (recoverySessionPromise) return recoverySessionPromise;

  recoverySessionPromise = (async () => {
    console.info("[ResetPassword] recovery init", {
      hasHash: Boolean(window.location.hash),
      hasSearch: Boolean(window.location.search),
      hasCode: window.location.search.includes("code="),
      hasTokenHash: window.location.href.includes("token_hash="),
      hasAccessToken: window.location.hash.includes("access_token="),
    });

    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const searchParams = new URLSearchParams(window.location.search);
    const urlError = hashParams.get("error_description") || searchParams.get("error_description");

    if (urlError) {
      throw new Error(urlError.replace(/\+/g, " "));
    }

    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    const code = searchParams.get("code");
    const tokenHash = searchParams.get("token_hash") || hashParams.get("token_hash");
    const type = searchParams.get("type") || hashParams.get("type") || "recovery";

    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) throw error;
      window.history.replaceState(null, "", window.location.pathname);
    } else if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
      window.history.replaceState(null, "", window.location.pathname);
    } else if (tokenHash) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as "recovery",
      });
      if (error) throw error;
      window.history.replaceState(null, "", window.location.pathname);
    }

    return waitForSession();
  })();

  return recoverySessionPromise;
};

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.info("[ResetPassword] auth event", event, { hasSession: Boolean(session) });
      if (!active) return;

      if (event === "PASSWORD_RECOVERY" || session?.user) {
        setSessionError(null);
        setSessionReady(true);
      }
    });

    const init = async () => {
      try {
        const hasRecoverySession = await establishRecoverySession();
        if (!active) return;

        if (hasRecoverySession) {
          setSessionReady(true);
        } else {
          setSessionError(
            "Link de recuperação inválido ou expirado. Solicite um novo email."
          );
        }
      } catch (err: unknown) {
        const recoveredAfterRace = await waitForSession(6);
        if (!active) return;

        if (recoveredAfterRace) {
          setSessionReady(true);
        } else {
          setSessionError(getErrorMessage(err, "Erro ao validar link de recuperação."));
        }
      }
    };
    init();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const passwordValidation = passwordSchema.safeParse(password);
    if (!passwordValidation.success) {
      toast({
        title: "Senha inválida",
        description: passwordValidation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Senhas diferentes",
        description: "Digite a mesma senha nos dois campos.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast({
        title: "Senha alterada",
        description: "Agora entre com sua nova senha.",
      });

      await supabase.auth.signOut();
      navigate("/auth", { replace: true });
    } catch (error: unknown) {
      toast({
        title: "Erro ao alterar senha",
        description: getErrorMessage(error, "Não foi possível alterar a senha."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Nova senha</CardTitle>
          <CardDescription>
            {sessionError
              ? "Não foi possível validar o link."
              : sessionReady
              ? "Defina sua nova senha de acesso."
              : "Validando link de recuperação..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sessionError && (
            <div className="space-y-4">
              <p className="text-sm text-destructive">{sessionError}</p>
              <Button className="w-full" onClick={() => navigate("/auth")}>
                Voltar ao login
              </Button>
            </div>
          )}
          {!sessionError && !sessionReady && (
            <p className="text-sm text-muted-foreground">Aguarde...</p>
          )}
          {sessionReady && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Digite a nova senha"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repita a nova senha"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Salvando..." : "Salvar nova senha"}
            </Button>
          </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}