# Multiple remote graphics libraries

<!-- doc-language -->
[简体中文](REMOTE_LIBRARIES.md) · [English](REMOTE_LIBRARIES.en.md)
<!-- /doc-language -->

Add a name and index URL through **Graphics library → Remote libraries**. Multiple subscriptions are supported. A URL such as `https://example.com/library/index.json` works directly; a trailing `/` gets `index.json` appended. Each source can be renamed, readdressed, disabled, refreshed or removed independently.

- Automatic directory checks run when the library opens and every five minutes while it remains open, not as a permanent browser background service.
- Preview, trial editing, insertion and export read on demand without saving to the library. Select **Download** for persistence; binding and permission are checked first.
- Saving writes the complete ZIP and thumbnail into that folder, verifies them and updates index.json. **Downloaded** means this version is available offline. Changing folders changes its saved state.
- **Delete resource** removes the current folder entry, ZIPs, thumbnails and historical versions while protecting shared references. Server files and canvas instances remain. Failed deletions can be retried; pending saves cannot recreate a deleted resource.
- Automatic updates are off by default. When enabled, they update only resources already saved from that subscription in the current folder, allowing version jumps. They do not fetch entire libraries or overwrite personal originals or canvas instances.
- Disabling/removing subscriptions leaves disk resources and their source information intact for offline use, export and saving as independent resources. Remote edits do not publish to the server.
- Browser storage retains subscription settings; the library folder retains packages. After clearing browser data, select the folder again. Legacy browser downloads are saved and read back during upgrade, then removed from browser storage after successful verification.

## Publish a static directory

**No-build option:** fork/copy [momo-texture-library](https://github.com/BreezyMomo/momo-texture-library), maintain files with its ready-made `library-manager.html`, and enable GitHub Pages. No Node.js is needed. See [no-build library hosting](docs/09-remote-libraries.en.md#21-no-build-copy-an-existing-library-and-publish-with-github-pages) for copying, selecting `main` + `/(root)`, uploading changes and subscribing. The manager changes local files only; commit and push them yourself.

To generate a directory from scratch, use the CLI below. No account system or dynamic backend is required. Select resources intended for public sharing, export official packs, then run in this repository:

```sh
node build-remote-library.mjs --input "library.zip" --out "remote-library" --name "Team library"
```

Single-resource packs and repeated `--input` arguments are supported. Output contains `index.json`, `resources/*.zip` and optional `thumbnails/*`. Upload the complete folder to a static site/CDN. The CLI currently accepts base-ABI packs; import generator-capability packs directly into the editor rather than editing manifests.

Use the same output folder for later updates. The tool retains `libraryId`, merges entries and replaces an ID only with a higher version. Unrelated entries and old ZIP files remain; the index lists each ID's latest version. Same-ID/version byte conflicts or version rollback fail. Publish a new version after content edits. Use a new folder for a separate library. The index is replaced atomically last; deployments should likewise upload ZIPs/thumbnails before the index.

Serve the index, packs and thumbnails with CORS for the tool's origin. Public static libraries may use:

```text
Access-Control-Allow-Origin: *
```

Use HTTPS for the editor and library. Browsers can block HTTP resources from HTTPS pages. Offline HTML can subscribe if the server permits file origins, usually through wildcard CORS. There is no server write/login/Cookie authentication; cross-origin credentials are not sent. Offline local editing remains network-independent.

## Index format

```json
{
  "schema": "momo.texture-remote-library/v1",
  "libraryId": "d370b9b3-5b39-4c06-8594-ea079bb6cdd8",
  "name": "Team library",
  "entries": [{
    "resourceId": "1e99b955-c352-4c54-ab2b-d634b9ad718d",
    "versionId": 1,
    "name": "Pattern",
    "aliases": {"zh-CN": "花纹", "en": "Pattern"},
    "kind": "formula",
    "category": "Decoration",
    "description": "Adjustable pattern",
    "file": "resources/1e99b955-c352-4c54-ab2b-d634b9ad718d-v1.zip",
    "sha256": "64 hexadecimal characters generated from the complete resource ZIP",
    "thumbnail": "thumbnails/flower.png",
    "tags": ["flower"]
  }]
}
```

The packer generates real hashes; the value above is illustrative. `kind` is `formula`, `image` or `composition`. Optional `imageMime` identifies PNG/JPEG/WebP/SVG, read from the resource descriptor and verified again after download. Thumbnails accept PNG/WebP URLs or existing data URLs. Other file URLs use HTTP(S); relative paths resolve against the final index response URL.

ZIPs must be official single-resource packs with `manifest.json`, `content.json`, `graphicResource` and dependencies, not arbitrary image archives. The client validates the index, SHA-256, identity/type, dependencies and node structure before saving. Original ZIP bytes stay unchanged; remoteOrigin in the local index.json records subscription provenance. Bytes for a given ID/version are immutable, including metadata. Identical names with different IDs may coexist. Conflicts against saved resources fail without overwriting.

Limits: 32 subscriptions; 2000 entries and 8 MiB per index; 64 MiB per pack, also subject to expansion limits; 2 MiB per thumbnail; 15-second network reads, with additional decoding/validation time. Retry manually after timeouts. Network/CORS/hash errors retain previous indexes and cache; one failed source does not block others. No retry loop, resumable transfer, server upload/administration, account sync or realtime push is provided.

## Included local manager

Install repository dependencies and run `node build-library-manager.mjs --out <library-folder>`; the static-library build also installs it. Output includes self-contained `library-manager.html` and `manager/index.html`, with no external scripts/services/assets. They can be published alongside a repository/CDN without changing the root index URL. Building needs Node/npm; using the result does not. Updating an older output removes known obsolete Node-server/launcher files.

Use current desktop Chrome/Edge to open the manager, choose the folder containing `index.json` and grant read/write permission. The HTTPS manager can also choose local folders; it does not edit hosted resources. The page checks secure context, directory access/writing and browser locks. Unsupported environments receive guidance; do not disable browser security. The first authorized folder is remembered and restored when permission remains valid. Use Continue when renewed permission is needed. Close library forgets the handle; clearing browser data or changing origins may require reselection. Without permission it cannot access files. There is no management API, upload or Git interface; CSP blocks network connections.

Import official single-resource/library ZIPs, up to 32 files and 64 MB combined. Dependencies and immutable versions are checked, followed by preview and confirmation. Reimporting retains directory aliases, categories and tags. Directory metadata edits change only `index.json`, not pack versions/bytes. Unlisting retains old files for links. Up to 50 pre-edit snapshots are kept in this browser's IndexedDB per library/origin, not in the repository. Clearing data or changing browsers/origins loses those snapshots. Download the current index as JSON for backup; JSON recovery validates identity and referenced hashes. Missing thumbnails use placeholders, not automatic formula/image rendering or editing.

Publish yourself: commit/push Git changes, or upload resources/thumbnails before the CDN index and handle caching. The manager stores no remote credentials. Same-origin pages serialize writes with Web Locks and reject stale revisions. Browser single-file streams commit on close, not as an atomic folder transaction involving external tools. Avoid concurrent edits from other software. Windows Chromium file-entry and real directory-handle sandbox operations were tested; native folder authorization is performed by the user. Other platforms/browsers have not been physically verified.

## Source labels in resource browsing

Cards distinguish Built-in, Local and Remote. Downloading adds and selects **Local library** in the source/version control, reading directly from the current folder. Remote choices and **Downloaded / Not downloaded** states remain for version comparisons. Both choices share the same disk resource and retain its provenance. Opening a folder without that resource removes the local choice. The current-folder filter includes personal and downloaded remote resources; identical packages from several subscriptions share one physical copy.

The same resource ID merges into one card. Expand all sources/versions and choose the active source/version. Defaults prefer local, then built-in, otherwise latest remote. Source filters limit candidates; search matches their names. Cards distinguish local existing, newer remote, newer local and same-version conflict, or awaiting comparison when hashes are unavailable. Selection/batch export targets one active version per ID. Switching the active version clears its old selection.

When a remote version is newer without a known conflict, Update local version confirms updating the current folder while retaining canvas instances. Saving checks destination, version and content again to reject concurrent changes. Delete resource cleans up the actual folder resource; subscription catalogs can still show unsaved versions. Personal edits are not uploaded, synchronized or silently overwritten.

Delete permanently unlists the entry and deletes currently referenced ZIP/thumbnail files unless shared. Historical/unlisted files are not automatically cleaned. Confirmation is required; old project downloads may be affected, and index snapshots cannot recover deleted bytes. Save the index before file cleanup. Failed cleanup lists remaining paths for permission checks/manual removal. Local deletion affects remote users only after publication; existing browser caches are not directly deleted.
