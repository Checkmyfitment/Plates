"""Profile and cover images for the Pass the Plates Facebook Page and Instagram.
  profile 1080x1080 (works for both; platforms crop to a circle)
  facebook cover 1640x624 (keep text inside the center-safe area for mobile crops)
  instagram highlight cover 1080x1920 is not made here.
Usage: python3 scripts/make-social-assets.py <out-dir>
"""
import os, sys
from PIL import Image, ImageDraw, ImageFont

OUT = sys.argv[1]
ROOT = os.path.join(os.path.dirname(__file__), '..')
BG_TOP, BG_BOTTOM = (29, 49, 40), (15, 138, 95)
CREAM, MUSTARD, FADED = (251, 248, 239), (227, 167, 43), (190, 215, 203)

def font(size, bold=True):
    path = '/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf' if bold else '/System/Library/Fonts/Supplemental/Arial.ttf'
    return ImageFont.truetype(path, size)

def gradient(w, h):
    img = Image.new('RGB', (w, h), BG_TOP)
    px = img.load()
    for y in range(h):
        t = min(1, y / (h * 0.9))
        c = tuple(int(BG_TOP[i] + (BG_BOTTOM[i] - BG_TOP[i]) * t) for i in range(3))
        for x in range(w):
            px[x, y] = c
    return img

icon = Image.open(os.path.join(ROOT, 'public', 'icon-512.png')).convert('RGBA')
os.makedirs(OUT, exist_ok=True)

# profile: the plate icon on the icon's own dark green, so the icon's rounded
# square blends in and the plate reads cleanly inside a circle crop
p = Image.new('RGB', (1080, 1080), BG_TOP)
logo = icon.resize((960, 960), Image.LANCZOS)
p.paste(logo, ((1080 - 960) // 2, (1080 - 960) // 2), logo)
p.save(os.path.join(OUT, 'profile-1080.png'), optimize=True)

# facebook cover
W, H = 1640, 624
c = gradient(W, H)
d = ImageDraw.Draw(c)
logo = icon.resize((200, 200), Image.LANCZOS)
c.paste(logo, (W // 2 - 100, 70), logo)
t1, t2 = 'Homemade food', 'from your neighbors.'
for text, y, fill in ((t1, 300, CREAM), (t2, 392, MUSTARD)):
    f = font(78)
    d.text(((W - d.textlength(text, font=f)) / 2, y), text, font=f, fill=fill)
sub = 'Free app for home cooks and bakers · Oceanside, CA'
f = font(34, False)
d.text(((W - d.textlength(sub, font=f)) / 2, 520), sub, font=f, fill=FADED)
c.save(os.path.join(OUT, 'facebook-cover-1640x624.png'), optimize=True)
print('wrote', OUT)
