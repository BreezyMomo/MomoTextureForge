# Language, graphic names and parameter aliases

<!-- doc-language -->
[简体中文](12-language-and-aliases.md) · [English](12-language-and-aliases.en.md)
<!-- /doc-language -->

[Manual contents](README.en.md) · [Project home](../README.en.md)

## Select the display language

Choose **简体中文** or **English** in the toolbar language selector. It switches immediately without a dialog or confirmation.

Users can select only build-configured languages. They cannot type codes, add language types or reorder fallback languages. Parameters use the selected language's first nonempty alias, followed by the other configured languages, then their variable name. English currently resolves `en → zh-CN`.

The preference is stored separately in this browser. It does not travel with a project, add undo entries or modify values, keys, formulas or exported pixels. Built-in parameters, editor panels, library/resource editing, timeline, previews/export, layouts, examples and in-app help support Chinese and English. Project names, user node names, code and user text retain their content. Resource names use their own aliases.

### UI catalogs and parameter aliases are separate data

Fixed UI messages use stable semantic IDs, for example:

```json
// web/locales/zh-CN.json
{"menu.file": "文件", "common.close": "关闭"}
```

```json
// web/locales/en.json
{"menu.file": "File", "common.close": "Close"}
```

Use `uiText('menu.file')` or `uiFormat(key, ...values)`. HTML uses explicit `data-i18n`, `data-i18n-title`, `data-i18n-aria-label` and related bindings. Editing Chinese wording changes only its language file, not the ID or English text. Runtime code does not reverse-lookup Chinese strings.

All catalogs share IDs and interpolation placeholders. `node tools/i18n-audit.mjs` validates them and UI references; static builds run the audit too. Add a language through `web/language-config.json` and register its catalog in `web/locales/catalogs.js`. Missing messages fall back through configured languages, then show the ID to expose omissions.

Category IDs select UI messages. Graphic names use resource-owned `name + aliases`, and parameters use `variable + aliases`. Their values are actual names, not UI message IDs, and travel with exports. Project/node names and code remain untouched.

### Build-time language configuration

[web/language-config.json](../web/language-config.json) defines codes, native names and the default:

```json
{
  "default": "zh-CN",
  "languages": [
    {"code": "zh-CN", "name": "简体中文"},
    {"code": "en", "name": "English"}
  ]
}
```

This configuration is embedded in the static build. Developers must edit it, provide translations and rebuild to add languages. The selected language comes first; `languages` defines the remaining fallback order. `default` applies on first use. Codes must be canonical and unique; the default must exist.

## Edit multilingual graphic names

When creating, editing or saving a resource, expand **Multilingual names** beside its default name:

1. Enter a default name; aliases are optional.
2. Choose **Add language**, select a configured language and enter its name. A language cannot be added twice.
3. Save to the library or export authoring JSON/an official ZIP. Names travel with the resource. Composition saving and graphics-list renaming use the same control.

```json
{
  "name": "Default shield",
  "aliases": {"zh-CN": "冰霜护盾", "en": "Frost Shield"}
}
```

Resolution order is selected language → other configured languages → default `name` → resource ID. Up to 32 aliases of 80 characters each are supported. UI editing exposes configured languages only; imported aliases for inactive languages are preserved.

Top-level `aliases` names the graphic; `parameters[i].aliases` names its parameter. Built-ins use the same resource format rather than duplicating names in the UI catalog. Old resources without aliases retain their default name.

Library/list search covers the default, every alias and IDs. Searching for a Chinese name in English can find Frost Shield. Remote indexes carry aliases so names and search work before downloading a full pack. Publishing and caching retain them.

The resolved display name becomes a new canvas node's initial name. It then persists independently and is not overwritten by language switches or resource updates. Name/alias edits are resource-content edits that create a version/personal list revision. Switching language changes only the view, not resources, hashes, projects or undo history.

## Edit parameter aliases

Open **Graphics library → Edit graphic** and expand **Aliases** under a parameter:

- Its formula variable, such as `radius`, is its stable identifier.
- Select a language per row and enter its alias. Codes cannot be typed and duplicate choices are disabled.
- One language or no editable aliases is valid. Existing inactive-language aliases are retained through saving/export and are not added to the selector.
- Select-option labels can have their own aliases; numerical values remain unchanged.
- Save a new graphic or update it to persist metadata.

Variables are required and unique within the graphic: ASCII letter/underscore first, then letters/digits/underscores, up to 80 characters. GLSL keywords, `gl_`, double underscores and host names such as `time`, `uv`, `input0` are excluded. Variables cannot conflict with called functions. Renaming a variable requires changing formula references and previewing; changing aliases does not.

Generator editors display variables and edit aliases. Change custom-generator variables through JSON. Built-in variables also configure algorithms and are not directly renameable.

Hover canvas parameter controls to inspect variables. User-authored project names, node names, graphic names and code are not automatically translated.

## Authoring JSON

Formulas and generators share parameter metadata:

```json
{
  "variable": "radius",
  "aliases": {"zh-CN": "半径", "en": "Radius"},
  "min": 0.1,
  "max": 0.8,
  "step": 0.01,
  "default": 0.5
}
```

Omit `aliases` or use `{}` if unnecessary. Blank aliases do not match. Language tags are canonicalized (`zh-cn` becomes `zh-CN`); duplicate canonical languages are rejected. Parameters allow up to 32 aliases of 128 characters each. Resource data retains canonical tags for interoperability, while UI selectors list only build-configured languages.

Select options:

```json
{
  "variable": "profile",
  "aliases": {"zh-CN": "轮廓", "en": "Profile"},
  "type": "select",
  "min": 0,
  "max": 1,
  "step": 1,
  "default": 0,
  "options": [
    {"value": 0, "variable": "round", "aliases": {"zh-CN": "圆形", "en": "Round"}},
    {"value": 1, "variable": "square", "aliases": {"zh-CN": "方形", "en": "Square"}}
  ]
}
```

An omitted option variable gets a stable value-derived name such as `value0`, shown when no alias matches.

Legacy `label` is read as a Chinese alias only when no explicit alias map is provided. New authoring should use `variable` and `aliases`. Official ZIPs and formula/generator JSON preserve metadata. Switching language never changes the content hash; editing aliases is a content change and creates a new resource version.
