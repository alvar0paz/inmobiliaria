/* Project geometry for the no-WebGL fallback, without a browser. */
const fs=require('node:fs');
const THREE=require('../dist/vendor/three.min.js');
const {build}=require('../dist/sector-scene.js');
const {scene,places}=build(THREE);
const width=1200,height=1000,theta=.63,phi=.99;
const camera=new THREE.OrthographicCamera(-63,63,52.5,-52.5,.1,500);
camera.position.set(Math.sin(theta)*Math.sin(phi)*170,Math.cos(phi)*170,Math.cos(theta)*Math.sin(phi)*170);
camera.lookAt(0,5,0);camera.updateMatrixWorld();scene.updateMatrixWorld(true);
const direction=new THREE.Vector3().subVectors(camera.position,new THREE.Vector3(0,5,0)).normalize();
const sun=new THREE.Vector3(-35,85,45).normalize(),fill=new THREE.Vector3(60,35,-40).normalize();
const faces=[];
const project=point=>{const p=point.clone().project(camera);return [(p.x*.5+.5)*width,(.5-p.y*.5)*height,p.z]};
function triangles(geometry,matrix,material){
  const positions=geometry.getAttribute('position'),index=geometry.getIndex();
  const size=index?index.count:positions.count;
  for(let i=0;i<size;i+=3){
    const points=[0,1,2].map(n=>new THREE.Vector3().fromBufferAttribute(positions,index?index.getX(i+n):i+n).applyMatrix4(matrix));
    const normal=new THREE.Vector3().crossVectors(points[1].clone().sub(points[0]),points[2].clone().sub(points[0])).normalize();
    if(normal.dot(direction)<=0)continue;
    const light=.46+Math.max(0,normal.dot(sun))*.55+Math.max(0,normal.dot(fill))*.15;
    const colour=material.color.clone().multiplyScalar(light);
    if(material.emissive)colour.add(material.emissive.clone().multiplyScalar((material.emissiveIntensity||0)*.23));
    const vertices=points.map(project);
    faces.push({depth:vertices.reduce((sum,p)=>sum+p[2],0)/3,points:vertices,colour:'#'+new THREE.Color(Math.min(1,colour.r),Math.min(1,colour.g),Math.min(1,colour.b)).getHexString()});
  }
}
scene.traverse(mesh=>{
  if(!mesh.isInstancedMesh)return;
  for(let i=0;i<mesh.count;i++){const matrix=new THREE.Matrix4();mesh.getMatrixAt(i,matrix);matrix.premultiply(mesh.matrixWorld);triangles(mesh.geometry,matrix,mesh.material)}
});
faces.sort((a,b)=>b.depth-a.depth);
fs.writeFileSync(process.argv[2],JSON.stringify({width,height,faces,places:Object.fromEntries(Object.entries(places).map(([key,p])=>[key,project(new THREE.Vector3(...p.position))]))}));
console.log(`Projected ${faces.length} faces for the sector map fallback.`);
