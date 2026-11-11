"""Builds ad graphics from real simulator captures, in the sizes ad platforms use:
  story 1080x1920 (Instagram/Facebook Stories + Reels, TikTok, YouTube Shorts)
  feed  1080x1350 (Instagram/Facebook feed, 4:5)
  square 1080x1080 (feed, Google/Pinterest)
  wide  1920x1080 (YouTube, Google display, Meta landscape)
The phone screen is always the real app capture -- ad platforms (and Apple/Google)
expect the UI shown to be what the app actually looks like.

Usage: python3 scripts/make-ad-graphics.py <raw-dir> <out-dir>
Raw files: raw-home.png raw-map.png raw-detail.png (1320x2868 simulator captures)
"""
import sys, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

RAW, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
BG_TOP, BG_BOTTOM = (29, 49, 40), (15, 138, 95)   # deep green -> brand green
CREAM, MUSTARD = (251, 248, 239), (227, 167, 43)

def font(size, bold=True):
    path = '/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf' if bold else '/System/Library/Fonts/Supplemental/Arial.ttf'
    return ImageFont.truetype(path, size)

def gradient(w, h, diagonal=False):
    img = Image.new('RGB', (w, h), BG_TOP)
    px = img.load()
    for y in range(h):
        for x in range(w):
            t = (x / w * 0.5 + y / h * 0.5) if diagonal else min(1, y / (h * 0.8))
            px[x, y] = tuple(int(BG_TOP[i] + (BG_BOTTOM[i] - BG_TOP[i]) * t) for i in range(3))
    return img

def text_block(d, lines, sub, x, y, w, size, sub_size, align):
    for i, line in enumerate(lines):
        tw = d.textlength(line, font=font(size))
        d.text((x + (w - tw) / 2 if align == 'center' else x, y + i * int(size * 1.15)), line, font=font(size), fill=CREAM)
    ys = y + len(lines) * int(size * 1.15) + int(size * 0.2)
    tw = d.textlength(sub, font=font(sub_size, False))
    d.text((x + (w - tw) / 2 if align == 'center' else x, ys), sub, font=font(sub_size, False), fill=MUSTARD)
    return ys + sub_size

def phone(canvas, raw_name, px, py, pw, radius):
    raw = Image.open(os.path.join(RAW, raw_name)).convert('RGB')
    ph = int(raw.height * pw / raw.width)
    raw = raw.resize((pw, ph), Image.LANCZOS)
    mask = Image.new('L', (pw, ph), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, pw, ph), radius=radius, fill=255)
    shadow = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((px, py + 24, px + pw, py + ph + 24), radius=radius, fill=(0, 0, 0, 130))
    canvas = Image.alpha_composite(canvas.convert('RGBA'), shadow.filter(ImageFilter.GaussianBlur(34))).convert('RGB')
    canvas.paste(raw, (px, py), mask)
    ImageDraw.Draw(canvas).rounded_rectangle((px, py, px + pw, py + ph), radius=radius, outline=(255, 255, 255), width=3)
    return canvas

# (raw file, headline lines, subline, file stem)
SCREENS = [
    ('raw-home.png', ['Homemade food', 'from your neighbors'], 'Home cooks, bakers & food trucks nearby', 'home-cooks'),
    ('raw-map.png', ["See what's cooking", 'on the map'], 'Browse by distance, tap a pin, order', 'map'),
    ('raw-detail.png', ['Order straight', 'from the cook'], 'Message, order & pick up. No middleman.', 'order'),
]

for raw_name, head, sub, stem in SCREENS:
    # story 9:16 -- text on top (kept clear of the platform UI "safe zones"), phone below
    c = gradient(1080, 1920)
    d = ImageDraw.Draw(c)
    y = text_block(d, head, sub, 0, 250, 1080, 92, 44, 'center')
    c = phone(c, raw_name, 130, y + 70, 820, 76)
    c.save(os.path.join(OUT, f'story-1080x1920-{stem}.png'), optimize=True)

    # feed 4:5
    c = gradient(1080, 1350)
    d = ImageDraw.Draw(c)
    y = text_block(d, head, sub, 0, 70, 1080, 82, 40, 'center')
    c = phone(c, raw_name, 215, y + 50, 650, 64)
    c.save(os.path.join(OUT, f'feed-1080x1350-{stem}.png'), optimize=True)

    # square 1:1 -- phone on the right, text left
    c = gradient(1080, 1080, diagonal=True)
    d = ImageDraw.Draw(c)
    text_block(d, [h for h in head], sub, 60, 300, 520, 62, 32, 'left')
    c = phone(c, raw_name, 640, 90, 390, 52)
    c.save(os.path.join(OUT, f'square-1080x1080-{stem}.png'), optimize=True)

    # wide 16:9 -- text left, phone right (cropped at the bottom on purpose)
    c = gradient(1920, 1080, diagonal=True)
    d = ImageDraw.Draw(c)
    text_block(d, head, sub, 120, 330, 960, 96, 46, 'left')
    c = phone(c, raw_name, 1180, 90, 560, 64)
    c.save(os.path.join(OUT, f'wide-1920x1080-{stem}.png'), optimize=True)
    print('built', stem)
