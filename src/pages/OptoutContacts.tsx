import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OptoutContact {
  id: string;
  created_at: string;
  original_lead_id: string;
  nome: string;
  telefone: string;
  email: string | null;
  campanha_id: string | null;
  gestor_id: string | null;
  corretor_id: string | null;
  observacao: string | null;
  flagged_by: string | null;
  flagged_at: string;
}

export default function OptoutContacts() {
  const { user } = useAuth();
  const [contatos, setContatos] = useState<OptoutContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTelefone, setSearchTelefone] = useState("");

  useEffect(() => {
    loadContatos();
  }, []);

  const loadContatos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("optout_contacts")
        .select("*")
        .order("flagged_at", { ascending: false });

      if (error) throw error;
      setContatos(data || []);
    } catch (error) {
      console.error("Erro ao carregar opt-outs:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredContatos = contatos.filter((contato) =>
    contato.telefone.includes(searchTelefone)
  );

  if (user?.role !== "admin") {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <Card className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Acesso Negado</h2>
            <p className="text-muted-foreground">
              Apenas administradores podem acessar esta página.
            </p>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Contatos Opt-out</h1>
          <p className="text-muted-foreground">
            Lista de contatos que solicitaram não ser contatados
          </p>
        </div>

        <Card className="p-6">
          <div className="mb-6">
            <Input
              placeholder="Buscar por telefone..."
              value={searchTelefone}
              onChange={(e) => setSearchTelefone(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : filteredContatos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum contato opt-out encontrado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Observação</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContatos.map((contato) => (
                    <TableRow key={contato.id}>
                      <TableCell className="font-medium">{contato.nome}</TableCell>
                      <TableCell>{contato.telefone}</TableCell>
                      <TableCell>{contato.email || "-"}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {contato.observacao || "-"}
                      </TableCell>
                      <TableCell>
                        {format(new Date(contato.flagged_at), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}