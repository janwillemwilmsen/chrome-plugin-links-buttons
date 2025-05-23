# Links & Buttons Finder Extension

This Chrome extension shows all links, buttons, images and SVGs from the current page in a side panel. It helps quickly review these elements, including ones inside the shadow DOM, and provides filtering and navigation utilities.

## Installation

1. Clone or download this repository.
2. In Chrome, open `chrome://extensions/` and enable **Developer mode**.
3. Choose **Load unpacked** and select this folder.
4. An icon titled **Show Links & Buttons** will appear in the toolbar.

## Using the Side Panel

1. Navigate to any web page.
2. Click the extension icon to open its side panel.
3. Use the **Reload** button if you want to refresh data from the page.
4. Filter results with the options at the top of the panel (buttons vs links, with or without text, images, etc.).
5. Each item offers:
   - **Scroll To** – scrolls the page to the element and highlights it.
   - **Show HTML** – displays the element's HTML markup.
6. The bottom section contains Frequently Asked Questions loaded from `faqs.json`.

## Known Limitations

- GIF images and images inside iframes are not supported.
- Sprite images show only the combined sprite preview.
- Very dynamic pages or those that lazy‑load images may require scrolling to the bottom before opening the panel.
- Font icons are ignored.
- Scrolling only works on visible elements.
- `aria-hidden` is checked only up to ten ancestor levels.
- Links injected after the page has loaded might be missed.

## Tests and Demos

Several HTML pages are included for manual testing:

- `test-links.html` – basic link cases.
- `test-multiple.html` – combinations of filterable attributes.
- `test-shadowdom.html` – examples inside Shadow DOM.
- `test-svgs.html` – simple SVG examples.

]