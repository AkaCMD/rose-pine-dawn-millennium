#!/usr/bin/env bash
set -euo pipefail
source_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
steam_root="${1:-}"
if [[ -z "$steam_root" ]]; then
  for candidate in "$HOME/.steam/steam" "$HOME/.local/share/Steam"; do
    if [[ -d "$candidate/config" ]]; then steam_root="$candidate"; break; fi
  done
fi
if [[ -z "$steam_root" || ! -d "$steam_root/config" ]]; then
  printf 'Steam installation not found. Usage: bash install.sh /path/to/Steam\n' >&2; exit 1
fi
theme_dest="$steam_root/millennium/themes/rose-pine-dawn"
if [[ "$(realpath -m "$source_dir")" == "$(realpath -m "$theme_dest")" ]]; then
  printf 'The theme is already in its installation directory.\n'; exit 0
fi
if [[ -e "$theme_dest" ]]; then
  backup_dest="${theme_dest}.backup-$(date +%Y%m%d-%H%M%S)"
  cp -a -- "$theme_dest" "$backup_dest"
  printf 'Existing theme backed up to: %s\n' "$backup_dest"
fi
mkdir -p -- "$theme_dest"
for theme_file in skin.json css palette.json licenses README.md install.sh; do
  cp -a -- "$source_dir/$theme_file" "$theme_dest/"
done
printf 'Theme installed at: %s\nEnable Rosé Pine Dawn in the Millennium theme settings, then restart Steam.\n' "$theme_dest"
