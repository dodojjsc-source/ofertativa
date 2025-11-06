import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, CheckCircle2, Loader2, Phone } from "lucide-react";

export default function FixPhoneNumbers() {
  const { user } = useAuth();
  const [campanhaNome, setCampanhaNome] = useState("Lista Caco 06/11");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    statistics?: {
      total_encontrados: number;
      corrigidos: number;
      falhas: number;
    };
    issues?: string[];
  } | null>(null);

  // Validar acesso admin
  if (user?.role !== "admin") {
    return (
      <Layout>
        <div className="container mx-auto p-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Acesso restrito a administradores.
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  const handleFix = async () => {
    if (!campanhaNome) {
      toast({
        title: "Erro",
        description: "Informe o nome da campanha",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error("Não autenticado");
      }

      const response = await supabase.functions.invoke('fix-phone-normalization', {
        body: { campanha_nome: campanhaNome },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setResult(response.data);
      
      if (response.data.success) {
        toast({
          title: "Correção concluída",
          description: `${response.data.statistics.corrigidos} números corrigidos`
        });
      }

    } catch (error) {
      console.error("Erro ao corrigir números:", error);
      toast({
        title: "Erro na correção",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto p-4 space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Phone className="h-8 w-8 text-primary" />
            Corrigir Normalização de Telefones
          </h1>
          <p className="text-muted-foreground mt-2">
            Ferramenta para re-normalizar números de telefone que foram importados incorretamente (sem DDI +55)
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Correção de Campanha</CardTitle>
            <CardDescription>
              Esta ferramenta corrige números de telefone que perderam o DDI (+55) durante a importação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="campanha">Nome da Campanha</Label>
              <Input 
                id="campanha" 
                placeholder="Ex: Lista Caco 06/11"
                value={campanhaNome}
                onChange={(e) => setCampanhaNome(e.target.value)}
                disabled={isProcessing}
              />
              <p className="text-xs text-muted-foreground">
                Nome exato da campanha conforme aparece no sistema
              </p>
            </div>

            <Button 
              onClick={handleFix}
              disabled={!campanhaNome || isProcessing}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Phone className="mr-2 h-4 w-4" />
                  Corrigir Números
                </>
              )}
            </Button>

            {result && (
              <div className="space-y-4 mt-6">
                <Alert variant={result.success ? "default" : "destructive"}>
                  {result.success ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>
                    <div className="font-semibold mb-2">{result.message}</div>
                    {result.statistics && (
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="secondary">
                          {result.statistics.total_encontrados} encontrados
                        </Badge>
                        <Badge variant="default" className="bg-green-600">
                          {result.statistics.corrigidos} corrigidos
                        </Badge>
                        {result.statistics.falhas > 0 && (
                          <Badge variant="destructive">
                            {result.statistics.falhas} falhas
                          </Badge>
                        )}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>

                {result.issues && result.issues.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Problemas Encontrados</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="text-xs space-y-1 text-muted-foreground">
                        {result.issues.map((issue, i) => (
                          <li key={i}>• {issue}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Como funciona?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong>1.</strong> Busca todos os leads da campanha com E.164 incorreto (que não começam com +55)
            </p>
            <p>
              <strong>2.</strong> Re-normaliza cada número usando o telefone_raw ou telefone original
            </p>
            <p>
              <strong>3.</strong> Atualiza os campos: e164, whatsapp_url, display_local, ddi, ddd, numero_core
            </p>
            <p className="text-amber-600">
              ⚠️ Esta operação não pode ser desfeita. Faça backup se necessário.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
