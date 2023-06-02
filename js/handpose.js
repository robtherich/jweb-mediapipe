const video = document.getElementById('videoel');
const overlay = document.getElementById('overlay');
const canvas = overlay.getContext('2d');

let drawImage = true;
let drawHands = true;

function outputMax(mess) {
  window.max.outlet(mess);
}

function outputMaxDict(dstr) {
  window.max.outlet("dictionary", dstr);
}

function setMaxDict(d) {
  window.max.setDict('handdict', d);
}

window.max.bindInlet('draw_image', function (enable) {
  drawImage = enable;
});

window.max.bindInlet('draw_hands', function (enable) {
  drawHands = enable;
});

function onResultsHands(results) {

  canvas.save();
  canvas.clearRect(0, 0, overlay.width, overlay.height);
  
  if(drawImage) {
    canvas.drawImage(results.image, 0, 0, overlay.width, overlay.height);
  }
  
  if (results.multiHandLandmarks && results.multiHandedness) {
    const output = {};
    for (let index = 0; index < results.multiHandLandmarks.length; index++) {
      
      const classification = results.multiHandedness[index];
      const isRightHand = classification.label === 'Right';
      const landmarks = results.multiHandLandmarks[index];

      const entry = {};
      entry.landmarks = landmarks;
      output[classification.label] = entry;

      if(drawHands) {
        drawConnectors(
          canvas, landmarks, HAND_CONNECTIONS,
            {color: isRightHand ? '#00FF00' : '#FF0000'}),
        drawLandmarks(canvas, landmarks, {
          color: isRightHand ? '#00FF00' : '#FF0000',
          fillColor: isRightHand ? '#FF0000' : '#00FF00',
          radius: (x) => {
            return lerp(x.from.z, -0.15, .1, 10, 1);
          }
        });
      }
    }

    //outputMaxDict(JSON.stringify(output));
    setMaxDict(output);
    outputMax("update");

  }
  canvas.restore();
}

const hands = new Hands({locateFile: (file) => {
  return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.1/${file}`;
}});
hands.onResults(onResultsHands);

const camera = new Camera(video, {
  onFrame: async () => {
    await hands.send({image: video});
  },
  width: 640,
  height: 480
});
camera.start();
