---
title: "Popovers"
eleventyNavigation:
  key: "Popovers"
  parent: "Containers"
  order: 2
---

Popovers are a type of container lying on top of other elements on the document on a special plan (called [top layer](https://developer.mozilla.org/en-US/docs/Glossary/Top_layer)). They either float entirely independently like dialogs, or can be attached to the button controlling them, like dropdowns or tooltips.

- Limit the different purposes a popover element can contain, it shouldn't be a toolbox
- If its content is important in itself, you should dedicate a page or a page section to it instead of a popover
- Avoid nested popovers at all cost, only one should be opened at the same time

## Tooltip

A specific kind of popover that should mainly be used for informational feedback purposes. You should check its [dedicated page](/feedbacks/tooltips/) for that matter.

## Dropdowns

The element often used to display menu options through a button input which is visually anchored to.

{% demo "/demos/example.vue" %}

### Context menus
In a listing context, a dropdown can be used as a context menu to offer actions on a chosen element of the list.
- It should only contain link or buttons as actionable controls
- Heading labels can be added if the menu purpose is ambiguous or if controls need to be grouped
- Elements label should be in [Title Case](https://en.wikipedia.org/wiki/Title_case)
- Group elements by type (don't mix links and buttons)
- Order elements by importance, frequency, with destructive actions at the end of its group

{% demo "/demos/example.vue" %}

## Dialogs

They are a kind of popover with a backdrop around it and have a close button and should include a main action button at the end as they require an interaction from the user before they can return to whatever is underneath (also called "not light dismissible").

They can be used to confirm an important action. A [dedicated component](/feedbacks/confirm-dialogs/) has been made for this purpose.

{% demo "/demos/example.vue" %}
