import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Play, Pause, Square, RefreshCw, Loader2, Send, Eye, MessageSquare, Inbox, FileText, Users, AlertTriangle, Trash2, CheckCircle2, Image as ImageIcon, XCircle, Clock, Plus } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plantao, PlantaoCopy, DisparoFila, DisparoResposta, statusLabel, classifLabel } from "@/types/plantao";
import { normalizarTelefone } from "@/lib/phoneNormalization";
import { checarOptoutGlobal, checarJaDistribuidos } from "@/lib/plantao";
import { useCampanhas } from "@/contexts/CampanhasContext";

export default function PlantaoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [plantao, setPlantao] = useState<Plantao | null>(null);
  const [copies, setCopies] = useState<PlantaoCopy[]>([]);
  const [filaSample, setFilaSample] = useState<DisparoFila[]>([]);
  const [respostas, setRespostas] = useState<DisparoResposta[]>([]);
  const [filaCount, setFilaCount] = useState({ aguardando: 0, enviado: 0, falhou: 0 });
  const [addLeadsOpen, setAddLeadsOpen] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const [p, c, fc, fs, r] = await Promise.all([
      (supabase as any).from("disparo_plantoes").select("*").eq("id", id).single(),
      (supabase as any).from("disparo_copies").select("*").eq("plantao_id", id).order("ordem"),
      (supabase as any).from("disparo_fila").select("status").eq("plantao_id", id),
      (supabase as any).from("disparo_fila").select("*").eq("plantao_id", id).order("updated_at", { ascending: false }).limit(30),
      (supabase as any).from("disparo_respostas").select("*").eq("plantao_id", id).order("recebido_em", { ascending: false }).limit(50),
    ]);
    if (p.data) setPlantao(p.data as Plantao);
    setCopies((c.data || []) as PlantaoCopy[]);
    setFilaSample((fs.data || []) as DisparoFila[]);
    setRespostas((r.data || []) as DisparoResposta[]);
    const cnt = { aguardando: 0, enviado: 0, falhou: 0 } as any;
    (fc.data || []).forEach((row: any) => { cnt[row.status] = (cnt[row.status] || 0) + 1; });
    setFilaCount(cnt);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, [load]);

  const mudarStatus = async (novo: Plantao["status"]) => {
    if (!plantao) return;
    const upd: any = { status: novo };
    if (novo === "ativo" && !plantao.iniciado_em) upd.iniciado_em = new Date().toISOString();
    if (novo === "pausado") upd.pausado_em = new Date().toISOString();
    if (novo === "concluido") upd.concluido_em = new Date().toISOString();
    const { error } = await (supabase as any).from("disparo_plantoes").update(upd).eq("id", plantao.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Plantão ${novo}` });
      load();
    }
  };

  const recalcStats = async () => {
    if (!plantao) return;
    await (supabase as any).rpc("recalc_plantao_stats", { _plantao_id: plantao.id });
    load();
    toast({ title: "Stats recalculados" });
  };

  if (loading || !plantao) {
    return <Layout><div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></Layout>;
  }

  const sl = statusLabel(plantao.status);
  const progresso = plantao.total_leads > 0 ? Math.round((plantao.total_enviados / plantao.total_leads) * 100) : 0;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/plantao")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{plantao.nome}</h1>
                <Badge className={sl.color}>{sl.label}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{plantao.descricao}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setAddLeadsOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Adicionar leads
            </Button>
            <Button variant="outline" size="sm" onClick={recalcStats}>
              <RefreshCw className="mr-1 h-4 w-4" /> Recalcular
            </Button>
            {(plantao.status === "rascunho" || plantao.status === "aprovado" || plantao.status === "pausado") && (
              <Button onClick={() => mudarStatus("ativo")} className="bg-green-600 hover:bg-green-700">
                <Play className="mr-1 h-4 w-4" /> Iniciar disparo
              </Button>
            )}
            {plantao.status === "ativo" && (
              <Button variant="outline" onClick={() => mudarStatus("pausado")}>
                <Pause className="mr-1 h-4 w-4" /> Pausar
              </Button>
            )}
            {(plantao.status === "ativo" || plantao.status === "pausado") && (
              <Button variant="outline" onClick={() => mudarStatus("concluido")}>
                <Square className="mr-1 h-4 w-4" /> Encerrar
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <Kpi label="Leads" value={plantao.total_leads} />
          <Kpi label="Enviados" value={plantao.total_enviados} color="text-blue-600" />
          <Kpi label="Entregues" value={plantao.total_entregues} color="text-emerald-600" />
          <Kpi label="Lidos" value={plantao.total_lidos} color="text-indigo-600" />
          <Kpi label="Respostas" value={plantao.total_respostas} color="text-purple-600" />
          <Kpi label="Opt-out" value={plantao.total_optout} color={plantao.total_enviados > 0 && plantao.total_optout / plantao.total_enviados > 0.05 ? "text-red-600" : ""} />
        </div>

        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progresso geral</span>
              <span>{plantao.total_enviados} / {plantao.total_leads} ({progresso}%)</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${progresso}%` }} />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground pt-1">
              <span>Aguardando: {filaCount.aguardando}</span>
              <span>Falhou: {filaCount.falhou}</span>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue={plantao.modo === "manual" ? "abordagens" : "inbox"} className="space-y-4">
          <TabsList>
            {plantao.modo === "manual" && (
              <TabsTrigger value="abordagens"><ImageIcon className="mr-1 h-4 w-4" /> Abordagens</TabsTrigger>
            )}
            <TabsTrigger value="inbox"><Inbox className="mr-1 h-4 w-4" /> Inbox respostas ({respostas.length})</TabsTrigger>
            <TabsTrigger value="handoff"><Users className="mr-1 h-4 w-4" /> Handoff</TabsTrigger>
            <TabsTrigger value="copies"><FileText className="mr-1 h-4 w-4" /> Copies ({copies.length})</TabsTrigger>
            <TabsTrigger value="fila"><MessageSquare className="mr-1 h-4 w-4" /> Fila ({filaSample.length})</TabsTrigger>
            <TabsTrigger value="config"><Eye className="mr-1 h-4 w-4" /> Config</TabsTrigger>
          </TabsList>

          {plantao.modo === "manual" && (
            <TabsContent value="abordagens">
              <AbordagensView plantaoId={plantao.id} />
            </TabsContent>
          )}

          <TabsContent value="inbox">
            <InboxRespostas respostas={respostas} onReload={load} />
          </TabsContent>

          <TabsContent value="handoff">
            <HandoffFila respostas={respostas.filter(r => r.classificacao === "interessado")} onReload={load} />
          </TabsContent>

          <TabsContent value="copies">
            <CopiesView copies={copies} />
          </TabsContent>

          <TabsContent value="fila">
            <FilaView fila={filaSample} filaCount={filaCount} />
          </TabsContent>

          <TabsContent value="config">
            <ConfigView plantao={plantao} />
          </TabsContent>
        </Tabs>
      </div>

      <AdicionarLeadsDialog
        open={addLeadsOpen}
        onOpenChange={setAddLeadsOpen}
        plantaoId={plantao.id}
        onAdded={() => { setAddLeadsOpen(false); load(); }}
      />
    </Layout>
  );
}

function AdicionarLeadsDialog({
  open,
  onOpenChange,
  plantaoId,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  plantaoId: string;
  onAdded: () => void;
}) {
  type CorretorRow = { id: string; name: string; lote: number };
  const { campanhas } = useCampanhas();
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [campanhaNomeDetectada, setCampanhaNomeDetectada] = useState<string>("");
  const [campanhaId, setCampanhaId] = useState<string>("");
  const [origemDetectada, setOrigemDetectada] = useState<string>("");
  const [jaNaFila, setJaNaFila] = useState<Set<string>>(new Set());
  const [leadsDisponiveis, setLeadsDisponiveis] = useState<{ nome: string; telefone_raw: string; telefone_norm: string; email: string | null }[]>([]);
  const [corretores, setCorretores] = useState<CorretorRow[]>([]);
  const [loteDefault, setLoteDefault] = useState(20);

  const buscarLeadsDaCampanha = useCallback(async (campId: string, jaFila: Set<string>) => {
    if (!campId) { setLeadsDisponiveis([]); return; }
    const pageSize = 1000;
    let from = 0;
    const all: any[] = [];
    // Alinhado com Campanhas.tsx > getCampanhaStats: "disponível" = pendente + 0 tentativas.
    // status filtrado no servidor; tentativas_contato (que pode ser null) filtrado no client.
    while (true) {
      const { data, error } = await (supabase as any)
        .from("leads")
        .select("id, nome, telefone, email, tentativas_contato")
        .eq("campanha_id", campId)
        .eq("status", "pendente")
        .range(from, from + pageSize - 1);
      if (error || !data || data.length === 0) break;
      for (const row of data) {
        if ((row.tentativas_contato || 0) === 0) all.push(row);
      }
      if (data.length < pageSize) break;
      from += pageSize;
    }

    const vistos = new Set<string>();
    const validos: { nome: string; telefone_raw: string; telefone_norm: string; email: string | null }[] = [];
    for (const l of all) {
      let norm: string | null = null;
      try {
        const r = normalizarTelefone(l.telefone);
        if (r.validacao === "ok") norm = r.e164.replace(/\D/g, "");
      } catch { /* ignore */ }
      if (!norm || norm.length < 12 || norm.length > 13) continue;
      if (jaFila.has(norm) || vistos.has(norm)) continue;
      vistos.add(norm);
      validos.push({
        nome: (l.nome || "").split(" ").slice(0, 3).join(" "),
        telefone_raw: l.telefone,
        telefone_norm: norm,
        email: l.email || null,
      });
    }

    if (validos.length > 0) {
      const nums = validos.map((v) => v.telefone_norm);
      const [opt, distribuidos] = await Promise.all([
        checarOptoutGlobal(nums),
        checarJaDistribuidos(nums),
      ]);
      setLeadsDisponiveis(
        validos.filter((v) => !opt.has(v.telefone_norm) && !distribuidos.has(v.telefone_norm)),
      );
    } else {
      setLeadsDisponiveis([]);
    }
  }, []);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      // 1) Pega rows da fila pra extrair origem + corretores envolvidos
      const { data: filaRows } = await (supabase as any)
        .from("disparo_fila")
        .select("origem, telefone_norm, corretor_id")
        .eq("plantao_id", plantaoId);

      const origem = (filaRows || []).find((r: any) => r?.origem)?.origem || "";
      setOrigemDetectada(origem);
      const nomeCamp = origem.startsWith("ofertativa:") ? origem.slice("ofertativa:".length).trim() : "";

      // Telefones já na fila do plantão
      const jaFila = new Set<string>((filaRows || []).map((r: any) => r.telefone_norm).filter(Boolean));
      setJaNaFila(jaFila);

      // 2) Tenta resolver campanha pelo nome (válido se != "undefined" e existir no contexto)
      let campId = "";
      let nomeOk = "";
      if (nomeCamp && nomeCamp.toLowerCase() !== "undefined") {
        const hit = campanhas.find((c) => c.nome === nomeCamp);
        if (hit) { campId = hit.id; nomeOk = hit.nome; }
      }
      setCampanhaId(campId);
      setCampanhaNomeDetectada(nomeOk);

      // 3) Corretores envolvidos no plantão (atribuídos)
      const corretorIds = Array.from(new Set((filaRows || []).map((r: any) => r.corretor_id).filter(Boolean)));
      const { data: profs } = corretorIds.length > 0
        ? await (supabase as any).from("profiles").select("id, name").in("id", corretorIds)
        : { data: [] };
      setCorretores((profs || []).map((p: any) => ({ id: p.id, name: p.name, lote: 20 })));

      // 4) Se já tem campanha resolvida, busca leads disponíveis
      if (campId) {
        await buscarLeadsDaCampanha(campId, jaFila);
      } else {
        setLeadsDisponiveis([]);
      }
    } finally {
      setLoading(false);
    }
  }, [plantaoId, campanhas, buscarLeadsDaCampanha]);

  const trocarCampanhaManual = async (novoId: string) => {
    setCampanhaId(novoId);
    setLoading(true);
    try {
      await buscarLeadsDaCampanha(novoId, jaNaFila);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) carregar();
  }, [open, carregar]);

  const totalAlocado = corretores.reduce((acc, c) => acc + c.lote, 0);
  const limiteReal = Math.min(totalAlocado, leadsDisponiveis.length);

  const submit = async () => {
    if (corretores.length === 0) {
      toast({ title: "Sem corretores", description: "Esse plantão ainda não tem corretores atribuídos.", variant: "destructive" });
      return;
    }
    setSalvando(true);
    try {
      // Distribuição sequencial respeitando lote por corretor
      let offset = 0;
      const rows: any[] = [];
      for (const c of corretores) {
        const chunk = leadsDisponiveis.slice(offset, offset + c.lote);
        chunk.forEach((l) => rows.push({
          plantao_id: plantaoId,
          nome: l.nome,
          telefone: l.telefone_raw,
          telefone_norm: l.telefone_norm,
          email: l.email,
          origem: (campanhas.find((cc) => cc.id === campanhaId)?.nome) ? `ofertativa:${campanhas.find((cc) => cc.id === campanhaId)!.nome}` : null,
          status: "aguardando" as const,
          corretor_id: c.id,
          abordagem_status: "pendente",
        }));
        offset += c.lote;
        if (offset >= leadsDisponiveis.length) break;
      }

      if (rows.length === 0) {
        toast({ title: "Nada a adicionar", description: "Sem leads disponíveis pra esses corretores." });
        setSalvando(false);
        return;
      }

      const batchSize = 200;
      for (let i = 0; i < rows.length; i += batchSize) {
        const { error } = await (supabase as any).from("disparo_fila").insert(rows.slice(i, i + batchSize));
        if (error) throw error;
      }

      // Recalcula stats (total_leads, etc) via RPC
      await (supabase as any).rpc("recalc_plantao_stats", { _plantao_id: plantaoId });

      toast({ title: `${rows.length} leads adicionados` });
      onAdded();
    } catch (e: any) {
      toast({ title: "Erro ao adicionar", description: e.message, variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Adicionar leads ao plantão</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm bg-muted/40 rounded p-3 space-y-2">
              {campanhaNomeDetectada ? (
                <div><span className="text-muted-foreground">Campanha origem:</span> <strong>{campanhaNomeDetectada}</strong></div>
              ) : (
                <div className="space-y-2">
                  <div className="text-amber-700 text-xs">
                    {origemDetectada
                      ? `Origem da fila atual está como "${origemDetectada}" (sem campanha vinculada). Escolha manualmente abaixo.`
                      : "Não detectei a campanha origem na fila. Escolha manualmente abaixo."}
                  </div>
                  <Label className="text-xs">Escolher campanha</Label>
                  <select
                    className="w-full border rounded px-3 py-2 text-sm bg-background"
                    value={campanhaId}
                    onChange={(e) => trocarCampanhaManual(e.target.value)}
                  >
                    <option value="">Selecione uma campanha</option>
                    {campanhas.map((c) => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>
              )}
              <div><span className="text-muted-foreground">Leads disponíveis (novos):</span> <strong>{leadsDisponiveis.length}</strong></div>
            </div>

            {corretores.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-900">
                Nenhum corretor encontrado na fila atual desse plantão.
              </div>
            ) : (
              <>
                <div className="flex items-end gap-2 bg-white border rounded p-2">
                  <div className="flex-1">
                    <Label className="text-xs">Lote padrão por corretor</Label>
                    <Input
                      type="number"
                      min={1}
                      value={loteDefault}
                      onChange={(e) => setLoteDefault(Math.max(1, parseInt(e.target.value) || 1))}
                      className="h-9"
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setCorretores(corretores.map((c) => ({ ...c, lote: loteDefault })))}
                  >
                    Aplicar a todos
                  </Button>
                </div>

                <div className="border rounded divide-y max-h-64 overflow-y-auto">
                  {corretores.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 p-2">
                      <span className="flex-1 text-sm">{c.name}</span>
                      <Input
                        type="number"
                        min={0}
                        value={c.lote}
                        onChange={(e) => {
                          const v = Math.max(0, parseInt(e.target.value) || 0);
                          setCorretores(corretores.map((x) => x.id === c.id ? { ...x, lote: v } : x));
                        }}
                        className="h-8 w-20 text-sm"
                      />
                      <span className="text-xs text-muted-foreground">leads</span>
                    </div>
                  ))}
                </div>

                <div className="text-sm rounded p-2 border bg-blue-50 border-blue-200 text-blue-900">
                  Total a adicionar: <strong>{limiteReal}</strong> de {totalAlocado} pedidos ({leadsDisponiveis.length} disponíveis na campanha).
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>Cancelar</Button>
          <Button onClick={submit} disabled={salvando || loading || limiteReal === 0}>
            {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Adicionar {limiteReal} leads
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Kpi({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <Card>
      <CardContent className="p-3 text-center">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className={`text-2xl font-bold ${color || ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function InboxRespostas({ respostas, onReload }: { respostas: DisparoResposta[]; onReload: () => void }) {
  const reclassificar = async (id: string, c: DisparoResposta["classificacao"]) => {
    await (supabase as any).from("disparo_respostas").update({ classificacao: c, classificacao_manual: true }).eq("id", id);
    onReload();
  };

  if (respostas.length === 0) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma resposta ainda. Quando alguém responder, aparece aqui classificado pela IA.</CardContent></Card>;
  }

  return (
    <div className="space-y-2">
      {respostas.map(r => {
        const cl = classifLabel(r.classificacao);
        return (
          <Card key={r.id} className="border-l-4" style={{ borderLeftColor: r.classificacao === "interessado" ? "#16a34a" : r.classificacao === "frio" ? "#d97706" : r.classificacao === "optout" ? "#64748b" : "#2563eb" }}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="font-bold">{r.nome || r.telefone}</span>
                  <span className="text-xs text-muted-foreground">{r.telefone}</span>
                  <Badge className={cl.color} variant="outline">{cl.icon} {cl.label}</Badge>
                  {r.classificacao_manual && <Badge variant="outline">manual</Badge>}
                </div>
                <span className="text-xs text-muted-foreground">{new Date(r.recebido_em).toLocaleString("pt-BR")}</span>
              </div>
              <p className="text-sm bg-muted/40 p-2 rounded italic">"{r.mensagem}"</p>
              {r.classificacao_motivo && <p className="text-xs text-muted-foreground">IA: {r.classificacao_motivo}</p>}
              <div className="flex gap-1 pt-1">
                <Button size="sm" variant="outline" onClick={() => reclassificar(r.id, "interessado")}>🔥 Interessado</Button>
                <Button size="sm" variant="outline" onClick={() => reclassificar(r.id, "frio")}>🤔 Frio</Button>
                <Button size="sm" variant="outline" onClick={() => reclassificar(r.id, "optout")}>⛔ Opt-out</Button>
                <Button size="sm" variant="outline" onClick={() => reclassificar(r.id, "outro")}>💬 Outro</Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function HandoffFila({ respostas, onReload }: { respostas: DisparoResposta[]; onReload: () => void }) {
  const aguardando = respostas.filter(r => r.handoff_status === "aguardando" || (r.travado_ate && new Date(r.travado_ate) < new Date()));
  const emAtendimento = respostas.filter(r => r.handoff_status === "em_atendimento" && r.travado_ate && new Date(r.travado_ate) >= new Date());
  const concluidos = respostas.filter(r => r.handoff_status === "concluido");

  const concluir = async (id: string) => {
    await (supabase as any).from("disparo_respostas").update({ handoff_status: "concluido" }).eq("id", id);
    onReload();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <HandoffColuna titulo="Aguardando pegar" cor="bg-amber-50 border-amber-200" itens={aguardando} action={(r) => (
        <Button size="sm" onClick={async () => {
          await (supabase as any).rpc("handoff_pegar", { _resposta_id: r.id, _corretor_id: null, _lock_min: 5 });
          onReload();
        }}>Pegar</Button>
      )} />
      <HandoffColuna titulo="Em atendimento" cor="bg-blue-50 border-blue-200" itens={emAtendimento} action={(r) => (
        <Button size="sm" variant="outline" onClick={() => concluir(r.id)}><CheckCircle2 className="mr-1 h-3 w-3" />Concluir</Button>
      )} />
      <HandoffColuna titulo="Concluídos" cor="bg-green-50 border-green-200" itens={concluidos} action={() => null} />
    </div>
  );
}

function HandoffColuna({ titulo, cor, itens, action }: { titulo: string; cor: string; itens: DisparoResposta[]; action: (r: DisparoResposta) => React.ReactNode }) {
  return (
    <Card className={cor}>
      <CardHeader><CardTitle className="text-sm">{titulo} <Badge variant="outline">{itens.length}</Badge></CardTitle></CardHeader>
      <CardContent className="space-y-2 max-h-[600px] overflow-auto">
        {itens.length === 0 ? <p className="text-xs text-muted-foreground">Vazio</p> : itens.map(r => (
          <div key={r.id} className="bg-white border rounded p-2 space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm">{r.nome || r.telefone}</span>
            </div>
            <p className="text-xs text-muted-foreground">{r.telefone}</p>
            <p className="text-xs italic line-clamp-2">"{r.mensagem}"</p>
            {action(r)}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function CopiesView({ copies }: { copies: PlantaoCopy[] }) {
  return (
    <div className="space-y-2">
      {copies.map(c => (
        <Card key={c.id}>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Copy {c.ordem}</Badge>
                {c.ativa ? <Badge className="bg-green-100 text-green-700">Ativa</Badge> : <Badge className="bg-muted">Inativa</Badge>}
              </div>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>Usada {c.vezes_usada}x</span>
                {c.taxa_resposta !== null && <span>Resp {c.taxa_resposta}%</span>}
                {c.taxa_optout !== null && <span>Opt-out {c.taxa_optout}%</span>}
              </div>
            </div>
            <pre className="text-xs bg-muted/40 p-2 rounded whitespace-pre-wrap font-sans">{c.texto}</pre>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function FilaView({ fila, filaCount }: { fila: DisparoFila[]; filaCount: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex gap-4">
          <span>Aguardando: {filaCount.aguardando}</span>
          <span>Enviado: {filaCount.enviado}</span>
          <span className="text-red-600">Falhou: {filaCount.falhou}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground uppercase">
            <tr><th className="text-left p-2">Nome</th><th className="text-left p-2">Telefone</th><th className="text-left p-2">Status</th><th className="text-left p-2">Enviado em</th></tr>
          </thead>
          <tbody>
            {fila.map(f => (
              <tr key={f.id} className="border-t border-border">
                <td className="p-2">{f.nome}</td>
                <td className="p-2 font-mono text-xs">{f.telefone}</td>
                <td className="p-2"><Badge variant="outline">{f.status}</Badge></td>
                <td className="p-2 text-xs">{f.enviado_em ? new Date(f.enviado_em).toLocaleString("pt-BR") : "--"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-muted-foreground mt-2">Mostrando últimas 30 atualizações</p>
      </CardContent>
    </Card>
  );
}

function ConfigView({ plantao }: { plantao: Plantao }) {
  return (
    <Card>
      <CardContent className="p-4 space-y-3 text-sm">
        <Row label="Chip Evolution" value={plantao.chip_instance} />
        <Row label="Ritmo" value={`${plantao.ritmo_min_seg}s a ${plantao.ritmo_max_seg}s`} />
        <Row label="Volume máx/dia" value={String(plantao.volume_max_dia)} />
        <Row label="Modo handoff" value={plantao.modo_handoff} />
        <Row label="Pilares" value={(plantao.pilares || []).join(" | ")} />
        <Row label="E-flyer" value={plantao.eflyer_url || "(nenhum)"} />
        <Row label="Vídeo" value={plantao.video_url || "(nenhum)"} />
        <Row label="Criado em" value={new Date(plantao.created_at).toLocaleString("pt-BR")} />
        <Row label="Iniciado em" value={plantao.iniciado_em ? new Date(plantao.iniciado_em).toLocaleString("pt-BR") : "--"} />
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 border-b border-border pb-2">
      <span className="w-40 text-muted-foreground">{label}</span>
      <span className="font-mono text-xs flex-1 break-all">{value}</span>
    </div>
  );
}

function AbordagensView({ plantaoId }: { plantaoId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("disparo_fila")
      .select("*, profiles!disparo_fila_corretor_id_fkey(name)")
      .eq("plantao_id", plantaoId)
      .not("corretor_id", "is", null)
      .order("updated_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  }, [plantaoId]);

  useEffect(() => { load(); const i = setInterval(load, 15000); return () => clearInterval(i); }, [load]);

  if (loading) return <Card><CardContent className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></CardContent></Card>;

  const enviadas = items.filter((i) => i.abordagem_status === "enviou").length;
  const naoEnviadas = items.filter((i) => i.abordagem_status === "nao_enviou").length;
  const aguardando = items.filter((i) => i.abordagem_status === "abriu_wa").length;
  const pendentes = items.filter((i) => !i.abordagem_status || i.abordagem_status === "pendente").length;
  const taxa = items.length > 0 ? Math.round((enviadas / items.length) * 100) : 0;

  // Produção por corretor envolvido no plantão
  const porCorretor = items.reduce((acc, i) => {
    const id = i.corretor_id || "sem";
    const nome = i.profiles?.name || "Sem corretor";
    if (!acc[id]) acc[id] = { nome, atribuidos: 0, pendentes: 0, aguardando: 0, enviadas: 0, naoEnviadas: 0 };
    acc[id].atribuidos++;
    if (i.abordagem_status === "enviou") acc[id].enviadas++;
    else if (i.abordagem_status === "nao_enviou") acc[id].naoEnviadas++;
    else if (i.abordagem_status === "abriu_wa") acc[id].aguardando++;
    else acc[id].pendentes++;
    return acc;
  }, {} as Record<string, { nome: string; atribuidos: number; pendentes: number; aguardando: number; enviadas: number; naoEnviadas: number }>);
  const ranking = Object.values(porCorretor).sort((a, b) => b.enviadas - a.enviadas || b.atribuidos - a.atribuidos);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi label="Atribuídos" value={items.length} />
        <Kpi label="Pendentes" value={pendentes} color="text-amber-600" />
        <Kpi label="Aguardando" value={aguardando} color="text-blue-600" />
        <Kpi label="Enviadas" value={enviadas} color="text-green-600" />
        <Kpi label="Taxa envio" value={taxa as any} color="text-primary" />
      </div>

      {ranking.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" /> Produção por corretor
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/40">
                <tr>
                  <th className="text-left p-3">Corretor</th>
                  <th className="text-right p-3">Atrib.</th>
                  <th className="text-right p-3">Pendentes</th>
                  <th className="text-right p-3">Aguardando</th>
                  <th className="text-right p-3">Enviadas</th>
                  <th className="text-right p-3">Não enviou</th>
                  <th className="text-right p-3">Taxa</th>
                  <th className="p-3 w-32">Progresso</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((c, idx) => {
                  const taxaC = c.atribuidos > 0 ? Math.round((c.enviadas / c.atribuidos) * 100) : 0;
                  return (
                    <tr key={c.nome + idx} className="border-t border-border">
                      <td className="p-3 font-medium">{c.nome}</td>
                      <td className="p-3 text-right font-mono">{c.atribuidos}</td>
                      <td className="p-3 text-right font-mono text-amber-600">{c.pendentes}</td>
                      <td className="p-3 text-right font-mono text-blue-600">{c.aguardando}</td>
                      <td className="p-3 text-right font-mono text-green-600 font-bold">{c.enviadas}</td>
                      <td className="p-3 text-right font-mono text-red-600">{c.naoEnviadas}</td>
                      <td className="p-3 text-right font-mono font-bold">{taxaC}%</td>
                      <td className="p-3">
                        <div className="h-2 bg-muted rounded overflow-hidden">
                          <div className="h-full bg-green-600" style={{ width: `${taxaC}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/40">
              <tr>
                <th className="text-left p-3">Cliente</th>
                <th className="text-left p-3">Corretor</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Quando</th>
                <th className="text-left p-3">Motivo</th>
                <th className="text-left p-3">Print</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum lead atribuído ainda</td></tr>
              ) : items.map((i) => (
                <tr key={i.id} className="border-t border-border hover:bg-muted/20">
                  <td className="p-3">
                    <div className="font-semibold">{i.nome}</div>
                    <div className="text-xs text-muted-foreground font-mono">{i.telefone}</div>
                  </td>
                  <td className="p-3 text-xs">{i.profiles?.name || "--"}</td>
                  <td className="p-3"><StatusAbordagem s={i.abordagem_status} /></td>
                  <td className="p-3 text-xs">
                    {i.abordagem_confirmado_em
                      ? new Date(i.abordagem_confirmado_em).toLocaleString("pt-BR")
                      : i.abordagem_aberto_em
                      ? <span className="text-blue-600">Abriu {new Date(i.abordagem_aberto_em).toLocaleString("pt-BR")}</span>
                      : "--"}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{i.abordagem_motivo_nao_envio || "--"}</td>
                  <td className="p-3">
                    {i.print_url ? (
                      <button onClick={() => setPreview(i.print_url)} className="text-primary hover:underline text-xs flex items-center gap-1">
                        <ImageIcon className="h-3 w-3" /> Ver
                      </button>
                    ) : "--"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={!!preview} onOpenChange={(o) => { if (!o) setPreview(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Print da abordagem</DialogTitle></DialogHeader>
          {preview && <img src={preview} alt="Print abordagem" className="w-full rounded" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusAbordagem({ s }: { s: string | null }) {
  const map: Record<string, { l: string; c: string; i: any }> = {
    pendente: { l: "Pendente", c: "bg-amber-100 text-amber-700", i: Clock },
    abriu_wa: { l: "Aguardando", c: "bg-blue-100 text-blue-700", i: Clock },
    enviou: { l: "Enviada", c: "bg-green-100 text-green-700", i: CheckCircle2 },
    nao_enviou: { l: "Não enviou", c: "bg-red-100 text-red-700", i: XCircle },
    respondida: { l: "Respondida", c: "bg-purple-100 text-purple-700", i: MessageSquare },
  };
  const it = map[s || "pendente"] || map.pendente;
  const Icon = it.i;
  return <Badge className={it.c}><Icon className="mr-1 h-3 w-3" />{it.l}</Badge>;
}
