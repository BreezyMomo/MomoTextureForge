using UnityEngine;
 namespace MomoTextureForge.Modules {
 [ExecuteAlways] public sealed class MomoGravitationalLens:MomoPostprocess {
 [Range(0f,1f)] public float lensingStrength=0.3f;
[Range(0.1f,2f)] public float magnification=0.84f;
[Range(0f,1f)] public float centerX=0.5f;
[Range(0f,1f)] public float centerY=0.5f;
 protected override string ShaderName=>"Hidden/MomoTextureForge/Postprocess/gravitationalLens";
 protected override int Operation=>46;
 protected override int Pipeline=>0;
 protected override void Configure(Material material){material.SetFloat("_MF_lensingStrength",lensingStrength);
material.SetFloat("_MF_magnification",magnification);
material.SetFloat("_MF_centerX",centerX);
material.SetFloat("_MF_centerY",centerY);}
 }}
