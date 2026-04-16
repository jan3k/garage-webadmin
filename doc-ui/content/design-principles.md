---
title: "Design Principles"
eleventyNavigation:
  key: "Design Principles"
  order: 1
---

Guidelines are not hardset rules but directions that will guide contributors, knowing that there will be exceptions.

## Keep it simple and consistent

Server administration is a complexe subject, with potentially stressful outcomes. Having a graphical user interface greatly helps even the less tech savy people.

As such, consistency is one of the ways to limite the cognitive load needed to understand the software.

It is a way to limit a codebase's complexity, by having a standardized set of elements, ways to compose interfaces, and user workflow within them.\
It remains to be noted that it is better to prioritize *user* experience over *developer* experience.

- Decide what information is the most important and do not display all of the data at once. You can use components like [popovers](/containers/popovers) to disclose additional information only if necessary.
- Limit the number of options in choices or controls lists and always offer a default one
- Keep labels and messages as short as possible

## Limit friction

- Add confirmation patterns (modals or checkboxes unchecked by default) before applying destrutive operations
- Automate error correction if possible to make it transparent to users
- Make error messages link to elements they are related to (visually and semantically)

## Use the platform

Make the use of the tools, elements and APIs made available by web browsers if possible instead of reimplementing custom components.
- Priorize the [basic form elements](/controls/form-elements) over other custom ones
- Write semantic HTML (for example the [popovers](/controls/popovers) and [dialogs](/feedbacks/dialog) elements use the eponymous HTML components)
