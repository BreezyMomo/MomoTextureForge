// Place in an Editor folder. Imports a matching handdrawn reference into a URP project.
using System;
using System.IO;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;

namespace MomoTextureForge.Editor
{
    public static class MomoHanddrawnImporter
    {
        [Serializable] private class Parameters
        {
            public float style, gap, width, angle, roughness, seed, dashLength, dashGap;
            public float inkOpacity, paperOpacity, scrollX, scrollY;
            public string inkColor, paperColor;
        }
        [Serializable] private class Input { public string file, channel, wrap; public bool sRGB; }
        [Serializable] private class Manifest
        {
            public string schema, effect;
            public int version;
            public Parameters parameters;
            public Input input;
            public float[] designSize;
            public float previewTimeSeconds;
        }

        [MenuItem("Assets/Momo Texture Forge/Import handdrawn reference")]
        private static void Choose()
        {
            var path = EditorUtility.OpenFilePanel("Choose reference parameters.json inside Assets", Application.dataPath, "json");
            if (string.IsNullOrEmpty(path)) return;
            try { Selection.activeObject = Import(path); }
            catch (Exception error) { Debug.LogException(error); }
        }

        public static Material Import(string manifestPath)
        {
            var full = Path.GetFullPath(manifestPath);
            var assets = Path.GetFullPath(Application.dataPath) + Path.DirectorySeparatorChar;
            if (!full.StartsWith(assets, StringComparison.OrdinalIgnoreCase))
                throw new ArgumentException("Extract the reference folder into this project's Assets first.");
            var pipeline = GraphicsSettings.currentRenderPipeline;
            if (pipeline == null || pipeline.GetType().FullName != "UnityEngine.Rendering.Universal.UniversalRenderPipelineAsset")
                throw new InvalidOperationException("This importer requires an active Universal Render Pipeline asset.");
            var data = JsonUtility.FromJson<Manifest>(File.ReadAllText(full));
            if (data == null || data.schema != "momo.shader-reference/v1" || data.effect != "handdrawnFill" || data.version != 1 || data.parameters == null || data.input == null || data.input.file != "mask.png" || data.input.channel != "red" || data.input.sRGB || data.designSize == null || data.designSize.Length != 2)
                throw new ArgumentException("A matching handdrawn shader-reference parameters.json is required.");
            var p = data.parameters;
            if (!ColorUtility.TryParseHtmlString(p.inkColor, out var ink) || !ColorUtility.TryParseHtmlString(p.paperColor, out var paper))
                throw new ArgumentException("Invalid sRGB ink or paper color.");
            var folder = "Assets/" + Path.GetRelativePath(Application.dataPath, Path.GetDirectoryName(full)).Replace('\\', '/');
            if (folder.EndsWith("/.")) folder = "Assets";
            var maskPath = folder + "/mask.png";
            AssetDatabase.ImportAsset(maskPath, ImportAssetOptions.ForceSynchronousImport);
            var importer = AssetImporter.GetAtPath(maskPath) as TextureImporter;
            if (importer == null) throw new FileNotFoundException("Reference mask.png is missing.");
            importer.textureType = TextureImporterType.Default;
            importer.sRGBTexture = false;
            importer.wrapMode = TextureWrapMode.Clamp;
            importer.filterMode = FilterMode.Bilinear;
            importer.mipmapEnabled = false;
            importer.alphaIsTransparency = false;
            importer.textureCompression = TextureImporterCompression.Uncompressed;
            importer.SaveAndReimport();
            var shaderPath = folder + "/HanddrawnFillURP.shader";
            AssetDatabase.ImportAsset(shaderPath, ImportAssetOptions.ForceSynchronousImport);
            var shader = AssetDatabase.LoadAssetAtPath<Shader>(shaderPath);
            if (shader == null || ShaderUtil.ShaderHasError(shader))
                throw new InvalidOperationException("Reference Shader failed to import or compile; inspect Unity's shader diagnostics.");
            var material = new Material(shader);
            material.SetTexture("_MaskTex", AssetDatabase.LoadAssetAtPath<Texture2D>(maskPath));
            material.SetFloat("_Style", p.style); material.SetFloat("_Gap", p.gap); material.SetFloat("_Width", p.width);
            material.SetFloat("_Angle", p.angle); material.SetFloat("_Roughness", p.roughness); material.SetFloat("_Seed", p.seed);
            material.SetFloat("_DashLength", p.dashLength); material.SetFloat("_DashGap", p.dashGap);
            material.SetFloat("_InkOpacity", p.inkOpacity); material.SetFloat("_PaperOpacity", p.paperOpacity);
            // ShaderLab Color properties take sRGB values; Unity handles linear projects.
            material.SetColor("_InkColor", ink); material.SetColor("_PaperColor", paper);
            material.SetVector("_Scroll", new Vector4(p.scrollX, p.scrollY, 0, 0));
            material.SetVector("_DesignSize", new Vector4(data.designSize[0], data.designSize[1], 0, 0));
            material.SetFloat("_UseCustomTime", 1); material.SetFloat("_TimeSeconds", data.previewTimeSeconds);
            AssetDatabase.CreateAsset(material, AssetDatabase.GenerateUniqueAssetPath(folder + "/HanddrawnFill.mat"));
            AssetDatabase.SaveAssets();
            return material;
        }
    }
}
