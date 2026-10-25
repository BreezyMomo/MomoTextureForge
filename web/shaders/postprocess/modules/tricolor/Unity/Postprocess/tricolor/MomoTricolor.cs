using UnityEngine;
 namespace MomoTextureForge.Modules {
 [ExecuteAlways] public sealed class MomoTricolor:MomoPostprocess {
 public Vector4 shadow=new Vector4(0f,0f,0f,1f);
public Vector4 midtone=new Vector4(0.5019607843137255f,0.5019607843137255f,0.5019607843137255f,1f);
public Vector4 highlight=new Vector4(1f,1f,1f,1f);
 protected override string ShaderName=>"Hidden/MomoTextureForge/Postprocess/tricolor";
 protected override int Operation=>27;
 protected override int Pipeline=>0;
 protected override void Configure(Material material){material.SetVector("_MF_shadow",shadow);
material.SetVector("_MF_midtone",midtone);
material.SetVector("_MF_highlight",highlight);}
 }}
