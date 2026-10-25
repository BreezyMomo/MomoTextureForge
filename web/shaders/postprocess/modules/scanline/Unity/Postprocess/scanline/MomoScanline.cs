using UnityEngine;
 namespace MomoTextureForge.Modules {
 [ExecuteAlways] public sealed class MomoScanline:MomoPostprocess {
 [Range(1f,500f)] public float density=120f;
[Range(-10f,10f)] public float speed=1f;
[Range(0f,1f)] public float strength=0.25f;
[Range(0f,1f)] public float phase=0f;
public Vector4 color=new Vector4(0f,0f,0f,1f);
 protected override string ShaderName=>"Hidden/MomoTextureForge/Postprocess/scanline";
 protected override int Operation=>22;
 protected override int Pipeline=>0;
 protected override void Configure(Material material){material.SetFloat("_MF_density",density);
material.SetFloat("_MF_speed",speed);
material.SetFloat("_MF_strength",strength);
material.SetFloat("_MF_phase",phase);
material.SetVector("_MF_color",color);}
 }}
