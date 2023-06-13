// IIFE for top level await
(async () => { 
const visbundle = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/vision_bundle.js"); 
const { ObjectDetector, FilesetResolver, Detection } = visbundle;

const video = document.getElementById('videoel');
const overlay = document.getElementById('overlay');
const canvas = overlay.getContext('2d');
canvas.font = "16px sans-serif";

let objectDetector;

let drawImage = true;
let drawDetections = true;

function outputMax(mess) {
  window.max.outlet(mess);
}

function outputMaxDict(dstr) {
  window.max.outlet("dictionary", dstr);
}

function setMaxDict(d) {
  window.max.setDict('obj_detections_dict', d);
}

window.max.bindInlet('draw_image', function (enable) {
  drawImage = enable;
});

window.max.bindInlet('draw_detections', function (enable) {
  drawDetections = enable;
});

let lastVideoTime = -1;
let results = undefined;

function onResultsObject(results) {

  canvas.save();
  canvas.clearRect(0, 0, overlay.width, overlay.height);
  
  if(drawImage) {
    canvas.drawImage(results.image, 0, 0, overlay.width, overlay.height);
  }

  const output = { "detections": [] };

  let detect_id = 0;
  for (const detection of results.detections) {
    const dtct = Object.assign({}, detection.categories[0],detection.boundingBox,{id: detect_id});
    output.detections.push(dtct);
    if(drawDetections) {
      drawRectangle(canvas, {
        xCenter: (dtct.originX + (dtct.width/2)) / overlay.width,
        yCenter: (dtct.originY + (dtct.height/2)) / overlay.height,
        height: dtct.height / overlay.height,
        width: dtct.width / overlay.width,
        rotation: 0,
        rectId: detect_id
      }, { color: "rgba(0, 255, 0, 0.5)", fillColor: "rgba(0, 255, 0, 0.05)", lineWidth: 3 })
      canvas.fillStyle = "red";
      canvas.fillText(`id:${detect_id} ${dtct.categoryName}`, dtct.originX, dtct.originY);
    }
    detect_id++;
  }

  setMaxDict(output);
  outputMax("update");
  canvas.restore();
}

const vision = await FilesetResolver.forVisionTasks(
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
);
objectDetector = await ObjectDetector.createFromOptions(vision, {
  baseOptions: {
    modelAssetPath: `https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite`,
    delegate: "GPU"
  },
  scoreThreshold: 0.5,
  runningMode: "VIDEO"
});

const camera = new Camera(video, {
  onFrame: async () => {
    let nowInMs = Date.now();
    if (lastVideoTime !== video.currentTime) {
      lastVideoTime = video.currentTime;
      results = objectDetector.detectForVideo(video, nowInMs);
      results.image = video;
      onResultsObject(results);
    }
  },
  width: 640,
  height: 480
});
camera.start();

})(); // end IIFE
