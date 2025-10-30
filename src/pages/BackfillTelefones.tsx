import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Database, Play, CheckCircle, AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function BackfillTelefones() {
  const { user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState({ total: 0, ok: 0, incompleto: 0, invalido: 0 });
  const [selectedTable, setSelectedTable] = useState("leads");

  if (user?.role !== "admin") {
    return (
      <Layout>
        <div className="p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-semibold">Acesso Negado</h2>
          <p className="text-muted-foreground mt-2">Apenas administradores podem acessar esta página.</p>
        </div>
      </Layout>
    );
  }

  const runBackfill = async () => {
    setIsRunning(true);
    setProgress({ total: 0, ok: 0, incompleto: 0, invalido: 0 });

    try {
      let cursor = null;
      let hasMore = true;
      let batchCount = 0;

      while (hasMore) {
        const { data, error } = await supabase.functions.invoke("backfill-telefones", {
          body: { table: selectedTable, batchSize: 1000, cursor },
        });

        if (error) throw error;

        batchCount++;
        setProgress((prev) => ({
          total: prev.total + data.processed,
          ok: prev.ok + data.ok,
          incompleto: prev.incompleto + data.incompleto,
          invalido: prev.invalido + data.invalido,
        }));

        cursor = data.nextCursor;
        hasMore = data.nextCursor !== null;

        toast({
          title: `Lote ${batchCount} processado`,
          description: `${data.processed} registros normalizados`,
        });
      }

      toast({
        title: "✅ Backfill concluído",
        description: `Total: ${progress.total} | OK: ${progress.ok} | Incompletos: ${progress.incompleto} | Inválidos: ${progress.invalido}`,
      });
    } catch (error: any) {
      toast({
        title: "Erro no backfill",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Normalização de Telefones</h1>
          <p className="text-muted-foreground mt-2">
            Processa números existentes para adicionar DDI, DDD, E.164, WhatsApp e validação
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Backfill de Dados Existentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Tabela para Processar</label>
              <Select value={selectedTable} onValueChange={setSelectedTable} disabled={isRunning}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="leads">Leads</SelectItem>
                  <SelectItem value="optout_contacts">Opt-outs</SelectItem>
                  <SelectItem value="contatos_errados">Contatos Errados</SelectItem>
                  <SelectItem value="nao_atendidos">Não Atendidos</SelectItem>
                  <SelectItem value="bitrix_queue">Fila Bitrix</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={runBackfill}
              disabled={isRunning}
              className="w-full"
              size="lg"
            >
              {isRunning ? (
                <>Processando...</>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Iniciar Normalização
                </>
              )}
            </Button>

            {progress.total > 0 && (
              <div className="space-y-3 pt-4 border-t">
                <div className="flex justify-between text-sm font-medium">
                  <span>Total processados:</span>
                  <span>{progress.total}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Badge variant="default" className="justify-center py-2">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    OK: {progress.ok}
                  </Badge>
                  <Badge variant="secondary" className="justify-center py-2">
                    Incompleto: {progress.incompleto}
                  </Badge>
                  <Badge variant="destructive" className="justify-center py-2">
                    Inválido: {progress.invalido}
                  </Badge>
                </div>
                {progress.total > 0 && (
                  <div className="text-sm text-muted-foreground text-center">
                    Taxa de sucesso: {((progress.ok / progress.total) * 100).toFixed(1)}%
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ℹ️ Como Funciona</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• <strong>DDI:</strong> Adiciona +55 (Brasil) automaticamente</p>
            <p>• <strong>DDD:</strong> Detecta automaticamente quando presente (2 dígitos)</p>
            <p>• <strong>9º dígito:</strong> Adiciona em celulares com 8 dígitos quando DDD presente</p>
            <p>• <strong>E.164:</strong> Formato internacional (+5511998765432)</p>
            <p>• <strong>WhatsApp:</strong> Gera link direto para conversa</p>
            <p>• <strong>Validação:</strong> Classifica como OK, incompleto ou inválido</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
