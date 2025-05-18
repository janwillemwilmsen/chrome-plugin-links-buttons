const DEBUG = false;

// Utility: Recursively get all elements, including shadow roots
function getAllElements(root = document) {
        if (DEBUG) console.log("getAllElements called with root:", root);
  let elements = [];
  const treeWalker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT,
    null,
    false
  );
  let node = treeWalker.currentNode;
  while(node) {
    if (node && node.nodeType === Node.ELEMENT_NODE) {
      elements.push(node);
      // Traverse shadow root if present
      if (node.shadowRoot) {
        elements = elements.concat(getAllElements(node.shadowRoot));
      }
    }
    node = treeWalker.nextNode();
  }
  return elements;
}

 

function isLinkOrButton(el) {
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (['a', 'button'].includes(tag)) return true;
  const role = el.getAttribute('role');
  if (role && ['link', 'button'].includes(role)) return true;
  return false;
}

function unique(arr) {
  return Array.from(new Set(arr));
}



async function gatherLinksAndButtons() {
        if (DEBUG) console.log("gatherLinksAndButtons called");
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) {
    renderResults([]);
    return;
  }
  chrome.tabs.sendMessage(tab.id, { action: 'get-links-buttons' }, (response) => {
    if (chrome.runtime.lastError || !response || !response.success) {
      renderResults([]);
      return;
    }
	if (!response || !response.success) {
		console.warn("Failed to get links/buttons from content script or response unsuccessful.");
		renderResults([]); // Render empty if unsuccessful
		return;
	  }
    renderResults(response.items || []);
  });
}

document.addEventListener('DOMContentLoaded', async function() {
	// Add event listener for reload button
	const reloadBtn = document.getElementById('reload-btn');
  
	if (reloadBtn) {
	  reloadBtn.addEventListener('click', () => {
		// Show loading indicator immediately
		const results = document.getElementById('results');
		if (results) {
		  results.innerHTML = '<em>Reloading page and fetching data...</em>';
		}
  
		// Query the active tab
		if (chrome && chrome.tabs) {
		  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
			if (tabs[0] && tabs[0].id) {
			  const tabIdToReload = tabs[0].id;
  
			  // --- Define the listener FIRST ---
			  const listener = (updatedTabId, changeInfo, tab) => {
				// Check if it's the tab we reloaded and if it's completely loaded
				if (updatedTabId === tabIdToReload && changeInfo.status === 'complete') {
				  // --- Tab is loaded, NOW gather data ---
                                  if (DEBUG) console.log(`Tab ${tabIdToReload} finished reloading. Fetching links/buttons.`);
				  gatherLinksAndButtons(); // Fetch fresh data
				  renderFilterPanel();    // Re-render filters if needed
  
				  // --- IMPORTANT: Remove the listener ---
				  chrome.tabs.onUpdated.removeListener(listener);
				}
			  };
  
			  // --- Add the listener BEFORE reloading ---
			  chrome.tabs.onUpdated.addListener(listener);
  
			  // --- Initiate the reload ---
			  chrome.tabs.reload(tabIdToReload, { bypassCache: true }, () => {
				if (chrome.runtime.lastError) {
				   console.error("Error initiating tab reload:", chrome.runtime.lastError.message);
				   // Clean up listener if reload fails to start
				   chrome.tabs.onUpdated.removeListener(listener);
				   if (results) {
					  results.innerHTML = '<em>Error starting page reload.</em>';
				   }
				} else {
                                   if (DEBUG) console.log(`Initiated reload for tab ${tabIdToReload}. Waiting for completion...`);
				   // No location.reload() here! We wait for the listener.
				}
			  });
  
			} else {
			  // If no active tab found, maybe just refresh panel state?
                          if (DEBUG) console.log("No active tab found to reload.");
			   if (results) {
				 results.innerHTML = '<em>No active tab found.</em>';
			   }
			  // Or potentially call gatherLinksAndButtons directly if appropriate?
			  // gatherLinksAndButtons();
			  // renderFilterPanel();
			}
		  });
		} else {
                  if (DEBUG) console.log("chrome.tabs API not available.");
		   if (results) {
			 results.innerHTML = '<em>Browser API error.</em>';
		   }
		}
	  });
	}
  
	// Initial load when the panel opens
	const results = document.getElementById('results');
	if (results) {
	  results.innerHTML = '<em>Loading...</em>';
	}
	await gatherLinksAndButtons();
	renderFilterPanel();
  });
  

function renderFilterPanel() {
  const panel = document.getElementById('filter-panel');
  if (!panel) return;
  panel.innerHTML = `
    <div style="margin-bottom:1em;">
      <fieldset><legend>Show/hide only buttons or links</legend>
        <label><input type="radio" name="isButtonFilter" value="either" checked> Either</label>
        <label><input type="radio" name="isButtonFilter" value="true"> Buttons only</label>
        <label><input type="radio" name="isButtonFilter" value="false"> Links only</label>
      </fieldset>
      <fieldset><legend>Show/hide items with link text</legend>
        <label><input type="radio" name="haslinkTxtRFilter" value="either" checked> Either</label>
        <label><input type="radio" name="haslinkTxtRFilter" value="true"> With link text</label>
        <label><input type="radio" name="haslinkTxtRFilter" value="false"> Without text</label>
      </fieldset>
      <fieldset><legend>Show/hide items with image</legend>
        <label><input type="radio" name="imageInLinkFilter" value="either" checked> Either</label>
        <label><input type="radio" name="imageInLinkFilter" value="true"> With image</label>
        <label><input type="radio" name="imageInLinkFilter" value="false"> Without image</label>
      </fieldset>
      <fieldset><legend>Show/hide items with aria-* attribute</legend>
        <label><input type="radio" name="ariaElementFilter" value="either" checked> Either</label>
        <label><input type="radio" name="ariaElementFilter" value="true"> With aria-* attribute</label>
        <label><input type="radio" name="ariaElementFilter" value="false"> Without aria-* attribute</label>
      </fieldset>
      <fieldset><legend>Show/hide items with title attribute</legend>
        <label><input type="radio" name="hastitleAttributeFilter" value="either" checked> Either</label>
        <label><input type="radio" name="hastitleAttributeFilter" value="true"> With title</label>
        <label><input type="radio" name="hastitleAttributeFilter" value="false"> Without title</label>
      </fieldset>
      <fieldset><legend>Show/hide items with tabindex</legend>
        <label><input type="radio" name="hasTabindexFilter" value="either" checked> Either</label>
        <label><input type="radio" name="hasTabindexFilter" value="true"> With tabindex</label>
        <label><input type="radio" name="hasTabindexFilter" value="false"> Without tabindex</label>
      </fieldset>
      <fieldset><legend>Show/hide items that open in new window</legend>
        <label><input type="radio" name="opensInNewWindowFilter" value="either" checked> Either</label>
        <label><input type="radio" name="opensInNewWindowFilter" value="true"> Opens in new window</label>
        <label><input type="radio" name="opensInNewWindowFilter" value="false"> Does not open in new window</label>
      </fieldset>
      <button id="resetFiltersBtn" style="margin-top:0.5em;">Reset Filters</button>
    </div>
  `;
  panel.querySelectorAll('input[type=radio]').forEach(input => {
    input.addEventListener('change', filterFuncLinks);
  });
  document.getElementById('resetFiltersBtn').addEventListener('click', function() {
    panel.querySelectorAll('input[type=radio][value=either]').forEach(r => r.checked = true);
    filterFuncLinks();
  });
}

function renderResults(items) {
        if (DEBUG) console.log("renderResults called with items:");
  const results = document.getElementById('results');
  if (!items.length) {
    results.innerHTML = '<em>No links or buttons found.</em>';
    return;
  }
  let html = '<ul id="results-list" style="padding-left:0;list-style:none;">';
  let imageId = 1;
  items.forEach((item, idx) => {
    // Compute filter fields
    const isButton = !!item.isButton;
    const haslinkTxtR = !!(item.text && item.text.trim());
    const imageInLink = item.images && item.images.length > 0;
    const ariaElement = !!(item.ariaLabel || item.ariaLabelledBy || item.ariaDescribedBy);
    const hastitleAttribute = !!item.title;
    const hasTabindex = typeof item.tabindex !== 'undefined' && item.tabindex !== null;
    const opensInNewWindow = !!item.opensInNewWindow;
    // Assign separate sequential IDs for links and buttons
    const idLabel = isButton ? 
      `<span class="meta">Button [#${item.sequentialId}]</span>` : 
      `<span class="meta">Link [#${item.sequentialId}]</span>`;
    html += `
    <li class="item" data-isbutton="${isButton}" data-haslinktxtr="${haslinkTxtR}" data-imageinlink="${imageInLink}" data-ariaelement="${ariaElement}" data-hastitleattribute="${hastitleAttribute}" data-hastabindex="${hasTabindex}" data-opensinnewwindow="${opensInNewWindow}\">
	\n      ${idLabel}
    <!----<pre>{JSON.stringify(item, null, 2)}</pre>
      <span class="type">[${item.tag}]</span>-->
      <span class="text">${item.text || '(no text)'}</span><br>
      ${item.linkUrl ? `<span class="url">${item.linkUrl}</span><br>` : ''}
      ${item.id ? `<span class="meta">ID: <b>${item.id}</b></span><br>` : ''}
      ${typeof item.tabindex === 'number' && !isNaN(item.tabindex) ? `<span class="meta">Tabindex: <b>${item.tabindex}</b></span><br>` : ''}
      ${item.className ? `<!--span class="meta">Class: <b>${item.className}</b></span><br--->` : ''}
      ${item.role ? `<span class="meta">Role: <b>${item.role}</b></span><br>` : ''}
      ${item.title ? `<span class="meta">Title: <b>${item.title}</b></span><br>` : ''}
      ${item.ariaHidden ? `<span class="meta">aria-hidden: <b>${item.ariaHidden}</b></span><br>` : ''}
      ${item.ariaLabel ? `<span class="meta">aria-label: <b>${item.ariaLabel}</b></span><br>` : ''}
      ${item.ariaLabelledBy ? `<span class="meta">aria-labelledby: <b>${item.ariaLabelledBy}</b> <em>${item.ariaLabelledByText ? '(' + item.ariaLabelledByText + ')' : ''}</em></span><br>` : ''}
      ${item.ariaDescribedBy ? `<span class="meta">aria-describedby: <b>${item.ariaDescribedBy}</b> <em>${item.ariaDescribedByText ? '(' + item.ariaDescribedByText + ')' : ''}</em></span><br>` : ''}
      ${item.ancestorLink ? `<span class="meta">Ancestor Link: <a href="${item.ancestorLink}" target="_blank">${item.ancestorLink}</a></span><br>` : ''}
      ${item.inFigureWithFigcaption ? `<span class="meta">In Figure with Figcaption</span><br>` : ''}
      ${item.hasShadowDom ? `<span class=\"meta\">Has Shadow DOM</span><br>` : ''}
      ${item.slotContent ? `<span class=\"meta\">Slot Content: <b>${item.slotContent}</b></span><br>` : ''}
      ${item.opensInNewWindow ? `<span class="meta">Opens in New Window: <b>${item.opensInNewWindow ? 'Yes' : 'No'}</b></span><br>` : ''}
      ${item.images && item.images.length ? `<span class="meta"><ul class="image-details-list" style="padding-top:0px;padding-left: 16px;">${item.images.map(img => {
        img._imgId = imageId++; // Assign a temporary ID 

        const altStatus = renderAltStatus(img); // Get { text: '...', class: '...' }
        let detailsHtml = '';

        // Common details
        detailsHtml += img.role ? `<span class="detail-label">Role:</span> <span class="detail-value">${img.role}</span><br>` : '';
        detailsHtml += img.title ? `<span class="detail-label">Title:</span> <span class="detail-value">${truncateString(img.title, 50)}</span><br>` : '';
        detailsHtml += img.isAriaHidden ? `<span class="detail-label">Aria Hidden:</span> <span class="detail-value">true</span><br>` : '';

        // Type-specific details
        if (img.isImg) {
            detailsHtml += `<span class="detail-label">Src:</span> <span class="detail-value src" title="${img.originalUrl || ''}">${truncateString(img.previewSrc || img.originalUrl, 60)}</span><br>`;
            detailsHtml += `<span class="detail-label">Alt:</span> <span class="detail-value ${altStatus.class}">${altStatus.text}</span><br>`;
            detailsHtml += img.ariaLabel ? `<span class="detail-label">ARIA Label:</span> <span class="detail-value">${truncateString(img.ariaLabel, 50)}</span><br>` : '';
            detailsHtml += img.ariaLabelledBy ? `<span class="detail-label">ARIA Labelled By:</span> <span class="detail-value">${truncateString(img.ariaLabelledBy, 50)}${img.labelledByText ? ' (' + truncateString(img.labelledByText, 50) + ')' : ''}</span><br>` : '';
            detailsHtml += img.ariaDescribedBy ? `<span class="detail-label">ARIA Described By:</span> <span class="detail-value">${truncateString(img.ariaDescribedBy, 50)}${img.describedByText ? ' (' + truncateString(img.describedByText, 50) + ')' : ''}</span><br>` : '';
// Show describedByText even if ariaDescribedBy is not set, but describedByText is present
if (!img.ariaDescribedBy && img.describedByText) {
    detailsHtml += `<span class="detail-label">ARIA Described By Text:</span> <span class="detail-value">${truncateString(img.describedByText, 50)}</span><br>`;
}



if (!img.ariaLabelledBy && img.labelledByText) {
    detailsHtml += `<span class="detail-label">ARIA Labelled By Text:</span> <span class="detail-value">${truncateString(img.labelledByText, 50)}</span><br>`;
}

        } else if (img.isSvg) {
            detailsHtml += img.svgTitleDesc ? `<span class="detail-label">SVG &lt;title&gt;/&lt;desc&gt;:</span> <span class="detail-value">${truncateString(img.svgTitleDesc, 50)}</span><br>` : '';
            detailsHtml += img.ariaLabel ? `<span class="detail-label">ARIA Label:</span> <span class="detail-value">${truncateString(img.ariaLabel, 50)}</span><br>` : '';
            detailsHtml += img.ariaLabelledBy ? `<span class="detail-label">ARIA Labelled By:</span> <span class="detail-value">${truncateString(img.ariaLabelledBy, 50)}${img.labelledByText ? ' (' + truncateString(img.labelledByText, 50) + ')' : ''}</span><br>` : '';
            detailsHtml += img.ariaDescribedBy ? `<span class="detail-label">ARIA Described By:</span> <span class="detail-value">${truncateString(img.ariaDescribedBy, 50)}${img.describedByText ? ' (' + truncateString(img.describedByText, 50) + ')' : ''}</span><br>` : '';
            if (img.hasUseTag) {
                detailsHtml += `<span class="detail-label">Use Href:</span> 
                               <span class="detail-value src" title="${img.absoluteUseHref || img.useHref}">
                               ${truncateString(img.useHref || img.absoluteUseHref, 40)}
                               </span><br>`;
            }
            // You might want a specific 'status' for SVGs based on accessible name presence here
            detailsHtml += `<span class="detail-label">Accessible Name Status:</span> <span class="detail-value">${altStatus.text}</span><br>`; // Reusing altStatus logic for SVG name check
        } else if (img.isBackgroundImage) {
            detailsHtml += `<span class="detail-label">Source URL:</span> <span class="detail-value src" title="${img.originalUrl || ''}">${truncateString(img.originalUrl, 60)}</span><br>`;
            detailsHtml += `<span class="detail-label">Applied to:</span> <span class="detail-value">${img.pseudoElement || 'Element'}</span><br>`;
        }
        
        // Contextual details
        if (img.figureInfo?.inFigureElement) {
             detailsHtml += `<span class="detail-label">In Figure:</span> <span class="detail-value">Yes ${img.figureInfo.hasFigcaption ? '(Caption: ' + truncateString(img.figureInfo.figcaptionText, 30) + ')' : '(No Caption)'}</span><br>`;
        }

        // Note: We still use the simple preview image from before.
        // The complex thumbnail generation from renderFilteredImages is not included here.
		// 				Type: <b>${img.type}${img.isBackgroundImage ? ` (${img.pseudoElement || 'bg'})` : ''}</b>

        return `<li class="image-detail-item ${altStatus.class}"> 
		<div class="image-thumb">
		<img src="${img.previewSrc}" alt="Preview" class="image-thumb-preview">
		</div>
		<div class="image-details">
		<!---b>ID: {img._imgId}</b---> 
                ${detailsHtml}
            </div>
        </li>`;
      }).join('')}</ul></span>` : ''}
      <br>
      <button class="scroll-btn" data-idx="${idx}">Scroll To</button>
      <button class="html-btn" data-idx="${idx}">Show HTML</button>
      <div class="popover" style="display:none;position:absolute;z-index:9999;background:#fff;border:1px solid #ccc;padding:0.5em;max-width:400px;max-height:300px;overflow:auto;"></div>
    </li>`;

	updateSummaryCounts(items);

  });
  html += '</ul>';
  results.innerHTML = html;
  // Add scroll/html button logic
  document.querySelectorAll('.scroll-btn').forEach(btn => {
    btn.onclick = async (e) => {
      const idx = parseInt(btn.getAttribute('data-idx'));
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      chrome.tabs.sendMessage(tab.id, { action: 'scroll-to-element', index: idx });
    };
  });
  document.querySelectorAll('.html-btn').forEach(btn => {
    btn.onclick = async (e) => {
      const idx = parseInt(btn.getAttribute('data-idx'));
      const div = btn.closest('li').querySelector('.popover');
      if (div.style.display === 'block') {
        div.style.display = 'none';
        return;
      }
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      chrome.tabs.sendMessage(tab.id, { action: 'get-element-html', index: idx }, (response) => {
        if (response && response.html) {
          div.innerText = response.html;
          div.style.display = 'block';
        } else {
          div.innerText = 'Unable to fetch HTML.';
          div.style.display = 'block';
        }
      });
    };
  });
  filterFuncLinks();

}


// filepath: c:\www\PLUGIN\links-buttons\sidepanel.js
function updateSummaryCounts(items) {
    const totalLinksEl = document.getElementById('total-links-count');
    const totalButtonsEl = document.getElementById('total-buttons-count');
    const totalImagesEl = document.getElementById('total-images-count');
    const totalSvgsEl = document.getElementById('total-svgs-count');

    let linkCount = 0;
    let buttonCount = 0;
    let imageCount = 0;
    let svgCount = 0;

    if (items && items.length) {
        items.forEach(item => {
            // Count Links and Buttons
            if (item.isButton) {
                buttonCount++;
            } else {
                linkCount++;
            }
            // Count Images and SVGs within the item
            if (item.images && item.images.length) {
                item.images.forEach(img => {
                    if (img.isImg) {
                        imageCount++;
                    } else if (img.isSvg) {
                        svgCount++;
                    }
                });
            }
        });
    }

    // Update the summary counts in the DOM
    if (totalLinksEl) totalLinksEl.textContent = linkCount;
    if (totalButtonsEl) totalButtonsEl.textContent = buttonCount;
    if (totalImagesEl) totalImagesEl.textContent = imageCount;
    if (totalSvgsEl) totalSvgsEl.textContent = svgCount;
}

// Helper function to truncate strings
function truncateString(str, len) {
    if (!str) return '-';
    if (str.length <= len) return str;
    return str.substring(0, len) + '...';
}

// Helper function to render alt status based on attributes.
// Returns an object { text: string, class: string } 
function renderAltStatus(img) {
    // Specific logic for IMG tags
    if (img.isImg) {
        if (!img.hasAltAttribute) {
            return { text: 'Missing alt attribute', class: 'image-status-error' };
        } else if (img.isEmptyAlt) {
            return { text: 'Empty (<code>alt=""</code>)', class: 'image-status-warning' };
        } else {
            return { text: `"${truncateString(img.alt, 50)}"`, class: 'image-status-info' };
        }
    }
    // Logic for SVGs (checking effective accessible name)
    else if (img.isSvg) {
         // Reconstruct an effective accessible name check (similar to old altStatus logic)
         const isDecorative = (img.role === 'presentation' || img.role === 'none' || img.isAriaHidden);
         const effectiveLabel = img.ariaLabel || img.svgTitleDesc || img.title; // Simplified check
         
         if (effectiveLabel) {
             return { text: `Has Acc Name`, class: 'image-status-info' }; // Indicate name found
         } else if (isDecorative) {
             return { text: 'Decorative SVG', class: 'image-status-info' }; // Decorative is often acceptable
         } else {
             return { text: 'Missing Acc Name', class: 'image-status-error' }; // Missing name is an issue
         }
    }
     // Default/Background Image status
    return { text: 'N/A', class: 'image-status-info' }; 
}

function filterFuncLinks() {
  const list = document.getElementById('results-list');
  if (!list) return;
  const filters = {
    isButton: document.querySelector('input[name="isButtonFilter"]:checked').value,
    haslinkTxtR: document.querySelector('input[name="haslinkTxtRFilter"]:checked').value,
    imageInLink: document.querySelector('input[name="imageInLinkFilter"]:checked').value,
    ariaElement: document.querySelector('input[name="ariaElementFilter"]:checked').value,
    hastitleAttribute: document.querySelector('input[name="hastitleAttributeFilter"]:checked').value,
    hasTabindex: document.querySelector('input[name="hasTabindexFilter"]:checked').value,
    opensInNewWindow: document.querySelector('input[name="opensInNewWindowFilter"]:checked').value
  };
  // --- MODIFIED: Target only li elements with the 'item' class ---
  list.querySelectorAll('li.item').forEach(li => {
  // --- END MODIFIED ---
    let visible = true;
    for (const key in filters) {
      const value = filters[key];
      if (value === 'either') continue;
      if (li.getAttribute(`data-${key.toLowerCase()}`) !== value) {
        visible = false;
        break;
      }
    }
    li.style.display = visible ? '' : 'none';
  });
}




 // Function to load and display FAQs
 function loadFAQs() {
  const faqContainer = document.getElementById('faqList');
  if (!faqContainer) return;

  fetch(chrome.runtime.getURL('faqs.json'))
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(faqs => {
      faqContainer.innerHTML = ''; // Clear loading message

      if (!faqs || !Array.isArray(faqs) || faqs.length === 0) {
        faqContainer.innerHTML = '<div class="no-faqs">No FAQs available</div>';
        return;
      }

      // Create FAQ elements
      faqs.forEach((faq, index) => {
        const faqItem = document.createElement('div');
        faqItem.className = 'faq-item';
        
        const question = document.createElement('div');
        question.className = 'faq-question';
        question.textContent = faq.question;
        question.setAttribute('aria-expanded', 'false');
        question.setAttribute('aria-controls', `faq-answer-${index}`);
        
        const answer = document.createElement('div');
        answer.className = 'faq-answer';
        answer.id = `faq-answer-${index}`;
        answer.innerHTML = faq.answer.replace(/\n/g, '<br>');
        answer.setAttribute('aria-hidden', 'true');
        
        // Toggle answer display on question click
        question.addEventListener('click', () => {
          const isOpen = answer.classList.contains('open');
          
          // Close all other FAQs
          document.querySelectorAll('.faq-question').forEach(q => {
            q.classList.remove('open');
            q.setAttribute('aria-expanded', 'false');
          });
          document.querySelectorAll('.faq-answer').forEach(a => {
            a.classList.remove('open');
            a.setAttribute('aria-hidden', 'true');
          });
          
          // Toggle current FAQ
          if (!isOpen) {
            question.classList.add('open');
            answer.classList.add('open');
            question.setAttribute('aria-expanded', 'true');
            answer.setAttribute('aria-hidden', 'false');
          }
        });
        
        faqItem.appendChild(question);
        faqItem.appendChild(answer);
        faqContainer.appendChild(faqItem);
      });
    })
    .catch(error => {
      console.error('Error loading FAQs:', error);
      faqContainer.innerHTML = `<div class="error-message">Error loading FAQs: ${error.message}</div>`;
    });
}

// Load FAQs when panel is initialized
loadFAQs();