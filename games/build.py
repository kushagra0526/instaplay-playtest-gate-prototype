"""Build single-file HTML5 games with at most one planted bug each.

dev:     dodger / breakout / snake on loop style A (requestAnimationFrame, window keys, pointer events)
heldout: flappy / runner / shooter on loop style B (setInterval, document keys by e.code, touch + mouse events)
python games/build.py   -> games/dev/*.html, games/heldout/*.html, games/manifest.json
"""
import json
import os
import random
import re

HERE = os.path.dirname(os.path.abspath(__file__))
SPLITS = {"dev": ("skeleton_a.html", ["dodger", "breakout", "snake"]),
          "heldout": ("skeleton_b.html", ["flappy", "runner", "shooter"])}
# planted bug -> the finding a playtest should raise
BUGS = {None: None, "crash": "RUNTIME_ERROR", "blank": "BLANK", "keycanvas": "KEYBOARD_DEAD", "notouch": "TOUCH_DEAD",
        "softlock": "STUCK", "restart": "STUCK", "nondet": "NONDETERMINISTIC", "fps": "FPS_DEPENDENT",
        "scoreover": "SCORE_WHILE_OVER", "never": "NO_TERMINATION", "instant": "INSTANT_OVER"}
PARAMS = {
    "dodger": {"PSPEED": (240, 300), "BSPEED": (180, 240)},
    "breakout": {"BV": (260, 320), "PSPEED": (300, 360)},
    "snake": {"STEP": (0.10, 0.14)},
    "flappy": {"FLAP": (380, 440), "GRAV": (1300, 1500), "PIPEV": (150, 180)},
    "runner": {"RUNV": (220, 260), "JUMP": (600, 660), "GRAV": (1700, 1900)},
    "shooter": {"PSPEED": (240, 300), "EV": (60, 80)},
}
COLORS = [("#14213d", "#fca311", "#e5e5e5"), ("#1b263b", "#06d6a0", "#ef476f"), ("#2b2d42", "#8ecae6", "#ffb703"),
          ("#10002b", "#c77dff", "#ff006e")]


def apply_markers(src, bug):
    src = re.sub(r"/\*IF:(\w+)\*/(.*?)/\*FI\*/", lambda m: m.group(2) if m.group(1) == bug else "", src, flags=re.S)
    src = re.sub(r"/\*IFNOT:(\w+)\*/(.*?)/\*FI\*/", lambda m: "" if m.group(1) == bug else m.group(2), src, flags=re.S)
    return src


def build():
    manifest = []
    for split, (skel_name, fams) in SPLITS.items():
        out = os.path.join(HERE, split)
        os.makedirs(out, exist_ok=True)
        skel = open(os.path.join(HERE, "src", skel_name), encoding="utf-8").read()
        for fam in fams:
            fam_src = open(os.path.join(HERE, "src", "families", fam + ".js"), encoding="utf-8").read()
            for k in range(2):
                for bug in BUGS:
                    for c in ([0, 1, 2] if bug is None else [0]):  # three clean variants per family and seed
                        r = random.Random(f"{split}-{fam}-{k}-{bug}-{c}")
                        bg, fg, hz = r.choice(COLORS)
                        html = skel.replace("@@FAMILY@@", fam_src)
                        html = apply_markers(html, bug)
                        for p, (lo, hi) in PARAMS[fam].items():
                            v = r.uniform(lo, hi)
                            html = html.replace(f"@@{p}@@", f"{v:.3f}" if hi < 1 else str(round(v)))
                        html = (html.replace("@@BG@@", bg).replace("@@FG@@", fg).replace("@@HZ@@", hz)
                                .replace("@@TITLE@@", fam.upper()))
                        assert "@@" not in html and "/*IF" not in html, (fam, bug)
                        name = f"{fam}-{bug or 'clean'}-{k}{c if bug is None else ''}.html"
                        open(os.path.join(out, name), "w", encoding="utf-8").write(html)
                        manifest.append({"split": split, "file": f"games/{split}/{name}", "family": fam, "bug": bug,
                                         "expect": BUGS[bug]})
    json.dump(manifest, open(os.path.join(HERE, "manifest.json"), "w"), indent=1)
    return manifest


if __name__ == "__main__":
    m = build()
    print(len(m), "games:", {s: sum(x["split"] == s for x in m) for s in SPLITS})
