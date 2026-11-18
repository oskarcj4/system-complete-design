# Helpers para generar las guías de proyectos (series SEC, IA, ML y A) con el marcado del curso.
# Cada guía es un script que arma un fragmento con <!--META--> y llama a tools/mkguide.py.
import html, json, pathlib, re, subprocess, sys, textwrap

ROOT = pathlib.Path(r'C:\Users\oskar\Desktop\ia-system-desing')
SCR = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / 'tools'))
from seqdiag import seq  # noqa: E402

def E(s):
    return html.escape(s, quote=False)

def A(s):
    return html.escape(s, quote=True)

# ---------------------------------------------------------------- SVG

def _wrap(t, n):
    return textwrap.wrap(t, n) or ['']

def marker(fid):
    return (f'<defs><marker id="{fid}a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" '
            f'orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="dg-arrow"/></marker></defs>')

def svg(fid, w, h, title, desc, body):
    return (f'<svg viewBox="0 0 {w} {h}" role="img" aria-labelledby="{fid}t {fid}d">\n'
            f'<title id="{fid}t">{E(title)}</title>\n<desc id="{fid}d">{E(desc)}</desc>\n'
            f'{marker(fid)}\n{body}\n</svg>')

def box(x, y, w, h, label, sub=None, layer='service', part=None, cls=None):
    rect = (f'<rect class="{cls}" x="{x}" y="{y}" width="{w}" height="{h}" rx="8"/>' if cls else
            f'<rect class="dg-layer" x="{x}" y="{y}" width="{w}" height="{h}" rx="8" style="--c: var(--l-{layer})"/>')
    cx = x + w / 2
    if sub:
        t = (f'<text class="dg-label" x="{cx:g}" y="{y + h / 2 - 4:g}" text-anchor="middle">{E(label)}</text>'
             f'<text class="dg-tiny dg-mono" x="{cx:g}" y="{y + h / 2 + 12:g}" text-anchor="middle">{E(sub)}</text>')
    else:
        t = f'<text class="dg-label" x="{cx:g}" y="{y + h / 2 + 5:g}" text-anchor="middle">{E(label)}</text>'
    g = rect + t
    return f'<g data-part="{part}">{g}</g>' if part else g

def edge(fid, d, dashed=False, label=None, lx=None, ly=None, anchor='middle'):
    da = ' stroke-dasharray="6 4"' if dashed else ''
    s = f'<path class="dg-edge"{da} d="{d}" marker-end="url(#{fid}a)"/>'
    if label:
        s += f'<text class="dg-tiny" x="{lx}" y="{ly}" text-anchor="{anchor}">{E(label)}</text>'
    return s

def pin(n, x, y):
    return f'<g class="pl-pin"><circle cx="{x}" cy="{y}" r="10"/><text x="{x}" y="{y + 4}" text-anchor="middle">{n}</text></g>'

def text(x, y, t, cls='dg-tiny', anchor='start', style=None):
    st = f' style="{style}"' if style else ''
    return f'<text class="{cls}" x="{x}" y="{y}" text-anchor="{anchor}"{st}>{E(t)}</text>'

def lines(x, y, t, n=40, cls='dg-tiny', step=15, anchor='start'):
    out = []
    for i, ln in enumerate(_wrap(t, n)):
        out.append(text(x, y + i * step, ln, cls, anchor))
    return ''.join(out), y + len(_wrap(t, n)) * step

def figure(svgs, caption, arch=False):
    a = ' data-arch' if arch else ''
    return (f'<figure class="figure"{a}>\n<div class="figure-frame">\n{svgs}\n</div>\n'
            f'<figcaption>{caption}</figcaption>\n</figure>\n')

def cards(fid, title, desc, items, layer='service'):
    """Tarjetas de repaso: (título, lo que se vio, cómo vuelve). Hasta 3 por fila."""
    n = len(items)
    per = min(3, n)
    w = (730 - (per - 1) * 16) / per
    chars = int(w / 6.6)
    rows = (n + per - 1) // per
    body = []
    rh = 0
    # alto de fila: el texto más largo
    hs = []
    for t, vis, vu in items:
        hs.append(64 + 15 * len(_wrap(vis, chars)) + 30 + 15 * len(_wrap(vu, chars)) + 10)
    rh = max(hs)
    for i, (t, vis, vu) in enumerate(items):
        r, c = divmod(i, per)
        x = 20 + c * (w + 16)
        y = 16 + r * (rh + 16)
        body.append(f'<rect class="dg-layer" style="--c: var(--l-{layer})" x="{x:g}" y="{y}" width="{w:g}" height="{rh}" rx="8"/>')
        body.append(text(x + 12, y + 24, t, 'dg-group'))
        body.append(text(x + 12, y + 46, 'Lo que se vio', 'dg-tiny', style='font-weight:600'))
        s, yy = lines(x + 12, y + 64, vis, chars)
        body.append(s)
        body.append(text(x + 12, yy + 12, 'Cómo vuelve', 'dg-tiny', style='font-weight:600'))
        s, _ = lines(x + 12, yy + 30, vu, chars)
        body.append(s)
    h = 16 + rows * (rh + 16)
    return svg(fid, 770, h, title, desc, '\n'.join(body))

def ficha(fid, name, entra, hace, sale, ejemplo, falla, donde):
    desc = (f'Ficha de {name}. Qué entra: {entra} Qué hace: {hace} Qué sale: {sale} Ejemplo: {" ".join(ejemplo)} '
            f'Qué falla sin él: {falla} Dónde vive: {donde}')
    b = []
    cols = [('Qué entra', entra, None), ('Qué hace', hace, 'gpu'), ('Qué sale', sale, None)]
    h1 = max(102, max(44 + 16 * len(_wrap(t, 30)) for _, t, _ in cols))
    for i, (lab, t, layer) in enumerate(cols):
        x = 20 + i * 259
        if layer:
            b.append(f'<rect class="dg-layer" style="--c: var(--l-{layer})" x="{x}" y="16" width="212" height="{h1}" rx="8"/>')
        else:
            b.append(f'<rect class="dg-box" x="{x}" y="16" width="212" height="{h1}" rx="8"/>')
        b.append(text(x + 12, 36, lab, 'dg-group'))
        for j, ln in enumerate(_wrap(t, 30)):
            b.append(text(x + 12, 56 + 16 * j, ln))
    my = 16 + h1 / 2
    b.append(f'<path class="dg-edge" d="M234 {my:g} H275" marker-end="url(#{fid}a)"/>')
    b.append(f'<path class="dg-edge" d="M493 {my:g} H534" marker-end="url(#{fid}a)"/>')
    y2 = 16 + h1 + 14
    he = 40 + 16 * len(ejemplo) + 6
    b.append(f'<rect class="dg-box" x="20" y="{y2:g}" width="730" height="{he}" rx="8" style="fill: var(--bg-2)"/>')
    b.append(text(32, y2 + 20, 'Ejemplo', 'dg-group'))
    for j, ln in enumerate(ejemplo):
        b.append(f'<text class="dg-tiny dg-mono" x="32" y="{y2 + 40 + 16 * j:g}" style="white-space:pre">{E(ln)}</text>')
    y3 = y2 + he + 14
    h3 = max(86, 40 + 16 * max(len(_wrap(falla, 54)), len(_wrap(donde, 54))) + 6)
    b.append(f'<rect class="dg-warnbox" x="20" y="{y3:g}" width="357" height="{h3}" rx="8"/>')
    b.append(text(32, y3 + 20, 'Qué falla sin él', 'dg-group'))
    for j, ln in enumerate(_wrap(falla, 54)):
        b.append(text(32, y3 + 40 + 16 * j, ln))
    b.append(f'<rect class="dg-box" x="393" y="{y3:g}" width="357" height="{h3}" rx="8"/>')
    b.append(text(405, y3 + 20, 'Dónde vive', 'dg-group'))
    for j, ln in enumerate(_wrap(donde, 54)):
        b.append(text(405, y3 + 40 + 16 * j, ln))
    h = int(y3 + h3 + 16)
    return svg(fid, 770, h, 'Ficha: ' + name, desc, '\n'.join(b))

def flow(fid, title, desc, steps, layer='service', note=None):
    """Fila de cajas conectadas: steps = [(label, sub)] en una o dos filas."""
    n = len(steps)
    per = min(n, 4)
    w = (730 - (per - 1) * 40) / per
    rows = (n + per - 1) // per
    b = []
    for i, (lab, sub) in enumerate(steps):
        r, c = divmod(i, per)
        x = 20 + c * (w + 40)
        y = 20 + r * 110
        b.append(f'<rect class="dg-layer" style="--c: var(--l-{layer})" x="{x:g}" y="{y}" width="{w:g}" height="70" rx="8"/>')
        b.append(text(x + w / 2, y + 26, lab, 'dg-label', 'middle'))
        for j, ln in enumerate(_wrap(sub, int(w / 6.6))[:2]):
            b.append(text(x + w / 2, y + 46 + 15 * j, ln, 'dg-tiny', 'middle'))
        if i + 1 < n:
            if c + 1 < per:
                b.append(f'<path class="dg-edge" d="M{x + w + 2:g} {y + 35} H{x + w + 36:g}" marker-end="url(#{fid}a)"/>')
            else:
                b.append(f'<path class="dg-edge" d="M{x + w / 2:g} {y + 72} V{y + 100} H{20 + w / 2:g} V{y + 108}" marker-end="url(#{fid}a)"/>')
    h = 20 + rows * 110
    if note:
        b.append(text(20, h + 4, note, 'dg-small'))
        h += 20
    return svg(fid, 770, h, title, desc, '\n'.join(b))

def compare(fid, title, desc, left, right, lt='Sin', rt='Con', bad_left=True):
    """Dos columnas: (título, [líneas]) con caja warn a la izquierda y ok a la derecha."""
    b = []
    nl = max(len(left), len(right))
    h = 60 + 20 * nl + 20
    b.append(f'<rect class="{"dg-warnbox" if bad_left else "dg-box"}" x="20" y="16" width="357" height="{h - 32}" rx="8"/>')
    b.append(f'<rect class="dg-layer" style="--c: var(--l-service)" x="393" y="16" width="357" height="{h - 32}" rx="8"/>')
    b.append(text(32, 40, lt, 'dg-group'))
    b.append(text(405, 40, rt, 'dg-group'))
    for j, ln in enumerate(left):
        b.append(text(32, 66 + 20 * j, ln, 'dg-small'))
    for j, ln in enumerate(right):
        b.append(text(405, 66 + 20 * j, ln, 'dg-small'))
    return svg(fid, 770, h, title, desc, '\n'.join(b))

# ---------------------------------------------------------------- bloques HTML

def table(head, rows, right=()):
    th = ''.join(f'<th>{c}</th>' for c in head)
    trs = []
    for r in rows:
        tds = ''.join((f'<td class="r">{c}</td>' if i in right else f'<td>{c}</td>') for i, c in enumerate(r))
        trs.append(f'<tr>{tds}</tr>')
    return ('<div class="table-wrap">\n<table class="t">\n<thead><tr>' + th + '</tr></thead>\n<tbody>\n'
            + '\n'.join(trs) + '\n</tbody>\n</table>\n</div>\n')

def analogy(t):
    return f'<aside class="callout callout--analogy">\n  <p class="callout-label">Analogía</p>\n  <p>{t}</p>\n</aside>\n'

def callout(kind, label, body):
    return f'<aside class="callout callout--{kind}">\n<p class="callout-label">{label}</p>\n{body}\n</aside>\n'

def pydef(t, label='Python de por medio'):
    return f'<aside class="callout callout--def">\n<p class="callout-label">{label}</p>\n<p>{t}</p>\n</aside>\n'

def code(lang, src, file=None):
    f = f' data-file="{A(file)}"' if file else ''
    return f'<pre data-lang="{lang}"{f}><code>{E(src)}</code></pre>\n'

def try_(cmd, expect, lang='bash'):
    return ('<aside class="callout callout--try">\n  <p class="callout-label">Pruébalo ahora</p>\n'
            + code(lang, cmd) + f'  <p>{expect}</p>\n</aside>\n')

def errs(items):
    lis = '\n'.join(f'    <li><code>{E(e)}</code>: {fix}</li>' for e, fix in items)
    return ('<aside class="callout callout--fail">\n  <p class="callout-label">Errores típicos</p>\n'
            f'  <ul class="pj-errs">\n{lis}\n  </ul>\n</aside>\n')

def why(dec, desc, mal):
    return ('<dl class="pj-why">\n'
            f'<div><dt>La decisión</dt><dd>{dec}</dd></div>\n'
            f'<div><dt>Lo que descartas</dt><dd>{desc}</dd></div>\n'
            f'<div><dt>Qué puede salir mal</dt><dd>{mal}</dd></div>\n</dl>\n')

def predict(eid):
    return f'<div data-exercise="{eid}"></div>\n'

def step_map(where, entra, sale, cambia, concepto, tiempo):
    return (f'<div class="step-map" data-where="{where}">\n  <dl class="step-map-rows">\n'
            f'    <div><dt>Entra</dt><dd>{entra}</dd></div>\n'
            f'    <div><dt>Sale</dt><dd>{sale}</dd></div>\n'
            f'    <div><dt>Cambia</dt><dd>{cambia}</dd></div>\n'
            f'    <div><dt>Concepto nuevo</dt><dd>{concepto}</dd></div>\n'
            f'    <div><dt>Tiempo</dt><dd>{tiempo}</dd></div>\n  </dl>\n</div>\n')

def step(sid, title, smap, body, opt=None):
    badge = ' <span class="badge badge--opt">Opcional</span>' if opt else ''
    o = f'<p>{opt}</p>\n' if opt else ''
    return f'<h3 id="{sid}">{title}{badge}</h3>\n' + smap + o + body

def hito(n, total, mins, title, text_, steps):
    lis = '\n'.join(f'    <li><a href="#{sid}">{t}</a></li>' for sid, t in steps)
    return (f'<aside class="hito" id="hito-{n}" data-toc="skip" aria-labelledby="hito-{n}-t">\n'
            f'  <p class="hito-num">Hito {n} de {total}, unos {mins} min</p>\n'
            f'  <p class="hito-title" id="hito-{n}-t">{title}</p>\n  <p>{text_}</p>\n'
            f'  <ol class="hito-steps">\n{lis}\n  </ol>\n</aside>\n')

def done(items, cmd, expect, lang='bash'):
    lis = '\n'.join(f'    <li>{i}</li>' for i in items)
    return ('<aside class="callout callout--done">\n  <p class="callout-label">Qué ya funciona</p>\n'
            f'  <ul>\n{lis}\n  </ul>\n  <p>Compruébalo de una vez:</p>\n' + code(lang, cmd) + f'  <p>{expect}</p>\n</aside>\n')

def fail(n, title, provoca, pasa, importa, deshaz, before=None):
    b = f'<p><b>Antes de provocarla:</b> {before}</p>' if before else ''
    return (f'<aside class="callout callout--fail">\n<p class="callout-label">Falla {n}: {title}</p>\n{b}'
            f'<p><b>Provócala.</b> {provoca}</p><p><b>Qué tiene que pasar.</b> {pasa} <b>Por qué importa.</b> {importa} {deshaz}</p>\n</aside>\n')

COMMENT = {'python': '#', 'bash': '#', 'yaml': '#', 'hcl': '#', 'rego': '#', 'toml': '#', 'dockerfile': '#',
           'nginx': '#', 'ini': ';', 'sql': '--', 'javascript': '//', 'java': '//', 'js': '//', 'xml': 'xml',
           'shell': '#', 'text': '#', 'php': '//'}

class Walk:
    """Recorrido de un archivo. Las líneas que son solo '@' (con su sangría) se vuelven marcas '# (N)'."""
    def __init__(self, lang, path, que, quien, entra, sale, where, pseudo, full_lang=None):
        self.lang, self.path = lang, path
        self.card = (que, quien, entra, sale, where)
        self.pseudo = pseudo
        self.blocks = []
        self.parts = []   # html intercalado después de bloques

    def block(self, src, keys, after='', gap=0):
        self.blocks.append((src.strip('\n'), keys, after))
        self.gaps = getattr(self, 'gaps', []) + [gap]
        return self

    def full(self):
        out = []
        gaps = getattr(self, 'gaps', [0] * len(self.blocks))
        for (src, _, _), g in zip(self.blocks, gaps):
            out += [ln for ln in src.split('\n') if ln.strip() != '@'] + [''] * g
        while out and out[-1] == '':
            out.pop()
        return '\n'.join(out)

    def from_file(self, src, plan):
        """Corta un archivo real en bloques. plan: [(inicio, [(marca, clave), ...], after), ...].
        inicio y marca son textos que aparecen en la línea donde empieza el bloque o va la marca."""
        lines = src.rstrip('\n').split('\n')

        def find(sub, frm):
            for i in range(frm, len(lines)):
                if sub in lines[i]:
                    return i
            raise AssertionError((self.path, 'no encuentro', sub))
        starts = [0]
        for item in plan[1:]:
            starts.append(find(item[0], starts[-1] + 1))
        for k, item in enumerate(plan):
            marks = item[1]
            after = item[2] if len(item) > 2 else ''
            fin = starts[k + 1] if k + 1 < len(plan) else len(lines)
            chunk = lines[starts[k]:fin]
            gap = 0
            while chunk and chunk[-1] == '':
                chunk.pop()
                gap += 1
            out, pos, keys = [], 0, []
            for sub, key in marks:
                j = next((i for i in range(pos, len(chunk)) if sub in chunk[i]), None)
                assert j is not None, (self.path, 'marca no encontrada', sub)
                out += chunk[pos:j]
                ind = chunk[j][:len(chunk[j]) - len(chunk[j].lstrip())]
                out.append(ind + '@')
                pos = j
                keys.append(key)
            out += chunk[pos:]
            self.block('\n'.join(out), keys, after, gap)
        assert self.full() == src.rstrip('\n'), (self.path, 'el recorrido no reproduce el archivo')
        return self

    def html(self):
        c = COMMENT[self.lang]
        n = 0
        body = []
        full = self.full()
        nlines = len(full.split('\n'))
        que, quien, entra, sale, where = self.card
        fid = 'archivo-' + re.sub(r'[^a-z0-9]+', '-', self.path.lower()).strip('-')
        body.append(f'<div class="file-card" data-where="{where}">\n'
                    f'  <h4 class="file-card-path" id="{fid}">{E(self.path)}<span class="file-card-size">{nlines} líneas</span></h4>\n'
                    f'  <dl class="file-card-rows">\n'
                    f'    <div><dt>Qué hace</dt><dd>{que}</dd></div>\n'
                    f'    <div><dt>Quién lo usa</dt><dd>{quien}</dd></div>\n'
                    f'    <div><dt>Qué entra</dt><dd>{entra}</dd></div>\n'
                    f'    <div><dt>Qué sale</dt><dd>{sale}</dd></div>\n  </dl>\n</div>\n')
        lis = '\n'.join(f'    <li>{p}</li>' for p in self.pseudo)
        body.append(f'<div class="pseudo">\n  <p class="pseudo-label">En palabras, antes del código</p>\n  <ol>\n{lis}\n  </ol>\n</div>\n')
        for src, keys, after in self.blocks:
            start = n
            out = []
            for ln in src.split('\n'):
                if ln.strip() == '@':
                    n += 1
                    ind = ln[:len(ln) - len(ln.lstrip())]
                    out.append(f'{ind}<!-- ({n}) -->' if c == 'xml' else f'{ind}{c} ({n})')
                else:
                    out.append(ln)
            assert n - start == len(keys), (self.path, n - start, len(keys), src[:60])
            assert len(out) <= 26, (self.path, len(out), src[:60])
            body.append(code(self.lang, '\n'.join(out)))
            if keys:
                st = f' style="counter-reset: ck {start}"' if start else ''
                kl = '\n'.join(f'  <li>{k}</li>' for k in keys)
                body.append(f'<ol class="code-key"{st}>\n{kl}\n</ol>\n')
            body.append(after)
        body.append(f'<details class="solution file-full" data-toc="skip">\n  <summary>Ver {E(self.path)} completo, sin marcas, para copiar</summary>\n'
                    f'  <div class="solution-body">\n' + code(self.lang, full, self.path) + '  </div>\n</details>\n')
        return ''.join(body)

def whole(lang, path, src, que, quien, entra, sale, where):
    """Un archivo corto que va entero, sin recorrido."""
    nlines = len(src.strip('\n').split('\n'))
    fid = 'archivo-' + re.sub(r'[^a-z0-9]+', '-', path.lower()).strip('-')
    return (f'<div class="file-card" data-where="{where}">\n'
            f'  <h4 class="file-card-path" id="{fid}">{E(path)}<span class="file-card-size">{nlines} líneas</span></h4>\n'
            f'  <dl class="file-card-rows">\n'
            f'    <div><dt>Qué hace</dt><dd>{que}</dd></div>\n'
            f'    <div><dt>Quién lo usa</dt><dd>{quien}</dd></div>\n'
            f'    <div><dt>Qué entra</dt><dd>{entra}</dd></div>\n'
            f'    <div><dt>Qué sale</dt><dd>{sale}</dd></div>\n  </dl>\n</div>\n' + code(lang, src.strip('\n'), path))

def plate_key(items):
    lis = '\n'.join(f'  <li><b>{t}</b><span>{d} <a href="#{h}">{l}</a></span></li>' for t, d, h, l in items)
    return f'<ol class="plate-key">\n{lis}\n</ol>\n'

def plate(fid, title, desc, terms, layer='service'):
    """Lámina simple: una caja por término con su número, en una rejilla de 3 columnas."""
    per = 3
    w = (730 - 2 * 16) / per
    rows = (len(terms) + per - 1) // per
    b = []
    for i, (t, sub) in enumerate(terms):
        r, c = divmod(i, per)
        x = 20 + c * (w + 16)
        y = 16 + r * 76
        b.append(f'<rect class="dg-layer" style="--c: var(--l-{layer})" x="{x:g}" y="{y}" width="{w:g}" height="60" rx="8"/>')
        b.append(text(x + w / 2, y + 26, t, 'dg-label', 'middle'))
        b.append(text(x + w / 2, y + 44, sub, 'dg-tiny dg-mono', 'middle'))
        b.append(pin(i + 1, f'{x + 16:g}', y + 16))
    return svg(fid, 770, 16 + rows * 76, title, desc, '\n'.join(b))

# ---------------------------------------------------------------- página

def objectives(items):
    lis = '\n'.join(f'<li>{i}</li>' for i in items)
    return f'<section class="objectives" data-toc="skip" aria-labelledby="obj">\n<h2 class="plain" id="obj">Al terminar podrás</h2>\n<ul>\n{lis}\n</ul>\n</section>\n'

def repo_box(pid, head, checks):
    lis = '\n'.join(f'<li data-check="{k}">{t}</li>' for k, t in checks)
    return (f'<h2 id="repositorio">Tu repositorio</h2>\n<div class="pj-repo" data-repo="{pid}">\n'
            f'<p class="pj-repo-head">{head}</p>\n<ul class="pj-checks">\n{lis}\n</ul>\n</div>\n')

def connect(items):
    lis = '\n'.join(f'<li>\n<p class="pj-connect-title">{t}</p>\n<p>{b}</p>\n</li>' for t, b in items)
    return f'<h2 id="conectar">Cómo conectar</h2>\n<ul class="pj-connect">\n{lis}\n</ul>\n'

def build(meta, body, name):
    frag = SCR / f'{name}.frag.html'
    frag.write_text('<!--META ' + json.dumps(meta, ensure_ascii=False) + '-->\n' + body, encoding='utf-8')
    r = subprocess.run([sys.executable, str(ROOT / 'tools' / 'mkguide.py'), str(frag)], capture_output=True, text=True, cwd=ROOT)
    print(r.stdout, r.stderr)
    return r.returncode

def check_ids(body):
    ids = re.findall(r'\sid="([^"]+)"', body)
    dup = {i for i in ids if ids.count(i) > 1}
    assert not dup, dup
    hrefs = set(re.findall(r'href="#([^"]+)"', body))
    missing = hrefs - set(ids) - {'contenido'}
    assert not missing, missing
