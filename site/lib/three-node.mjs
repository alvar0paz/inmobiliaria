// Runs the browser's Three.js r128 bundle and the site's 3D scripts inside Node, for tooling and tests.
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

// Just enough of a browser for the glTF exporter (Blob → ArrayBuffer) and loader (TextDecoder).
class FileReader {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(buffer => { this.result = buffer; this.onloadend?.(); this.onload?.({target: this}); }); }
  readAsDataURL(blob) { blob.arrayBuffer().then(buffer => { this.result = `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(buffer).toString('base64')}`; this.onloadend?.(); this.onload?.({target: this}); }); }
}

/** A context with THREE (+ GLTFLoader, GLTFExporter) and the given public/ scripts loaded in order. */
export function threeContext(scripts = []) {
  const context = {console, Blob, TextDecoder, TextEncoder, FileReader, URL, setTimeout, clearTimeout, Promise, performance,
    matchMedia: () => ({matches: false}), devicePixelRatio: 1};
  context.window = context.self = context;
  createContext(context);
  const run = path => runInContext(readFileSync(ROOT + path, 'utf8'), context, {filename: path});
  run('public/vendor/three.min.js');
  run('public/vendor/GLTFLoader.js');
  run('site/vendor/GLTFExporter.js');
  for (const script of scripts) run('public/' + script);
  return context;
}

/** Parses a .glb (ArrayBuffer or Buffer) into a glTF result inside the context. */
export function parseGlb(context, data) {
  const buffer = data instanceof ArrayBuffer ? data : data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  return new Promise((resolve, reject) => new context.THREE.GLTFLoader().parse(buffer, '', resolve, reject));
}
