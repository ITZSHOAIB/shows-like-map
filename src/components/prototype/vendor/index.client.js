import { bottomSheetTemplate as template, bottomSheetDialogManagerTemplate as template$1 } from './index.ssr.js';

class BottomSheet extends HTMLElement {
  static observedAttributes = ["nested-scroll-optimization", "content-height"];
  #handleViewportResize = () => {
    this.style.setProperty(
      "--sw-keyboard-height",
      `${window.visualViewport?.offsetTop ?? 0}px`
    );
  };
  #shadow;
  #cleanupIntersectionObserver = null;
  #cleanupSheetSizeObserver = null;
  #cleanupNestedScrollResizeOptimization = null;
  #currentSnapState = null;
  constructor() {
    super();
    const supportsDeclarative = HTMLElement.prototype.hasOwnProperty("attachInternals");
    const internals = supportsDeclarative ? this.attachInternals() : void 0;
    let shadow = internals?.shadowRoot;
    if (!shadow) {
      shadow = this.attachShadow({ mode: "open" });
      shadow.innerHTML = template;
    }
    this.#shadow = shadow;
    if (!CSS.supports(
      "(animation-timeline: scroll()) and (animation-range: 0% 100%)"
    )) {
      this.addEventListener("scroll", this.#handleScroll);
      this.#handleScroll();
    }
  }
  connectedCallback() {
    this.#setupIntersectionObserver();
    window.visualViewport?.addEventListener(
      "resize",
      this.#handleViewportResize
    );
  }
  /**
   * Scrolls the bottom sheet to the snap point at the given snap index, using
   * the same convention as the `snap-position-change` event's `snapIndex`.
   * Indices range from `0` (collapsed) to the maximum (fully expanded), with
   * intermediate values mapping to user-defined snap points in bottom-to-top
   * order.
   *
   * If the index is not an integer or is out of range, does nothing.
   * Otherwise, the final position is determined by the browser's scroll-snap,
   * so for example index `0` without `swipe-to-dismiss` resolves to the
   * bottommost reachable snap point, and indices beyond the `content-height`
   * limit resolve to the topmost reachable snap.
   *
   * @param index - The snap index to scroll to.
   * @param options - Options that control how the scroll is performed.
   */
  snapToPoint(index, options) {
    const snapPoints = this.#getSnapPoints();
    if (!snapPoints) return;
    const { assignedSnapPoints, maxExpandedIndex } = snapPoints;
    if (!Number.isInteger(index) || index < 0 || index > maxExpandedIndex) {
      return;
    }
    let target;
    if (index === maxExpandedIndex) {
      target = this.#shadow.querySelector(".sheet");
    } else if (index === 0) {
      target = this.#shadow.querySelector(".snap-bottom");
    } else {
      target = assignedSnapPoints[index - 1] ?? null;
    }
    target?.scrollIntoView({ behavior: options?.behavior });
  }
  /**
   * Returns the snap points assigned to the `snap` slot, ordered bottom-to-top
   * so that array index maps to snap index (`i + 1`), along with the maximum
   * expanded snap index. Returns `null` when the `snap` slot is missing.
   */
  #getSnapPoints() {
    const snapSlot = this.#shadow.querySelector('slot[name="snap"]');
    if (!snapSlot) return null;
    const assignedSnapPoints = snapSlot.assignedElements().reverse();
    const hasTopSnapPoint = assignedSnapPoints.at(-1)?.classList.contains("top") ?? false;
    const maxExpandedIndex = assignedSnapPoints.length + (hasTopSnapPoint ? 0 : 1);
    return { assignedSnapPoints, maxExpandedIndex };
  }
  #setupIntersectionObserver() {
    const snapSlot = this.#shadow.querySelector('slot[name="snap"]');
    const bottomSnapTarget = this.#shadow.querySelector(
      '.sentinel[data-snap="bottom"]'
    );
    if (!snapSlot || !bottomSnapTarget) return;
    const contentHeightTarget = this.#shadow.querySelector(
      '.sentinel[data-snap="content-height"]'
    );
    const intersectingTargets = /* @__PURE__ */ new Set();
    let previousSnapTarget = null;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            intersectingTargets.add(entry.target);
          } else {
            intersectingTargets.delete(entry.target);
          }
        });
        if (!entries[0]?.rootBounds?.height) {
          return;
        }
        const currentTarget = Array.from(intersectingTargets).filter((target) => target !== bottomSnapTarget).sort(
          (a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top
        ).at(-1);
        if (currentTarget === previousSnapTarget && // Never skip the "content-height" target even if it was the previous snap
        // target, because the computed snap index may be different if the content
        // height has changed since the last intersection update.
        currentTarget !== contentHeightTarget) {
          return;
        }
        if (!currentTarget) {
          if (intersectingTargets.has(bottomSnapTarget) || this.scrollTop > 1 || !this.hasAttribute("swipe-to-dismiss")) {
            return;
          }
          previousSnapTarget = bottomSnapTarget;
          this.#updateSnapPosition(bottomSnapTarget);
          return;
        }
        previousSnapTarget = currentTarget;
        this.#updateSnapPosition(currentTarget);
      },
      {
        root: this,
        rootMargin: "100% 0px -100% 0px"
      }
    );
    const sentinels = this.#shadow.querySelectorAll(".sentinel");
    Array.from(sentinels).forEach((sentinel) => {
      observer.observe(sentinel);
    });
    let observedSnapPoints = /* @__PURE__ */ new Set();
    const observeSnapPoints = () => {
      const snapPoints = new Set(snapSlot.assignedElements());
      observedSnapPoints.forEach((el) => {
        if (!snapPoints.has(el)) {
          observer.unobserve(el);
          intersectingTargets.delete(el);
        }
      });
      snapPoints.forEach((el) => observer.observe(el));
      observedSnapPoints = snapPoints;
    };
    snapSlot.addEventListener("slotchange", observeSnapPoints);
    observeSnapPoints();
    this.#cleanupIntersectionObserver = () => {
      snapSlot.removeEventListener("slotchange", observeSnapPoints);
      observer.disconnect();
      this.#cleanupIntersectionObserver = null;
    };
  }
  #updateSnapPosition(newSnapTarget) {
    const snapState = this.#calculateSnapState(newSnapTarget);
    if (!snapState) return;
    const { snapIndex, sheetState } = snapState;
    if (this.#currentSnapState?.snapIndex === snapIndex && this.#currentSnapState?.sheetState === sheetState) {
      return;
    }
    this.#currentSnapState = { ...snapState, snapTarget: newSnapTarget };
    this.dataset.sheetState = sheetState;
    this.dispatchEvent(
      new CustomEvent("snap-position-change", {
        detail: snapState,
        bubbles: true,
        composed: true
      })
    );
  }
  #calculateSnapState(snapTarget) {
    if (snapTarget instanceof HTMLElement && snapTarget.dataset.snap === "bottom") {
      return { snapIndex: 0, sheetState: "collapsed" };
    }
    const snapPoints = this.#getSnapPoints();
    if (!snapPoints) return null;
    const { assignedSnapPoints, maxExpandedIndex } = snapPoints;
    let topmostReachableIndex = maxExpandedIndex;
    if (this.hasAttribute("content-height")) {
      const maxSheetHeight = Math.min(
        this.offsetHeight,
        this.scrollHeight - this.offsetHeight
      );
      let minHeightGap = Infinity;
      for (let i = 0; i < assignedSnapPoints.length; i++) {
        const el = assignedSnapPoints[i];
        if (!(el instanceof HTMLElement)) continue;
        const snapOffset = el.offsetTop + 1;
        const heightGap = snapOffset - maxSheetHeight;
        if (heightGap >= 0 && heightGap < minHeightGap) {
          minHeightGap = heightGap;
          topmostReachableIndex = i + 1;
        }
      }
      if (snapTarget instanceof HTMLElement && snapTarget.dataset.snap === "content-height") {
        let closestSnapIndex = -1;
        let minScrollGap = Infinity;
        for (let i = 0; i < assignedSnapPoints.length; i++) {
          const el = assignedSnapPoints[i];
          if (!(el instanceof HTMLElement)) continue;
          const snapOffset = el.offsetTop + 1;
          const scrollGap = snapOffset - this.scrollTop;
          if (scrollGap >= 0 && scrollGap < minScrollGap) {
            minScrollGap = scrollGap;
            closestSnapIndex = i + 1;
          }
        }
        if (closestSnapIndex !== -1) {
          return {
            snapIndex: closestSnapIndex,
            sheetState: closestSnapIndex >= topmostReachableIndex ? "expanded" : "partially-expanded"
          };
        }
      }
    }
    if (snapTarget.matches('[slot="snap"]')) {
      const snapIndex = assignedSnapPoints.indexOf(snapTarget) + 1;
      return {
        snapIndex,
        sheetState: snapIndex >= topmostReachableIndex ? "expanded" : "partially-expanded"
      };
    }
    return { snapIndex: maxExpandedIndex, sheetState: "expanded" };
  }
  #handleScroll() {
    this.#shadow.querySelector(".sheet-wrapper")?.style.setProperty("--sheet-position", `${this.scrollTop}px`);
  }
  #setupNestedScrollResizeOptimization() {
    const wrapper = this.#shadow.querySelector(".sheet-wrapper");
    const sheet = this.#shadow.querySelector(".sheet");
    const content = this.#shadow.querySelector(".sheet-content");
    if (!wrapper || !sheet || !content) {
      return;
    }
    const SCROLL_END_TIMEOUT_MS = 100;
    const supportsScrollAnimations = CSS.supports(
      "scroll-timeline: --sheet-timeline y"
    );
    const supportScrollEnd = "onscrollend" in window && !CSS.supports("-moz-appearance", "none");
    let contentYOffsetStart, contentYOffsetEnd, scrollTimeout;
    const updateContentYOffset = () => {
      const t = this.scrollTop / (this.scrollHeight - this.offsetHeight);
      const contentTranslateY = (1 - t) * contentYOffsetStart + t * contentYOffsetEnd;
      wrapper.style.setProperty(
        "--sheet-content-offset",
        `${contentTranslateY}px`
      );
    };
    const cleanupStyleProperties = () => {
      delete this.dataset.scrolling;
      [
        "--sheet-content-offset",
        "--sheet-content-offset-start",
        "--sheet-content-offset-end"
      ].forEach((p) => wrapper.style.removeProperty(p));
    };
    const updateOffsetProperties = () => {
      wrapper.style.setProperty(
        "--sheet-content-offset-start",
        `${contentYOffsetStart}px`
      );
      wrapper.style.setProperty(
        "--sheet-content-offset-end",
        `${contentYOffsetEnd}px`
      );
    };
    const handleScrollEnd = () => {
      const style = getComputedStyle(content);
      const matrix = new DOMMatrixReadOnly(style.transform);
      const yOffset = -matrix.m42;
      cleanupStyleProperties();
      sheet.style.height = `${this.scrollTop / (this.scrollHeight - this.offsetHeight) * 100}%`;
      content.scrollTop = yOffset + content.scrollTop;
      sheet.style.height = "";
    };
    const handleScroll = () => {
      if (!("scrolling" in this.dataset)) {
        const contentMaxOffsetHeight = wrapper.offsetHeight - (sheet.offsetHeight - content.offsetHeight);
        const scrollBottomAnchorThreshold = content.scrollHeight - contentMaxOffsetHeight;
        if (Math.floor(content.scrollTop) > scrollBottomAnchorThreshold) {
          const contentScrollBottom = content.scrollHeight - content.offsetHeight - content.scrollTop;
          const sheetSizeFactor = wrapper.offsetHeight / (wrapper.offsetHeight - sheet.offsetHeight);
          contentYOffsetStart = -(content.scrollHeight + (sheet.offsetHeight - content.offsetHeight)) + contentScrollBottom * sheetSizeFactor;
          contentYOffsetEnd = -scrollBottomAnchorThreshold;
          this.dataset.scrolling = "";
          contentYOffsetStart += content.scrollTop;
          contentYOffsetEnd += content.scrollTop;
          updateOffsetProperties();
        } else {
          contentYOffsetStart = 0;
          contentYOffsetEnd = 0;
          updateOffsetProperties();
          this.dataset.scrolling = "";
        }
        if (!supportsScrollAnimations) {
          updateContentYOffset();
        }
        if ("ScrollTimeline" in window) {
          const timeline = new ScrollTimeline({
            source: this,
            axis: "y"
          });
          wrapper.style.setProperty(
            "--sheet-timeline-at-scroll-start",
            `${timeline.currentTime}`
          );
        }
      } else if (!supportsScrollAnimations) {
        updateContentYOffset();
      }
    };
    const handleFallbackScrollEnd = () => {
      window.clearTimeout(scrollTimeout);
      scrollTimeout = window.setTimeout(handleScrollEnd, SCROLL_END_TIMEOUT_MS);
    };
    this.addEventListener("scroll", handleScroll);
    if (supportScrollEnd) {
      this.addEventListener("scrollend", handleScrollEnd);
    } else {
      this.addEventListener("scroll", handleFallbackScrollEnd);
    }
    this.#cleanupNestedScrollResizeOptimization = () => {
      this.removeEventListener("scroll", handleScroll);
      if (supportScrollEnd) {
        this.removeEventListener("scrollend", handleScrollEnd);
      } else {
        this.removeEventListener("scroll", handleFallbackScrollEnd);
        window.clearTimeout(scrollTimeout);
      }
      cleanupStyleProperties();
      this.#cleanupNestedScrollResizeOptimization = null;
    };
  }
  #setupSheetSizeObserver() {
    let previousBlockSize = 0;
    const resizeObserver = new ResizeObserver((e) => {
      const blockSize = e.at(0)?.contentBoxSize.at(0)?.blockSize ?? 0;
      if (!blockSize || blockSize === previousBlockSize) return;
      previousBlockSize = blockSize;
      if (this.#currentSnapState) {
        this.#updateSnapPosition(this.#currentSnapState.snapTarget);
      }
    });
    const sheet = this.#shadow.querySelector(".sheet");
    if (sheet) {
      resizeObserver.observe(sheet);
    }
    this.#cleanupSheetSizeObserver = () => {
      resizeObserver.disconnect();
      this.#cleanupSheetSizeObserver = null;
    };
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    switch (name) {
      case "nested-scroll-optimization":
        if (newValue !== null) {
          if (!this.#cleanupNestedScrollResizeOptimization) {
            this.#setupNestedScrollResizeOptimization();
          }
        } else if (this.#cleanupNestedScrollResizeOptimization) {
          this.#cleanupNestedScrollResizeOptimization();
        }
        break;
      case "content-height":
        if (newValue !== null) {
          if (!this.#cleanupSheetSizeObserver) {
            this.#setupSheetSizeObserver();
          }
        } else if (this.#cleanupSheetSizeObserver) {
          this.#cleanupSheetSizeObserver();
        }
        break;
      default:
        console.warn(`Unhandled attribute: ${name}`);
    }
  }
  disconnectedCallback() {
    this.#cleanupIntersectionObserver?.();
    window.visualViewport?.removeEventListener(
      "resize",
      this.#handleViewportResize
    );
  }
}

class BottomSheetDialogManager extends HTMLElement {
  constructor() {
    super();
    const supportsDeclarative = HTMLElement.prototype.hasOwnProperty("attachInternals");
    const internals = supportsDeclarative ? this.attachInternals() : void 0;
    let shadow = internals?.shadowRoot;
    if (!shadow) {
      shadow = this.attachShadow({ mode: "open" });
      shadow.innerHTML = template$1;
    }
    this.addEventListener("click", (event) => {
      if (event.target instanceof HTMLDialogElement && event.target.matches(":modal")) {
        event.target.close();
      }
    });
    this.addEventListener(
      "snap-position-change",
      (event) => {
        if (event.detail) {
          this.dataset.sheetState = event.detail.sheetState;
        }
        if (event.detail?.sheetState === "collapsed" && event.target instanceof HTMLElement && event.target.hasAttribute("swipe-to-dismiss") && event.target.checkVisibility()) {
          const parent = event.target.parentElement;
          if (parent instanceof HTMLDialogElement && // Prevent Safari from closing the dialog immediately after opening
          // while the dialog open transition is still running.
          getComputedStyle(parent).getPropertyValue("translate") === "0px") {
            parent.close();
          }
        }
      }
    );
  }
}

function registerSheetElements() {
  customElements.define("bottom-sheet", BottomSheet);
  customElements.define(
    "bottom-sheet-dialog-manager",
    BottomSheetDialogManager
  );
}

export { BottomSheet, BottomSheetDialogManager, registerSheetElements };

