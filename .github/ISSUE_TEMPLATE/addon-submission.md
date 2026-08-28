---
name: "Addon submission"
about: "Submit a community addon for the Sireno Deck registry"
title: "New addon: <your-addon-name>"
labels: [addon]
assignees: ""
---

Thanks for sharing your addon! Fill out the details below so we can list it in the [addon registry](/addons).

## Addon details

- **Name:** <npm package name, e.g. `my-sireno-addon`>
- **npm package:** <link to the npm page if published>
- **Short description (one line):**
- **Category/use case:** (_workflow, AI, system, media…_)

## Resources

- **Repository:** <link>
- **Screenshot(s):** drag & drop or paste preview images of the button(s) on the deck
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

- [ ] I tested the addon with Sireno Deck (emulator is fine)
- [ ] The addon follows the `sireno-addon` package contract (`sireno-addon` keyword in `package.json`)
- [ ] I have a license for the code
- [ ] I agree this may be added to the registry and linked from the site
