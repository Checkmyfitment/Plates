"""Builds captioned store screenshots from real simulator captures of the app
running in sample mode (qa.html?samples=1 -- fictional cooks, AI-generated
photos; see src/qa/sampleListings.js). Each image carries a small
"Sample listings shown" line so the store listing stays honest.

  App Store 6.9" iPhone:  1320x2868
  Google Play phone:      1080x1920 (status bar cropped off the capture)

Usage: python3 scripts/make-store-screenshots-v3.py <raw-dir> <ios-out> <play-out>
Raw files: raw-home.png raw-map.png raw-detail.png raw-grid.png (1320x2868)
"""
import sys, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

RAW, IOS_OUT, PLAY_OUT = sys.argv[1], sys.argv[2], sys.argv[3]
BG_TOP, BG_BOTTOM = (29, 49, 40), (15, 138, 95)
CREAM, MUSTARD, FADED = (251, 248, 239), (227, 167, 43), (190, 215, 203)

def font(size, bold=True):
    path = '/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf' if bold else '/System/Library/Fonts/Supplemental/Arial.ttf'
    return ImageFont.truetype(path, size)

def gradient(w, h):
    img = Image.new('RGB', (w, h), BG_TOP)
    px = img.load()
    for y in range(h):
        t = min(1, y / (h * 0.75))
        c = tuple(int(BG_TOP[i] + (BG_BOTTOM[i] - BG_TOP[i]) * t) for i in range(3))
        for x in range(w):
            px[x, y] = c
    return img

def centered(d, w, text, y, fnt, fill):
    d.text(((w - d.textlength(text, font=fnt)) / 2, y), text, font=fnt, fill=fill)

def build(raw_name, headline, sub, out_path, W, H, head_y, head_size, sub_size, note_size, phone_w, phone_y, radius, crop_top):
    canvas = gradient(W, H)
    d = ImageDraw.Draw(canvas)
    y = head_y
    for line in headline:
        centered(d, W, line, y, font(head_size), CREAM)
        y += int(head_size * 1.15)
    centered(d, W, sub, y + 10, font(sub_size, False), MUSTARD)
    centered(d, W, 'Sample listings shown', y + 10 + int(sub_size * 1.5), font(note_size, False), FADED)

    raw = Image.open(os.path.join(RAW, raw_name)).convert('RGB')
    if crop_top:
        raw = raw.crop((0, crop_top, raw.width, raw.height))
    ph = int(raw.height * phone_w / raw.width)
    raw = raw.resize((phone_w, ph), Image.LANCZOS)
    mask = Image.new('L', raw.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, phone_w, ph), radius=radius, fill=255)
    x = (W - phone_w) // 2
    shadow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((x, phone_y + 30, x + phone_w, phone_y + ph + 30), radius=radius, fill=(0, 0, 0, 120))
    canvas = Image.alpha_composite(canvas.convert('RGBA'), shadow.filter(ImageFilter.GaussianBlur(40))).convert('RGB')
    canvas.paste(raw, (x, phone_y), mask)
    ImageDraw.Draw(canvas).rounded_rectangle((x, phone_y, x + phone_w, phone_y + ph), radius=radius, outline=(255, 255, 255), width=3)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    canvas.save(out_path, optimize=True)
    print('wrote', out_path, canvas.size)

SHOTS = [
    ('raw-home.png', ['Homemade food from', 'your neighbors'], 'Home cooks, bakers & food trucks nearby', '01-homemade-food-near-you.png'),
    ('raw-map.png', ["See what's cooking", 'on the map'], 'Browse by distance, tap a pin, order', '02-map-of-home-cooks.png'),
    ('raw-detail.png', ['Order straight', 'from the cook'], 'Message, order & pick up. No middleman.', '03-order-from-home-cooks.png'),
    ('raw-grid.png', ['Fresh dishes,', 'made down the street'], 'Tamales, sourdough, dumplings & more', '04-fresh-homemade-dishes.png'),
]

for raw, head, sub, name in SHOTS:
    # App Store 6.9"
    build(raw, head, sub, os.path.join(IOS_OUT, name), 1320, 2868, 150, 104, 52, 38, 1090, 640, 90, 0)
    # Google Play: crop the iPhone status bar off so no iOS chrome shows
    build(raw, head, sub, os.path.join(PLAY_OUT, name), 1080, 1920, 90, 86, 40, 30, 900, 480, 70, 170)
