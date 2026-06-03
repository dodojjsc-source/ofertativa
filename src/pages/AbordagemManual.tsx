import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, MessageCircle, Loader2, CheckCircle2, XCircle, Send, Clock, User } from "lucide-react";
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
  const [copiesPorPlantao, setCopiesPorPlantao] = useState<Record<string, PlantaoCopy[]>>({});
  const [leadAtivo, setLeadAtivo] = useState<LeadComPlantao | null>(null);
  const [copySelecionada, setCopySelecionada] = useState<PlantaoCopy | null>(null);
  const [complemento, setComplemento] = useState("");
  const [confirmando, setConfirmando] = useState<LeadComPlantao | null>(null);
  const [motivoNaoEnvio, setMotivoNaoEnvio] = useState("");
  const [salvando, setSalvando] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const { data: fila, error } = await (supabase as any)
      .from("disparo_fila")
      .select("*, disparo_plantoes!inner(id, nome, modo)")
      .eq("corretor_id", user.id)
      .eq("disparo_plantoes.modo", "manual")
      .in("abordagem_status", ["pendente", "abriu_wa"])
      .order("created_at", { ascending: true });

    if (error) {
      toast({ title: "Erro ao carregar leads", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const list: LeadComPlantao[] = (fila || []).map((f: any) => ({
      ...f,
      plantao_nome: f.disparo_plantoes?.nome,
    }));
    setLeads(list);

    const plantaoIds = Array.from(new Set(list.map((l) => l.plantao_id)));
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
    let t = template.replace(/\{\{\s*nome\s*\}\}/gi, nome.split(" ")[0] || "");
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
    return `https://wa.me/${tel}?text=${encodeURIComponent(texto)}`;
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

    // Registra a intenção em background (não bloqueia o UX nem a abertura do WA).
    (async () => {
      try {
        const { error } = await (supabase as any).rpc("abordagem_abrir_wa", {
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

      const { error } = await (supabase as any).rpc("abordagem_confirmar", {
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
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageCircle className="h-7 w-7 text-green-600" />
              Abordagem Ativa pelo WhatsApp
            </h1>
            <p className="text-sm text-muted-foreground">
              Escolha a copy, clique pra abrir no seu WhatsApp Web e mande pro cliente
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <Kpi label="Para abordar" value={leads.filter((l) => l.abordagem_status === "pendente" || !l.abordagem_status).length} cor="text-amber-600" />
            <Kpi label="Aguardando confirmar" value={leads.filter((l) => l.abordagem_status === "abriu_wa").length} cor="text-blue-600" />
            <Kpi label="Total atribuídos" value={leads.length} cor="" />
          </CardContent>
        </Card>

        {leads.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground space-y-2">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-600" />
              <p className="text-lg font-semibold text-foreground">Sem leads pra abordar agora</p>
              <p className="text-sm">Quando o gestor distribuir novos leads de oferta ativa, eles aparecem aqui.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {leads.map((lead) => {
              const copies = copiesPorPlantao[lead.plantao_id] || [];
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
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => setConfirmando(lead)}
                        >
                          <Clock className="mr-1 h-4 w-4" />
                          Confirmar envio
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          disabled={copies.length === 0}
                          onClick={() => {
                            setLeadAtivo(lead);
                            setCopySelecionada(copies[0] || null);
                            setComplemento("");
                          }}
                        >
                          <MessageCircle className="mr-1 h-4 w-4" />
                          Abordar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* DIALOG: escolher copy + abrir wa.me */}
      <Dialog open={!!leadAtivo} onOpenChange={(o) => { if (!o) { setLeadAtivo(null); setCopySelecionada(null); setComplemento(""); } }}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              Abordar {leadAtivo?.nome}
              <span className="text-sm font-mono text-muted-foreground">{leadAtivo?.telefone}</span>
            </DialogTitle>
          </DialogHeader>

          {leadAtivo && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <SelectTrigger><SelectValue placeholder="Escolha uma copy" /></SelectTrigger>
                    <SelectContent>
                      {(copiesPorPlantao[leadAtivo.plantao_id] || []).map((c) => (
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
                      <pre className="text-xs whitespace-pre-wrap font-sans">{copySelecionada.texto}</pre>
                    </CardContent>
                  </Card>
                )}

                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Complemento livre (opcional, max 200 chars)
                  </label>
                  <Textarea
                    placeholder="Personalize, mencione algo específico do cliente..."
                    value={complemento}
                    onChange={(e) => setComplemento(e.target.value.slice(0, 200))}
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{complemento.length}/200</p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2">
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

          <DialogFooter>
            <Button variant="outline" onClick={() => { setLeadAtivo(null); setCopySelecionada(null); setComplemento(""); }}>
              Cancelar
            </Button>
            <Button
              disabled={!copySelecionada || salvando}
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                window.open(waUrl, "_blank");
                aoClicarAbrirWa();
              }}
            >
              <Send className="mr-2 h-4 w-4" />
              Abrir WhatsApp e registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: confirmar envio + gerar print */}
      <Dialog open={!!confirmando} onOpenChange={(o) => { if (!o) { setConfirmando(null); setMotivoNaoEnvio(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Você enviou pro {confirmando ? primeiroNome(confirmando.nome) : "cliente"}?</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Se já mandou no WhatsApp Web, clique em <strong>Sim, enviei</strong> e o print fica registrado no histórico do lead.
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
                <SelectTrigger><SelectValue placeholder="Selecione (só se não enviou)" /></SelectTrigger>
                <SelectContent>
                  {MOTIVOS_NAO_ENVIO.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => confirmarEnvio(false)}
              disabled={salvando || !motivoNaoEnvio}
              className="text-red-600 border-red-200"
            >
              <XCircle className="mr-1 h-4 w-4" /> Não enviei
            </Button>
            <Button
              onClick={() => confirmarEnvio(true)}
              disabled={salvando}
              className="bg-green-600 hover:bg-green-700"
            >
              {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
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
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold ${cor}`}>{value}</p>
    </div>
  );
}
