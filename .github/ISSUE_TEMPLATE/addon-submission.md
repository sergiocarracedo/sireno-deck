---
name: "Addon submission"
about: "Submit a community addon for the Sireno Deck registry"
title: "New addon: <your-addon-name>"
labels: ["addon"]
assignees: []
---

Thanks for sharing your addon! Fill out the details below so we can list it in the [addon registry](/addons).

Publish and maintain the addon in your own repository (and npm, if applicable). This issue requests a registry listing only; do not upload addon source code to the Sireno Deck repository. Attach or link a cover screenshot that maintainers can use on the listing.

This form is opened automatically from the website's **Submit an addon**
button. It pre-applies the `addon` label and uses this template as the
issue body — provided the repo has the labels defined in
[`.github/labels.yml`](../labels.yml) and the template lives on the
repo's default branch.

## Addon details

- **Name:** _<npm package name, e.g. `my-sireno-addon`>_
- **npm package:** _<link to the npm page if published>_
- **Short description (one line):**
- **Category/use case:** _<workflow, AI, system, media, …>_

## Resources

- **Repository:** _<link>_
- **Cover screenshot:** _attach or link a representative preview image_
- **Additional screenshot(s):** _optional button/deck previews_
- **Button types added** (each as `<addon>:<type>`, e.g. `my-addon:hello`):

```
- my-addon:hello
```

## Reproduce / test

Steps to install and use your addon with Sireno Deck:

```yaml
addons:
  - "my-addon"
```

```sh
# any setup commands here
```

## Checklist

- [ ] I tested the addon with Sireno Deck (emulator is fine).
- [ ] The addon follows the `sireno-addon` package contract (`"sireno-addon": true` in `package.json`).
- [ ] I have a license for the code.
- [ ] I agree this may be added to the registry and linked from the site.
