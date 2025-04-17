
const links3 = data.filter(url => url.type === 'linkElement2');
	let linksLenght = links3.length || '0'
 
				// Links
				// const links = data.filter(item => item.type === 'linkElement');
				htmlContent += `
				<details class="py-2 border item border-gray-700 group open:ring">
					<summary class="sticky top-10 bg-[#383a3a] z-40 flex flex-col group-open:text-green-500 list-none focus:ring">
						<span class="flex flex-row gap-2 py-2 w-full items-center">
							<span class="flex-none justify-center items-center mb-0 border-none rounded-md text-sm p-1 text-gray-200 item" id="lhLenghtl">${linksLenght}</span>
							<span class="inline-flex" id="Links">Links and buttons</span>
							<span class="grow"></span>
							<span class="flex-none md:mr-4 w-8 h-8 rounded-full  bg-white group-open:hidden chevrondown"></span>
							<span class="flex-none hidden md:mr-4 w-8 h-8 rounded-full  bg-white  group-open:inline chevronup"></span>
						</span>
					</summary>

								<ul class=" list-disc ml-5">
								<li>Check if the labels of the links make sense. Do you understand where the link is going, or what the button does?
									<br>[with link text]</li>
								<li>Links that open in a new window should mention that, either via screenreader only readable text or maybe via the alt text in an image/icon in the link.<br>
									[that open in new window]	</li>
								<li>Links/buttons without text and with an image should have alt text describing the link on the image, not just the image.<br>
									[without text] [with image]	</li>
								<li>Links with tabindex modify the tabbing order. (tabindex) <br>
									[with tabindex]</li>
								<li>Aria attributes are added especially for screenreaders. Check the descriptions, and see if they make sense, and aren't redundant.<br>
									[with aria-*attribute] 	</li>
								<li>Reduce redundancy. Do not use two links to the same page after each other.</li> 
								<li>Make sure links with text and titles don't contain duplicate information.<br>
									[with link text] [with title]</li>
								<li>Links with images, without or with empty alt text, that aren't hidden don't need titles(?)<br>
									[with image]</li>
								</ul>`

htmlContent += `
<div class="border-1 item border-gray-200 rounded-md p-2 mt-8 mb-4 mr-4">
    <h3 class="text-xl mb-2">Filter and show:</h3>

    <!-------- isButton------>
        <div><fieldset>
        <legend class="sr-only">Show/hide only buttons or links</legend>
        <div class="inline-flex flex-row rounded-md ring-1 ring-indigo-300 mb-2">
                <label class="hover:bg-neutral-950 rounded-l-md p-1 has-[:checked]:ring-1 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-900 has-[:checked]:ring-indigo-200"><input class="checked:border-indigo-500 checked:ring-indigo-500" type="radio" name="isButtonFilter" value="either" checked> Either</label>
                <label class="hover:bg-neutral-950  p-1 has-[:checked]:ring-1 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-900 has-[:checked]:ring-indigo-200"><input class="checked:border-indigo-500 checked:ring-indigo-500" type="radio" name="isButtonFilter" value="true"> buttons only </label>
                <label class="hover:bg-neutral-950 rounded-r-md p-1 has-[:checked]:ring-1 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-900 has-[:checked]:ring-indigo-200"><input class="checked:border-indigo-500 checked:ring-indigo-500" type="radio" name="isButtonFilter" value="false"> links only  </label>
        </div></fieldset></div>

        <!--------haslinktextR-------->
        <div><fieldset>
        <legend class="sr-only">Show/hide links and or buttons that have text in them</legend>
        <div class="inline-flex flex-row rounded-md ring-1 ring-indigo-300 mb-2">
                <label class="hover:bg-neutral-950 rounded-l-md p-1 has-[:checked]:ring-1 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-900 has-[:checked]:ring-indigo-200"><input class="checked:border-indigo-500 checked:ring-indigo-500" type="radio" name="haslinkTxtRFilter" value="either" checked> Either</label>
                <label class="hover:bg-neutral-950  p-1 has-[:checked]:ring-1 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-900 has-[:checked]:ring-indigo-200"><input class="checked:border-indigo-500 checked:ring-indigo-500" type="radio" name="haslinkTxtRFilter" value="true"> with link text</label>
                <label class="hover:bg-neutral-950 rounded-r-md p-1 has-[:checked]:ring-1 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-900 has-[:checked]:ring-indigo-200"><input class="checked:border-indigo-500 checked:ring-indigo-500" type="radio" name="haslinkTxtRFilter" value="false"> without text</label>
        </div></fieldset></div>


        <div><fieldset>
        <legend class="sr-only">Show/hide links and or buttons that have a image in them</legend>
        <div class="inline-flex flex-row rounded-md ring-1 ring-indigo-300 mb-2">
                <label class="hover:bg-neutral-950 rounded-l-md p-1 has-[:checked]:ring-1 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-900 has-[:checked]:ring-indigo-200"><input class="checked:border-indigo-500 checked:ring-indigo-500" type="radio" name="imageInLinkFilter" value="either" checked> Either</label>
                <label class="hover:bg-neutral-950  p-1 has-[:checked]:ring-1 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-900 has-[:checked]:ring-indigo-200"><input class="checked:border-indigo-500 checked:ring-indigo-500" type="radio" name="imageInLinkFilter" value="true"> with image</label>
                <label class="hover:bg-neutral-950 rounded-r-md p-1 has-[:checked]:ring-1 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-900 has-[:checked]:ring-indigo-200"><input class="checked:border-indigo-500 checked:ring-indigo-500" type="radio" name="imageInLinkFilter" value="false"> without image</label>
        </div></fieldset></div>

        <div><fieldset>
        <legend class="sr-only">Show/hide buttons and or links that have has aria-* attribute</legend>
        <div class="inline-flex flex-row rounded-md ring-1 ring-indigo-300 mb-2">
                <label class="hover:bg-neutral-950 rounded-l-md p-1 has-[:checked]:ring-1 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-900 has-[:checked]:ring-indigo-200"><input class="checked:border-indigo-500 checked:ring-indigo-500" type="radio" name="ariaElementFilter" value="either" checked> Either</label>
                <label class="hover:bg-neutral-950  p-1 has-[:checked]:ring-1 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-900 has-[:checked]:ring-indigo-200"><input class="checked:border-indigo-500 checked:ring-indigo-500" type="radio" name="ariaElementFilter" value="true"> with aria-* attribute</label>
                <label class="hover:bg-neutral-950 rounded-r-md p-1 has-[:checked]:ring-1 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-900 has-[:checked]:ring-indigo-200"><input class="checked:border-indigo-500 checked:ring-indigo-500" type="radio" name="ariaElementFilter" value="false"> without aria-* attribute</label>
        </div></fieldset></div>

        <!--------hasTitleAttribute---->
        <div><fieldset>
        <legend class="sr-only">Show/hide buttons and or links that have a title or not</legend>
        <div class="inline-flex flex-row rounded-md ring-1 ring-indigo-300 mb-2">
                <label class="hover:bg-neutral-950 rounded-l-md p-1 has-[:checked]:ring-1 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-900 has-[:checked]:ring-indigo-200"><input class="checked:border-indigo-500 checked:ring-indigo-500" type="radio" name="hastitleAttributeFilter" value="either" checked> Either</label>
                <label class="hover:bg-neutral-950  p-1 has-[:checked]:ring-1 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-900 has-[:checked]:ring-indigo-200"><input class="checked:border-indigo-500 checked:ring-indigo-500" type="radio" name="hastitleAttributeFilter" value="true"> with title </label>
                <label class="hover:bg-neutral-950 rounded-r-md p-1 has-[:checked]:ring-1 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-900 has-[:checked]:ring-indigo-200"><input class="checked:border-indigo-500 checked:ring-indigo-500" type="radio" name="hastitleAttributeFilter" value="false"> without title  </label>
        </div></fieldset></div>

    <!------- hasTabindex----->
        <div><fieldset>
        <legend class="sr-only">Show/hide buttons and or links that have tabindex or not</legend>
        <div class="inline-flex flex-row rounded-md ring-1 ring-indigo-300 mb-2">
                <label class="hover:bg-neutral-950 rounded-l-md p-1 has-[:checked]:ring-1 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-900 has-[:checked]:ring-indigo-200"><input class="checked:border-indigo-500 checked:ring-indigo-500" type="radio" name="hasTabindexFilter" value="either" checked> Either</label>
                <label class="hover:bg-neutral-950  p-1 has-[:checked]:ring-1 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-900 has-[:checked]:ring-indigo-200"><input class="checked:border-indigo-500 checked:ring-indigo-500" type="radio" name="hasTabindexFilter" value="true"> with tabindex</label>
                <label class="hover:bg-neutral-950 rounded-r-md p-1 has-[:checked]:ring-1 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-900 has-[:checked]:ring-indigo-200"><input class="checked:border-indigo-500 checked:ring-indigo-500" type="radio" name="hasTabindexFilter" value="false"> without tabindex</label>
        </div></fieldset></div>



        <div><fieldset>
        <legend class="sr-only">Show/hide buttons and or links that open in New Window or not</legend>
        <div class="inline-flex flex-row rounded-md ring-1 ring-indigo-300 mb-2">
                <label class="hover:bg-neutral-950 rounded-l-md p-1 has-[:checked]:ring-1 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-900 has-[:checked]:ring-indigo-200"><input class="checked:border-indigo-500 checked:ring-indigo-500" type="radio" name="openLinkNewWindowFilter" value="either" checked> Either</label>
                <label class="hover:bg-neutral-950  p-1 has-[:checked]:ring-1 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-900 has-[:checked]:ring-indigo-200"><input class="checked:border-indigo-500 checked:ring-indigo-500" type="radio" name="openLinkNewWindowFilter" value="true"> that open in new window</label>
                <label class="hover:bg-neutral-950 rounded-r-md p-1 has-[:checked]:ring-1 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-900 has-[:checked]:ring-indigo-200"><input class="checked:border-indigo-500 checked:ring-indigo-500" type="radio" name="openLinkNewWindowFilter" value="false"> that don't open in new window</label>
        </div></fieldset></div>

    <button type="button" id="resetLinkButton" class="px-2 text-white  bg-pink-700 rounded-md inline-block underline m-1 p-1 mt-2 ring-offset-0 focus:ring hover:ring ring-indigo-600">Reset filters</button>
</div>

`


if (links3.length) {



htmlContent += '<ol class="p-2 list-decimal list-outside ">';
links3.forEach(link => {
// console.log(url);
// let linkTxt = url.linkTxt

/// copy from here:

htmlContent += `<li class="containerx hover:bg-neutral-950 ${link.linkId}" style="border: solid 1px gray; padding:4px; margin-bottom:2px;" data-isbutton="${link.isButton}" data-hastabindex="${link.hasTabindex}" data-hastitleattribute="${link.hastitleAttribute}" data-haslinktxtr="${link.haslinkTxtR}" data-hasariaonelement="${link.hasAriaDataOnElement}" data-hasimageinlink="${link.hasImageInLink}" data-openlinkinnewwindow="${link.isOpeningNewWindow}">`;


// let linkOrButton = ''       /////////////////NeededForOtherTemplate


// if (link.hasOuterAriaData) {
// htmlContent += `<div class="outerlinkdetails"><span class="OuterArialLabel"><span class="AttElement">[aria-*]</span></span>${link.outerAriaContent}</div>`;
// }

htmlContent += `<div class="linkdetails">`;

if (link.element === 'a') {
htmlContent += `<span class="ButtonOrLink">Link (#${link.buttonOrLinkId})</span>`;
} else if (link.element === 'button') {
htmlContent += `<span class="ButtonOrLink">Button (#${link.buttonOrLinkId})</span>`;
}
else {
htmlContent += `<span class="ButtonOrLink">element with role</span>`;
}

if (link.linkTxt) {
htmlContent += `<strong class="LinkText">${link.linkTxt}</strong>`;
}
if (link.hasImageInLink) {
htmlContent += '<span class="LinkOrButtonWithWithImage AttElement">[with image]</span>';
}
if (link.tabindexAttribute) {
htmlContent += `<span class="AttElement">[tabindex ${link.tabindexAttribute}]</span>`;
}

htmlContent += link.linkUrl ? `<span class="LinkOrButtonToUrlElement AttElement">[to <span class="LinkOrButtonToUrl${link.element}">${link.linkUrl}]</span></span>` : '<span class="ActionOrAnchor">for on page action(without link).</span>';
htmlContent += link.isOpeningNewWindow ? '<span class="AttElement">[<span role="img" class="LinkOpenNewWindow" aria-label="the tested link opens in a new window"></span>]</span>' : '<span class="AttElement">[<span role="img" class="LinkNotOpenNewWindow" aria-label="the tested link doesnt open in a new window"></span>]</span>';

if (link.hasAriaDataOnElement) {
htmlContent += ` ${link.elementAriaLabel ? `			<span class="AriaDataOnElement AttElement">[aria-label ${link.elementAriaLabel}]</span>` : ''}`;
htmlContent += ` ${link.elementAriaLabelledByText ? `	<span class="AriaDataOnElement AttElement">[aria-labelledby ${link.elementAriaLabelledByText}]</span>` : ''}`;
htmlContent += ` ${link.elementAriaDescribedByText ? `	<span class="AriaDataOnElement AttElement">[aria-describedby ${link.elementAriaDescribedByText}]</span>` : ''}`;
}



if(link.titleAttribute){
htmlContent += ` ${link.titleAttribute ? `<span class="TitleOnElement AttElement">[title ${link.titleAttribute}]</span>` : ''}`;
}


htmlContent += `</div>`;

if (link.imageDetails && link.imageDetails.length > 0) {
link.imageDetails.forEach(image => {
htmlContent += `<div id="imagedetails" data-imagehidden="${image.hasAriaHiddenTrue || image.hasRolePresentationOrRoleNone}">`;
if (image.type === 'img') {
htmlContent += image.hasAriaHiddenTrue || image.hasRolePresentationOrRoleNone
        ? `<span class="imgInside HiddenByRoleOrAriaImage AttElement">[Image hidden by aria or role]</span>`
        : `<span class="imgInside NotHiddenImage"><span class="AttElement">[Image not hidden by aria or role]</span>
            ${image.altText ? `				<span class="AttributeText AttElement">[alt					${image.altText}]	</span>` : ''}
            ${image.titleText ? `			<span class="AttributeText AttElement">[title				${image.titleText}]	</span>` : ''}`; /// deleted </span>` here
} else if (image.type === 'svg') {
htmlContent += image.hasAriaHiddenTrue || image.hasRolePresentationOrRoleNone
        ? `<span class="svgImageInside HiddenByRoleOrAriaImage AttElement">[SVG Image hidden by aria or role]</span>`
        : `<span class="svgImageInside NotHiddenImage"><span class="AttElement">[SVG image not hidden by aria or role]</span>
                ${image.titleDesc ? `		<span class="AttributeText AttElement">[title or desc		${image.titleDesc}	]	</span>` : ''} 
                ${image.ariaLabel ? `		<span class="AttributeText AttElement">[aria-label			${image.ariaLabel}	]	</span>` : ''}
                ${image.ariaLabelledBy ? `	<span class="AttributeText AttElement">[aria-labelledby		${image.ariaDescribedBy}]</span>` : ''}
                ${image.ariaDescribedBy ? `	<span class="AttributeText AttElement">[aria-describedby	${image.ariaDescribedBy}]</span>` : ''}
                ${image.titleText ? `		<span class="AttributeText AttElement">[title				${image.titleText}	]	</span>` : ''}`;
}
htmlContent += `</div>`;
});
}

htmlContent += `</div></div>`;

///// Copy unit line above

});  /////////////////  end ForEach Url. 
htmlContent += '</ol></details>';
} else {
htmlContent += '<p class="mb-4">--> No links/buttons found on this page.</p></details>';
}




/////


// document.addEventListener('DOMContentLoaded', () => {
    const radioGroupsLinks = {
        isButtonFilter: document.querySelectorAll('input[name="isButtonFilter"]'),
        hasTabindexFilter: document.querySelectorAll('input[name="hasTabindexFilter"]'),
        hastitleAttributeFilter: document.querySelectorAll('input[name="hastitleAttributeFilter"]'),
        haslinkTxtRFilter: document.querySelectorAll('input[name="haslinkTxtRFilter"]'),
        ariaElementFilter: document.querySelectorAll('input[name="ariaElementFilter"]'),
        imageInLinkFilter: document.querySelectorAll('input[name="imageInLinkFilter"]'),
        openLinkNewWindowFilter: document.querySelectorAll('input[name="openLinkNewWindowFilter"]')
    };
    const resetButtonLink = document.getElementById('resetLinkButton');

    const filterFuncLinks = () => {
        const getSelectedValue = (groupName) => {
            return Array.from(radioGroupsLinks[groupName]).find(radio => radio.checked).value;
        };


        const listItems = document.querySelectorAll('li[data-isbutton], li[data-hastabindex], li[data-hastitleattribute], li[data-haslinktxtr], li[data-hasariaonelement], li[data-hasimageinlink], li[data-openlinkinnewwindow]');
        listItems.forEach(li => {
            const matchesCriteria = (attributeName, filterName) => {
                const attributeValue = li.getAttribute(attributeName) === 'true';
                const selectedFilter = getSelectedValue(filterName);
                return selectedFilter === 'either' || selectedFilter === attributeValue.toString();
            };
	
			
            const shouldBeVisible = matchesCriteria('data-isbutton', 'isButtonFilter') &&
									matchesCriteria('data-hastabindex', 'hasTabindexFilter') &&
									matchesCriteria('data-hastitleattribute', 'hastitleAttributeFilter') &&
									matchesCriteria('data-haslinktxtr', 'haslinkTxtRFilter') &&
									matchesCriteria('data-hasariaonelement', 'ariaElementFilter') &&
                                    matchesCriteria('data-hasimageinlink', 'imageInLinkFilter') &&
                                    matchesCriteria('data-openlinkinnewwindow', 'openLinkNewWindowFilter');

            li.style.display = shouldBeVisible ? '' : 'none';
        });
    };

    Object.values(radioGroupsLinks).forEach(group => {
        group.forEach(radio => radio.addEventListener('change', filterFuncLinks));
    });

	if(resetButtonLink){  /// If there are no links, the filters arent needed. added without testing.


    resetButtonLink.addEventListener('click', () => {
        Object.values(radioGroupsLinks).forEach(group => {
            group.forEach(radio => {
                if (radio.value === 'either') {
                    radio.checked = true;
                }
            });
        });
        filterFuncLinks();
    });

}
