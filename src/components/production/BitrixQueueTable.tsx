import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBitrixQueue } from "@/contexts/BitrixQueueContext";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PhoneLink } from "@/components/ui/phone-link";

export function BitrixQueueTable() {
  const { queue } = useBitrixQueue();

  const pendingQueue = queue.filter(q => q.statusFila === "pendente");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Fila Bitrix por Corretor</CardTitle>
          <Badge variant="outline">{pendingQueue.length} pendentes</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Campanha</TableHead>
                <TableHead>Feedback</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Idade em Fila</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingQueue.slice(0, 10).map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.nome}</TableCell>
                  <TableCell>
                    <PhoneLink 
                      phone={item.telefone}
                      e164={item.e164}
                      display={item.displayLocal}
                      whatsappUrl={item.whatsappUrl}
                      showWhatsApp
                    />
                  </TableCell>
                  <TableCell className="text-xs">{item.campanhaId}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.feedback}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        item.statusFila === "pendente" ? "secondary" :
                        item.statusFila === "processado" ? "default" :
                        "destructive"
                      }
                    >
                      {item.statusFila}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDistanceToNow(parseISO(item.timestampCriacao), { 
                      addSuffix: true, 
                      locale: ptBR 
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {pendingQueue.length > 10 && (
          <p className="text-center text-sm text-muted-foreground mt-4">
            + {pendingQueue.length - 10} itens na fila
          </p>
        )}
      </CardContent>
    </Card>
  );
}
