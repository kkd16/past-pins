#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.."
archive="${1:?Pass an EAS iOS simulator archive.}"
output="${2:?Pass a screenshot output directory.}"
model="${3:-iPhone-16-Pro}"
device="$(xcrun simctl create 'PastPins screenshots' "com.apple.CoreSimulator.SimDeviceType.$model")"
scratch="$(mktemp -d)"
cleanup() {
  capture_status=$?
  xcrun simctl shutdown "$device" 2>/dev/null || true
  xcrun simctl delete "$device"
  rm -rf "$scratch"
  return "$capture_status"
}
trap cleanup EXIT

tar -xzf "$archive" -C "$scratch"
echo "Booting $model."
xcrun simctl boot "$device"
xcrun simctl bootstatus "$device" -b
xcrun simctl spawn "$device" defaults write NSGlobalDomain AppleLanguages -array en
xcrun simctl spawn "$device" defaults write NSGlobalDomain AppleLocale -string en_US
open -a Simulator --args -CurrentDeviceUDID "$device"
xcrun simctl status_bar "$device" override --time '9:41' --dataNetwork wifi --wifiMode active --wifiBars 3 --batteryState charged --batteryLevel 100
echo "Installing PastPins on $model."
xcrun simctl install "$device" "$scratch/PastPins.app"
container="$(xcrun simctl get_app_container "$device" io.github.kkd16.pastpins data)"
bun scripts/screenshots/seed.ts "$container"
mkdir -p "$output"

for flow in .maestro/screenshots/*.yaml; do
  name="$(basename "$flow" .yaml)"
  echo "Opening $name on $model."
  maestro --verbose --device "$device" test "$flow"
  xcrun simctl io "$device" screenshot --type=jpeg "$output/$name.jpg"
  echo "Captured $name on $model."
  info="$(sips -g pixelWidth -g pixelHeight -g hasAlpha "$output/$name.jpg")"
  if ! [[ "$info" == *'hasAlpha: no'* && ( "$info" == *'pixelWidth: 1206'* && "$info" == *'pixelHeight: 2622'* || "$info" == *'pixelWidth: 1320'* && "$info" == *'pixelHeight: 2868'* ) ]]; then
    echo "Unexpected App Store screenshot dimensions or transparency: $name" >&2
    exit 1
  fi
done
