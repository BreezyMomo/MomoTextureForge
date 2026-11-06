import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { EditorPanelsView } from "./editor-react-panels.tsx";
import {
  createViewStore,
  dispatchEditorEvent,
  useViewStore,
} from "./editor-react-state.ts";
import { uiFormat, uiError, uiText } from "./ui-language.js";
import {
  controller as languageController,
  interfaceLanguage,
  onLanguageChange,
} from "./language.js";
import { appearance } from "./appearance.js";
import {
  WorkbenchProvider,
  WorkbenchAppearance,
  WorkbenchLanguageSelect,
  Button,
  Input,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  mountDockMenu as mountSharedDockMenu,
  ChevronDown, Undo2, Redo2, Heart,
} from "@momo/workbench/react";
import type { ReactNode } from "react";
export const mountDockMenu = (
  options: Parameters<typeof mountSharedDockMenu>[0],
) =>
  mountSharedDockMenu({
    ...options,
    appearance: appearance!,
    language: languageController,
  });
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
    <Input
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

function HeaderMenu({
  id,
  label,
  children,
  align = "start",
}: {
  id: string;
  label: ReactNode;
  children: ReactNode;
  align?: "start" | "end";
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger id={id} render={<Button variant="outline" />}>
        {label}
        <ChevronDown data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} id={id + "-content"}>
        <DropdownMenuGroup>{children}</DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
function CommandItem({
  id,
  children,
  disabled,
}: {
  id: string;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <DropdownMenuItem
      id={id}
      disabled={disabled}
      onClick={(event) => dispatchEditorEvent(id, "click", event.nativeEvent)}
    >
      {children}
    </DropdownMenuItem>
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
    if (id !== "project-settings") return;
    document
      .getElementById(
        compact ? "header-file-menu" : id,
      )
      ?.focus();
  }, [compact]);
  const language = interfaceLanguage();
  return (
    <header className="tree-header" data-react-chrome="nova">
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
        <HeaderMenu id="header-file-menu" label={uiText("menu.file")}>
          <CommandItem id="new-project">
            {uiText("editor.newCanvas")}
          </CommandItem>
          <CommandItem id="open-project">
            {uiText("editor.openProject")}
          </CommandItem>
          <CommandItem id="save-project" disabled={state.componentPreview}>
            {uiText("editor.saveProject")}
          </CommandItem>
          <DropdownMenuSeparator />
          <CommandItem id="share-project" disabled={state.componentPreview}>
            {uiText("editor.shareConfiguration")}
          </CommandItem>
          {compact && (
            <>
              <DropdownMenuSeparator />
              <CommandItem id="project-settings">
                {uiText("editor.canvasSettings")}
              </CommandItem>
            </>
          )}
        </HeaderMenu>
        <span className="header-history">
          <Button
            id="undo"
            variant="ghost"
            size="icon"
            disabled={!state.canUndo}
            aria-label={uiText("common.undo")}
            title={uiText("header.undoShortcut")}
          >
            <Undo2 />
          </Button>
          <Button
            id="redo"
            variant="ghost"
            size="icon"
            disabled={!state.canRedo}
            aria-label={uiText("common.redo")}
            title={uiText("header.redoShortcut")}
          >
            <Redo2 />
          </Button>
        </span>
        {!compact && (
          <Button id="project-settings" variant="ghost">
            {uiText("editor.canvasSettings")}
          </Button>
        )}
        <Button id="export-now">{uiText("editor.export")}</Button>
      </div>
      <div
        className="tree-resource-actions"
        role="group"
        aria-label={uiText("header.resources")}
      >
        <Button id="tree-examples" variant="ghost">
          {uiText("menu.examples")}
        </Button>
      </div>
      <div
        className="tree-tool-actions"
        role="group"
        aria-label={uiText("editor.tools")}
      >
        <span id="workspace-layout-slot" style={{ display: "contents" }} />
        <WorkbenchAppearance id="appearance-settings" />
        <WorkbenchLanguageSelect
          id="language-settings"
          onError={(error) =>
            window.dispatchEvent(
              new CustomEvent("momo-editor-notify", { detail: uiError(error) }),
            )
          }
        />
        <Button id="ai-tools" variant="ghost" />
        <Button
          id="support-project"
          variant="ghost"
          title={uiText("editor.scanWithWeChatToSupportContinuedDevelopment")}
        >
          <Heart data-icon="inline-start" />
          {uiText("menu.support")}
        </Button>
        <HeaderMenu
          id="header-help-menu"
          label={uiText("header.help")}
          align="end"
        >
          <CommandItem id="tool-help">
            {uiText("editor.quickGuide")}
          </CommandItem>
          <CommandItem id="license-help">
            {uiText("help.licensing")}
          </CommandItem>
          <DropdownMenuItem
            id="detailed-help"
            render={
              <a
                href={documentationURL("README.md", language)}
                target="_blank"
                rel="noopener noreferrer"
                title={uiText(
                  "editor.openTheREADMEAndIllustratedTutorialsInANewTab",
                )}
              />
            }
          >
            {uiText("editor.detailedGuide")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            id="github-repository"
            render={
              <a
                href={repositoryURL(
                  "https://github.com/BreezyMomo/MomoTextureForge",
                  language,
                )}
                target="_blank"
                rel="noopener noreferrer"
                title={uiText(
                  "editor.viewTheSourceReportIssuesOrContributeOpensANewTab",
                )}
              />
            }
          >
            {uiText("editor.githubRepository")}
          </DropdownMenuItem>
          <DropdownMenuItem
            id="gitee-repository"
            render={
              <a
                href={repositoryURL(
                  "https://gitee.com/BreezyMomo/MomoTextureForge",
                  language,
                )}
                target="_blank"
                rel="noopener noreferrer"
                title={uiText(
                  "editor.openTheSourceMirrorAndDocumentationOpensANewTab",
                )}
              />
            }
          >
            {uiText("editor.giteeRepository")}
          </DropdownMenuItem>
        </HeaderMenu>
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
    document.addEventListener("change", change);
    document.addEventListener("input", change);
    return () => {
      document.removeEventListener("change", change);
      document.removeEventListener("input", change);
    };
  }, [panels]);
  return (
    <WorkbenchProvider
      appearance={appearance!}
      language={languageController}
      ui={{ text: uiText, format: uiFormat, onLanguageChange }}
    >
      <div
        ref={ref}
        style={{ display: "contents" }}
        onClick={(event) => {
          const button = (
            event.target as HTMLElement
          ).closest<HTMLButtonElement>("button[id]");
          if (button && !button.disabled)
            dispatchEditorEvent(button.id, "click", event.nativeEvent);
        }}
      >
        <EditorHeader />
        <main className="tree-workspace" style={{ isolation: "isolate" }} />
        <EditorPanelsView panels={panels} />
      </div>
    </WorkbenchProvider>
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
