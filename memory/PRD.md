# PRD – Chiamata VR180 (Expo app)

## Original problem
"Crea un'app mobile" from the uploaded index.html "Chiamata VR180": a 3D video call. The sender uses a dual-lens VR180 camera and the viewer watches in a headset, using PeerJS (WebRTC) with a 6-digit code. Then "index 2.html" was uploaded ("Questa é l'immagine dell'app"). It is identical except for icon links (icona.svg, icona-192.png). The icon files were NOT uploaded.

## User choices
- The phone both watches and transmits
- 3D view on the phone: drag with a finger AND split-screen (Cardboard), switchable
- Default: reuse the page's logic inside the app (WebView), so it stays compatible with the Meta Quest page

## Architecture
- Backend FastAPI: GET /api/stage?mode=viewer|sender serves stage.html (three.js + PeerJS, the same prefix `vr180chiamata-`)
- Frontend Expo Router: index (home), viewer, sender. StageView = WebView (native) or iframe (web), bridged with postMessage/injectJavaScript
- Native: expo-sensors DeviceMotion for looking around, expo-screen-orientation for landscape fullscreen, expo-camera permissions, recent codes stored locally

## Implemented (2026-06)
- Call history (/history, local storage): incoming/outgoing, duration, average quality, result, Richiama (auto-call), clear
- Auto call from link/Richiama once the camera is ready (only once)
- Procedural stereo 3D demos (Sfere, Tunnel, Stelle) as a CanvasTexture in the stage, no files needed
- Auto quality: sending bitrate steps down after weak readings and back up after good ones (5/10/20/40 Mbit), switch + notice
- 15s timeout when connecting to the PeerJS server
- Call timer: getStats every 2s in the stage. Duration, quality (Good/Medium/Weak), Mbit/s, fps, delay and loss shown on viewer (card + pill in fullscreen) and sender (pill on preview + card). Decline made reliable (queued until the data connection opens); viewer leaves fullscreen when the call ends
- Direct link: the shared message contains https link /api/join?code=X&app=<createURL base>. The landing page redirects to app sender?code=X (exp://, frontend:// or same-host https). The sender prefills the code and shows a "ricevuto dal link" status
- Share code (viewer): WhatsApp (wa.me), SMS (sms: body), Other (system share sheet) buttons under the code, with a ready-made Italian message
- App icon from the user's image (IMG_2031): rounded corners filled and saved as 1024 icon, Android adaptive icon (background #243757), splash and favicon. Logo shown on the home screen
- Home with two roles; dark theme taken from the HTML; Atkinson Hyperlegible font
- Viewer: 6-digit code, status, Answer/Decline, drag view or split view, phone motion, recentre, landscape fullscreen, SBS/TB format, eye swap, test video
- Sender: permission gate, choice of camera, microphone, resolution and bitrate, preview, code entry, recent codes, Call/Cancel/Hang up, live badge
- Decline/cancel signalling over a PeerJS data connection, 45s ring timeout

## Backlog
- P2: call duration timer, sharing the code, call history
