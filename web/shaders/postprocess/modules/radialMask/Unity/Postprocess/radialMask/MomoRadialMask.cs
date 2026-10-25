using UnityEngine;
 namespace MomoTextureForge.Modules {
 [ExecuteAlways] public sealed class MomoRadialMask:MomoPostprocess {
 [Range(0f,1f)] public float centerX=0.5f;
[Range(0f,1f)] public float centerY=0.5f;
[Range(0.01f,2f)] public float radius=0.5f;
[Range(0f,1f)] public float feather=0.2f;
public bool invert=false;
 protected override string ShaderName=>"Hidden/MomoTextureForge/Postprocess/radialMask";
 protected override int Operation=>28;
 protected override int Pipeline=>0;
 protected override void Configure(Material material){material.SetFloat("_MF_centerX",centerX);
material.SetFloat("_MF_centerY",centerY);
material.SetFloat("_MF_radius",radius);
material.SetFloat("_MF_feather",feather);
material.SetFloat("_MF_invert",invert?1f:0f);}
 }}
