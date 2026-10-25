using UnityEngine;
 namespace MomoTextureForge.Modules {
 [ExecuteAlways] public sealed class MomoBlur:MomoPostprocess {
 [Range(0f,32f)] public float radius=0f;
 protected override string ShaderName=>"Hidden/MomoTextureForge/Postprocess/blur";
 protected override int Operation=>10;
 protected override int Pipeline=>1;
 protected override void Configure(Material material){material.SetFloat("_MF_radius",radius);}
 }}
