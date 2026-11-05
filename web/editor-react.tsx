import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { EditorPanelsView } from "./editor-react-panels.tsx";
import {
  createViewStore,
  dispatchEditorEvent,
  useViewStore,
} from "./editor-react-state.ts";
import { uiText } from "./ui-language.js";
import { interfaceLanguage, onLanguageChange } from "./language.js";
import { installLanguageSelector } from "./language-settings.js";
import { installAppearanceTrigger } from "./appearance-settings.js";
import { documentationURL, repositoryURL } from "./documentation-links.js";
export { editorHandlers } from "./editor-react-state.ts";
export { treeView } from "./editor-react-tree.tsx";
export { createReactGraphicListView } from "./editor-react-library.tsx";

export type EditorPanels = Record<
  "nodes" | "library" | "canvas" | "inspector" | "timeline",
  HTMLElement
>;
export const headerView = createViewStore({
  projectName: "",
  canUndo: false,
  canRedo: false,
  componentPreview: false,
});

function ProjectName() {
  const { projectName } = useViewStore(headerView);
  const [value, setValue] = useState(projectName);
  useLayoutEffect(() => setValue(projectName), [projectName]);
  return (
    <input
      id="project-name"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      aria-label={uiText("editor.canvasName")}
      title={uiText("editor.canvasName")}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
    />
  );
}

function WorkbenchHeaderControls() {
  const language = useRef<HTMLSelectElement>(null),
    appearance = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    const selector = installLanguageSelector(language.current, {
      notify: (text: string) =>
        window.dispatchEvent(
          new CustomEvent("momo-editor-notify", { detail: text }),
        ),
    });
    const trigger = installAppearanceTrigger(appearance.current);
    return () => {
      selector.dispose();
      trigger.dispose();
    };
  }, []);
  return (
    <>
      <button
        id="appearance-settings"
        ref={appearance}
        type="button"
        className="appearance-trigger"
      />
      <select id="language-settings" ref={language} />
    </>
  );
}

function EditorHeader() {
  const state = useViewStore(headerView),
    media = useRef(window.matchMedia("(max-width:1100px)"));
  const [compact, setCompact] = useState(media.current.matches),
    movedFocus = useRef<string | null>(null);
  useLayoutEffect(() => {
    const update = () => {
      movedFocus.current = (document.activeElement as HTMLElement)?.id;
      setCompact(media.current.matches);
    };
    media.current.addEventListener("change", update);
    return () => media.current.removeEventListener("change", update);
  }, []);
  useLayoutEffect(() => {
    const id = movedFocus.current;
    movedFocus.current = null;
    if (id !== "project-settings" && id !== "tree-examples") return;
    const selector = compact
      ? id === "project-settings"
        ? "#header-file-menu>summary"
        : "#header-resource-menu>summary"
      : "#" + id;
    document.querySelector<HTMLElement>(selector)?.focus();
  }, [compact]);
  const settings = (
    <button id="project-settings">{uiText("editor.canvasSettings")}</button>
  );
  const examples = (
    <button id="tree-examples">{uiText("menu.examples")}</button>
  );
  const language = interfaceLanguage();
  return (
    <header className="tree-header">
      <div className="tree-brand">
        <strong>
          MOMO <span>TEXTURE FORGE</span>
        </strong>
        <ProjectName />
      </div>
      <div
        className="tree-canvas-actions"
        role="group"
        aria-label={uiText("editor.canvasActions")}
      >
        <details id="header-file-menu" className="header-dropdown">
          <summary>{uiText("menu.file")}</summary>
          <div className="header-dropdown-panel">
            <button id="new-project">{uiText("editor.newCanvas")}</button>
            <button id="open-project">{uiText("editor.openProject")}</button>
            <button id="save-project" disabled={state.componentPreview}>
              {uiText("editor.saveProject")}
            </button>
            <hr />
            <button id="share-project" disabled={state.componentPreview}>
              {uiText("editor.shareConfiguration")}
            </button>
            {compact && (
              <>
                <hr />
                {settings}
              </>
            )}
          </div>
        </details>
        <span className="header-history">
          <button
            id="undo"
            disabled={!state.canUndo}
            className="header-icon-button"
            aria-label={uiText("common.undo")}
            title={uiText("header.undoShortcut")}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M8 4 3 9l5 5M3 9h11a6 6 0 0 1 0 12h-3" />
            </svg>
          </button>
          <button
            id="redo"
            disabled={!state.canRedo}
            className="header-icon-button"
            aria-label={uiText("common.redo")}
            title={uiText("header.redoShortcut")}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="m16 4 5 5-5 5m5-5H10a6 6 0 0 0 0 12h3" />
            </svg>
          </button>
        </span>
        {!compact && settings}
        <button id="export-now" className="primary">
          {uiText("editor.export")}
        </button>
      </div>
      <div
        className="tree-resource-actions"
        role="group"
        aria-label={uiText("header.resources")}
      >
        <button id="open-graphics-library">
          {uiText("menu.graphicsLibrary")}
        </button>
        {!compact && examples}
        {compact && (
          <details id="header-resource-menu" className="header-dropdown">
            <summary
              aria-label={uiText("header.moreResources")}
              title={uiText("header.moreResources")}
            />
            <div className="header-dropdown-panel">{examples}</div>
          </details>
        )}
      </div>
      <div
        className="tree-tool-actions"
        role="group"
        aria-label={uiText("editor.tools")}
      >
        <span id="workspace-layout-slot" style={{ display: "contents" }} />
        <WorkbenchHeaderControls />
        <button id="ai-tools" type="button" />
        <button
          id="support-project"
          title={uiText("editor.scanWithWeChatToSupportContinuedDevelopment")}
        >
          <svg
            className="header-support-icon"
            aria-hidden="true"
            viewBox="0 0 24 24"
          >
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
          </svg>
          {uiText("menu.support")}
        </button>
        <details id="header-help-menu" className="header-dropdown header-help">
          <summary
            className="momo-header-button"
            data-momo-header-control="true"
          >
            <span className="momo-header-label">{uiText("header.help")}</span>
          </summary>
          <div className="header-dropdown-panel">
            <button id="tool-help">{uiText("editor.quickGuide")}</button>
            <button id="license-help">{uiText("help.licensing")}</button>
            <a
              id="detailed-help"
              href={documentationURL("README.md", language)}
              target="_blank"
              rel="noopener noreferrer"
              title={uiText(
                "editor.openTheREADMEAndIllustratedTutorialsInANewTab",
              )}
            >
              {uiText("editor.detailedGuide")}
            </a>
            <hr />
            <a
              id="github-repository"
              href={repositoryURL(
                "https://github.com/BreezyMomo/MomoTextureForge",
                language,
              )}
              target="_blank"
              rel="noopener noreferrer"
              title={uiText(
                "editor.viewTheSourceReportIssuesOrContributeOpensANewTab",
              )}
            >
              {uiText("editor.githubRepository")}
            </a>
            <a
              id="gitee-repository"
              href={repositoryURL(
                "https://gitee.com/BreezyMomo/MomoTextureForge",
                language,
              )}
              target="_blank"
              rel="noopener noreferrer"
              title={uiText(
                "editor.openTheSourceMirrorAndDocumentationOpensANewTab",
              )}
            >
              {uiText("editor.giteeRepository")}
            </a>
          </div>
        </details>
      </div>
      <input type="file" id="project-file" accept=".json,.zip" hidden />
      <input
        type="file"
        id="preset-file"
        accept=".json,.zip,.png,.jpg,.jpeg,.webp"
        hidden
      />
    </header>
  );
}

function EditorApp({ panels }: { panels: EditorPanels }) {
  useSyncExternalStore(onLanguageChange, interfaceLanguage, interfaceLanguage);
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    // Preserve native change/commit timing while the document controller is migrated.
    const owns = (target: Node) =>
      ref.current?.contains(target) ||
      Object.values(panels).some((panel) => panel.contains(target));
    const change = (event: Event) => {
      const target = event.target as HTMLElement;
      if (target.id && owns(target))
        dispatchEditorEvent(target.id, event.type, event);
    };
    const dismiss = (event: MouseEvent) => {
      for (const menu of document.querySelectorAll<HTMLDetailsElement>(
        ".header-dropdown",
      )) {
        const target = event.target as HTMLElement;
        if (
          !menu.contains(target) ||
          (target.closest("button") &&
            !menu.classList.contains("dock-layout-menu"))
        )
          menu.open = false;
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      for (const menu of document.querySelectorAll<HTMLDetailsElement>(
        ".header-dropdown[open]",
      )) {
        menu.open = false;
        menu.querySelector("summary")?.focus();
        event.preventDefault();
      }
    };
    document.addEventListener("change", change);
    document.addEventListener("input", change);
    document.addEventListener("click", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("change", change);
      document.removeEventListener("input", change);
      document.removeEventListener("click", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [panels]);
  return (
    <div
      ref={ref}
      style={{ display: "contents" }}
      onClick={(event) => {
        const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
          "button[id]",
        );
        if (button && !button.disabled)
          dispatchEditorEvent(button.id, "click", event.nativeEvent);
      }}
    >
      <EditorHeader />
      <main className="tree-workspace" style={{isolation: "isolate"}} />
      <EditorPanelsView panels={panels} />
    </div>
  );
}

export function mountReactEditor() {
  document.body.className = "tree-editor";
  document.getElementById("toast")?.remove();
  const container = document.createElement("div");
  container.id = "texture-forge-root";
  container.style.display = "contents";
  document.body.append(container);
  const panel = (tag: string, className: string) => {
    const element = document.createElement(tag);
    element.className = className;
    return element;
  };
  const panels: EditorPanels = {
    nodes: panel("div", "tree-left dock-nodes-content"),
    library: panel("div", "tree-left dock-library-content"),
    canvas: panel("section", "tree-preview"),
    inspector: panel("aside", "tree-inspector"),
    timeline: panel("details", ""),
  };
  panels.timeline.id = "animation-panel";
  const root: Root = createRoot(container);
  flushSync(() => root.render(<EditorApp panels={panels} />));
  // Mount content before initializing canvas contexts, subscriptions and docking.
  document.querySelector(".tree-workspace")!.append(...Object.values(panels));
  let disposed = false;
  return {
    panels,
    dispose() {
      if (disposed) return;
      disposed = true;
      root.unmount();
      container.remove();
      for (const panel of Object.values(panels)) panel.remove();
    },
  };
}
