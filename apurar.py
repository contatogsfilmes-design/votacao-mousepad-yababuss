"""Apura a votação: placar e quem votou. Só lê; não altera nenhum voto.
Uso: python apurar.py [base]  (sem argumento, usa a base de votos-config.js)
Cada apuração salva uma cópia em apuracoes/, fora do repositório."""
import json, re, sys, urllib.request
from collections import Counter
from datetime import datetime
from pathlib import Path

AQUI = Path(__file__).parent
MODELOS = {"assinatura": "Assinatura", "simbolo-gigante": "Símbolo gigante", "padrao": "Padrão", "organismo": "Organismo", "colmeia": "Colmeia"}
base = sys.argv[1] if len(sys.argv) > 1 else re.search(r'VOTOS_BASE = "([^"]+)"', (AQUI / "votos-config.js").read_text(encoding="utf-8")).group(1)
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def grupo(i):
    pedido = urllib.request.Request(f"https://textdb.dev/api/data/{base}-{i}", headers={"User-Agent": "apuracao-votacao"})
    with urllib.request.urlopen(pedido, timeout=30) as r:
        texto = r.read().decode("utf-8").strip()
    return json.loads(texto) if texto else {}


votos = []
for i in range(16):
    votos += grupo(i).values()
votos = [v for v in votos if v.get("modelo") in MODELOS]
placar = Counter(v["modelo"] for v in votos)
print(f"VOTOS: {len(votos)}")
for m, n in sorted(((m, placar.get(m, 0)) for m in MODELOS), key=lambda x: -x[1]):
    print(f"  {MODELOS[m]:<16} {n:>3} votos  {round(n * 100 / len(votos)) if votos else 0:>3}%")
print("\nQUEM VOTOU")
for v in sorted(votos, key=lambda v: v["nome"].casefold()):
    print(f"  {v['nome']}: {MODELOS[v['modelo']]}")
pasta = AQUI / "apuracoes"
pasta.mkdir(exist_ok=True)
(pasta / f"{base}-{datetime.now():%Y-%m-%d-%H%M%S}.json").write_text(json.dumps(votos, ensure_ascii=False, indent=1), encoding="utf-8")
