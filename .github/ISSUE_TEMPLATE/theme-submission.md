---
name: "Theme submission"
about: "Submit a community theme for the Sireno Deck registry"
title: "New theme: <your-theme-name>"
labels: ["theme"]
assignees: []
---

Thanks for sharing your theme! Fill out the details below so we can list it in the [theme registry](/themes).

This form is opened automatically from the website's **Submit a theme**
button. It pre-applies the `theme` label and uses this template as the
issue body — provided the repo has the labels defined in
[`.github/labels.yml`](../labels.yml) and the template lives on the
repo's default branch.

## Theme details

- **Name:** _<theme id, e.g. `matrix`>_
- **Description (one line):**
- **Palette / color tokens** (background, frame, foreground, primary, accent, …):

```
background: #000000
frame: #ff00ff
foreground: #eef2f7
primary: #00e5ff
accent: #8a2be2
```

- **Fonts / typography roles** used (optional): `main_text`, `auxiliary_text`, `monospace`

## Resources

- **Repository or npm package:** _<link>_
- **Screenshot(s):** _drag & drop, or attach a preview render of the deck in your theme_
- **Custom components / UI overrides:** yes / no — if yes, list which React primitives you override

## Use

```yaml
theme: ./my-theme
```

or via npm package:

```yaml
theme: @myscope/my-sireno-theme
```

## Checklist

- [ ] I have a license for the theme assets (fonts, icons).
- [ ] I tested it rendered correctly on at least a 5×3 deck.
- [ ] I agree this may be added to the registry and linked from the site.
