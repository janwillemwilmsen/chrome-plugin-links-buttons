function getBackgroundImageUrls(element) {
  const urls = [];
  const extract = str => {
    if (!str || str === 'none') return;
    const regex = /url\((['"]?)(.*?)\1\)/g;
    let m;
    while ((m = regex.exec(str))) {
      urls.push(m[2]);
    }
  };
  const style = getComputedStyle(element);
  extract(style.backgroundImage);
  ['::before', '::after'].forEach(pseudo => {
    const ps = getComputedStyle(element, pseudo);
    extract(ps.backgroundImage);
  });
  return urls;
}

function analyzeSingleImage(el) {
  const tag = el.tagName ? el.tagName.toLowerCase() : '';
  const result = { type: tag, isImg: false, isSvg: false, isBackgroundImage: false };
  if (tag === 'img') {
    result.isImg = true;
    result.src = el.src || '';
    result.alt = el.getAttribute('alt');
    result.title = el.getAttribute('title');
    result.ariaLabel = el.getAttribute('aria-label');
    result.role = el.getAttribute('role');
  } else if (tag === 'svg') {
    result.isSvg = true;
    result.outerHTML = el.outerHTML;
    result.title = (el.querySelector('title') || {}).textContent || '';
  }
  return result;
}

function analyzeImagesInElement(element) {
  const imgs = Array.from(element.querySelectorAll('img,svg'));
  const results = imgs.map(img => analyzeSingleImage(img));
  const bgUrls = getBackgroundImageUrls(element);
  bgUrls.forEach(url => {
    results.push({ type: 'background', isBackgroundImage: true, url });
  });
  return results;
}
