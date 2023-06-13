// IIFE for top level await
(async () => { 
const vision = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/vision_bundle.js"); 
const { FaceLandmarker, FilesetResolver, DrawingUtils } = vision;

const video = document.getElementById('videoel');
const overlay = document.getElementById('overlay');
const canvas = overlay.getContext('2d');

let faceLandmarker;

let drawImage = true;
let drawFace = true;

function outputMax(mess) {
  window.max.outlet(mess);
}

function outputMaxDict(dstr) {
  window.max.outlet("dictionary", dstr);
}

function setMaxDict(d) {
  window.max.setDict('face_landmarkdict', d);
}

window.max.bindInlet('draw_image', function (enable) {
  drawImage = enable;
});

window.max.bindInlet('draw_face', function (enable) {
  drawFace = enable;
});

let lastVideoTime = -1;
let results = undefined;
const drawingUtils = new DrawingUtils(canvas);

function onResultsFace(results) {

  canvas.save();
  canvas.clearRect(0, 0, overlay.width, overlay.height);
  
  if(drawImage) {
    canvas.drawImage(results.image, 0, 0, overlay.width, overlay.height);
  }

  const output = {};

  // outputMax(JSON.stringify(results.faceBlendshapes));

  if (results.faceLandmarks) {
    for (const landmarks of results.faceLandmarks) {
      // output["LEFT_EYE"] = getCentre(FACE_LANDMARKS_LEFT_EYE_INDICES, landmarks);
      // output["RIGHT_EYE"] = getCentre(FACE_LANDMARKS_RIGHT_EYE_INDICES, landmarks);
      // output["LEFT_EYEBROW"] = getCentre(FACE_LANDMARKS_LEFT_EYEBROW_INDICES, landmarks);
      // output["RIGHT_EYEBROW"] = getCentre(FACE_LANDMARKS_RIGHT_EYEBROW_INDICES, landmarks);
      // output["FACE_OVAL"] = getCentre(FACE_LANDMARKS_FACE_OVAL_INDICES, landmarks);
      // output["LIPS"] = getCentre(FACE_LANDMARKS_LIPS_INDICES, landmarks);
      if (drawFace) {
        drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_TESSELATION,
          { color: "#C0C0C070", lineWidth: 1 }
        );
        drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
          { color: "#FF3030", lineWidth: 1 }
        );
        drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW,
          { color: "#FF3030", lineWidth: 1 }
        );
        drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
          { color: "#30FF30", lineWidth: 1 }
        );
        drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,
          { color: "#30FF30", lineWidth: 1 }
        );
        drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
          { color: "#E0E0E0", lineWidth: 1 }
        );
        drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LIPS, {
          color: "#E0E0E0", lineWidth: 1
        });
        drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS,
          { color: "#FF3030", lineWidth: 1 }
        );
        drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS,
          { color: "#30FF30", lineWidth: 1 }
        );
      }
    }
  }

  if (results.faceBlendshapes) {
    let face_index = 0;
    for (const face of results.faceBlendshapes) {
      const faceid = `face_${face_index}`;
      output[faceid] = {};
      output[faceid]["headIndex"] = face.headIndex;
      for (const shape of face.categories) {
        output[faceid][shape.categoryName] = shape.score;
      }
      face_index++;
    } 
  }

  setMaxDict(output);
  outputMax("update");
  canvas.restore();
}

const filesetResolver = await FilesetResolver.forVisionTasks(
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
);
faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
  baseOptions: {
    modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
    delegate: "GPU"
  },
  outputFaceBlendshapes: true,
  runningMode: "VIDEO",
  numFaces: 2
});

const camera = new Camera(video, {
  onFrame: async () => {
    let nowInMs = Date.now();
    if (lastVideoTime !== video.currentTime) {
      lastVideoTime = video.currentTime;
      results = faceLandmarker.detectForVideo(video, nowInMs);
      results.image = video;
      onResultsFace(results);
    }
  },
  width: 640,
  height: 480
});
camera.start();

})(); // end IIFE
