import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Play, Pause, Square, RefreshCw, Loader2, Send, Eye, MessageSquare, Inbox, FileText, Users, AlertTriangle, Trash2, CheckCircle2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plantao, PlantaoCopy, DisparoFila, DisparoResposta, statusLabel, classifLabel } from "@/types/plantao";

export default function PlantaoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [plantao, setPlantao] = useState<Plantao | null>(null);
  const [copies, setCopies] = useState<PlantaoCopy[]>([]);
  const [filaSample, setFilaSample] = useState<DisparoFila[]>([]);
  const [filaTotal, setFilaTotal] = useState(0);
  const [filaPage, setFilaPage] = useState(0);
  const [filaStatus, setFilaStatus] = useState<string>("todos");
  const [filaSearch, setFilaSearch] = useState("");
  const PAGE_SIZE = 50;
  const [respostas, setRespostas] = useState<DisparoResposta[]>([]);
  const [filaCount, setFilaCount] = useState({ aguardando: 0, enviado: 0, falhou: 0 });

  const load = useCallback(async () => {
    if (!id) return;
    try {
      // Constrói query da fila paginada com filtros
      let filaQuery = (supabase as any)
        .from("disparo_fila")
        .select("*", { count: "exact" })
        .eq("plantao_id", id);
      if (filaStatus !== "todos") filaQuery = filaQuery.eq("status", filaStatus);
      const s = filaSearch.trim();
      if (s) {
        // Escapa vírgula que quebra .or() do PostgREST
        const safe = s.replace(/,/g, "");
        filaQuery = filaQuery.or(`nome.ilike.%${safe}%,telefone.ilike.%${safe}%,telefone_norm.ilike.%${safe}%`);
      }
      filaQuery = filaQuery
        .order("updated_at", { ascending: false })
        .range(filaPage * PAGE_SIZE, filaPage * PAGE_SIZE + PAGE_SIZE - 1);

      const [p, c, fc, fs, r] = await Promise.all([
        (supabase as any).from("disparo_plantoes").select("*").eq("id", id).single(),
        (supabase as any).from("disparo_copies").select("*").eq("plantao_id", id).order("ordem"),
        (supabase as any).from("disparo_fila").select("status").eq("plantao_id", id),
        filaQuery,
        (supabase as any).from("disparo_respostas").select("*").eq("plantao_id", id).order("recebido_em", { ascending: false }).limit(50),
      ]);
      if (p?.data) setPlantao(p.data as Plantao);
      setCopies((c?.data || []) as PlantaoCopy[]);
      setFilaSample((fs?.data || []) as DisparoFila[]);
      setFilaTotal(fs?.count || 0);
      setRespostas((r?.data || []) as DisparoResposta[]);
      const cnt = { aguardando: 0, enviado: 0, falhou: 0 } as any;
      (fc?.data || []).forEach((row: any) => { cnt[row.status] = (cnt[row.status] || 0) + 1; });
      setFilaCount(cnt);
    } catch (e: any) {
      console.error("[plantao] erro ao carregar:", e);
      toast({ title: "Erro ao carregar plantão", description: e?.message || "Erro desconhecido", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [id, filaPage, filaStatus, filaSearch]);

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

        <Tabs defaultValue="inbox" className="space-y-4">
          <TabsList>
            <TabsTrigger value="inbox"><Inbox className="mr-1 h-4 w-4" /> Inbox respostas ({respostas.length})</TabsTrigger>
            <TabsTrigger value="handoff"><Users className="mr-1 h-4 w-4" /> Handoff</TabsTrigger>
            <TabsTrigger value="copies"><FileText className="mr-1 h-4 w-4" /> Copies ({copies.length})</TabsTrigger>
            <TabsTrigger value="fila"><MessageSquare className="mr-1 h-4 w-4" /> Fila ({filaSample.length})</TabsTrigger>
            <TabsTrigger value="config"><Eye className="mr-1 h-4 w-4" /> Config</TabsTrigger>
          </TabsList>

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
            <FilaView
              fila={filaSample}
              filaCount={filaCount}
              total={filaTotal}
              page={filaPage}
              pageSize={PAGE_SIZE}
              onPageChange={setFilaPage}
              statusFilter={filaStatus}
              onStatusChange={(s) => { setFilaStatus(s); setFilaPage(0); }}
              search={filaSearch}
              onSearchChange={(s) => { setFilaSearch(s); setFilaPage(0); }}
            />
          </TabsContent>

          <TabsContent value="config">
            <ConfigView plantao={plantao} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
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

function FilaView({
  fila, filaCount, total, page, pageSize, onPageChange,
  statusFilter, onStatusChange, search, onSearchChange,
}: {
  fila: DisparoFila[]; filaCount: any; total: number; page: number; pageSize: number;
  onPageChange: (p: number) => void;
  statusFilter: string; onStatusChange: (s: string) => void;
  search: string; onSearchChange: (s: string) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);

  const STATUS_OPCOES = [
    { v: "todos", label: `Todos (${filaCount.aguardando + filaCount.enviado + filaCount.falhou})` },
    { v: "aguardando", label: `Aguardando (${filaCount.aguardando})` },
    { v: "enviado", label: `Enviado (${filaCount.enviado})` },
    { v: "falhou", label: `Falhou (${filaCount.falhou})` },
  ];

  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle className="text-sm flex gap-4 flex-wrap">
          <span>Aguardando: {filaCount.aguardando}</span>
          <span className="text-blue-600">Enviado: {filaCount.enviado}</span>
          <span className="text-red-600">Falhou: {filaCount.falhou}</span>
        </CardTitle>
        <div className="flex gap-2 flex-wrap items-center">
          <div className="flex gap-1">
            {STATUS_OPCOES.map(o => (
              <Button
                key={o.v}
                size="sm"
                variant={statusFilter === o.v ? "default" : "outline"}
                onClick={() => onStatusChange(o.v)}
              >
                {o.label}
              </Button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Buscar nome ou telefone..."
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm flex-1 min-w-[200px] bg-background"
          />
        </div>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground uppercase">
            <tr>
              <th className="text-left p-2">Nome</th>
              <th className="text-left p-2">Telefone</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Enviado em</th>
              <th className="text-left p-2">Tentativas</th>
            </tr>
          </thead>
          <tbody>
            {fila.length === 0 ? (
              <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">Nenhum lead encontrado</td></tr>
            ) : fila.map(f => (
              <tr key={f.id} className="border-t border-border">
                <td className="p-2">{f.nome || <span className="text-muted-foreground italic">(sem nome)</span>}</td>
                <td className="p-2 font-mono text-xs">{f.telefone}</td>
                <td className="p-2">
                  <Badge
                    variant="outline"
                    className={
                      f.status === "enviado" ? "bg-blue-50 text-blue-700 border-blue-200" :
                      f.status === "falhou" ? "bg-red-50 text-red-700 border-red-200" :
                      f.status === "optout_pre" ? "bg-slate-100 text-slate-600" : ""
                    }
                  >
                    {f.status}
                  </Badge>
                </td>
                <td className="p-2 text-xs">{f.enviado_em ? new Date(f.enviado_em).toLocaleString("pt-BR") : "--"}</td>
                <td className="p-2 text-xs">{f.tentativas}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
          <span>Mostrando {from} a {to} de {total}</span>
          <div className="flex gap-1 items-center">
            <Button size="sm" variant="outline" onClick={() => onPageChange(0)} disabled={page === 0}>«</Button>
            <Button size="sm" variant="outline" onClick={() => onPageChange(Math.max(0, page - 1))} disabled={page === 0}>‹</Button>
            <span className="px-3">Página {page + 1} de {totalPages}</span>
            <Button size="sm" variant="outline" onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}>›</Button>
            <Button size="sm" variant="outline" onClick={() => onPageChange(totalPages - 1)} disabled={page >= totalPages - 1}>»</Button>
          </div>
        </div>
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
