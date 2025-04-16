/// functions for images
async function checkAltAttribute(img) {
	const alt = await img.getAttribute('alt');
	let altTextValue;

	if (alt === null) {
		altTextValue = "No alt attribute";  // No alt attribute
	} else if (alt === '') {
		altTextValue = "Alt attribute is empty('alt') or present without value('alt=&quot;&quot;')";
	} else {
		altTextValue = alt;  // Alt attribute has text
	}

	return altTextValue;
}
async function checkTitleAttribute(img) {
	const title = await img.getAttribute('title');
	let titleTextValue;

	if (title === null) {
		titleTextValue = "No title attribute";  // Title attribute is not present
	} else if (title === '') {
		titleTextValue = "Title attribute is empty";  // Title attribute is present but empty
	} else {
		titleTextValue = title;  // Title attribute has text
	}

	return titleTextValue;
}
async function processOuterAriaData(ariaData, page) {
	let isImageInAriaAttribute = false;
	let ariaContent = "";

	if (ariaData) {
		// console.log('found outer aria', ariaData);
		let outerAriaContentParts = [];
		let hasOuterAriaData = false;

		if (ariaData.outerAriaLabel) {
			ariaContent += ariaData.outerAriaLabel;
			isImageInAriaAttribute = true;
			// console.log('ariaContent', ariaContent);
		}

		// Process aria-labelledby and aria-describedby
		for (const attr of ['outerAriaLabelledBy', 'outerAriaDescribedBy']) {
			// console.log('attr in loop', attr, ariaData)

			if (ariaData[attr]) {
				// console.log('in for loop')
				isImageInAriaAttribute = true;
				const ids = ariaData[attr].split(' ');
				// console.log(`Processing ${attr}:`, ids);

				for (const id of ids) {
					const element = await page.$(`[id='${id}']`);
					if (element) {
						const text = await element.evaluate(node => node.textContent);
						if (text) {
							// console.log(`Found text for #${id}:`, text);
							outerAriaContentParts.push(text);
						}
					} else {
						console.error(`Element not found for ID: ${id}`);
						outerAriaContentParts.push(`Mismatch in IDs - content not found for ${id}`);
					}
					hasOuterAriaData = true;
				}
			}
		}

		if (hasOuterAriaData) {
			const outerAriaContent = outerAriaContentParts.join(" ");
			ariaContent += " " + outerAriaContent;
		}
	}

	return { ariaContent, isImageInAriaAttribute };
}
async function findAncestorLink(elementHandle, depth = 0) {
	if (depth > 10) return null;

	const tagName = await elementHandle.evaluate(el => el.tagName.toLowerCase()).catch(() => null);
	if (tagName === 'a' || tagName === 'button') {
		const linkTextContent = await elementHandle.evaluate(el => el.textContent.trim());
		return { isLink: true, linkTextContent };
	}

	const parentElement = await elementHandle.evaluateHandle(el => el.parentElement).catch(() => null);
	if (!parentElement || !(await parentElement.asElement())) return { isLink: false};  // changed from null to { isLink: false}

	return findAncestorLink(parentElement, depth + 1);
}
/// Figure 
async function isInFigureWithFigcaption(elementHandle, depth = 0) {
	if (depth > 10) return { inFigureElement: false, hasFigcaption: false, figcaptionText: '' };

	// Check if the current element is a <figure>
	const tagName = await elementHandle.evaluate(el => el.tagName.toLowerCase());
	if (tagName === 'figure') {
		const figcaptionElement = await elementHandle.$('figcaption');
		const hasFigcaption = !!figcaptionElement;
		let figcaptionText = '';
		if (hasFigcaption) {
			figcaptionText = await figcaptionElement.evaluate(node => node.textContent.trim());
		}
		return { inFigureElement: true, hasFigcaption, figcaptionText };
	}

	// Move up to the parent element
	const parentElementHandle = await elementHandle.evaluateHandle(el => el.parentElement);
	if (!parentElementHandle || !(await parentElementHandle.asElement())) {
		return { inFigureElement: false, hasFigcaption: false, figcaptionText: '' };
	}

	// Recursively check the parent element with incremented depth
	return isInFigureWithFigcaption(parentElementHandle, depth + 1);
}
function processImageSrc(src) {
	if (src) {
		// Check if the src starts with 'data:image' and its length exceeds 500 characters
		if (src.startsWith('data:image') && src.length > 500) {
			src = src.substring(0, 70) + "...";  // Truncate and add ellipsis
		}
	} else {
		src = "N/A";  // Or some default value indicating the src was missing or null
	}
	return src;
}
async function extractImageData(element) {
    const imgChildElemHandles = await element.$$('img');
    const svgChildElemHandles = await element.$$('svg');
    const hasImageInLink = imgChildElemHandles.length > 0 || svgChildElemHandles.length > 0;
	const isNormalImage = imgChildElemHandles.length > 0
	const imageIsSvg = svgChildElemHandles.length > 0
    return { hasImageInLink, imgChildElemHandles, svgChildElemHandles, isNormalImage, imageIsSvg };
}
// async function getAltTextfromImage(imgChildElemHandle) {
//     return imgChildElemHandle ? await imgChildElemHandle.getAttribute('alt') : 'ALT HERE';
// }
async function getAltTextfromImage(imgChildElemHandle) {
    if (!imgChildElemHandle) {
        return 'No image element';
    }
    const altAttribute = await imgChildElemHandle.getAttribute('alt');
    if (altAttribute === null) {
        return 'Alt tag not present(No, alt alt="" or alt="image description")';
    } else if (altAttribute === '') {
        return 'Alt tag present but empty (alt or alt="" - decorative image)';
    } else {
        return `${altAttribute}`;
    }
}
async function getTitleTextfromImage(imgChildElemHandle) {
    return imgChildElemHandle = await imgChildElemHandle.getAttribute('title');
}
async function getTitleOrDescFromSvg(svgChildElemHandle) {
    if (!svgChildElemHandle) {
        return '';
    }
    const title = await svgChildElemHandle.$$eval('title', titles => titles.map(t => t.textContent.trim()).join(' '));
    const desc = await svgChildElemHandle.$$eval('desc', descs => descs.map(d => d.textContent.trim()).join(' '));
    const parts = [];
    if (title) parts.push(title);
    if (desc) parts.push(desc);

    return parts.join(' ').trim();
}
async function checkSvgForAriaLabel(svgChildElemHandle) {
	const svfgAriaLabel =  await svgChildElemHandle.getAttribute('aria-label') 
	if (svfgAriaLabel) {
		return svfgAriaLabel
	}
	else {
		return ''
	}
}
/// Multiple IDs in the Aria-LabelledBy attribute:
async function checkSvgForAriaLabelledBy(svgChildElemHandle, page) {
    if (svgChildElemHandle) {
        const ariaLabelledByAttr = await svgChildElemHandle.getAttribute('aria-labelledby');
        if (ariaLabelledByAttr) {
            const ariaLabelledByIds = ariaLabelledByAttr.split(' ');
            let labelledTexts = [];

            for (const id of ariaLabelledByIds) {
                const labelledElement = await page.$(`#${id}`);
                const textContent = labelledElement ? await labelledElement.evaluate(node => node.textContent) : `Mismatch in ID - content not found for ${id}`;
                labelledTexts.push(textContent);
            }

            return labelledTexts.join(' '); // Joining all texts with space, or you can use '\n' to separate them by line.
        }
    }
    return '';
}
async function checkSvgForAriaDescribedBy(svgChildElemHandle, page) {
    if (svgChildElemHandle) {
        const ariaDescribedByAttr = await svgChildElemHandle.getAttribute('aria-describedby');
        if (ariaDescribedByAttr) {
            const ariaDescribedByIds = ariaDescribedByAttr.split(' ');
            let describedTexts = [];

            for (const id of ariaDescribedByIds) {
                const describedElement = await page.$(`#${id}`);
                const textContent = describedElement ? await describedElement.evaluate(node => node.textContent) : `Mismatch in ID - content not found for ${id}`;
                describedTexts.push(textContent);
            }

            return describedTexts.join(' '); // Joining all texts with space, or you can use '\n' to separate them by line.
        }
    }
    return '';
}
/// Get aria-labelledby and aria-describedby value 
async function getContentForAriaAttributes(attributeValue, page) {
if (!attributeValue) return '';

const ids = attributeValue.split(' ').filter(id => id.trim() !== '');
const contents = await Promise.all(ids.map(async id => {
const element = await page.$(`[id='${id}']`);
if (element) {
const text = await element.evaluate(node => node.textContent);
// Replace multiple whitespace characters with a single space
return text.replace(/\s+/g, ' ').trim();
} else {
return `Aria Mismatch for ${id}`;
}
}));

return contents.filter(content => content.trim() !== '').join(' ');
}
// Check 10 levels up for elements with Aria-* - returns value or IDs
async function findAncestorWithAriaAttributes(elementHandle, depth = 0) {
	if (depth > 10) return null;

	// Fetch the parent element of the current element, start checking from the parent
	const parentElement = await elementHandle.evaluateHandle(el => el.parentElement).catch(() => null);
	if (!parentElement || !(await parentElement.asElement())) return null;

	const outerAriaLabel = await parentElement.evaluate(el => el.getAttribute('aria-label')).catch(() => null);
	const outerAriaLabelledBy = await parentElement.evaluate(el => el.getAttribute('aria-labelledby')).catch(() => null);
	const outerAriaDescribedBy = await parentElement.evaluate(el => el.getAttribute('aria-describedby')).catch(() => null);

	if (outerAriaLabel || outerAriaLabelledBy || outerAriaDescribedBy) {
		return { outerAriaLabel, outerAriaLabelledBy, outerAriaDescribedBy };
	}

	// Recursively check the ancestors
	return findAncestorWithAriaAttributes(parentElement, depth + 1);
}
// Looks for the values of the Aria-* returns in outer
async function processAriaAttributes(ariaData, page) {
    let outerAriaContentParts = [];
    let hasOuterAriaData = false;

    if (ariaData) {
        if (ariaData.outerAriaLabel) {
            outerAriaContentParts.push(ariaData.outerAriaLabel);
            hasOuterAriaData = true;
        }

        for (const attr of ['outerAriaLabelledBy', 'outerAriaDescribedBy']) {
            if (ariaData[attr]) {
                const ids = ariaData[attr].split(' ');
                // console.log(`Processing ${attr}:`, ids); // Debugging log

                for (const id of ids) {
                    const element = await page.$(`[id='${id}']`);
                    if (element) {
                        const text = await element.evaluate(node => node.textContent);
                        if (text) {
                            // console.log(`Found text for #${id}:`, text); // Debugging log
                            outerAriaContentParts.push(text);
                        }
                    } else {
                        console.error(`Element not found for ID: ${id}`); // Error log
                        outerAriaContentParts.push(`Mismatch in IDs - content not found for ${id}`);
                    }
                    hasOuterAriaData = true;
                }
            }
        }
    }

    const outerAriaContent = outerAriaContentParts.join(' ').trim();
    return { outerAriaContent, hasOuterAriaData };
}
async function checkImageRoleForPresentationOrNone(elementHandle) {
    const role = await elementHandle.getAttribute('role');
    return {
        hasRolePresentationOrRoleNone: role === 'presentation' || role === 'none'
    };
}


/// NEED TO DO IT RECURSIVLY....
// async function checkAriaHiddenIsTrue(elementHandle) {
//     const ariaHidden = await elementHandle.getAttribute('aria-hidden');
//     return {
//         hasAriaHiddenTrue: ariaHidden === 'true'
//     };
// }

// Check the element and up to 10 ancestor levels for aria-hidden="true"
async function checkAriaHiddenIsTrue(elementHandle, depth = 0) {
    if (depth > 10) return { hasAriaHiddenTrue: false }; // Stop after 10 levels

    // Fetch the current element's aria-hidden attribute
    const ariaHidden = await elementHandle.evaluate(el => el.getAttribute('aria-hidden')).catch(() => null);
    if (ariaHidden === 'true') {
        return { hasAriaHiddenTrue: true }; // Return true immediately if any element has aria-hidden="true"
    }

    // Fetch the parent element of the current element
    const parentElement = await elementHandle.evaluateHandle(el => el.parentElement).catch(() => null);
    if (!parentElement || !(await parentElement.asElement())) {
        return { hasAriaHiddenTrue: false }; // If no parent or parent is not an element, return false
    }

    // Recursively check the parent element
    return checkAriaHiddenIsTrue(parentElement, depth + 1);
}


async function countElementId(elementItem, buttonId, ahrefId) {
    // console.log('countElementId called');

    // const elementType = await elementItem.evaluate(e => e.tagName); //// ONLY LINK OR BUTTON element
     // Evaluate the tag name and the role of the element
     const { elementType, elementRole } = await elementItem.evaluate(e => ({
        elementType: e.tagName.toLowerCase(), // Get tag name and convert to lower case
        elementRole: e.getAttribute('role') // Get the value of the role attribute
    }));


    // console.log('elementType',elementType)
    const element = elementType.toLowerCase();
    // console.log('element',element)
    // const isButton = element === "button"; /// OLD
    const isButton = elementType === "button" || elementRole === "button";

    // console.log('isButton',isButton)
    

    if (isButton) {
        buttonId++;  // Increment buttonId if it's a button
    } else {
        ahrefId++;   // Increment ahrefId if it's an anchor
    }
    const buttonOrLinkId = isButton ? buttonId : ahrefId;

    // Include other logic to extract data from the element
    // console.log('buttonOrLinkId, buttonId, ahrefId -->', buttonOrLinkId, buttonId, ahrefId)
    return {buttonOrLinkId, buttonId, ahrefId };
}
async function containsSlots(elementItem) {
	// First, check if there are any slot elements
	const slotCount = await elementItem.$$eval('slot', slots => slots.length);

	// If slots are present, fetch their content
	if (slotCount > 0) {
		// const slotContent = await fetchSlotContent(elementItem);
		console.log('Slot content:');
		return true;  // Slots are present and content is fetched
	}
	return false;  // No slots are present
}
async function fetchSlotContent(elementItem) {
    return await elementItem.evaluate((node) => {
        // Check if the node or its descendants contain a <slot> element
        const containsSlot = node.querySelector('slot') !== null;
        if (!containsSlot) return ''; // If no <slot>, return an empty string

        let allText = '';

        // Function to recursively gather text from nodes
        function collectText(node) {
            let textContent = '';

            // If node is a slot, get its assigned nodes and process them
            if (node.tagName === 'SLOT') {
                const nodes = node.assignedNodes({ flatten: true });
                textContent = nodes.map(child => collectText(child)).join(" ").trim();
            } else if (node.nodeType === Node.TEXT_NODE) {
                // Directly use text content from text nodes
                textContent = node.textContent.trim();
            } else if (node.tagName && node.tagName.toUpperCase() !== 'STYLE') {
                // Exclude <style> elements, but recursively process other child nodes
                textContent = Array.from(node.childNodes).map(child => collectText(child)).join(" ").trim();
            }
            return textContent;
        }

        // Start with the passed node
        allText = collectText(node);
        return allText.trim(); // Ensure to trim the final accumulated text
    });
}

async function HasShadowDOMContent(elementItem) {
    return await elementItem.evaluate((node) => {
        function recursivelyExtractText(node) {
            let text = "";
            if (node.shadowRoot) {
                // Access the shadow root and get text from its children
                text += Array.from(node.shadowRoot.childNodes)
                    .map(child => recursivelyExtractText(child))
                    .join(" ");
            } else if (node.nodeType === Node.TEXT_NODE) {
                // Directly concatenate text from text nodes
                const trimmedText = node.textContent.trim();
                if (trimmedText) {
                    text += trimmedText + " "; // Add a space for separation
                }
            } else if (node.childNodes.length > 0 && node.tagName.toUpperCase() !== 'STYLE') {
                // Recurse through all child nodes
                text += Array.from(node.childNodes)
                    .map(child => recursivelyExtractText(child))
                    .join(" ");
            }
            return text;
        }

        // Get the full text content and collapse multiple spaces into a single space
        return recursivelyExtractText(node).replace(/\s+/g, ' ').trim();
    });
}
async function extractElementData(elementItem, pageUrl,id) {

    let linkId = id
    
    // const href = await elementItem.getAttribute('href');
    // let linkUrl, isInternal;
    // const elementType = await elementItem.evaluate(e => e.tagName);  ///// OLD
    const { elementType, elementRole } = await elementItem.evaluate(e => ({
        elementType: e.tagName.toLowerCase(), // Get tag name and convert to lower case
        elementRole: e.getAttribute('role') // Get the value of the role attribute
    }));


    const element = elementType.toLowerCase();
    // const isButton = element === "button"; //// OLD before role
    const isButton = elementType === "button" || elementRole === "button";

     

    // if (href && !href.includes('@') && !href.includes(' ')) {
        let linkUrl, isInternal, href

        try {

            if (element === 'a') {
            
                href = await elementItem.getAttribute('href');
                if (href && !href.includes(' ')) {
                    try{

                        linkUrl = new URL(href, pageUrl).href;
                        isInternal = new URL(href, pageUrl).hostname === new URL(pageUrl).hostname;
                    }
                    catch{
                        linkUrl = 'href is missing'
                        isInternal = 'N/A'
                    }
                } else {
                    linkUrl = 'N/A';
                    isInternal = 'N/A';
                }
            } else {
                linkUrl = 'on page, button functionality(no URL)';
                isInternal = 'N/A';
            }
        }
        catch {
            linkUrl = 'Failed getting link';
            isInternal = 'N/A';
        }

    // linkUrl = href

    // const elementType = await elementItem.evaluate(e => e.tagName);
    // const element = elementType.toLowerCase();
    const type = 'linkElement2';
    const relAttribute = await elementItem.getAttribute('rel');
    const target = await elementItem.getAttribute('target');
    const titleAttribute = await elementItem.getAttribute('title');
    const tabindexAttribute = await elementItem.getAttribute('tabindex');
    const isOpeningNewWindow = target === '_blank';
    // const linkTxt = await elementItem.textContent(); //// on eneco.nl got inline SVG 
    // const linkTxt = await elementItem.evaluate((el) => {
    // 	// Use a recursive function to gather only non-SVG text
    // 	const getTextWithoutSVG = (node) => {
    // 		if (node.tagName === 'SVG') return ''; // Exclude SVG elements
    // 		if (node.nodeType === Node.TEXT_NODE) return node.textContent; // Include text nodes
    // 		return Array.from(node.childNodes).map(getTextWithoutSVG).join(''); // Recurse for child nodes
    // 	};
    // 	return getTextWithoutSVG(el).trim(); // Get text and trim whitespace
    // });
    

    const linkTxt = await elementItem.evaluate((el) => {
        // Use a recursive function to gather only non-SVG and non-STYLE text
        const getTextWithoutSVGAndStyle = (node) => {
            if (node.tagName && (node.tagName.toUpperCase() === 'SVG' || node.tagName.toUpperCase() === 'STYLE')) {
                return ''; // Exclude SVG and STYLE elements
            }
            if (node.nodeType === Node.TEXT_NODE) {
                return node.textContent.trim(); // Include text nodes and trim whitespace
            }
            return Array.from(node.childNodes).map(getTextWithoutSVGAndStyle).join(' '); // Recurse for child nodes
        };
        // return getTextWithoutSVGAndStyle(el).trim(); // Get text and trim whitespace
        return getTextWithoutSVGAndStyle(el).trim().replace(/\s\s+/g, ' ');

    });
    
    // console.log('linkTxt evaluate: ',linkTxt)




    // const linkTxtR = linkTxt.replace(/\s/g, ' ').trim(); /// Creates joinedwords
    const linkTxtR = linkTxt.trim();
    const hasTabindex = tabindexAttribute !== null;
    const hastitleAttribute = titleAttribute !== null;
    let haslinkTxtR = linkTxtR !== ''; /// later on in code - setting shadowdomcontent and slotcontent to linkTextR - need to update this variable
    const elementAriaLabel = await elementItem.getAttribute('aria-label');
    const elementAriaLabelledBy = await elementItem.getAttribute('aria-labelledby');
    const elementAriaDescribedBy = await elementItem.getAttribute('aria-describedby');
    let hasAriaDataOnElement = false;
    if (elementAriaLabel || elementAriaLabelledBy || elementAriaDescribedBy) {
        hasAriaDataOnElement = true;
    }
    return {
        type,
        element,
        linkId,
        relAttribute,
        linkTxt: linkTxtR,
        linkUrl,
        isInternal,
        target,
        titleAttribute,
        tabindexAttribute,
        isOpeningNewWindow,
        isButton,
        hasTabindex,
        hastitleAttribute,
        haslinkTxtR,
        hasAriaDataOnElement,
        elementAriaLabel,
        elementAriaLabelledBy,
        elementAriaDescribedBy
    };
}


async function getContentForAriaAttributes(attributeValue, page) {
    if (!attributeValue) return '';
    
    const ids = attributeValue.split(' ').filter(id => id.trim() !== '');
    const contents = await Promise.all(ids.map(async id => {
    const element = await page.$(`[id='${id}']`);
    if (element) {
    const text = await element.evaluate(node => node.textContent);
    // Replace multiple whitespace characters with a single space
    return text.replace(/\s+/g, ' ').trim();
    } else {
    return `Aria Mismatch for ${id}`;
    }
    }));
    
    return contents.filter(content => content.trim() !== '').join(' ');
    }

try {


    const elements = await page.$$('a, button, [role="link"], [role="button"]');
    
    
    
    /// add src for img
    /// add selector - check all upper elements. To much processing. Not for now...
    // for (let i = 0; i < urlHrefs.length; i++) {
    for (const elementItem of elements) {
        id++
        let remainingLinks = elements.length - id;
    
        ///// // sendMessageToClient(clientId, `Testing links and buttons ${id}..`);
        ///// sendMessageToClient(clientId, `Testing links/buttons ${id}/${elements.length}. ${remainingLinks} left to test.`);
    
        // console.log('TEST', pageUrl )
        // console.log('TEST', id, buttonId, ahrefId, page.url() )
        const elementIds = await countElementId(elementItem, buttonId, ahrefId, page.url());
        // console.log('eIds', elementIds)
        const {  buttonOrLinkId, buttonId: updatedButtonId, ahrefId: updatedAhrefId } = elementIds;
    
        buttonId = updatedButtonId;
        ahrefId = updatedAhrefId;
    
        const linkcontainsSlot = await containsSlots(elementItem)
        const linkslotContent = await fetchSlotContent(elementItem)
    
    
        // const linkHasShadowDOM = await HasShadowDOM(elementItem)
        const linkHasShadowDOM = await elementItem.evaluate(node => !!node.shadowRoot);
    //// Fuck this ShadowDom do not even know if it has impact. Notice: function above checks if the element has Shadow, not if it is contained in Shadow. Need to investigate........
        // console.log('linkHasShadowDOM -------------------------------------------------------------', linkHasShadowDOM)
        const linkHasShadowDOMContent = await HasShadowDOMContent(elementItem)
    
        const elementData = await extractElementData(elementItem, page.url(), id);
        let { type, element, linkUrl, linkId,  relAttribute, linkTxt: linkTxtR, isInternal, target, titleAttribute, tabindexAttribute,isOpeningNewWindow, isButton, hasTabindex, hastitleAttribute, haslinkTxtR, hasAriaDataOnElement, elementAriaLabel, elementAriaLabelledBy, elementAriaDescribedBy } = elementData;
    
        // On the element
        const elementAriaLabelledByText = await getContentForAriaAttributes(elementAriaLabelledBy, page);
        const elementAriaDescribedByText = await getContentForAriaAttributes(elementAriaDescribedBy, page);
    
        // aria outside the element ///// ---> This was from when I thought aria-* on surrounding elements had impact and were important. Guess they are not. So setting to empty string..
        // const outerAriaData = await findAncestorWithAriaAttributes(elementItem);
        // const { outerAriaContent, hasOuterAriaData } = await processAriaAttributes(outerAriaData, page);
        const hasOuterAriaData = false /// might be better with false..............
        const outerAriaContent = false 
        
        // console.log('outerAriaData', outerAriaData)
        // console.log('Aria-*', outerAriaContent, hasOuterAriaData)
    
        // console.log(elementData);
        // const dataString2 = JSON.stringify({ elementData /* other data */ }) + '\n' ;
        // fs.appendFileSync('z-test-file.txt', dataString2);
        // If Image is in Link
           const { hasImageInLink, imgChildElemHandles, svgChildElemHandles, isNormalImage, imageIsSvg  } = await extractImageData(elementItem);
    
        // const { hasImageInLink, imageIsNormalImage, imageIsSvg, imgChildElemHandle, svgChildElemHandle } = await extractImageData(elementItem);
        // const { hasImageInLink, imgChildElemHandles, svgChildElemHandles } = await extractImageData(elementItem);
        
        let imageDetails = [];
        
        if (hasImageInLink) {
            let imageId = 0;
            // Also check picture element? no think img in picture should be enough one image only used.
            // set .svg files without params and role=img to svg
            for (const imgElem of imgChildElemHandles) {
                const altText = await getAltTextfromImage(imgElem);
                const titleText = await getTitleTextfromImage(imgElem);
                const { hasAriaHiddenTrue } = await checkAriaHiddenIsTrue(imgElem);
                const { hasRolePresentationOrRoleNone } = await checkImageRoleForPresentationOrNone(imgElem);
                imageDetails.push({ 
                        imageId: imageId++, 
                        type: 'img', 
                        altText: altText, 
                        titleDesc: null,
                        ariaLabel: null, 
                        ariaLabelledBy: null, 
                        ariaDescribedBy: null, 
                        titleText: titleText, 
                        hasAriaHiddenTrue: hasAriaHiddenTrue, 
                        hasRolePresentationOrRoleNone: hasRolePresentationOrRoleNone });
            }
            for (const svgElem of svgChildElemHandles) {
                const titleDesc = await getTitleOrDescFromSvg(svgElem);
                const ariaLabel = await checkSvgForAriaLabel(svgElem);
                const titleText = await getTitleTextfromImage(svgElem);
                const ariaLabelledBy = await checkSvgForAriaLabelledBy(svgElem, page);
                const ariaDescribedBy = await checkSvgForAriaDescribedBy(svgElem, page);
                const { hasAriaHiddenTrue } = await checkAriaHiddenIsTrue(svgElem);
                const { hasRolePresentationOrRoleNone } = await checkImageRoleForPresentationOrNone(svgElem);
                /// aria-hidden - tabindex=-1 (remove element from tab) - focusable=false (is IE)  -> think only aria-hdden is relevant. if it has title/desc/ - dont think that it will happen. 
                imageDetails.push({ 
                        imageId: imageId++, 
                        type: 'svg', 
                        altText: null,
                        titleDesc: titleDesc, 
                        ariaLabel: ariaLabel, 
                        ariaLabelledBy: ariaLabelledBy, 
                        ariaDescribedBy: ariaDescribedBy, 
                        titleText: titleText, 
                        hasAriaHiddenTrue: hasAriaHiddenTrue, 
                        hasRolePresentationOrRoleNone: hasRolePresentationOrRoleNone });
            }
        }
        // console.log('---------------------')
    
          // Trim contents to remove any extraneous whitespace
          const trimmedSlotContent = linkslotContent.trim();
          const trimmedShadowContent = linkHasShadowDOMContent.trim();
      
    
    
        //   console.log('linkTxtR pre:', linkTxtR)
        //   console.log('trimmedSlotContent:', trimmedSlotContent)
        //   console.log('trimmedShadowContent:', trimmedShadowContent)
    
          // Initialize an array to collect valid text pieces
          let contents = [];
      
          // If linkTxt is non-empty, add it to contents array
          if (linkTxtR) {
              contents.push(linkTxtR);
          }
      
          // Check if slot content is non-empty and distinct from linkTxt
          if (trimmedSlotContent.trim() && trimmedSlotContent.trim() !== linkTxtR.trim) {
            console.log('Push trimmedSlotContent')
              contents.push(trimmedSlotContent);
          }
      
          // Check if shadow DOM content is non-empty, distinct from linkTxt, and not a duplicate of slot content
          if (trimmedShadowContent.trim() && trimmedShadowContent.trim() !== linkTxtR.trim() && trimmedShadowContent.trim() !== trimmedSlotContent.trim()) {
            console.log('Push trimmedShadowContent')
    
              contents.push(trimmedShadowContent);
          }
      
          // Join all valid, non-duplicate contents with a space or any other delimiter as needed
          if(trimmedSlotContent || trimmedShadowContent){
          linkTxtR = contents.join(" "); 
          }
    
          haslinkTxtR = linkTxtR !== '';
        //   console.log('linkTxtR post:', linkTxtR)
    
        //   console.log('---------------------')
    
        // LOGGIN
        // if(hasImageInLink === true){
        // console.log({ linkTxt ,element, linkUrl, hasImageInLink, isNormalImage, imageIsSvg, altText, /* other data */ });
        // }
        
        // if (hasImageInLink === true) {
            // const dataString = JSON.stringify({ linkTxt, element, linkUrl, hasImageInLink, isNormalImage, imageIsSvg, imageDetails  /* other data */ }) + '\n' ;
            // const dataString = JSON.stringify({ linkTxt, element, linkUrl, hasImageInLink, isNormalImage, elementAriaLabel, elementAriaLabelledByText, elementAriaDescribedByText  /* other data */ }) + '\n' ;
            
             
            // const dataString = JSON.stringify({ linkTxt, element, linkUrl, hasImageInLink, isNormalImage, elementAriaLabel, elementAriaLabelledByText, elementAriaDescribedByText, outerAriaContent, hasOuterAriaData, imageDetails  /* other data */ }) + '\n' ;
            // urlHrefsArr.push({  type,element,linkId,buttonOrLinkId, relAttribute,linkTxt: linkTxtR,linkUrl,isInternal,target,titleAttribute,tabindexAttribute,isOpeningNewWindow, isButton, hasTabindex, hastitleAttribute, haslinkTxtR, hasAriaDataOnElement,	elementAriaLabel, elementAriaLabelledByText, elementAriaDescribedByText, hasOuterAriaData, outerAriaContent,hasImageInLink, imageDetails  /* other data */ })
            urlHrefsArr.push({ linkHasShadowDOMContent, linkHasShadowDOM, linkslotContent, linkcontainsSlot, type,element,linkId,buttonOrLinkId, relAttribute,linkTxt: linkTxtR,linkUrl,isInternal,target,titleAttribute,tabindexAttribute,isOpeningNewWindow, isButton, hasTabindex, hastitleAttribute, haslinkTxtR, hasAriaDataOnElement,	elementAriaLabel, elementAriaLabelledByText, elementAriaDescribedByText, hasOuterAriaData, outerAriaContent,hasImageInLink, imageDetails  /* other data */ })
    
        
        
        
            // fs.appendFileSync('z-test-file.txt',  dataString  );
        // }
    
    
    
    }  // End Main For Loop
    
    /////23
    }