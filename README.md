# Rosé Pine Dawn for Steam

**A light theme for the Steam store and desktop client, powered by [Millennium](https://steambrew.app/).**

Warm cream surfaces, purple-gray text, and pine-blue accents, based on the [Rosé Pine Dawn palette](https://rosepinetheme.com/palette/).

- Themed store home, game pages, search, browse, and cart.
- Matching library, game details, downloads, settings, and menus.
- Compiled CSS included, with no build step or additional plugin required to use the theme.

[Preview](#preview) · [Installation](#installation) · [Compatibility](#compatibility) · [Report an issue](https://github.com/AkaCMD/rose-pine-dawn-steam-store-theme/issues)

## Preview

### Steam store

![Rosé Pine Dawn light theme on the Steam store's Godot Engine page](docs/images/store-preview.png)

Public store page captured while signed out.

### Steam library

![Rosé Pine Dawn theme on the Steam library home](docs/images/library-preview.png)

Library screenshot with AI-assisted privacy edits hiding account names, the avatar, custom categories, and playtime statistics.

## Installation

1. Install [Millennium](https://docs.steambrew.app/users/getting-started/installation) for your platform.
2. Exit Steam completely, then install the theme using one of the methods below.
3. Start Steam, open Millennium's theme settings, and select **Rosé Pine Dawn**. Restart Steam to apply it.

### Linux

```bash
git clone https://github.com/AkaCMD/rose-pine-dawn-steam-store-theme.git
cd rose-pine-dawn-steam-store-theme
bash install.sh
```

The [installer](install.sh) checks `~/.steam/steam` and `~/.local/share/Steam`. For a custom Steam location, run `bash install.sh /path/to/Steam`.

It installs into `<Steam>/millennium/themes/rose-pine-dawn/`, replacing an existing copy and removing old `rose-pine-dawn.backup-*` folders after a successful install. Other themes are left untouched.

### Windows / manual installation

1. Download this repository using **Code → Download ZIP** and extract it.
2. Copy the extracted folder into `<Steam>/millennium/themes/` and rename it to `rose-pine-dawn`. Create the `themes` folder if needed.
3. Check that `skin.json` and `css/` are directly inside `rose-pine-dawn`, without an extra nested repository folder.

On Windows, `<Steam>` is the folder containing `steam.exe`, commonly `C:\Program Files (x86)\Steam`. See the [official directory reference](https://docs.steambrew.app/users/getting-started/structure). The `install.sh` script is for Linux.

## Compatibility

- Local checks used CachyOS, Millennium 3.6.1, and Steam build 1792618285 on October 24, 2026.
- Checked views included collection grids, Godot and TOEM library details, the settings language dropdown, and store product, search, and browse pages.
- Windows and macOS have not been tested. Big Picture, the in-game overlay, and all friends/chat states have not been checked individually.
- Game covers, promotional artwork, and text embedded in images retain their original appearance. Contrast checks do not establish accessibility compliance across Steam.

Steam updates can change the CSS classes this theme uses. When [reporting a dark panel or unreadable label](https://github.com/AkaCMD/rose-pine-dawn-steam-store-theme/issues), include the page, a screenshot with personal information hidden, and your Steam and Millennium versions.

## Update and remove

<details>
<summary>Update an installed theme</summary>

For Linux installations, exit Steam and run these commands from your checkout:

```bash
git pull --ff-only
bash install.sh
```

For manual installations, exit Steam and replace the `rose-pine-dawn` folder with the newly extracted copy. Start Steam again after updating.

</details>

<details>
<summary>Restore the default Steam appearance</summary>

Select the default theme in Millennium and restart Steam. You can then remove `<Steam>/millennium/themes/rose-pine-dawn/`.

</details>

## Development

<details>
<summary>Build the theme and run coverage checks</summary>

Use Node.js 22 or newer. Install the development dependencies, then compile the theme:

```bash
npm install
npm run build
npm test
```

Edit the Sass sources in [`scss/`](scss/) and commit both the sources and generated files in `css/`. The six entry points match the CSS files loaded by [`skin.json`](skin.json). Run `npm run watch` while editing or `npm run build:check` to verify generated CSS without writing files.

The `steam/` and `store/` entry points preserve module order because later rules override earlier ones. Shared colors live in [`scss/shared/_tokens.scss`](scss/shared/_tokens.scss), checked against [`palette.json`](palette.json). Keep the runtime `--rp-*` properties when adding rules.

With Steam's local CEF debugging endpoint available, `npm run test:coverage` reports suspected theme gaps and unverified regions. See the [coverage testing guide](docs/theme-coverage.md) for capture instructions and limitations, and the [coverage glossary](CONTEXT.md) for terminology.

</details>

## Credits

Colors from [Rosé Pine](https://rosepinetheme.com/) and [rose-pine/palette](https://github.com/rose-pine/palette). The palette's MIT license is included in [licenses/rose-pine-MIT.txt](licenses/rose-pine-MIT.txt).

An independent theme maintained by AkaCMD, unaffiliated with Valve, Millennium, or the Rosé Pine project.
