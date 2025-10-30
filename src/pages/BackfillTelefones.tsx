import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Database, Play, CheckCircle, AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { normalizarTelefone } from "@/lib/phoneNormalization";

type TableName = "leads" | "optout_contacts" | "contatos_errados" | "nao_atendidos" | "bitrix_queue";

export default function BackfillTelefones() {
  const { user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState({ total: 0, ok: 0, incompleto: 0, invalido: 0 });
  const [selectedTable, setSelectedTable] = useState<TableName>("leads");

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
      const BATCH_SIZE = 100;
      let processedCount = 0;
      let hasMore = true;

      while (hasMore) {
        // Buscar registros que precisam ser normalizados
        const { data: records, error: fetchError } = await supabase
          .from(selectedTable)
          .select('id, telefone, telefone_raw')
          .or('e164.is.null,e164.eq.')
          .limit(BATCH_SIZE) as any;

        if (fetchError) throw fetchError;
        if (!records || records.length === 0) {
          hasMore = false;
          break;
        }

        // Processar cada registro
        let batchOk = 0;
        let batchIncompleto = 0;
        let batchInvalido = 0;

        for (const record of records) {
          const telefoneInput = record.telefone_raw || record.telefone;
          const result = normalizarTelefone(telefoneInput);

          // Atualizar no banco
          const { error: updateError } = await supabase
            .from(selectedTable)
            .update({
              ddi: result.ddi,
              ddd: result.ddd,
              numero_core: result.numero_core,
              e164: result.e164,
              display_local: result.display_local,
              whatsapp_url: result.whatsapp_url,
              is_mobile: result.is_mobile,
              validacao: result.validacao,
              motivo_validacao: result.motivo_validacao,
            } as any)
            .eq('id', record.id);

          if (updateError) {
            console.error(`Erro ao atualizar registro ${record.id}:`, updateError);
            continue;
          }

          // Contar por status
          if (result.validacao === 'ok') batchOk++;
          else if (result.validacao === 'incompleto') batchIncompleto++;
          else batchInvalido++;

          processedCount++;
        }

        // Atualizar progresso
        setProgress((prev) => ({
          total: prev.total + records.length,
          ok: prev.ok + batchOk,
          incompleto: prev.incompleto + batchIncompleto,
          invalido: prev.invalido + batchInvalido,
        }));

        // Se processamos menos que o BATCH_SIZE, não há mais registros
        if (records.length < BATCH_SIZE) {
          hasMore = false;
        }

        // Feedback a cada lote
        if (processedCount % 100 === 0) {
          toast({
            title: `Processados ${processedCount} registros`,
            description: `OK: ${batchOk} | Incompletos: ${batchIncompleto} | Inválidos: ${batchInvalido}`,
          });
        }
      }

      toast({
        title: "✅ Normalização concluída",
        description: `Total: ${processedCount} registros processados`,
      });
    } catch (error: any) {
      toast({
        title: "Erro na normalização",
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
              <Select 
                value={selectedTable} 
                onValueChange={(value) => setSelectedTable(value as TableName)} 
                disabled={isRunning}
              >
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
              <div className="space-y-4 pt-4 border-t">
                <div>
                  <div className="flex justify-between text-sm font-medium mb-2">
                    <span>Progresso</span>
                    <span>{progress.total} registros</span>
                  </div>
                  <Progress 
                    value={isRunning ? 50 : 100} 
                    className="h-2"
                  />
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
