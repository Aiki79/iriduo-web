# Pixel checks for IriDuo icon.png / adaptive-icon.png (iteration 18)
import numpy as np
from PIL import Image

src = open("/app/scripts/draw_icon_v2.py").read().split("icon = compose(")[0]
ns = {}
exec(src, ns)
SS = ns["SS"]

icon = Image.open("/app/frontend/assets/images/icon.png")
print("icon:", icon.size, icon.mode)
a = np.asarray(icon).astype(int)
bg = np.asarray(ns["background"](SS).resize((1024, 1024), Image.LANCZOS).convert("RGB")).astype(int)
diff = np.abs(a - bg).max(axis=2)
# figure-only (no bg) to separate body pixels vs halo
fig = ns["figures"]().resize((1024, 1024), Image.LANCZOS)
fa = np.asarray(fig)[:, :, 3]
rows = np.where(fa.max(axis=1) > 8)[0]
print("figure alpha rows:", rows.min(), rows.max())
for y in range(800, 840, 2):
    print(y, "fig alpha max", fa[y].max(), "icon-vs-bg maxdiff", diff[y].max())
print("max diff rows >=830:", diff[830:].max(), " rows>=820:", diff[820:].max())
# figure alpha below line
below = fa[818:]
print("figure alpha >8 below y=818:", int((below > 8).sum()))
# check body shape: at line y≈805 width of grey body; above check no vertical sides -> widths at rows
for y in (600, 650, 700, 750, 790, 804):
    xs = np.where(fa[y, :480] > 128)[0]
    print("left body row", y, (xs.min(), xs.max()) if len(xs) else None)

ad = Image.open("/app/frontend/assets/images/adaptive-icon.png")
print("adaptive:", ad.size, ad.mode)
al = np.asarray(ad)[:, :, 3]
ys, xs = np.where(al > 8)
r = np.sqrt((xs - 511.5) ** 2 + (ys - 511.5) ** 2)
print("adaptive max radius (alpha>8):", r.max(), "alpha>64:", np.sqrt((np.where(al > 64)[1] - 511.5) ** 2 + (np.where(al > 64)[0] - 511.5) ** 2).max())
print("bbox", xs.min(), xs.max(), ys.min(), ys.max())
print("pixels beyond 313:", int((r > 313).sum()), "beyond 330:", int((r > 330).sum()))
ys2, xs2 = np.where(al > 128)
r2 = np.sqrt((xs2 - 511.5) ** 2 + (ys2 - 511.5) ** 2)
print("solid(alpha>128) max radius:", r2.max(), "beyond 313:", int((r2 > 313).sum()))
