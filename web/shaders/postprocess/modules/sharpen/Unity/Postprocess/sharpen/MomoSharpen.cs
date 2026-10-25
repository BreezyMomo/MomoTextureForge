using UnityEngine;
 namespace MomoTextureForge.Modules {
 [ExecuteAlways] public sealed class MomoSharpen:MomoPostprocess {
 [Range(0f,3f)] public float strength=0f;
 protected override string ShaderName=>"Hidden/MomoTextureForge/Postprocess/sharpen";
 protected override int Operation=>13;
 protected override int Pipeline=>0;
 protected override void Configure(Material material){material.SetFloat("_MF_strength",strength);}
 }}
