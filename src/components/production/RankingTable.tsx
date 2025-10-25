import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowUpDown, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { CorretorMetrics } from "@/hooks/useMetrics";

interface RankingTableProps {
  ranking: CorretorMetrics[];
}

type SortKey = keyof CorretorMetrics;

export function RankingTable({ ranking }: RankingTableProps) {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>("ligacoes");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sortedRanking = [...ranking].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    }
    
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortDir === "asc" 
        ? aVal.localeCompare(bVal) 
        : bVal.localeCompare(aVal);
    }
    
    return 0;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ranking por Corretor</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead onClick={() => handleSort("corretorName")} className="cursor-pointer">
                  Corretor <ArrowUpDown className="inline h-3 w-3 ml-1" />
                </TableHead>
                <TableHead onClick={() => handleSort("ligacoes")} className="cursor-pointer">
                  Ligações <ArrowUpDown className="inline h-3 w-3 ml-1" />
                </TableHead>
                <TableHead onClick={() => handleSort("atendimentos")} className="cursor-pointer">
                  Atendimentos <ArrowUpDown className="inline h-3 w-3 ml-1" />
                </TableHead>
                <TableHead onClick={() => handleSort("taxaSucesso")} className="cursor-pointer">
                  Taxa <ArrowUpDown className="inline h-3 w-3 ml-1" />
                </TableHead>
                <TableHead onClick={() => handleSort("agendados")} className="cursor-pointer">
                  Agendados <ArrowUpDown className="inline h-3 w-3 ml-1" />
                </TableHead>
                <TableHead onClick={() => handleSort("repassarBitrix")} className="cursor-pointer">
                  Bitrix <ArrowUpDown className="inline h-3 w-3 ml-1" />
                </TableHead>
                <TableHead onClick={() => handleSort("filaPendente")} className="cursor-pointer">
                  Fila <ArrowUpDown className="inline h-3 w-3 ml-1" />
                </TableHead>
                <TableHead onClick={() => handleSort("pacingHoje")} className="cursor-pointer">
                  Pacing <ArrowUpDown className="inline h-3 w-3 ml-1" />
                </TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRanking.map((corretor) => (
                <TableRow 
                  key={corretor.corretorId}
                  className="cursor-pointer hover:bg-accent/5"
                  onClick={() => navigate(`/producao/corretor/${corretor.corretorId}`)}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium">{corretor.corretorName}</p>
                      <p className="text-xs text-muted-foreground">{corretor.gestorName}</p>
                    </div>
                  </TableCell>
                  <TableCell>{corretor.ligacoes}</TableCell>
                  <TableCell>{corretor.atendimentos}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Progress value={corretor.taxaSucesso} className="h-2" />
                      <span className="text-xs">{corretor.taxaSucesso.toFixed(1)}%</span>
                    </div>
                  </TableCell>
                  <TableCell>{corretor.agendados}</TableCell>
                  <TableCell>{corretor.repassarBitrix}</TableCell>
                  <TableCell>
                    <Badge variant={corretor.filaPendente > 0 ? "destructive" : "secondary"}>
                      {corretor.filaPendente}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        corretor.pacingHoje >= 80 ? "default" : 
                        corretor.pacingHoje >= 50 ? "secondary" : 
                        "destructive"
                      }
                    >
                      {corretor.pacingHoje.toFixed(0)}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/producao/corretor/${corretor.corretorId}`);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
