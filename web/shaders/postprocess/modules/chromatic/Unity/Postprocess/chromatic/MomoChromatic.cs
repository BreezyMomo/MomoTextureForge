using UnityEngine;
 namespace MomoTextureForge.Modules {
 [ExecuteAlways] public sealed class MomoChromatic:MomoPostprocess {
 [Range(0f,24f)] public float distance=0f;
[Range(0f,2f)] public float direction=0f;
 protected override string ShaderName=>"Hidden/MomoTextureForge/Postprocess/chromatic";
 protected override int Operation=>14;
 protected override int Pipeline=>0;
 protected override void Configure(Material material){material.SetFloat("_MF_distance",distance);
material.SetFloat("_MF_direction",direction);}
 }}
