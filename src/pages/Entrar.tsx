import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Entrada unica pelo Portal do Corretor (25/10/2026).
 * O portal pede um token de link magico pra edge function admin-users (acao sso-link)
 * e abre /entrar?th=<token_hash>&next=/dashboard. Aqui o token vira sessao.
 * Depois de validar, recarrega a pagina inteira: o AuthContext le a sessao do zero
 * e nao corre o risco de cair em /auth antes do perfil carregar.
 */
export default function Entrar() {
  const [params] = useSearchParams();
  const [erro, setErro] = useState<string | null>(null);
  const rodou = useRef(false);

  useEffect(() => {
    if (rodou.current) return; // StrictMode roda o efeito 2x e o token e de uso unico
    rodou.current = true;
    const th = params.get("th") || "";
    let next = params.get("next") || "/dashboard";
    if (!next.startsWith("/") || next.startsWith("//")) next = "/dashboard";
    (async () => {
      if (!th) {
        const { data } = await supabase.auth.getSession();
        if (data.session) window.location.replace(next);
        else setErro("Link de entrada sem token. Abra o Oferta ativa de novo pelo Portal do Corretor.");
        return;
      }
      const { error } = await supabase.auth.verifyOtp({ token_hash: th, type: "magiclink" });
      if (error) {
        // token ja usado ou vencido: se ja existe sessao, segue; senao mostra o caminho
        const { data } = await supabase.auth.getSession();
        if (data.session) { window.location.replace(next); return; }
        setErro("Esse link de entrada venceu ou ja foi usado. Volte ao Portal do Corretor e abra o Oferta ativa de novo.");
        return;
      }
      window.location.replace(next);
    })();
  }, [params]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="text-center space-y-4 max-w-md">
        {erro ? (
          <>
            <h1 className="text-xl font-semibold">Nao foi possivel entrar</h1>
            <p className="text-muted-foreground">{erro}</p>
            <p className="text-sm">
              <a className="underline" href="https://portal.intelbuzz.com.br/portal/app/ofertativa">Abrir pelo Portal</a>
              {" · "}
              <Link className="underline" to="/auth">Entrar com e-mail e senha</Link>
            </p>
          </>
        ) : (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="text-muted-foreground">Entrando no Oferta ativa...</p>
          </>
        )}
      </div>
    </div>
  );
}
