"""Home-screen icons in sapIS / SAPEKOR brand colors.

Green #6ab023 is sapekor.com; #4a8019 is the light-mode primary (theme.css).
Red #bd0926 is the sapekor.com tab-icon mark; #f2334b is --brand.
"""
from PIL import Image, ImageDraw

GREEN = (74, 128, 25)       # #4a8019
GREEN_BRIGHT = (106, 176, 35)  # #6ab023
RED = (189, 9, 38)          # #bd0926
WHITE = (255, 255, 255)

def rounded_badge(d, S, color):
    # Small rounded square in the lower-right, like the sapIS "IS" badge.
    x, y = S * 0.58, S * 0.58
    w, h = S * 0.34, S * 0.30
    r = S * 0.08
    d.rounded_rectangle([x, y, x + w, y + h], radius=r, fill=color)

def clock(s):
    S = s * 4
    im = Image.new("RGB", (S, S), GREEN)
    d = ImageDraw.Draw(im)
    c = S * 0.46
    r = S * 0.28
    w = max(int(S * 0.055), 8)
    d.ellipse([c - r, c - r, c + r, c + r], outline=WHITE, width=w)
    d.line([(c, c), (c, c - r * 0.58)], fill=WHITE, width=w)
    d.line([(c, c), (c + r * 0.42, c + r * 0.22)], fill=WHITE, width=w)
    d.ellipse([c - w * 0.75, c - w * 0.75, c + w * 0.75, c + w * 0.75], fill=WHITE)
    rounded_badge(d, S, RED)
    return im.resize((s, s), Image.Resampling.LANCZOS)

def check(s):
    S = s * 4
    im = Image.new("RGB", (S, S), RED)
    d = ImageDraw.Draw(im)
    w = max(int(S * 0.075), 10)
    pts = [(S * 0.22, S * 0.48), (S * 0.40, S * 0.66), (S * 0.70, S * 0.30)]
    d.line(pts, fill=WHITE, width=w, joint="curve")
    for p in (pts[0], pts[2]):
        d.ellipse([p[0] - w / 2, p[1] - w / 2, p[0] + w / 2, p[1] + w / 2], fill=WHITE)
    rounded_badge(d, S, GREEN_BRIGHT)
    return im.resize((s, s), Image.Resampling.LANCZOS)

if __name__ == "__main__":
    for name, fn in (("dochazka", clock), ("ukoly", check)):
        for s in (180, 192, 512):
            fn(s).save(f"{name}/icon-{s}.png")
            print(f"wrote {name}/icon-{s}.png")
