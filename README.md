# BubblyBot — Emotion-aware Chat + Live Camera

**What it is**
A browser-only demo that detects facial expressions from your webcam and runs a small emotion-aware chatbot (BubblyBot). Everything runs locally in the browser (no server).

---

## Files
- `index.html` — main page
- `style.css` — styles
- `script.js` — camera, face-api, chatbot
- `models/` — face-api model files (see below)
- `assets/` — optional images/icons

---

## IMPORTANT: Download models
face-api.js requires model weight files. Create a `models/` folder inside the project root and download the following weights into it:

Required models:
- `tiny_face_detector_model-weights_manifest.json` + corresponding shard(s)
- `face_expression_model-weights_manifest.json` + shards
- `face_landmark_68_model-weights_manifest.json` + shards (optional, recommended)

You can get the official weights from the face-api.js repo (or community mirror). Example sources:
- Official face-api.js weights repo: https://github.com/justadudewhohacks/face-api.js/tree/master/weights
- Or download a prepackaged `models` folder from a public release seen in many demos.

Place the entire `models/` folder under the project root so the paths look like:
