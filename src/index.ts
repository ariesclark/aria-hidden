export type Undo = () => void;

const getDefaultParent = (originalTarget: HTMLElement | HTMLElement[]) => {
  if (typeof document === 'undefined') {
    return null;
  }

  const sampleTarget = Array.isArray(originalTarget) ? originalTarget[0] : originalTarget;
  return sampleTarget.ownerDocument.body;
};

let counterMap = new WeakMap<HTMLElement, number>();
let uncontrolledNodes = new WeakMap<HTMLElement, boolean>();
let markerMap: Record<string, WeakMap<HTMLElement, number>> = {};
let lockCount = 0;

export const hideOthers = (originalTarget: HTMLElement | HTMLElement[], parentNode = getDefaultParent(originalTarget), markerName = "data-aria-hidden"): Undo => {
  const targets = Array.isArray(originalTarget) ? originalTarget : [originalTarget];

  if (!markerMap[markerName]) {
    markerMap[markerName] = new WeakMap();
  }
  const markerCounter = markerMap[markerName];
  const hiddenNodes: HTMLElement[] = [];

  const deep = (parent: HTMLElement | null) => {
    if (!parent || targets.indexOf(parent) >= 0) {
      return;
    }

    Array.prototype.forEach.call(parent.children, (node: HTMLElement) => {
      if (targets.some(target => 'contains' in node && node.contains(target))) {
        deep(node);
      } else {
        const attr = node.getAttribute('aria-hidden');
        const alreadyHidden = attr !== null && attr !== 'false';
        const counterValue = (counterMap.get(node) || 0) + 1;
        const markerValue = (markerCounter.get(node) || 0) + 1;

        counterMap.set(node, counterValue);
        markerCounter.set(node, markerValue);
        hiddenNodes.push(node);

        if (counterValue === 1 && alreadyHidden) {
          uncontrolledNodes.set(node, true);
        }

        if (markerValue === 1) {
          node.setAttribute(markerName, 'true');
        }

        if (!alreadyHidden) {
          node.setAttribute('aria-hidden', 'true')
        }
      }
    })
  };

  deep(parentNode);

  lockCount++;

  return () => {
    hiddenNodes.forEach(node => {
      const counterValue = counterMap.get(node) - 1;
      const markerValue = markerCounter.get(node) - 1;

      counterMap.set(node, counterValue);
      markerCounter.set(node, markerValue);

      if (!counterValue) {
        if (!uncontrolledNodes.has(node)) {
          node.removeAttribute('aria-hidden')
        }
        uncontrolledNodes.delete(node)
      }

      if (!markerValue) {
        node.removeAttribute(markerName);
      }
    });

    lockCount--;
    if (!lockCount) {
      // clear
      counterMap = new WeakMap();
      counterMap = new WeakMap();
      uncontrolledNodes = new WeakMap();
      markerMap = {};
    }
  }
};
