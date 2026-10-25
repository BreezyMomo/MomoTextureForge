using UnityEngine;
 namespace MomoTextureForge.Modules {
 [ExecuteAlways] public sealed class MomoPosterize:MomoPostprocess {
 [Range(0f,16f)] public float darkSteps=0f;
[Range(0f,16f)] public float lightSteps=0f;
 protected override string ShaderName=>"Hidden/MomoTextureForge/Postprocess/posterize";
 protected override int Operation=>15;
 protected override int Pipeline=>0;
 protected override void Configure(Material material){material.SetFloat("_MF_darkSteps",darkSteps);
material.SetFloat("_MF_lightSteps",lightSteps);}
 }}
