import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { PhoneOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { PhoneLink } from "@/components/ui/phone-link";

interface NaoAtendido {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
  campanha_nome: string;
  tentativas_contato: number;
  flagged_at: string;
  observacao?: string;
}

export default function NaoAtendidos() {
  const [naoAtendidos, setNaoAtendidos] = useState<NaoAtendido[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNaoAtendidos();
  }, []);

  const loadNaoAtendidos = async () => {
    try {
      const { data, error } = await supabase
        .from("nao_atendidos")
        .select("*")
        .order("flagged_at", { ascending: false });

      if (error) throw error;
      setNaoAtendidos(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar não atendidos:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os leads não atendidos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <PhoneOff className="h-8 w-8 text-orange-500" />
          <div>
            <h1 className="text-3xl font-bold">Leads Não Atendidos</h1>
            <p className="text-muted-foreground">
              Leads que não atenderam após 3 tentativas
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              Total: {naoAtendidos.length} lead(s) não atendido(s)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Carregando...</p>
            ) : naoAtendidos.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum lead não atendido registrado
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Campanha</TableHead>
                    <TableHead>Tentativas</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Observação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {naoAtendidos.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">{lead.nome}</TableCell>
                      <TableCell>
                        <PhoneLink phone={lead.telefone} />
                      </TableCell>
                      <TableCell>{lead.email || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{lead.campanha_nome}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive">{lead.tentativas_contato}x</Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(lead.flagged_at), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {lead.observacao || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
