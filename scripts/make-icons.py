"""Generates the app icon set in the "patient money" identity: a compounding curve rising from
its ground line, white on banyan green. Run: python3 scripts/make-icons.py assets/images"""
import sys, math
from PIL import Image, ImageDraw
out = sys.argv[1]
GREEN = (47, 93, 80, 255)      # palette primary, light mode
LEAF = (131, 188, 167, 255)    # palette primary, dark mode: the soft accent
WHITE = (255, 255, 255, 255)
SS = 4

def mark(draw, size, cx, cy, scale, colour, accent):
    """A compounding curve rising from a seed, ending in a dot: patient money growing."""
    w = 0.56 * scale; h = 0.46 * scale
    x0 = cx - w / 2; y0 = cy + h / 2 - 0.02 * scale
    pts = []
    for i in range(0, 101):
        t = i / 100
        y = (math.exp(2.4 * t) - 1) / (math.exp(2.4) - 1)
        pts.append((x0 + t * w, y0 - y * h))
    stroke = 0.075 * scale
    r = stroke / 2
    # Stamp round dabs densely along the curve: a solid stroke with round ends, no seams.
    for (ax, ay), (bx, by) in zip(pts, pts[1:]):
        steps = max(1, int(math.hypot(bx - ax, by - ay) / (r * 0.25)))
        for k in range(steps + 1):
            x = ax + (bx - ax) * k / steps; y = ay + (by - ay) * k / steps
            draw.ellipse([x - r, y - r, x + r, y + r], fill=colour)
    ex, ey = pts[-1]
    R = stroke * 0.95
    draw.ellipse([ex - R, ey - R, ex + R, ey + R], fill=accent)
    # The ground line the curve grows from.
    gy = y0 + stroke * 1.4
    draw.rounded_rectangle([x0 - stroke * 0.2, gy - stroke * 0.22, x0 + w + stroke * 0.2, gy + stroke * 0.22], radius=stroke * 0.22, fill=accent)

def render(size, bg, colour, accent, scale_frac):
    big = size * SS
    im = Image.new('RGBA', (big, big), bg)
    d = ImageDraw.Draw(im)
    mark(d, big, big / 2, big / 2, big * scale_frac, colour, accent)
    return im.resize((size, size), Image.LANCZOS)

clear = (0, 0, 0, 0)
render(1024, GREEN, WHITE, LEAF, 0.9).convert('RGB').save(f'{out}/icon.png')
# Adaptive icon: the system crops to a shape and shows the middle 66%, so the mark sits smaller.
render(512, clear, WHITE, LEAF, 0.72).save(f'{out}/android-icon-foreground.png')
Image.new('RGBA', (512, 512), GREEN).save(f'{out}/android-icon-background.png')
render(432, clear, WHITE, WHITE, 0.72).save(f'{out}/android-icon-monochrome.png')
render(1024, clear, GREEN, (47, 93, 80, 180), 0.7).save(f'{out}/splash-icon.png')
render(48, GREEN, WHITE, LEAF, 0.9).save(f'{out}/favicon.png')
