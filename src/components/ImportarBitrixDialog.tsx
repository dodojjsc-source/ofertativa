import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUsers } from "@/contexts/UsersContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import buzzAtivos from "@/data/buzz_ativos.json";

interface BuzzUser {
  uid: number;
  nome: string;
  email: string;
}

interface ImportarBitrixDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const norm = (s: string) =>
  (s || "").toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

// Chave "primeiro nome + último sobrenome" pra pegar variações tipo "Pedro Souza" vs "Pedro Henrique Tomaz de Souza"
const firstLastKey = (s: string) => {
  const parts = norm(s).split(" ").filter(p => p && p.length >= 2);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return `${parts[0]}|${parts[parts.length - 1]}`;
};

const localPart = (email: string) => (email || "").toLowerCase().split("@")[0].trim();

interface MatchInfo {
  buzz: BuzzUser;
  matchedUser: { id: string; name: string; email: string } | null;
  matchReason: string | null;
}

export function ImportarBitrixDialog({ open, onOpenChange }: ImportarBitrixDialogProps) {
  const { users, getGestores } = useUsers();
  const gestores = getGestores();

  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [defaultGestorId, setDefaultGestorId] = useState<string>("none");
  const [senhaPadrao, setSenhaPadrao] = useState("Buzz@2026");
  const [processing, setProcessing] = useState(false);
  const [search, setSearch] = useState("");
  const [mostrarTodos, setMostrarTodos] = useState(false);

  // Quando abre, limpa estado
  useEffect(() => {
    if (open) {
      setSelectedEmails(new Set());
      setSearch("");
      setMostrarTodos(false);
    }
  }, [open]);

  // Cruzamento por email, email-local, nome exato e nome primeiro+último
  const matches = useMemo<MatchInfo[]>(() => {
    const byEmail = new Map<string, typeof users[number]>();
    const byEmailLocal = new Map<string, typeof users[number]>();
    const byNome = new Map<string, typeof users[number]>();
    const byFirstLast = new Map<string, typeof users[number]>();

    for (const u of users) {
      const e = (u.email || "").toLowerCase().trim();
      if (e) {
        byEmail.set(e, u);
        const lp = localPart(e);
        if (lp) byEmailLocal.set(lp, u);
      }
      const n = norm(u.name);
      if (n) byNome.set(n, u);
      const fl = firstLastKey(u.name);
      if (fl) byFirstLast.set(fl, u);
    }

    return (buzzAtivos as BuzzUser[]).map(buzz => {
      const e = (buzz.email || "").toLowerCase().trim();
      const lp = localPart(e);
      const n = norm(buzz.nome);
      const fl = firstLastKey(buzz.nome);

      let matched: typeof users[number] | undefined;
      let reason: string | null = null;

      if (e && byEmail.has(e)) { matched = byEmail.get(e); reason = "email idêntico"; }
      else if (lp && byEmailLocal.has(lp)) { matched = byEmailLocal.get(lp); reason = "mesmo local do email"; }
      else if (n && byNome.has(n)) { matched = byNome.get(n); reason = "nome idêntico"; }
      else if (fl && byFirstLast.has(fl)) { matched = byFirstLast.get(fl); reason = "primeiro nome + sobrenome"; }

      return {
        buzz,
        matchedUser: matched ? { id: matched.id, name: matched.name, email: matched.email } : null,
        matchReason: reason,
      };
    });
  }, [users, open]);

  const faltantes = useMemo(() => matches.filter(m => !m.matchedUser), [matches]);
  const jaCadastrados = useMemo(() => matches.filter(m => m.matchedUser), [matches]);

  const listaVisivel = useMemo(() => {
    const fonte = mostrarTodos ? matches : faltantes;
    if (!search.trim()) return fonte;
    const s = norm(search);
    return fonte.filter(m =>
      norm(m.buzz.nome).includes(s) ||
      (m.buzz.email || "").toLowerCase().includes(s)
    );
  }, [matches, faltantes, mostrarTodos, search]);

  const toggle = (email: string, blocked: boolean) => {
    if (blocked) return;
    setSelectedEmails(prev => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };

  // Só marca/desmarca os disponíveis (sem match)
  const toggleAll = () => {
    const disponiveis = listaVisivel.filter(m => !m.matchedUser).map(m => m.buzz.email);
    const todosMarcados = disponiveis.every(e => selectedEmails.has(e));
    if (todosMarcados) {
      const next = new Set(selectedEmails);
      disponiveis.forEach(e => next.delete(e));
      setSelectedEmails(next);
    } else {
      const next = new Set(selectedEmails);
      disponiveis.forEach(e => next.add(e));
      setSelectedEmails(next);
    }
  };

  const handleImportar = async () => {
    if (selectedEmails.size === 0) {
      toast({ title: "Selecione ao menos 1 usuário", variant: "destructive" });
      return;
    }
    if (!senhaPadrao || senhaPadrao.length < 6) {
      toast({ title: "Senha precisa de pelo menos 6 caracteres", variant: "destructive" });
      return;
    }

    setProcessing(true);
    let ok = 0;
    const falhas: { nome: string; erro: string }[] = [];

    // Trava extra: só cria pra quem está em "faltantes" no momento do clique
    const aImportar = faltantes
      .filter(m => selectedEmails.has(m.buzz.email))
      .map(m => m.buzz);
    for (const buzz of aImportar) {
      try {
        const metadata: Record<string, any> = {
          name: buzz.nome,
          role: "corretor",
        };
        if (defaultGestorId && defaultGestorId !== "none") {
          metadata.gestor_id = defaultGestorId;
        }

        const { error } = await supabase.auth.signUp({
          email: buzz.email,
          password: senhaPadrao,
          options: { data: metadata },
        });

        if (error) {
          if (error.message?.toLowerCase().includes("already")) {
            falhas.push({ nome: buzz.nome, erro: "já cadastrado" });
          } else {
            throw error;
          }
        } else {
          ok++;
        }
      } catch (e: any) {
        falhas.push({ nome: buzz.nome, erro: e?.message || String(e) });
      }
    }

    setProcessing(false);
    setSelectedEmails(new Set());

    toast({
      title: `${ok} usuário(s) importado(s)`,
      description: falhas.length
        ? `Falharam: ${falhas.map(f => `${f.nome} (${f.erro})`).join(" · ")}`
        : `Senha temporária: ${senhaPadrao}. Cada um troca no 1º login.`,
      variant: falhas.length ? "destructive" : "default",
    });

    if (ok > 0) {
      // recarregar a lista de usuários
      window.location.reload();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !processing && onOpenChange(o)}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Importar do Bitrix</DialogTitle>
          <DialogDescription>
            <strong>{faltantes.length}</strong> ativo(s) na Buzz sem login no Ofertativa ·
            <strong> {jaCadastrados.length}</strong> já têm conta (travados).
            Marque quem criar. Todos entram como corretor com a senha padrão e trocam no 1º acesso.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Gestor padrão (opcional)</Label>
              <Select value={defaultGestorId} onValueChange={setDefaultGestorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sem gestor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem gestor</SelectItem>
                  {gestores.map(g => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Senha temporária</Label>
              <Input
                value={senhaPadrao}
                onChange={(e) => setSenhaPadrao(e.target.value)}
                placeholder="Buzz@2026"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Input
              placeholder="Buscar por nome ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <label className="flex items-center gap-2 text-sm whitespace-nowrap cursor-pointer">
              <Checkbox checked={mostrarTodos} onCheckedChange={(v) => setMostrarTodos(!!v)} />
              Mostrar todos
            </label>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={
                  listaVisivel.filter(m => !m.matchedUser).length > 0 &&
                  listaVisivel.filter(m => !m.matchedUser).every(m => selectedEmails.has(m.buzz.email))
                }
                onCheckedChange={toggleAll}
              />
              <span>
                {selectedEmails.size} selecionado(s) · {listaVisivel.length} visível(eis)
              </span>
            </div>
            {selectedEmails.size > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedEmails(new Set())}>
                Limpar seleção
              </Button>
            )}
          </div>

          <ScrollArea className="h-[320px] border rounded-md p-2">
            {listaVisivel.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                {faltantes.length === 0
                  ? "🎉 Todo mundo do Bitrix já está no Ofertativa."
                  : "Nada encontrado na busca."}
              </p>
            ) : (
              <ul className="space-y-1">
                {listaVisivel.map(m => {
                  const blocked = !!m.matchedUser;
                  return (
                    <li
                      key={m.buzz.email}
                      className={`flex items-center gap-3 p-2 rounded ${
                        blocked
                          ? "opacity-60 bg-muted/40 cursor-not-allowed"
                          : "hover:bg-accent cursor-pointer"
                      }`}
                      onClick={() => toggle(m.buzz.email, blocked)}
                    >
                      <Checkbox
                        checked={selectedEmails.has(m.buzz.email)}
                        disabled={blocked}
                        onCheckedChange={() => toggle(m.buzz.email, blocked)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate flex items-center gap-2">
                          {m.buzz.nome}
                          {blocked && (
                            <Badge variant="outline" className="text-xs">
                              já cadastrado · {m.matchReason}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {m.buzz.email}
                          {m.matchedUser && (
                            <> · ↔ {m.matchedUser.name} ({m.matchedUser.email})</>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
              Cancelar
            </Button>
            <Button onClick={handleImportar} disabled={processing || selectedEmails.size === 0}>
              {processing ? "Criando..." : `Criar ${selectedEmails.size} conta(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
