"""Turn an LS-PrePost image of the one-eighth flat specimen into a picture of the whole specimen.

The image comes from cluster_render.sh with the view "rz 90": the specimen axis points up, the
mid-length plane (x = 0) is the bottom edge of the model and the mid-width plane (y = 0) its right
edge. The model is mirrored about both planes, turned so that the specimen lies horizontally, and
the fringe legend is put back on its right. The header text of LS-PrePost is dropped.

usage: python mirror_flat.py <png>        (overwrites the file)
"""
import sys

import numpy as np
from PIL import Image

LEGEND_X = 650          # LS-PrePost puts the legend right of this column (1100 x 700 screen)
MODEL_X = 300           # header text and triad end left of this column


def bbox(a):
    rows = np.where(a.any(1))[0]
    cols = np.where(a.any(0))[0]
    return rows[0], rows[-1] + 1, cols[0], cols[-1] + 1


def main(path):
    im = Image.open(path).convert("RGB")
    a = np.asarray(im).astype(int)
    ink = (255 * 3 - a.sum(2)) > 30
    ink[:, :MODEL_X] = False
    model, legend = ink.copy(), ink.copy()
    model[:, LEGEND_X:] = False
    legend[:, :LEGEND_X] = False
    r0, r1, c0, c1 = bbox(model)
    # drop the outline drawn along the symmetry planes, otherwise it shows as a line through the specimen
    dark = a.sum(2) < 150
    while dark[r0:r1, c1 - 1].mean() > 0.5:
        c1 -= 1
    while dark[r1 - 1, c0:c1].mean() > 0.5:
        r1 -= 1
    m = im.crop((c0, r0, c1, r1))
    w, h = m.size
    full = Image.new("RGB", (2 * w, 2 * h), "white")
    full.paste(m, (0, 0))
    full.paste(m.transpose(Image.FLIP_LEFT_RIGHT), (w, 0))
    full.paste(m.transpose(Image.FLIP_TOP_BOTTOM), (0, h))
    full.paste(m.transpose(Image.ROTATE_180), (w, h))
    full = full.rotate(90, expand=True)
    r0, r1, c0, c1 = bbox(legend)
    leg = im.crop((c0, r0, c1, r1))
    pad = 24
    W = full.width + 2 * pad + leg.width + pad
    H = max(full.height, leg.height) + 2 * pad
    out = Image.new("RGB", (W, H), "white")
    out.paste(full, (pad, (H - full.height) // 2))
    out.paste(leg, (full.width + 2 * pad, pad))
    out.save(path)


if __name__ == "__main__":
    main(sys.argv[1])
