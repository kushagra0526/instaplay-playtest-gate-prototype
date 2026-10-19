import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "games"))
from build import apply_markers  # noqa: E402

GAMES = {"dev/dodger-clean-01.html": set(), "dev/snake-keycanvas-0.html": {"KEYBOARD_DEAD"},
         "dev/breakout-nondet-0.html": {"NONDETERMINISTIC"}, "dev/snake-fps-1.html": {"FPS_DEPENDENT"},
         "dev/dodger-instant-1.html": {"INSTANT_OVER", "STUCK"}, "dev/breakout-crash-1.html": {"RUNTIME_ERROR"}}
_cache = {}


def results():
    if not _cache:
        out = subprocess.run(["node", "harness/playtest.js"] + [f"games/{g}" for g in GAMES], cwd=ROOT,
                             capture_output=True, text=True, check=True).stdout
        _cache.update({r["file"].split("games/")[1]: r for r in json.loads(out)})
    return _cache


def test_markers_keep_exactly_one_version():
    src = "a/*IF:fps*/BUG/*FI*/b/*IFNOT:fps*/OK/*FI*/c"
    assert apply_markers(src, "fps") == "aBUGbc" and apply_markers(src, None) == "abOKc"


def test_clean_game_passes():
    assert results()["dev/dodger-clean-01.html"]["findings"] == []


def test_each_planted_bug_is_named_and_nothing_else():
    for g, want in GAMES.items():
        assert {f["code"] for f in results()[g]["findings"]} <= want | {"STUCK"} and want <= {f["code"] for f in results()[g]["findings"]}, g


def test_keys_on_canvas_are_dead_but_smoke_test_passes():
    r = results()["dev/snake-keycanvas-0.html"]
    assert r["smoke_test"] == [] and any(f["code"] == "KEYBOARD_DEAD" for f in r["findings"])


def test_nondeterminism_names_the_source():
    why = [f["why"] for f in results()["dev/breakout-nondet-0.html"]["findings"]][0]
    assert re.search(r"crypto.getRandomValues called \d+x", why)


def test_crash_after_8_seconds_is_missed_by_smoke_test():
    r = results()["dev/breakout-crash-1.html"]
    assert r["smoke_test"] == [] and "of undefined" in r["findings"][0]["why"]
