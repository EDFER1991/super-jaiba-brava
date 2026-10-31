"""Genera SuperJaibaBrava.html: un solo archivo con el juego y las imagenes incrustadas.
Se abre con doble clic en cualquier navegador (no necesita servidor).
Uso: python tools/build_single.py
"""
import base64
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

html = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
game = open(os.path.join(ROOT, "js", "game.js"), encoding="utf-8").read()

src = re.search(r"var SRC = window\.ASSETS \|\| (\{.*?\});", game, re.S).group(1)
assets = {}
for key, path in re.findall(r"(\w+): '([^']+)'", src):
    data = base64.b64encode(open(os.path.join(ROOT, path), "rb").read()).decode()
    assets[key] = "data:image/png;base64," + data

inline = "window.ASSETS = {" + ",".join('"%s":"%s"' % kv for kv in assets.items()) + "};\n"
html = re.sub(r"<!-- juego -->.*?<!-- /juego -->",
              lambda m: "<script>\n" + inline + "</script>\n<script>\n" + game.replace("</script", r"<\/script") + "\n</script>",
              html, flags=re.S)
out = os.path.join(ROOT, "SuperJaibaBrava.html")
open(out, "w", encoding="utf-8").write(html)
print(out, round(os.path.getsize(out) / 1024), "KB")
