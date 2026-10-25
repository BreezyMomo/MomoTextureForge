using UnityEngine;
 namespace MomoTextureForge.Modules {
 [ExecuteAlways] public sealed class MomoBloom:MomoPostprocess {
 [Range(0f,3f)] public float strength=0f;
[Range(1f,64f)] public float radius=16f;
[Range(0f,1f)] public float threshold=0.6f;
 protected override string ShaderName=>"Hidden/MomoTextureForge/Postprocess/bloom";
 protected override int Operation=>12;
 protected override int Pipeline=>2;
 protected override void Configure(Material material){material.SetFloat("_MF_strength",strength);
material.SetFloat("_MF_radius",radius);
material.SetFloat("_MF_threshold",threshold);}
 }}
