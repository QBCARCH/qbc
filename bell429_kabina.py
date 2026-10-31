# -*- coding: utf-8 -*-
"""
BELL 429 - putnicka kabina (club konfiguracija 3 + 3, sto, zadnji zid sa prozorima)
Rhino 8 / Rhino 9 (Python 3 ili IronPython):  _ScriptEditor  ->  otvori fajl  ->  Run

Koordinate (u METRIMA, skripta sama skalira na jedinice dokumenta):
  X = duzina kabine (X=0 prednji otvor / prag, X=L zadnji zid sa prozorima)
  Y = sirina (levi zid Y=-W/2, desni zid Y=+W/2)
  Z = visina (Z=0 gornja ivica poda)

Sve mere su procena iz fotografije - menjaj ih u bloku PARAMETRI.
Svaki materijal je na svom sloju (prefiks B429_), pa se lako dodeljuju
V-Ray / Enscape / Rhino Render materijali.
"""
import math
import System.Drawing as sd
import Rhino
import Rhino.Geometry as rg
import Rhino.DocObjects as rdo
import scriptcontext as sc

# ============================ PARAMETRI (metri) ============================
L = 2.30            # duzina kabine
W = 1.60            # unutrasnja sirina
H = 1.32            # visina kabine u sredini
ZW = 0.95           # visina na kojoj zid prelazi u luk plafona
WALL = 0.04         # debljina zida/obloge
FLOOR_T = 0.05      # debljina poda
BULK_T = 0.05       # debljina zadnjeg zida

SEAT_W = 0.52       # sirina jednog sedista
PITCH = 0.58        # razmak sedista duz X
SEAT_X0 = 0.30      # pocetak prvog sedista od praga
SEAT_H = 0.46       # visina jastuka od poda
RECLINE = 10.0      # nagib naslona (stepeni)
BV = 0.14           # udaljenost podnozja naslona od zida
N_SEATS = 3         # broj sedista po strani

TABLE_GAP = 1       # sto se vezuje na naslon za ruku izmedju sedista 0 i 1 (desna strana)

# prozori na bocnim zidovima (x od, x do) i visina
SIDE_WIN = [(0.35, 1.05), (1.20, 1.90)]
SIDE_WIN_Z = (0.55, 0.92)
# prozori na zadnjem zidu (y od, y do) i visina
AFT_WIN = [(-0.56, -0.08), (0.08, 0.56)]
AFT_WIN_Z = (0.55, 1.08)

# ============================ POMOCNO ============================
K = Rhino.RhinoMath.UnitScale(Rhino.UnitSystem.Meters, sc.doc.ModelUnitSystem)
TOLM = max(sc.doc.ModelAbsoluteTolerance / K, 1e-4)
COUNT = [0]
LAYER_IDX = {}

LAYERS = [
    # ime, RGB, sjaj 0-1, providnost
    ("B429_Koza_svetla",          (186, 189, 193), 0.35, 0.0),
    ("B429_Koza_srednja",         (150, 153, 158), 0.35, 0.0),
    ("B429_Koza_tamna",           (42, 48, 62),    0.35, 0.0),
    ("B429_Sedista_konstrukcija", (60, 62, 66),    0.30, 0.0),
    ("B429_Pojasevi",             (170, 172, 175), 0.05, 0.0),
    ("B429_Hrom_metal",           (210, 212, 215), 0.95, 0.0),
    ("B429_Alu_prag",             (190, 192, 196), 0.70, 0.0),
    ("B429_Pod_tepih",            (72, 74, 78),    0.02, 0.0),
    ("B429_Pod_prostirka",        (26, 26, 28),    0.02, 0.0),
    ("B429_Zidovi_plafon",        (202, 204, 207), 0.15, 0.0),
    ("B429_Paneli_tamni",         (50, 56, 70),    0.25, 0.0),
    ("B429_Plafon_detalji",       (62, 64, 68),    0.25, 0.0),
    ("B429_Okviri_prozora",       (182, 185, 189), 0.20, 0.0),
    ("B429_Staklo_dan",           (240, 246, 255), 0.00, 0.0),
    ("B429_Sto",                  (28, 28, 30),    0.40, 0.0),
    ("B429_Oznake",               (200, 30, 30),   0.10, 0.0),
    ("B429_Savovi",               (92, 94, 98),    0.00, 0.0),
]


def make_layers():
    for name, rgb, shine, tr in LAYERS:
        idx = sc.doc.Layers.FindByFullPath(name, -1)
        if idx < 0:
            ly = rdo.Layer()
            ly.Name = name
            ly.Color = sd.Color.FromArgb(rgb[0], rgb[1], rgb[2])
            try:
                m = rdo.Material()
                m.DiffuseColor = sd.Color.FromArgb(rgb[0], rgb[1], rgb[2])
                m.Shine = shine * rdo.Material.MaxShine
                m.Transparency = tr
                if name == "B429_Staklo_dan":
                    m.EmissionColor = sd.Color.FromArgb(255, 255, 255)
                mi = sc.doc.Materials.Add(m)
                ly.RenderMaterialIndex = mi
            except Exception:
                pass
            idx = sc.doc.Layers.Add(ly)
        LAYER_IDX[name] = idx


def P(x, y, z):
    return rg.Point3d(x, y, z)


def V(x, y, z):
    return rg.Vector3d(x, y, z)


XA = rg.Vector3d.XAxis
YA = rg.Vector3d.YAxis
ZA = rg.Vector3d.ZAxis


def add(g, layer):
    """Dodaj geometriju (ili listu) na sloj; skalira na jedinice dokumenta."""
    if g is None:
        return
    if isinstance(g, (list, tuple)):
        for item in g:
            add(item, layer)
        return
    if K != 1.0:
        g.Transform(rg.Transform.Scale(rg.Point3d.Origin, K))
    attr = rdo.ObjectAttributes()
    attr.LayerIndex = LAYER_IDX[layer]
    if isinstance(g, rg.Curve):
        sc.doc.Objects.AddCurve(g, attr)
    else:
        sc.doc.Objects.AddBrep(g, attr)
    COUNT[0] += 1


def box(x0, x1, y0, y1, z0, z1, r=0.0):
    """Kutija sa opcionim zaobljenjem svih ivica radijusom r."""
    xa, xb = min(x0, x1), max(x0, x1)
    ya, yb = min(y0, y1), max(y0, y1)
    za, zb = min(z0, z1), max(z0, z1)
    b = rg.Box(rg.BoundingBox(P(xa, ya, za), P(xb, yb, zb))).ToBrep()
    if r > 0:
        m = min(xb - xa, yb - ya, zb - za)
        rr = min(r, m * 0.45)
        try:
            idx = list(range(b.Edges.Count))
            res = rg.Brep.CreateFilletEdges(
                b, idx, [rr] * len(idx), [rr] * len(idx),
                rg.BlendType.Fillet, rg.RailType.DistanceFromEdge, TOLM)
            if res and len(res) > 0:
                return res[0]
        except Exception:
            pass
    return b


def cyl(p0, p1, r):
    axis = p1 - p0
    c = rg.Circle(rg.Plane(p0, axis), r)
    return rg.Cylinder(c, axis.Length).ToBrep(True, True)


def prism(curve, vec):
    """Ekstruzija zatvorene planarne krive u zatvoreno telo."""
    srf = rg.Surface.CreateExtrusion(curve, vec)
    if srf is None:
        return None
    b = srf.ToBrep()
    cb = b.CapPlanarHoles(TOLM)
    if cb:
        b = cb
    try:
        if b.SolidOrientation == rg.BrepSolidOrientation.Inward:
            b.Flip()
    except Exception:
        pass
    return b


def diff(a, cutters):
    """Boolean razlika; vraca listu Brep-ova (ili original ako ne uspe)."""
    try:
        res = rg.Brep.CreateBooleanDifference([a], cutters, TOLM)
        if res and len(res) > 0:
            return list(res)
    except Exception:
        pass
    print("UPOZORENJE: boolean nije uspeo, koristim neisecen oblik.")
    return [a]


def rrect(o, u, v, w, h, r):
    """Zatvoren pravougaonik sa zaobljenim coskovima u ravni (o,u,v)."""
    pts = [o + u * (-w / 2) + v * (-h / 2), o + u * (w / 2) + v * (-h / 2),
           o + u * (w / 2) + v * (h / 2), o + u * (-w / 2) + v * (h / 2)]
    pts.append(pts[0])
    pl = rg.PolylineCurve(pts)
    if r > 0:
        try:
            c = rg.Curve.CreateFilletCornersCurve(pl, r, TOLM, 0.01)
            if c:
                return c
        except Exception:
            pass
    return pl


def ring(outer, inner, vec):
    """Okvir: prsten izmedju dve krive, ekstrudiran za vec."""
    a = prism(outer, vec)
    ic = inner.DuplicateCurve()
    ic.Translate(-vec)
    b = prism(ic, vec * 3.0)
    if a is None or b is None:
        return [a] if a else []
    return diff(a, [b])


def section(off_w, z_bot, off_top, x):
    """Poprecni presek kabine (YZ ravan) na poziciji x."""
    hw = W / 2.0 + off_w
    ht = H + off_top
    pc = rg.PolyCurve()
    pc.Append(rg.Line(P(x, -hw, z_bot), P(x, hw, z_bot)))
    pc.Append(rg.Line(P(x, hw, z_bot), P(x, hw, ZW)))
    pc.Append(rg.ArcCurve(rg.Arc(P(x, hw, ZW), P(x, 0, ht), P(x, -hw, ZW))))
    pc.Append(rg.Line(P(x, -hw, ZW), P(x, -hw, z_bot)))
    return pc


R_ARCH = ((W / 2.0) ** 2 + (H - ZW) ** 2) / (2.0 * (H - ZW))


def ceil_z(y):
    return (H - R_ARCH) + math.sqrt(R_ARCH ** 2 - min(abs(y), W / 2.0) ** 2)


def ceil_alpha(y):
    if y == 0:
        return 0.0
    phi = math.asin(min(abs(y) / R_ARCH, 1.0))
    return -phi if y > 0 else phi


def on_ceiling(parts, x, y):
    """parts = [(geom, layer)] nacrtano lokalno u (0,0,0); postavi na luk plafona."""
    T = rg.Transform.Translation(x, y, ceil_z(y)) * \
        rg.Transform.Rotation(ceil_alpha(y), XA, P(0, 0, 0))
    for g, lay in parts:
        g.Transform(T)
        add(g, lay)


# ============================ KABINA ============================
def build_shell():
    outer = prism(section(WALL, -FLOOR_T, WALL, 0.0), V(L, 0, 0))
    inner = prism(section(0.0, 0.0, 0.0, -0.1), V(L + 0.2, 0, 0))
    cutters = [inner]
    # bocni prozori (prosecanje zida)
    for s in (-1, 1):
        yw = s * W / 2.0
        for (xa, xb) in SIDE_WIN:
            cutters.append(box(xa, xb, yw - s * (WALL + 0.05), yw - s * 0.01,
                               SIDE_WIN_Z[0], SIDE_WIN_Z[1], 0.05))
    parts = diff(outer, cutters)
    add(parts, "B429_Zidovi_plafon")


def build_side_windows():
    for s in (-1, 1):
        yw = s * W / 2.0
        for (xa, xb) in SIDE_WIN:
            zc = (SIDE_WIN_Z[0] + SIDE_WIN_Z[1]) / 2.0
            w = xb - xa
            h = SIDE_WIN_Z[1] - SIDE_WIN_Z[0]
            xc = (xa + xb) / 2.0
            # okvir (izlazi u kabinu 10 mm)
            o = P(xc, yw, zc)
            outer = rrect(o, XA, ZA, w + 0.06, h + 0.06, 0.06)
            inner = rrect(o, XA, ZA, w, h, 0.05)
            add(ring(outer, inner, V(0, -s * 0.010, 0)), "B429_Okviri_prozora")
            # staklo (bela pozadina = dnevno svetlo)
            add(box(xa - 0.01, xb + 0.01, yw + s * 0.016, yw + s * 0.022,
                    SIDE_WIN_Z[0] - 0.01, SIDE_WIN_Z[1] + 0.01, 0.0),
                "B429_Staklo_dan")


def build_bulkhead():
    face = L - BULK_T
    slab = prism(section(0.0, 0.0, 0.0, face), V(BULK_T, 0, 0))
    cutters = []
    for (ya, yb) in AFT_WIN:
        cutters.append(box(face - 0.01, L + 0.01, ya, yb,
                           AFT_WIN_Z[0], AFT_WIN_Z[1], 0.05))
    add(diff(slab, cutters), "B429_Zidovi_plafon")

    for (ya, yb) in AFT_WIN:
        yc = (ya + yb) / 2.0
        w = yb - ya
        h = AFT_WIN_Z[1] - AFT_WIN_Z[0]
        zc = (AFT_WIN_Z[0] + AFT_WIN_Z[1]) / 2.0
        o = P(face, yc, zc)
        outer = rrect(o, YA, ZA, w + 0.06, h + 0.06, 0.06)
        inner = rrect(o, YA, ZA, w, h, 0.05)
        add(ring(outer, inner, V(-0.012, 0, 0)), "B429_Okviri_prozora")
        add(box(face + 0.012, face + 0.018, ya - 0.01, yb + 0.01,
                AFT_WIN_Z[0] - 0.01, AFT_WIN_Z[1] + 0.01), "B429_Staklo_dan")

    # donji tamni panel ispod prozora + sigurnosni izlaz
    add(box(face - 0.014, face, -0.62, 0.62, 0.10, 0.46, 0.02), "B429_Paneli_tamni")
    add(box(face - 0.020, face - 0.014, -0.44, -0.30, 0.19, 0.24, 0.004), "B429_Oznake")   # EXIT 1
    add(box(face - 0.022, face - 0.020, -0.43, -0.31, 0.20, 0.23), "B429_Zidovi_plafon")
    add(box(face - 0.030, face - 0.014, 0.30, 0.44, 0.24, 0.27, 0.006), "B429_Oznake")      # rucica izlaza

    # logo/lampa gore u sredini
    add(box(face - 0.016, face, -0.045, 0.045, 1.13, 1.22, 0.012), "B429_Plafon_detalji")
    # vertikalne hrom rucke na stubu izmedju prozora
    for sy in (-0.065, 0.065):
        add(cyl(P(face - 0.034, sy, 0.62), P(face - 0.034, sy, 0.98), 0.009), "B429_Hrom_metal")
        for zz in (0.64, 0.96):
            add(cyl(P(face, sy, zz), P(face - 0.034, sy, zz), 0.008), "B429_Hrom_metal")


def build_floor_and_sill():
    # tepih u prolazu
    aw = W / 2.0 - 0.62
    add(box(0.10, L - 0.04, -aw, aw, 0.0, 0.008, 0.002), "B429_Pod_tepih")
    # rebra tepiha
    y = -aw + 0.01
    while y < aw - 0.005:
        add(box(0.12, L - 0.06, y - 0.003, y + 0.003, 0.008, 0.0105), "B429_Pod_tepih")
        y += 0.02
    # gumene prostirke ispod klupa + sine sedista
    for s in (-1, 1):
        yw = -s * W / 2.0
        add(box(0.06, L - 0.04, yw, yw + s * 0.62, 0.0, 0.006, 0.002), "B429_Pod_prostirka")
        for vv in (0.20, 0.48):
            add(box(0.10, L - 0.10, yw + s * (vv - 0.015), yw + s * (vv + 0.015),
                    0.006, 0.018, 0.004), "B429_Alu_prag")
    # prednji prag sa zakivcima
    add(box(0.0, 0.10, -W / 2.0, W / 2.0, 0.0, 0.03, 0.004), "B429_Alu_prag")
    add(box(0.045, 0.055, -W / 2.0 + 0.05, W / 2.0 - 0.05, 0.029, 0.031), "B429_Pod_prostirka")
    y = -W / 2.0 + 0.04
    while y < W / 2.0 - 0.03:
        for xr in (0.025, 0.075):
            add(cyl(P(xr, y, 0.03), P(xr, y, 0.0325), 0.0045), "B429_Hrom_metal")
        y += 0.045


def build_wall_panels():
    for s in (-1, 1):
        yw = -s * W / 2.0
        add(box(0.08, L - BULK_T, yw, yw + s * 0.012, 0.10, 0.50, 0.01), "B429_Paneli_tamni")


def build_ceiling():
    # centralni plafonski panel (okvir)
    cz = ceil_z(0.0)
    o = P(1.15, 0, cz + 0.002)
    outer = rrect(o, XA, YA, 1.10, 0.30, 0.06)
    inner = rrect(o, XA, YA, 1.06, 0.26, 0.045)
    add(ring(outer, inner, V(0, 0, -0.010)), "B429_Plafon_detalji")
    # sarka
    add(box(0.98, 1.22, -0.025, 0.025, cz - 0.014, cz, 0.004), "B429_Hrom_metal")
    for xp in (1.02, 1.18):
        add(cyl(P(xp, 0, cz - 0.014), P(xp, 0, cz - 0.020), 0.006), "B429_Hrom_metal")
    # velike tamne rucke levo/desno
    for sy in (-0.55, 0.55):
        for xh in (0.60, 1.50):
            hand = []
            hand.append((prism(rrect(P(0, 0, 0.002), XA, YA, 0.34, 0.075, 0.03), V(0, 0, -0.012)),
                         "B429_Plafon_detalji"))
            hand.append((cyl(P(-0.12, 0, -0.036), P(0.12, 0, -0.036), 0.009), "B429_Hrom_metal"))
            for sx in (-0.12, 0.12):
                hand.append((cyl(P(sx, 0, -0.036), P(sx, 0, -0.004), 0.008), "B429_Hrom_metal"))
            on_ceiling(hand, xh, sy)
    # mali rukohvati pri zadnjem zidu
    for sy in (-0.34, 0.34):
        hand = []
        hand.append((prism(rrect(P(0, 0, 0.002), XA, YA, 0.20, 0.06, 0.025), V(0, 0, -0.010)),
                     "B429_Plafon_detalji"))
        hand.append((cyl(P(-0.07, 0, -0.030), P(0.07, 0, -0.030), 0.008), "B429_Hrom_metal"))
        for sx in (-0.07, 0.07):
            hand.append((cyl(P(sx, 0, -0.030), P(sx, 0, -0.004), 0.007), "B429_Hrom_metal"))
        on_ceiling(hand, L - 0.40, sy)
    # nazle za vazduh iznad svakog sedista
    for i in range(N_SEATS):
        xc = SEAT_X0 + SEAT_W / 2.0 + i * PITCH
        for sy in (-0.40, 0.40):
            g = [(cyl(P(0, 0, 0.002), P(0, 0, -0.014), 0.022), "B429_Plafon_detalji"),
                 (cyl(P(0, 0, -0.014), P(0, 0, -0.017), 0.012), "B429_Hrom_metal")]
            on_ceiling(g, xc, sy)


# ============================ SEDISTA ============================
def build_seat(s, xc):
    """s=+1 sedi uz levi zid (Y=-W/2) i gleda ka +Y; s=-1 uz desni zid."""
    yw = -s * W / 2.0
    hw = SEAT_W / 2.0

    def Lx(v):
        return yw + s * v

    def lb(x0, x1, v0, v1, z0, z1, r=0.0):
        return box(x0, x1, Lx(v0), Lx(v1), z0, z1, r)

    # --- postolje i kuciste
    add(lb(xc - 0.15, xc + 0.15, 0.20, 0.46, 0.0, 0.09, 0.01), "B429_Sedista_konstrukcija")
    add(lb(xc - hw + 0.01, xc + hw - 0.01, 0.10, 0.54, 0.09, 0.34, 0.035), "B429_Koza_tamna")
    # resetka za ventilaciju (na celu postolja okrenutom prolazu)
    add(lb(xc - 0.14, xc + 0.14, 0.53, 0.545, 0.14, 0.26, 0.004), "B429_Pod_prostirka")
    for k in range(9):
        xs = xc - 0.12 + k * 0.03
        add(lb(xs - 0.003, xs + 0.003, 0.545, 0.549, 0.15, 0.25), "B429_Sedista_konstrukcija")

    # --- jastuk (svetli zadnji deo, srednje sivi prednji deo, tamni bokovi)
    add(lb(xc - hw + 0.055, xc + hw - 0.055, 0.16, 0.40, 0.34, 0.46, 0.03), "B429_Koza_svetla")
    add(lb(xc - hw + 0.055, xc + hw - 0.055, 0.40, 0.58, 0.34, 0.455, 0.04), "B429_Koza_srednja")
    for sx in (-1, 1):
        cx = xc + sx * (hw - 0.0275)
        add(lb(cx - 0.0275, cx + 0.0275, 0.16, 0.58, 0.34, 0.50, 0.02), "B429_Koza_tamna")
    # sav na jastuku
    add(rg.LineCurve(P(xc - hw + 0.06, Lx(0.40), 0.4615), P(xc + hw - 0.06, Lx(0.40), 0.4615)), "B429_Savovi")
    for sx in (-1, 1):
        xx = xc + sx * (hw - 0.07)
        add(rg.LineCurve(P(xx, Lx(0.17), 0.4615), P(xx, Lx(0.40), 0.4615)), "B429_Savovi")

    # --- naslon (gradi se uspravno, pa se naginje)
    back = []

    def bb(x0, x1, v0, v1, z0, z1, r, layer):
        back.append((lb(x0, x1, BV + v0, BV + v1, z0, z1, r), layer))

    bb(xc - hw, xc + hw, 0.0, 0.09, 0.34, 0.84, 0.03, "B429_Koza_tamna")
    bb(xc - hw + 0.06, xc + hw - 0.06, 0.07, 0.12, 0.40, 0.60, 0.02, "B429_Koza_srednja")
    bb(xc - hw + 0.06, xc + hw - 0.06, 0.07, 0.12, 0.60, 0.82, 0.02, "B429_Koza_svetla")
    for sx in (-1, 1):
        cx = xc + sx * (hw - 0.0275)
        bb(cx - 0.0275, cx + 0.0275, 0.04, 0.13, 0.38, 0.84, 0.02, "B429_Koza_tamna")
    # uzglavlje
    bb(xc - 0.18, xc + 0.18, 0.01, 0.10, 0.84, 1.10, 0.04, "B429_Koza_tamna")
    bb(xc - 0.13, xc + 0.13, 0.09, 0.13, 0.86, 1.07, 0.025, "B429_Koza_svetla")
    for sx in (-1, 1):
        cx = xc + sx * 0.155
        bb(cx - 0.025, cx + 0.025, 0.06, 0.14, 0.86, 1.07, 0.02, "B429_Koza_tamna")
    # utisnuti Bell stit
    vf = BV + 0.12
    sw, sh, zt = 0.07, 0.085, 0.76
    pts = [P(xc - sw / 2, Lx(vf), zt), P(xc + sw / 2, Lx(vf), zt),
           P(xc + sw / 2, Lx(vf), zt - sh * 0.55), P(xc, Lx(vf), zt - sh),
           P(xc - sw / 2, Lx(vf), zt - sh * 0.55), P(xc - sw / 2, Lx(vf), zt)]
    shield = prism(rg.PolylineCurve(pts), V(0, s * 0.0035, 0))
    if shield:
        back.append((shield, "B429_Koza_tamna"))
    back.append((lb(xc - 0.002, xc + 0.002, vf, vf + 0.0045, zt - 0.075, zt - 0.010), "B429_Koza_srednja"))
    back.append((lb(xc - 0.022, xc + 0.022, vf, vf + 0.0045, zt - 0.040, zt - 0.036), "B429_Koza_srednja"))
    # dijagonalni pojas preko naslona
    q = [P(xc + 0.06, Lx(BV + 0.125), 1.09), P(xc + 0.11, Lx(BV + 0.125), 1.09),
         P(xc - 0.19, Lx(BV + 0.125), 0.44), P(xc - 0.24, Lx(BV + 0.125), 0.44),
         P(xc + 0.06, Lx(BV + 0.125), 1.09)]
    strap = prism(rg.PolylineCurve(q), V(0, s * 0.004, 0))
    if strap:
        back.append((strap, "B429_Pojasevi"))
    # skupljen pojas preko vrha uzglavlja
    back.append((cyl(P(xc - 0.13, Lx(BV + 0.065), 1.115), P(xc + 0.13, Lx(BV + 0.065), 1.115), 0.02),
                 "B429_Pojasevi"))

    pivot = P(xc, Lx(BV), 0.34)
    tilt = rg.Transform.Rotation(s * math.radians(RECLINE), XA, pivot)
    for g, lay in back:
        if g is None:
            continue
        g.Transform(tilt)
        add(g, lay)

    # --- pojas oko struka sa kopcom
    add(lb(xc - 0.26, xc - 0.035, 0.27, 0.315, 0.460, 0.464), "B429_Pojasevi")
    add(lb(xc + 0.035, xc + 0.26, 0.27, 0.315, 0.460, 0.464), "B429_Pojasevi")
    add(lb(xc - 0.040, xc + 0.040, 0.255, 0.330, 0.462, 0.476, 0.006), "B429_Hrom_metal")
    add(lb(xc - 0.012, xc + 0.012, 0.270, 0.315, 0.476, 0.481, 0.002), "B429_Oznake")


def build_armrests(s):
    yw = -s * W / 2.0
    xs = []
    first = SEAT_X0 + SEAT_W / 2.0
    for i in range(N_SEATS + 1):
        xs.append(first - PITCH / 2.0 + i * PITCH)
    xs[0] = first - SEAT_W / 2.0 - 0.025
    xs[-1] = first + (N_SEATS - 1) * PITCH + SEAT_W / 2.0 + 0.025
    for xg in xs:
        add(box(xg - 0.025, xg + 0.025, yw + s * 0.20, yw + s * 0.52, 0.34, 0.60, 0.02),
            "B429_Koza_tamna")
    return xs


def build_table(s, xg):
    yw = -s * W / 2.0

    def Lx(v):
        return yw + s * v

    # nosac
    add(box(xg - 0.018, xg + 0.018, Lx(0.30), Lx(0.52), 0.60, 0.64, 0.01), "B429_Koza_tamna")
    # ploca
    add(box(xg - 0.14, xg + 0.14, Lx(0.34), Lx(0.60), 0.64, 0.662, 0.011), "B429_Sto")
    # drzaci case
    for dx in (-0.065, 0.065):
        c0 = P(xg + dx, Lx(0.47), 0.662)
        add(cyl(c0, P(c0.X, c0.Y, 0.666), 0.040), "B429_Hrom_metal")
        add(cyl(P(c0.X, c0.Y, 0.664), P(c0.X, c0.Y, 0.6675), 0.033), "B429_Pod_prostirka")


# ============================ KAMERA ============================
def set_camera():
    try:
        view = sc.doc.Views.ActiveView
        vp = view.ActiveViewport
        vp.ChangeToPerspectiveProjection(True, 18.0)
        loc = P(-0.20 * K, 0.0, 0.85 * K)
        tgt = P(L * K, 0.0, 0.62 * K)
        vp.SetCameraLocations(tgt, loc)
        sc.doc.NamedViews.Add("Bell429_foto_pogled", vp.Id)
        view.Redraw()
    except Exception as e:
        print("Kamera nije postavljena: %s" % e)


# ============================ GLAVNI TOK ============================
def main():
    make_layers()
    undo = sc.doc.BeginUndoRecord("Bell 429 kabina")
    try:
        build_shell()
        build_side_windows()
        build_bulkhead()
        build_floor_and_sill()
        build_wall_panels()
        build_ceiling()

        xcs = [SEAT_X0 + SEAT_W / 2.0 + i * PITCH for i in range(N_SEATS)]
        for s in (1, -1):
            for xc in xcs:
                build_seat(s, xc)
            gaps = build_armrests(s)
            if s == -1 and 0 < TABLE_GAP < len(gaps) - 1:
                build_table(s, gaps[TABLE_GAP])
    finally:
        sc.doc.EndUndoRecord(undo)
    set_camera()
    sc.doc.Views.Redraw()
    try:
        Rhino.RhinoApp.RunScript("_-Zoom _All _Extents", False)
    except Exception:
        pass
    print("Gotovo: %d objekata. Slojevi: B429_*" % COUNT[0])


main()
