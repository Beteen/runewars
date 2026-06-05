#!/usr/bin/env python3
"""Auto-detect sprite frames in a sheet with a solid (or transparent)
background and emit a Phaser 3 texture-atlas JSON.

Usage:
    python3 tools/slice_sheet.py assets/sprites/jedi.png \
        --out assets/sprites/jedi.json --key jedi

The detector:
  1. Determines the background colour (most common edge pixel) or uses the
     alpha channel if the image has transparency.
  2. Finds horizontal bands of non-background pixels (the rows of sprites).
  3. Within each band, finds vertical runs of non-background pixels (frames).
  4. Writes a Phaser JSON-hash atlas naming frames row{r}_{i}.

Tweak --tol (colour tolerance) and --gap (min blank pixels between frames)
if frames merge or split incorrectly.
"""
import argparse
import json
import sys

from PIL import Image


def is_bg(px, bg, tol, use_alpha):
    if use_alpha:
        return px[3] < 16  # transparent
    return all(abs(px[i] - bg[i]) <= tol for i in range(3))


def content_ranges(flags, min_gap):
    """Given a list of booleans (True = has content), return (start, end)
    ranges merging gaps smaller than min_gap."""
    ranges = []
    start = None
    gap = 0
    for i, on in enumerate(flags):
        if on:
            if start is None:
                start = i
            gap = 0
        else:
            if start is not None:
                gap += 1
                if gap >= min_gap:
                    ranges.append((start, i - gap + 1))
                    start = None
                    gap = 0
    if start is not None:
        ranges.append((start, len(flags) - gap))
    return ranges


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("image")
    ap.add_argument("--out", required=True)
    ap.add_argument("--key", default="sheet")
    ap.add_argument("--tol", type=int, default=24, help="bg colour tolerance")
    ap.add_argument("--row-gap", type=int, default=6, help="min blank rows between bands")
    ap.add_argument("--col-gap", type=int, default=4, help="min blank cols between frames")
    ap.add_argument("--min-w", type=int, default=8, help="ignore frames narrower than this")
    ap.add_argument("--min-h", type=int, default=8, help="ignore bands shorter than this")
    args = ap.parse_args()

    img = Image.open(args.image).convert("RGBA")
    W, H = img.size
    px = img.load()
    use_alpha = any(px[x, 0][3] < 16 for x in range(0, W, max(1, W // 50)))
    bg = px[0, 0][:3]
    print(f"image {W}x{H}  bg={bg}  alpha_bg={use_alpha}", file=sys.stderr)

    # Row bands: a row "has content" if any pixel in it is non-bg.
    row_has = []
    for y in range(H):
        on = False
        for x in range(0, W, 2):  # sample every other col for speed
            if not is_bg(px[x, y], bg, args.tol, use_alpha):
                on = True
                break
        row_has.append(on)
    bands = [r for r in content_ranges(row_has, args.row_gap) if r[1] - r[0] >= args.min_h]
    print(f"found {len(bands)} bands", file=sys.stderr)

    frames = {}
    for ri, (y0, y1) in enumerate(bands):
        col_has = []
        for x in range(W):
            on = False
            for y in range(y0, y1):
                if not is_bg(px[x, y], bg, args.tol, use_alpha):
                    on = True
                    break
            col_has.append(on)
        cols = [c for c in content_ranges(col_has, args.col_gap) if c[1] - c[0] >= args.min_w]
        for ci, (x0, x1) in enumerate(cols):
            # Tighten vertical bounds to this specific frame
            fy0, fy1 = y1, y0
            for y in range(y0, y1):
                row_on = any(
                    not is_bg(px[x, y], bg, args.tol, use_alpha)
                    for x in range(x0, x1)
                )
                if row_on:
                    fy0 = min(fy0, y)
                    fy1 = max(fy1, y + 1)
            name = f"row{ri}_{ci}"
            frames[name] = {
                "frame": {"x": x0, "y": fy0, "w": x1 - x0, "h": fy1 - fy0},
                "rotated": False,
                "trimmed": False,
                "spriteSourceSize": {"x": 0, "y": 0, "w": x1 - x0, "h": fy1 - fy0},
                "sourceSize": {"w": x1 - x0, "h": fy1 - fy0},
            }
        print(f"  band {ri}: y[{y0}:{y1}] -> {len(cols)} frames", file=sys.stderr)

    atlas = {
        "frames": frames,
        "meta": {
            "app": "slice_sheet.py",
            "image": args.image.split("/")[-1],
            "size": {"w": W, "h": H},
            "scale": "1",
        },
    }
    with open(args.out, "w") as f:
        json.dump(atlas, f, indent=2)
    print(f"wrote {len(frames)} frames -> {args.out}", file=sys.stderr)


if __name__ == "__main__":
    main()
