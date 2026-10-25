# Unity postprocess module · blur

<!-- doc-language -->
[简体中文](README.md) · [English](README.en.md)
<!-- /doc-language -->

Merge Unity into Assets/MomoTextureForge, keeping Shared and Postprocess together. Multiple modules share one copy of Shared; do not duplicate C# classes. Use Assets → Momo Texture Forge → Import postprocess module with this module's parameters.json to create a prefab with a serialized Shader reference. Set input to an image or live RT. See module.json for all parameters/types/ranges/mappings. Render(input, seconds) updates explicitly; automatic updates are enabled by default. Time is seconds.

Declare input linear RGB and premultiplication. Output is premultiplied numeric sRGB in a linear ARGBHalf RT, matching editor intermediate composition. Chain using inputIsLinear=false and inputIsPremultiplied=true. Normal heightMode=0 reads alpha, 1 luminance, 2 explicit heightInput. Pixel radii use a 512-pixel short-edge design grid. Disable/destroy releases resources. Target Unity 2022.3 / URP 14. HLSL compilation does not establish target-engine visual acceptance.

For final transparent UV0 mesh display, create a MomoTextureForge/Display/NumericSRGB material and assign component Output to _MainTex. This material converts numeric-sRGB output into the target display color space.

Automatic updates read input. For fully scripted Render order/time, set the component enabled=false before calling the public Render method; destruction still releases resources.

Render requires an activeInHierarchy GameObject. Disable the component for manual updates, rather than allocating resources on a never-active object. Inactive calls fail before allocation.
