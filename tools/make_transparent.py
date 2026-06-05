#!/usr/bin/env python3
"""Color-key a solid background to transparent.

Replaces pixels close to the background colour (sampled from a corner) with
full transparency, with a soft edge for anti-aliased halos.
"""
import argparse
from PIL import Image


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("image")
    ap.add_argument("--out", required=True)
    ap.add_argument("--tol", type=int, default=30, help="full-transparent within this distance")
    ap.add_argument("--soft", type=int, default=20, help="feather distance beyond tol")
    args = ap.parse_args()

    img = Image.open(args.image).convert("RGBA")
    W, H = img.size
    px = img.load()
    bg = px[0, 0][:3]

    def dist(c):
        return max(abs(c[0] - bg[0]), abs(c[1] - bg[1]), abs(c[2] - bg[2]))

    changed = 0
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            d = dist((r, g, b))
            if d <= args.tol:
                px[x, y] = (r, g, b, 0)
                changed += 1
            elif d <= args.tol + args.soft:
                # feather: partial alpha for halo pixels
                frac = (d - args.tol) / args.soft
                px[x, y] = (r, g, b, int(255 * frac))

    img.save(args.out)
    print(f"{args.image} {W}x{H} bg={bg} -> {args.out}  ({changed} px keyed)")


if __name__ == "__main__":
    main()
