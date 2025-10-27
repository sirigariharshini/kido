// script.js
// BubblyBot — browser-only emotion detection + chatbot
// Requires face-api.js included in index.html and models in ./models/

const video = document.getElementById('video');
const overlay = document.getElementById('overlay');
const statusEl = document.getElementById('status');
const emotionDisplay = document.getElementById('emotion-display');
const chatWindow = document.getElementById('chat-window');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const voiceBtn = document.getElementById('voice-btn');

let canvas, ctx;
let isModelLoaded = false;
let lastEmotion = null;
let emotionHistory = [];

// Calm & caring BubblyBot replies by emotion
const replies = {
  neutral: [
    "I see you're calm. Want a quick breathing break?",
    "Nice and steady — would you like a small stretch with me?"
  ],
  happiness: [
    "I love your smile! Care to share what made you happy?",
    "That's great! Keep shining ✨"
  ],
  sadness: [
    "I'm here with you. Want to try a 3-breath calm together?",
    "I’m sorry you’re feeling down. Small steps help — tell me one thing that’s okay."
  ],
  anger: [
    "That sounds frustrating. Take one slow breath with me.",
    "I’m here. Would you like a short calm-down exercise?"
  ],
  surprise: [
    "Oh! That looked like surprise — everything ok?",
    "That was a surprise face! Do you want to tell me what happened?"
  ],
  fear: [
    "You seem worried. You're safe here. Breathe slowly with me.",
    "If it's scary, try grounding: name 3 things you see right now."
  ],
  disgust: [
    "Yikes. That didn't look good. Would you like to change the topic?",
    "I get that reaction. Want a small joke to lighten the mood?"
  ]
};

// friendly system message
function botSay(text) {
  const d = document.createElement('div');
  d.className = 'msg bot';
  d.innerText = text;
  chatWindow.appendChild(d);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// user message
function userSay(text) {
  const d = document.createElement('div');
  d.className = 'msg user';
  d.innerText = text;
  chatWindow.appendChild(d);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function systemSay(text) {
  const d = document.createElement('div');
  d.className = 'msg system';
  d.innerText = text;
  chatWindow.appendChild(d);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// choose a calm reply for an emotion
function chooseReply(emotion) {
  const e = mapToSimpleEmotion(emotion);
  const pool = replies[e] || replies.neutral;
  return pool[Math.floor(Math.random() * pool.length)];
}

function mapToSimpleEmotion(raw) {
  if (!raw) return 'neutral';
  raw = raw.toLowerCase();
  if (raw.includes('happy') || raw.includes('happiness')) return 'happiness';
  if (raw.includes('sad')) return 'sadness';
  if (raw.includes('angry') || raw.includes('anger')) return 'anger';
  if (raw.includes('surprise')) return 'surprise';
  if (raw.includes('fear')) return 'fear';
  if (raw.includes('disgust')) return 'disgust';
  return 'neutral';
}

// Load face-api.js models from /models folder
async function loadModels() {
  statusEl.innerText = 'Loading face models...';
  try {
    // expected models in ./models
    await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
    await faceapi.nets.faceExpressionNet.loadFromUri('/models');
    // optional landmarks if you want to draw
    await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
    isModelLoaded = true;
    statusEl.innerText = 'Models loaded — starting camera';
    startVideo();
  } catch (err) {
    statusEl.innerText = 'Failed to load models. See README for model download.';
    console.error(err);
  }
}

async function startVideo() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    video.srcObject = stream;
    video.onloadedmetadata = () => {
      video.play();
      initCanvas();
      detectLoop();
    };
  } catch (err) {
    statusEl.innerText = 'Camera access denied or not available.';
    console.error(err);
  }
}

function initCanvas() {
  canvas = overlay;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx = canvas.getContext('2d');
}

// run detection repeatedly
async function detectLoop() {
  if (!isModelLoaded) return;
  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 256, scoreThreshold: 0.5 });

  const result = await faceapi.detectSingleFace(video, options).withFaceExpressions();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (result) {
    const { expressions, detection } = result;
    const top = Object.entries(expressions).sort((a,b)=>b[1]-a[1])[0];
    const emotion = top ? top[0] : 'neutral';
    const confidence = top ? top[1] : 0;

    lastEmotion = emotion;
    emotionHistory.push({ emotion, confidence, ts: Date.now() });
    if (emotionHistory.length > 200) emotionHistory.shift();

    // Draw box
    const box = detection.box;
    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = 2;
    ctx.strokeRect(box.x, box.y, box.width, box.height);

    // label
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(box.x, box.y - 26, 160, 24);
    ctx.fillStyle = '#0b1220';
    ctx.font = '16px Inter, sans-serif';
    ctx.fillText(`${capitalize(emotion)} ${(confidence*100).toFixed(0)}%`, box.x + 6, box.y - 8);

    emotionDisplay.innerText = `${capitalize(emotion)} · ${(confidence*100).toFixed(0)}%`;

    // auto-bot reaction: if emotion changed significantly, bot says something supportive
    if (shouldBotReact(emotion)) {
      const reply = chooseReply(emotion);
      botSay(reply);
    }
  } else {
    emotionDisplay.innerText = 'No face detected';
  }

  requestAnimationFrame(detectLoop);
}

let lastBotReactEmotion = null;
let lastBotReactTime = 0;
// rule: react if emotion changed or persists strongly for some seconds
function shouldBotReact(emotion) {
  const now = Date.now();
  if (!emotion) return false;
  if (lastBotReactEmotion !== emotion && (now - lastBotReactTime) > 4500) {
    lastBotReactEmotion = emotion;
    lastBotReactTime = now;
    return true;
  }
  // if same emotion and high confidence persist for 8 sec, react again
  const recent = emotionHistory.slice(-10);
  const avgConf = recent.reduce((s,r)=>s+(r.emotion===emotion?r.confidence:0),0) / Math.max(1,recent.length);
  if (avgConf > 0.75 && (now - lastBotReactTime) > 8000) {
    lastBotReactTime = now;
    return true;
  }
  return false;
}

function capitalize(s){ return s ? s[0].toUpperCase()+s.slice(1) : s }

// Chat form behavior
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;
  userSay(text);
  chatInput.value = '';
  replyToUser(text);
});

// small rule-based reply generator that also considers last detected emotion
function replyToUser(userText) {
  const em = lastEmotion ? mapToSimpleEmotion(lastEmotion) : 'neutral';
  // simple intent rules
  const lowered = userText.toLowerCase();
  if (lowered.includes('help') || lowered.includes('sad') || lowered.includes('stress')) {
    const r = chooseReply('sadness');
    botSay(r);
    return;
  }
  if (lowered.includes('joke') || lowered.includes('funny')) {
    botSay("Here’s a tiny silly one: Why did the computer visit the doctor? It had a virus! 😊");
    return;
  }
  // Otherwise reply based on emotion
  botSay(chooseReply(em));
}

// Voice input (basic)
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recog = new SpeechRecognition();
  recog.lang = 'en-US';
  recog.interimResults = false;
  recog.maxAlternatives = 1;

  voiceBtn.addEventListener('click', () => {
    try {
      recog.start();
      systemSay('Listening...');
    } catch(e) { console.warn(e) }
  });

  recog.onresult = (ev) => {
    const text = ev.results[0][0].transcript;
    userSay(text);
    replyToUser(text);
  };

  recog.onerror = (ev) => {
    systemSay('Voice not available or permission denied.');
  };
} else {
  voiceBtn.style.display = 'none';
}

// small helper to initialize app
function startApp() {
  loadModels();
  systemSay('Models loading — give permission to access your camera when the browser asks.');
}

// start
startApp();
