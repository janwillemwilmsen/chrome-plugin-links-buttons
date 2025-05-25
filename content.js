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

// Get the most relevant HTML containing the interactive element
function getRelevantHtml(element) {
  if (!isValidElement(element)) return null;
  
  // Simplified priority order for determining the most relevant HTML:
  // 1. If element is in Shadow DOM, get shadow DOM content (most specific and valuable)
  // 2. If element has JavaScript handlers, get parent context (usually most relevant)
  // 3. If element has absolute positioning, get positioning context
  // 4. If element has pseudo-elements with absolute positioning, get pseudo context
  // 5. Fallback to element's own HTML
  
  const computed = getComputedStyleSafe(element);
  const pseudoInfo = hasPseudoElementsWithAbsolute(element);
  
  // 1. Shadow DOM content - most specific and valuable
  const rootNode = element.getRootNode();
  if (rootNode instanceof ShadowRoot) {
    return {
      html: rootNode.innerHTML,
      reason: 'Shadow DOM Content',
      description: 'Content from Shadow DOM containing the element'
    };
  }
  
  // 2. JavaScript handlers - often the most relevant context for functionality
  if (hasJavaScriptHandlers(element)) {
    const parent = element.parentElement;
    if (parent && isValidElement(parent)) {
      // Get a reasonable parent container, not too large
      const contextParent = element.closest('section, article, div[class], div[id], main, aside, nav, li, td, th') || parent;
      if (contextParent && contextParent !== document.body && isValidElement(contextParent)) {
        return {
          html: contextParent.outerHTML,
          reason: 'JavaScript Handler Context',
          description: 'Parent container of element with JavaScript event handlers'
        };
      }
      return {
        html: parent.outerHTML,
        reason: 'JavaScript Handler Parent',
        description: 'Direct parent of element with JavaScript handlers'
      };
    }
  }
  
  // 3. Absolute positioning context - important for layout understanding
  if (computed.position === 'absolute' || computed.position === 'fixed') {
    const relativeParent = findNearestRelative(element);
    if (relativeParent && isValidElement(relativeParent) && relativeParent !== document.body) {
      return {
        html: relativeParent.outerHTML,
        reason: 'Positioning Context',
        description: `Container for ${computed.position} positioned element`
      };
    }
  }
  
  // 4. Pseudo-element context - relevant when pseudo-elements affect clickability
  if (pseudoInfo.hasPseudo) {
    const relativeParent = findNearestRelative(element);
    if (relativeParent && isValidElement(relativeParent) && relativeParent !== document.body) {
      return {
        html: relativeParent.outerHTML,
        reason: 'Pseudo-Element Context',
        description: 'Container with pseudo-elements that may affect interaction'
      };
    }
  }
  
  // 5. Fallback - element's own HTML
  return {
    html: element.outerHTML,
    reason: 'Element HTML',
    description: 'The interactive element itself'
  };
}

// Truncate element data to fit size constraints (simplified)
function truncateElementData(element) {
  if (!element) return element;
  
  const truncated = { ...element };
  
  // Truncate the single relevant HTML
  if (truncated.relevantHtml && truncated.relevantHtml.html) {
    truncated.relevantHtml.html = truncateHtml(truncated.relevantHtml.html);
  }
  
  // Truncate text content if extremely long
  if (truncated.text && truncated.text.length > 1000) {
    truncated.text = truncated.text.substring(0, 1000) + '... [TRUNCATED]';
  }
  
  return truncated;
}

// Enhanced element analysis (simplified)
function analyzeElement(element, index) {
  if (!isValidElement(element)) {
    console.warn('Invalid element passed to analyzeElement:', element);
    return null;
  }
  
  const computed = getComputedStyleSafe(element);
  const pseudoInfo = hasPseudoElementsWithAbsolute(element);
  const relevantHtml = getRelevantHtml(element);
  
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
    
    // Single most relevant HTML block
    relevantHtml: relevantHtml,
    
    // Analysis flags for UI display
    inShadowDom: inShadowDom,
    shadowHost: shadowHost && isValidElement(shadowHost) ? shadowHost.tagName.toLowerCase() : null,
    inSlot: inSlot,
    inWebComponent: inWebComponent,
    isWebComponent: element.tagName.includes('-'),
    hasAbsolutePosition: hasAbsolutePosition,
    hasFixedPosition: hasFixedPosition,
    hasRelativePosition: hasRelativePosition,
    hasPseudoElements: pseudoInfo.hasPseudo,
    pseudoElementInfo: pseudoInfo,
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

// Main collection function with deduplication - MOVED TO MESSAGE HANDLER

// Deduplicate elements by href, prioritizing more valuable content
function deduplicateElements(elements) {
  const hrefMap = new Map();
  const nonHrefElements = [];
  
  elements.forEach(element => {
    const href = element.href;
    
    if (!href || href === '#' || href === 'javascript:void(0)' || href.startsWith('javascript:')) {
      // For non-href elements (buttons, JS handlers), use a different approach
      const key = generateNonHrefKey(element);
      if (!hrefMap.has(key)) {
        hrefMap.set(key, element);
      } else {
        // Keep the one with better HTML source
        const existing = hrefMap.get(key);
        if (shouldReplace(existing, element)) {
          hrefMap.set(key, element);
        }
      }
    } else {
      // For href elements, deduplicate by href
      if (!hrefMap.has(href)) {
        hrefMap.set(href, element);
      } else {
        // Keep the one with better HTML source
        const existing = hrefMap.get(href);
        if (shouldReplace(existing, element)) {
          hrefMap.set(href, element);
        }
      }
    }
  });
  
  // Convert map back to array and reassign IDs
  return Array.from(hrefMap.values()).map((element, index) => ({
    ...element,
    id: index,
    originalId: element.id // Keep track of original ID
  }));
}

// Generate a key for non-href elements (buttons, JS handlers)
function generateNonHrefKey(element) {
  // Use a combination of tag, text, and position to identify similar elements
  const tag = element.tag || 'unknown';
  const text = (element.text || '').trim().substring(0, 50); // First 50 chars
  const hasJs = element.hasJsHandlers || element.hasJsHref;
  
  // For elements in Shadow DOM, include shadow host info
  if (element.inShadowDom && element.shadowHost) {
    return `${tag}:${text}:${element.shadowHost}:${hasJs}`;
  }
  
  return `${tag}:${text}:${hasJs}`;
}

// Determine if we should replace the existing element with the new one
function shouldReplace(existing, newElement) {
  // Priority order (higher number = higher priority):
  // 1. Shadow DOM Content (highest priority)
  // 2. JavaScript Handler Context
  // 3. Positioning Context  
  // 4. Pseudo-Element Context
  // 5. Element HTML (lowest priority)
  
  const getPriority = (element) => {
    if (!element.relevantHtml) return 0;
    
    switch (element.relevantHtml.reason) {
      case 'Shadow DOM Content': return 5;
      case 'JavaScript Handler Context': return 4;
      case 'JavaScript Handler Parent': return 3;
      case 'Positioning Context': return 2;
      case 'Pseudo-Element Context': return 1;
      case 'Element HTML': return 0;
      default: return 0;
    }
  };
  
  const existingPriority = getPriority(existing);
  const newPriority = getPriority(newElement);
  
  // Replace if new element has higher priority
  if (newPriority > existingPriority) {
    return true;
  }
  
  // If same priority, prefer the one with more text content
  if (newPriority === existingPriority) {
    const existingTextLength = (existing.text || '').length;
    const newTextLength = (newElement.text || '').length;
    return newTextLength > existingTextLength;
  }
  
  return false;
}

// Message listener with size management
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'collect') {
    try {
      // First collect all elements (before deduplication)
      const allElements = findInteractiveElements();
      console.log(`Found ${allElements.length} interactive elements`);
      
      // Analyze all elements
      const analyzedElements = allElements.map((element, index) => {
        try {
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
      
      // Deduplicate elements
      const deduplicatedElements = deduplicateElements(analyzedElements);
      const duplicatesRemoved = analyzedElements.length - deduplicatedElements.length;
      
      console.log(`After deduplication: ${deduplicatedElements.length} unique elements (removed ${duplicatesRemoved} duplicates)`);
      
      // Prepare data for sending with size management
      const preparedData = prepareDataForSending(deduplicatedElements);
      
      // Add deduplication information
      if (duplicatesRemoved > 0) {
        preparedData.deduplicationInfo = {
          originalCount: analyzedElements.length,
          uniqueCount: deduplicatedElements.length,
          duplicatesRemoved: duplicatesRemoved
        };
      }
      
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

// Prepare data for sending with size management (simplified)
function prepareDataForSending(elements) {
  if (!Array.isArray(elements)) return { elements: [], truncated: false };
  
  const originalElementCount = elements.length;
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
    
    // If still too large, remove relevant HTML
    if (totalSize > MAX_MESSAGE_SIZE) {
      processedElements = processedElements.map(element => ({
        ...element,
        relevantHtml: null
      }));
      truncated = true;
    }
  }
  
  return {
    elements: processedElements,
    truncated: truncated,
    originalCount: originalElementCount,
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
