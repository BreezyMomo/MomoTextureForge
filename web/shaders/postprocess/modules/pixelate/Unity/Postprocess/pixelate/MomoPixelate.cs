using UnityEngine;
 namespace MomoTextureForge.Modules {
 [ExecuteAlways] public sealed class MomoPixelate:MomoPostprocess {
 [Range(1f,200f)] public float size=8f;
 protected override string ShaderName=>"Hidden/MomoTextureForge/Postprocess/pixelate";
 protected override int Operation=>20;
 protected override int Pipeline=>0;
 protected override void Configure(Material material){material.SetFloat("_MF_size",size);}
 }}
