using UnityEngine;
 namespace MomoTextureForge.Modules {
 [ExecuteAlways] public sealed class MomoMirror:MomoPostprocess {
 public bool mirrorX=true;
public bool mirrorY=false;
 protected override string ShaderName=>"Hidden/MomoTextureForge/Postprocess/mirror";
 protected override int Operation=>24;
 protected override int Pipeline=>0;
 protected override void Configure(Material material){material.SetFloat("_MF_mirrorX",mirrorX?1f:0f);
material.SetFloat("_MF_mirrorY",mirrorY?1f:0f);}
 }}
