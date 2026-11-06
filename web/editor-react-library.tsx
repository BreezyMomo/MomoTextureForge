import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createViewStore, useViewStore } from "./editor-react-state.ts";
import { EditorIcon } from "./editor-react-tree.tsx";
import { graphicLabel } from "./graphic-label.js";
import { graphicIsAnimated } from "./graphic-list-filters.js";
import { builtinThumbnail, thumbnailVisualKey } from "./thumbnail-source.js";
import { graphicEntryHasShader } from "./graphic-shader.js";
import { interfaceLanguage } from "./language.js";
import { uiText, uiFormat } from "./ui-language.js";
import { animateUI } from "./editor-motion.js";
import { hoverHelp } from "./hover-help.js";

type Entry = {
  id: string;
  root: any;
  versionId: number;
  personalRevision: number;
  resourceId?: string;
  [key: string]: any;
};
type Section = { key: string; title: string; members: Entry[] };
type Action = (entry: Entry) => unknown;
type Options = {
  container: HTMLElement;
  thumbnails: any;
  el?: unknown;
  makeAnimationBadge?: unknown;
  isFavorite(entry: Entry): boolean;
  isGroupOpen(key: string): boolean;
  onBrowse: Action;
  onInsert: Action;
  onRename: Action;
  onPublish: Action;
  onRemove: Action;
  onDownloadShader: Action;
  onFavorite: Action;
  onFavoriteRemoved(): void;
  onGroupToggle(element: HTMLDetailsElement): void;
};
const libraryView = createViewStore<{
  entries: Entry[];
  sections: Section[];
  emptyMessage: string;
  options: Options | null;
}>({ entries: [], sections: [], emptyMessage: "", options: null });

export function createReactGraphicListView(options: Options) {
  return {
    update({
      entries,
      sections,
      view,
      emptyMessage,
    }: {
      entries: Entry[];
      sections: Section[];
      view: string;
      emptyMessage: string;
    }) {
      options.container.className = "tree-library-" + view;
      libraryView.update({ entries, sections, emptyMessage, options });
    },
  };
}

function ShaderBadge() {
  const ref = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    hoverHelp(ref.current!, uiText("library.shaderHint"));
  }, []);
  return (
    <button
      ref={ref}
      type="button"
      className="shader-badge graphic-shader"
      aria-label={uiText("library.shaderBadge")}
      onKeyDown={(event) => {
        if (event.key === " " || event.key === "Enter") event.stopPropagation();
      }}
    >
      <EditorIcon name="shader" />
    </button>
  );
}

export function AnimationBadge({
  className = "",
  name,
}: {
  className?: string;
  name?: string;
}) {
  return (
    <span
      className={"graphic-animated " + className}
      role="img"
      aria-label={
        name
          ? uiFormat("nodeTree.animationBadge", name)
          : uiText("library.animatedBadge")
      }
      title={
        name
          ? uiFormat("nodeTree.animationHint", name)
          : uiText("library.animatedHint")
      }
    >
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <rect x="2.5" y="3.5" width="15" height="13" rx="2" />
        <path d="M8 6.5 13 10 8 13.5Z" />
      </svg>
    </span>
  );
}

function GraphicCard({
  entry,
  host,
  options,
  active,
  setActive,
}: {
  entry: Entry;
  host: HTMLDivElement;
  options: Options;
  active: string | null;
  setActive(id: string | null): void;
}) {
  const image = useRef<HTMLImageElement>(null),
    more = useRef<HTMLDetailsElement>(null);
  const summary = useRef<HTMLElement>(null),
    panel = useRef<HTMLDivElement>(null),
    star = useRef<HTMLButtonElement>(null);
  const [downloading, setDownloading] = useState(false),
    open = active === entry.id;
  const revision = JSON.stringify([
    entry.resourceId,
    entry.versionId,
    entry.personalRevision,
    entry.sourceId,
    entry.libraryId,
    entry.hash ?? entry.sha256,
  ]);
  const visual = useMemo(
    () => ({
      key: thumbnailVisualKey(entry.root),
      source: entry.thumbnail || builtinThumbnail(entry),
      animated: graphicIsAnimated(entry),
      shader: graphicEntryHasShader(entry),
    }),
    [revision,entry.root,entry.thumbnail],
  );
  const name = graphicLabel(entry),
    language = interfaceLanguage(),
    favorite = options.isFavorite(entry);
  useLayoutEffect(() => {
    const element = image.current!;
    if (!entry.root) {
      element.src = visual.source || 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72"><path d="M18 18h36v36H18Z" fill="none" stroke="#888"/></svg>');
      element.loading = 'lazy';
      return;
    }
    options.thumbnails.observe(element, "preset:" + entry.id, entry.root, {
      source: visual.source,
      visualKey: visual.key,
    });
    options.thumbnails.resume(element);
    return () => options.thumbnails.forget(element);
  }, [entry.id, visual.key, visual.source, options.thumbnails]);
  useLayoutEffect(() => {
    if (image.current) options.thumbnails.localize(image.current);
  }, [language, options.thumbnails]);
  useLayoutEffect(() => {
    animateUI(host, [{ opacity: 0.4 }, { opacity: 1 }], { duration: 140 });
  }, [host]);
  const close = (focus = false) => {
    setActive(null);
    if (focus) summary.current?.focus();
  };
  useLayoutEffect(() => {
    const element = panel.current!;
    if (!open) {
      if (element.matches(":popover-open")) element.hidePopover();
      return;
    }
    element.showPopover();
    const anchor = summary.current!.getBoundingClientRect(),
      bounds = element.getBoundingClientRect(),
      edge = 8,
      gap = 6;
    element.style.left =
      Math.max(
        edge,
        Math.min(anchor.right - bounds.width, innerWidth - bounds.width - edge),
      ) + "px";
    element.style.top =
      (anchor.bottom + gap + bounds.height <= innerHeight - edge
        ? anchor.bottom + gap
        : Math.max(edge, anchor.top - gap - bounds.height)) + "px";
    return () => {
      if (element.matches(":popover-open")) element.hidePopover();
    };
  }, [open, language]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!more.current?.contains(event.target as Node)) close();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close(true);
      }
    };
    const dismiss = () => close();
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape, true);
    document.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape, true);
      document.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, [open]);
  const action = (
    className: string,
    key: string,
    path: string,
    run: Action,
    label = uiText(key),
  ) => (
    <button
      className={className}
      title={uiText(key)}
      aria-label={label}
      onClick={() => {
        close(true);
        run(entry);
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d={path} />
      </svg>
    </button>
  );
  return (
    <>
      <button
        className="component-inspect"
        aria-label={uiText("library.viewPrefix") + name}
        onClick={() => options.onBrowse(entry)}
      >
        <img
          ref={image}
          width={72}
          height={72}
          alt={name + uiText("editor.preview")}
        />
        <span className="tree-pattern-text" title={name}>
          {name}
        </span>
      </button>
      <button
        className="component-add"
        aria-label={uiText("library.addPrefix") + name}
        onClick={() => options.onInsert(entry)}
      >
        {uiText("library.addInstance")}
      </button>
      <details ref={more} className="component-more" open={open}>
        <summary
          ref={summary}
          onClick={(event) => {
            event.preventDefault();
            setActive(open ? null : entry.id);
          }}
        >
          {uiText("editor.more")}
        </summary>
        <div
          ref={panel}
          className="component-more-panel"
          popover="manual"
          role="group"
          aria-label={name}
          onKeyDown={(event) => {
            if (event.key !== "Escape") event.stopPropagation();
          }}
        >
          <div className="component-more-meta">
            <div className="tree-note">
              {uiText("editor.version") + entry.versionId}
            </div>
          </div>
          <div className="component-more-actions">
            {action(
              "component-rename",
              "unified.renameResource",
              "M14 5l5 5M4 20l4-1L20 7a2.1 2.1 0 0 0-3-3L5 16l-1 4Z",
              options.onRename,
              uiText("library.renamePrefix") + name,
            )}
            {!entry.builtin && (!entry.remote || entry.folder) && action(
              "component-remove",
              "unified.deleteResource",
              "M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7",
              options.onRemove,
            )}
          </div>
          <button
            type="button"
            className="component-download-shader"
            hidden={!visual.shader}
            disabled={downloading}
            aria-label={uiFormat("graphicShader.downloadNamed", name)}
            title={uiText("graphicShader.scope")}
            onClick={async () => {
              if (downloading) return;
              close(true);
              setDownloading(true);
              try {
                await options.onDownloadShader(entry);
              } finally {
                setDownloading(false);
              }
            }}
          >
            <EditorIcon name="shader" />
            <span>{uiText("fx.downloadShader")}</span>
          </button>
        </div>
      </details>
      <div className="graphic-card-toolbar">
        <div className="graphic-badges">
          {visual.animated && <AnimationBadge />}
          {visual.shader && <ShaderBadge key={language} />}
        </div>
        <button
          ref={star}
          type="button"
          className="graphic-favorite"
          aria-pressed={favorite}
          aria-label={uiFormat(
            favorite ? "library.unfavoriteGraphic" : "library.favoriteGraphic",
            name,
          )}
          title={uiFormat(
            favorite ? "library.unfavoriteGraphic" : "library.favoriteGraphic",
            name,
          )}
          onKeyDown={(event) => {
            if (event.key === " " || event.key === "Enter")
              event.stopPropagation();
          }}
          onClick={() => {
            options.onFavorite(entry);
            if (!star.current?.isConnected) options.onFavoriteRemoved();
          }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3l2.78 5.93 6.22.95-4.5 4.62L17.56 21 12 17.93 6.44 21l1.06-6.5L3 9.88l6.22-.95L12 3Z" />
          </svg>
        </button>
      </div>
    </>
  );
}

function GraphicGroup({
  section,
  options,
  hosts,
}: {
  section: Section;
  options: Options;
  hosts: Map<string, HTMLDivElement>;
}) {
  const body = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const parent = body.current!;
    let cursor = parent.firstChild;
    for (const entry of section.members) {
      const host = hosts.get(entry.id)!;
      if (host === cursor) cursor = cursor.nextSibling;
      else parent.insertBefore(host, cursor);
    }
    while (cursor) {
      const next = cursor.nextSibling;
      parent.removeChild(cursor);
      cursor = next;
    }
  }, [section, hosts]);
  return (
    <details
      data-category={section.key}
      open={options.isGroupOpen(section.key)}
      onToggle={(event) => {
        if (event.currentTarget.isConnected)
          options.onGroupToggle(event.currentTarget);
      }}
    >
      <summary>{section.title}</summary>
      <div ref={body} className="tree-pattern-cards" />
    </details>
  );
}

export function GraphicList() {
  const { entries, sections, emptyMessage, options } =
      useViewStore(libraryView),
    [active, setActive] = useState<string | null>(null);
  // Portal containers survive filtering and category moves. React continues to
  // own card contents while thumbnails and keyboard focus keep their identity.
  const hosts = useRef(new Map<string, HTMLDivElement>()).current;
  const available = new Set(entries.map((entry) => entry.id));
  for (const entry of entries)
    if (!hosts.has(entry.id)) {
      const host = document.createElement("div");
      host.className = "tree-pattern-card";
      host.dataset.entryId = entry.id;
      hosts.set(entry.id, host);
    }
  useLayoutEffect(() => {
    for (const [id, host] of hosts)
      if (!available.has(id)) {
        host.remove();
        hosts.delete(id);
      }
  }, [entries, hosts]);
  useLayoutEffect(() => {
    for (const host of hosts.values())
      if (host.isConnected)
        for (const image of host.querySelectorAll("img"))
          options?.thumbnails.resume(image);
  }, [sections, hosts, options]);
  useEffect(() => {
    if (
      active &&
      !sections.some((section) =>
        section.members.some((entry) => entry.id === active),
      )
    )
      setActive(null);
  }, [sections, active]);
  const visible = sections.filter((section) => section.members.length);
  return (
    <>
      {options &&
        entries.map((entry) =>
          createPortal(
            <GraphicCard
              entry={entry}
              host={hosts.get(entry.id)!}
              options={options}
              active={active}
              setActive={setActive}
            />,
            hosts.get(entry.id)!,
            entry.id,
          ),
        )}
      {options &&
        visible.map((section) => (
          <GraphicGroup
            key={section.key}
            section={section}
            options={options}
            hosts={hosts}
          />
        ))}
      {!visible.length && <p className="tree-note">{emptyMessage}</p>}
    </>
  );
}
