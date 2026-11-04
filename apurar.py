"""Apura a votação: totais, quem votou e nomes repetidos. Só lê; não altera nenhum voto.
Uso: python apurar.py
Precisa de firebase-config.js preenchido e de .secrets/apuracao.txt (e-mail na linha 1, senha na linha 2)."""
import json, re, unicodedata, urllib.parse, urllib.request
from collections import Counter, defaultdict
from pathlib import Path

AQUI = Path(__file__).parent
MODELOS = {"assinatura": "Assinatura", "simbolo-gigante": "Símbolo gigante", "padrao": "Padrão", "organismo": "Organismo", "colmeia": "Colmeia"}

cfg = (AQUI / "firebase-config.js").read_text(encoding="utf-8")
api = re.search(r'apiKey:\s*"([^"]+)"', cfg).group(1)
proj = re.search(r'projectId:\s*"([^"]+)"', cfg).group(1)
email, senha = (AQUI / ".secrets/apuracao.txt").read_text(encoding="utf-8").split()[:2]


def pedir(url, corpo=None, token=None):
    cab = {"Content-Type": "application/json"}
    if token:
        cab["Authorization"] = "Bearer " + token
    dados = json.dumps(corpo).encode() if corpo is not None else None
    with urllib.request.urlopen(urllib.request.Request(url, dados, cab), timeout=30) as r:
        return json.load(r)


token = pedir("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" + api,
              {"email": email, "password": senha, "returnSecureToken": True})["idToken"]


def colecao(nome):
    base = f"https://firestore.googleapis.com/v1/projects/{proj}/databases/(default)/documents/{nome}?pageSize=300"
    docs, pagina = [], None
    while True:
        r = pedir(base + ("&pageToken=" + urllib.parse.quote(pagina) if pagina else ""), token=token)
        docs += r.get("documents", [])
        pagina = r.get("nextPageToken")
        if not pagina:
            return docs


def chave(nome):
    t = unicodedata.normalize("NFD", nome.casefold())
    return " ".join("".join(c for c in t if not unicodedata.combining(c)).split())


nomes = [{"nome": d["fields"]["nome"]["stringValue"], "modelo": d["fields"]["modelo"]["stringValue"]} for d in colecao("nomes")]
votos = colecao("votos")
grupos = defaultdict(list)
for v in nomes:
    grupos[chave(v["nome"])].append(v)


def placar(contagem, total):
    for m, n in sorted(((m, contagem.get(m, 0)) for m in MODELOS), key=lambda x: -x[1]):
        print(f"  {MODELOS[m]:<16} {n:>3} votos  {round(n * 100 / total) if total else 0:>3}%")


print(f"VOTOS REGISTRADOS: {len(votos)}")
placar(Counter(d["fields"]["modelo"]["stringValue"] for d in votos), len(votos))
print("\nQUEM VOTOU")
for v in sorted(nomes, key=lambda v: chave(v["nome"])):
    print(f"  {v['nome']}: {MODELOS.get(v['modelo'], v['modelo'])}")
rep = {k: g for k, g in grupos.items() if len(g) > 1}
print("\nNOMES REPETIDOS: " + ("nenhum" if not rep else ""))
for g in rep.values():
    print(f"  {g[0]['nome']}: {len(g)} votos ({', '.join(MODELOS.get(v['modelo'], v['modelo']) for v in g)})")
if rep:
    print("\nPLACAR CONTANDO CADA NOME UMA VEZ (só nomes com um voto, ou com todos os votos no mesmo modelo)")
    unicos = [g[0]["modelo"] for g in grupos.values() if len({v["modelo"] for v in g}) == 1]
    placar(Counter(unicos), len(unicos))
    print(f"  Fora da conta por votar em modelos diferentes: {len(grupos) - len(unicos)} nome(s)")
