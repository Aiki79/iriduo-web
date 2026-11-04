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
- Memories gallery (/gallery, native only): photos and recordings saved in document/ricordi; view photos in 3D in the viewer (/viewer?photo=), share, delete with confirmation
- Fixed code: viewer toggle; the code is reused through the ?fixed= stage param; falls back to a new code if taken (codeTaken); "Nuovo codice"/flood replace it
- Multiple invites: the sender adds up to 3 more viewers (addGuest/removeGuest) once live; chat/reactions go to everyone, bitrate applies to each
- RevenueCat Pro: still to do, the user's RevenueCat is not connected (oauth_pending)
- Security: three.js/PeerJS served from /api/lib, CSP + frame-ancestors on the stage, postMessage limited to the app's own origin, codes from crypto.getRandomValues, more than 5 calls a minute -> new code, "Nuovo codice" button, /api/join allowlist (frontend:// or exp:// on Emergent hosts), CORS without credentials, WebView limited to its own origin with no file access
- Contacts (/contacts): name + code, delete with confirmation, call; names in the sender and the history
- 3D photo (SBS/TB JPEG of the video or demo) and recording (MediaRecorder, max 5 min, auto-save on hangup); native: base64 chunks -> expo-file-system -> share sheet; web: download
- Onboarding /welcome (3 steps, shown only on first launch, "Come funziona" in Home)
- Pro subscription (RevenueCat): POSTPONED by the user
- Quick reactions (heart, applause, star, like, wow): sprites in the viewer's 3D scene (per-eye disparity, offset scaled to the field of view, frame-rate independent) and floaters on the sender's preview; 200ms rate limit on both sides
- Chat during calls over the PeerJS data connection: quick replies + text, chat panel (viewer and sender), toasts over the video (doubled in split view), message box in fullscreen
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
