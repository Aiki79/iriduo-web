"""User's original icon + stylized VR visor on the blue head (fading out where it crosses
into the centre) and eyes on the red head (the eye in the centre also faded):
one person wears the visor, the other does not."""
import sys
from PIL import Image, ImageChops, ImageDraw, ImageFilter

NAVY = (14, 26, 43)
CY = (92, 200, 224)
CYL = (180, 235, 245)


def hfade(size, x0, x1, a0=255, a1=40):
    """Horizontal alpha ramp: a0 left of x0, a1 right of x1."""
    W, H = size
    row = [int(a0 if x <= x0 else a1 if x >= x1 else a0 + (a1 - a0) * (x - x0) / (x1 - x0)) for x in range(W)]
    g = Image.new("L", (W, 1))
    g.putdata(row)
    return g.resize((W, H))


def make(src, dst, bx, cy, r, rx):
    """bx / rx: centres of the blue and red heads, cy their height, r their radius (pixels)."""
    img = Image.open(src).convert("RGBA")
    W, H = img.size
    s = 4
    S = (W * s, H * s)

    # visor on the blue head
    ov = Image.new("RGBA", S, (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    X, Y, R = bx * s, cy * s, r * s
    w, h = R * 0.92, R * 0.6
    top = Y - h * 0.62
    d.rounded_rectangle((X - R * 1.2, top + h * 0.32, X + R * 1.2, top + h * 0.6), radius=int(h * 0.14), fill=CY + (255,))
    d.rounded_rectangle((X - w, top, X + w, top + h), radius=int(h * 0.38), fill=CY + (255,))
    d.rounded_rectangle((X - w * 0.8, top + h * 0.2, X + w * 0.8, top + h * 0.8), radius=int(h * 0.3), fill=NAVY + (255,))
    d.rounded_rectangle((X - w * 0.62, top + h * 0.3, X - w * 0.2, top + h * 0.42), radius=int(h * 0.06), fill=CYL + (200,))
    d.pieslice((X - h * 0.2, top + h * 0.62, X + h * 0.2, top + h * 1.02), 180, 360, fill=CY + (255,))
    m = Image.new("L", S, 0)
    ImageDraw.Draw(m).ellipse((X - R * 1.02, Y - R * 1.02, X + R * 1.02, Y + R * 1.02), fill=255)
    # fade towards the centre of the icon, where the two heads cross
    fade = hfade(S, (bx + r * 0.05) * s, (bx + r * 0.95) * s, 255, 35)
    ov.putalpha(ImageChops.multiply(ImageChops.multiply(ov.getchannel("A"), m), fade))

    # eyes on the red head; the one in the centre is faded too
    eyes = Image.new("RGBA", S, (0, 0, 0, 0))
    ed = ImageDraw.Draw(eyes)
    er = R * 0.13
    ey = Y - R * 0.12
    for ex in (rx * s - R * 0.36, rx * s + R * 0.36):
        ed.ellipse((ex - er, ey - er * 1.25, ex + er, ey + er * 1.25), fill=NAVY + (255,))
        ed.ellipse((ex - er * 0.15, ey - er * 0.9, ex + er * 0.45, ey - er * 0.3), fill=(255, 255, 255, 200))
    efade = hfade(S, (rx - r * 0.55) * s, (rx + r * 0.1) * s, 70, 255)
    eyes.putalpha(ImageChops.multiply(eyes.getchannel("A"), efade))

    layer = Image.alpha_composite(eyes, ov).resize((W, H), Image.LANCZOS)
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sh.putalpha(layer.getchannel("A").point(lambda v: int(v * 0.4)))
    sh = sh.filter(ImageFilter.GaussianBlur(r * 0.06))
    Image.alpha_composite(Image.alpha_composite(img, sh), layer).save(dst)


if __name__ == "__main__":
    make(sys.argv[1], sys.argv[2], *map(float, sys.argv[3:7]))
    print("ok", sys.argv[2])
