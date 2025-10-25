import { Lead } from "@/contexts/LeadsContext";

interface CacheIndex {
  byCorretor: Record<string, Lead[]>;
  byCampanha: Record<string, Lead[]>;
  byDay: Record<string, Lead[]>;
}

let cache: CacheIndex | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5000; // 5 segundos

export function buildCache(leads: Lead[]): CacheIndex {
  const now = Date.now();
  
  // Se o cache ainda é válido, retornar
  if (cache && now - cacheTimestamp < CACHE_TTL) {
    return cache;
  }

  const byCorretor: Record<string, Lead[]> = {};
  const byCampanha: Record<string, Lead[]> = {};
  const byDay: Record<string, Lead[]> = {};

  leads.forEach(lead => {
    // Índice por corretor
    if (lead.corretorId) {
      if (!byCorretor[lead.corretorId]) {
        byCorretor[lead.corretorId] = [];
      }
      byCorretor[lead.corretorId].push(lead);
    }

    // Índice por campanha
    if (lead.campanha) {
      if (!byCampanha[lead.campanha]) {
        byCampanha[lead.campanha] = [];
      }
      byCampanha[lead.campanha].push(lead);
    }

    // Índice por dia
    if (lead.dataAtendimento) {
      const day = lead.dataAtendimento.split("T")[0];
      if (!byDay[day]) {
        byDay[day] = [];
      }
      byDay[day].push(lead);
    }
  });

  cache = { byCorretor, byCampanha, byDay };
  cacheTimestamp = now;

  return cache;
}

export function invalidateCache() {
  cache = null;
  cacheTimestamp = 0;
}

export function getFromCache(): CacheIndex | null {
  const now = Date.now();
  if (cache && now - cacheTimestamp < CACHE_TTL) {
    return cache;
  }
  return null;
}
