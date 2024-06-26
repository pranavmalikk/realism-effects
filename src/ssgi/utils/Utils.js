﻿import { ShaderChunk, ShaderLib, UniformsUtils, Vector4 } from "three"

export const generateCubeUVSize = parameters => {
	const imageHeight = parameters.envMapCubeUVHeight

	if (imageHeight === null) return null

	const maxMip = Math.log2(imageHeight) - 2

	const texelHeight = 1.0 / imageHeight

	const texelWidth = 1.0 / (3 * Math.max(Math.pow(2, maxMip), 7 * 16))

	return { texelWidth, texelHeight, maxMip }
}

export const setupEnvMap = (ssgiMaterial, envMap, envMapCubeUVHeight) => {
	ssgiMaterial.uniforms.envMap.value = envMap

	const envMapCubeUVSize = generateCubeUVSize({ envMapCubeUVHeight })

	ssgiMaterial.defines.ENVMAP_TYPE_CUBE_UV = ""
	ssgiMaterial.defines.CUBEUV_TEXEL_WIDTH = envMapCubeUVSize.texelWidth
	ssgiMaterial.defines.CUBEUV_TEXEL_HEIGHT = envMapCubeUVSize.texelHeight
	ssgiMaterial.defines.CUBEUV_MAX_MIP = envMapCubeUVSize.maxMip + ".0"

	ssgiMaterial.needsUpdate = true
}

export const getMaxMipLevel = texture => {
	const { width, height } = texture.image

	return Math.floor(Math.log2(Math.max(width, height))) + 1
}

export const createGlobalDisableIblRadianceUniform = () => {
	if (!ShaderChunk.envmap_physical_pars_fragment.includes("iblRadianceDisabled")) {
		ShaderChunk.envmap_physical_pars_fragment = ShaderChunk.envmap_physical_pars_fragment.replace(
			"vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {",
			/* glsl */ `
		uniform bool iblRadianceDisabled;
	
		vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		 if(iblRadianceDisabled) return vec3(0.);
		`
		)
	}

	if ("iblRadianceDisabled" in ShaderLib.physical.uniforms) return ShaderLib.physical.uniforms["iblRadianceDisabled"]

	const globalIblRadianceDisabledUniform = {
		value: false
	}

	ShaderLib.physical.uniforms.iblRadianceDisabled = globalIblRadianceDisabledUniform

	const { clone } = UniformsUtils
	UniformsUtils.clone = uniforms => {
		const result = clone(uniforms)

		if ("iblRadianceDisabled" in uniforms) {
			result.iblRadianceDisabled = globalIblRadianceDisabledUniform
		}

		return result
	}

	return globalIblRadianceDisabledUniform
}

// source: https://github.com/mrdoob/three.js/blob/b9bc47ab1978022ab0947a9bce1b1209769b8d91/src/renderers/webgl/WebGLProgram.js#L228
// Unroll Loops

const unrollLoopPattern =
	/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g

export function unrollLoops(string) {
	return string.replace(unrollLoopPattern, loopReplacer)
}

function loopReplacer(match, start, end, snippet) {
	let string = ""

	for (let i = parseInt(start); i < parseInt(end); i++) {
		string += snippet.replace(/\[\s*i\s*\]/g, "[ " + i + " ]").replace(/UNROLLED_LOOP_INDEX/g, i)
	}

	return string
}

//

export const splitIntoGroupsOfVector4 = arr => {
	const result = []
	for (let i = 0; i < arr.length; i += 4) {
		result.push(new Vector4(...arr.slice(i, i + 4)))
	}

	return result
}

// this function generates a Vogel distribution for a given number of samples
// source: https://www.shadertoy.com/view/4t2SDh
export const generateVogelDistribution = (numSamples, scale = 1) => {
	const samples = []
	const goldenAngle = Math.PI * (3 - Math.sqrt(5))

	for (let i = 0; i < numSamples; i++) {
		const t = i / numSamples
		const r = Math.sqrt(t)
		const theta = i * goldenAngle

		const x = r * Math.cos(theta)
		const y = r * Math.sin(theta)

		samples.push({ x, y })
	}

	return samples
}
