// IIFE for top level await
(async () => { 
  const vision = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/vision_bundle.js"); 
  const { FaceLandmarker, FilesetResolver, DrawingUtils } = vision;
  
  const video = document.getElementById('videoel');
  const image = document.getElementById('imageel');
  const overlay = document.getElementById('overlay');
  const canvas = overlay.getContext('2d');
  
  let faceLandmarker;
  let camera;
  
  let drawImage = true;
  let drawFace = true;
  let runningMode = "VIDEO";
  
  function outputMax(mess) {
    window.max.outlet(mess);
  }
  
  function outputMaxDict(dstr) {
    window.max.outlet("dictionary", dstr);
  }
  
  function setMaxDict(d) {
    window.max.setDict('facedict', d);
  }
  
  window.max.bindInlet('draw_image', async function (enable) {
    drawImage = enable;
    if(runningMode === "IMAGE") {
      await detectImage();
    }
  });
  
  window.max.bindInlet('draw_face', async function (enable) {
    drawFace = enable;
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
            results = faceLandmarker.detectForVideo(video, nowInMs);
            results.image = video;
            onResultsFace(results);
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
        await faceLandmarker.setOptions({ runningMode: running_mode }); 
        return
      case "VIDEO":
        runningMode = running_mode; 
        await faceLandmarker.setOptions({ runningMode: running_mode }); 
        startVideo();
        return      
      default:
        window.max.outlet("error", `No running mode: "${running_mode}" exists.`); return
    }
  };
  
  const detectImage = async () => {
    let results = faceLandmarker.detect(image); 
    results.image = image;
    onResultsFace(results);
  };
  
  image.onload = detectImage;

  const getIndices = (section) => [... new Set(section.reduce((a,c) => {a.push(c.start,c.end); return a}, []))];
  const getCentre  = (indices, landmarks) => indices.reduce((a,c,i,ar) => { 
    let coords = landmarks[c];
    if(i === ar.length-1) { a.x /= i; a.y /= i; a.z /= i; return a }
    if(i > 0) { a.x += coords.x; a.y += coords.y; a.z += coords.z; return a }
    a.x = coords.x; a.y = coords.y; a.z = coords.z; return a
  }, {});

  const FACEMESH_LEFT_EYE_INDICES = getIndices(FaceLandmarker.FACE_LANDMARKS_LEFT_EYE);
  const FACEMESH_LEFT_IRIS_INDICES = getIndices(FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS);
  const FACEMESH_LEFT_EYEBROW_INDICES = getIndices(FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW);
  const FACEMESH_RIGHT_EYE_INDICES = getIndices(FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE);
  const FACEMESH_RIGHT_IRIS_INDICES = getIndices(FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS);
  const FACEMESH_RIGHT_EYEBROW_INDICES = getIndices(FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW);
  const FACEMESH_FACE_OVAL_INDICES = getIndices(FaceLandmarker.FACE_LANDMARKS_FACE_OVAL);
  const FACEMESH_LIPS_INDICES = getIndices(FaceLandmarker.FACE_LANDMARKS_LIPS);

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
  
    if (results.faceLandmarks) {
      let face_index = 0;
      for (const landmarks of results.faceLandmarks) {
        const faceid = `face_${face_index}`;
        output[faceid] = {};
        output[faceid]["Left_Eye"] = getCentre(FACEMESH_LEFT_EYE_INDICES, landmarks);
        output[faceid]["Right_Eye"] = getCentre(FACEMESH_RIGHT_EYE_INDICES, landmarks);
        output[faceid]["Left_Iris"] = getCentre(FACEMESH_LEFT_IRIS_INDICES, landmarks);
        output[faceid]["Right_Iris"] = getCentre(FACEMESH_RIGHT_IRIS_INDICES, landmarks);
        output[faceid]["Left_Eyebrow"] = getCentre(FACEMESH_LEFT_EYEBROW_INDICES, landmarks);
        output[faceid]["Right_Eyebrow"] = getCentre(FACEMESH_RIGHT_EYEBROW_INDICES, landmarks);
        output[faceid]["Face_Oval"] = getCentre(FACEMESH_FACE_OVAL_INDICES, landmarks);
        output[faceid]["Lips"] = getCentre(FACEMESH_LIPS_INDICES, landmarks);
        setMaxDict(output);
        outputMax("update");
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
        face_index++;
      }
    }
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
    outputFaceBlendshapes: false,
    runningMode,
    numFaces: 2
  });
  
  getVideoDevicesForMax();
  startVideo();
  
  })(); // end IIFE
