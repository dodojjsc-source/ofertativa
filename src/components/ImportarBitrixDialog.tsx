import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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

export function ImportarBitrixDialog({ open, onOpenChange }: ImportarBitrixDialogProps) {
  const { users, getGestores } = useUsers();
  const gestores = getGestores();

  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [defaultGestorId, setDefaultGestorId] = useState<string>("none");
  const [senhaPadrao, setSenhaPadrao] = useState("Buzz@2026");
  const [processing, setProcessing] = useState(false);
  const [search, setSearch] = useState("");

  // Quem está no Bitrix e NÃO está no Ofertativa
  const faltantes = useMemo<BuzzUser[]>(() => {
    const emailsExistentes = new Set(users.map(u => (u.email || "").toLowerCase().trim()));
    const nomesExistentes = new Set(users.map(u => norm(u.name)));
    return (buzzAtivos as BuzzUser[]).filter(b => {
      const email = (b.email || "").toLowerCase().trim();
      const nome = norm(b.nome);
      if (emailsExistentes.has(email)) return false;
      if (nome && nomesExistentes.has(nome)) return false;
      return true;
    });
  }, [users, open]);

  const faltantesFiltrados = useMemo(() => {
    if (!search.trim()) return faltantes;
    const s = norm(search);
    return faltantes.filter(f => norm(f.nome).includes(s) || (f.email || "").toLowerCase().includes(s));
  }, [faltantes, search]);

  const toggle = (email: string) => {
    setSelectedEmails(prev => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedEmails.size === faltantesFiltrados.length) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(faltantesFiltrados.map(f => f.email)));
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

    const aImportar = faltantes.filter(f => selectedEmails.has(f.email));
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
            {faltantes.length} usuário(s) ativo(s) na Buzz (Bitrix) ainda não estão no Ofertativa.
            Marque quem quer criar. Todos entram como corretor com a senha padrão informada,
            e podem trocar a senha no 1º acesso.
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

          <Input
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={faltantesFiltrados.length > 0 && selectedEmails.size === faltantesFiltrados.length}
                onCheckedChange={toggleAll}
              />
              <span>
                {selectedEmails.size} de {faltantesFiltrados.length} selecionado(s)
              </span>
            </div>
            {selectedEmails.size > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedEmails(new Set())}>
                Limpar seleção
              </Button>
            )}
          </div>

          <ScrollArea className="h-[320px] border rounded-md p-2">
            {faltantesFiltrados.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                {faltantes.length === 0
                  ? "🎉 Todo mundo do Bitrix já está no Ofertativa."
                  : "Nada encontrado na busca."}
              </p>
            ) : (
              <ul className="space-y-1">
                {faltantesFiltrados.map(f => (
                  <li
                    key={f.email}
                    className="flex items-center gap-3 p-2 hover:bg-accent rounded cursor-pointer"
                    onClick={() => toggle(f.email)}
                  >
                    <Checkbox
                      checked={selectedEmails.has(f.email)}
                      onCheckedChange={() => toggle(f.email)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{f.nome}</div>
                      <div className="text-xs text-muted-foreground truncate">{f.email}</div>
                    </div>
                  </li>
                ))}
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
