"""Chart for the README from out/heldout_first_run.json."""
import json
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

d = json.load(open("out/heldout_first_run.json"))["summary"]
codes = list(d["bugs"])
fig, ax = plt.subplots(figsize=(11, 4.6))
w = 0.27
for i, (key, name, col) in enumerate([("smoke_test", "load + screenshot smoke test", "#c0504d"),
                                      ("keyboard_monkey", "30 s keyboard monkey", "#d99694"),
                                      ("checker", "playtest gate (first run)", "#4f81bd")]):
    caught = [d["bugs"][c] - d[key]["missed_by_code"].get(c, 0) for c in codes]
    ax.bar([x + (i - 1) * w for x in range(len(codes))], caught, w, label=f"{name}: {d[key]['caught']}/{d[key]['of']}", color=col)
ax.set_xticks(range(len(codes)), [c.replace("_", "\n") for c in codes], fontsize=7.5)
ax.set_ylabel("planted bugs caught")
ax.set_title(f"84 held-out games (flappy / runner / shooter, setInterval + touch code style), 66 with one planted bug; "
             f"clean games flagged: {d['checker']['clean_games_flagged']}/{d['checker']['of_clean']}", fontsize=9.5)
ax.legend(fontsize=8.5)
fig.tight_layout()
fig.savefig("docs/result.png", dpi=130)
