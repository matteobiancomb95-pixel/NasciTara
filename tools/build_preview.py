#!/usr/bin/env python3
"""
Costruisce una preview a file singolo di NasciTara, senza toolchain Node.

I sorgenti reali di src/ vengono concatenati in ordine di dipendenza, privati
delle sole righe import/export, e compilati nel browser da Babel standalone
(preset typescript + react). Non e' una riproduzione: e' lo stesso codice che
gira in produzione, solo assemblato diversamente.

Due sostituzioni, entrambe dichiarate nel file generato:
  - le immagini del brand diventano data URI (nel bundle Vite le risolve lui);
  - Supabase non esiste in preview, quindi il client e' uno stub a null e
    l'iscrizione email non parte (il flusso prosegue comunque, come in
    produzione quando le variabili non sono configurate).

    python3 tools/build_preview.py [destinazione.html]
"""
import base64
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src"

ORDER = [
    "i18n/index.ts",
    "lib/percentilesHadlock1991.ts",
    "lib/efwHadlock.ts",
    "lib/efwWho.ts",
    "lib/biometry.ts",
    "lib/fetalLength.ts",
    "lib/trajectory.ts",
    "lib/customCurveGardosiLite.ts",
    "lib/gestationalAge.ts",
    "lib/nasciTara.ts",
    "lib/analysis.ts",
    "lib/projection.ts",
    "lib/emailSignup.ts",
    "lib/exportPdf.ts",
    "state/NasciTaraStore.tsx",
    "components/icons.tsx",
    "components/Field.tsx",
    "components/GrowthChart.tsx",
    "pages/LandingPage.tsx",
    "pages/PregnancyPage.tsx",
    "pages/MeasurementsPage.tsx",
    "components/ParentsContext.tsx",
    "pages/DashboardPage.tsx",
    "components/AppShell.tsx",
    "App.tsx",
]

CDN = "https://cdnjs.cloudflare.com/ajax/libs"
REACT = f"{CDN}/react/18.3.1/umd/react.production.min.js"
REACT_DOM = f"{CDN}/react-dom/18.3.1/umd/react-dom.production.min.js"
BABEL = f"{CDN}/babel-standalone/7.26.4/babel.min.js"
JSPDF = f"{CDN}/jspdf/2.5.2/jspdf.umd.min.js"


def strip_modules(src: str) -> str:
    """Toglie import ed export. I tipi restano: li cancella Babel."""
    src = re.sub(r"^\s*import[\s\S]*?from\s+'[^']*';\s*$", "", src, flags=re.M)
    src = re.sub(r"^\s*import\s+'[^']*';\s*$", "", src, flags=re.M)
    src = re.sub(r"^\s*export\s+\*\s+from\s+'[^']*';\s*$", "", src, flags=re.M)
    src = re.sub(r"^\s*export\s+\{[\s\S]*?\};\s*$", "", src, flags=re.M)
    src = re.sub(r"^export default ", "", src, flags=re.M)
    src = re.sub(r"^export ", "", src, flags=re.M)
    src = re.sub(r" as (number|string|boolean)\b", "", src)
    return src


def data_uri(path: pathlib.Path) -> str:
    return "data:image/png;base64," + base64.b64encode(path.read_bytes()).decode()


def build() -> str:
    tokens = (SRC / "styles/tokens.css").read_text()
    glob = (SRC / "styles/global.css").read_text().replace("@import './tokens.css';", "")

    logo = data_uri(SRC / "assets/brand/logo-mark.png")
    wordmark = data_uri(SRC / "assets/brand/wordmark.png")

    parts = [
        "/* React UMD: runtime JSX classico, non automatico */",
        "const { createContext, useContext, useCallback, useEffect, useMemo, useReducer, useRef, useState } = React;",
        "",
        "/* sostituzione 1: nel bundle Vite questi URL li risolve il bundler */",
        f'const logoUrl = "{logo}";',
        f'const wordmarkUrl = "{wordmark}";',
        "",
        "/* sostituzione 2: senza backend l'iscrizione email non parte, come in",
        "   produzione quando VITE_SUPABASE_URL non e' configurata */",
        "const supabase = null;",
    ]
    for rel in ORDER:
        parts.append(f"\n/* ===================== {rel} ===================== */")
        parts.append(strip_modules((SRC / rel).read_text()))
    parts.append(
        "\n/* montaggio: App resta nello scope della funzione compilata,"
        "\n   quindi il render va fatto qui dentro e non da fuori */"
        "\nReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));"
    )
    source = "\n".join(parts).replace("import.meta.env.DEV", "true").replace("import.meta.env.VITE_SUPABASE_URL", "undefined")

    return f"""<title>NasciTara</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito+Sans:opsz,wght@6..12,400;6..12,600;6..12,700&display=swap">
<style>
{tokens}
{glob}
#boot-error{{white-space:pre-wrap;font-family:ui-monospace,Menlo,monospace;font-size:12px;
  color:#333;background:#ffd0d7;border-radius:12px;padding:16px;margin:24px}}
</style>
<div id="root"></div>
<pre id="boot-error" hidden></pre>

<script src="{REACT}"></script>
<script src="{REACT_DOM}"></script>
<script src="{JSPDF}"></script>
<script src="{BABEL}"></script>

<script type="text/plain" id="nascitara-source">
{source}
</script>

<script>
// preset-typescript si attiva solo con un filename che abbia estensione .tsx,
// percio' la trasformazione va fatta a mano invece che con data-presets.
(function () {{
  var show = function (err) {{
    var box = document.getElementById('boot-error');
    box.hidden = false;
    box.textContent = 'Preview non avviata — ' + (err && err.message ? err.message : String(err));
  }};
  try {{
    var src = document.getElementById('nascitara-source').textContent;
    var out = Babel.transform(src, {{
      filename: 'nascitara.tsx',
      presets: [['typescript', {{ isTSX: true, allExtensions: true }}], 'react'],
    }}).code;
    new Function(out)();
  }} catch (err) {{
    show(err);
    if (window.console) console.error(err);
  }}
}})();
</script>
"""


if __name__ == "__main__":
    out = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "preview.html"
    out.write_text(build())
    print(f"{out}  ({out.stat().st_size // 1024} KB)")
