using UnityEngine;
 namespace MomoTextureForge.Modules {
 [ExecuteAlways] public sealed class MomoEdge:MomoPostprocess {
 [Range(0.1f,5f)] public float width=1f;
[Range(0f,3f)] public float strength=1f;
public Vector4 color=new Vector4(1f,1f,1f,1f);
 protected override string ShaderName=>"Hidden/MomoTextureForge/Postprocess/edge";
 protected override int Operation=>26;
 protected override int Pipeline=>0;
 protected override void Configure(Material material){material.SetFloat("_MF_width",width);
material.SetFloat("_MF_strength",strength);
material.SetVector("_MF_color",color);}
 }}
