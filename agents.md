The idea behind the Chrome Plugin is to inspect all links and buttons on a webpage. The plugin needs to open upon clicking the icon in the chrome pluginbar. It needs to close upon clicking the icon again. It needs to reload upon navigating to a different page. It needs to have a reload button (for when images use lazy loading, scrolling to bottom of page, and reloading the plugin would help). There would be filters, filters for Buttons/Links/Both + filter for Items with text, items without text, Items with and without image. Items with and without aria-*attribute. Items with and without title. Items with and without tabindex, items (links or buttons) that open in new window or not.  There needs to be a reset filter button. 
In the list, details of the links and/or buttons(text, openNewWindow, aria-label, aria-hidden true, the image, or svg, aria-labelledby text, aria-describedBy text, href, title,  and other important accessibility attributes) would be logged. On each items there would be a button to inspect the html of the element, and a button to scroll to the element. 
I think i want to start by indexing all button and link elements, and html elements that have are role button or role link. Saving all attributes of the items, getting the CSS of the items - INCLUDING pseudo CSS classes, for CSS2 and CSS3, checking if items are in Shadow Dom, checking if items are in a slot. Besides saving the attributes and css, there also would need to be a check for javascript click handler on the element. (at east I think I need this, in order for SPA or other dynamic framework code). 
And below the list of links/buttons there would be a faq part, it uses a json file to many the content of the faqs.


Key Implementation Steps

Manifest (MV3):

Declare the extension name, version, and permissions (scripting, activeTab, and sidePanel).

Use a service worker (background.js) and default side panel path (sidepanel.html).

Register content scripts (e.g., content.js) to run on document_idle.

background.js:

When installed, configure Chrome’s side panel to open when the action icon is clicked.

Listen for tab updates (chrome.tabs.onUpdated) to trigger the side-panel reload if navigating to a new page.

content.js:

On message {action: 'get-links-buttons'}, collect all elements that are <a>, <button>, or have role="link"/role="button", including those inside shadow roots.

For each element:

Save tag name, text, href, titles, aria-* attributes, tabindex, window.open detection, whether it’s inside a slot, accessible name, and presence of a click handler.

Capture the computed CSS (including pseudo-elements) and check for absolute positioning or other visual traits. CSS2 and or CSS3.

Record if it exists within the shadow DOM or is slotted.

For all the saved attributes and CSS create boolean values. A couple of examples: hasTargetBlank=true, hasTargetBlank=false. hasTextInLink=true / or false. hasTitle, hasAriaHidden, hasPositionAbsolute 

Maintain the collected list in memory for subsequent “scroll to element” or “view HTML” commands. If needed add data-attribute-scroll with an ID in the source of the page.

sidepanel.html & sidepanel.js:

Display filter controls (radio buttons for each attribute). Provide a Reset button to clear all filters.

Show summary counts for links, buttons, images, and SVGs.

When items are listed, include a small preview for images/SVGs and show relevant metadata.

Provide “Scroll To” and “Show HTML” buttons that send messages back to the content script for the selected element.

Implement a “Reload” button that re-fetches data from the current page.

Load FAQs from faqs.json and create an accordion-style FAQ section.


faqs.json:

JSON array of question/answer objects. The side panel fetches and renders these.