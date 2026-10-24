# Rosé Pine Dawn for Millennium

A light theme for the Steam desktop client, built with the [Rosé Pine Dawn palette](https://rosepinetheme.com/palette/). It uses warm cream surfaces, purple-gray text, and pine-blue accents across the library and store.

This is a CSS theme loaded by [Millennium](https://steambrew.app/). It has one light appearance and requires no additional plugin or build step.

## Preview

![Rosé Pine Dawn theme on the Steam store's Godot Engine page](docs/images/store-preview.png)

Public store page shown while signed out, with no Steam account or personal library information.

## Install

Install Millennium before installing this theme. The theme package contains `skin.json` and the CSS files that Millennium loads; see the [Millennium theme structure documentation](https://docs.steambrew.app/themes/basics/structure).

### Linux

Clone the repository and run the installer from the checkout:

```bash
git clone https://github.com/AkaCMD/rose-pine-dawn-millennium.git
cd rose-pine-dawn-millennium
bash install.sh
```

The [installer](install.sh) checks `~/.steam/steam` and `~/.local/share/Steam`. For a different Steam location, pass its root directory:

```bash
bash install.sh /path/to/Steam
```

The script copies the theme into `<Steam>/millennium/themes/rose-pine-dawn/`. If that directory exists, it first creates a sibling backup named `rose-pine-dawn.backup-YYYYMMDD-HHMMSS`.

### Manual installation

Download this repository using **Code → Download ZIP** and extract it. Copy the extracted folder into your Steam installation's `millennium/themes/` directory, then rename the folder to `rose-pine-dawn`.

Check that these paths exist before enabling the theme:

```text
<Steam>/millennium/themes/rose-pine-dawn/
├── skin.json
└── css/
    ├── light.css
    ├── steam.css
    ├── store.css
    └── library-game.css
```

## Enable and use

Open Millennium's theme settings in Steam and select **Rosé Pine Dawn**. Restart Steam to load the theme across its windows.

The theme follows normal Steam navigation. Game covers, promotional artwork, and text embedded in images retain their original appearance.

To update a Linux installation, pull the repository changes, rerun the installer, and restart Steam:

```bash
git pull --ff-only
bash install.sh
```

For manual installations, replace the theme folder with the extracted updated copy, then restart Steam.

## Coverage and compatibility

The [theme manifest](skin.json) loads styles for the client frame, library home, collection grids, game details, settings, menus, and store pages. The sidebar styles include the collection shortcut, game-type dropdown, and sorting button.

Local checks on October 24, 2026 used CachyOS, Millennium 3.6.1, and Steam build 1792618285. Checked views included collection grids, Godot and TOEM library details, the settings language dropdown, and store product, search, and browse views.

Windows and macOS have not been tested. Big Picture, the in-game overlay, and all friends/chat states have not been checked individually. Contrast checks covered visible text with computable backgrounds; they do not establish accessibility compliance across Steam.

Steam updates can change the internal CSS classes used by this theme. When reporting a dark panel or unreadable label, include the page name, a screenshot, and your Steam and Millennium versions.

## Coverage tests

Run `npm test` with Node.js 22 or newer for local checks. With Steam's local CEF debugging endpoint available, run `npm run test:coverage` to generate a report of suspected theme gaps and unverified regions. See the [coverage testing guide](docs/theme-coverage.md) for state captures, strict mode, browser verification, and limitations, and the [coverage glossary](CONTEXT.md) for terminology.

## Restore the default appearance

Select the default theme in Millennium and restart Steam. You can then remove `<Steam>/millennium/themes/rose-pine-dawn/`.

To restore an installer backup, select the default theme first. Replace the theme directory with the backup, rename it to `rose-pine-dawn`, then enable the theme again.

## Credits

The color reference is [Rosé Pine](https://rosepinetheme.com/), with palette data from [rose-pine/palette](https://github.com/rose-pine/palette). Its MIT license is included in [licenses/rose-pine-MIT.txt](licenses/rose-pine-MIT.txt).

This is an independent theme maintained by AkaCMD. It is not affiliated with Valve, Millennium, or the Rosé Pine project.
