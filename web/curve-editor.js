import {uiText} from './ui-language.js';
const NS = "http://www.w3.org/2000/svg";
export function createCurveEditor(read, { begin, point, end, canEdit = () => true }) {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 300 300");
  svg.setAttribute("class", "curve-editor");
  svg.setAttribute("aria-label", uiText("ui.bZierControlPointEditor"));
  const element = (name, attrs) => {
    const node = document.createElementNS(NS, name);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    svg.append(node); return node;
  };
  for (let n = 0; n <= 6; n++) {
    element("line", { x1: n*50, y1: 0, x2: n*50, y2: 300, class: "curve-grid" });
    element("line", { x1: 0, y1: n*50, x2: 300, y2: n*50, class: "curve-grid" });
  }
  const guides = [element("line", { class: "curve-guide" }), element("line", { class: "curve-guide" })];
  const path = element("path", { class: "curve-path", fill: "none" });
  const handles = Array.from({ length: 4 }, (_, i) => element("circle", {
    r: 7, class: "curve-handle", "data-point": i, tabindex: 0, role: "button",
    "aria-label": uiText(["ui.dragStart", "ui.dragControlPoint", "canvas.dragControlPoint2", "ui.dragEnd"][i]),
  }));
  const coords = (p, i) => [150+p[i*2]*100, 150-p[i*2+1]*100];
  const update = () => {
    const p = read(), points = handles.map((h, i) => {
      const [x, y] = coords(p, i); h.setAttribute("cx", x); h.setAttribute("cy", y); return [x, y];
    });
    path.setAttribute("d", `M${points[0]} C${points[1]} ${points[2]} ${points[3]}`);
    guides.forEach((line, i) => {
      const a = points[i ? 2 : 0], b = points[i ? 3 : 1];
      for (const [name, value] of Object.entries({ x1:a[0], y1:a[1], x2:b[0], y2:b[1] })) line.setAttribute(name, value);
    });
  };
  let dragging = null;
  const move = (event) => {
    if (dragging === null || !canEdit()) return;
    const box = svg.getBoundingClientRect();
    const x = Math.max(-1.5, Math.min(1.5, (event.clientX-box.left)/box.width*3-1.5));
    const y = Math.max(-1.5, Math.min(1.5, 1.5-(event.clientY-box.top)/box.height*3));
    point(dragging, Math.round(x*100)/100, Math.round(y*100)/100); update();
  };
  svg.addEventListener("pointerdown", (event) => {
    const index = event.target.getAttribute?.("data-point");
    if (!canEdit() || index === null || index === undefined || event.button !== 0) return;
    event.preventDefault(); dragging = Number(index); begin();
    svg.setPointerCapture(event.pointerId);
  });
  svg.addEventListener("pointermove", move);
  const stop = () => { if (dragging !== null) { dragging = null; end(); } };
  svg.addEventListener("pointerup", stop); svg.addEventListener("pointercancel", stop);
  handles.forEach((handle, index) => handle.addEventListener("keydown", (event) => {
    const delta = { ArrowLeft:[-.01,0], ArrowRight:[.01,0], ArrowUp:[0,.01], ArrowDown:[0,-.01] }[event.key];
    if (!delta || !canEdit()) return;
    event.preventDefault(); event.stopPropagation(); begin();
    const p = read(); point(index, Math.max(-1.5, Math.min(1.5,p[index*2]+delta[0])), Math.max(-1.5,Math.min(1.5,p[index*2+1]+delta[1])));
    update(); end();
  }));
  svg.refreshCurve = update;
  update(); return svg;
}
