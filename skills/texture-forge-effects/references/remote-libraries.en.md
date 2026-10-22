# Remote-library usage and management

<!-- doc-language -->
[简体中文](remote-libraries.md) · [English](remote-libraries.en.md)
<!-- /doc-language -->

Choose the relevant workflow: subscribe to another library, maintain your local folder, or publish for others. This Skill explains operations only; do not click, write directories, upload or run Git on the user's behalf.

## Distinguish storage locations

| Content | Location/purpose |
| --- | --- |
| Remote library | Hosted index, packs and thumbnails |
| Remote download cache | Current browser, offline-capable but still remote-sourced |
| Local graphics library | Independent browser resources, not a Git folder |
| Graphics list/canvas | Reusable copies and instances, not auto-replaced by cache updates |
| Manager folder | Downloaded/cloned files on the user's computer, requiring separate publication |

Download locally does not mean writing a Git checkout or saving a new original. Storage is browser/origin-specific. Projects carry used dependencies, not whole subscriptions/cache.

## Subscribe and use

1. Open Graphics library → Remote libraries.
2. Enter a name and direct `index.json` URL, such as `https://example.com/library/index.json` (format example only). Trailing slash appends the index. Repository homepages, ZIP links and `library.json` are not subscription indexes.
3. After connection, close the dialog and filter by source. Multiple sources can be enabled, disabled, renamed, refreshed or removed.
4. Download locally caches only. Add to graphics list downloads as needed, then use + Add for an instance. Add directly to canvas is also available.
5. Downloaded resources work offline. Summary-only entries need a network for initial use/edit/export. Editing remote resources saves new originals, not server changes.

Use Refresh now in subscriptions or Refresh remote libraries. Default automatic checks run every five minutes while the library is open, not realtime server push.

## Merged sources, versions and updates

One resource ID produces one card. Source/download labels describe its active version. All sources/versions lists local/built-in/remote candidates; the selected source/version governs add/edit/export/delete. Default priority: local, built-in, latest remote. Filters restrict candidates. Changing active version clears its old selection; batches process one active version per ID.

| State/action | Scope |
| --- | --- |
| Local exists, identical | Known hashes match for the ID/version; browsing merges, storage stays separate |
| Remote newer / Local newer | Version comparison, not automatic replacement |
| Awaiting comparison / Conflict | Missing hash cannot establish equality; differing same-version content cannot overwrite |
| Auto-download updates | Off by default; tracks downloaded resources only, including version jumps |
| Update local version | Confirmed remote→browser-original replacement; list/canvas remain |
| New version → Update | Confirmed list replacement, including personal edits; existing instances remain |

Save subscription settings after enabling automatic downloads. Cache, local library, list and canvas updates are different. Share personal edits by saving/exporting/publishing independent resources, not automatic uploads.

## Delete and disable scopes

- Removing/disabling subscriptions retains cache/list/canvas. Downloaded-remote browsing remains usable. Readdressing clears the old index identity, not old downloads.
- Delete local download clears all downloaded versions for that source/resource, retaining other sources/originals/list/canvas. Active sources show undownloaded; removed/disabled cached cards may disappear until resubscription. Auto-update tracking stops until downloaded again.
- Delete resource on a local source removes that original only. Other sources can keep the merged card. It does not delete server files.
- Remove from directory in the manager unlists local files without removing ZIPs/thumbnails. Hosted users see changes only after publishing; old links/cache do not immediately vanish.

## Static manager: maintain your library

Prepare a downloaded/cloned folder with index, resources, thumbnails and manager. File management itself does not require Git; commits/pushes do.

1. Open `library-manager.html` in current desktop Chrome/Edge, or an HTTPS `manager/index.html`. Final users need no Node/npm/EXE/server.
2. Choose the root folder and grant access. It is remembered per browser and resumes automatically with valid permission, otherwise use Continue. Close library forgets the handle, not snapshots. Unsupported browser/security contexts show guidance; do not disable protections.
3. Export official selected resource ZIPs from the editor. Import in the manager, inspect new/updated entries and confirm. Up to 32 ZIPs/64 MB combined. Arbitrary images, project ZIPs and Skills are not substitutes.
4. Edit information changes directory name/category/tags/description; rename-library changes its display name. Only the index changes, not pack identity/version/hash. Content edits require a new official resource version; same-version conflicts are rejected.
5. Unlist selected entries to retain old files. Permanent deletion confirms removal of current referenced packs/thumbnails except shared files. Historical/unlisted files are not automatically cleaned. Snapshots cannot recover deleted bytes and old project downloads may fail. Save index before cleanup; inspect failed paths/permissions manually. This changes only the chosen folder, not other directories or `.git`, and does not upload.
6. Directory recovery uses up to 50 pre-edit snapshots in this browser per library/origin. Browser clearing/change may lose them. Download current JSON for backup; restore checks library identity and referenced ZIP hashes.

An online manager still edits authorized local files only. Missing thumbnails use placeholders rather than rendering formulas. Avoid external concurrent edits. On stale-directory errors refresh/check instead of overwriting; renew permission through Continue when needed.

## Publish manually with Git, Pages or a CDN

Saving locally does not publish. Inspect index references and immutable ID/version bytes, then guide the user's actual hosting process:

| Method | User operation |
| --- | --- |
| Git | Commit and push; ordinary Git hosting alone is not a published website |
| GitHub Pages / configured GitLab Pages | Push the configured source, wait for deployment and verify the public index; not every Git service offers Pages |
| Static/CDN/object storage | Upload resources/thumbnails first, index last; use short/revalidated index caching or invalidate it; new versions use new names |

The static manager can ship publicly without a write backend. Folder permission applies to the visitor's computer. Never include remote credentials in public files. Reading requires direct HTTP(S) access and CORS. HTTPS editors need HTTPS libraries. Browser login or Git permissions do not imply access to private pack URLs.

After publishing, verify direct index, ZIP/thumbnail paths and CORS, then refresh in the editor and download an actual new/updated item. New libraries use `<directory>/index.json`; updates keep the address. Preserve library identity when moving hosts/CDNs.

For first generation/missing manager, developers can use `build-remote-library.mjs` (official pack→directory plus manager) or `build-library-manager.mjs`. These need source dependencies/Node, unlike final usage. Explain them without assuming they are installed or already deployed by you. A ready-made no-build repository is described in the [online library tutorial](https://github.com/BreezyMomo/MomoTextureForge/blob/main/docs/09-remote-libraries.en.md).

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Failed to fetch | Direct index URL, network, HTTPS mixed content and CORS; opening a homepage does not prove cross-origin file access |
| Refreshed index but old graphic | Which layer changed: index, cache, local original, list or instance? Use its explicit update |
| Same-version conflict / SHA failure | Repacked/overwritten bytes or wrong index hash; obtain correct pack/new version, not edited IDs or disabled validation |
| Missing manifest | Wrong project/Skill/image archive; export official resources |
| Directory picker unavailable | Supported desktop Chrome/Edge and secure context; open the HTML/HTTPS manager outside restrictive embedded previews |
| Folder not restored / snapshots missing | Continue permission, moved/closed folder, cleared browser or changed origin; reselect or restore JSON backup |

Network/CORS/hash failures retain previous indexes/cache. One source failure does not block others. Preserve canvases/resources while diagnosing; clearing browser data should not be the first step.
