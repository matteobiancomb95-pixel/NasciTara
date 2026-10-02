import "@testing-library/jest-dom/vitest";
/** Polyfill minimi per jsdom: <dialog>, matchMedia, scroll. Nei test in node non fanno nulla. */
if (typeof window !== 'undefined') {
  const proto = window.HTMLDialogElement?.prototype;
  if (proto && !proto.showModal) {
    proto.showModal = function (this: HTMLDialogElement) { this.setAttribute('open', ''); };
    proto.close = function (this: HTMLDialogElement) { this.removeAttribute('open'); this.dispatchEvent(new Event('close')); };
  }
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false })) as typeof window.matchMedia;
  window.scrollTo = (() => {}) as typeof window.scrollTo;
  Element.prototype.scrollTo = function () {} as typeof Element.prototype.scrollTo;
}
