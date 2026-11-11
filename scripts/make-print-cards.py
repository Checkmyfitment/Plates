"""Builds print-ready 3.5x2 in recruiting cards (300 dpi) with a QR code, plus a
US Letter sheet (10 per page, front and back) for home or copy-shop printing.

  QR needs `qrcode` (pip install qrcode). Usage:
    python3 scripts/make-print-cards.py <out-dir>
"""
import os, sys
import qrcode
from PIL import Image, ImageDraw, ImageFont

OUT = sys.argv[1]
URL = 'https://get.passtheplates.app/?utm_source=market-card&utm_medium=print&utm_campaign=oceanside-launch'
DARK, CREAM, MUSTARD = (29, 49, 40), (251, 248, 239), (227, 167, 43)
W, H = 1050, 600  # 3.5 x 2 in at 300 dpi

def font(size, bold=True):
    path = '/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf' if bold else '/System/Library/Fonts/Supplemental/Arial.ttf'
    return ImageFont.truetype(path, size)

def front():
    img = Image.new('RGB', (W, H), DARK)
    d = ImageDraw.Draw(img)
    logo = Image.open(os.path.join(os.path.dirname(__file__), '..', 'public', 'icon-192.png')).convert('RGBA').resize((120, 120))
    img.paste(logo, (60, 60), logo)
    d.text((200, 85), 'Pass the Plates', font=font(56), fill=CREAM)
    d.text((60, 270), 'Homemade food', font=font(84), fill=CREAM)
    d.text((60, 370), 'from your neighbors.', font=font(84), fill=MUSTARD)
    d.text((60, 520), 'Oceanside · Vista · Carlsbad', font=font(34, False), fill=(190, 215, 203))
    return img

def back():
    img = Image.new('RGB', (W, H), CREAM)
    d = ImageDraw.Draw(img)
    d.text((60, 70), 'Bake or cook at home?', font=font(52), fill=DARK)
    d.text((60, 140), 'Sell to your neighbors', font=font(52), fill=DARK)
    d.text((60, 210), 'for free.', font=font(52), fill=(15, 138, 95))
    d.text((60, 340), 'Be one of our first', font=font(36, False), fill=DARK)
    d.text((60, 385), 'Founding Cooks. Scan to join,', font=font(36, False), fill=DARK)
    d.text((60, 430), 'or find me at the market.', font=font(36, False), fill=DARK)
    d.text((60, 520), 'Follow California home-food rules.', font=font(26, False), fill=(116, 108, 98))
    qr = qrcode.make(URL, box_size=6, border=2).convert('RGB')   # whole-pixel modules keep it crisp
    img.paste(qr, (W - qr.width - 45, H - qr.height - 60))
    return img

def sheet(card, path):
    # US Letter at 300 dpi: 2550x3300; 2 cols x 5 rows of 3.5x2 in, 0.5 in side margins
    page = Image.new('RGB', (2550, 3300), (255, 255, 255))
    x0, y0 = (2550 - 2 * W) // 2, (3300 - 5 * H) // 2
    for r in range(5):
        for c in range(2):
            page.paste(card, (x0 + c * W, y0 + r * H))
    page.save(path, resolution=300)

os.makedirs(OUT, exist_ok=True)
f, b = front(), back()
f.save(os.path.join(OUT, 'card-front.png'))
b.save(os.path.join(OUT, 'card-back.png'))
sheet(f, os.path.join(OUT, 'sheet-front.pdf'))
sheet(b, os.path.join(OUT, 'sheet-back.pdf'))
print('wrote cards to', OUT)
