// Enhanced link and button collection with comprehensive HTML capture
// Handles Shadow DOM, web components, CSS positioning, pseudo-elements, and JS handlers

// Constants for message size management
const MAX_MESSAGE_SIZE = 60 * 1024 * 1024; // 60MB Chrome limit (with safety margin)
const MAX_HTML_LENGTH = 10000; // Max length for individual HTML strings
const MAX_ELEMENTS = 100; // Max number of elements to send

// Utility function to get computed styles safely
function getComputedStyleSafe(element, pseudoElement = null) {
  try {
    return window.getComputedStyle(element, pseudoElement);
  } catch (e) {
    return {};
  }
}

// Check if node is a valid HTML element
function isValidElement(node) {
  return node && 
         node.nodeType === Node.ELEMENT_NODE && 
         typeof node.hasAttribute === 'function' &&
         node.tagName;
}

// Truncate HTML content if it's too long
function truncateHtml(html, maxLength = MAX_HTML_LENGTH) {
  if (!html || typeof html !== 'string') return html;
  
  if (html.length <= maxLength) return html;
  
  const truncated = html.substring(0, maxLength);
  const lastTagStart = truncated.lastIndexOf('<');
  const lastTagEnd = truncated.lastIndexOf('>');
  
  // Try to end at a complete tag
  if (lastTagEnd > lastTagStart) {
    return truncated.substring(0, lastTagEnd + 1) + '\n<!-- [TRUNCATED] -->';
  } else {
    return truncated + '\n<!-- [TRUNCATED] -->';
  }
}

// Calculate approximate size of an object in bytes
function getObjectSize(obj) {
  try {
    return new Blob([JSON.stringify(obj)]).size;
  } catch (e) {
    // Fallback estimation
    return JSON.stringify(obj).length * 2; // Rough estimate
  }
}

// Truncate comprehensive HTML object
function truncateComprehensiveHtml(comprehensiveHtml) {
  if (!comprehensiveHtml) return null;
  
  const truncated = {};
  for (const [key, value] of Object.entries(comprehensiveHtml)) {
    if (value && typeof value === 'string') {
      truncated[key] = truncateHtml(value);
    } else {
      truncated[key] = value;
    }
  }
  return truncated;
}

// Truncate element data to fit size constraints
function truncateElementData(element) {
  if (!element) return element;
  
  const truncated = { ...element };
  
  // Truncate basic HTML
  if (truncated.html) {
    truncated.html = truncateHtml(truncated.html);
  }
  
  // Truncate comprehensive HTML
  if (truncated.comprehensiveHtml) {
    truncated.comprehensiveHtml = truncateComprehensiveHtml(truncated.comprehensiveHtml);
  }
  
  // Truncate shadow host HTML
  if (truncated.shadowHostHtml) {
    truncated.shadowHostHtml = truncateHtml(truncated.shadowHostHtml);
  }
  
  // Truncate slot element HTML
  if (truncated.slotElement) {
    truncated.slotElement = truncateHtml(truncated.slotElement);
  }
  
  // Truncate text content if extremely long
  if (truncated.text && truncated.text.length > 1000) {
    truncated.text = truncated.text.substring(0, 1000) + '... [TRUNCATED]';
  }
  
  return truncated;
}

// Prepare data for sending with size management
function prepareDataForSending(elements) {
  if (!Array.isArray(elements)) return { elements: [], truncated: false };
  
  let processedElements = elements.slice(0, MAX_ELEMENTS);
  let truncated = elements.length > MAX_ELEMENTS;
  
  // Truncate individual elements
  processedElements = processedElements.map(truncateElementData);
  
  // Check total size and further truncate if needed
  let totalSize = getObjectSize({ elements: processedElements });
  
  if (totalSize > MAX_MESSAGE_SIZE) {
    console.warn(`Data size (${totalSize} bytes) exceeds limit, applying aggressive truncation`);
    
    // Reduce number of elements if still too large
    while (processedElements.length > 10 && totalSize > MAX_MESSAGE_SIZE) {
      processedElements = processedElements.slice(0, Math.floor(processedElements.length * 0.8));
      totalSize = getObjectSize({ elements: processedElements });
      truncated = true;
    }
    
    // If still too large, remove comprehensive HTML
    if (totalSize > MAX_MESSAGE_SIZE) {
      processedElements = processedElements.map(element => ({
        ...element,
        comprehensiveHtml: null,
        shadowHostHtml: null,
        slotElement: null,
        html: truncateHtml(element.html, 500) // Very short HTML
      }));
      truncated = true;
    }
  }
  
  return {
    elements: processedElements,
    truncated: truncated,
    originalCount: elements.length,
    processedCount: processedElements.length,
    estimatedSize: getObjectSize({ elements: processedElements })
  };
}

// Recursively search for interactive elements including Shadow DOM and web components
function findInteractiveElements(root = document) {
  const selector = 'a, button, [role="link"], [role="button"], [onclick], [href^="javascript:"]';
  let results = [];
  
  // Get elements from current root
  try {
    results = Array.from(root.querySelectorAll(selector));
  } catch (e) {
    console.warn('Error querying selector:', e);
  }
  
  // Create tree walker to traverse all nodes including shadow DOM
  const walker = document.createTreeWalker(
    root, 
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: function(node) {
        return isValidElement(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    }
  );
  
  let node = walker.currentNode;
  while (node) {
    // Double-check that node is a valid element
    if (!isValidElement(node)) {
      node = walker.nextNode();
      continue;
    }
    
    // Check for shadow DOM
    if (node.shadowRoot) {
      try {
        results = results.concat(findInteractiveElements(node.shadowRoot));
      } catch (e) {
        console.warn('Error accessing shadow root:', e);
      }
    }
    
    // Check for web components and custom elements
    if (node.tagName && node.tagName.includes('-')) {
      // This is likely a custom element/web component
      if (hasClickableProperties(node)) {
        results.push(node);
      }
    }
    
    // Check for elements with JavaScript event handlers
    if (hasJavaScriptHandlers(node)) {
      results.push(node);
    }
    
    node = walker.nextNode();
  }
  
  // Remove duplicates and filter out invalid elements
  return [...new Set(results)].filter(isValidElement);
}

// Check if element has clickable properties
function hasClickableProperties(element) {
  if (!isValidElement(element)) return false;
  
  // Check for href attribute
  if (element.hasAttribute('href')) return true;
  
  // Check for onclick attribute
  if (element.hasAttribute('onclick')) return true;
  
  // Check for JavaScript href
  const href = element.getAttribute('href');
  if (href && href.trim().toLowerCase().startsWith('javascript:')) return true;
  
  // Check for role attributes
  const role = element.getAttribute('role');
  if (role && (role === 'link' || role === 'button')) return true;
  
  // Check for event listeners (this is limited in content scripts)
  if (typeof element.onclick === 'function') return true;
  
  return false;
}

// Check for JavaScript event handlers
function hasJavaScriptHandlers(element) {
  if (!isValidElement(element)) return false;
  
  // Check for onclick attribute
  if (element.hasAttribute('onclick')) return true;
  
  // Check for JavaScript href
  const href = element.getAttribute('href');
  if (href && href.trim().toLowerCase().startsWith('javascript:')) return true;
  
  // Check for common event handler attributes
  const eventAttrs = ['onclick', 'onmousedown', 'onmouseup', 'onkeydown', 'onkeyup'];
  return eventAttrs.some(attr => element.hasAttribute(attr));
}

// Find nearest element with position relative
function findNearestRelative(element) {
  if (!isValidElement(element)) return null;
  
  let current = element.parentElement;
  while (current && current !== document.body) {
    if (!isValidElement(current)) {
      current = current.parentElement;
      continue;
    }
    
    const computed = getComputedStyleSafe(current);
    if (computed.position === 'relative' || computed.position === 'absolute' || computed.position === 'fixed') {
      return current;
    }
    current = current.parentElement;
  }
  return document.body; // Fallback to body
}

// Check if element has pseudo-elements with absolute positioning
function hasPseudoElementsWithAbsolute(element) {
  if (!isValidElement(element)) return { hasPseudo: false };
  
  try {
    const beforeStyle = getComputedStyleSafe(element, '::before');
    const afterStyle = getComputedStyleSafe(element, '::after');
    
    const beforeAbsolute = beforeStyle.position === 'absolute';
    const afterAbsolute = afterStyle.position === 'absolute';
    
    return {
      hasPseudo: beforeAbsolute || afterAbsolute,
      beforeAbsolute,
      afterAbsolute,
      beforeContent: beforeStyle.content,
      afterContent: afterStyle.content
    };
  } catch (e) {
    return { hasPseudo: false };
  }
}

// Get comprehensive HTML including all related elements
function getComprehensiveHtml(element) {
  if (!isValidElement(element)) return null;
  
  const result = {
    baseHtml: element.outerHTML,
    shadowDomHtml: null,
    slotHtml: null,
    webComponentHtml: null,
    absolutePositionHtml: null,
    pseudoElementHtml: null,
    jsHandlerHtml: null,
    fullContextHtml: null
  };
  
  // Handle Shadow DOM
  if (element.shadowRoot) {
    try {
      result.shadowDomHtml = element.shadowRoot.innerHTML;
    } catch (e) {
      console.warn('Error accessing shadow DOM:', e);
    }
  }
  
  // Handle slots in Shadow DOM
  if (element.assignedSlot) {
    result.slotHtml = element.assignedSlot.outerHTML;
  }
  
  // Handle web components
  if (element.tagName && element.tagName.includes('-')) {
    result.webComponentHtml = element.outerHTML;
  }
  
  // Handle absolute positioning
  const computed = getComputedStyleSafe(element);
  if (computed.position === 'absolute') {
    const relativeParent = findNearestRelative(element);
    if (relativeParent && isValidElement(relativeParent)) {
      result.absolutePositionHtml = relativeParent.outerHTML;
    }
  }
  
  // Handle pseudo-elements
  const pseudoInfo = hasPseudoElementsWithAbsolute(element);
  if (pseudoInfo.hasPseudo) {
    const relativeParent = findNearestRelative(element);
    if (relativeParent && isValidElement(relativeParent)) {
      result.pseudoElementHtml = relativeParent.outerHTML;
    }
  }
  
  // Handle JavaScript handlers
  if (hasJavaScriptHandlers(element)) {
    // Get the element and its immediate context
    const parent = element.parentElement;
    if (parent && isValidElement(parent)) {
      result.jsHandlerHtml = parent.outerHTML;
    } else {
      result.jsHandlerHtml = element.outerHTML;
    }
  }
  
  // Get full context HTML (parent container)
  try {
    const contextParent = element.closest('section, article, div, main, aside, nav') || element.parentElement;
    if (contextParent && contextParent !== document.body && isValidElement(contextParent)) {
      result.fullContextHtml = contextParent.outerHTML;
    }
  } catch (e) {
    console.warn('Error getting context parent:', e);
  }
  
  return result;
}

// Enhanced element analysis
function analyzeElement(element, index) {
  if (!isValidElement(element)) {
    console.warn('Invalid element passed to analyzeElement:', element);
    return null;
  }
  
  const computed = getComputedStyleSafe(element);
  const pseudoInfo = hasPseudoElementsWithAbsolute(element);
  const comprehensiveHtml = getComprehensiveHtml(element);
  
  // Check for Shadow DOM context
  const rootNode = element.getRootNode();
  const inShadowDom = rootNode instanceof ShadowRoot;
  const shadowHost = inShadowDom ? rootNode.host : null;
  
  // Check for slot context
  const inSlot = !!(element.assignedSlot || element.closest('slot'));
  
  // Check for web component context
  let inWebComponent = false;
  try {
    const closestElement = element.closest('*');
    inWebComponent = !!(closestElement && closestElement.tagName && closestElement.tagName.includes('-'));
  } catch (e) {
    // Fallback check
    let parent = element.parentElement;
    while (parent && parent !== document.body) {
      if (isValidElement(parent) && parent.tagName && parent.tagName.includes('-')) {
        inWebComponent = true;
        break;
      }
      parent = parent.parentElement;
    }
  }
  
  // Analyze positioning
  const hasAbsolutePosition = computed.position === 'absolute';
  const hasFixedPosition = computed.position === 'fixed';
  const hasRelativePosition = computed.position === 'relative';
  
  // Analyze JavaScript handlers
  const hasJsHandlers = hasJavaScriptHandlers(element);
  const href = element.getAttribute('href');
  const hasJsHref = href && href.trim().toLowerCase().startsWith('javascript:');
  
  // Get text content safely
  let textContent = '';
  try {
    textContent = (element.innerText || element.textContent || '').trim();
  } catch (e) {
    textContent = '';
  }
  
  return {
    id: index,
    tag: element.tagName.toLowerCase(),
    text: textContent,
    href: href,
    
    // Basic HTML
    html: element.outerHTML,
    
    // Comprehensive HTML collection
    comprehensiveHtml: comprehensiveHtml,
    
    // Shadow DOM information
    inShadowDom: inShadowDom,
    shadowHost: shadowHost && isValidElement(shadowHost) ? shadowHost.tagName.toLowerCase() : null,
    shadowHostHtml: shadowHost && isValidElement(shadowHost) ? shadowHost.outerHTML : null,
    
    // Slot information
    inSlot: inSlot,
    slotElement: element.assignedSlot && isValidElement(element.assignedSlot) ? element.assignedSlot.outerHTML : null,
    
    // Web component information
    inWebComponent: inWebComponent,
    isWebComponent: element.tagName.includes('-'),
    
    // CSS positioning information
    hasAbsolutePosition: hasAbsolutePosition,
    hasFixedPosition: hasFixedPosition,
    hasRelativePosition: hasRelativePosition,
    positioningContext: hasAbsolutePosition || hasFixedPosition ? findNearestRelative(element) : null,
    
    // Pseudo-element information
    hasPseudoElements: pseudoInfo.hasPseudo,
    pseudoElementInfo: pseudoInfo,
    
    // JavaScript handler information
    hasJsHandlers: hasJsHandlers,
    hasJsHref: hasJsHref,
    
    // CSS information
    computedStyles: {
      position: computed.position,
      display: computed.display,
      visibility: computed.visibility,
      zIndex: computed.zIndex
    }
  };
}

// Main collection function
function collectElements() {
  try {
    const elements = findInteractiveElements();
    console.log(`Found ${elements.length} interactive elements`);
    
    return elements.map((element, index) => {
      try {
        // Additional safety check
        if (!isValidElement(element)) {
          console.warn('Skipping invalid element at index', index, element);
          return null;
        }
        
        return analyzeElement(element, index);
      } catch (e) {
        console.warn('Error analyzing element:', e, element);
        return {
          id: index,
          tag: element && element.tagName ? element.tagName.toLowerCase() : 'unknown',
          text: 'Error analyzing element',
          error: e.message
        };
      }
    }).filter(Boolean);
  } catch (e) {
    console.error('Error collecting elements:', e);
    return [];
  }
}

// Message listener with size management
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'collect') {
    try {
      const elements = collectElements();
      const preparedData = prepareDataForSending(elements);
      
      console.log(`Sending ${preparedData.processedCount}/${preparedData.originalCount} elements (${preparedData.estimatedSize} bytes)`);
      
      if (preparedData.truncated) {
        console.warn('Data was truncated due to size constraints');
      }
      
      sendResponse(preparedData);
    } catch (e) {
      console.error('Error in message handler:', e);
      sendResponse({ 
        elements: [], 
        error: e.message,
        truncated: false,
        originalCount: 0,
        processedCount: 0
      });
    }
  }
});

// Initialize and handle dynamic content
document.addEventListener('DOMContentLoaded', () => {
  console.log('Content script loaded');
});

// Handle dynamic content changes
const observer = new MutationObserver((mutations) => {
  // Debounce the collection to avoid excessive calls
  clearTimeout(window.linkCollectionTimeout);
  window.linkCollectionTimeout = setTimeout(() => {
    // Notify sidepanel of potential changes
    chrome.runtime.sendMessage({ action: 'content-changed' });
  }, 1000);
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['href', 'onclick', 'role']
});
