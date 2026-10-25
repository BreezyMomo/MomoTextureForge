# Billow · Unity graphic module

<!-- doc-language -->
[简体中文](README.md) · [English](README.en.md)
<!-- /doc-language -->

Copy Unity files other than Shared into `Assets/MomoTextureForge/Graphics/<graphic-id>`. Merge Shared into Assets/MomoTextureForge/Shared once, sharing it across all graphic and postprocess modules. Use Assets → Momo Texture Forge to import this package's parameters.json, or create a material using its Shader. See module.json for native parameter mappings. Time is seconds; transparent output excludes the canvas background. Preserve the whole module when sharing.

Unlit transparent mesh, UV0. Linear projects convert the final output color. UI stencil and particle-specific inputs need target adaptation. HLSL compilation does not establish Unity visual acceptance.

Import each graphic module once. To change values, replace or save another parameters.json and rerun its importer to create a new material; do not duplicate the same Shader/importer in a second directory.

For editor-matched raster filtering, assign the imported material to MomoGraphicRenderer.sourceMaterial and the GraphicResolve Shader to resolveShader. Render(material, seconds, width, height, 2) returns a premultiplied numeric-sRGB linear ARGBHalf RT. Connect postprocesses with inputIsLinear=false, inputIsPremultiplied=true. For final transparent UV0 mesh display use MomoTextureForge/Display/NumericSRGB, setting _MainTex to Output. Direct graphic materials remain available without an RT. Preserve one copy of each module/importer; replace or save another parameters.json for additional materials.

Render requires an activeInHierarchy GameObject. Disable the component for manual updates, rather than allocating resources on a never-active object. Inactive calls fail before allocation.
