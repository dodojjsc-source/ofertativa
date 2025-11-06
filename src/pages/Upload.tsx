import { useState, useEffect, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { useLeads } from "@/contexts/LeadsContext";
import { useUsers, AppUser } from "@/contexts/UsersContext";
import { useAssignments } from "@/contexts/AssignmentsContext";
import { useCampanhas } from "@/contexts/CampanhasContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload as UploadIcon, FileSpreadsheet, RefreshCw, Undo2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";
import { normalizarTelefone } from "@/lib/phoneNormalization";

// Helpers para normalizar cabeçalhos e extrair telefones
const normalizeHeader = (s: string) => 
  s.toLowerCase()
   .normalize("NFD")
   .replace(/[\u0300-\u036f]/g, "")
   .replace(/[^a-z0-9]+/g, "")
   .trim();

const getCell = (row: any, candidates: string[]) => {
  const norm = (s: string) => normalizeHeader(s);
  const map = Object.fromEntries(Object.keys(row).map(k => [norm(k), row[k]]));
  const keys = Object.keys(map);

  // 1) Match exato (normalizado)
  for (const c of candidates) {
    const key = norm(c);
    if (map[key] !== undefined) return map[key];
  }
  
  // 2) Match por includes (prioridade por ordem do array)
  for (const c of candidates) {
    const key = keys.find(k => k.includes(norm(c)));
    if (key) return map[key];
  }
  
  return undefined;
};
const extractFirstValidPhone = (raw: string): string | null => {
  if (!raw) return null;
  const parts = String(raw).split(/[;,/|]/).map(p => p.trim()).filter(Boolean);
  const candidates = parts.length ? parts : [String(raw)];
  for (const cand of candidates) {
    const digits = cand.replace(/\D/g, "");
    if (digits.length >= 10 && digits.length <= 15) return cand;
  }
  return null;
};
// Schema apenas para validar nome (telefone é validado por normalizarTelefone)
const nameSchema = z.object({
  nome: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(100, "Nome muito longo").regex(/^[a-zA-ZÀ-ÿ\s]+$/, "Nome deve conter apenas letras")
});

const emailSchema = z.string().trim().email("Email inválido").max(255, "Email muito longo").optional().or(z.literal(""));
export default function Upload() {
  const {
    user
  } = useAuth();
  const {
    leads,
    addLeads,
    updateLead
  } = useLeads();
  const {
    users
  } = useUsers();
  const {
    addAssignments,
    getPendingCountByCorretor,
    getAssignmentsByCampanha,
    isLeadAssigned,
    undoLastDistribution
  } = useAssignments();
  const {
    createCampanha
  } = useCampanhas();

  // Validar carregamento do usuário
  if (!user) {
    return <Layout>
        <div className="container mx-auto p-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">Carregando informações do usuário...</p>
            </CardContent>
          </Card>
        </div>
      </Layout>;
  }
  const [loteSize, setLoteSize] = useState(20);
  const [campanha, setCampanha] = useState("");
  const [selectedCorretores, setSelectedCorretores] = useState<string[]>([]);
  const [corretoresElegiveis, setCorretoresElegiveis] = useState<AppUser[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importedLeads, setImportedLeads] = useState<Array<{
    nome: string;
    telefone: string;
    email?: string;
  }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadCorretoresElegiveis = useCallback(() => {
    if (!user) {
      setCorretoresElegiveis([]);
      return;
    }
    let eligible: AppUser[] = [];
    if (user.role === "admin") {
      eligible = users.filter(u => u.role === "corretor" && u.status === "ativo");
    } else if (user.role === "gestor") {
      eligible = users.filter(u => u.role === "corretor" && u.status === "ativo" && u.gestorId === user.id);
    }
    setCorretoresElegiveis(eligible);
  }, [user, users]);
  useEffect(() => {
    loadCorretoresElegiveis();
  }, [loadCorretoresElegiveis]);
  const toggleCorretor = (corretorId: string) => {
    setSelectedCorretores(prev => prev.includes(corretorId) ? prev.filter(id => id !== corretorId) : [...prev, corretorId]);
  };
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, {
        type: "array"
      });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

      // Validar e parsear dados com importação tolerante
      let multiplePhoneCount = 0;
      const parsedLeads: Array<{
        nome: string;
        telefone: string;
        telefone_raw: string;
        e164: string;
        whatsapp_url: string;
        validacao: string;
        email?: string;
      }> = [];
      const skipped: Array<{ row: number; reason: string }> = [];

      jsonData.forEach((row, index) => {
        const line = index + 2;
        try {
          // Listas de sinônimos para headers flexíveis
          const rawNome = String(getCell(row, [
            "nome", "nome do lead", "nome do cliente", "lead", "contato", "cliente", "name"
          ]) ?? "").trim();
          
          let rawTel = String(getCell(row, [
            "whatsapp", "celular", "telefone", "telefone 1", "telefone principal", 
            "telefone de trabalho", "tel", "fone", "phone", "mobile"
          ]) ?? "").trim();
          
          const rawMail = String(getCell(row, [
            "email", "e-mail", "mail"
          ]) ?? "").trim();

          // Fallback: procurar telefone em qualquer célula se não encontrado por header
          if (!rawTel) {
            for (const v of Object.values(row)) {
              const maybe = extractFirstValidPhone(String(v ?? ""));
              if (maybe) { 
                rawTel = maybe; 
                break; 
              }
            }
          }

          // Extrair primeiro telefone válido
          const firstPhone = extractFirstValidPhone(rawTel);
          if (!firstPhone) {
            skipped.push({ row: line, reason: "Telefone não encontrado ou inválido" });
            return;
          }

          // Detectar se havia múltiplos telefones
          const parts = rawTel.split(/[;,/|]/).map(p => p.trim()).filter(Boolean);
          if (parts.length > 1) {
            multiplePhoneCount++;
          }

          // Normalizar telefone (validação acontece aqui)
          const phoneResult = normalizarTelefone(firstPhone);
          
          if (phoneResult.validacao === "invalido") {
            skipped.push({ row: line, reason: phoneResult.motivo_validacao || "Telefone inválido" });
            return;
          }

          // Validar nome
          const nameValidation = nameSchema.safeParse({ nome: rawNome });
          if (!nameValidation.success) {
            skipped.push({ row: line, reason: nameValidation.error.errors[0].message });
            return;
          }

          // Validar email (opcional)
          const emailValidation = emailSchema.safeParse(rawMail);
          const validEmail = emailValidation.success ? emailValidation.data : undefined;

          // Debug log
          console.log(`[Upload Debug] Linha ${line}:`, {
            raw: firstPhone,
            normalized: phoneResult,
            willSave: {
              telefone: phoneResult.display_local,
              e164: phoneResult.e164,
              whatsapp: phoneResult.whatsapp_url
            }
          });
          
          parsedLeads.push({
            nome: nameValidation.data.nome,
            telefone: phoneResult.display_local,      // ✅ Usar resultado direto
            telefone_raw: firstPhone,
            e164: phoneResult.e164,                   // ✅ Usar resultado direto
            whatsapp_url: phoneResult.whatsapp_url,   // ✅ Usar resultado direto
            validacao: phoneResult.validacao,
            email: validEmail
          });
          
        } catch (e) {
          skipped.push({ 
            row: line, 
            reason: e instanceof Error ? e.message : "Erro desconhecido" 
          });
        }
      });

      // Verificar se há leads válidos
      if (parsedLeads.length === 0) {
        const firstReason = skipped[0]?.reason || "Formato inválido";
        toast({
          title: "Nenhum lead válido encontrado",
          description: `Ex.: Linha ${skipped[0]?.row} — ${firstReason}. Verifique os cabeçalhos e formato.`,
          variant: "destructive"
        });
        setSelectedFile(null);
        setImportedLeads([]);
        return;
      }

      // Remover duplicatas dentro da planilha usando E.164 (manter primeira ocorrência)
      const e164Set = new Set<string>();
      const uniqueParsedLeads: typeof parsedLeads = [];
      let duplicatesInFile = 0;
      for (const lead of parsedLeads) {
        if (e164Set.has(lead.e164)) {
          duplicatesInFile++;
          continue;
        }
        e164Set.add(lead.e164);
        uniqueParsedLeads.push(lead);
      }
      setImportedLeads(uniqueParsedLeads);

      // Montar mensagem com informações de duplicatas, múltiplos telefones e linhas ignoradas
      const descriptionParts: string[] = [`${uniqueParsedLeads.length} leads únicos`];
      if (duplicatesInFile > 0) {
        descriptionParts.push(`${duplicatesInFile} duplicata(s) removida(s)`);
      }
      if (multiplePhoneCount > 0) {
        descriptionParts.push(`${multiplePhoneCount} com múltiplos telefones (usamos o 1º)`);
      }
      if (skipped.length > 0) {
        const firstSkipped = skipped.slice(0, 5).map(s => s.row).join(', ');
        descriptionParts.push(`${skipped.length} linha(s) ignorada(s) (${firstSkipped}${skipped.length > 5 ? '...' : ''})`);
      }
      
      toast({
        title: "Arquivo carregado com sucesso",
        description: descriptionParts.join(' • ')
      });
    } catch (error) {
      console.error("Erro ao processar arquivo:", error);
      toast({
        title: "Erro ao ler arquivo",
        description: error instanceof Error ? error.message : "Verifique o formato da planilha",
        variant: "destructive"
      });
      setSelectedFile(null);
      setImportedLeads([]);
    }
  };
  const handleUploadOnly = async () => {
    if (isUploading) return;

    // Validar autenticação
    if (!user?.id) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado. Por favor, faça login novamente.",
        variant: "destructive"
      });
      return;
    }
    if (!campanha) {
      toast({
        title: "Erro",
        description: "Informe o nome da campanha",
        variant: "destructive"
      });
      return;
    }
    if (importedLeads.length === 0) {
      toast({
        title: "Erro",
        description: "Nenhuma planilha carregada",
        variant: "destructive"
      });
      return;
    }
    setIsUploading(true);
    try {
      // 1. Criar campanha no banco
      const campanhaId = await createCampanha(campanha, importedLeads.length);
      if (!campanhaId) {
        throw new Error("Não foi possível criar a campanha");
      }

      // 2. Salvar leads SEM corretor_id (null)
      const leadsToSave = importedLeads.map(lead => ({
        nome: lead.nome,
        telefone: lead.telefone,
        email: lead.email,
        campanha: campanha,
        campanhaId: campanhaId,
        corretorId: undefined,
        // SEM CORRETOR
        gestorId: user?.id || "",
        status: "pendente" as const
      }));
      await addLeads(leadsToSave);
      toast({
        title: "Upload concluído",
        description: `${importedLeads.length} leads salvos na campanha "${campanha}". Você pode distribuí-los depois na página de Campanhas.`
      });

      // Limpar formulário
      setCampanha("");
      setSelectedFile(null);
      setImportedLeads([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error: any) {
      toast({
        title: "Erro no upload",
        description: error.message || "Não foi possível salvar os leads",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };
  const handleDistribuir = async () => {
    if (isUploading) return;

    // Validar autenticação
    if (!user?.id) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado. Por favor, faça login novamente.",
        variant: "destructive"
      });
      return;
    }
    if (!campanha) {
      toast({
        title: "Erro",
        description: "Informe o nome da campanha",
        variant: "destructive"
      });
      return;
    }
    if (selectedCorretores.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um corretor",
        variant: "destructive"
      });
      return;
    }
    if (importedLeads.length === 0) {
      toast({
        title: "Erro",
        description: "Nenhuma planilha carregada",
        variant: "destructive"
      });
      return;
    }
    setIsUploading(true);
    try {
      // 1. Criar campanha no banco
      const campanhaId = await createCampanha(campanha, importedLeads.length);
      if (!campanhaId) {
        throw new Error("Não foi possível criar a campanha");
      }

      // 2. Salvar leads COM corretor_id para distribuição imediata
      const leadsToSave = importedLeads.map(lead => ({
        nome: lead.nome,
        telefone: lead.telefone,
        email: lead.email,
        campanha: campanha,
        campanhaId: campanhaId,
        corretorId: undefined,
        // Inicialmente sem corretor
        gestorId: user?.id || "",
        status: "pendente" as const
      }));
      await addLeads(leadsToSave);

      // 3. Buscar pool de leads da campanha diretamente do backend (não depende do estado global)
      const { data: newLeads, error: fetchError } = await supabase
        .from('leads')
        .select('id')
        .eq('campanha_id', campanhaId);
      
      if (fetchError) throw fetchError;
      if (!newLeads || newLeads.length === 0) {
        throw new Error("Não foi possível encontrar os leads inseridos");
      }

      const assignedSet = new Set(getAssignmentsByCampanha(campanhaId).map(a => a.leadId));
      const pool = newLeads.filter(l => !assignedSet.has(l.id));

      // 4. Distribuição round-robin
      const newAssignments: Array<{
        campanhaId: string;
        leadId: string;
        corretorId: string;
        statusDistribuicao: "pendente";
      }> = [];
      const corretoresCount: Record<string, number> = {};
      selectedCorretores.forEach(id => corretoresCount[id] = 0);
      let corretorIndex = 0;
      for (const leadData of pool) {
        const corretorId = selectedCorretores[corretorIndex];

        // Verificar duplicidade
        if (isLeadAssigned(campanhaId, leadData.id)) continue;

        // Verificar se corretor já atingiu o limite
        if (corretoresCount[corretorId] >= loteSize) {
          // Tentar próximo corretor
          const nextIndex = (corretorIndex + 1) % selectedCorretores.length;
          if (nextIndex === 0) break; // Todos atingiram limite
          corretorIndex = nextIndex;
          continue;
        }
        newAssignments.push({
          campanhaId,
          leadId: leadData.id,
          corretorId,
          statusDistribuicao: "pendente"
        });
        corretoresCount[corretorId]++;
        corretorIndex = (corretorIndex + 1) % selectedCorretores.length;
      }
      if (newAssignments.length === 0) {
        toast({
          title: "Atenção",
          description: "Nenhum lead disponível para distribuição",
          variant: "destructive"
        });
        return;
      }
      addAssignments(newAssignments);

      // Atualizar os leads com o corretorId e gestorId correto
      newAssignments.forEach(assignment => {
        const corretor = corretoresElegiveis.find(c => c.id === assignment.corretorId);
        updateLead(assignment.leadId, {
          corretorId: assignment.corretorId,
          gestorId: corretor?.gestorId || user?.id || ""
        });
      });

      // 5. Resumo
      const resumo = selectedCorretores.map(corretorId => {
        const corretor = corretoresElegiveis.find(c => c.id === corretorId);
        return `${corretor?.name}: ${corretoresCount[corretorId] || 0} leads`;
      });
      toast({
        title: "Distribuição realizada",
        description: resumo.join(" | ")
      });
      setCampanha("");
      setSelectedCorretores([]);
      setSelectedFile(null);
      setImportedLeads([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error: any) {
      toast({
        title: "Erro na distribuição",
        description: error.message || "Não foi possível distribuir os leads",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };
  const handleUndo = () => {
    if (undoLastDistribution()) {
      toast({
        title: "Distribuição revertida",
        description: "A última distribuição foi desfeita"
      });
    } else {
      toast({
        title: "Nada para reverter",
        description: "Nenhuma distribuição recente encontrada",
        variant: "destructive"
      });
    }
  };
  return <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Upload e Distribuição</h1>
            <p className="text-muted-foreground">Importar planilha e distribuir leads</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadCorretoresElegiveis}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar Equipe
            </Button>
            <Button variant="outline" onClick={handleUndo}>
              <Undo2 className="mr-2 h-4 w-4" />
              Reverter Última
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UploadIcon className="h-5 w-5 text-accent" />
                Configuração da Distribuição
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="campanha">Nome da Campanha</Label>
                <Input id="campanha" placeholder="Ex: Campanha Janeiro 2025" value={campanha} onChange={e => setCampanha(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lote">Tamanho do Lote por Corretor</Label>
                <Input id="lote" type="number" min="1" max="100" value={loteSize} onChange={e => setLoteSize(Number(e.target.value))} />
                <p className="text-xs text-muted-foreground">
                  Quantidade de leads que cada corretor selecionado receberá
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Corretores Elegíveis</Label>
                  <Badge variant="outline">
                    {corretoresElegiveis.length} disponíveis
                  </Badge>
                </div>

                {corretoresElegiveis.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum corretor ativo encontrado
                  </p> : <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                    {corretoresElegiveis.map(corretor => {
                  const pendingCount = getPendingCountByCorretor(corretor.id);
                  return <div key={corretor.id} className="flex items-center justify-between p-2 rounded hover:bg-accent/5">
                          <div className="flex items-center gap-3">
                            <Checkbox checked={selectedCorretores.includes(corretor.id)} onCheckedChange={() => toggleCorretor(corretor.id)} />
                            <div>
                              <p className="font-medium text-sm">{corretor.name}</p>
                              <p className="text-xs text-muted-foreground">{corretor.email}</p>
                            </div>
                          </div>
                          {pendingCount > 0 && <Badge variant="secondary">
                              {pendingCount} pendentes
                            </Badge>}
                        </div>;
                })}
                  </div>}
              </div>

              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center space-y-2">
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileSelect} className="hidden" />
                <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground" />
                {selectedFile ? <>
                    <p className="text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {importedLeads.length} leads carregados
                    </p>
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                      Alterar Arquivo
                    </Button>
                  </> : <>
                    <p className="text-sm text-muted-foreground">
                      Arraste sua planilha Excel aqui ou clique para selecionar
                    </p>
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                      Selecionar Arquivo
                    </Button>
                  </>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button onClick={handleUploadOnly} className="w-full" size="lg" variant="outline" disabled={!campanha || importedLeads.length === 0 || isUploading}>
                  {isUploading ? "Salvando..." : "Salvar Leads"}
                </Button>
                <Button onClick={handleDistribuir} className="w-full" size="lg" disabled={selectedCorretores.length === 0 || !campanha || importedLeads.length === 0 || isUploading}>
                  {isUploading ? "Distribuindo..." : "Distribuir Leads"}
                  Salvar e Distribuir
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Use "Salvar Leads" para guardar sem distribuir. Use "Salvar e Distribuir" para distribuição imediata.
              </p>
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
                <h4 className="font-semibold mb-2">Distribuição Round-Robin</h4>
                <p className="text-muted-foreground">
                  Os leads serão distribuídos alternadamente entre os corretores selecionados, 
                  até que cada um receba a quantidade definida no "Tamanho do Lote".
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Duplicidade</h4>
                <p className="text-muted-foreground">
                  O sistema verifica automaticamente leads já atribuídos na mesma campanha 
                  e evita duplicação.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Reverter Distribuição</h4>
                <p className="text-muted-foreground">
                  Use o botão "Reverter Última" para desfazer a última distribuição realizada.
                </p>
              </div>

              {importedLeads.length === 0}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>;
}