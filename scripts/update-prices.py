#!/usr/bin/env python3
"""
Fetch current oil prices and update data.json.

Runs standalone or via GitHub Actions. Updates:
  - energy.crudePrice (WTI + Brent)
  - meta.lastUpdated
  - Day count in targetsStruck label

Gas prices (AAA) require manual update -- their site blocks automated requests.

Usage:
  python scripts/update-prices.py           # dry run (prints changes)
  python scripts/update-prices.py --apply   # writes data.json
"""

import json
import re
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "data.json"

OIL_URL = "https://s3.amazonaws.com/oilprice.com/widgets/oilprices/all/last.json"
WTI_KEY = "45"
BRENT_KEY = "46"
WAR_START = datetime(2026, 2, 28, tzinfo=timezone.utc)


def fetch_oil():
    req = urllib.request.Request(OIL_URL, headers={"User-Agent": "declassify-updater/1.0"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        raw = json.loads(resp.read())
    wti = raw[WTI_KEY]["price"]
    brent = raw[BRENT_KEY]["price"]
    return int(round(wti)), int(round(brent))


def war_day():
    now = datetime.now(timezone.utc)
    return max(1, (now - WAR_START).days + 1)


def format_date():
    now = datetime.now(timezone.utc)
    return now.strftime("%B %-d, %Y")


def update(data, apply=False):
    changes = []
    day = war_day()
    today = format_date()

    # Oil prices
    try:
        wti, brent = fetch_oil()
        old_crude = data["energy"]["crudePrice"]["value"]
        new_crude = f"${wti}"
        new_label = f"US crude per barrel (Brent at ${brent})"
        if old_crude != new_crude:
            changes.append(f"crudePrice: {old_crude} -> {new_crude} (Brent ${brent})")
            data["energy"]["crudePrice"]["value"] = new_crude
            data["energy"]["crudePrice"]["label"] = new_label
        else:
            old_label = data["energy"]["crudePrice"]["label"]
            if f"Brent at ${brent}" not in old_label:
                changes.append(f"crudePrice label: Brent updated to ${brent}")
                data["energy"]["crudePrice"]["label"] = new_label
    except Exception as e:
        changes.append(f"[ERROR] Oil fetch failed: {e}")

    # Date and day counter
    old_date = data["meta"]["lastUpdated"]
    if old_date != today:
        changes.append(f"lastUpdated: {old_date} -> {today}")
        data["meta"]["lastUpdated"] = today

    # Update day count in targetsStruck label
    ts_label = data["dashboard"]["targetsStruck"]["label"]
    new_ts_label = re.sub(r"\d+ days", f"{day} days", ts_label)
    if new_ts_label != ts_label:
        changes.append(f"targetsStruck label: day count -> {day}")
        data["dashboard"]["targetsStruck"]["label"] = new_ts_label

    if not changes:
        print("No changes detected.")
        return False

    print("Changes:")
    for c in changes:
        print(f"  {c}")

    # Reminders for manual items
    print()
    print("Manual checks needed:")
    print("  - Gas price (AAA): https://gasprices.aaa.com/")
    print("  - Casualties (Al Jazeera): https://www.aljazeera.com/news/longform/2025/6/14/us-israel-attacks-on-iran-death-toll-and-injuries-live-tracker")
    print("  - US casualties (CENTCOM): https://www.centcom.mil/MEDIA/PRESS-RELEASES/")
    print("  - Strikes (Airwars): https://airwars.org/")
    print("  - Environment (CEOBS): https://ceobs.org/")

    if apply:
        with open(DATA_FILE, "w") as f:
            json.dump(data, f, indent=2)
            f.write("\n")
        print(f"\nWrote {DATA_FILE}")
    else:
        print("\nDry run. Use --apply to write changes.")

    return True


def main():
    apply = "--apply" in sys.argv

    with open(DATA_FILE) as f:
        data = json.load(f)

    changed = update(data, apply=apply)
    sys.exit(0 if changed or apply else 1)


if __name__ == "__main__":
    main()
