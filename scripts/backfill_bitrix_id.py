#!/usr/bin/env python3
"""Grava profiles.bitrix_id no Ofertativa a partir dos usuarios do Hub (25/10/2026).
Casa por e-mail; os 12 que nao batem por e-mail entram pelo mapa manual abaixo (conferidos nome a nome).
Idempotente: so escreve quando o valor difere. Uso: python3 backfill_bitrix_id.py hub_users.json [--aplicar]"""
import json, os, sys, urllib.request

ENV = {}
for ln in open(os.path.expanduser("~/.secrets/ofertativa.env")):
    ln = ln.strip()
    if "=" in ln and not ln.startswith("#"):
        k, v = ln.split("=", 1); ENV[k] = v.strip().strip('"').strip("'")
BASE = ENV["OFERTATIVA_NOVO_URL"].rstrip("/") + "/functions/v1/admin-users/"
HDR = {"Content-Type": "application/json", "x-admin-token": ENV["OFERTATIVA_ADMIN_TOKEN"], "apikey": ENV["OFERTATIVA_NOVO_ANON"]}

# e-mail no Ofertativa -> id do Hub (os que nao batem por e-mail; conferidos em 25/10/2026)
MANUAL = {
    "clarissebarcellos@gmail.com": 57, "carolrosa@corretor.buzz": 58, "viniciusdmg@creci.org.br": 61,
    "annalore@annalore.com.br": 64, "santinicorretorbuzz@gmail.com": 67, "giovanimelloimoveis@gmail.com": 89,
    "claudiopacheco.imoveis@gmail.com": 93, "rossanademedeiroscorrea@gmail.com": 94,
    "nathammendieta0399@gmail.com": 100, "danielle.dourado@corretor.buzzz": 119, "ledolenga@gmail.com": 151,
    "cacopresser@gmail.com": 56,
}


def call(action, body):
    req = urllib.request.Request(BASE + action, data=json.dumps(body).encode(), headers=HDR, method="POST")
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


hub = json.load(open(sys.argv[1]))
aplicar = "--aplicar" in sys.argv
por_id = {u["id"]: u for u in hub}
por_email = {(u["email"] or "").lower(): u for u in hub}
profs = call("profiles-list", {})["profiles"]
planos, iguais, sem = [], 0, []
for p in profs:
    e = p["email"].lower()
    u = por_email.get(e) or (por_id.get(MANUAL[e]) if e in MANUAL else None)
    if not u or not u["bitrix_id"]:
        sem.append((p["name"], e)); continue
    if p.get("bitrix_id") == u["bitrix_id"]:
        iguais += 1; continue
    planos.append((p["id"], p["name"], e, u["bitrix_id"], u["nome"]))
print(f"{len(profs)} perfis · {iguais} ja certos · {len(planos)} a gravar · {len(sem)} sem par no Hub")
for x in planos: print("  ", x[1], "<-", x[3], f"({x[4]})")
for x in sem: print("   sem par:", x)
if aplicar:
    for pid, nome, e, bx, _ in planos:
        r = call("profile-update", {"id": pid, "bitrix_id": bx})
        assert r.get("profile", {}).get("bitrix_id") == bx, r
    print("gravados", len(planos))
