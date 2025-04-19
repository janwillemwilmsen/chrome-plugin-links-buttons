chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request && request.action === 'get-links-buttons') {
    console.log('[ContentScript] Received get-links-buttons');
    // Use an async IIFE to handle the async operation
    (async () => {
      try {
        const all = getAllInteractiveElements();
        const filtered = all.filter(isLinkOrButton);
        __lastFilteredElements = filtered; 

        let linkCounter = 1;
        let buttonCounter = 1;
        const itemsPromises = filtered.map(el => {
          const isButton = el.tagName.toLowerCase() === 'button' || el.getAttribute('role') === 'button';
          const sequentialId = isButton ? buttonCounter++ : linkCounter++;
          return extractElementData(el, sequentialId, isButton); // Pass sequentialId and isButton flag
        });

        // Use Promise.all to wait for all async calls to extractElementData
        const items = await Promise.all(itemsPromises);
        console.log('[ContentScript] Sending items:', items);
        sendResponse({ success: true, items });
      } catch (e) {
        console.error('[ContentScript] Error processing get-links-buttons:', e);
        sendResponse({ success: false, error: e.message });
      }
    })(); // Immediately invoke the async function
    return true; // Indicate asynchronous response
  }
  if (request && request.action === 'scroll-to-element' && typeof request.index === 'number') {
    const el = __lastFilteredElements[request.index];
    if (el && el.scrollIntoView) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('links-buttons-highlight');
      setTimeout(() => el.classList.remove('links-buttons-highlight'), 2000);
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false });
    }
    return true;
  }
  if (request && request.action === 'get-element-html' && typeof request.index === 'number') {
    const el = __lastFilteredElements[request.index];
    if (el) {
      sendResponse({ success: true, html: el.outerHTML });
    } else {
      sendResponse({ success: false });
    }
    return true;
  }
  return false;
});

// Helper function to recursively find elements including those in shadow DOM
function findAllElementsRecursive(selector, rootNode = document) {
  let elements = Array.from(rootNode.querySelectorAll(selector));
  const allNodes = rootNode.querySelectorAll('*'); // Get all nodes in the current root

  allNodes.forEach(node => {
    if (node.shadowRoot) {
      // Recursively search inside the shadow root of this node
      elements = elements.concat(findAllElementsRecursive(selector, node.shadowRoot));
    }
  });

  return elements;
}

// Use findAllElementsRecursive to find interactive elements
function getAllInteractiveElements(root = document) {
  const selector = 'a, button, [role="link"], [role="button"]';
  return findAllElementsRecursive(selector, root);
}

async function extractElementData(el, sequentialId, isButton) { 
  if (!el || !el.tagName) return { type: '', linkUrl: '', text: '', slotContent: '', images: [] };
  let tag = el.tagName.toLowerCase();
  let id = el.id || '';
  let className = el.className || '';
  let role = el.getAttribute && el.getAttribute('role');
  let ariaHidden = (function checkAriaHidden(e, depth = 0) {
    if (!e || depth > 10) return false;
    if (e.getAttribute && e.getAttribute('aria-hidden') === 'true') return true;
    return checkAriaHidden(e.parentElement, depth + 1);
  })(el);
  let ariaLabel = el.getAttribute && el.getAttribute('aria-label');
  let ariaLabelledBy = el.getAttribute && el.getAttribute('aria-labelledby');
  let ariaDescribedBy = el.getAttribute && el.getAttribute('aria-describedby');
  let title = el.getAttribute ? (el.getAttribute('title') || '') : ''; // Extract title attribute
  function resolveAriaRefs(refStr) {
    if (!refStr) return '';
    return refStr.split(' ').map(id => {
      const ref = document.getElementById(id);
      return ref ? ref.textContent.trim() : '';
    }).filter(Boolean).join(' ');
  }
  let ariaLabelledByText = resolveAriaRefs(ariaLabelledBy);
  let ariaDescribedByText = resolveAriaRefs(ariaDescribedBy);
  let linkUrl = el.href || (el.getAttribute && el.getAttribute('href')) || el.action || '';
  let text = el.textContent ? el.textContent.trim() : '';
  let slotContent = '';
  if (el.shadowRoot && el.shadowRoot.textContent) {
    slotContent = el.shadowRoot.textContent.trim();
  }
  // Robustly detect if opens in new window (align with playwrightcode.js logic)
  let opensInNewWindow = false;
  if (tag === 'a') {
    opensInNewWindow = el.getAttribute('target') === '_blank';
  } else if (tag === 'button' || role === 'button') {
    // Check inline onclick attribute
    let handler = el.getAttribute('onclick');
    if (handler && handler.includes('window.open')) {
      opensInNewWindow = true;
    }
    // Check attached JS handler
    else if (typeof el.onclick === 'function' && el.onclick.toString().includes('window.open')) {
      opensInNewWindow = true;
    }
    // Check for any attribute containing window.open
    else {
      for (let i = 0; i < el.attributes.length; i++) {
        if (el.attributes[i].value && el.attributes[i].value.includes('window.open')) {
          opensInNewWindow = true;
          break;
        }
      }
    }
    // Recursively check children for onclick="window.open"
    function checkChildrenForWindowOpen(element) {
      if (!element || !element.children) return false;
      for (let i = 0; i < element.children.length; i++) {
        let child = element.children[i];
        let childHandler = child.getAttribute && child.getAttribute('onclick');
        if (childHandler && childHandler.includes('window.open')) {
          return true;
        }
        if (checkChildrenForWindowOpen(child)) {
          return true;
        }
      }
      return false;
    }
    if (!opensInNewWindow && checkChildrenForWindowOpen(el)) {
      opensInNewWindow = true;
    }
  }

  // Find ancestor link
  function findAncestorLink(e, depth = 0) {
    if (!e || depth > 10) return null;
    if (e.tagName && e.tagName.toLowerCase() === 'a') return e.href || null;
    return findAncestorLink(e.parentElement, depth + 1);
  }
  let ancestorLink = findAncestorLink(el.parentElement);
  // Figure/figcaption context
  function isInFigureWithFigcaption(e, depth = 0) {
    if (!e || depth > 10) return false;
    if (e.tagName && e.tagName.toLowerCase() === 'figure') {
      return !!e.querySelector('figcaption');
    }
    return isInFigureWithFigcaption(e.parentElement, depth + 1);
  }
  let inFigureWithFigcaption = isInFigureWithFigcaption(el.parentElement);
  // Shadow DOM presence
  let hasShadowDom = !!el.shadowRoot;
  // Slot content
  let slots = [];
  if (el.tagName && el.tagName.toLowerCase() === 'slot') {
    slots = Array.from(el.assignedNodes ? el.assignedNodes() : []);
  }
  // Images/SVG info - Use analyzeSingleImage
  let images = [];
  // Check if analyzeSingleImage is available (from images.js)
  if (typeof analyzeSingleImage === 'function') { // Ensure analyzeSingleImage is loaded
    console.log('Using analyzeSingleImage with Shadow DOM support to get images for element:', el);
    // Use findAllElementsRecursive to find images/svg within the element (pierces shadow DOM)
    const imageElements = findAllElementsRecursive('img,svg', el);

    if (imageElements.length > 0) {
      const imagePromises = imageElements.map(img => analyzeSingleImage(img));
      try {
        const imageResults = await Promise.all(imagePromises);
        // analyzeSingleImage now returns an ARRAY of results, or an empty array []
        // imageResults will be an array of arrays, e.g., [[imgData1], [], [svgData1, bgData1]]
        // Flatten into a single array and filter out any potential null/undefined values
        images = imageResults
            .flat() // Makes it [imgData1, svgData1, bgData1]
            .filter(Boolean) // Remove any nulls/undefined just in case
            .map(imgData => {
                // Map to the structure sidepanel.js expects
                const formattedImage = {
                    id: imgData.id,
                    type: imgData.type, // e.g., 'img', 'svg', 'background-before'
                    isSvg: imgData.isSvg, // Pass through SVG flag
                    isImg: imgData.isImg, // Pass through Img flag
                    isBackgroundImage: imgData.isBackgroundImage, // Pass through background flag
                    pseudoElement: imgData.pseudoElement, // Pass through pseudo-element
                    src: imgData.previewSrc || imgData.originalUrl, // Use preview if available
                    originalUrl: imgData.originalUrl, // Keep original URL too
                    previewSrc: imgData.previewSrc, // Keep preview src
                    alt: imgData.alt, // Raw alt attribute text (null if not img)
                    title: imgData.title, // Raw title attribute text
                    svgTitleDesc: imgData.svgTitleDesc, // Combined title/desc from SVG <title>/<desc>
                    outerHTML: imgData.outerHTML, // outerHTML of the original analyzed element (img/svg/div)
                    isAriaHidden: imgData.isAriaHidden,
                    isEmptyAlt: imgData.isEmptyAlt,
                    hasAltAttribute: imgData.hasAltAttribute,
                    role: imgData.role,
                    hasUseTag: imgData.hasUseTag, // Pass through use tag info
                    useHref: imgData.useHref,
                    absoluteUseHref: imgData.absoluteUseHref,
                    figureInfo: imgData.figureInfo // Pass through figure info
                };
                 // Add svgSource only if it's an SVG and has a preview source
                 if (imgData.isSvg && imgData.previewSrc) {
                    formattedImage.svgSource = imgData.previewSrc;
                 }
                return formattedImage;
            });

      } catch (error) {
        console.error('[ContentScript] Error processing image:', error);
      }
    }
  } else if (el.querySelectorAll) {
      console.warn('analyzeSingleImage function not found. Falling back to basic inline image analysis.');
      // Fallback (original basic logic if images.js failed to load/define analyzeSingleImage)
      el.querySelectorAll('img,svg').forEach(img => {
        if (img.tagName && img.tagName.toLowerCase() === 'img') {
            images.push({ type: 'img', src: img.src, alt: img.getAttribute('alt'), title: img.getAttribute('title') });
        } else if (img.tagName && img.tagName.toLowerCase() === 'svg') {
            let svgTitleElem = img.querySelector('title');
            let svgDescElem = img.querySelector('desc');
            images.push({ type: 'svg', outerHTML: img.outerHTML, title: svgTitleElem ? svgTitleElem.textContent : null, desc: svgDescElem ? svgDescElem.textContent: null });
        }
      });
  }
  // Presentation/none role for images
  let rolePresentation = (tag === 'img') ? (el.getAttribute('role') === 'presentation' || el.getAttribute('role') === 'none') : false;
  // Outer HTML
  let outerHTML = el.outerHTML;
  return {
    tag,
    id,
    className,
    role,
    ariaHidden,
    ariaLabel,
    ariaLabelledBy,
    ariaLabelledByText,
    ariaDescribedBy,
    ariaDescribedByText,
    linkUrl,
    text,
    title, // Include title in return object
    slotContent,
    opensInNewWindow,
    ancestorLink,
    inFigureWithFigcaption,
    hasShadowDom,
    slots: slots.map(n => n.textContent ? n.textContent.trim() : ''),
    images,
    sequentialId: sequentialId, // Include the sequential ID
    isButton: isButton // Include the isButton flag (optional, but consistent)
  };
}

function gatherLinksAndButtons() {
  const all = getAllInteractiveElements();
  const filtered = all.filter(isLinkOrButton);
  const items = filtered.map(extractElementData);
  chrome.runtime.sendMessage({ action: 'gathered', items });
}

function isLinkOrButton(el) {
  if (!el || !el.tagName) return false;
  const tag = el.tagName.toLowerCase();
  const role = el.getAttribute ? el.getAttribute('role') : null;
  return tag === 'a' || tag === 'button' || role === 'link' || role === 'button';
}

// Add highlight CSS for scroll-to-element
(function() {
  const style = document.createElement('style');
  style.textContent = `.links-buttons-highlight { outline: 3px solid #4285f4 !important; background: #e3f0fd !important; transition: outline 0.3s; }`;
  document.head.appendChild(style);
})();
