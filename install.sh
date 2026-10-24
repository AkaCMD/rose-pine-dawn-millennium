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
cleanup_old_themes() {
  local old_theme
  for old_theme in "$steam_root"/millennium/themes/rose-pine-dawn.backup-*; do
    [[ -e "$old_theme" || -L "$old_theme" ]] || continue
    rm -rf -- "$old_theme"
    printf 'Removed old theme: %s\n' "$old_theme"
  done
}
if [[ "$(realpath -m "$source_dir")" == "$(realpath -m "$theme_dest")" ]]; then
  cleanup_old_themes
  printf 'The theme is already in its installation directory.\n'; exit 0
fi
mkdir -p -- "$steam_root/millennium/themes"
# Stage outside the themes directory so Millennium cannot discover temporary copies.
staging_dir="$(mktemp -d "$steam_root/millennium/.rose-pine-dawn.XXXXXX")"
cleanup_staging() {
  if [[ ! -e "$theme_dest" && ! -L "$theme_dest" && -e "$staging_dir/previous" ]]; then
    mv -- "$staging_dir/previous" "$theme_dest" || return
  fi
  rm -rf -- "$staging_dir"
}
trap cleanup_staging EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
mkdir -- "$staging_dir/theme"
for theme_file in skin.json css palette.json licenses README.md install.sh; do
  cp -a -- "$source_dir/$theme_file" "$staging_dir/theme/"
done
if [[ -e "$theme_dest" || -L "$theme_dest" ]]; then
  mv -- "$theme_dest" "$staging_dir/previous"
fi
mv -- "$staging_dir/theme" "$theme_dest"
cleanup_old_themes
printf 'Theme installed at: %s\nEnable Rosé Pine Dawn in the Millennium theme settings, then restart Steam.\n' "$theme_dest"
