"""Vector redraw (1024px, crisp) of the user's 192px IriDuo icon: two people facing each other,
the left one wears a VR visor, the right one is drawn in red/cyan 3D with a small visor
pushed up on the head (two little eyes). Coordinates are in the 192px reference grid."""
from PIL import Image, ImageDraw, ImageFilter

OUT = "/app/frontend/assets/images"
SS = 4096  # supersampled canvas, downscaled to 1024
K = SS / 192

BG_TOP, BG_BOT = (10, 19, 34), (25, 46, 80)
GLOW = (38, 76, 102)
GREY = (220, 230, 242)
WHITE = (244, 251, 255)
CYAN = (34, 211, 238)
RED = (255, 77, 109)
LINE = (93, 184, 208)
VISOR_A, VISOR_B = (20, 32, 54), (44, 74, 112)


def P(*v):
    return [x * K for x in v]


def background(size):
    bg = Image.new("RGB", (1, size))
    for y in range(size):
        t = y / (size - 1)
        bg.putpixel((0, y), tuple(int(BG_TOP[i] + (BG_BOT[i] - BG_TOP[i]) * t) for i in range(3)))
    bg = bg.resize((size, size)).convert("RGBA")
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse(P(36, 40, 156, 150), fill=GLOW + (190,))
    return Image.alpha_composite(bg, glow.filter(ImageFilter.GaussianBlur(28 * K)))


def body(d, x0, x1, top, bottom, fill):
    # shoulders = top of a wide ellipse, cut straight by the floor line (no vertical sides)
    h = bottom - top
    d.chord(P(x0, top, x1, top + 2 * h), 180, 360, fill=fill)


def visor_box(img, box, radius):
    """Dark visor with a subtle left->right gradient."""
    m = Image.new("L", img.size, 0)
    ImageDraw.Draw(m).rounded_rectangle(P(*box), radius=radius * K, fill=255)
    g = Image.new("RGBA", (256, 1))
    for x in range(256):
        g.putpixel((x, 0), tuple(int(VISOR_A[i] + (VISOR_B[i] - VISOR_A[i]) * x / 255) for i in range(3)) + (255,))
    x0, y0, x1, y1 = [int(v) for v in P(*box)]
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    layer.paste(g.resize((x1 - x0, y1 - y0)), (x0, y0))
    img.paste(layer, (0, 0), m)


def figures():
    img = Image.new("RGBA", (SS, SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # left person (wears the visor)
    d.ellipse(P(44.5, 67, 78.5, 101), fill=GREY)
    body(d, 31, 89.5, 112, 152, GREY)
    visor_box(img, (62, 75, 93, 92), 5)
    d.line(P(66, 78.5, 88, 77.5), fill=(120, 150, 190, 255), width=int(1.1 * K))  # glint
    d.arc(P(84, 74, 96, 93), -75, 75, fill=CYAN, width=int(1.6 * K))  # lens glow at the front

    # right person in 3D (cyan left, red right, white on top)
    hx, hy = 130.5, 86
    d.ellipse(P(hx - 3 - 17, hy - 17, hx - 3 + 17, hy + 17), fill=CYAN)
    d.ellipse(P(hx + 3 - 17, hy - 17, hx + 3 + 17, hy + 17), fill=RED)
    d.ellipse(P(hx - 15, hy - 15, hx + 15, hy + 15), fill=WHITE)
    body(d, 100, 158, 112, 152, CYAN)
    body(d, 106, 164, 112, 152, RED)
    body(d, 106, 158, 114, 152, WHITE)

    # small visor pushed up on the forehead, with two little eyes
    visor_box(img, (115, 57, 137, 69), 3)
    d.ellipse(P(116.6, 60.4, 121.4, 65.6), outline=CYAN, width=int(1.1 * K))
    d.ellipse(P(121.6, 60.4, 126.4, 65.6), outline=RED, width=int(1.1 * K))

    # floor line
    d.rounded_rectangle(P(22, 151.2, 170, 152.8), radius=0.8 * K, fill=LINE)
    return img


def compose(bg):
    fig = figures()
    halo = Image.new("RGBA", fig.size, (0, 0, 0, 0))
    halo.putalpha(fig.getchannel("A").point(lambda v: int(v * 0.35)))
    halo = Image.merge("RGBA", (*Image.new("RGB", fig.size, (150, 200, 230)).split(), halo.getchannel("A"))).filter(ImageFilter.GaussianBlur(3 * K))
    base = bg if bg is not None else Image.new("RGBA", fig.size, (0, 0, 0, 0))
    return Image.alpha_composite(Image.alpha_composite(base, halo), fig).resize((1024, 1024), Image.LANCZOS)


icon = compose(background(SS))
icon.convert("RGB").save(f"{OUT}/icon.png")
icon.resize((48, 48), Image.LANCZOS).convert("RGB").save(f"{OUT}/favicon.png")

art = compose(None)  # transparent artwork, background colour comes from app.json
adaptive = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
small = art.resize((660, 660), Image.LANCZOS)  # keep inside Android's safe zone
adaptive.paste(small, (182, 170), small)
adaptive.save(f"{OUT}/adaptive-icon.png")
art.resize((400, 400), Image.LANCZOS).save(f"{OUT}/splash-image.png")
print("ok")
