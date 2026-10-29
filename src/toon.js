import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// Cel look shared by everything in the scene:
// - toon(): two flat tones (lit / shadow) with a crisp, anti-aliased edge between them
// - outline(): an inverted-hull ink line with a constant on-screen width

export const INK = '#1d1426';

const TOON_EDGE = 0.12; // dot(N, L) where light turns into shadow

const gradientChunk = /* glsl */ `
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
  float d = dot( normal, lightDirection );
  float fw = fwidth( d ) * 0.75;
  return vec3( smoothstep( ${TOON_EDGE.toFixed(3)} - fw, ${TOON_EDGE.toFixed(3)} + fw, d ) );
}
`;

export function toon(params = {}) {
  const m = new THREE.MeshToonMaterial(params);
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <gradientmap_pars_fragment>', gradientChunk);
  };
  m.customProgramCacheKey = () => 'cel2';
  return m;
}

const resolution = { value: new THREE.Vector2(1, 1) };

export function setOutlineResolution(width, height) {
  resolution.value.set(width, height);
}

const outlineMaterials = new Map();

function outlineMaterial(px, color) {
  const key = `${px}|${color}`;
  if (!outlineMaterials.has(key)) {
    outlineMaterials.set(key, new THREE.ShaderMaterial({
      uniforms: {
        uResolution: resolution,
        uThickness: { value: px },
        uColor: { value: new THREE.Color(color) },
      },
      vertexShader: /* glsl */ `
        uniform vec2 uResolution;
        uniform float uThickness;
        void main() {
          vec4 clip = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
          vec3 n = normalize( normalMatrix * normal );
          vec2 dir = ( projectionMatrix * vec4( n, 0.0 ) ).xy * uResolution;
          float len = length( dir );
          dir = len > 1e-5 ? dir / len : vec2( 0.0 );
          clip.xy += dir * uThickness * 2.0 / uResolution * clip.w;
          gl_Position = clip;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        void main() {
          gl_FragColor = vec4( uColor, 1.0 );
          #include <colorspace_fragment>
        }
      `,
      side: THREE.BackSide,
    }));
  }
  return outlineMaterials.get(key);
}

const smoothCache = new WeakMap();

// Hard-edged geometry (boxes, extrusions) has split normals, which tear the hull at corners.
// The hull uses a welded copy with averaged normals instead.
function smoothed(geometry) {
  if (!smoothCache.has(geometry)) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', geometry.getAttribute('position').clone());
    if (geometry.index) g.setIndex(geometry.index.clone());
    const merged = mergeVertices(g, 1e-4);
    merged.computeVertexNormals();
    smoothCache.set(geometry, merged);
  }
  return smoothCache.get(geometry);
}

export function outline(mesh, px = 1.6, { color = INK, geometry, smooth = true } = {}) {
  const geo = geometry ?? (smooth ? smoothed(mesh.geometry) : mesh.geometry);
  const hull = new THREE.Mesh(geo, outlineMaterial(px, color));
  hull.raycast = () => {};
  hull.userData.isOutline = true;
  mesh.add(hull);
  return hull;
}
