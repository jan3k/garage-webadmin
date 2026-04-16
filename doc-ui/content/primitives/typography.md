---
title: "Typography"
eleventyNavigation:
  key: "Typography"
  parent: "Primitives"
  order: 1
---

As one of the basic elements of the interface, using the default styles, size and colors help bring information effectively and contributes at creating a feeling of quality for the app.

- Avoid writing all capitalized text as it can be harder to read and be considered as acronyms by assistive technologies
- Avoid abbreviations as they could be not understood by non-English-native users. And don't use `<abbr>` elements as it's [poorly accessible](https://adrianroselli.com/2024/01/using-abbr-element-with-title-attribute.html).
- Don't vary font weight depending on an actionable element's state (hover or focus), as it can produce unwanted text wrap and potentially even layout shift

---

## Examples

# Title Display
# Title 1
## Title 2
### Title 3

<p class="text-large">Text large</p>
<p>Text body size</p>
<p class="text-small">Text small</p>
<p class="text-tiny">Text tiny</p>
