#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${TARGET_BUILD_DIR}/${UNLOCALIZED_RESOURCES_FOLDER_PATH}/web"
rm -rf "$DEST"
mkdir -p "$DEST/assets"
cp "$ROOT/index.html" "$ROOT/styles.css" "$ROOT/game.js" "$ROOT/addonCatalog.js" "$ROOT/fighters.js" "$ROOT/favicon.ico" "$ROOT/apple-touch-icon.png" "$DEST/"
cp -R "$ROOT/assets/." "$DEST/assets/"
cp "$ROOT/node_modules/socket.io/client-dist/socket.io.min.js" "$DEST/socket.io.min.js"
python3 - "$DEST/index.html" <<'PY'
import pathlib, sys
path = pathlib.Path(sys.argv[1])
text = path.read_text()
text = text.replace('src="/socket.io/socket.io.js"', 'src="./socket.io.min.js"')
needle = '<script src="./addonCatalog.js?v=1"></script>'
insert = '<script>window.DOUBLEDOOF_SERVER="https://doubledoof.onrender.com";window.BATDUEL_SERVER=window.DOUBLEDOOF_SERVER;</script>\n    ' + needle
if "DOUBLEDOOF_SERVER" not in text and "BATDUEL_SERVER" not in text and needle in text:
    text = text.replace(needle, insert, 1)
path.write_text(text)
PY
