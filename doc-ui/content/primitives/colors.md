---
title: "Colors"
eleventyNavigation:
  key: "Colors"
  parent: "Primitives"
  order: 2
---

## Grays
Default palette for texts, backgrounds and borders
{% colorTokenList tokens.colors.gray, "gray-" %}

## Accents
For informational situations. Do not use it as only indicator

{% colorTokenList tokens.colors.accent, "accent-" %}

{% colorTokenList tokens.colors.accent.light, "accent-light-" %}

{% colorTokenList tokens.colors.accent.dark, "accent-dark-" %}

## Brand
For branding related topics. Do not use it for "warning" purpose

{% colorTokenList tokens.colors.brand , "brand-" %}
