# -*- coding: utf-8 -*-
"""
BELL 429 - kompletan model: spoljasnjost + vrata + kokpit + putnicka kabina (club 3+3)
Rhino 8 / Rhino 9:  _ScriptEditor -> otvori fajl -> Run   (preporuka: prazan fajl)

Koordinate (METRI, skripta sama skalira na jedinice dokumenta):
  X = napred (nos helikoptera ka +X), Y = levi bok (port, +Y) / desni bok (starboard, -Y), Z = gore
  Z=0 je gornja ivica poda kabine, X=0 je sredina kabine. Tlo je oko Z=-0.70.

Raspored (prema fotografijama): tri sedista UPOREDO preko kabine, prednja klupa gleda
unazad, zadnja klupa gleda unapred, izmedju njih prolaz od vrata do vrata.
Klizna vrata su na oba boka (desna su otvorena prema parametru DOOR_OPEN_STBD).

SVE MERE SU PROCENE - menjaj ih u bloku PARAMETRI.  Svaki materijal ima svoj sloj B429_*.
"""
import math
import System.Drawing as sd
import Rhino
import Rhino.Geometry as rg
import Rhino.DocObjects as rdo
import scriptcontext as sc

# ============================ PARAMETRI (metri) ============================
BUILD_EXTERIOR = True       # trup, rep, rotori, stajni trap
BUILD_COCKPIT = True        # pilotska kabina
BUILD_CABIN = True          # putnicka kabina

DOOR_OPEN_STBD = 1.0        # desna klizna vrata: 0 = zatvorena ... 1 = potpuno otvorena (pomerena unazad)
DOOR_OPEN_PORT = 0.0        # leva klizna vrata
DOOR_TRAVEL = 1.40          # hod kliznih vrata unazad

XB = 0.90                   # polozaj pregrada kabine (+-XB)
YW = 0.775                  # unutrasnja polovina sirine kabine (obloga vrata)
H = 1.36                    # visina plafona u sredini
ZW = 1.15                   # visina na kojoj obloga prelazi u luk plafona
SKIN_A = 0.88               # polusirina trupa u zoni kabine

AP_X = 0.82                 # polovina duzine otvora kliznih vrata
AP_Z0, AP_Z1 = 0.04, 1.25   # visina otvora

SEAT_W = 0.48
SEAT_PITCH = 0.50
SEAT_H = 0.46
RECLINE = 10.0
BV = 0.17                   # podnozje naslona od pregrade
SEAT_Y = [-0.50, 0.0, 0.50]
TABLE_GAP_Y = -0.25         # sto na prednjoj klupi izmedju desnog i srednjeg sedista

ROTOR_R = 5.485
ROTOR_AZ = 22.0             # polozaj lopatica (stepeni)
ROTOR_CX = 0.05

# ============================ POMOCNO ============================
K = Rhino.RhinoMath.UnitScale(Rhino.UnitSystem.Meters, sc.doc.ModelUnitSystem)
TOLM = max(sc.doc.ModelAbsoluteTolerance / K, 1e-4)
COUNT = [0]
SKIPPED = [0]
LAYER_IDX = {}
ENV = [-8.0, 6.5, -7.0, 7.0, -1.3, 4.2]   # dozvoljena zapremina (xmin,xmax,ymin,ymax,zmin,zmax)

LAYERS = [
    ("B429_Oplata_siva",          (168, 172, 178), 0.70),
    ("B429_Oplata_tamna",         (40, 42, 47),    0.40),
    ("B429_Staklo_tamno",         (35, 48, 60),    0.90),
    ("B429_Rotor_crni",           (28, 28, 30),    0.30),
    ("B429_Svetla",               (240, 240, 235), 0.80),
    ("B429_Svetlo_crveno",        (220, 20, 20),   0.80),
    ("B429_Svetlo_zeleno",        (20, 200, 60),   0.80),
    ("B429_Koza_svetla",          (186, 189, 193), 0.35),
    ("B429_Koza_srednja",         (150, 153, 158), 0.35),
    ("B429_Koza_tamna",           (42, 48, 62),    0.35),
    ("B429_Sedista_konstrukcija", (60, 62, 66),    0.30),
    ("B429_Pojasevi",             (170, 172, 175), 0.05),
    ("B429_Hrom_metal",           (210, 212, 215), 0.95),
    ("B429_Alu_prag",             (190, 192, 196), 0.70),
    ("B429_Pod_tepih",            (72, 74, 78),    0.02),
    ("B429_Pod_prostirka",        (26, 26, 28),    0.02),
    ("B429_Zidovi_plafon",        (204, 206, 209), 0.15),
    ("B429_Paneli_tamni",         (50, 56, 70),    0.25),
    ("B429_Plafon_detalji",       (62, 64, 68),    0.25),
    ("B429_Okviri_prozora",       (182, 185, 189), 0.20),
    ("B429_Sto",                  (28, 28, 30),    0.40),
    ("B429_Oznake",               (200, 30, 30),   0.10),
    ("B429_Savovi",               (92, 94, 98),    0.00),
    ("B429_Kokpit_instrumenti",   (22, 24, 28),    0.60),
    ("B429_Ekrani",               (10, 30, 50),    0.90),
]


def make_layers():
    for name, rgb, shine in LAYERS:
        idx = sc.doc.Layers.FindByFullPath(name, -1)
        if idx < 0:
            ly = rdo.Layer()
            ly.Name = name
            ly.Color = sd.Color.FromArgb(rgb[0], rgb[1], rgb[2])
            try:
                m = rdo.Material()
                m.DiffuseColor = sd.Color.FromArgb(rgb[0], rgb[1], rgb[2])
                m.Shine = shine * rdo.Material.MaxShine
                if name == "B429_Staklo_tamno":
                    m.Transparency = 0.65
                if name == "B429_Svetla":
                    m.EmissionColor = sd.Color.FromArgb(255, 255, 240)
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


def set_env(x0, x1, y0, y1, z0, z1):
    ENV[:] = [x0, x1, y0, y1, z0, z1]


def add(g, layer):
    """Dodaj geometriju (ili listu) na sloj, skalira na jedinice dokumenta."""
    if g is None:
        return
    if isinstance(g, (list, tuple)):
        for item in g:
            add(item, layer)
        return
    try:
        bb = g.GetBoundingBox(True)
        if (bb.Min.X < ENV[0] or bb.Max.X > ENV[1] or bb.Min.Y < ENV[2] or
                bb.Max.Y > ENV[3] or bb.Min.Z < ENV[4] or bb.Max.Z > ENV[5]):
            print("PRESKOCENO (van dozvoljene zapremine) sloj %s: %.2f x %.2f x %.2f m" % (
                layer, bb.Max.X - bb.Min.X, bb.Max.Y - bb.Min.Y, bb.Max.Z - bb.Min.Z))
            SKIPPED[0] += 1
            return
    except Exception:
        pass
    if K != 1.0:
        g.Transform(rg.Transform.Scale(rg.Point3d.Origin, K))
    attr = rdo.ObjectAttributes()
    attr.LayerIndex = LAYER_IDX[layer]
    if isinstance(g, rg.Curve):
        sc.doc.Objects.AddCurve(g, attr)
    else:
        sc.doc.Objects.AddBrep(g, attr)
    COUNT[0] += 1


def prism(curve, vec):
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


def rrect(o, u, v, w, h, r):
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


def box(x0, x1, y0, y1, z0, z1, r=0.0):
    """Kutija; r>0 zaobljava cetiri ivice oko najtanje dimenzije."""
    xa, xb = min(x0, x1), max(x0, x1)
    ya, yb = min(y0, y1), max(y0, y1)
    za, zb = min(z0, z1), max(z0, z1)
    b = rg.Box(rg.BoundingBox(P(xa, ya, za), P(xb, yb, zb))).ToBrep()
    if r <= 0:
        return b
    dx, dy, dz = xb - xa, yb - ya, zb - za
    dims = [dx, dy, dz]
    k = dims.index(min(dims))
    cx, cy, cz = (xa + xb) / 2.0, (ya + yb) / 2.0, (za + zb) / 2.0
    if k == 2:
        o, u, v, w, h, vec = P(cx, cy, za), XA, YA, dx, dy, V(0, 0, dz)
    elif k == 1:
        o, u, v, w, h, vec = P(cx, ya, cz), XA, ZA, dx, dz, V(0, dy, 0)
    else:
        o, u, v, w, h, vec = P(xa, cy, cz), YA, ZA, dy, dz, V(dx, 0, 0)
    rr = min(r, min(w, h) * 0.45)
    if rr > 1e-4:
        try:
            pr = prism(rrect(o, u, v, w, h, rr), vec)
            if pr is not None:
                return pr
        except Exception:
            pass
    return b


def cyl(p0, p1, r):
    axis = p1 - p0
    h = axis.Length
    axis.Unitize()
    c = rg.Circle(rg.Plane(p0, axis), r)
    return rg.Cylinder(c, h).ToBrep(True, True)


def sphere(c, r):
    return rg.Sphere(c, r).ToBrep()


def diff(a, cutters):
    try:
        res = rg.Brep.CreateBooleanDifference([a], cutters, TOLM)
        if res and len(res) > 0:
            return list(res)
    except Exception:
        pass
    print("UPOZORENJE: boolean nije uspeo, koristim neisecen oblik.")
    return [a]


def ring(outer, inner, vec):
    a = prism(outer, vec)
    ic = inner.DuplicateCurve()
    ic.Translate(-vec)
    b = prism(ic, vec * 3.0)
    if a is None or b is None:
        return [a] if a else []
    return diff(a, [b])


def pipe(pts, r, layer):
    """Cev kroz tacke (glatka kriva); ako ne uspe, niz cilindara."""
    try:
        crv = rg.Curve.CreateInterpolatedCurve(pts, 3)
        res = rg.Brep.CreatePipe(crv, r, False, rg.PipeCapMode.Round, True, TOLM, 0.01)
        if res and len(res) > 0:
            add(list(res), layer)
            return
    except Exception:
        pass
    for i in range(len(pts) - 1):
        add(cyl(pts[i], pts[i + 1], r), layer)


def loft(curves):
    try:
        res = rg.Brep.CreateFromLoft(curves, rg.Point3d.Unset, rg.Point3d.Unset,
                                     rg.LoftType.Normal, False)
        if res and len(res) > 0:
            return res[0]
    except Exception:
        pass
    return None


def closed_curve(pts):
    c = None
    try:
        c = rg.NurbsCurve.Create(True, 3, pts)
    except Exception:
        c = None
    if c is None:
        c = rg.PolylineCurve(list(pts) + [pts[0]])
    return c


def poly_prism(pts, vec):
    """Zatvoren poligon (lista tacaka, bez ponavljanja prve) ekstrudiran za vec."""
    return prism(rg.PolylineCurve(list(pts) + [pts[0]]), vec)


# ============================ TRUP ============================
# x, polusirina a, donja z, gornja z, eksponent oblika n (veci n = kvadratniji presek)
STA = [
    (3.45, 0.05, 0.10, 0.26, 2.0),
    (3.30, 0.22, 0.02, 0.52, 2.2),
    (3.05, 0.42, -0.10, 0.86, 2.4),
    (2.70, 0.60, -0.20, 1.12, 2.8),
    (2.30, 0.74, -0.25, 1.32, 3.4),
    (1.85, 0.83, -0.26, 1.45, 5.0),
    (1.35, 0.88, -0.26, 1.50, 7.0),
    (1.05, 0.88, -0.26, 1.52, 8.0),
    (-0.50, 0.88, -0.26, 1.52, 8.0),
    (-1.60, 0.88, -0.26, 1.50, 8.0),
    (-2.05, 0.87, -0.24, 1.44, 6.0),
    (-2.55, 0.74, -0.14, 1.30, 4.0),
    (-3.05, 0.52, 0.12, 1.20, 3.0),
    (-3.60, 0.34, 0.52, 1.18, 2.4),
    (-4.50, 0.25, 0.62, 1.12, 2.2),
    (-5.50, 0.19, 0.66, 1.08, 2.1),
    (-6.20, 0.13, 0.70, 1.02, 2.0),
    (-6.55, 0.06, 0.76, 0.98, 2.0),
]


def sta_at(x):
    S = STA
    if x >= S[0][0]:
        return S[0][1:]
    for i in range(len(S) - 1):
        x0, x1 = S[i][0], S[i + 1][0]
        if x1 <= x <= x0:
            t = (x0 - x) / (x0 - x1)
            return tuple(S[i][k] + (S[i + 1][k] - S[i][k]) * t for k in range(1, 5))
    return S[-1][1:]


def sgn_pow(v, e):
    return math.copysign(abs(v) ** e, v)


def sect_pts(x, a, zb, zt, n, N=32, grow=0.0):
    zc = (zb + zt) / 2.0
    b = (zt - zb) / 2.0
    e = 2.0 / n
    pts = []
    for i in range(N):
        t = 2.0 * math.pi * i / N
        pts.append(P(x, (a + grow) * sgn_pow(math.cos(t), e),
                     zc + (b + grow) * sgn_pow(math.sin(t), e)))
    return pts


def side_y(x):
    """Polusirina trupa na poziciji x (priblizno na visini sredine boka)."""
    return sta_at(x)[0]


def build_hull():
    curves = [closed_curve(sect_pts(*s)) for s in STA]
    hull = loft(curves)
    if hull is None:
        print("UPOZORENJE: loft trupa nije uspeo.")
        return
    cap = hull.CapPlanarHoles(TOLM)
    if cap:
        hull = cap
    pieces = [hull]
    # otvori za klizna vrata (oba boka)
    for sg in (1, -1):
        ya, yb = sg * (SKIN_A - 0.30), sg * (SKIN_A + 0.25)
        cutter = box(-AP_X, AP_X, min(ya, yb), max(ya, yb), AP_Z0, AP_Z1, 0.16)
        new = []
        for pc in pieces:
            res = None
            try:
                res = pc.Split(cutter, TOLM)
            except Exception:
                res = None
            if res and len(res) > 0:
                for r in res:
                    inside = False
                    try:
                        amp = rg.AreaMassProperties.Compute(r)
                        if amp is not None:
                            inside = cutter.IsPointInside(amp.Centroid, TOLM, True)
                    except Exception:
                        inside = False
                    if not inside:
                        new.append(r)
            else:
                print("UPOZORENJE: otvor za vrata nije prosecen (%s)" % ("levi" if sg > 0 else "desni"))
                new.append(pc)
        pieces = new
    add(pieces, "B429_Oplata_siva")


def build_cockpit_glass():
    xs = [3.0, 2.8, 2.55, 2.3, 2.05, 1.8, 1.55, 1.3, 1.12]
    for (t0, t1) in ((4, 72), (108, 176)):
        crvs = []
        for x in xs:
            a, zb, zt, n = sta_at(x)
            zc, b, e = (zb + zt) / 2.0, (zt - zb) / 2.0, 2.0 / n
            pts = []
            for k in range(14):
                t = math.radians(t0 + (t1 - t0) * k / 13.0)
                pts.append(P(x, (a + 0.006) * sgn_pow(math.cos(t), e),
                             zc + (b + 0.006) * sgn_pow(math.sin(t), e)))
            try:
                crvs.append(rg.Curve.CreateInterpolatedCurve(pts, 3))
            except Exception:
                pass
        g = loft(crvs) if len(crvs) > 1 else None
        if g is not None:
            add(g, "B429_Staklo_tamno")
    # ram vetrobrana (tamna sipka u sredini)
    add(box(2.55, 2.68, -0.02, 0.02, 1.00, 1.30, 0.01), "B429_Oplata_tamna")


def build_engine_cowling():
    ST = [(0.85, 0.34, 1.40, 1.62, 2.4), (0.50, 0.60, 1.40, 1.98, 2.6),
          (0.00, 0.72, 1.40, 2.14, 2.6), (-0.60, 0.68, 1.40, 2.10, 2.6),
          (-1.20, 0.50, 1.40, 1.86, 2.6), (-1.75, 0.18, 1.42, 1.58, 2.2)]
    g = loft([closed_curve(sect_pts(*s)) for s in ST])
    if g is not None:
        cp = g.CapPlanarHoles(TOLM)
        add(cp if cp else g, "B429_Oplata_siva")
    # usisnici i izduvne cevi
    add(box(0.38, 0.52, -0.30, 0.30, 1.66, 1.90, 0.05), "B429_Oplata_tamna")
    for sy in (-0.22, 0.22):
        add(cyl(P(-1.45, sy, 1.62), P(-1.95, sy, 1.72), 0.075), "B429_Oplata_tamna")
        add(cyl(P(-1.95, sy, 1.72), P(-1.97, sy, 1.725), 0.055), "B429_Rotor_crni")


def build_tail():
    # vertikalni stabilizator (rep)
    fin = [P(-5.2, -0.04, 1.08), P(-6.5, -0.04, 2.02), P(-6.98, -0.04, 2.02),
           P(-7.0, -0.04, 0.85), P(-6.4, -0.04, 0.85), P(-5.2, -0.04, 1.00)]
    add(poly_prism(fin, V(0, 0.08, 0)), "B429_Oplata_siva")
    vent = [P(-6.0, -0.035, 0.80), P(-6.55, -0.035, 0.30), P(-6.98, -0.035, 0.30),
            P(-6.98, -0.035, 0.85)]
    add(poly_prism(vent, V(0, 0.07, 0)), "B429_Oplata_siva")
    # horizontalni stabilizator sa krajnjim pločama
    add(box(-5.30, -4.85, -0.95, 0.95, 0.86, 0.90, 0.01), "B429_Oplata_siva")
    for sy in (-0.95, 0.95):
        add(box(-5.35, -4.82, sy - 0.0125, sy + 0.0125, 0.45, 1.35, 0.03), "B429_Oplata_siva")
    # repni rotor (bocno na levoj strani repa)
    hub = P(-6.80, 0.12, 1.62)
    add(cyl(P(hub.X, 0.04, hub.Z), P(hub.X, 0.20, hub.Z), 0.08), "B429_Oplata_tamna")
    for ang in (12.0, 192.0):
        a = math.radians(ang)
        ux, uz = math.sin(a), math.cos(a)
        px, pz = -uz, ux
        pts = [P(hub.X + ux * 0.10 + px * 0.075, 0.18, hub.Z + uz * 0.10 + pz * 0.075),
               P(hub.X + ux * 0.95 + px * 0.045, 0.18, hub.Z + uz * 0.95 + pz * 0.045),
               P(hub.X + ux * 0.95 - px * 0.045, 0.18, hub.Z + uz * 0.95 - pz * 0.045),
               P(hub.X + ux * 0.10 - px * 0.075, 0.18, hub.Z + uz * 0.10 - pz * 0.075)]
        add(poly_prism(pts, V(0, 0.015, 0)), "B429_Rotor_crni")
    # svetla
    add(sphere(P(-4.95, 0.97, 1.40), 0.03), "B429_Svetlo_crveno")
    add(sphere(P(-4.95, -0.97, 1.40), 0.03), "B429_Svetlo_zeleno")
    add(sphere(P(-6.98, 0.0, 2.05), 0.035), "B429_Svetla")
    # antene i pitot
    add(cyl(P(-2.2, 0.0, 1.42), P(-2.2, 0.0, 1.85), 0.007), "B429_Rotor_crni")
    add(cyl(P(3.3, 0.0, 0.10), P(3.75, 0.0, 0.09), 0.012), "B429_Hrom_metal")


def build_main_rotor():
    cx = ROTOR_CX
    add(cyl(P(cx, 0, 2.05), P(cx, 0, 2.52), 0.07), "B429_Oplata_tamna")
    add(cyl(P(cx, 0, 2.10), P(cx, 0, 2.17), 0.13), "B429_Oplata_tamna")
    add(cyl(P(cx, 0, 2.50), P(cx, 0, 2.66), 0.20), "B429_Rotor_crni")
    for k in range(4):
        az = math.radians(ROTOR_AZ + 90.0 * k)
        ux, uy = math.cos(az), math.sin(az)
        px, py = -uy, ux
        add(cyl(P(cx + ux * 0.15, uy * 0.15, 2.58), P(cx + ux * 0.60, uy * 0.60, 2.58), 0.055),
            "B429_Oplata_tamna")
        r0, r1 = 0.55, ROTOR_R
        c0, c1 = 0.17, 0.11
        pts = [P(cx + ux * r0 + px * c0, uy * r0 + py * c0, 2.58),
               P(cx + ux * r1 + px * c1, uy * r1 + py * c1, 2.58),
               P(cx + ux * r1 - px * c1, uy * r1 - py * c1, 2.58),
               P(cx + ux * r0 - px * c0, uy * r0 - py * c0, 2.58)]
        add(poly_prism(pts, V(0, 0, 0.03)), "B429_Rotor_crni")


def build_landing_gear():
    for sg in (1, -1):
        y = sg * 1.30
        pipe([P(-1.85, y, -0.55), P(-1.55, y, -0.68), P(1.35, y, -0.68),
              P(1.95, y, -0.62), P(2.30, y, -0.40)], 0.04, "B429_Oplata_tamna")
    for x in (0.90, -0.60):
        pipe([P(x, -1.30, -0.66), P(x, -1.24, -0.45), P(x, -1.00, -0.30), P(x, -0.70, -0.25),
              P(x, 0.70, -0.25), P(x, 1.00, -0.30), P(x, 1.24, -0.45), P(x, 1.30, -0.66)],
             0.035, "B429_Oplata_tamna")
    for sg in (1, -1):    # stepenice za ulazak
        add(box(-0.40, 0.40, sg * 1.30 - 0.05, sg * 1.30 + 0.05, -0.66, -0.64, 0.01),
            "B429_Alu_prag")


# ============================ VRATA ============================
def side_panel(sg, x0, x1, z0, z1, thick, r, layer, off=0.006):
    """Ploca na boku trupa koja prati blago suzenje bokova."""
    a0, a1 = side_y(x0), side_y(x1)
    ya, yb = sg * (a0 + off - thick), sg * (a0 + off)
    b = box(x0, x1, min(ya, yb), max(ya, yb), z0, z1, r)
    ang = math.atan2(sg * (a1 - a0), x1 - x0)
    b.Transform(rg.Transform.Rotation(ang, ZA, P(x0, sg * a0, 0)))
    add(b, layer)


def build_crew_doors():
    for sg in (1, -1):
        side_panel(sg, 1.14, 2.00, 0.06, 0.98, 0.04, 0.12, "B429_Oplata_siva")
        a = side_y(1.20)
        add(box(1.20, 1.36, sg * (a + 0.006), sg * (a + 0.022), 0.64, 0.68, 0.01), "B429_Hrom_metal")
        add(box(1.14, 1.16, sg * (a - 0.01), sg * (a + 0.008), 0.06, 0.98, 0.0), "B429_Oplata_tamna")


# Oblici prozora kliznih vrata (x duz vrata, z visina) - prema fotografijama:
# zadnji prozor ima veliki kosi donji spoljni ugao, prednji je blago trapezast.
WIN_AFT = [(-0.74, 1.14), (-0.74, 0.78), (-0.53, 0.575), (-0.06, 0.50), (-0.06, 1.14)]
WIN_FWD = [(0.04, 1.14), (0.04, 0.50), (0.745, 0.50), (0.725, 1.14)]
WIN_R = 0.075


def poly_ccw(pts):
    area = 0.0
    for i in range(len(pts)):
        x0, z0 = pts[i]
        x1, z1 = pts[(i + 1) % len(pts)]
        area += x0 * z1 - x1 * z0
    return list(pts) if area > 0 else list(reversed(pts))


def offset_poly(pts, d):
    """Pomeri konveksni poligon (x,z) ka spolja za d."""
    p = poly_ccw(pts)
    n = len(p)
    lines = []
    for i in range(n):
        x0, z0 = p[i]
        x1, z1 = p[(i + 1) % n]
        dx, dz = x1 - x0, z1 - z0
        L = math.hypot(dx, dz)
        nx, nz = dz / L, -dx / L
        lines.append(((x0 + nx * d, z0 + nz * d), (dx, dz)))
    out = []
    for i in range(n):
        (pa, da), (pb, db) = lines[i - 1], lines[i]
        den = da[0] * db[1] - da[1] * db[0]
        if abs(den) < 1e-12:
            out.append(pb)
            continue
        t = ((pb[0] - pa[0]) * db[1] - (pb[1] - pa[1]) * db[0]) / den
        out.append((pa[0] + da[0] * t, pa[1] + da[1] * t))
    return out


def win_curve(poly, y, r):
    pts = [P(x, y, z) for (x, z) in poly_ccw(poly)]
    pl = rg.PolylineCurve(pts + [pts[0]])
    try:
        c = rg.Curve.CreateFilletCornersCurve(pl, r, TOLM, 0.01)
        if c:
            return c
    except Exception:
        pass
    return pl


def door_parts(sg):
    """Klizna vrata u ZATVORENOM polozaju: lista (geometrija, sloj)."""
    parts = []
    y_in, y_out = sg * 0.80, sg * (SKIN_A + 0.006)
    slab = box(-AP_X + 0.005, AP_X - 0.005, min(y_in, y_out), max(y_in, y_out), AP_Z0, AP_Z1, 0.14)
    cutters = [prism(win_curve(w, sg * 0.70, WIN_R), V(0, sg * 0.25, 0)) for w in (WIN_AFT, WIN_FWD)]
    cutters = [c for c in cutters if c is not None]
    for g in diff(slab, cutters):
        parts.append((g, "B429_Oplata_siva"))
    ymid = sg * (SKIN_A - 0.04)
    for w in (WIN_AFT, WIN_FWD):
        gl = prism(win_curve(offset_poly(w, 0.012), ymid - sg * 0.004, WIN_R + 0.01), V(0, sg * 0.008, 0))
        parts.append((gl, "B429_Staklo_tamno"))
        # dubok svetli okvir (reveal) kao na fotografijama
        outer = win_curve(offset_poly(w, 0.045), sg * 0.80, WIN_R + 0.04)
        inner = win_curve(w, sg * 0.80, WIN_R)
        for g in ring(outer, inner, V(0, -sg * 0.016, 0)):
            parts.append((g, "B429_Okviri_prozora"))
    # svetla unutrasnja obloga sa izrezima prozora
    trim = box(-0.80, 0.80, sg * 0.784, sg * 0.80, 0.08, 1.23, 0.10)
    tcut = [prism(win_curve(offset_poly(w, 0.045), sg * 0.70, WIN_R + 0.04), V(0, sg * 0.25, 0))
            for w in (WIN_AFT, WIN_FWD)]
    for g in diff(trim, [c for c in tcut if c is not None]):
        parts.append((g, "B429_Zidovi_plafon"))
    # tamna donja obloga - gornja ivica prati donje ivice prozora (i kosi ugao)
    lin = [(-0.79, 0.09), (0.79, 0.09), (0.79, 0.44), (0.02, 0.44),
           (-0.08, 0.45), (-0.53, 0.525), (-0.79, 0.78)]
    lp = [P(x, sg * 0.784, z) for (x, z) in poly_ccw(lin)]
    try:
        lcrv = rg.Curve.CreateFilletCornersCurve(rg.PolylineCurve(lp + [lp[0]]), 0.04, TOLM, 0.01)
    except Exception:
        lcrv = None
    if not lcrv:
        lcrv = rg.PolylineCurve(lp + [lp[0]])
    parts.append((prism(lcrv, V(0, -sg * 0.012, 0)), "B429_Paneli_tamni"))
    # sav na tamnoj oblozi
    parts.append((rg.LineCurve(P(-0.75, sg * 0.771, 0.13), P(0.75, sg * 0.771, 0.13)), "B429_Savovi"))
    # rucica za otvaranje (svetla, uvucena) i EXIT 1
    parts.append((box(-0.36, -0.20, sg * 0.766, sg * 0.778, 0.445, 0.468, 0.008), "B429_Zidovi_plafon"))
    parts.append((box(-0.38, -0.26, sg * 0.768, sg * 0.772, 0.37, 0.41, 0.006), "B429_Oznake"))
    parts.append((box(-0.37, -0.27, sg * 0.766, sg * 0.768, 0.378, 0.402, 0.0), "B429_Zidovi_plafon"))
    # hrom rukohvati na stubu izmedju prozora
    for x in (-0.075, 0.055):
        pts = [P(x, sg * 0.784, 0.62), P(x, sg * 0.752, 0.70), P(x, sg * 0.752, 0.95), P(x, sg * 0.784, 1.02)]
        try:
            crv = rg.Curve.CreateInterpolatedCurve(pts, 3)
            res = rg.Brep.CreatePipe(crv, 0.009, False, rg.PipeCapMode.Round, True, TOLM, 0.01)
            for g in (res or []):
                parts.append((g, "B429_Hrom_metal"))
        except Exception:
            for i in range(3):
                parts.append((cyl(pts[i], pts[i + 1], 0.009), "B429_Hrom_metal"))
    # spoljna kvaka
    parts.append((box(-0.60, -0.45, sg * (SKIN_A + 0.006), sg * (SKIN_A + 0.024), 0.62, 0.66, 0.01),
                   "B429_Hrom_metal"))
    return parts


def build_sliding_doors():
    for sg, frac in ((1, DOOR_OPEN_PORT), (-1, DOOR_OPEN_STBD)):
        T = rg.Transform.Translation(-DOOR_TRAVEL * frac, 0, 0)
        for g, lay in door_parts(sg):
            g.Transform(T)
            add(g, lay)
        # fiksni okvir otvora, prag i sine
        o = P(0, sg * 0.76, (AP_Z0 + AP_Z1) / 2.0)
        outer = rrect(o, XA, ZA, 2 * AP_X + 0.07, (AP_Z1 - AP_Z0) + 0.07, 0.18)
        inner = rrect(o, XA, ZA, 2 * AP_X, (AP_Z1 - AP_Z0), 0.16)
        add(ring(outer, inner, V(0, sg * 0.124, 0)), "B429_Okviri_prozora")
        add(box(-AP_X, AP_X, sg * 0.74, sg * 0.88, 0.0, 0.035, 0.004), "B429_Alu_prag")
        add(box(-AP_X + 0.05, AP_X - 0.05, sg * 0.80 - 0.006, sg * 0.80 + 0.006, 0.035, 0.037), "B429_Pod_prostirka")
        for yy in (0.77, 0.84):
            x = -AP_X + 0.04
            while x < AP_X - 0.03:
                add(cyl(P(x, sg * yy, 0.035), P(x, sg * yy, 0.0375), 0.0045), "B429_Hrom_metal")
                x += 0.045
        # gornja sina (unutra) i kolica
        add(box(-0.86, 0.86, sg * 0.73, sg * 0.80, 1.20, 1.26, 0.01), "B429_Alu_prag")
        for xr in (-0.35, 0.35):
            add(box(xr - 0.07, xr + 0.07, sg * 0.73, sg * 0.79, 1.255, 1.30, 0.01), "B429_Hrom_metal")
        # spoljne sine duz trupa (po kojima klize vrata)
        a = SKIN_A
        add(box(-2.10, 0.85, sg * a, sg * (a + 0.014), 1.255, 1.285), "B429_Oplata_tamna")
        add(box(-2.10, 0.85, sg * a, sg * (a + 0.014), 0.0, 0.03), "B429_Oplata_tamna")


# ============================ KABINA ============================
CEIL_HW = 0.80
R_ARCH = (CEIL_HW ** 2 + (H - ZW) ** 2) / (2.0 * (H - ZW))


def ceil_z(y):
    return (H - R_ARCH) + math.sqrt(R_ARCH ** 2 - min(abs(y), CEIL_HW) ** 2)


def ceil_alpha(y):
    if y == 0:
        return 0.0
    phi = math.asin(min(abs(y) / R_ARCH, 1.0))
    return -phi if y > 0 else phi


def on_ceiling(parts, x, y):
    T = rg.Transform.Translation(x, y, ceil_z(y)) * \
        rg.Transform.Rotation(ceil_alpha(y), XA, P(0, 0, 0))
    for g, lay in parts:
        g.Transform(T)
        add(g, lay)


def build_cabin_shell():
    # pod
    add(box(-XB - 0.04, XB + 0.04, -0.82, 0.82, -0.05, 0.0), "B429_Pod_prostirka")
    aw = 0.32
    add(box(-aw, aw, -0.78, 0.78, 0.0, 0.008, 0.002), "B429_Pod_tepih")
    xr = -aw + 0.01
    while xr < aw - 0.005:
        add(box(xr - 0.003, xr + 0.003, -0.76, 0.76, 0.008, 0.0105), "B429_Pod_tepih")
        xr += 0.02
    for sx in (-1, 1):
        add(box(sx * aw, sx * XB, -0.78, 0.78, 0.0, 0.006, 0.002), "B429_Pod_prostirka")
        for vv in (0.20, 0.48):
            xx = sx * (XB - vv)
            add(box(xx - 0.015, xx + 0.015, -0.78, 0.78, 0.006, 0.018, 0.004), "B429_Alu_prag")
    # plafon (luk)
    x0 = -XB
    pc = rg.PolyCurve()
    pc.Append(rg.ArcCurve(rg.Arc(P(x0, -CEIL_HW, ZW), P(x0, 0, H), P(x0, CEIL_HW, ZW))))
    pc.Append(rg.Line(P(x0, CEIL_HW, ZW), P(x0, CEIL_HW, ZW + 0.03)))
    pc.Append(rg.ArcCurve(rg.Arc(P(x0, CEIL_HW, ZW + 0.03), P(x0, 0, H + 0.03), P(x0, -CEIL_HW, ZW + 0.03))))
    pc.Append(rg.Line(P(x0, -CEIL_HW, ZW + 0.03), P(x0, -CEIL_HW, ZW)))
    add(prism(pc, V(2 * XB, 0, 0)), "B429_Zidovi_plafon")
    # pregrade (iza sedista)
    for sx in (-1, 1):
        add(box(sx * XB, sx * (XB + 0.04), -0.80, 0.80, 0.0, 0.98, 0.0), "B429_Paneli_tamni")
        add(box(sx * XB, sx * (XB + 0.04), -0.80, 0.80, 0.98, ZW + 0.02, 0.0), "B429_Zidovi_plafon")
    # nalepnice (placards) iznad sedista
    for sx in (-1, 1):
        for yy in (-0.28, 0.28):
            add(box(sx * (XB - 0.004), sx * XB, yy - 0.06, yy + 0.06, 1.04, 1.10), "B429_Svetla")
    # Bell logo ploca
    add(box(XB - 0.014, XB, -0.64, -0.56, 1.18, 1.24, 0.01), "B429_Plafon_detalji")
    # stubovi izmedju vrata i pregrada
    for sx in (-1, 1):
        for sg in (-1, 1):
            add(box(sx * (XB - 0.07), sx * XB, sg * 0.70, sg * 0.80, 0.0, ZW, 0.01), "B429_Zidovi_plafon")


def build_cabin_ceiling():
    # ugradjena okrugla svetla (6 komada)
    for x in (-0.55, 0.0, 0.55):
        for y in (-0.42, 0.42):
            g = [(cyl(P(0, 0, 0.002), P(0, 0, -0.010), 0.034), "B429_Hrom_metal"),
                 (cyl(P(0, 0, -0.010), P(0, 0, -0.013), 0.020), "B429_Svetla")]
            on_ceiling(g, x, y)
    # centralni panel
    cz = ceil_z(0.0)
    o = P(0.0, 0.0, cz + 0.002)
    outer = rrect(o, XA, YA, 0.30, 1.00, 0.06)
    inner = rrect(o, XA, YA, 0.26, 0.96, 0.045)
    add(ring(outer, inner, V(0, 0, -0.010)), "B429_Plafon_detalji")
    # tamni "pill" paneli uz sine vrata sa hrom drskama
    for sy in (-0.58, 0.58):
        for xh in (-0.52, 0.52):
            hand = [(prism(rrect(P(0, 0, 0.002), XA, YA, 0.34, 0.075, 0.03), V(0, 0, -0.012)),
                     "B429_Plafon_detalji"),
                    (cyl(P(-0.12, 0, -0.036), P(0.12, 0, -0.036), 0.009), "B429_Hrom_metal")]
            for sx in (-0.12, 0.12):
                hand.append((cyl(P(sx, 0, -0.036), P(sx, 0, -0.004), 0.008), "B429_Hrom_metal"))
            on_ceiling(hand, xh, sy)
    # rukohvati iznad prozora (kozni, hrom nosaci)
    for sy in (-0.62, 0.62):
        for xh in (-0.35, 0.35):
            hand = [(box(-0.13, 0.13, -0.015, 0.015, -0.050, -0.030, 0.01), "B429_Koza_tamna")]
            for sx in (-0.12, 0.12):
                hand.append((box(sx - 0.02, sx + 0.02, -0.02, 0.02, -0.050, 0.0, 0.006), "B429_Hrom_metal"))
            on_ceiling(hand, xh, sy)


# ----- sedista (skulptorski oblici, loft po presecima) -----
# profil jastuka (v = dubina od pregrade, z) - zadnji svetli deo i prednji "waterfall" deo
CUSH_REAR = [(0.17, 0.35), (0.17, 0.44), (0.30, 0.447), (0.42, 0.452), (0.52, 0.465), (0.53, 0.36), (0.35, 0.34)]
CUSH_FRONT = [(0.48, 0.36), (0.48, 0.468), (0.56, 0.50), (0.645, 0.472), (0.65, 0.385), (0.60, 0.35)]
# poprecne stanice preko sirine sedista: (pomak od ivice ili sredine, skala, podizanje bocnog jastuka)
CUSH_ST = [(-1.000, 0.84, 0.000), (-0.940, 0.96, 0.008), (-0.760, 1.00, 0.014), (0.0, 1.00, 0.0),
           (0.760, 1.00, 0.014), (0.940, 0.96, 0.008), (1.000, 0.84, 0.000)]
# naslon: (z, sirina, pomak napred) - siroka ledja, kosa ramena, uzi integrisani naslon za glavu
BACK_ST = [(0.36, 0.46, 0.000), (0.50, 0.47, 0.012), (0.66, 0.47, 0.008), (0.78, 0.465, 0.0),
           (0.845, 0.40, 0.0), (0.895, 0.33, 0.008), (1.00, 0.32, 0.014), (1.08, 0.295, 0.014),
           (1.125, 0.21, 0.012)]


def capped_loft(curves):
    g = loft(curves)
    if g is None:
        return None
    c = g.CapPlanarHoles(TOLM)
    return c if c else g


def hsec(Xw, yc, z, w, d, v0, n, N=24):
    """Horizontalni zaobljeni presek (za naslon) na visini z."""
    e = 2.0 / n
    pts = []
    for i in range(N):
        t = 2.0 * math.pi * i / N
        u = yc + (w / 2.0) * sgn_pow(math.cos(t), e)
        v = v0 + d / 2.0 + (d / 2.0) * sgn_pow(math.sin(t), e)
        pts.append(P(Xw(v), u, z))
    return closed_curve(pts)


def vz_curve(Xw, u, prof, scale=1.0, raise_top=0.0):
    vc = sum(p[0] for p in prof) / len(prof)
    zc = sum(p[1] for p in prof) / len(prof)
    pts = []
    for (v, z) in prof:
        vv = vc + (v - vc) * scale
        zz = zc + (z - zc) * scale
        if z > 0.42:
            zz += raise_top
        pts.append(P(Xw(vv), u, zz))
    return closed_curve(pts)


def fillet_poly_vz(Xw, u, poly, r):
    pts = [P(Xw(v), u, z) for (v, z) in poly]
    pl = rg.PolylineCurve(pts + [pts[0]])
    try:
        c = rg.Curve.CreateFilletCornersCurve(pl, r, TOLM, 0.01)
        if c:
            return c
    except Exception:
        pass
    return pl


def build_seat(wx, s, yc, outer_side):
    """wx = x pregrade, s=+1 sedi uz zadnju pregradu (gleda napred), s=-1 uz prednju (gleda nazad)."""
    hw = SEAT_W / 2.0

    def Xw(v):
        return wx + s * v

    # --- postolje: tamna kada ispod jastuka + kosi stub sa mrezom
    pan = [(0.12, 0.28), (0.58, 0.28), (0.655, 0.33), (0.655, 0.375), (0.12, 0.375)]
    add(prism(fillet_poly_vz(Xw, yc - hw + 0.006, pan, 0.03), V(0, SEAT_W - 0.012, 0)), "B429_Koza_tamna")
    ped = [(0.15, 0.025), (0.47, 0.025), (0.57, 0.28), (0.13, 0.28)]
    pw = SEAT_W - 0.05
    add(prism(fillet_poly_vz(Xw, yc - pw / 2.0, ped, 0.025), V(0, pw, 0)), "B429_Koza_tamna")
    # mreza na kosom celu stuba
    fv0, fz0, fv1, fz1 = 0.47, 0.025, 0.57, 0.28
    L = math.hypot(fv1 - fv0, fz1 - fz0)
    nv, nz = (fz1 - fz0) / L, -(fv1 - fv0) / L
    q = []
    for (tt, uu) in ((0.12, -1), (0.12, 1), (0.86, 1), (0.86, -1)):
        vv = fv0 + (fv1 - fv0) * tt + nv * 0.002
        zz = fz0 + (fz1 - fz0) * tt + nz * 0.002
        q.append(P(Xw(vv), yc + uu * (pw / 2.0 - 0.04), zz))
    mesh = poly_prism(q, V(s * nv * 0.004, 0, nz * 0.004))
    add(mesh, "B429_Pod_prostirka")
    add(rg.PolylineCurve([q[0], q[1], q[2], q[3], q[0]]), "B429_Savovi")
    # mreza na bocnoj strani (spoljna sedista)
    if outer_side != 0:
        uu = yc + outer_side * (pw / 2.0)
        side = [(0.19, 0.06), (0.45, 0.06), (0.52, 0.25), (0.18, 0.25)]
        add(prism(fillet_poly_vz(Xw, uu, side, 0.015), V(0, outer_side * 0.004, 0)), "B429_Pod_prostirka")

    # --- jastuk: loft profila preko sirine (bocni jastuci malo uzdignuti, ivice zaobljene)
    for prof, lay in ((CUSH_REAR, "B429_Koza_svetla"), (CUSH_FRONT, "B429_Koza_srednja")):
        crvs = []
        for (f, sc_, rz) in CUSH_ST:
            crvs.append(vz_curve(Xw, yc + f * (hw - 0.008), prof, sc_, rz))
        add(capped_loft(crvs), lay)
    # savovi jastuka
    for sx in (-1, 1):
        uu = yc + sx * (hw - 0.065)
        add(rg.LineCurve(P(Xw(0.19), uu, 0.462), P(Xw(0.50), uu, 0.476)), "B429_Savovi")
    add(rg.LineCurve(P(Xw(0.50), yc - hw + 0.03, 0.478), P(Xw(0.50), yc + hw - 0.03, 0.478)), "B429_Savovi")

    # --- naslon (gradi se uspravno, pa se naginje prema pregradi)
    back = []
    shell = [hsec(Xw, yc, z, w, 0.10, BV + vo, 5.0) for (z, w, vo) in BACK_ST]
    back.append((capped_loft(shell), "B429_Koza_tamna"))
    pad = []
    for i, (z, w, vo) in enumerate(BACK_ST):
        zz = 0.38 if i == 0 else (1.115 if i == len(BACK_ST) - 1 else z)
        pad.append(hsec(Xw, yc, zz, w - 0.035, 0.055, BV + 0.065 + vo, 4.0))
    back.append((capped_loft(pad), "B429_Koza_svetla"))
    # gornji izdignuti jastuk (sa znakom) i donji lumbalni panel
    pil = [hsec(Xw, yc, z, w, 0.03, BV + 0.105, 4.0)
           for (z, w) in ((0.60, 0.25), (0.615, 0.28), (0.805, 0.28), (0.825, 0.24))]
    back.append((capped_loft(pil), "B429_Koza_svetla"))
    lum = [hsec(Xw, yc, z, w, 0.02, BV + 0.112, 4.0)
           for (z, w) in ((0.42, 0.28), (0.43, 0.30), (0.585, 0.30), (0.595, 0.28))]
    back.append((capped_loft(lum), "B429_Koza_srednja"))
    # savovi naslona
    vfp = BV + 0.121
    for sx in (-1, 1):
        back.append((rg.LineCurve(P(Xw(vfp), yc + sx * 0.152, 0.40), P(Xw(vfp), yc + sx * 0.152, 0.83)),
                     "B429_Savovi"))
    back.append((rg.LineCurve(P(Xw(vfp), yc - 0.15, 0.598), P(Xw(vfp), yc + 0.15, 0.598)), "B429_Savovi"))
    # Bell stit na gornjem jastuku
    vf = BV + 0.135
    sw, sh, zt = 0.065, 0.08, 0.765
    pts = [P(Xw(vf), yc - sw / 2, zt), P(Xw(vf), yc + sw / 2, zt),
           P(Xw(vf), yc + sw / 2, zt - sh * 0.55), P(Xw(vf), yc, zt - sh),
           P(Xw(vf), yc - sw / 2, zt - sh * 0.55)]
    shield = poly_prism(pts, V(s * 0.003, 0, 0))
    if shield:
        back.append((shield, "B429_Koza_tamna"))
    back.append((box(Xw(vf), Xw(vf + 0.0035), yc - 0.0015, yc + 0.0015, zt - 0.072, zt - 0.012),
                 "B429_Koza_srednja"))
    back.append((box(Xw(vf), Xw(vf + 0.0035), yc - 0.020, yc + 0.020, zt - 0.040, zt - 0.037),
                 "B429_Koza_srednja"))
    # pojas: cvor preko vrha naslona za glavu + dijagonalni deo
    back.append((cyl(P(Xw(BV + 0.06), yc - 0.12, 1.122), P(Xw(BV + 0.06), yc + 0.12, 1.122), 0.022),
                 "B429_Pojasevi"))
    back.append((box(Xw(BV + 0.01), Xw(BV + 0.13), yc - 0.03, yc + 0.03, 1.08, 1.14, 0.015), "B429_Pojasevi"))
    q = [P(Xw(BV + 0.142), yc + 0.07, 1.06), P(Xw(BV + 0.142), yc + 0.12, 1.06),
         P(Xw(BV + 0.142), yc - 0.19, 0.46), P(Xw(BV + 0.142), yc - 0.24, 0.46)]
    strap = poly_prism(q, V(s * 0.004, 0, 0))
    if strap:
        back.append((strap, "B429_Pojasevi"))

    tilt = rg.Transform.Rotation(-s * math.radians(RECLINE), YA, P(Xw(BV), yc, 0.34))
    for g, lay in back:
        if g is None:
            continue
        g.Transform(tilt)
        add(g, lay)

    # --- pojas oko struka sa kopcom
    add(box(Xw(0.27), Xw(0.315), yc - 0.22, yc - 0.035, 0.444, 0.448), "B429_Pojasevi")
    add(box(Xw(0.27), Xw(0.315), yc + 0.035, yc + 0.22, 0.444, 0.448), "B429_Pojasevi")
    add(box(Xw(0.255), Xw(0.330), yc - 0.040, yc + 0.040, 0.446, 0.460, 0.006), "B429_Hrom_metal")
    add(box(Xw(0.270), Xw(0.315), yc - 0.012, yc + 0.012, 0.460, 0.465, 0.002), "B429_Oznake")


def build_table(wx, s, yg):
    def Xw(v):
        return wx + s * v
    # nosac izlazi iz procepa izmedju sedista
    add(box(Xw(0.30), Xw(0.52), yg - 0.018, yg + 0.018, 0.42, 0.64, 0.012), "B429_Koza_tamna")
    tp = [(0.40, -0.13), (0.62, -0.15), (0.68, -0.10), (0.68, 0.10), (0.62, 0.15), (0.40, 0.13)]
    pts = [P(Xw(v), yg + u, 0.64) for (v, u) in tp]
    pl = rg.PolylineCurve(pts + [pts[0]])
    try:
        c = rg.Curve.CreateFilletCornersCurve(pl, 0.03, TOLM, 0.01)
    except Exception:
        c = None
    add(prism(c if c else pl, V(0, 0, 0.022)), "B429_Sto")
    for dy in (-0.065, 0.065):
        c0 = P(Xw(0.57), yg + dy, 0.662)
        add(cyl(c0, P(c0.X, c0.Y, 0.666), 0.040), "B429_Hrom_metal")
        add(cyl(P(c0.X, c0.Y, 0.664), P(c0.X, c0.Y, 0.6675), 0.033), "B429_Pod_prostirka")


def build_cabin():
    set_env(-1.2, 1.2, -1.0, 1.0, -0.12, 1.6)
    build_cabin_shell()
    build_cabin_ceiling()
    for wx, s in ((-XB, 1), (XB, -1)):
        for yc in SEAT_Y:
            outer = 0 if abs(yc) < 0.1 else (1 if yc > 0 else -1)
            build_seat(wx, s, yc, outer)
        if s == -1:
            build_table(wx, s, TABLE_GAP_Y)


# ============================ KOKPIT ============================
def crew_seat(xc, yc):
    add(box(xc - 0.20, xc + 0.20, yc - 0.20, yc + 0.20, 0.0, 0.30, 0.03), "B429_Sedista_konstrukcija")
    add(box(xc - 0.22, xc + 0.22, yc - 0.24, yc + 0.24, 0.30, 0.42, 0.04), "B429_Koza_svetla")
    for sy in (-1, 1):
        add(box(xc - 0.22, xc + 0.22, yc + sy * 0.215 - 0.025, yc + sy * 0.215 + 0.025, 0.30, 0.48, 0.02),
            "B429_Koza_tamna")
    back = [(box(xc - 0.26, xc - 0.15, yc - 0.24, yc + 0.24, 0.40, 1.00, 0.04), "B429_Koza_tamna"),
            (box(xc - 0.17, xc - 0.12, yc - 0.18, yc + 0.18, 0.46, 0.92, 0.03), "B429_Koza_svetla"),
            (box(xc - 0.25, xc - 0.14, yc - 0.15, yc + 0.15, 1.00, 1.22, 0.04), "B429_Koza_tamna"),
            (box(xc - 0.16, xc - 0.12, yc - 0.12, yc + 0.12, 1.02, 1.20, 0.025), "B429_Koza_svetla")]
    tilt = rg.Transform.Rotation(-math.radians(10.0), YA, P(xc - 0.20, yc, 0.40))
    for g, lay in back:
        g.Transform(tilt)
        add(g, lay)


def build_cockpit():
    set_env(0.85, 3.6, -1.0, 1.0, -0.12, 2.0)
    add(box(0.98, 2.55, -0.62, 0.62, -0.04, 0.0), "B429_Pod_prostirka")
    add(box(1.02, 2.40, -0.55, 0.55, 0.0, 0.006, 0.002), "B429_Pod_tepih")
    for yc in (-0.38, 0.38):
        crew_seat(1.55, yc)
        # ciklik i pedale
        add(cyl(P(1.98, yc, 0.20), P(1.98, yc, 0.74), 0.014), "B429_Rotor_crni")
        add(box(1.94, 2.02, yc - 0.020, yc + 0.020, 0.74, 0.86, 0.015), "B429_Rotor_crni")
        for pdy in (-0.09, 0.09):
            add(box(2.25, 2.38, yc + pdy - 0.04, yc + pdy + 0.04, 0.03, 0.14, 0.01), "B429_Oplata_tamna")
    # kolektiv (levo pored levog pilota)
    add(box(1.50, 1.95, 0.64 - 0.015, 0.64 + 0.015, 0.34, 0.37, 0.01), "B429_Rotor_crni")
    # instrument tabla i glareshield
    add(box(2.30, 2.36, -0.62, 0.62, 0.46, 0.84, 0.03), "B429_Oplata_tamna")
    add(box(2.28, 2.62, -0.62, 0.62, 0.84, 0.92, 0.03), "B429_Oplata_tamna")
    for (y0, y1) in ((-0.50, -0.06), (0.06, 0.50)):
        add(box(2.268, 2.30, y0, y1, 0.52, 0.80, 0.015), "B429_Ekrani")
    add(box(2.268, 2.30, -0.04, 0.04, 0.52, 0.80, 0.01), "B429_Kokpit_instrumenti")
    # sredisnja konzola
    add(box(1.65, 2.30, -0.13, 0.13, 0.0, 0.42, 0.03), "B429_Kokpit_instrumenti")
    add(box(2.00, 2.30, -0.12, 0.12, 0.42, 0.66, 0.02), "B429_Oplata_tamna")
    # gornji panel
    add(box(1.55, 2.05, -0.22, 0.22, 1.30, 1.38, 0.02), "B429_Kokpit_instrumenti")


# ============================ KAMERE ============================
def add_view(name, loc, tgt, lens):
    try:
        view = sc.doc.Views.ActiveView
        vp = view.ActiveViewport
        vp.ChangeToPerspectiveProjection(True, lens)
        vp.SetCameraLocations(P(tgt[0] * K, tgt[1] * K, tgt[2] * K), P(loc[0] * K, loc[1] * K, loc[2] * K))
        sc.doc.NamedViews.Add(name, vp.Id)
        view.Redraw()
    except Exception as e:
        print("Pogled %s nije postavljen: %s" % (name, e))


# ============================ GLAVNI TOK ============================
def safe(fn, label):
    try:
        fn()
    except Exception as e:
        print("GRESKA u delu '%s': %s" % (label, e))


def main():
    make_layers()
    undo = sc.doc.BeginUndoRecord("Bell 429 helikopter")
    try:
        if BUILD_EXTERIOR:
            set_env(-8.0, 6.5, -7.0, 7.0, -1.3, 4.2)
            safe(build_hull, "trup")
            safe(build_cockpit_glass, "staklo kokpita")
            safe(build_engine_cowling, "motorski poklopac")
            safe(build_tail, "rep")
            safe(build_main_rotor, "glavni rotor")
            safe(build_landing_gear, "stajni trap")
            safe(build_crew_doors, "vrata pilota")
            safe(build_sliding_doors, "klizna vrata")
        if BUILD_COCKPIT:
            safe(build_cockpit, "kokpit")
        if BUILD_CABIN:
            safe(build_cabin, "kabina")
    finally:
        sc.doc.EndUndoRecord(undo)
    add_view("Bell429_enterijer_foto", (0.10, -1.55, 0.78), (0.0, 0.9, 0.62), 20.0)
    add_view("Bell429_kokpit", (1.20, 0.0, 0.85), (3.0, 0.0, 0.60), 24.0)
    add_view("Bell429_spolja", (10.5, -9.0, 3.2), (-0.5, 0.0, 0.9), 35.0)
    sc.doc.Views.Redraw()
    try:
        Rhino.RhinoApp.RunScript("_-Zoom _All _Extents", False)
    except Exception:
        pass
    print("Gotovo: %d objekata (preskoceno: %d). Slojevi B429_*. Pogledi: Bell429_spolja / _enterijer_foto / _kokpit"
          % (COUNT[0], SKIPPED[0]))


main()
