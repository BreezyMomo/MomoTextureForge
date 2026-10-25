using UnityEngine;
 namespace MomoTextureForge.Modules {
 [ExecuteAlways] public sealed class MomoVignette:MomoPostprocess {
 [Range(0f,2f)] public float strength=0.6f;
[Range(0f,2f)] public float range=1f;
public bool top=true;
public bool bottom=true;
public bool left=true;
public bool right=true;
public Vector4 color=new Vector4(0f,0f,0f,1f);
 protected override string ShaderName=>"Hidden/MomoTextureForge/Postprocess/vignette";
 protected override int Operation=>21;
 protected override int Pipeline=>0;
 protected override void Configure(Material material){material.SetFloat("_MF_strength",strength);
material.SetFloat("_MF_range",range);
material.SetFloat("_MF_top",top?1f:0f);
material.SetFloat("_MF_bottom",bottom?1f:0f);
material.SetFloat("_MF_left",left?1f:0f);
material.SetFloat("_MF_right",right?1f:0f);
material.SetVector("_MF_color",color);}
 }}
