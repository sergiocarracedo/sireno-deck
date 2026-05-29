export const MIN_SHRINK_FIT_FONT_SIZE_PX = 11

export function getShrinkFitBrowserScript(): string {
  return String.raw`
(function(){
  const ROOT_STATE_KEY = '__sirenoShrinkFitState';
  const CANONICAL_ROOT_SELECTOR = '[data-sireno-browser-shell="true"]';
  const TEXT_SELECTOR = '[data-sireno-text-fit="shrink"]';
  const MIN_FONT_SIZE_PX = ${MIN_SHRINK_FIT_FONT_SIZE_PX};
  const PRECISION_PX = 0.25;

  function resolveCanonicalRoot(root){
    if (root instanceof Element) {
      return root.closest?.(CANONICAL_ROOT_SELECTOR) || root.querySelector?.(CANONICAL_ROOT_SELECTOR) || root;
    }
    if (root instanceof Document) {
      return root.querySelector(CANONICAL_ROOT_SELECTOR) || root.body || root.documentElement;
    }
    return document.querySelector(CANONICAL_ROOT_SELECTOR) || document.body;
  }

  function getRootElement(root){
    return resolveCanonicalRoot(root);
  }

  function getRootState(rootElement){
    if (rootElement[ROOT_STATE_KEY]) {
      return rootElement[ROOT_STATE_KEY];
    }

    const state = {
      observedResizeTargets: new WeakSet(),
      observedFonts: false,
      pending: false,
      resizeObserver: typeof ResizeObserver === 'function'
        ? new ResizeObserver((entries) => {
            for (const entry of entries) {
              schedule(rootElement);
            }
          })
        : null,
    };

    rootElement[ROOT_STATE_KEY] = state;
    return state;
  }

  function resolveShrinkElements(rootElement){
    if (!rootElement) {
      return [];
    }

    const elements = [];
    if (rootElement.matches?.(TEXT_SELECTOR)) {
      elements.push(rootElement);
    }
    elements.push(...rootElement.querySelectorAll(TEXT_SELECTOR));
    return elements;
  }

  function fitsWithoutWrapping(element){
    return element.scrollWidth <= element.clientWidth + 0.5;
  }

  function measure(element){
    if (!(element instanceof HTMLElement)) {
      return;
    }

    if (element.clientWidth <= 0) {
      element.setAttribute('data-sireno-text-shrink-state', 'pending');
      return;
    }

    element.style.fontSize = '';
    const computedFontSize = Number.parseFloat(window.getComputedStyle(element).fontSize);

    if (!Number.isFinite(computedFontSize) || computedFontSize <= 0) {
      element.setAttribute('data-sireno-text-shrink-state', 'pending');
      return;
    }

    const maxSize = computedFontSize;
    const minSize = Math.min(maxSize, MIN_FONT_SIZE_PX);

    let bestSize = maxSize;
    if (!fitsWithoutWrapping(element)) {
      let low = minSize;
      let high = maxSize;
      bestSize = minSize;

      while (high - low > PRECISION_PX) {
        const candidate = (low + high) / 2;
        element.style.fontSize = candidate + 'px';
        if (fitsWithoutWrapping(element)) {
          bestSize = candidate;
          low = candidate;
        } else {
          high = candidate;
        }
      }
    }

    const appliedSize = Math.max(minSize, Math.round(bestSize * 100) / 100);
    element.style.fontSize = appliedSize + 'px';
    element.setAttribute('data-sireno-text-shrink-applied-size', String(appliedSize));
    element.setAttribute(
      'data-sireno-text-shrink-state',
      appliedSize < maxSize ? (fitsWithoutWrapping(element) ? 'measured' : 'floor') : 'max',
    );
  }

  function observeElement(rootElement, element){
    const state = getRootState(rootElement);
    const keyWell = element.closest?.('[data-sireno-key-well="true"]');
    const targets = [element.parentElement, keyWell, rootElement].filter(Boolean);
    if (!state.resizeObserver) {
      return;
    }

    for (const target of targets) {
      if (!state.observedResizeTargets.has(target)) {
        state.observedResizeTargets.add(target);
        state.resizeObserver.observe(target);
      }
    }
  }

  function observeFonts(rootElement){
    const state = getRootState(rootElement);
    if (state.observedFonts || !('fonts' in document) || !document.fonts) {
      return;
    }

    state.observedFonts = true;
    document.fonts.ready.then(() => {
      schedule(rootElement);
    }).catch(() => {});

    if (typeof document.fonts.addEventListener === 'function') {
      document.fonts.addEventListener('loadingdone', () => {
        schedule(rootElement);
      });
    }
  }

  function apply(root){
    const rootElement = getRootElement(root);
    observeFonts(rootElement);
    for (const element of resolveShrinkElements(rootElement)) {
      observeElement(rootElement, element);
      measure(element);
    }
  }

  function schedule(root){
    const rootElement = getRootElement(root);
    const state = getRootState(rootElement);
    if (state.pending) {
      return;
    }

    state.pending = true;
    requestAnimationFrame(() => {
      state.pending = false;
      apply(rootElement);
    });
  }

  window.__sirenoApplyShrinkFit = function(root){
    schedule(root || document);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){
      window.__sirenoApplyShrinkFit(document);
    }, { once: true });
  } else {
    window.__sirenoApplyShrinkFit(document);
  }
})();`
}
