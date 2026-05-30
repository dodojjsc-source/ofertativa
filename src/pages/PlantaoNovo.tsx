import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Upload, Sparkles, Check, AlertCircle, Loader2, Send, X, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { parseCsvText, ParseResult, ParsedLead, checarOptoutGlobal, validarCopy, COPY_OPTOUT_LINE } from "@/lib/plantao";
import { useAuth } from "@/contexts/AuthContext";
import { useCampanhas } from "@/contexts/CampanhasContext";
import { useLeads } from "@/contexts/LeadsContext";
import { normalizarTelefone } from "@/lib/phoneNormalization";
import { Database } from "lucide-react";

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
  const [leadsFinais, setLeadsFinais] = useState<ParsedLead[]>([]);

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
  const [chipInstance, setChipInstance] = useState("buzz-alertas");
  const [ritmoMin, setRitmoMin] = useState(60);
  const [ritmoMax, setRitmoMax] = useState(90);
  const [volMaxDia, setVolMaxDia] = useState(80);

  const podeAvancar = () => {
    if (step === 1) return nome.trim().length >= 3;
    if (step === 2) return leadsFinais.length > 0;
    if (step === 3) return copies.filter(c => c.ativa && validarCopy(c.texto).ok).length >= 3 && pilares.filter(p => p.trim().length > 5).length >= 2;
    if (step === 4) return chipInstance.trim().length > 0;
    return false;
  };

  const processarCsv = async (texto: string) => {
    setCsvText(texto);
    const r = parseCsvText(texto);
    setParseRes(r);
    if (r.validos.length > 0) {
      const optout = await checarOptoutGlobal(r.validos.map(v => v.telefone_norm!).filter(Boolean));
      setOptoutCruzados(optout);
      setLeadsFinais(r.validos.filter(v => !optout.has(v.telefone_norm!)));
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
      return;
    }
    const leadsDaCampanha = leadsOfertativa.filter(l => l.campanhaId === campanhaId);
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
      const optout = await checarOptoutGlobal(validos.map(v => v.telefone_norm!).filter(Boolean));
      setOptoutCruzados(optout);
      setLeadsFinais(validos.filter(v => !optout.has(v.telefone_norm!)));
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
          eflyer_url: eflyerUrl || null,
          video_url: videoUrl || null,
          pilares: pilares.filter(p => p.trim()),
          chip_instance: chipInstance,
          ritmo_min_seg: ritmoMin,
          ritmo_max_seg: ritmoMax,
          volume_max_dia: volMaxDia,
          total_leads: leadsFinais.length,
          created_by: user.id,
        })
        .select()
        .single();
      if (e1) throw e1;
      const plantaoId = plantao.id;

      // Insere copies
      const ativas = copies.filter(c => c.ativa && validarCopy(c.texto).ok);
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

      // Insere fila em batches de 200
      const batchSize = 200;
      for (let i = 0; i < leadsFinais.length; i += batchSize) {
        const batch = leadsFinais.slice(i, i + batchSize);
        const { error: e3 } = await (supabase as any).from("disparo_fila").insert(
          batch.map(l => ({
            plantao_id: plantaoId,
            nome: l.nome,
            telefone: l.telefone_raw,
            telefone_norm: l.telefone_norm,
            email: l.email || null,
            origem: l.origem || null,
            bitrix_lead_id: l.bitrix_lead_id || null,
            status: "aguardando" as const,
          })),
        );
        if (e3) throw e3;
      }

      toast({
        title: statusFinal === "aprovado" ? "Plantão aprovado e pronto pra disparar" : "Rascunho salvo",
        description: `${leadsFinais.length} leads, ${ativas.length} copies`,
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
                    {campanhas.map(c => {
                      const total = leadsOfertativa.filter(l => l.campanhaId === c.id).length;
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Stat label="Brutos" value={parseRes.total_brutos} />
                  <Stat label="Válidos" value={parseRes.validos.length} good />
                  <Stat label="Descartados" value={parseRes.descartados.length + parseRes.duplicados_arquivo} warn />
                  <Stat label="Opt-out (cortados)" value={optoutCruzados.size} warn />
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

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Copies de disparo</CardTitle>
                <Button onClick={gerarCopies} disabled={gerandoCopies || pilares.filter(p => p.trim()).length < 2}>
                  {gerandoCopies ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Gerar 5 com IA
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {copies.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Clique em "Gerar 5 com IA" pra criar as copies a partir dos pilares</p>
                    <p className="text-xs mt-2">Variáveis: <code>{"{{primeiro_nome}}"}</code></p>
                  </div>
                ) : (
                  copies.map((c, i) => {
                    const v = validarCopy(c.texto);
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
              <div>
                <Label>Chip Evolution (instância)</Label>
                <Input value={chipInstance} onChange={e => setChipInstance(e.target.value)} placeholder="buzz-vs-oferta" />
                <p className="text-xs text-muted-foreground mt-1">Nome da instância no Evolution API. Deve estar conectada e aquecida.</p>
              </div>
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
