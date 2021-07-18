import { GammaEncoding, LinearEncoding, LogLuvEncoding, RGBDEncoding, RGBEEncoding, RGBM16Encoding, RGBM7Encoding, sRGBEncoding, TextureEncoding } from 'three';

// Taken from Three.js
function getEncodingComponents(encoding: TextureEncoding) {
	switch ( encoding ) {
		case LinearEncoding:
			return [ 'Linear', '( value )' ];
		case sRGBEncoding:
			return [ 'sRGB', '( value )' ];
		case RGBEEncoding:
			return [ 'RGBE', '( value )' ];
		case RGBM7Encoding:
			return [ 'RGBM', '( value, 7.0 )' ];
		case RGBM16Encoding:
			return [ 'RGBM', '( value, 16.0 )' ];
		case RGBDEncoding:
			return [ 'RGBD', '( value, 256.0 )' ];
		case GammaEncoding:
			return [ 'Gamma', '( value, float( GAMMA_FACTOR ) )' ];
		case LogLuvEncoding:
			return [ 'LogLuv', '( value )' ];
		default:
			console.warn( 'THREE.WebGLProgram: Unsupported encoding:', encoding );
			return [ 'Linear', '( value )' ];
	}
}

// Taken from Three.js
function getTexelDecodingFunction(functionName: string, encoding: TextureEncoding): string {
	const components = getEncodingComponents( encoding );
	return 'vec4 ' + functionName + '( vec4 value ) { return ' + components[ 0 ] + 'ToLinear' + components[ 1 ] + '; }';
}
