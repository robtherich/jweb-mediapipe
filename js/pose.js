const video = document.getElementById('videoel');
const overlay = document.getElementById('overlay');
const canvas = overlay.getContext('2d');

let drawImage = true;
let drawBody = true;

function outputMax(mess) {
  window.max.outlet(mess);
}

function outputMaxDict(dstr) {
  window.max.outlet("dictionary", dstr);
}

function setMaxDict(d) {
  window.max.setDict('posedict', d);
}

window.max.bindInlet('draw_image', function (enable) {
  drawImage = enable;
});

window.max.bindInlet('draw_body', function (enable) {
  drawBody = enable;
});

function onResultsPose(results) {

  canvas.save();
  canvas.clearRect(0, 0, overlay.width, overlay.height);

  if(drawImage) {
    canvas.drawImage(
      results.image, 0, 0, overlay.width, overlay.height);
  }

  const output = {
    "LEFT":{},
    "RIGHT":{},
    "NEUTRAL":{}
  };
  Object.entries(POSE_LANDMARKS_LEFT).forEach(([landmark, index]) => { output["LEFT"][landmark] = results.poseLandmarks[index] });
  Object.entries(POSE_LANDMARKS_RIGHT).forEach(([landmark, index]) => { output["RIGHT"][landmark] = results.poseLandmarks[index] });
  Object.entries(POSE_LANDMARKS_NEUTRAL).forEach(([landmark, index]) => { output["NEUTRAL"][landmark] = results.poseLandmarks[index] });

  setMaxDict(output);
  outputMax("update");

  if(drawBody) {
    drawConnectors(
        canvas, results.poseLandmarks, POSE_CONNECTIONS, {
          color: (data) => {
            const x0 = overlay.width * data.from.x;
            const y0 = overlay.height * data.from.y;
            const x1 = overlay.width * data.to.x;
            const y1 = overlay.height * data.to.y;

            const z0 = clamp(data.from.z + 0.5, 0, 1);
            const z1 = clamp(data.to.z + 0.5, 0, 1);

            const gradient = canvas.createLinearGradient(x0, y0, x1, y1);
            gradient.addColorStop(
                0, `rgba(0, ${255 * z0}, ${255 * (1 - z0)}, 1)`);
            gradient.addColorStop(
                1.0, `rgba(0, ${255 * z1}, ${255 * (1 - z1)}, 1)`);
            return gradient;
          }
        }
    );
    drawLandmarks(
        canvas,
        Object.values(POSE_LANDMARKS_LEFT)
            .map(index => results.poseLandmarks[index]),
        {color: zColor, fillColor: '#FF0000'});
    drawLandmarks(
        canvas,
        Object.values(POSE_LANDMARKS_RIGHT)
            .map(index => results.poseLandmarks[index]),
        {color: zColor, fillColor: '#00FF00'});
    drawLandmarks(
        canvas,
        Object.values(POSE_LANDMARKS_NEUTRAL)
            .map(index => results.poseLandmarks[index]),
        {color: zColor, fillColor: '#AAAAAA'});
  }

  canvas.restore();
}

const pose = new Pose({locateFile: (file) => {
  return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.2/${file}`;
}});
pose.onResults(onResultsPose);


const camera = new Camera(video, {
  onFrame: async () => {
    await pose.send({image: video});
  },
  width: 640,
  height: 480
});
camera.start();
