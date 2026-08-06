#!/usr/bin/env python3
"""Turn a raw simulator capture into the finished 6.9-inch App Store screenshot.

The simulator framebuffer includes the Dynamic Island as a solid black pill and
has square corners. The finished screenshots hide the pill behind the screen's
own background colour and round the corners to transparent.

Both masks are fixed by the iPhone 16 Pro Max hardware, so they were extracted
once from an existing finished screenshot and live in scripts/screenshot-masks.
Reusing them keeps new captures byte-identical to the originals rather than
re-deriving a shape that only approximately matches.

New captures go in the v2 set; the original set stays put as the reference that
--verify checks this pipeline against.

Usage:
    scripts/finish-screenshot.py <name> [<name> ...]
    scripts/finish-screenshot.py --all
    scripts/finish-screenshot.py --verify

`<name>` is the screenshot stem, e.g. `floor-spectrum-michigan-primary-dark`,
matching `<name>-raw.png`. `--verify` re-runs every raw in the original set and
confirms the output still matches the finished screenshot exactly.
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image

REPO_ROOT = Path(__file__).resolve().parent.parent
SCREENSHOT_ROOT = REPO_ROOT / "artifacts/app-store/screenshots"
SHOT_DIR = SCREENSHOT_ROOT / "6.9-inch-v2"
REFERENCE_DIR = SCREENSHOT_ROOT / "6.9-inch"
MASK_DIR = REPO_ROOT / "scripts/screenshot-masks"

# Both sets keep raws at the top level and finished output one level down.
FINISHED_SUBDIR = "rounded-raws"
OUT_DIR = SHOT_DIR / FINISHED_SUBDIR

SIZE = (1320, 2868)
DYNAMIC_ISLAND_ORIGIN = (471, 41)

# Row 20 sits above the pill (which starts at y=41) and clear of the clock and
# the status icons, so it always lands on the screen's own background colour.
FILL_SAMPLE_POINT = (660, 20)


def finish(raw_path: Path) -> Image.Image:
    raw = Image.open(raw_path).convert("RGBA")
    if raw.size != SIZE:
        raise SystemExit(
            f"{raw_path.name}: expected {SIZE[0]}x{SIZE[1]}, got "
            f"{raw.size[0]}x{raw.size[1]}. Capture on the iPhone 16 Pro Max sim "
            f"(scripts/screenshot-sim.sh setup)."
        )

    out = raw.copy()

    # Paint over the Dynamic Island with the background it interrupts.
    fill = raw.getpixel(FILL_SAMPLE_POINT)
    island = Image.open(MASK_DIR / "dynamic-island.png").convert("L")
    out.paste(Image.new("RGBA", island.size, fill), DYNAMIC_ISLAND_ORIGIN, island)

    # Round the corners to transparent.
    corner = Image.open(MASK_DIR / "corner-alpha.png").convert("L")
    out.putalpha(corner)
    return _premultiply_roundtrip(out)


def _premultiply_roundtrip(img: Image.Image) -> Image.Image:
    """Reproduce the colour shift a premultiplied-alpha round trip leaves behind.

    The originals were rounded by a Core Graphics context, which stores colour
    premultiplied and loses precision converting back to straight alpha. Only
    the antialiased corner edge is affected, but replicating it keeps new
    screenshots byte-identical to the ones already approved.
    """
    px = np.asarray(img).astype(np.uint16)
    rgb, alpha = px[..., :3], px[..., 3:4]

    premultiplied = (rgb * alpha + 127) // 255
    with np.errstate(divide="ignore", invalid="ignore"):
        restored = np.where(
            alpha > 0,
            np.minimum((premultiplied * 255 + alpha // 2) // np.maximum(alpha, 1), 255),
            0,
        )

    px[..., :3] = restored
    return Image.fromarray(px.astype(np.uint8), "RGBA")


def main(argv: list[str]) -> int:
    args = argv[1:] or ["--all"]
    verify = args[0] == "--verify"

    # --verify replays the original set, which is the only one with known-good
    # finished output to compare against.
    shot_dir = REFERENCE_DIR if verify else SHOT_DIR
    out_dir = shot_dir / FINISHED_SUBDIR

    if args[0] in ("--all", "--verify"):
        names = sorted(p.name[: -len("-raw.png")] for p in shot_dir.glob("*-raw.png"))
    else:
        names = args

    if not names:
        print("no raw screenshots found in", shot_dir, file=sys.stderr)
        return 1

    out_dir.mkdir(parents=True, exist_ok=True)
    failures = 0
    for name in names:
        raw_path = shot_dir / f"{name}-raw.png"
        if not raw_path.exists():
            print(f"missing {raw_path}", file=sys.stderr)
            failures += 1
            continue

        out = finish(raw_path)
        out_path = out_dir / f"{name}-rounded.png"

        if verify:
            if not out_path.exists():
                print(f"  {name}: no finished screenshot to compare")
                failures += 1
                continue
            expected = Image.open(out_path).convert("RGBA")
            same = list(out.getdata()) == list(expected.getdata())
            print(f"  {name}: {'match' if same else 'MISMATCH'}")
            failures += 0 if same else 1
        else:
            out.save(out_path)
            print(f"  wrote {out_path.relative_to(REPO_ROOT)}")

    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
