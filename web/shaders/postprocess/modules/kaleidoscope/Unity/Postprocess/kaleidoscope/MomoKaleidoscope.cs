using UnityEngine;
 namespace MomoTextureForge.Modules {
 [ExecuteAlways] public sealed class MomoKaleidoscope:MomoPostprocess {
 [Range(2f,24f)] public float segments=6f;
[Range(-360f,360f)] public float rotation=0f;
 protected override string ShaderName=>"Hidden/MomoTextureForge/Postprocess/kaleidoscope";
 protected override int Operation=>23;
 protected override int Pipeline=>0;
 protected override void Configure(Material material){material.SetFloat("_MF_segments",segments);
material.SetFloat("_MF_rotation",rotation);}
 }}
