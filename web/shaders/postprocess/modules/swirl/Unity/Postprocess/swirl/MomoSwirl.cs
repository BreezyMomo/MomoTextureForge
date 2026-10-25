using UnityEngine;
 namespace MomoTextureForge.Modules {
 [ExecuteAlways] public sealed class MomoSwirl:MomoPostprocess {
 [Range(-10f,10f)] public float strength=3f;
[Range(0.01f,2f)] public float radius=0.7f;
 protected override string ShaderName=>"Hidden/MomoTextureForge/Postprocess/swirl";
 protected override int Operation=>25;
 protected override int Pipeline=>0;
 protected override void Configure(Material material){material.SetFloat("_MF_strength",strength);
material.SetFloat("_MF_radius",radius);}
 }}
