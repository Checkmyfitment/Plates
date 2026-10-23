"""Builds captioned App Store screenshots (1320x2868, the 6.9" iPhone size)
from raw simulator captures. Caption words matter for App Store search, so
keep them descriptive. Usage:
  python3 scripts/make-store-screenshots.py <raw-dir> <out-dir>
Raw files expected: raw-home.png raw-map.png raw-detail.png raw-search.png
"""
import sys, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

RAW, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
W, H = 1320, 2868
BG_TOP, BG_BOTTOM = (29, 49, 40), (15, 138, 95)   # deep green -> brand green
CREAM, MUSTARD = (251, 248, 239), (227, 167, 43)

def font(size, bold=True):
    path = '/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf' if bold else '/System/Library/Fonts/Supplemental/Arial.ttf'
    return ImageFont.truetype(path, size)

def gradient():
    img = Image.new('RGB', (W, H), BG_TOP)
    px = img.load()
    for y in range(H):
        t = min(1, y / (H * 0.75))
        c = tuple(int(BG_TOP[i] + (BG_BOTTOM[i] - BG_TOP[i]) * t) for i in range(3))
        for x in range(W):
            px[x, y] = c
    return img

def centered(draw, text, y, fnt, fill):
    w = draw.textlength(text, font=fnt)
    draw.text(((W - w) / 2, y), text, font=fnt, fill=fill)

def shot(name, headline, sub, outfile):
    canvas = gradient()
    d = ImageDraw.Draw(canvas)
    for i, line in enumerate(headline):
        centered(d, line, 150 + i * 118, font(104), CREAM)
    centered(d, sub, 150 + len(headline) * 118 + 24, font(52, bold=False), MUSTARD)

    raw = Image.open(os.path.join(RAW, name)).convert('RGB')
    sw = 1090
    sh = int(raw.height * sw / raw.width)
    raw = raw.resize((sw, sh), Image.LANCZOS)
    mask = Image.new('L', raw.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, sw, sh), radius=90, fill=255)
    x, y = (W - sw) // 2, 560
    # soft shadow
    shadow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((x, y + 30, x + sw, y + sh + 30), radius=90, fill=(0, 0, 0, 120))
    canvas = Image.alpha_composite(canvas.convert('RGBA'), shadow.filter(ImageFilter.GaussianBlur(40))).convert('RGB')
    canvas.paste(raw, (x, y), mask)
    ImageDraw.Draw(canvas).rounded_rectangle((x, y, x + sw, y + sh), radius=90, outline=(255, 255, 255), width=3)
    canvas.save(os.path.join(OUT, outfile), optimize=True)
    print('wrote', outfile, canvas.size)

shot('raw-home.png', ['Homemade food from', 'your neighbors'], 'Home cooks, bakers & food trucks nearby', '01-homemade-food-near-you.png')
shot('raw-map.png', ["See what's cooking", 'on the map'], 'Browse by distance, tap a pin, order', '02-map-of-home-cooks.png')
shot('raw-detail.png', ['Order straight', 'from the cook'], 'Message, order & pick up — no middleman', '03-order-from-home-cooks.png')
shot('raw-search.png', ['Find tamales,', 'sourdough & more'], 'Search or browse every cuisine', '04-search-homemade-food.png')
