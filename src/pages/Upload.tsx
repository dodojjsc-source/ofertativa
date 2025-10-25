import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { useLeads } from "@/contexts/LeadsContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload as UploadIcon, FileSpreadsheet } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function Upload() {
  const { user } = useAuth();
  const { addLeads } = useLeads();
  const [loteSize, setLoteSize] = useState(20);
  const [campanha, setCampanha] = useState("");

  const handleUpload = () => {
    // Mock upload - simula importação de leads
    const mockImportedLeads = Array.from({ length: loteSize }, (_, i) => ({
      id: `lead-${Date.now()}-${i}`,
      nome: `Lead ${i + 1}`,
      telefone: `(11) 9${Math.floor(Math.random() * 10000)}-${Math.floor(Math.random() * 10000)}`,
      email: `lead${i + 1}@email.com`,
      campanha: campanha || "Campanha Padrão",
      corretorId: user?.role === "gestor" ? "3" : user?.id,
      gestorId: user?.role === "gestor" ? user?.id : "2",
      status: "pendente" as const,
    }));

    addLeads(mockImportedLeads);
    toast({
      title: "Upload realizado com sucesso",
      description: `${loteSize} leads importados e distribuídos`,
    });
    setCampanha("");
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Upload e Distribuição</h1>
          <p className="text-muted-foreground">Importar planilha e distribuir leads</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UploadIcon className="h-5 w-5 text-accent" />
                Upload de Planilha
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="campanha">Nome da Campanha</Label>
                <Input
                  id="campanha"
                  placeholder="Ex: Campanha Janeiro 2025"
                  value={campanha}
                  onChange={(e) => setCampanha(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lote">Tamanho do Lote</Label>
                <Input
                  id="lote"
                  type="number"
                  min="1"
                  max="100"
                  value={loteSize}
                  onChange={(e) => setLoteSize(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Número de leads a serem distribuídos neste lote
                </p>
              </div>

              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center space-y-2">
                <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Arraste sua planilha Excel aqui ou clique para selecionar
                </p>
                <Button variant="outline" size="sm">
                  Selecionar Arquivo
                </Button>
              </div>

              <Button onClick={handleUpload} className="w-full" size="lg">
                Importar e Distribuir
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Instruções</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">Formato da Planilha</h4>
                <p className="text-muted-foreground">
                  A planilha Excel deve conter as seguintes colunas:
                </p>
                <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                  <li>Nome (obrigatório)</li>
                  <li>Telefone (obrigatório)</li>
                  <li>Email (opcional)</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Distribuição</h4>
                <p className="text-muted-foreground">
                  Os leads serão distribuídos automaticamente entre os corretores da sua equipe de forma sequencial.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Duplicidade</h4>
                <p className="text-muted-foreground">
                  O sistema verifica automaticamente números duplicados e evita importação duplicada.
                </p>
              </div>

              <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
                <p className="text-sm">
                  <strong>Demo:</strong> Nesta versão, o sistema simula a importação gerando leads fictícios para demonstração.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
