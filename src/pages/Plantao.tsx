import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Megaphone, Play, Pause, Eye, MessageSquare, Send, AlertCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plantao, statusLabel } from "@/types/plantao";

export default function PlantaoLista() {
  const navigate = useNavigate();
  const [plantoes, setPlantoes] = useState<Plantao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  const load = async () => {
    const { data, error } = await (supabase as any)
      .from("disparo_plantoes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erro ao carregar plantões", description: error.message, variant: "destructive" });
    } else {
      setPlantoes((data || []) as Plantao[]);
    }
    setLoading(false);
  };

  const ativosAgora = plantoes.filter(p => p.status === "ativo");
  const totalEnviadosHoje = plantoes.reduce((s, p) => s + p.total_enviados, 0);
  const totalRespostasHoje = plantoes.reduce((s, p) => s + p.total_respostas, 0);
  const taxaResposta = totalEnviadosHoje > 0 ? ((totalRespostasHoje / totalEnviadosHoje) * 100).toFixed(1) : "0";

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Megaphone className="h-7 w-7 text-primary" />
              Plantão de Oferta Ativa
            </h1>
            <p className="text-muted-foreground">
              Disparo automático WhatsApp, rotação de copy, opt-out e handoff pull
            </p>
          </div>
          <Button onClick={() => navigate("/plantao/novo")} size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Novo Plantão
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KpiCard label="Plantões ativos" value={ativosAgora.length} icon={Play} color="text-green-600" />
          <KpiCard label="Enviados (total)" value={totalEnviadosHoje} icon={Send} color="text-blue-600" />
          <KpiCard label="Respostas" value={totalRespostasHoje} icon={MessageSquare} color="text-purple-600" />
          <KpiCard label="Taxa resposta" value={`${taxaResposta}%`} icon={AlertCircle} color="text-amber-600" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : plantoes.length === 0 ? (
          <Card>
            <CardContent className="py-16 flex flex-col items-center gap-3">
              <Megaphone className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">Nenhum plantão criado ainda</p>
              <Button onClick={() => navigate("/plantao/novo")}>
                <Plus className="mr-2 h-4 w-4" />
                Criar primeiro plantão
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {plantoes.map(p => (
              <PlantaoCard key={p.id} plantao={p} onClick={() => navigate(`/plantao/${p.id}`)} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

function KpiCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <Icon className={`h-8 w-8 ${color}`} />
      </CardContent>
    </Card>
  );
}

function PlantaoCard({ plantao, onClick }: { plantao: Plantao; onClick: () => void }) {
  const sl = statusLabel(plantao.status);
  const progresso = plantao.total_leads > 0 ? Math.round((plantao.total_enviados / plantao.total_leads) * 100) : 0;
  const taxaResposta = plantao.total_enviados > 0 ? ((plantao.total_respostas / plantao.total_enviados) * 100).toFixed(1) : "0";
  const taxaOptout = plantao.total_enviados > 0 ? ((plantao.total_optout / plantao.total_enviados) * 100).toFixed(1) : "0";

  return (
    <Card className="hover:shadow-md cursor-pointer transition-shadow" onClick={onClick}>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold">{plantao.nome}</h3>
            {plantao.descricao && <p className="text-sm text-muted-foreground line-clamp-1">{plantao.descricao}</p>}
          </div>
          <Badge className={sl.color}>{sl.label}</Badge>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progresso disparo</span>
            <span>{plantao.total_enviados} / {plantao.total_leads}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${progresso}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center pt-2 border-t border-border">
          <div>
            <p className="text-xs text-muted-foreground">Entregues</p>
            <p className="font-bold">{plantao.total_entregues}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Respostas</p>
            <p className="font-bold text-purple-600">{plantao.total_respostas}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Resp %</p>
            <p className="font-bold">{taxaResposta}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Opt-out %</p>
            <p className={`font-bold ${parseFloat(taxaOptout) > 5 ? "text-red-600" : ""}`}>{taxaOptout}%</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1" onClick={(e) => { e.stopPropagation(); onClick(); }}>
            <Eye className="mr-1 h-4 w-4" />
            Abrir
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
