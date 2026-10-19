"""Playtest four generated games: the gate's verdict vs a load-and-screenshot smoke test."""
import json
import subprocess
import sys

GAMES = ["games/dev/dodger-clean-00.html", "games/dev/dodger-notouch-0.html", "games/dev/dodger-fps-0.html",
         "games/heldout/runner-scoreover-0.html", "games/heldout/flappy-restart-0.html"]

if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    res = json.loads(subprocess.run(["node", "harness/playtest.js"] + GAMES, capture_output=True, text=True, check=True).stdout)
    for r in sorted(res, key=lambda r: GAMES.index(r["file"])):
        verdict = "FIX" if r["findings"] else "PUBLISH"
        smoke = "FIX" if r["smoke_test"] else "PUBLISH"
        print(f"{r['file']}\n  gate: {verdict:8} smoke test: {smoke}")
        for f in r["findings"]:
            print(f"    {f['code']:17} {f['why']}")
