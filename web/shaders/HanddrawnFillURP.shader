// Unity 6 / URP 17 reference. Validate in your target project before shipping.
Shader "MomoTextureForge/HanddrawnFill" {
    Properties {
        [NoScaleOffset] _MaskTex ("Mask (linear red channel)", 2D) = "white" {}
        [Enum(Solid,0,Hachure,1,CrossHatch,2,Dots,3,Dashed,4,Zigzag,5)] _Style ("Fill style", Float) = 2
        _Gap ("Gap (design pixels)", Range(2,96)) = 8
        _Width ("Stroke width / dot radius", Range(0.25,12)) = 1.1
        _Angle ("Angle (degrees)", Range(-180,180)) = -44
        _Roughness ("Wobble", Range(0,1)) = 0.25
        [IntRange] _Seed ("Seed", Range(1,99999)) = 1
        _DashLength ("Dash length", Range(1,128)) = 8
        _DashGap ("Dash gap", Range(1,128)) = 5
        _InkColor ("Ink (sRGB picker)", Color) = (0.91,0.267,0.286,1)
        _PaperColor ("Paper (sRGB picker)", Color) = (1,0.969,0.925,1)
        _InkOpacity ("Ink opacity", Range(0,1)) = 1
        _PaperOpacity ("Paper opacity", Range(0,1)) = 0
        _Scroll ("Scroll XY (design pixels/sec)", Vector) = (0,0,0,0)
        _DesignSize ("Design size XY", Vector) = (512,512,0,0)
        [Toggle] _UseCustomTime ("Use custom time", Float) = 0
        _TimeSeconds ("Custom time (seconds)", Float) = 0
    }
    SubShader {
        Tags { "RenderPipeline"="UniversalPipeline" "RenderType"="Transparent" "Queue"="Transparent" }
        Pass {
            Name "Unlit"
            Tags { "LightMode"="SRPDefaultUnlit" }
            Cull Off
            ZWrite Off
            Blend SrcAlpha OneMinusSrcAlpha, One OneMinusSrcAlpha
            HLSLPROGRAM
            #pragma target 3.0
            #pragma vertex Vert
            #pragma fragment Frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.core/ShaderLibrary/Color.hlsl"
            #include "handdrawn-fill.hlsl"
            TEXTURE2D(_MaskTex);
            SAMPLER(sampler_MaskTex);
            CBUFFER_START(UnityPerMaterial)
                float4 _InkColor, _PaperColor, _Scroll, _DesignSize;
                float _Style, _Gap, _Width, _Angle, _Roughness, _Seed;
                float _DashLength, _DashGap, _InkOpacity, _PaperOpacity;
                float _UseCustomTime, _TimeSeconds;
            CBUFFER_END
            struct Attributes { float4 positionOS : POSITION; float2 uv : TEXCOORD0; UNITY_VERTEX_INPUT_INSTANCE_ID };
            struct Varyings { float4 positionCS : SV_POSITION; float2 uv : TEXCOORD0; UNITY_VERTEX_OUTPUT_STEREO };
            Varyings Vert(Attributes input) {
                Varyings output;
                UNITY_SETUP_INSTANCE_ID(input);
                UNITY_INITIALIZE_VERTEX_OUTPUT_STEREO(output);
                output.positionCS = TransformObjectToHClip(input.positionOS.xyz);
                output.uv = input.uv;
                return output;
            }
            float4 Frag(Varyings input) : SV_Target {
                UNITY_SETUP_STEREO_EYE_INDEX_POST_VERTEX(input);
                MFHanddrawnParams v;
                v.style=_Style; v.gap=_Gap; v.width=_Width; v.angle=_Angle;
                v.roughness=_Roughness; v.seed=_Seed;
                v.dashLength=_DashLength; v.dashGap=_DashGap;
                v.inkOpacity=_InkOpacity; v.paperOpacity=_PaperOpacity;
                v.scroll=_Scroll.xy; v.designSize=_DesignSize.xy;
                // Unity converts Color properties for linear projects; normalize gamma projects here.
                v.inkColor=_InkColor.rgb; v.paperColor=_PaperColor.rgb;
                #ifdef UNITY_COLORSPACE_GAMMA
                    v.inkColor=SRGBToLinear(v.inkColor); v.paperColor=SRGBToLinear(v.paperColor);
                #endif
                float seconds=lerp(_Time.y,_TimeSeconds,step(0.5,_UseCustomTime));
                float4 result=MFHanddrawnFill(input.uv,SAMPLE_TEXTURE2D(_MaskTex,sampler_MaskTex,input.uv).r,seconds,v);
                #ifdef UNITY_COLORSPACE_GAMMA
                    result.rgb=LinearToSRGB(result.rgb);
                #endif
                return result;
            }
            ENDHLSL
        }
    }
    FallBack Off
}
