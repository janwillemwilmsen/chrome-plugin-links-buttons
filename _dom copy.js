function reconstruct_shadow_slot_innerHTML(el) {
    return reconstruct_shadow_slotted(el).join('').replace(/\s+/, ' ');
}

function reconstruct_shadow_slotted(el) {
    const child_nodes = el.shadowRoot ? el.shadowRoot.childNodes : el.childNodes;
    return reconstruct_from_nodeList(child_nodes);
}

function reconstruct_from_nodeList(child_nodes) {
    const new_values = [];
    for (const child_node of Array.from(child_nodes)) {
        if (child_node.nodeType === Node.ELEMENT_NODE && isWebComponent(child_node)) {
            new_values.push(serializeWebComponent(child_node));
        } else {
            const nodeHTML = processNode(child_node);
            if (Array.isArray(nodeHTML)) {
                new_values.push(...nodeHTML);
            } else {
                new_values.push(nodeHTML);
            }
        }
    }
    return new_values;
}

function isWebComponent(element) {
    return window.customElements.get(element.tagName.toLowerCase()) !== undefined;
}

function serializeWebComponent(element) {
    const content = [];
    const tagName = getComputedStyle(element).display === 'inline' ? 'span' : 'div';

    if (element.shadowRoot) {
        content.push(`<${tagName}${getAttributesString(element)}>`);
        content.push(reconstruct_from_nodeList(element.shadowRoot.childNodes).join(''));
        content.push(`</${tagName}>`);
    } else {
        content.push(`<${tagName}${getAttributesString(element)}>`);
        content.push(reconstruct_from_nodeList(element.childNodes).join(''));
        content.push(`</${tagName}>`);
    }
    return content.join('');
}

function processNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent.trim();
    } else if (node.nodeType === Node.COMMENT_NODE) {
        return `<!--${node.data}-->`;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.tagName.toLowerCase() === 'iframe') {
            return `<iframe ${getAttributesString(node)}></iframe>`;
        }
        if (node.tagName.toLowerCase() === 'slot') {
            const slotContent = reconstruct_from_nodeList(node.assignedNodes());
            return slotContent.join('');
        } else {
            const startTag = `<${node.tagName.toLowerCase()}${getAttributesString(node)}>`;
            const innerHTML = reconstruct_from_nodeList(node.childNodes).join('');
            const endTag = `</${node.tagName.toLowerCase()}>`;
            return `${startTag}${innerHTML}${endTag}`;
        }
    }
    return '';
}

function getAttributesString(element) {
    const attributes = [];
    for (const attr of element.attributes) {
        attributes.push(`${attr.name}="${attr.value}"`);
    }
    return attributes.length > 0 ? ' ' + attributes.join(' ') : '';
}


// Test logic (console-friendly)
try {
    // Serialize the document
    let convertedHTML = reconstruct_shadow_slot_innerHTML(document);

    // Clean the HTML
    convertedHTML = convertedHTML
        .replace(/<script[^>]*>([\S\s]*?)<\/script>/gmi, '')
        .replace(/<style[^>]*>([\S\s]*?)<\/style>/gmi, '')
        .replace(/<link[^>]*>([\S\s]*?)<\/link>/gmi, '')
        .replace(/ aria-modal="true"/g, '');

    // Output the result
    console.log('Converted HTML:', convertedHTML);
} catch (error) {
    console.error('Error converting web components:', error);
}