"""User's original icon + line-art Meta Quest-style visor on the blue head and line-art eyes on the red head.
Strokes are bold on the outer side and get thinner (and lighter) towards the centre,
where the two heads cross: one person wears the visor, the other does not."""
import sys
from PIL import Image, ImageChops, ImageDraw, ImageFilter

INK = (14, 26, 43)


def ramp(size, x0, x1, a0, a1):
    """Horizontal ramp: a0 left of x0, a1 right of x1 (x0 < x1)."""
    W, H = size
    row = [int(a0 if x <= x0 else a1 if x >= x1 else a0 + (a1 - a0) * (x - x0) / (x1 - x0)) for x in range(W)]
    g = Image.new("L", (W, 1))
    g.putdata(row)
    return g.resize((W, H))


def strokes(size, draw_fn, width):
    m = Image.new("L", size, 0)
    draw_fn(ImageDraw.Draw(m), width)
    return m


def blend_widths(size, draw_fn, thick, thin, wmask, levels=12):
    """Stroke width tapers from `thick` (wmask 255) to `thin` (wmask 0) in fine hard steps,
    so the line gets thinner without grey halos."""
    out = Image.new("L", size, 0)
    for i in range(levels):
        lo, hi = 256 * i // levels, 256 * (i + 1) // levels
        band = wmask.point(lambda v, lo=lo, hi=hi: 255 if lo <= v < hi or (hi == 256 and v == 255) else 0)
        width = thin + (thick - thin) * (i + 0.5) / levels
        out = ImageChops.lighter(out, ImageChops.multiply(strokes(size, draw_fn, width), band))
    return out


def make(src, dst, bx, cy, r, rx):
    """bx / rx: centres of the blue and red heads, cy their height, r their radius (pixels)."""
    img = Image.open(src).convert("RGBA")
    W, H = img.size
    s = 4
    S = (W * s, H * s)
    X, Y, R, RX = bx * s, cy * s, r * s, rx * s
    T, t = R * 0.045, R * 0.012  # thick / thin stroke

    # --- visor (blue head): Meta Quest-like front plate with nose arch, no lenses
    w, h = R * 1.0, R * 0.62
    top = Y - h * 0.6

    def visor(d, sw):
        sw = max(1, int(sw))
        d.rounded_rectangle((X - w, top, X + w, top + h), radius=int(h * 0.46), outline=255, width=sw)
        nw, nh = w * 0.2, h * 0.26  # nose arch
        d.rectangle((X - nw, top + h - sw * 2, X + nw, top + h + sw), fill=0)
        d.arc((X - nw, top + h - nh, X + nw, top + h + nh), 180, 360, fill=255, width=sw)
        d.line((X - R * 1.3, top + h * 0.42, X - w, top + h * 0.42), fill=255, width=sw)  # strap

    vw = ramp(S, X - w, X + w * 0.9, 255, 0)  # thick on the outer (left) side
    vmask = blend_widths(S, visor, T, t, vw)
    vmask = ImageChops.multiply(vmask, ramp(S, X - w * 0.2, X + w * 1.05, 255, 90))  # lighter towards the centre
    head = Image.new("L", S, 0)
    ImageDraw.Draw(head).ellipse((X - R * 1.03, Y - R * 1.03, X + R * 1.03, Y + R * 1.03), fill=255)
    vmask = ImageChops.multiply(vmask, head)

    # --- eyes (red head): almond outline + small pupil ring
    er = R * 0.2
    ey = Y - R * 0.1
    centres = (RX - R * 0.38, RX + R * 0.38)

    def eyes(d, sw):
        # stylized almond: a bold upper lid and a soft lower lid, no pupil
        sw = max(1, int(sw))
        for ex in centres:
            d.arc((ex - er, ey - er * 0.55, ex + er, ey + er * 0.95), 200, 340, fill=255, width=sw)
            d.arc((ex - er * 0.8, ey - er * 0.75, ex + er * 0.8, ey + er * 0.35), 35, 145, fill=255, width=max(1, int(sw * 0.6)))

    ew = ramp(S, RX - R * 0.6, RX + R * 0.55, 0, 255)  # thick on the outer (right) side
    emask = blend_widths(S, eyes, T * 1.1, t, ew)
    emask = ImageChops.multiply(emask, ramp(S, RX - R * 0.65, RX + R * 0.15, 90, 255))

    mask = ImageChops.lighter(vmask, emask).resize((W, H), Image.LANCZOS)
    ink = Image.new("RGBA", (W, H), INK + (255,))
    ink.putalpha(mask)
    soft = Image.new("RGBA", (W, H), (255, 255, 255, 0))
    soft.putalpha(mask.filter(ImageFilter.GaussianBlur(r * 0.04)).point(lambda v: int(v * 0.35)))
    Image.alpha_composite(Image.alpha_composite(img, soft), ink).save(dst)


if __name__ == "__main__":
    make(sys.argv[1], sys.argv[2], *map(float, sys.argv[3:7]))
    print("ok", sys.argv[2])
