export function isStandalone() {
  return document.documentElement.dataset.distribution === "standalone";
}
export function pageHref(view = "editor", hash = "") {
  if (isStandalone()) {
    const url = new URL(location.href);
    url.search = view === "editor" ? "" : `?view=${view}`;
    url.hash = hash;
    return url.href;
  }
  return new URL(view === "examples" ? "./examples.html" : view === "validate" ? "./validate.html" : "./", location.href).href + hash;
}
