"""Bundle web/ into one self-contained HTML page (no doctype/head), for hosts
that wrap the page themselves, such as a claude.ai artifact.

Usage: python3 scripts/build_artifact.py OUTPUT.html
"""
import pathlib
import sys

WEB = pathlib.Path(__file__).resolve().parent.parent / "web"

FONTS = ("https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;800"
         "&family=Nunito:wght@600;700;800&display=swap")


def main(out: str) -> None:
    css = (WEB / "style.css").read_text()
    js = (WEB / "app.js").read_text()
    page = f"""<title>Train Games</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="{FONTS}">
<style>
{css}</style>
<div id="app"></div>
<script>
{js}</script>
"""
    pathlib.Path(out).write_text(page)
    print(f"Wrote {out} ({len(page) // 1024} KB)")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
