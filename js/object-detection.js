// IIFE for top level await
(async () => { 
const visbundle = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/vision_bundle.js"); 
const { ObjectDetector, FilesetResolver, Detection } = visbundle;

const video = document.getElementById('videoel');
const image = document.getElementById('imageel');
const overlay = document.getElementById('overlay');
const canvas = overlay.getContext('2d');
canvas.font = "16px sans-serif";

let objectDetector;
let camera;

let drawImage = true;
let drawDetections = true;
let runningMode = "VIDEO";

function outputMax(mess) {
  window.max.outlet(mess);
}

function outputMaxDict(dstr) {
  window.max.outlet("dictionary", dstr);
}

function setMaxDict(d) {
  window.max.setDict('obj_detections_dict', d);
}

window.max.bindInlet('draw_image', async function (enable) {
  drawImage = enable;
  if(runningMode === "IMAGE") {
    await detectImage();
  }
});

window.max.bindInlet('draw_detections', async function (enable) {
  drawDetections = enable;
  if(runningMode === "IMAGE") {
    await detectImage();
  }
});

window.max.bindInlet('set_image', async function (imageFile) {
  await setRunningMode("IMAGE");
  image.src = imageFile;
});

window.max.bindInlet('set_mediadevice', async function (deviceLabel) {
  let devices = await getMediaDeviceByLabel(deviceLabel);
  if (!devices.length) {
    window.max.outlet("error", `No video input device: "${deviceLabel}" exists.`);
    return
  }
  const device = devices.shift();
  video.srcObject = await navigator.mediaDevices.getUserMedia({video: {deviceId: device.deviceId}});
  await setRunningMode("VIDEO");
});

window.max.bindInlet('get_mediadevices', function () {
  getVideoDevicesForMax();
});

const getMediaDevices = async () => {   
  if (!navigator.mediaDevices?.enumerateDevices) {
    window.max.outlet("error", "Cannot list available media devices.");
    return []
  }
  return await navigator.mediaDevices.enumerateDevices();
}

const getMediaDeviceByLabel = async (deviceLabel) => {
  let mediaDevices = await getMediaDevices();
  return mediaDevices.filter(device => device.label == deviceLabel);
}

const getVideoDevicesForMax = () => {
  getMediaDevices()
  .then((devices) => {
    let mediadevices = [];
    devices.forEach((device) => {
      if (device.kind === "videoinput") {
        mediadevices.push(device.label);
      }
    });
    window.max.outlet.apply(window.max, ["mediadevices"].concat(mediadevices));
  })
  .catch((err) => {
    window.max.outlet("error",`${err.name}: ${err.message}`);
  });
}


const startVideo = () => {
  camera = new Camera(video, {
    onFrame: async () => {
      if (video && runningMode === "VIDEO") {
        let nowInMs = Date.now();
        if (lastVideoTime !== video.currentTime) {
          lastVideoTime = video.currentTime;
          results = objectDetector.detectForVideo(video, nowInMs);
          results.image = video;
          onResultsObject(results);
        }
      }
    },
    width: 640,
    height: 480
  });
  camera.start();
}


function stopBothVideoAndAudio() {
  camera = undefined;
  video.srcObject.getTracks().forEach((track) => {
      if (track.readyState == 'live') {
          track.stop();
      }
  });
}

const setRunningMode = async (running_mode) => {
  if (running_mode === runningMode) return
  canvas.clearRect(0, 0, overlay.width, overlay.height);
  switch(running_mode) {
    case "IMAGE":
      stopBothVideoAndAudio();
      runningMode = running_mode; 
      await objectDetector.setOptions({ runningMode: running_mode }); 
      return
    case "VIDEO":
      runningMode = running_mode; 
      await objectDetector.setOptions({ runningMode: running_mode }); 
      startVideo();
      return      
    default:
      window.max.outlet("error", `No running mode: "${running_mode}" exists.`); return
  }
};

const detectImage = async () => {
  let results = objectDetector.detect(image); 
  results.image = image;
  onResultsObject(results);
};

image.onload = detectImage;

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
  runningMode,
});

getVideoDevicesForMax();
startVideo();

})(); // end IIFE
