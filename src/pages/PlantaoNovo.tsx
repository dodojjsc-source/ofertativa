import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Upload, Sparkles, Check, AlertCircle, Loader2, Send, X, Plus, MessageCircle, Bot } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { parseCsvText, ParseResult, ParsedLead, checarOptoutGlobal, checarJaDistribuidos, validarCopy, COPY_OPTOUT_LINE } from "@/lib/plantao";
import { useAuth } from "@/contexts/AuthContext";
import { useCampanhas } from "@/contexts/CampanhasContext";
import { useLeads } from "@/contexts/LeadsContext";
import { useUsers } from "@/contexts/UsersContext";
import { normalizarTelefone } from "@/lib/phoneNormalization";
import { Database } from "lucide-react";
import { PlantaoModo } from "@/types/plantao";

interface CopyDraft {
  texto: string;
  ativa: boolean;
}

const STEPS = [
  { n: 1, label: "Identificação" },
  { n: 2, label: "Base de leads" },
  { n: 3, label: "Conteúdo & Copies" },
  { n: 4, label: "Disparo" },
];

type FonteLeads = "campanha" | "csv";

export default function PlantaoNovo() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { campanhas } = useCampanhas();
  const { leads: leadsOfertativa } = useLeads();
  const { users } = useUsers();
  const [step, setStep] = useState(1);
  const [salvando, setSalvando] = useState(false);

  // Step 1
  const [nome, setNome] = useState("Plantão Villa Setai - Garopaba");
  const [descricao, setDescricao] = useState("Oferta ativa Villa Setai para base Instagram Garopaba");

  // Step 2
  const [fonte, setFonte] = useState<FonteLeads>("campanha");
  const [campanhaSelecionada, setCampanhaSelecionada] = useState<string>("");
  const [csvText, setCsvText] = useState("");
  const [parseRes, setParseRes] = useState<ParseResult | null>(null);
  const [optoutCruzados, setOptoutCruzados] = useState<Set<string>>(new Set());
  const [jaDistribuidos, setJaDistribuidos] = useState<Set<string>>(new Set());
  const [leadsFinais, setLeadsFinais] = useState<ParsedLead[]>([]);

  // Plantões existentes (pra importar copies)
  const [plantoesExistentes, setPlantoesExistentes] = useState<{ id: string; nome: string; count: number }[]>([]);
  const [importandoDe, setImportandoDe] = useState<string>("");

  // Step 3
  const [eflyerUrl, setEflyerUrl] = useState("https://hub.intelbuzz.com.br/plantao-assets/villasetai-flyer.jpg");
  const [videoUrl, setVideoUrl] = useState("");
  const [pilares, setPilares] = useState<string[]>([
    "Localização premium frente mar Praia da Ferrugem em Garopaba",
    "Valorização histórica acima de 40% nas fases anteriores entregues",
    "Acabamento alto padrão com piscina infinity, lazer completo e arquitetura assinada",
  ]);
  const [copies, setCopies] = useState<CopyDraft[]>([]);
  const [gerandoCopies, setGerandoCopies] = useState(false);

  // Step 4
  const [modo, setModo] = useState<PlantaoModo>("automatico");
  const [chipInstance, setChipInstance] = useState("buzz-alertas");
  const [ritmoMin, setRitmoMin] = useState(60);
  const [ritmoMax, setRitmoMax] = useState(90);
  const [volMaxDia, setVolMaxDia] = useState(80);
  const [corretoresSelecionados, setCorretoresSelecionados] = useState<string[]>([]);
  const [corretoresFallback, setCorretoresFallback] = useState<{ id: string; name: string }[]>([]);
  const [loteDefault, setLoteDefault] = useState(20);
  const [lotesPorCorretor, setLotesPorCorretor] = useState<Record<string, number>>({});
  const [countsCampanha, setCountsCampanha] = useState<Record<string, number>>({});
  const corretoresDoContext = users
    .filter((u) => u.role === "corretor" && u.status === "ativo")
    .map((u) => ({ id: u.id, name: u.name }));
  const corretoresDisp = (corretoresDoContext.length > 0 ? corretoresDoContext : corretoresFallback)
    .sort((a, b) => a.name.localeCompare(b.name));

  useEffect(() => {
    (async () => {
      // Contagem rápida de leads por campanha via RPC agregada
      try {
        const { data: counts } = await (supabase as any).rpc("count_leads_por_campanha");
        if (counts) {
          const map: Record<string, number> = {};
          counts.forEach((c: any) => { map[c.campanha_id] = Number(c.total); });
          setCountsCampanha(map);
        }
      } catch (e) {
        console.warn("count_leads_por_campanha falhou", e);
      }

      // Fallback direto via profiles caso UsersContext esteja vazio
      try {
        const { data: profs } = await (supabase as any)
          .from("profiles")
          .select("id, name, status")
          .eq("status", "ativo")
          .order("name");
        const { data: roles } = await (supabase as any)
          .from("user_roles")
          .select("user_id, role");
        const corretorIds = new Set((roles || []).filter((r: any) => r.role === "corretor").map((r: any) => r.user_id));
        const corretores = (profs || [])
          .filter((p: any) => corretorIds.has(p.id))
          .map((p: any) => ({ id: p.id, name: p.name }));
        setCorretoresFallback(corretores);
      } catch (e) {
        console.warn("fallback corretores falhou", e);
      }

      const { data: pls } = await (supabase as any)
        .from("disparo_plantoes")
        .select("id, nome, disparo_copies(id)")
        .order("created_at", { ascending: false });
      setPlantoesExistentes(
        (pls || [])
          .map((p: any) => ({ id: p.id, nome: p.nome, count: (p.disparo_copies || []).length }))
          .filter((p: any) => p.count > 0),
      );
    })();
  }, []);

  const importarCopiesDePlantao = async (plantaoId: string) => {
    if (!plantaoId) return;
    const { data, error } = await (supabase as any)
      .from("disparo_copies")
      .select("texto, ativa")
      .eq("plantao_id", plantaoId)
      .order("ordem");
    if (error) {
      toast({ title: "Erro ao importar copies", description: error.message, variant: "destructive" });
      return;
    }
    if (!data || data.length === 0) {
      toast({ title: "Plantão sem copies", variant: "destructive" });
      return;
    }
    setCopies(data.map((c: any) => ({ texto: c.texto, ativa: c.ativa })));
    toast({ title: `${data.length} copies importadas`, description: "Pode ajustar antes de aprovar." });
    setImportandoDe("");
  };

  const podeAvancar = () => {
    if (step === 1) return nome.trim().length >= 3;
    if (step === 2) return leadsFinais.length > 0;
    if (step === 3) {
      const copiesOk = copies.filter(c => c.ativa && validarCopy(c.texto, modo).ok).length >= 3;
      if (modo === "manual") return copiesOk;
      return copiesOk && pilares.filter(p => p.trim().length > 5).length >= 2;
    }
    if (step === 4) return modo === "manual"
      ? corretoresSelecionados.length > 0
      : chipInstance.trim().length > 0;
    return false;
  };

  const processarCsv = async (texto: string) => {
    setCsvText(texto);
    const r = parseCsvText(texto);
    setParseRes(r);
    if (r.validos.length > 0) {
      const nums = r.validos.map(v => v.telefone_norm!).filter(Boolean);
      const [optout, distribuidos] = await Promise.all([
        checarOptoutGlobal(nums),
        checarJaDistribuidos(nums),
      ]);
      setOptoutCruzados(optout);
      setJaDistribuidos(distribuidos);
      setLeadsFinais(
        r.validos.filter(v => !optout.has(v.telefone_norm!) && !distribuidos.has(v.telefone_norm!)),
      );
    } else {
      setLeadsFinais([]);
    }
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => processarCsv(String(e.target?.result || ""));
    reader.readAsText(file, "utf-8");
  };

  const importarDeCampanha = async (campanhaId: string) => {
    setCampanhaSelecionada(campanhaId);
    if (!campanhaId) {
      setParseRes(null);
      setLeadsFinais([]);
      setOptoutCruzados(new Set());
      setJaDistribuidos(new Set());
      return;
    }

    // Tenta cache do contexto, senao busca direto (rápido pq filtrada por campanha)
    let leadsDaCampanha = leadsOfertativa.filter(l => l.campanhaId === campanhaId);
    if (leadsDaCampanha.length === 0 && (countsCampanha[campanhaId] || 0) > 0) {
      const pageSize = 1000;
      let all: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await (supabase as any)
          .from("leads")
          .select("id, nome, telefone, email, campanha_id")
          .eq("campanha_id", campanhaId)
          .range(from, from + pageSize - 1);
        if (error) break;
        if (!data || data.length === 0) break;
        all = all.concat(data);
        if (data.length < pageSize) break;
        from += pageSize;
      }
      const nomeCamp = campanhas.find(c => c.id === campanhaId)?.nome || "";
      leadsDaCampanha = all.map((l: any) => ({
        id: l.id, nome: l.nome, telefone: l.telefone, email: l.email, campanhaId: l.campanha_id, campanha: nomeCamp,
      })) as any;
    }
    const validos: ParsedLead[] = [];
    const descartados: ParsedLead[] = [];
    const vistos = new Set<string>();
    let duplicados = 0;
    const reInvalido = /^(0+|9+|1+)$/;

    for (const l of leadsDaCampanha) {
      let norm: string | null = null;
      try {
        const r = normalizarTelefone(l.telefone);
        if (r.validacao === "ok") norm = r.e164.replace(/\D/g, "");
      } catch { /* ignore */ }

      if (!norm || norm.length < 12 || norm.length > 13 || reInvalido.test(norm)) {
        descartados.push({ nome: l.nome, telefone_raw: l.telefone, telefone_norm: norm, email: l.email, motivo_descarte: "Telefone inválido" });
        continue;
      }
      if (vistos.has(norm)) { duplicados++; continue; }
      vistos.add(norm);
      validos.push({
        nome: l.nome.split(" ").slice(0, 3).join(" "),
        telefone_raw: l.telefone,
        telefone_norm: norm,
        email: l.email,
        origem: "ofertativa:" + l.campanha,
      });
    }

    const r: ParseResult = { total_brutos: leadsDaCampanha.length, validos, descartados, duplicados_arquivo: duplicados };
    setParseRes(r);
    if (validos.length > 0) {
      const nums = validos.map(v => v.telefone_norm!).filter(Boolean);
      const [optout, distribuidos] = await Promise.all([
        checarOptoutGlobal(nums),
        checarJaDistribuidos(nums),
      ]);
      setOptoutCruzados(optout);
      setJaDistribuidos(distribuidos);
      setLeadsFinais(
        validos.filter(v => !optout.has(v.telefone_norm!) && !distribuidos.has(v.telefone_norm!)),
      );
    } else {
      setLeadsFinais([]);
    }
  };

  const gerarCopies = async () => {
    setGerandoCopies(true);
    try {
      const ADMIN_TOKEN = "BzOferta!2026_xK9pQ";
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users/plantao-generate-copies`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-token": ADMIN_TOKEN,
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            nome_oferta: nome,
            pilares: pilares.filter(p => p.trim()),
            eflyer_url: eflyerUrl,
            quantidade: 5,
          }),
        },
      );
      const data = await resp.json();
      if (!resp.ok || data.error) throw new Error(data.error || `HTTP ${resp.status}`);
      const cps = (data?.copies || []) as string[];
      setCopies(cps.map(t => ({ texto: t, ativa: true })));
      toast({ title: "5 copies geradas", description: "Revise, edite e ative as que quiser usar" });
    } catch (e: any) {
      toast({ title: "Erro ao gerar copies", description: e.message, variant: "destructive" });
    } finally {
      setGerandoCopies(false);
    }
  };

  const salvarRascunho = async (statusFinal: "rascunho" | "aprovado") => {
    if (!user) return;
    setSalvando(true);
    try {
      const { data: plantao, error: e1 } = await (supabase as any)
        .from("disparo_plantoes")
        .insert({
          nome,
          descricao,
          status: statusFinal,
          modo,
          eflyer_url: eflyerUrl || null,
          video_url: videoUrl || null,
          pilares: pilares.filter(p => p.trim()),
          chip_instance: modo === "manual" ? "manual" : chipInstance,
          ritmo_min_seg: ritmoMin,
          ritmo_max_seg: ritmoMax,
          volume_max_dia: volMaxDia,
          total_leads: modo === "manual" && corretoresSelecionados.length > 0
            ? Math.min(
                leadsFinais.length,
                corretoresSelecionados.reduce((acc, id) => acc + (lotesPorCorretor[id] ?? loteDefault), 0),
              )
            : leadsFinais.length,
          created_by: user.id,
        })
        .select()
        .single();
      if (e1) throw e1;
      const plantaoId = plantao.id;

      // Insere copies
      const ativas = copies.filter(c => c.ativa && validarCopy(c.texto, modo).ok);
      if (ativas.length > 0) {
        const { error: e2 } = await (supabase as any).from("disparo_copies").insert(
          ativas.map((c, i) => ({
            plantao_id: plantaoId,
            ordem: i + 1,
            texto: c.texto,
            ativa: true,
            inclui_eflyer: !!eflyerUrl,
          })),
        );
        if (e2) throw e2;
      }

      // Monta atribuição lead → corretor: sequencial por lote (manual) ou null (automático)
      type LeadComCorretor = (typeof leadsFinais)[number] & { _corretorId: string | null };
      const leadsAtribuidos: LeadComCorretor[] = [];
      if (modo === "manual" && corretoresSelecionados.length > 0) {
        let offset = 0;
        for (const corretorId of corretoresSelecionados) {
          const lote = lotesPorCorretor[corretorId] ?? loteDefault;
          const chunk = leadsFinais.slice(offset, offset + lote);
          chunk.forEach((l) => leadsAtribuidos.push({ ...l, _corretorId: corretorId }));
          offset += lote;
          if (offset >= leadsFinais.length) break;
        }
      } else {
        leadsFinais.forEach((l) => leadsAtribuidos.push({ ...l, _corretorId: null }));
      }

      // Insere fila em batches de 200
      const batchSize = 200;
      for (let i = 0; i < leadsAtribuidos.length; i += batchSize) {
        const batch = leadsAtribuidos.slice(i, i + batchSize);
        const { error: e3 } = await (supabase as any).from("disparo_fila").insert(
          batch.map((l) => ({
            plantao_id: plantaoId,
            nome: l.nome,
            telefone: l.telefone_raw,
            telefone_norm: l.telefone_norm,
            email: l.email || null,
            origem: l.origem || null,
            bitrix_lead_id: l.bitrix_lead_id || null,
            status: "aguardando" as const,
            corretor_id: l._corretorId,
            abordagem_status: modo === "manual" ? "pendente" : null,
          })),
        );
        if (e3) throw e3;
      }

      toast({
        title: statusFinal === "aprovado" ? "Plantão aprovado e pronto pra disparar" : "Rascunho salvo",
        description: `${leadsAtribuidos.length} leads distribuídos, ${ativas.length} copies`,
      });
      navigate(`/plantao/${plantaoId}`);
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/plantao")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Novo Plantão</h1>
            <p className="text-sm text-muted-foreground">Wizard de criação em 4 passos</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {STEPS.map(s => (
            <div key={s.n} className="flex-1 flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                step === s.n ? "bg-primary text-primary-foreground" : step > s.n ? "bg-green-600 text-white" : "bg-muted text-muted-foreground"
              }`}>
                {step > s.n ? <Check className="h-5 w-5" /> : s.n}
              </div>
              <p className={`text-xs mt-1 ${step === s.n ? "font-bold" : "text-muted-foreground"}`}>{s.label}</p>
            </div>
          ))}
        </div>
        <Progress value={(step / 4) * 100} className="h-1" />

        {step === 1 && (
          <Card>
            <CardHeader><CardTitle>Identificação</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Modo de disparo *</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => setModo("automatico")}
                    className={`border-2 rounded-lg p-3 text-left transition ${
                      modo === "automatico" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold"><Bot className="h-4 w-4" /> Automático</div>
                    <p className="text-xs text-muted-foreground mt-1">Worker dispara via Evolution. Exige opt-out na copy e e-flyer.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModo("manual")}
                    className={`border-2 rounded-lg p-3 text-left transition ${
                      modo === "manual" ? "border-green-600 bg-green-50" : "border-border hover:border-muted-foreground/40"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold"><MessageCircle className="h-4 w-4 text-green-600" /> Manual (corretor)</div>
                    <p className="text-xs text-muted-foreground mt-1">Corretor manda do WA Web dele. Copy livre, sem opt-out obrigatório.</p>
                  </button>
                </div>
              </div>
              <div>
                <Label>Nome do plantão *</Label>
                <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Plantão VS Villa Setai - Fase B" />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={3} placeholder="Contexto: público, lançamento, condição comercial..." />
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Base de leads</CardTitle>
              <p className="text-sm text-muted-foreground">Puxa de campanha existente no Ofertativa ou sobe CSV</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 border-b border-border">
                <button
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${fonte === "campanha" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
                  onClick={() => { setFonte("campanha"); setParseRes(null); setLeadsFinais([]); }}
                >
                  <Database className="inline mr-1 h-4 w-4" />
                  Campanha Ofertativa
                </button>
                <button
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${fonte === "csv" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
                  onClick={() => { setFonte("csv"); setParseRes(null); setLeadsFinais([]); setCampanhaSelecionada(""); }}
                >
                  <Upload className="inline mr-1 h-4 w-4" />
                  CSV / Texto
                </button>
              </div>

              {fonte === "campanha" && (
                <div className="space-y-3">
                  <Label>Escolha uma campanha já existente</Label>
                  <select
                    className="w-full border rounded-md px-3 py-2 bg-background"
                    value={campanhaSelecionada}
                    onChange={e => importarDeCampanha(e.target.value)}
                  >
                    <option value="">-- Selecione uma campanha --</option>
                    {campanhas
                      .slice()
                      .sort((a, b) => (countsCampanha[b.id] || 0) - (countsCampanha[a.id] || 0))
                      .map(c => {
                        const total = countsCampanha[c.id] ?? (leadsOfertativa.filter(l => l.campanhaId === c.id).length || 0);
                        return (
                          <option key={c.id} value={c.id}>
                            {c.nome} ({total} leads)
                          </option>
                        );
                      })}
                  </select>
                  {campanhas.length === 0 && (
                    <p className="text-xs text-muted-foreground">Nenhuma campanha cadastrada no Ofertativa. Use CSV ou cadastre em /campanhas primeiro.</p>
                  )}
                </div>
              )}

              {fonte === "csv" && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="file"
                      accept=".csv,.txt"
                      onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                      className="hidden"
                      id="csv-upload"
                    />
                    <Label htmlFor="csv-upload" className="cursor-pointer">
                      <Button asChild variant="outline">
                        <span><Upload className="mr-2 h-4 w-4" />Subir CSV</span>
                      </Button>
                    </Label>
                    <span className="text-sm text-muted-foreground self-center">ou cola abaixo</span>
                  </div>
                  <Textarea
                    value={csvText}
                    onChange={e => processarCsv(e.target.value)}
                    rows={6}
                    placeholder="nome,telefone,email,origem&#10;João Silva,48999991234,joao@exemplo.com,instagram-ov"
                    className="font-mono text-xs"
                  />
                </div>
              )}

              {parseRes && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <Stat label="Brutos" value={parseRes.total_brutos} />
                  <Stat label="Válidos" value={parseRes.validos.length} good />
                  <Stat label="Descartados" value={parseRes.descartados.length + parseRes.duplicados_arquivo} warn />
                  <Stat label="Opt-out (cortados)" value={optoutCruzados.size} warn />
                  <Stat label="Já trabalhados (cortados)" value={jaDistribuidos.size} warn />
                </div>
              )}
              {leadsFinais.length > 0 && (
                <div className="border border-green-200 bg-green-50 rounded p-3">
                  <p className="text-sm font-bold text-green-800 flex items-center gap-2">
                    <Check className="h-4 w-4" /> {leadsFinais.length} leads prontos pra disparo
                  </p>
                  <p className="text-xs text-green-700 mt-1">Amostra: {leadsFinais.slice(0, 3).map(l => l.nome).join(", ")}...</p>
                </div>
              )}
              {parseRes && parseRes.descartados.length > 0 && (
                <div className="border border-amber-200 bg-amber-50 rounded p-3">
                  <p className="text-sm font-bold text-amber-800">{parseRes.descartados.length} descartados</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Motivos: {Array.from(new Set(parseRes.descartados.map(d => d.motivo_descarte))).join(", ")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <div className="space-y-4">
            {modo === "automatico" && (
            <Card>
              <CardHeader><CardTitle>Conteúdo da oferta</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>URL do e-flyer (PNG/JPG público)</Label>
                  <Input value={eflyerUrl} onChange={e => setEflyerUrl(e.target.value)} placeholder="https://..." />
                </div>
                <div>
                  <Label>URL do vídeo (opcional, ex: dos 3 pilares)</Label>
                  <Input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label>3 pilares de valorização (1 por linha)</Label>
                  {pilares.map((p, i) => (
                    <Input
                      key={i}
                      value={p}
                      onChange={e => {
                        const c = [...pilares];
                        c[i] = e.target.value;
                        setPilares(c);
                      }}
                      placeholder={`Pilar ${i + 1}`}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
                <CardTitle>Copies de disparo</CardTitle>
                <div className="flex gap-2 flex-wrap">
                  {plantoesExistentes.length > 0 && (
                    <select
                      value={importandoDe}
                      onChange={(e) => { setImportandoDe(e.target.value); importarCopiesDePlantao(e.target.value); }}
                      className="border rounded px-3 py-2 text-sm bg-background"
                    >
                      <option value="">Importar de outro plantão...</option>
                      {plantoesExistentes.map((p) => (
                        <option key={p.id} value={p.id}>{p.nome} ({p.count} copies)</option>
                      ))}
                    </select>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => {
                      const base = modo === "manual"
                        ? ""
                        : `Olá {{primeiro_nome}}, [escrever copy aqui]. ${COPY_OPTOUT_LINE}`;
                      setCopies([1,2,3,4,5].map(() => ({ texto: base, ativa: true })));
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Criar 5 campos vazios
                  </Button>
                  <Button onClick={gerarCopies} disabled={gerandoCopies || pilares.filter(p => p.trim()).length < 2}>
                    {gerandoCopies ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Gerar 5 com IA
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {copies.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground space-y-2">
                    <p className="font-semibold text-foreground">3 caminhos pra preencher:</p>
                    <p className="text-sm"><strong>1.</strong> <em>Importar de outro plantão</em> (dropdown acima) — puxa as copies de um plantão que você já criou</p>
                    <p className="text-sm"><strong>2.</strong> <em>Criar 5 campos vazios</em> e colar suas copies prontas</p>
                    <p className="text-sm"><strong>3.</strong> <em>Gerar 5 com IA</em> a partir dos pilares (modo automático)</p>
                    <p className="text-xs mt-3">Variável: <code>{"{{primeiro_nome}}"}</code></p>
                  </div>
                ) : (
                  copies.map((c, i) => {
                    const v = validarCopy(c.texto, modo);
                    return (
                      <div key={i} className={`border rounded-lg p-3 ${c.ativa ? "border-green-300 bg-green-50/40" : "border-muted bg-muted/30 opacity-60"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">Copy {i + 1}</Badge>
                            <span className="text-xs text-muted-foreground">{c.texto.length} chars</span>
                            {v.ok ? <Badge className="bg-green-100 text-green-700">OK</Badge> : <Badge className="bg-red-100 text-red-700">{v.erros.length} erro(s)</Badge>}
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => {
                              const copy = [...copies];
                              copy[i].ativa = !copy[i].ativa;
                              setCopies(copy);
                            }}>
                              {c.ativa ? "Desativar" : "Ativar"}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setCopies(copies.filter((_, j) => j !== i))}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <Textarea
                          value={c.texto}
                          onChange={e => {
                            const copy = [...copies];
                            copy[i].texto = e.target.value;
                            setCopies(copy);
                          }}
                          rows={4}
                          className="font-mono text-xs"
                        />
                        {!v.ok && (
                          <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> {v.erros.join("; ")}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
                {copies.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => setCopies([...copies, { texto: `Olá {{primeiro_nome}}, [escrever copy aqui]. ${COPY_OPTOUT_LINE}`, ativa: true }])}>
                    <Plus className="mr-1 h-3 w-3" /> Adicionar copy manual
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {step === 4 && (
          <Card>
            <CardHeader><CardTitle>Configuração de disparo</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/40 border rounded p-3 text-sm flex items-center gap-2">
                {modo === "manual" ? (
                  <><MessageCircle className="h-4 w-4 text-green-600" /> Modo <strong>Manual (corretor)</strong> selecionado no passo 1</>
                ) : (
                  <><Bot className="h-4 w-4" /> Modo <strong>Automático</strong> selecionado no passo 1</>
                )}
              </div>

              {modo === "manual" && (() => {
                const totalAlocado = corretoresSelecionados.reduce(
                  (acc, id) => acc + (lotesPorCorretor[id] ?? loteDefault),
                  0,
                );
                const sobra = Math.max(0, leadsFinais.length - totalAlocado);
                const excesso = Math.max(0, totalAlocado - leadsFinais.length);
                return (
                <div className="border border-green-200 bg-green-50/50 rounded p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Distribuir leads entre quais corretores?</Label>
                    {corretoresDisp.length > 0 && (
                      <div className="flex gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => setCorretoresSelecionados(corretoresDisp.map((c) => c.id))}>Selecionar todos</Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => { setCorretoresSelecionados([]); setLotesPorCorretor({}); }}>Limpar</Button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-end gap-2 bg-white border rounded p-2">
                    <div className="flex-1">
                      <Label className="text-xs">Tamanho padrão do lote por corretor</Label>
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
                      onClick={() => {
                        const novo: Record<string, number> = {};
                        corretoresSelecionados.forEach((id) => { novo[id] = loteDefault; });
                        setLotesPorCorretor(novo);
                      }}
                      disabled={corretoresSelecionados.length === 0}
                    >
                      Aplicar a todos
                    </Button>
                  </div>

                  {corretoresDisp.length === 0 ? (
                    <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-900">
                      Nenhum corretor ativo encontrado. Verifica em <strong>Usuários</strong> se há corretores com status ativo. Total carregado pelo sistema: <strong>{users.length}</strong> usuários no contexto.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-80 overflow-y-auto">
                      {corretoresDisp.map((c) => {
                        const selecionado = corretoresSelecionados.includes(c.id);
                        const lote = lotesPorCorretor[c.id] ?? loteDefault;
                        return (
                          <div key={c.id} className={`flex items-center gap-2 text-sm border rounded px-2 py-1.5 ${selecionado ? "bg-white" : "bg-muted/40"}`}>
                            <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selecionado}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setCorretoresSelecionados([...corretoresSelecionados, c.id]);
                                    if (lotesPorCorretor[c.id] === undefined) {
                                      setLotesPorCorretor({ ...lotesPorCorretor, [c.id]: loteDefault });
                                    }
                                  } else {
                                    setCorretoresSelecionados(corretoresSelecionados.filter((x) => x !== c.id));
                                  }
                                }}
                              />
                              <span className="truncate">{c.name}</span>
                            </label>
                            <Input
                              type="number"
                              min={1}
                              value={lote}
                              disabled={!selecionado}
                              onChange={(e) => {
                                const v = Math.max(1, parseInt(e.target.value) || 1);
                                setLotesPorCorretor({ ...lotesPorCorretor, [c.id]: v });
                              }}
                              className="h-8 w-20 text-sm"
                            />
                            <span className="text-xs text-muted-foreground">leads</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className={`text-sm rounded p-2 border ${excesso > 0 ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-blue-50 border-blue-200 text-blue-900"}`}>
                    {corretoresSelecionados.length === 0 ? (
                      <>Selecione pelo menos um corretor.</>
                    ) : excesso > 0 ? (
                      <>Total alocado: <strong>{totalAlocado}</strong> de {leadsFinais.length} leads disponíveis. Excedente: <strong>{excesso}</strong>. Os primeiros {leadsFinais.length} serão distribuídos na ordem, o restante dos lotes fica vazio.</>
                    ) : (
                      <>Total alocado: <strong>{totalAlocado}</strong> de {leadsFinais.length} leads. <strong>{sobra}</strong> ficam fora do plantão.</>
                    )}
                  </div>
                </div>
                );
              })()}

              {modo === "automatico" && (
              <div>
                <Label>Chip Evolution (instância)</Label>
                <Input value={chipInstance} onChange={e => setChipInstance(e.target.value)} placeholder="buzz-vs-oferta" />
                <p className="text-xs text-muted-foreground mt-1">Nome da instância no Evolution API. Deve estar conectada e aquecida.</p>
              </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Ritmo mín (segundos)</Label>
                  <Input type="number" value={ritmoMin} onChange={e => setRitmoMin(parseInt(e.target.value) || 60)} />
                </div>
                <div>
                  <Label>Ritmo máx (segundos)</Label>
                  <Input type="number" value={ritmoMax} onChange={e => setRitmoMax(parseInt(e.target.value) || 90)} />
                </div>
              </div>
              <div>
                <Label>Volume máximo por dia</Label>
                <Input type="number" value={volMaxDia} onChange={e => setVolMaxDia(parseInt(e.target.value) || 80)} />
                <p className="text-xs text-muted-foreground mt-1">Recomendado: chip novo &lt;30, aquecido 7d 50-80, maduro até 150</p>
              </div>

              <div className="border border-blue-200 bg-blue-50 rounded p-4 space-y-2">
                <p className="font-bold text-blue-900">Resumo</p>
                <p className="text-sm text-blue-800">
                  <strong>{leadsFinais.length}</strong> leads, <strong>{copies.filter(c => c.ativa).length}</strong> copies ativas, chip <strong>{chipInstance}</strong>
                </p>
                <p className="text-sm text-blue-800">
                  Ritmo {ritmoMin} a {ritmoMax}s, máx {volMaxDia} por dia, janelas padrão (seg a sex 9-11:30 + 14-17:30, sáb 10-12).
                </p>
                <p className="text-xs text-blue-700">
                  Disparo só começa quando você apertar PLAY no painel do plantão.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between pt-4">
          <Button variant="outline" onClick={() => step > 1 ? setStep(step - 1) : navigate("/plantao")} disabled={salvando}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {step > 1 ? "Voltar" : "Cancelar"}
          </Button>
          {step < 4 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!podeAvancar()}>
              Próximo <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => salvarRascunho("rascunho")} disabled={salvando}>
                {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar rascunho
              </Button>
              <Button onClick={() => salvarRascunho("aprovado")} disabled={!podeAvancar() || salvando}>
                {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Aprovar e ir pro painel
              </Button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function Stat({ label, value, good, warn }: { label: string; value: number; good?: boolean; warn?: boolean }) {
  return (
    <div className={`border rounded p-3 ${good ? "border-green-200 bg-green-50" : warn ? "border-amber-200 bg-amber-50" : ""}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${good ? "text-green-700" : warn ? "text-amber-700" : ""}`}>{value}</p>
    </div>
  );
}
