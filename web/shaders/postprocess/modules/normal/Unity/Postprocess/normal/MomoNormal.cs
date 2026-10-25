using UnityEngine;
 namespace MomoTextureForge.Modules {
 [ExecuteAlways] public sealed class MomoNormal:MomoPostprocess {
 [Range(0f,20f)] public float strength=3f;
[Range(1f,8f)] public float sampleStep=1f;
public bool flipY=false;
 protected override string ShaderName=>"Hidden/MomoTextureForge/Postprocess/normal";
 protected override int Operation=>30;
 protected override int Pipeline=>0;
 protected override void Configure(Material material){material.SetFloat("_MF_strength",strength);
material.SetFloat("_MF_sampleStep",sampleStep);
material.SetFloat("_MF_flipY",flipY?1f:0f);}
 }}
