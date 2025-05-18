/// convert slots and webcomponents to 'normal' html.

// import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';
import beautify from 'js-beautify';

import fs from 'fs';



// ///// TESTING --> also change /api/dom.js location.
// import puppeteer from 'puppeteer-core';
// // const url = 'https://www.eon.com/de.html'
// // const url = 'https://www.nederlandisoleert.nl'
// // const url = 'https://www.essent.nl/'
// const url = 'https://www.programmablebrowser.com/'
// const launchArgs = JSON.stringify({ headless: 'shell', stealth: true });
// 		const browser = await puppeteer.connect({
// 		browserWSEndpoint: `ws://localhost:3000/?token=6R0Ws53R135510&launch=${launchArgs}`
// 	}
// );
// const page = await browser.newPage();
// await page.setUserAgent(
// 	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.125 Safari/537.36",
//   );
// await page.goto(url, { waitUntil: 'networkidle0' });
// ////////// end direct test settings



async function hasShadowDomOrWebComponentsF(page) {
	return page.evaluate(() => {
		const allElements = Array.from(document.querySelectorAll('*'));
		const hasShadowDom = allElements.some(el => el.shadowRoot);

		// Check for custom elements using the Custom Elements registry and naming convention
		const hasCustomElements = allElements.some(el => {
			// Check if the element is registered as a custom element
			const isRegistered = window.customElements.get(el.tagName.toLowerCase()) !== undefined;
			// Check if the element's tag name contains a hyphen (indicating a likely custom element)
			const hasHyphen = el.tagName.includes('-');
			return isRegistered || hasHyphen;
		});

		return hasShadowDom || hasCustomElements;
	});
}
function getRandomColorThree() {
	let colorRGB;
	do {
		const r = Math.floor(Math.random() * 156) + 100;
		const g = Math.floor(Math.random() * 256);
		const b = Math.floor(Math.random() * 256);
		colorRGB = [r, g, b];
	} while (getContrastRatio(colorRGB, [255, 255, 255]) < 4.5);
	return colorRGB;
}
function getContrastRatio(c1, c2) {
	const luminance1 = getRelativeLuminance(c1);
	const luminance2 = getRelativeLuminance(c2);
	const ratio = (Math.max(luminance1, luminance2) + 0.05) / (Math.min(luminance1, luminance2) + 0.05);
	return ratio.toFixed(2);
}
function getRelativeLuminance(c) {
	const [r, g, b] = c.map((v) => {
		v /= 255;
		return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
	});
	const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
	return luminance;
}
function ensureHtmlCompletion(htmlContent) {
	let modifiedHtml = htmlContent;
    // Remove script tags and their content
    modifiedHtml = modifiedHtml.replace(/<script[^>]*>([\S\s]*?)<\/script>/gmi, '');
    modifiedHtml = modifiedHtml.replace(/<style[^>]*>([\S\s]*?)<\/style>/gmi, '');
    modifiedHtml = modifiedHtml.replace(/<link[^>]*>([\S\s]*?)<\/link>/gmi, '');
	modifiedHtml = modifiedHtml.replace(/ aria-modal="true"/g, '');
    return modifiedHtml;
}
function cleanSelector(selector) {
    // Remove invalid characters
    let cleaned = selector.replace(/[^a-zA-Z0-9\-_\.]/g, '');
    // Ensure it does not start with a number
    if (/^\d/.test(cleaned)) {
        cleaned = `a${cleaned}`; // Prepend a letter if it starts with a number
    }
    return cleaned;
}
function removeInvalidSelectors(html) {
    // Regular expressions to match id and class attributes
    const idRegex = /id="([^"]*)"/g;
    const classRegex = /class="([^"]*)"/g;

    // Replace invalid characters in id attributes
    html = html.replace(idRegex, (match, p1) => {
        const cleanedId = cleanSelector(p1);
        return `id="${cleanedId}"`;
    });

    // Replace invalid characters in class attributes
    html = html.replace(classRegex, (match, p1) => {
        // Split class names and clean each one individually
        const cleanedClass = p1.split(' ').map(cleanSelector).join(' ');
        return `class="${cleanedClass}"`;
    });

    return html;
}
function removeInvalidSelectorsContrls(html) {
    // Regular expressions to match id and class attributes
    const idRegex = /aria-controls="([^"]*)"/g;
    const classRegex = /class="([^"]*)"/g;

    // Replace invalid characters in id attributes
    html = html.replace(idRegex, (match, p1) => {
        const cleanedId = cleanSelector(p1);
        return `id="${cleanedId}"`;
    });

    // Replace invalid characters in class attributes
    html = html.replace(classRegex, (match, p1) => {
        // Split class names and clean each one individually
        const cleanedClass = p1.split(' ').map(cleanSelector).join(' ');
        return `class="${cleanedClass}"`;
    });

    return html;
}
function removeInvalidSelectorsContrlsLblldby(html) {
    // Regular expressions to match id and class attributes
    const idRegex = /aria-labelledby="([^"]*)"/g;
    const classRegex = /class="([^"]*)"/g;

    // Replace invalid characters in id attributes
    html = html.replace(idRegex, (match, p1) => {
        const cleanedId = cleanSelector(p1);
        return `id="${cleanedId}"`;
    });

    // Replace invalid characters in class attributes
    html = html.replace(classRegex, (match, p1) => {
        // Split class names and clean each one individually
        const cleanedClass = p1.split(' ').map(cleanSelector).join(' ');
        return `class="${cleanedClass}"`;
    });

    return html;
}

//// For WordCloud
async function analyzeContent(htmlContent) {
    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;

    const ignoredTags = ['script', 'style', 'meta', 'link', 'noscript'];

    function traverseNodes(node) {
        if (node.nodeType === dom.window.Node.TEXT_NODE && node.textContent.trim()) {
            const parentTagName = node.parentElement.tagName.toLowerCase();
            if (!ignoredTags.includes(parentTagName)) {
                return [{ tag: parentTagName, text: node.textContent.trim() }];
            }
        } else if (node.tagName && node.tagName.toLowerCase() === 'img') {
            const altText = node.alt || '';
            if (altText.trim()) {
                return [{ tag: 'img', text: altText.trim() }];
            }
        }

        let result = [];
        for (const child of node.childNodes) {
            result = result.concat(traverseNodes(child));
        }
        return result;
    }

    return traverseNodes(document.body);
}



function processNodes(data) {
                        const mergedData = [];

                        function removePunctuation(str) {
                            return str.replace(/[.,/#!?$%^&*;:{}=\-_`~()]/g, '');
                        }

                        data.forEach(({ tag, text }) => {
                            const cleanedText = removePunctuation(text).toLowerCase();
                            const words = cleanedText.split(/\s+/).map(word => ({ tag, text: word }));

                            // Check for nested elements and merge their text
                            for (const word of words) {
                                const lastElement = mergedData[mergedData.length - 1];

                                if (lastElement && lastElement.tag === word.tag && tag !== 'p' && tag !== 'div' && tag !== 'span') {
                                    lastElement.text += ' ' + word.text;
                                } else {
                                    mergedData.push(word);
                                }
                            }
                        });

                        return mergedData;
                    }













////// USED for direct testing. Switch for use in index.js
	const convertShadowToNormalHtml = async (page) => {
	// async function convertShadowToNormalHtml(page)  {

	const pageData = []


	// const testText = 'Hi'
	// pageData.push(testText)

	const fullHtml = await page.content()
	// pageData.push(fullHtml)
	

	

	const hasShadowDomOrWebComponents = await hasShadowDomOrWebComponentsF(page)
	let nodesData
	let endHtml
	if(hasShadowDomOrWebComponents){


		const jsbeautifyoptions = { indent_size: 2, space_in_empty_paren: true, preserve_newlines : false  }


		const domConvert = async (page, slugUrl, clientId) => {
			const slotsToNormalHtml = fs.readFileSync('./dom.js', 'utf-8');
			await page.addScriptTag({ content: slotsToNormalHtml }); // assuming scriptContent contains the functions above
				
			const reconstructedHTML = await page.evaluate(() => {
					const bodyElement = document;
					return reconstruct_shadow_slot_innerHTML(bodyElement);
			});
						
			const  modifiedHtml  = await ensureHtmlCompletion(reconstructedHTML);
			const cleanedHtml = await removeInvalidSelectors(modifiedHtml);
			const evenCleaner = await removeInvalidSelectorsContrls(cleanedHtml)
			const evenevencleanerCode  = await removeInvalidSelectorsContrlsLblldby(evenCleaner)
			
			return evenevencleanerCode
			
			}
			
		const trimmedHtml = await domConvert(page)
		// console.log(trimmedHtml)

		const dom = new JSDOM(trimmedHtml);
		const { window } = dom;
		const purify = DOMPurify(window);


		// Extract just the <body> content
		 let bodyHtml = dom.window.document.body.innerHTML;
		 let cleanBodyHtml = purify.sanitize(bodyHtml);

		//  console.log('jsbeautifyoptions', jsbeautifyoptions)
		  endHtml = beautify.html(cleanBodyHtml, jsbeautifyoptions);
		// var doc = new JSDOM(bodyHtml, {
		// 	// url: page
		//   });
		// let reader = new Readability(doc.window.document);
		// let article = reader.parse()

		//   console.log(article.textContent)

		//   pageData.push({text: article.textContent})


		//  nodesData = await analyzeContent(bodyHtml);
		//   console.log('nodesData', nodesData)
		//   console.log('Is nodesData an array?', Array.isArray(nodesData)); 
		//   console.log('nodesData', typeof nodesData)
		//   const processedData = processNodes(nodesData);
		//   console.log('Processed::',processedData)
	}
	else{

		///// NO SHADOW DOM
		const jsbeautifyoptions = {  indent_size: 2,           // Indentation size
			space_in_empty_paren: true,
			preserve_newlines: false, // Do not preserve newlines
			max_preserve_newlines: 0, // Maximum number of newlines to preserve
			wrap_line_length: 0,      // No wrapping of lines
			end_with_newline: false,  // Do not end with a newline
			unformatted: [],          // No tags will be left unformatted
			content_unformatted: []     }

		const dom = new JSDOM(fullHtml);

		
		 const { window } = dom;
		const purify = DOMPurify(window);


		// Extract just the <body> content
		 let bodyHtml = dom.window.document.body.innerHTML;

		 let cleanBodyHtml = purify.sanitize(bodyHtml);
		//  console.log('jsbeautifyoptions', jsbeautifyoptions)
		 endHtml = beautify.html(cleanBodyHtml, jsbeautifyoptions);

		// var doc = new JSDOM(bodyHtml, {
		// 	// url: page
		//   });
		//   let reader = new Readability(doc.window.document);
		//   let article = reader.parse()

		//   console.log(article.textContent)
		// pageData.push({text: article.textContent})


		// nodesData = await analyzeContent(bodyHtml);
		// console.log('nodesData', nodesData)

		
	}


	pageData.push({hasShadowDomOrWebComponents, hasShadoElements: endHtml})

// console.log(hasShadowDomOrWebComponents)




//////////////////////////
	// console.log('PAGE textContent:', pageData)
	return pageData
	// await browser.close();




}





////// SWITCH for testing
export default convertShadowToNormalHtml //// for use in index.js . comment line below out. used for direct testing.
// convertShadowToNormalHtml(page)