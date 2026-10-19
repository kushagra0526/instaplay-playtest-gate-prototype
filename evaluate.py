"""Score the playtest gate vs a smoke test and a keyboard monkey on games with planted bugs.

python evaluate.py dev | heldout     (heldout games frozen in git before the first run)
"""
import json
import os
import subprocess
import sys
from collections import Counter, defaultdict

# a finding that is a true consequence of the planted bug, not a false alarm
SECONDARY = {"INSTANT_OVER": {"STUCK"}, "RUNTIME_ERROR": {"STUCK"}, "STUCK": {"NO_TERMINATION"}}  # a frozen game never signals game over
SYSTEMS = ["findings", "smoke_test", "keyboard_monkey"]


def score(split):
    man = [g for g in json.load(open("games/manifest.json")) if g["split"] == split]
    raw = subprocess.run(["node", "harness/playtest.js"] + [g["file"] for g in man], capture_output=True, text=True, check=True).stdout
    res = {r["file"]: r for r in json.loads(raw)}
    out = {s: {"caught": 0, "false_findings": 0, "clean_flagged": 0, "missed": Counter(), "false_by_code": Counter()} for s in SYSTEMS}
    bugs = Counter(g["expect"] for g in man if g["expect"])
    per_game = []
    for g in man:
        r = res[g["file"]]
        for s in SYSTEMS:
            codes = {f["code"] for f in r[s]}
            o = out[s]
            if g["expect"]:
                if g["expect"] in codes:
                    o["caught"] += 1
                else:
                    o["missed"][g["expect"]] += 1
            ok = {g["expect"]} | SECONDARY.get(g["expect"], set()) if g["expect"] else set()
            extra = codes - ok
            o["false_findings"] += len(extra)
            o["false_by_code"].update(extra)
            if not g["expect"] and codes:
                o["clean_flagged"] += 1
        per_game.append({"file": g["file"], "expect": g["expect"], "got": [f["code"] for f in r["findings"]],
                         "why": [f["why"] for f in r["findings"]]})
    clean = sum(1 for g in man if not g["expect"])
    summary = {"games": len(man), "buggy": sum(bugs.values()), "clean": clean, "bugs": dict(bugs)}
    for s in SYSTEMS:
        o = out[s]
        summary["checker" if s == "findings" else s] = {"caught": o["caught"], "of": sum(bugs.values()), "missed_by_code": dict(o["missed"]),
                                                       "false_findings": o["false_findings"], "false_by_code": dict(o["false_by_code"]),
                                                       "clean_games_flagged": o["clean_flagged"], "of_clean": clean}
    return summary, per_game


if __name__ == "__main__":
    split = sys.argv[1] if len(sys.argv) > 1 else "dev"
    summary, per_game = score(split)
    print(json.dumps(summary, indent=1))
    os.makedirs("out", exist_ok=True)
    json.dump({"summary": summary, "games": per_game}, open(f"out/{split}.json", "w"), indent=1)
