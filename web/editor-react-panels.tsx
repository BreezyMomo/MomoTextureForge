import { createPortal } from "react-dom";
import { uiText } from "./ui-language.js";
import {
  NodeTree,
  NodeCount,
  Breadcrumbs,
  ComponentNavigation,
} from "./editor-react-tree.tsx";
import { GraphicList } from "./editor-react-library.tsx";
import type { EditorPanels } from "./editor-react.tsx";

// Empty hosts below are the boundary for the existing canvas and specialist editors.
export function EditorPanelsView({ panels }: { panels: EditorPanels }) {
  return (
    <>
      {createPortal(
        <>
          <div className="tree-actions">
            <button id="add-shape">
              <span data-i18n="editor.shape">{uiText("editor.shape")}</span>
            </button>
            <button id="add-group">
              <span data-i18n="editor.group">{uiText("editor.group")}</span>
            </button>
            <button
              id="wrap-top-level"
              title={uiText("editor.wrapAllTopLevelNodesInANewGroup")}
              data-i18n-title="editor.wrapAllTopLevelNodesInANewGroup"
            >
              <span data-i18n="editor.wrapAllInGroup">
                {uiText("editor.wrapAllInGroup")}
              </span>
            </button>
            <button id="duplicate">
              <span data-i18n="common.duplicate">
                {uiText("common.duplicate")}
              </span>
            </button>
            <button id="delete">
              <span data-i18n="common.delete">{uiText("common.delete")}</span>
            </button>
            <small
              id="node-count"
              className="tree-node-count"
              title={uiText("editor.nodeCountLimit")}
              data-i18n-title="editor.nodeCountLimit"
            >
              <NodeCount />
            </small>
          </div>
          <div id="component-nav" className="tree-actions">
            <ComponentNavigation />
          </div>
          <div
            id="node-tree"
            role="tree"
            aria-label={uiText("editor.canvasNodeTree")}
            data-i18n-aria-label="editor.canvasNodeTree"
          >
            <NodeTree />
          </div>
        </>,
        panels.nodes,
      )}
      {createPortal(
        <>
          <div className="tree-library-search">
            <input
              id="shape-search"
              placeholder={uiText("editor.searchGraphics")}
              data-i18n-placeholder="editor.searchGraphics"
              aria-label={uiText("editor.searchComponents")}
              data-i18n-aria-label="editor.searchComponents"
            />
            <button id="collapse-library" type="button">
              <span data-i18n="editor.collapseAll">
                {uiText("editor.collapseAll")}
              </span>
            </button>
          </div>
          <section className="tree-library-filters">
            <div
              id="library-filter"
              className="library-browse-modes"
              role="group"
              aria-label={uiText("library.browseModes")}
              data-i18n-aria-label="library.browseModes"
            ></div>
            <div
              id="library-categories"
              className="library-filter-chips library-category-chips"
              role="group"
              aria-label={uiText("library.graphicCategories")}
              data-i18n-aria-label="library.graphicCategories"
            ></div>
          </section>
          <label className="tree-library-filter tree-library-view">
            <span>
              <span data-i18n="editor.view">{uiText("editor.view")}</span>
            </span>
            <select
              id="shape-library-view"
              aria-label={uiText("editor.libraryView")}
              data-i18n-aria-label="editor.libraryView"
            >
              <option value="grid" data-i18n="editor.thumbnailGrid">
                {uiText("editor.thumbnailGrid")}
              </option>
              <option value="list" data-i18n="editor.list">
                {uiText("editor.list")}
              </option>
            </select>
          </label>
          <div id="shape-library" className="tree-library-grid">
            <GraphicList />
          </div>
        </>,
        panels.library,
      )}
      {createPortal(
        <>
          <nav
            id="breadcrumbs"
            aria-label={uiText("editor.nodePath")}
            data-i18n-aria-label="editor.nodePath"
          >
            <Breadcrumbs />
          </nav>
          <div className="preview-heading">
            <strong id="preview-title">
              <span data-i18n="editor.compositePreview">
                {uiText("editor.compositePreview")}
              </span>
            </strong>
            <label className="preview-mode-label">
              <span data-i18n="editor.textureChannel">
                {uiText("editor.textureChannel")}
              </span>
              <select
                id="preview-channel"
                aria-label={uiText("editor.previewTextureChannel")}
                data-i18n-aria-label="editor.previewTextureChannel"
              >
                <option value="color" data-i18n="inspector.color">
                  {uiText("inspector.color")}
                </option>
                <option value="height" data-i18n="editor.height">
                  {uiText("editor.height")}
                </option>
                <option value="normal" data-i18n="editor.normal">
                  {uiText("editor.normal")}
                </option>
                <option value="rgba" data-i18n="editor.customRGBA">
                  {uiText("editor.customRGBA")}
                </option>
              </select>
            </label>
            <label className="preview-mode-label">
              <span data-i18n="editor.previewMode">
                {uiText("editor.previewMode")}
              </span>
              <select
                id="preview-mode"
                aria-label={uiText("editor.previewMode")}
                data-i18n-aria-label="editor.previewMode"
              >
                <option value="canvas" data-i18n="editor.dCanvas">
                  {uiText("editor.dCanvas")}
                </option>
                <option value="material" data-i18n="editor.dMaterial">
                  {uiText("editor.dMaterial")}
                </option>
                <option value="effect" data-i18n="editor.effectPreview">
                  {uiText("editor.effectPreview")}
                </option>
              </select>
            </label>
            <span id="render-status">
              <span data-i18n="editor.loading">{uiText("editor.loading")}</span>
            </span>
            <div className="preview-actions">
              <button id="return-work" hidden>
                <span data-i18n="editor.returnToCanvas">
                  {uiText("editor.returnToCanvas")}
                </span>
              </button>
              <button id="preview-add" hidden>
                <span data-i18n="editor.addComponent">
                  {uiText("editor.addComponent")}
                </span>
              </button>
              <button id="preview-reset" hidden>
                <span data-i18n="editor.resetResource">
                  {uiText("editor.resetResource")}
                </span>
              </button>
              <button id="preview-save" hidden>
                <span data-i18n="editor.saveAsNewComponent">
                  {uiText("editor.saveAsNewComponent")}
                </span>
              </button>
              <button id="preview-update" hidden>
                <span data-i18n="editor.updateComponent">
                  {uiText("editor.updateComponent")}
                </span>
              </button>
              <button id="preview-undo-update" hidden>
                <span data-i18n="editor.undoUpdate">
                  {uiText("editor.undoUpdate")}
                </span>
              </button>
              <button
                id="save-selected-component"
                aria-label={uiText("editor.saveSelectionToLibrary")}
                data-i18n-aria-label="editor.saveSelectionToLibrary"
                title={uiText("editor.saveTheSelectedNodeAndItsChildren")}
                data-i18n-title="editor.saveTheSelectedNodeAndItsChildren"
              >
                <span data-i18n="editor.saveSelectionToLibrary">
                  {uiText("editor.saveSelectionToLibrary")}
                </span>
              </button>
              <button
                id="save-whole-library"
                title={uiText("editor.saveEveryNodeOnTheCanvasAsAComposition")}
                data-i18n-title="editor.saveEveryNodeOnTheCanvasAsAComposition"
              >
                <span data-i18n="editor.saveCanvasToLibrary">
                  {uiText("editor.saveCanvasToLibrary")}
                </span>
              </button>
              <button id="save-project-resource">
                <span data-i18n="editor.saveAsGraphic">
                  {uiText("editor.saveAsGraphic")}
                </span>
              </button>
              <button id="update-project-resource">
                <span data-i18n="editor.updateGraphic">
                  {uiText("editor.updateGraphic")}
                </span>
              </button>
              <button id="solo" aria-pressed="false">
                <span data-i18n="editor.soloPreview">
                  {uiText("editor.soloPreview")}
                </span>
              </button>
            </div>
          </div>
          <div
            id="normal-preview-settings"
            className="normal-preview-settings"
            role="group"
            aria-label={uiText("editor.normalMapSettings")}
            data-i18n-aria-label="editor.normalMapSettings"
            hidden
          ></div>
          <div id="material-preview-controls" hidden></div>
          <div id="effect-preview-controls" hidden></div>
          <div id="canvas-stage" className="checker">
            <div id="tree-preview-surface">
              <canvas
                id="tree-canvas"
                aria-label={uiText("editor.nodeCompositionPreview")}
                data-i18n-aria-label="editor.nodeCompositionPreview"
              ></canvas>
              <svg
                id="selection-guide"
                viewBox="0 0 1000 1000"
                preserveAspectRatio="none"
                aria-label={uiText("editor.selectedNodeBounds")}
                data-i18n-aria-label="editor.selectedNodeBounds"
                {...{ hidden: true }}
              ></svg>
            </div>
            <div id="material-preview" hidden></div>
            <div id="effect-preview" hidden></div>
          </div>
          <div id="preview-error" role="alert" hidden>
            <span></span>
            <button id="retry-render">
              <span data-i18n="editor.retryPreview">
                {uiText("editor.retryPreview")}
              </span>
            </button>
          </div>
          <div id="guide-note" className="tree-note"></div>
          <div id="preview-2d-toolbar" className="tree-toolbar">
            <label>
              <span data-i18n="editor.zoom">{uiText("editor.zoom")}</span>
              <select id="zoom">
                <option value="fit" data-i18n="editor.fitWindow">
                  {uiText("editor.fitWindow")}
                </option>
                <option value="0.25">25%</option>
                <option value="0.5">50%</option>
                <option value="0.75">75%</option>
                <option value="1" data-i18n="editor.fitSize">
                  {uiText("editor.fitSize")}
                </option>
                <option value="1.25">125%</option>
                <option value="1.5">150%</option>
                <option value="2">200%</option>
                <option value="3">300%</option>
                <option value="4">400%</option>
              </select>
            </label>
            <div id="canvas-background">
              <label>
                <span></span>
                <select id="background"></select>
              </label>
            </div>
            <label>
              <input type="checkbox" id="show-guides" />
              <span data-i18n="editor.nodeBounds">
                {uiText("editor.nodeBounds")}
              </span>
            </label>
            <label>
              <input type="checkbox" id="show-pivot" defaultChecked />
              <span data-i18n="editor.showPivot">
                {uiText("editor.showPivot")}
              </span>
            </label>
            <button id="tile-preview" aria-pressed="false">
              <span data-i18n="editor.tilePreview">
                {uiText("editor.tilePreview")}
              </span>
            </button>
            <label>
              <span data-i18n="editor.tileCount">
                {uiText("editor.tileCount")}
              </span>
              <select
                id="tile-grid"
                aria-label={uiText("editor.tilePreviewLayout")}
                data-i18n-aria-label="editor.tilePreviewLayout"
                title={uiText("editor.chooseATilingPresetPreviewOnly")}
                data-i18n-title="editor.chooseATilingPresetPreviewOnly"
              >
                <option value="2">2×2</option>
                <option value="3">3×3</option>
                <option value="4">4×4</option>
              </select>
            </label>
            <button id="pan-preview" aria-pressed="false">
              <span data-i18n="editor.panCanvas">
                {uiText("editor.panCanvas")}
              </span>
            </button>
            <button id="grab-uv" aria-pressed="false">
              <span data-i18n="editor.editUV">{uiText("editor.editUV")}</span>
            </button>
          </div>
          <div
            className="tree-timeline"
            role="group"
            aria-label={uiText("editor.animationPlayback")}
            data-i18n-aria-label="editor.animationPlayback"
          >
            <button id="play">
              <span data-i18n="playback.play">{uiText("playback.play")}</span>
            </button>
            <button id="restart-play">
              <span data-i18n="editor.restart">{uiText("editor.restart")}</span>
            </button>
            <label className="play-duration">
              <span data-i18n="animation.cycle">
                {uiText("animation.cycle")}
              </span>{" "}
              <input
                id="play-duration"
                type="number"
                min="0.05"
                max="600"
                step="0.05"
                aria-label={uiText("animation.cycleSeconds")}
                data-i18n-aria-label="animation.cycleSeconds"
                title={uiText("animation.cycleExplanation")}
                data-i18n-title="animation.cycleExplanation"
              />{" "}
              <span data-i18n="editor.s">{uiText("editor.s")}</span>
            </label>
            <label>
              <span data-i18n="editor.scopeProgress">
                {uiText("editor.scopeProgress")}
              </span>{" "}
              <output id="time-value">0.000</output>
            </label>
            <input
              id="tree-time"
              type="range"
              min="0"
              max="1"
              step="0.001"
              defaultValue="0"
              aria-label={uiText("editor.scopeProgressSlider")}
              data-i18n-aria-label="editor.scopeProgressSlider"
            />
            <span id="local-time"></span>
          </div>
          <button
            id="open-docked-timeline"
            className="dock-open-timeline"
            type="button"
            data-i18n="editor.animationEditorTimeline"
          >
            {uiText("editor.animationEditorTimeline")}
          </button>
          <p id="preview-hint" className="tree-hint">
            <span data-i18n="editor.clickToSelectDragToMoveDoubleClickToEnterA">
              {uiText("editor.clickToSelectDragToMoveDoubleClickToEnterA")}
            </span>
          </p>
        </>,
        panels.canvas,
      )}
      {createPortal(
        <>
          <summary hidden>
            <span data-i18n="editor.animationEditorTimeline">
              {uiText("editor.animationEditorTimeline")}
            </span>
          </summary>
          <div id="node-animation-editor"></div>
        </>,
        panels.timeline,
      )}
      {createPortal(
        <>
          <div id="selected-heading"></div>
          <div id="selected-path" className="tree-note"></div>
          <nav id="inspector-tabs" className="momo-tabs"></nav>
          <div id="inspector"></div>
        </>,
        panels.inspector,
      )}
      <div id="tree-toast" role="status"></div>
      <div
        id="global-panel"
        className="tree-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="global-title"
        hidden
      >
        <section>
          <header>
            <h2 id="global-title"></h2>
            <button
              id="close-global"
              aria-label={uiText("editor.closePanel")}
              data-i18n-aria-label="editor.closePanel"
            >
              <span data-i18n="common.close">{uiText("common.close")}</span>
            </button>
          </header>
          <div id="global-controls"></div>
          <footer id="global-actions" hidden></footer>
        </section>
      </div>
    </>
  );
}
