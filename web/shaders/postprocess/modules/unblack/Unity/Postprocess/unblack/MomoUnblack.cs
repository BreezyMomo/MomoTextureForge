using UnityEngine;
 namespace MomoTextureForge.Modules {
 [ExecuteAlways] public sealed class MomoUnblack:MomoPostprocess {
 [Range(0f,1f)] public float strength=1f;
 protected override string ShaderName=>"Hidden/MomoTextureForge/Postprocess/unblack";
 protected override int Operation=>29;
 protected override int Pipeline=>0;
 protected override void Configure(Material material){material.SetFloat("_MF_strength",strength);}
 }}
