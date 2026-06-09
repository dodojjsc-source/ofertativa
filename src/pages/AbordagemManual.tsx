import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, MessageCircle, Loader2, CheckCircle2, XCircle, Send, Clock, User, Ban } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { PlantaoCopy, DisparoFila } from "@/types/plantao";
import { PrintWhatsApp } from "@/components/PrintWhatsApp";
import { toPng } from "html-to-image";

interface LeadComPlantao extends DisparoFila {
  plantao_nome?: string;
  _onda?: 1 | 2;
}

const MOTIVOS_NAO_ENVIO = [
  "Sem WhatsApp",
  "Número errado",
  "Cliente bloqueou",
  "Vou tentar depois",
  "Vou ligar",
  "Outro",
];

export default function AbordagemManual() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<LeadComPlantao[]>([]);
  const [leadsOnda2, setLeadsOnda2] = useState<LeadComPlantao[]>([]);
  const [leadsJaEnviados, setLeadsJaEnviados] = useState<LeadComPlantao[]>([]);
  const [copiesPorPlantao, setCopiesPorPlantao] = useState<Record<string, PlantaoCopy[]>>({});
  const [optoutAlvo, setOptoutAlvo] = useState<LeadComPlantao | null>(null);
  const [optoutMotivo, setOptoutMotivo] = useState("");
  const [marcandoOptout, setMarcandoOptout] = useState(false);
  const [leadAtivo, setLeadAtivo] = useState<LeadComPlantao | null>(null);
  const [copySelecionada, setCopySelecionada] = useState<PlantaoCopy | null>(null);
  const [complemento, setComplemento] = useState("");
  const [confirmando, setConfirmando] = useState<LeadComPlantao | null>(null);
  const [motivoNaoEnvio, setMotivoNaoEnvio] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [corretorPrimeiroNomeSlug, setCorretorPrimeiroNomeSlug] = useState<string>("");
  const printRef = useRef<HTMLDivElement>(null);

  const slugify = (txt: string) =>
    (txt || "")
      .normalize("NFKD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const HOMONIMOS_VS = ["gabriela"];

  useEffect(() => {
    if (!user?.id) return;

    (async () => {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .single();

      const nome = (data?.name || "").trim();
      const tokens = nome.split(/\s+/).filter(Boolean);
      const primeiro = tokens[0] || "";
      const sobrenome = tokens.length > 1 ? tokens[tokens.length - 1] : "";
      const primeiroSlug = slugify(primeiro);

      const slug = HOMONIMOS_VS.includes(primeiroSlug) && sobrenome
        ? slugify(primeiro + "-" + sobrenome)
        : primeiroSlug;

      setCorretorPrimeiroNomeSlug(slug);
    })();
  }, [user?.id]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const desde14d = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const [{ data: fila, error }, { data: filaOnda2 }, { data: filaEnviados }] = await Promise.all([
      (supabase as any)
        .from("disparo_fila")
        .select("*, disparo_plantoes!inner(id, nome, modo)")
        .eq("corretor_id", user.id)
        .eq("disparo_plantoes.modo", "manual")
        .in("abordagem_status", ["pendente", "abriu_wa"])
        .order("created_at", { ascending: true }),
      (supabase as any)
        .from("disparo_fila")
        .select("*, disparo_plantoes!inner(id, nome, modo)")
        .eq("corretor_id", user.id)
        .eq("disparo_plantoes.modo", "manual")
        .not("msg2_pronto_em", "is", null)
        .is("msg2_confirmado_em", null)
        .order("msg2_pronto_em", { ascending: true }),
      (supabase as any)
        .from("disparo_fila")
        .select("*, disparo_plantoes!inner(id, nome, modo)")
        .eq("corretor_id", user.id)
        .eq("disparo_plantoes.modo", "manual")
        .eq("abordagem_status", "enviou")
        .gte("abordagem_confirmado_em", desde14d)
        .order("abordagem_confirmado_em", { ascending: false })
        .limit(100),
    ]);

    if (error) {
      toast({ title: "Erro ao carregar leads", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const list: LeadComPlantao[] = (fila || []).map((f: any) => ({
      ...f,
      plantao_nome: f.disparo_plantoes?.nome,
      _onda: 1,
    }));
    const list2: LeadComPlantao[] = (filaOnda2 || []).map((f: any) => ({
      ...f,
      plantao_nome: f.disparo_plantoes?.nome,
      _onda: 2,
    }));
    const listEnviados: LeadComPlantao[] = (filaEnviados || []).map((f: any) => ({
      ...f,
      plantao_nome: f.disparo_plantoes?.nome,
      _onda: 1,
    }));
    setLeads(list);
    setLeadsOnda2(list2);
    setLeadsJaEnviados(listEnviados);

    const plantaoIds = Array.from(new Set([...list, ...list2, ...listEnviados].map((l) => l.plantao_id)));
    if (plantaoIds.length > 0) {
      const { data: copies } = await (supabase as any)
        .from("disparo_copies")
        .select("*")
        .in("plantao_id", plantaoIds)
        .eq("ativa", true)
        .order("ordem");
      const agrup: Record<string, PlantaoCopy[]> = {};
      (copies || []).forEach((c: PlantaoCopy) => {
        if (!agrup[c.plantao_id]) agrup[c.plantao_id] = [];
        agrup[c.plantao_id].push(c);
      });
      setCopiesPorPlantao(agrup);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    load();
    const i = setInterval(load, 30000);
    return () => clearInterval(i);
  }, [load]);

  const resolverTexto = (template: string, nome: string) => {
    const primeiro = nome.split(" ")[0] || "";
    const flyerUrl = corretorPrimeiroNomeSlug
      ? `https://intelbuzz.com.br/flyer-setai/?c=${corretorPrimeiroNomeSlug}`
      : "https://intelbuzz.com.br/flyer-setai/";

    let t = template
      .replace(/\{\{\s*primeiro_nome\s*\}\}/gi, primeiro)
      .replace(/\{\{\s*nome\s*\}\}/gi, primeiro)
      .replace(/\{\{\s*eflyer\s*\}\}/gi, flyerUrl)
      .replace(/\{\{\s*flyer\s*\}\}/gi, flyerUrl);

    // Retrofit: copies antigas com URL hardcoded `flyer-setai/?c=xxx` recebem o slug do corretor logado
    if (corretorPrimeiroNomeSlug) {
      t = t.replace(
        /https?:\/\/intelbuzz\.com\.br\/flyer-setai\/\?c=[a-zA-Z0-9-]+/g,
        flyerUrl,
      );
    }

    if (complemento.trim()) {
      t += "\n\n" + complemento.trim();
    }
    return t;
  };

  const primeiroNome = (n: string) => (n || "").split(" ")[0] || n || "";

  const waUrl = (() => {
    if (!leadAtivo || !copySelecionada) return "#";
    const texto = resolverTexto(copySelecionada.texto, leadAtivo.nome);
    const tel = leadAtivo.telefone_norm || leadAtivo.telefone.replace(/\D/g, "");
    const isMobile = typeof navigator !== "undefined" && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    // Desktop: pula a página de confirmação do wa.me e abre direto no WhatsApp Web.
    // Mobile: wa.me abre o app nativo.
    return isMobile
      ? `https://wa.me/${tel}?text=${encodeURIComponent(texto)}`
      : `https://web.whatsapp.com/send?phone=${tel}&text=${encodeURIComponent(texto)}`;
  })();

  const aoClicarAbrirWa = () => {
    if (!leadAtivo || !copySelecionada) return;
    const texto = resolverTexto(copySelecionada.texto, leadAtivo.nome);
    const leadComTexto = { ...leadAtivo, texto_enviado: texto };
    const copyId = copySelecionada.id;
    const compl = complemento.trim() || null;
    const filaId = leadAtivo.id;

    setConfirmando(leadComTexto);
    setLeadAtivo(null);
    setCopySelecionada(null);
    setComplemento("");

    const rpcName = leadAtivo._onda === 2 ? "abordagem_abrir_wa_msg2" : "abordagem_abrir_wa";

    // Registra a intenção em background (não bloqueia o UX nem a abertura do WA).
    (async () => {
      try {
        const { error } = await (supabase as any).rpc(rpcName, {
          _fila_id: filaId,
          _copy_id: copyId,
          _texto: texto,
          _complemento: compl,
        });
        if (error) throw error;
        load();
      } catch (err: any) {
        toast({ title: "Aviso", description: "WhatsApp abriu, mas falhou registrar: " + err.message, variant: "destructive" });
      }
    })();
  };

  const confirmarOptout = async () => {
    if (!optoutAlvo) return;
    setMarcandoOptout(true);
    try {
      const { data, error } = await (supabase as any).rpc("sinalizar_optout_manual", {
        _fila_id: optoutAlvo.id,
        _motivo: optoutMotivo.trim() || null,
      });
      if (error) throw error;
      if (data === false) throw new Error("Não foi possível sinalizar. Esse lead pode não ser seu.");
      toast({ title: "Opt-out registrado", description: `${optoutAlvo.nome} sai de todas as listas.` });
      setOptoutAlvo(null);
      setOptoutMotivo("");
      load();
    } catch (err: any) {
      toast({ title: "Erro ao sinalizar opt-out", description: err.message, variant: "destructive" });
    } finally {
      setMarcandoOptout(false);
    }
  };

  const confirmarEnvio = async (enviou: boolean) => {
    if (!confirmando) return;
    setSalvando(true);

    try {
      let printUrl: string | null = null;

      if (enviou && printRef.current) {
        try {
          const dataUrl = await toPng(printRef.current, { pixelRatio: 3, cacheBust: true });
          const blob = await (await fetch(dataUrl)).blob();
          const path = `${user?.id}/${confirmando.plantao_id}/${confirmando.id}-${Date.now()}.png`;
          const { data: up, error: upErr } = await supabase.storage
            .from("abordagens")
            .upload(path, blob, { contentType: "image/png", upsert: true });
          if (upErr) throw upErr;
          const { data: pub } = supabase.storage.from("abordagens").getPublicUrl(up.path);
          printUrl = pub.publicUrl;
        } catch (e: any) {
          console.warn("Falha ao gerar print:", e?.message);
        }
      }

      const rpcName = confirmando._onda === 2 ? "abordagem_confirmar_msg2" : "abordagem_confirmar";
      const { error } = await (supabase as any).rpc(rpcName, {
        _fila_id: confirmando.id,
        _enviou: enviou,
        _motivo: enviou ? null : motivoNaoEnvio,
        _print_url: printUrl,
      });
      if (error) throw error;

      toast({
        title: enviou ? "Abordagem registrada" : "Não envio registrado",
        description: enviou ? "Print salvo no histórico do lead." : "Motivo registrado.",
      });
      setConfirmando(null);
      setMotivoNaoEnvio("");
      load();
    } catch (err: any) {
      toast({ title: "Erro ao confirmar", description: err.message, variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  const hora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
              <MessageCircle className="h-5 w-5 sm:h-7 sm:w-7 text-green-600 shrink-0" />
              <span className="truncate">Abordagem Ativa</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
              Escolha a copy, clique pra abrir no seu WhatsApp Web e mande pro cliente
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-center">
            <Kpi label="Pra abordar" value={leads.filter((l) => l.abordagem_status === "pendente" || !l.abordagem_status).length} cor="text-amber-600" />
            <Kpi label="Aguardando" value={leads.filter((l) => l.abordagem_status === "abriu_wa").length} cor="text-blue-600" />
            <Kpi label="🔁 Onda 2" value={leadsOnda2.length} cor={leadsOnda2.length > 0 ? "text-orange-600" : ""} />
            <Kpi label="Total" value={leads.length + leadsOnda2.length} cor="" />
          </CardContent>
        </Card>

        {leads.length === 0 && leadsOnda2.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground space-y-2">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-600" />
              <p className="text-lg font-semibold text-foreground">Sem leads pra abordar agora</p>
              <p className="text-sm">Quando o gestor distribuir novos leads de oferta ativa, eles aparecem aqui.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {leadsOnda2.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                    <Clock className="h-5 w-5 text-orange-600" />
                    Onda 2 — Follow-up
                  </h2>
                  <Badge className="bg-orange-100 text-orange-800 border-orange-200">{leadsOnda2.length} pendente{leadsOnda2.length === 1 ? "" : "s"}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Esses clientes receberam sua primeira mensagem mas não responderam. Mande a 2ª copy pra reativar.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {leadsOnda2.map((lead) => {
                    const copiesAll = copiesPorPlantao[lead.plantao_id] || [];
                    const copies2 = copiesAll.filter((c) => c.fase === 2);
                    return (
                      <Card key={`o2-${lead.id}`} className="hover:shadow-md transition border-orange-200 bg-orange-50/30">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-bold flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                {lead.nome}
                              </div>
                              <div className="text-xs text-muted-foreground font-mono mt-1">{lead.telefone}</div>
                              <div className="text-xs text-muted-foreground mt-1">{lead.plantao_nome}</div>
                            </div>
                            {lead.msg2_status === "abriu_wa" ? (
                              <Badge className="bg-blue-100 text-blue-700">Aguardando confirmar</Badge>
                            ) : (
                              <Badge className="bg-orange-100 text-orange-800 border-orange-200">🔁 Onda 2</Badge>
                            )}
                          </div>

                          <div className="text-xs text-muted-foreground">
                            Msg 1 enviada {lead.enviado_em ? new Date(lead.enviado_em).toLocaleDateString("pt-BR") : "—"}
                          </div>

                          <div className="flex gap-2 pt-1">
                            {lead.msg2_status === "abriu_wa" ? (
                              <Button
                                variant="outline"
                                className="flex-1 h-12 sm:h-10 text-base sm:text-sm"
                                onClick={() => setConfirmando(lead)}
                              >
                                <Clock className="mr-1 h-4 w-4" />
                                Confirmar 2ª msg
                              </Button>
                            ) : (
                              <Button
                                className="flex-1 bg-orange-600 hover:bg-orange-700 h-12 sm:h-10 text-base sm:text-sm"
                                disabled={copies2.length === 0}
                                onClick={() => {
                                  setLeadAtivo(lead);
                                  setCopySelecionada(copies2[0] || null);
                                  setComplemento("");
                                }}
                              >
                                <MessageCircle className="mr-1 h-4 w-4" />
                                {copies2.length === 0 ? "Sem copy Onda 2" : "Mandar 2ª msg"}
                              </Button>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setOptoutAlvo(lead)}
                            className="text-xs text-muted-foreground hover:text-red-600 underline self-start"
                          >
                            <Ban className="inline h-3 w-3 mr-1" />
                            Cliente pediu SAIR
                          </button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {leads.length > 0 && (
              <div className="space-y-2">
                {leadsOnda2.length > 0 && (
                  <div className="flex items-center gap-2 pt-2">
                    <h2 className="text-base sm:text-lg font-bold">1ª abordagem</h2>
                    <Badge variant="outline">{leads.length}</Badge>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {leads.map((lead) => {
                    const copiesAll = copiesPorPlantao[lead.plantao_id] || [];
                    const copies1 = copiesAll.filter((c) => (c.fase || 1) === 1);
                    return (
                      <Card key={lead.id} className="hover:shadow-md transition">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-bold flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                {lead.nome}
                              </div>
                              <div className="text-xs text-muted-foreground font-mono mt-1">{lead.telefone}</div>
                              <div className="text-xs text-muted-foreground mt-1">{lead.plantao_nome}</div>
                            </div>
                            {lead.abordagem_status === "abriu_wa" ? (
                              <Badge className="bg-blue-100 text-blue-700">Aguardando confirmar</Badge>
                            ) : (
                              <Badge variant="outline">Novo</Badge>
                            )}
                          </div>

                          {lead.origem && <div className="text-xs"><span className="text-muted-foreground">Origem: </span>{lead.origem}</div>}

                          <div className="flex gap-2 pt-1">
                            {lead.abordagem_status === "abriu_wa" ? (
                              <Button
                                variant="outline"
                                className="flex-1 h-12 sm:h-10 text-base sm:text-sm"
                                onClick={() => setConfirmando(lead)}
                              >
                                <Clock className="mr-1 h-4 w-4" />
                                Confirmar envio
                              </Button>
                            ) : (
                              <Button
                                className="flex-1 bg-green-600 hover:bg-green-700 h-12 sm:h-10 text-base sm:text-sm"
                                disabled={copies1.length === 0}
                                onClick={() => {
                                  setLeadAtivo(lead);
                                  setCopySelecionada(copies1[0] || null);
                                  setComplemento("");
                                }}
                              >
                                <MessageCircle className="mr-1 h-4 w-4" />
                                {copies1.length === 0 ? "Sem copy cadastrada" : "Abordar"}
                              </Button>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setOptoutAlvo(lead)}
                            className="text-xs text-muted-foreground hover:text-red-600 underline self-start"
                          >
                            <Ban className="inline h-3 w-3 mr-1" />
                            Cliente pediu SAIR
                          </button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {leadsJaEnviados.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 pt-2">
                  <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                    <Send className="h-5 w-5 text-blue-600" />
                    Já abordei (últimos 14 dias)
                  </h2>
                  <Badge variant="outline">{leadsJaEnviados.length}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Se algum desses clientes pediu pra SAIR no WhatsApp, marca aqui pra remover de todas as ofertas futuras.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {leadsJaEnviados.map((lead) => (
                    <Card key={`enviado-${lead.id}`} className="bg-muted/30">
                      <CardContent className="p-3 flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm truncate">{lead.nome}</div>
                          <div className="text-xs text-muted-foreground font-mono">{lead.telefone}</div>
                          <div className="text-xs text-muted-foreground">
                            Enviado {lead.abordagem_confirmado_em ? new Date(lead.abordagem_confirmado_em).toLocaleDateString("pt-BR") : "—"}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 shrink-0"
                          onClick={() => setOptoutAlvo(lead)}
                        >
                          <Ban className="mr-1 h-3 w-3" />
                          SAIR
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ALERTDIALOG: confirma opt-out manual */}
      <AlertDialog open={!!optoutAlvo} onOpenChange={(o) => { if (!o) { setOptoutAlvo(null); setOptoutMotivo(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-red-600" />
              Cliente {optoutAlvo?.nome} pediu pra SAIR?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Vai sumir das suas listas e ficar bloqueado em <strong>todas as ofertas futuras</strong> (qualquer plantão, qualquer corretor). Ação não pode ser desfeita pela sua tela.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Motivo (opcional)</label>
            <Input
              value={optoutMotivo}
              onChange={(e) => setOptoutMotivo(e.target.value.slice(0, 200))}
              placeholder="Ex: respondeu SAIR no WhatsApp"
              disabled={marcandoOptout}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={marcandoOptout}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmarOptout(); }}
              disabled={marcandoOptout}
              className="bg-red-600 hover:bg-red-700"
            >
              {marcandoOptout ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Ban className="mr-1 h-4 w-4" />}
              Confirmar opt-out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* DIALOG: escolher copy + abrir wa.me */}
      <Dialog open={!!leadAtivo} onOpenChange={(o) => { if (!o) { setLeadAtivo(null); setCopySelecionada(null); setComplemento(""); } }}>
        <DialogContent className="max-w-5xl h-[100dvh] sm:h-auto sm:max-h-[90vh] overflow-y-auto rounded-none sm:rounded-lg p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-left">
              <span className="flex items-center gap-2">
                <MessageCircle className={`h-5 w-5 shrink-0 ${leadAtivo?._onda === 2 ? "text-orange-600" : "text-green-600"}`} />
                <span className="truncate">{leadAtivo?._onda === 2 ? "Follow-up Onda 2 com" : "Abordar"} {leadAtivo?.nome}</span>
              </span>
              <span className="text-sm font-mono text-muted-foreground">{leadAtivo?.telefone}</span>
              {leadAtivo?._onda === 2 && <Badge className="bg-orange-100 text-orange-800 border-orange-200">🔁 2ª mensagem</Badge>}
            </DialogTitle>
          </DialogHeader>

          {leadAtivo && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-24 sm:pb-0">
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Copy</label>
                  <Select
                    value={copySelecionada?.id || ""}
                    onValueChange={(id) => {
                      const c = (copiesPorPlantao[leadAtivo.plantao_id] || []).find((x) => x.id === id);
                      setCopySelecionada(c || null);
                    }}
                  >
                    <SelectTrigger className="h-12 text-base"><SelectValue placeholder="Escolha uma copy" /></SelectTrigger>
                    <SelectContent>
                      {(copiesPorPlantao[leadAtivo.plantao_id] || [])
                        .filter((c) => (c.fase || 1) === (leadAtivo._onda || 1))
                        .map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            Copy {c.ordem} {c.taxa_resposta !== null ? `(${c.taxa_resposta}% resposta)` : ""}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {copySelecionada && (
                  <Card>
                    <CardContent className="p-3">
                      <pre className="text-sm sm:text-xs whitespace-pre-wrap font-sans leading-relaxed">{copySelecionada.texto}</pre>
                    </CardContent>
                  </Card>
                )}

                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Complemento livre (opcional)
                  </label>
                  <Textarea
                    placeholder="Personalize, mencione algo específico do cliente..."
                    value={complemento}
                    onChange={(e) => setComplemento(e.target.value.slice(0, 200))}
                    rows={2}
                    className="text-base sm:text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{complemento.length}/200</p>
                </div>
              </div>

              <div className="hidden md:flex flex-col items-center gap-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground self-start">Preview</label>
                <div style={{ transform: "scale(0.65)", transformOrigin: "top center", marginBottom: "-200px" }}>
                  {copySelecionada && (
                    <PrintWhatsApp
                      nomeCliente={leadAtivo.nome}
                      telefone={leadAtivo.telefone}
                      texto={resolverTexto(copySelecionada.texto, leadAtivo.nome)}
                      hora={hora}
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Botão principal grande no mobile, footer normal no desktop */}
          <div className="fixed bottom-0 left-0 right-0 sm:static bg-background border-t sm:border-0 p-4 sm:p-0 flex flex-col sm:flex-row gap-2 sm:justify-end z-10">
            <Button
              variant="outline"
              className="hidden sm:inline-flex"
              onClick={() => { setLeadAtivo(null); setCopySelecionada(null); setComplemento(""); }}
            >
              Cancelar
            </Button>
            <Button
              variant="outline"
              disabled={!copySelecionada || salvando}
              className="hidden sm:inline-flex"
              onClick={async () => {
                if (!leadAtivo || !copySelecionada) return;
                const texto = resolverTexto(copySelecionada.texto, leadAtivo.nome);
                try {
                  await navigator.clipboard.writeText(texto);
                  toast({ title: "Texto copiado", description: "Cola na conversa do cliente no WhatsApp Web." });
                } catch {
                  toast({ title: "Não consegui copiar", description: "Seleciona o texto manualmente.", variant: "destructive" });
                }
                aoClicarAbrirWa();
              }}
            >
              <Send className="mr-2 h-4 w-4" />
              Copiar texto e registrar
            </Button>
            <Button
              disabled={!copySelecionada || salvando}
              className="bg-green-600 hover:bg-green-700 h-14 sm:h-10 text-base sm:text-sm"
              onClick={() => {
                window.open(waUrl, "_blank");
                aoClicarAbrirWa();
              }}
            >
              <Send className="mr-2 h-5 w-5 sm:h-4 sm:w-4" />
              <span className="sm:hidden">Abrir WhatsApp agora</span>
              <span className="hidden sm:inline">Abrir WhatsApp em nova aba</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG: confirmar envio + gerar print */}
      <Dialog open={!!confirmando} onOpenChange={(o) => { if (!o) { setConfirmando(null); setMotivoNaoEnvio(""); } }}>
        <DialogContent className="max-w-md h-[100dvh] sm:h-auto rounded-none sm:rounded-lg flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg">Você enviou pro {confirmando ? primeiroNome(confirmando.nome) : "cliente"}?</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 flex-1">
            <p className="text-sm text-muted-foreground">
              Se já mandou no WhatsApp, toca <strong>Sim, enviei</strong> e o print fica registrado no histórico do lead.
            </p>

            {/* Print invisível pra capturar */}
            <div style={{ position: "fixed", left: "-10000px", top: 0 }} aria-hidden>
              {confirmando && (
                <PrintWhatsApp
                  ref={printRef}
                  nomeCliente={confirmando.nome}
                  telefone={confirmando.telefone}
                  texto={confirmando.texto_enviado || ""}
                  hora={hora}
                />
              )}
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Se não enviou, qual o motivo?
              </label>
              <Select value={motivoNaoEnvio} onValueChange={setMotivoNaoEnvio}>
                <SelectTrigger className="h-12 sm:h-10 text-base sm:text-sm"><SelectValue placeholder="Selecione (só se não enviou)" /></SelectTrigger>
                <SelectContent>
                  {MOTIVOS_NAO_ENVIO.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-2 mt-auto sm:mt-0">
            <Button
              variant="outline"
              onClick={() => confirmarEnvio(false)}
              disabled={salvando || !motivoNaoEnvio}
              className="text-red-600 border-red-200 h-12 sm:h-10 text-base sm:text-sm"
            >
              <XCircle className="mr-1 h-4 w-4" /> Não enviei
            </Button>
            <Button
              onClick={() => confirmarEnvio(true)}
              disabled={salvando}
              className="bg-green-600 hover:bg-green-700 h-14 sm:h-10 text-base sm:text-sm"
            >
              {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5 sm:h-4 sm:w-4" />}
              Sim, enviei
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

function Kpi({ label, value, cor }: { label: string; value: number; cor: string }) {
  return (
    <div>
      <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-2xl sm:text-3xl font-bold ${cor}`}>{value}</p>
    </div>
  );
}
