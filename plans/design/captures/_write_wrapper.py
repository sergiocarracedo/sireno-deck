#!/usr/bin/env python3
"""Generate a theme wrapper config for the Stitch captures.

Reads the user's config, rewrites the theme line, and rewrites any relative
!include paths so they resolve against the user's config dir (where the
demo yml files actually live) — not against the wrapper's location.
"""
import os
import pathlib


def main() -> None:
    src = pathlib.Path(os.environ["USER_CONFIG_VAL"]).read_text()
    user_dir = pathlib.Path(os.environ["USER_DIR_VAL"])
    theme = os.environ["THEME_VAL"]
    out_file = pathlib.Path(os.environ["FILE_VAL"])

    out: list[str] = []
    seen_theme = False
    skip_next_indented = False
    for line in src.splitlines():
        if line.startswith("theme:"):
            out.append("theme: " + theme)
            seen_theme = True
            # The user's theme block can be a YAML list — `theme:` followed by
            # indented continuation lines like `  default`. Drop the next
            # non-blank, indented continuation so we don't end up with
            # `theme: [light, default]`.
            skip_next_indented = True
            continue
        if skip_next_indented:
            stripped = line.lstrip()
            if stripped == "" or line.startswith(" ") or line.startswith("\t"):
                # blank or indented continuation — drop
                continue
            skip_next_indented = False
        if line.lstrip().startswith("#") and (
            "themes" in line or "default" in line.lower()
        ):
            continue
        stripped = line.lstrip()
        idx = stripped.find("!include ")
        if idx >= 0:
            prefix = stripped[:idx]
            inc = stripped[idx + len("!include ") :].strip()
            if not (
                inc.startswith("/")
                or inc.startswith("./")
                or inc.startswith("../")
            ):
                resolved = (user_dir / inc).resolve()
                out.append(
                    f"{line[:len(line)-len(stripped)]}{prefix}!include {resolved}"
                )
                continue
        out.append(line)
    if not seen_theme:
        out.insert(0, "theme: " + theme)
    out_file.write_text("\n".join(out) + "\n")


if __name__ == "__main__":
    main()