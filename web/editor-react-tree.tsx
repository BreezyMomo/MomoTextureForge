import { Fragment, useLayoutEffect, useRef, useState } from "react";
import { createViewStore, useViewStore } from "./editor-react-state.ts";
import { uiText, uiFormat } from "./ui-language.js";

export type TreeRow = {
  id: string;
  name: string;
  depth: number;
  branch: boolean;
  expanded: boolean;
  selected: boolean;
  primary: boolean;
  enabled: boolean;
  icon: string;
  blend: string;
  animated: boolean;
  pinned: boolean;
  shortcuts: boolean;
};
type TreeView = {
  rows: TreeRow[];
  count: number;
  path: { id: string; name: string }[];
  componentName: string | null;
  actions: {
    select(id: string, event?: MouseEvent): void;
    rename(id: string, name: string): void;
    remove(id: string): void;
    visibility(id: string): void;
    toggle(id: string): void;
    returnWork(): void;
    attachDrag(element: HTMLDivElement, id: string): void;
    dropOver(event: DragEvent): void;
    dropLeave(event: DragEvent): void;
    drop(event: DragEvent): void;
  } | null;
};
export const treeView = createViewStore<TreeView>({
  rows: [],
  count: 0,
  path: [],
  componentName: null,
  actions: null,
});

// Reuse the product's icon geometry without coupling the model to React or the DOM.
import { editorIconPaths } from "./editor-icons.js";
export function EditorIcon({
  name,
  hidden = false,
}: {
  name: string;
  hidden?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="editor-icon"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={name === "drag" || name === "more" ? 3 : 1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={(editorIconPaths as Record<string, string>)[name]} />
      {hidden && <path d="M3 3 21 21" />}
    </svg>
  );
}

function NodeRow({
  row,
  actions,
}: {
  row: TreeRow;
  actions: NonNullable<TreeView["actions"]>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null),
    label = useRef<HTMLButtonElement>(null),
    restoreFocus = useRef(false),
    finishing = useRef(false);
  const [editing, setEditing] = useState(false),
    [draft, setDraft] = useState(row.name);
  const beginRename = () => {
    finishing.current = false;
    setDraft(row.name);
    setEditing(true);
  };
  const finishRename = (save: boolean) => {
    if (!editing || finishing.current) return;
    finishing.current = true;
    restoreFocus.current = true;
    setEditing(false);
    const name = draft.trim();
    if (save && name && name !== row.name) actions.rename(row.id, name);
  };
  useLayoutEffect(() => {
    if (editing) {
      input.current?.focus();
      input.current?.select();
    } else if (restoreFocus.current) {
      restoreFocus.current = false;
      label.current?.focus();
    }
  }, [editing]);
  useLayoutEffect(() => {
    if (ref.current) actions.attachDrag(ref.current, row.id);
  }, [actions, row.id]);
  return (
    <Fragment>
      <div
        ref={ref}
        data-node-id={row.id}
        className={
          "tree-node" +
          (row.selected ? " selected" : "") +
          (row.primary ? " primary-selected" : "")
        }
        role="treeitem"
        aria-selected={row.selected}
        aria-level={row.depth + 1}
        aria-expanded={row.branch ? row.expanded : undefined}
        style={{ paddingLeft: row.depth * 14 }}
        onKeyDown={(e) => {
          if (e.key === "F2" && !(e.target as HTMLElement).matches("input")) {
            e.preventDefault();
            beginRename();
          }
        }}
      >
        <span
          className="node-drag-handle"
          draggable={false}
          aria-label={uiText("editor.drag") + row.name}
          title={uiText(
            "editor.dragToReparentOrReorderCenterToNestEdgesToReorder",
          )}
        >
          <EditorIcon name="drag" />
        </span>
        <button
          type="button"
          className="tree-visibility"
          data-visible={row.enabled}
          aria-pressed={row.enabled}
          aria-label={uiFormat("editor.nodeVisibilityNamed", row.name)}
          title={uiFormat(
            row.enabled ? "editor.hideNodeNamed" : "editor.showNodeNamed",
            row.name,
          )}
          onClick={() => actions.visibility(row.id)}
        >
          <EditorIcon name="display" hidden={!row.enabled} />
        </button>
        {row.branch && (
          <button
            className="tree-disclosure"
            aria-expanded={row.expanded}
            aria-label={
              uiText(row.expanded ? "editor.collapse" : "editor.expand") +
              row.name
            }
            onClick={() => actions.toggle(row.id)}
          >
            <EditorIcon name="chevron" />
          </button>
        )}
        {editing ? (
          <input
            ref={input}
            className="tree-node-rename"
            value={draft}
            maxLength={80}
            aria-label={uiFormat("nodeTree.rename", row.name)}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => finishRename(true)}
            onPointerDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === "Enter" || event.key === "Escape") {
                event.preventDefault();
                finishRename(event.key === "Enter");
              }
            }}
          />
        ) : (
          <button
            ref={label}
            className="tree-node-name"
            title={uiText("nodeTree.renameHint")}
            aria-label={uiText("editor.select") + row.name}
            onClick={(e) => {
              if (e.detail !== 2) actions.select(row.id, e.nativeEvent);
            }}
            onDoubleClick={beginRename}
          >
            <EditorIcon name={row.icon} />
            <span className="tree-node-label">{row.name}</span>
            {row.blend && (
              <span className="tree-node-blend" aria-hidden="true">
                {row.blend}
              </span>
            )}
          </button>
        )}
        {row.animated && (
          <span
            className="graphic-animated tree-node-animation"
            role="img"
            title={uiFormat("nodeTree.animationHint", row.name)}
            aria-label={uiFormat("nodeTree.animationBadge", row.name)}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
              <rect x="2.5" y="3.5" width="15" height="13" rx="2" />
              <path d="M8 6.5 13 10 8 13.5Z" />
            </svg>
          </span>
        )}
        {row.pinned && (
          <button
            type="button"
            className="node-shortcut-marker"
            title={uiFormat("shortcuts.show", row.name)}
            aria-label={uiFormat("shortcuts.show", row.name)}
            onClick={() => actions.select(row.id)}
          >
            <EditorIcon name="pin" />
          </button>
        )}
        <button
          type="button"
          className="tree-node-delete"
          title={uiFormat("nodeTree.delete", row.name)}
          aria-label={uiFormat("nodeTree.delete", row.name)}
          onClick={(e) => {
            e.stopPropagation();
            actions.remove(row.id);
          }}
        >
          <EditorIcon name="trash" />
        </button>
      </div>
      {row.shortcuts && (
        <div
          className="node-shortcuts"
          role="group"
          aria-label={uiFormat("shortcuts.forNode", row.name)}
          style={{ marginLeft: row.depth * 14 + 14 }}
        />
      )}
    </Fragment>
  );
}

export function NodeTree() {
  const { rows, actions } = useViewStore(treeView);
  return (
    <>
      {actions &&
        rows.map((row) => <NodeRow key={row.id} row={row} actions={actions} />)}
      {actions && (
        <div
          className="tree-root-drop"
          aria-label={uiText("editor.topLevelDropZone")}
          onClick={() => actions.select("@root")}
          onDragOver={(e) => actions.dropOver(e.nativeEvent)}
          onDragLeave={(e) => actions.dropLeave(e.nativeEvent)}
          onDrop={(e) => actions.drop(e.nativeEvent)}
        >
          {uiText("editor.dropHereToMoveToTheTopLevel")}
        </div>
      )}
    </>
  );
}
export function NodeCount() {
  return <>{useViewStore(treeView).count}/255</>;
}
export function Breadcrumbs() {
  const { path, actions } = useViewStore(treeView);
  return (
    <>
      {path.map((node) => (
        <button key={node.id} onClick={() => actions?.select(node.id)}>
          {node.name}
        </button>
      ))}
    </>
  );
}
export function ComponentNavigation() {
  const { componentName, actions } = useViewStore(treeView);
  return componentName === null ? null : (
    <>
      <button onClick={() => actions?.returnWork()}>
        {uiText("canvas.backToCanvas")}
      </button>
      <span>{componentName}</span>
    </>
  );
}
