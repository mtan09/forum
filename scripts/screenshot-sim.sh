#!/usr/bin/env bash
#
# App Store screenshot simulators: iPhone 16 Pro Max / iOS 18.3, light and dark.
#
# Reproduces the exact device and status bar used for the 6.9-inch screenshots
# in artifacts/app-store/screenshots/6.9-inch. Apple's 6.9-inch display slot
# takes 1320 x 2868, which this device renders natively, so captures need no
# rescaling.
#
# The dark device is a clone of the light one, so both carry the same installed
# build and the same status bar overrides. Overrides survive reboots (SpringBoard
# archives them) but not `simctl erase` or `simctl status_bar clear`; re-run
# `setup` after either.
#
# Captures still contain the Dynamic Island and square corners. Run
# scripts/finish-screenshot.py afterwards to produce the finished screenshots.
#
# Usage:
#   scripts/screenshot-sim.sh setup [light|dark|both]   boot, style, open Simulator
#   scripts/screenshot-sim.sh launch [light|dark]       (re)launch the forum app
#   scripts/screenshot-sim.sh shot <name> [light|dark]  capture to the raw folder
#   scripts/screenshot-sim.sh status                    show both devices

set -euo pipefail

LIGHT_UDID="F67C46FB-A581-412D-820A-404F4CDBD4E4" # iPhone 16 Pro Max
DARK_UDID="E19BC5E0-27EE-4880-B68E-88293DDBB985"  # iPhone 16 Pro Max Dark
BUNDLE_ID="com.michaeltan.forum"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SHOT_DIR="$REPO_ROOT/artifacts/app-store/screenshots/6.9-inch-v2"

resolve() {
  case "${1:-light}" in
  light) echo "$LIGHT_UDID" ;;
  dark) echo "$DARK_UDID" ;;
  *)
    echo "unknown mode '$1' (expected light or dark)" >&2
    exit 1
    ;;
  esac
}

boot_device() {
  if ! xcrun simctl list devices | grep -q "$1.*Booted"; then
    xcrun simctl bootstatus "$1" -b >/dev/null
  fi
}

# Matches the original captures: 05:03, four cellular bars on 5G, full Wi-Fi,
# 100% battery that is not charging. `--time` takes the string verbatim, so the
# leading zero is preserved rather than reformatted by the locale.
apply_status_bar() {
  xcrun simctl status_bar "$1" override \
    --time "05:03" \
    --dataNetwork "5g" \
    --cellularMode active \
    --cellularBars 4 \
    --operatorName "Carrier" \
    --wifiMode active \
    --wifiBars 3 \
    --batteryState discharging \
    --batteryLevel 100
}

prepare() {
  local mode="$1" udid
  udid="$(resolve "$mode")"
  boot_device "$udid"
  xcrun simctl ui "$udid" appearance "$mode" >/dev/null
  apply_status_bar "$udid"
  echo "$udid"
}

case "${1:-setup}" in
setup)
  MODES="${2:-both}"
  [ "$MODES" = "both" ] && MODES="light dark"
  for mode in $MODES; do
    udid="$(prepare "$mode")"
    open -a Simulator --args -CurrentDeviceUDID "$udid"
    echo "$mode ready ($udid) — status bar pinned to 05:03"
    sleep 2
  done
  ;;

status)
  xcrun simctl list devices | grep -E "$LIGHT_UDID|$DARK_UDID" || echo "devices not found"
  for udid in "$LIGHT_UDID" "$DARK_UDID"; do
    echo "  $udid appearance: $(xcrun simctl ui "$udid" appearance 2>&1 || echo unknown)"
  done
  ;;

launch)
  udid="$(prepare "${2:-light}")"
  xcrun simctl launch "$udid" "$BUNDLE_ID"
  ;;

shot)
  NAME="${2:?usage: screenshot-sim.sh shot <name> [light|dark]}"
  udid="$(resolve "${3:-light}")"
  # Re-apply first: a long-idle simulator can drift the clock back to real time.
  apply_status_bar "$udid"
  sleep 1
  mkdir -p "$SHOT_DIR"
  xcrun simctl io "$udid" screenshot "$SHOT_DIR/${NAME}-raw.png"
  echo "now run: scripts/finish-screenshot.py $NAME"
  ;;

*)
  echo "usage: screenshot-sim.sh [setup|status|launch|shot <name>] [light|dark]" >&2
  exit 1
  ;;
esac
