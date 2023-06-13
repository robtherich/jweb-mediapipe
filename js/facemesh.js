const video = document.getElementById('videoel');
const overlay = document.getElementById('overlay');
const canvas = overlay.getContext('2d');

let drawImage = true;
let drawFace = true;

function outputMax(mess) {
  window.max.outlet(mess);
}

function outputMaxDict(dstr) {
  window.max.outlet("dictionary", dstr);
}

function setMaxDict(d) {
  window.max.setDict('facedict', d);
}

window.max.bindInlet('draw_image', function (enable) {
  drawImage = enable;
});

window.max.bindInlet('draw_face', function (enable) {
  drawFace = enable;
});

const getIndices = (section) => [... new Set(section.reduce((a,c) => {a.push(...c); return a}, []))];
const getCentre  = (indices, landmarks) => indices.reduce((a,c,i,ar) => { 
  let coords = landmarks[c];
  if(i === ar.length-1) { a.x /= i; a.y /= i; a.z /= i; return a }
  if(i > 0) { a.x += coords.x; a.y += coords.y; a.z += coords.z; return a }
  a.x = coords.x; a.y = coords.y; a.z = coords.z; return a
}, {});

const FACEMESH_LEFT_EYE_INDICES = getIndices(FACEMESH_LEFT_EYE);
const FACEMESH_LEFT_EYEBROW_INDICES = getIndices(FACEMESH_LEFT_EYEBROW);
const FACEMESH_RIGHT_EYE_INDICES = getIndices(FACEMESH_RIGHT_EYE);
const FACEMESH_RIGHT_EYEBROW_INDICES = getIndices(FACEMESH_RIGHT_EYEBROW);
const FACEMESH_FACE_OVAL_INDICES = getIndices(FACEMESH_FACE_OVAL);
const FACEMESH_LIPS_INDICES = getIndices(FACEMESH_LIPS);

function onResultsFace(results) {

  canvas.save();
  canvas.clearRect(0, 0, overlay.width, overlay.height);
  
  if(drawImage) {
    canvas.drawImage(results.image, 0, 0, overlay.width, overlay.height);
  }

  const output = {};

  if (results.multiFaceLandmarks) {
    for (const landmarks of results.multiFaceLandmarks) {
      output["LEFT_EYE"] = getCentre(FACEMESH_LEFT_EYE_INDICES, landmarks);
      output["RIGHT_EYE"] = getCentre(FACEMESH_RIGHT_EYE_INDICES, landmarks);
      output["LEFT_EYEBROW"] = getCentre(FACEMESH_LEFT_EYEBROW_INDICES, landmarks);
      output["RIGHT_EYEBROW"] = getCentre(FACEMESH_RIGHT_EYEBROW_INDICES, landmarks);
      output["FACE_OVAL"] = getCentre(FACEMESH_FACE_OVAL_INDICES, landmarks);
      output["LIPS"] = getCentre(FACEMESH_LIPS_INDICES, landmarks);
      if (drawFace) {
        drawConnectors(
            canvas, landmarks, FACEMESH_TESSELATION,
            {color: '#C0C0C070', lineWidth: 1});
        drawConnectors(
            canvas, landmarks, FACEMESH_RIGHT_EYE,
            {color: '#FF3030', lineWidth: 1});
        drawConnectors(
            canvas, landmarks, FACEMESH_RIGHT_EYEBROW,
            {color: '#FF3030', lineWidth: 1});
        drawConnectors(
            canvas, landmarks, FACEMESH_LEFT_EYE,
            {color: '#30FF30', lineWidth: 1});
        drawConnectors(
            canvas, landmarks, FACEMESH_LEFT_EYEBROW,
            {color: '#30FF30', lineWidth: 1});
        drawConnectors(
            canvas, landmarks, FACEMESH_FACE_OVAL,
            {color: '#E0E0E0', lineWidth: 1});
        drawConnectors(
            canvas, landmarks, FACEMESH_LIPS,
            {color: '#E0E0E0', lineWidth: 1});
      }
    }

  }

  setMaxDict(output);
  outputMax("update");
  canvas.restore();
}

const face = new FaceMesh({locateFile: (file) => {
  return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.1/${file}`;
}});
face.onResults(onResultsFace);


const camera = new Camera(video, {
  onFrame: async () => {
    await face.send({image: video});
  },
  width: 640,
  height: 480
});
camera.start();
