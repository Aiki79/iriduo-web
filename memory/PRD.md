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
- Slogan "IriDuo — a tu per tu, in 3D" / "face to face, in 3D" on home, welcome, share message and join page
- Presence: TTL/unique indexes in INDEXES, leave on background (AppState) and pagehide (keepalive); main viewer excluded from guest suggestions
- App renamed **IriDuo** (app.json name, home, welcome, share message, join page). Bundle identifier unchanged
- Group chat: the sender forwards each viewer's messages to the other viewers (label "Visore X" / contact name)
- Waiting room: /api/presence (POST ping every 20s from a waiting viewer, DELETE on leave, GET ?codes= only for known codes, TTL 120s). The sender shows "In attesa ora" with one-tap call, plus online suggestions in the guest panel
- Gallery videos in 3D: the recording is sent to the stage in base64 chunks (vidChunk) and played on the 3D sphere
- Pro: RevenueCat still not connected (oauth_pending)
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

## Jun 2026 - UI polish
- Rubrica: nomi lunghi troncati, pulsanti sempre visibili (testato a 320px)
- Pannello ospiti: nomi e chip troncati su schermi piccoli
- Chat mittente: spazio extra sotto la chat per non toccare per errore 'Chiudi chiamata'

## Jun 2026 - IriDuo Pro (prova), icona, presenza, galleria
- Nome: IriDuo. Icona: quella originale dell'utente + visore stilizzato sulla testa blu (scripts/visor_icon.py)
- Pro in MODALITÀ PROVA (src/pro.ts, app/pro.tsx): 6,99€/mese o 59,99€/anno, nessun pagamento reale (RevenueCat saltato dall'utente)
- Gratis: 3 chiamate/mese, solo HD, storico ultime 3, 3 reazioni, niente foto 3D/registrazioni. Pro: tutto sbloccato
- Presenza: ping 8s, scadenza 20s, uscita su visibilitychange/pagehide; mittente controlla ogni 5s
- Galleria: filtri Tutti/Foto/Video, anteprima foto a schermo intero

## Jun 2026 - Security audit (PASS) + fixes
- /api/status rimosso; presenza con token del visore (409 se codice in uso, DELETE solo col token)
- Rate limit per IP (ultimo hop X-Forwarded-For): 40 scritture/min, 60 letture/min
- Icona: ripristinata l'originale dell'utente

- Icona: ridisegnata a 1024 dalla versione 192px dell'utente (due persone, visore a sinistra, 3D rosso/blu a destra) - scripts/draw_icon_v2.py

## Jun 2026 - Fisheye ELP
- Formato video 'Due cerchi fisheye affiancati (camera ELP)': stage.html uvFisheye (equidistante, sfere 128x64 per occhio, layer 1/2)
- Cursori (FisheyePanel.tsx): centro X/Y ±150px, cerchio 70-130%, obiettivo 160-220° (187), occhio destro ±40px, Ripristina. Salvati solo in localStorage 'fisheye' dello stage, mai trasmessi
- Foto in fisheye salvate con suffisso _FE

## Jun 2026 - Guida calibrazione + Profili camera
- Pulsante 'Guida calibrazione' (viewer-fisheye-guide-button): stage mostra il fotogramma piatto con cerchi pieni (raggio), tratteggio 180°, croce al centro, orizzonte (handlers.feGuide, canvas #guida)
- Profili camera (src/profiles.ts, CameraProfiles.tsx): salva/applica/elimina calibrazioni per nome, solo sul dispositivo (chiave fisheye_profiles), max 20, stesso nome = sovrascrive

## Jun 2026 - WebXR (vero 3D su Meta Quest)
- stage.html: renderer.xr.enabled, pulsante #vr 'Entra nel visore 3D' (solo se immersive-vr supportato), in XR render diretto (layer 1 occhio sx, 2 dx)
- iframe allow xr-spatial-tracking; nota viewer-xr-note

## Jun 2026 - Stile caldo
- Tema: superfici indaco caldo, accento corallo (accent), radius più ampi, font titoli VarelaRound (fonts.display)
- Home: saluto per ora del giorno, due persone animate (TwoPeople), card colorate (azzurro guardo / corallo trasmetto), menu con icone colorate
- Avatar con iniziali colorate in rubrica; illustrazione nelle pagine vuote; vibrazione + cuore alla prima chiamata riuscita (viewer)

## Jun 2026 - Sicurezza utenti
- Benvenuto: dichiarazione 14+ e regole d'uso obbligatorie (chiave terms_v1)
- In chiamata: Segnala (motivi + nota -> POST /api/reports) e Blocca (visore: blocca dispositivo + nuovo codice; mittente: blocca codice)
- Registrazione solo con consenso dell'altro (recAsk/recAns), banner rosso 'sta registrando' per l'altro
- Sospensione automatica: 3 segnalatori diversi -> db.suspended, GET /api/suspended/{dev}; nessun pannello admin. Età minima 14 (o permesso genitore); pagine /legal?doc=terms|privacy (bozze)

## Update (giu 2026)
- Titolo Home "IriDuo": Iri bianco + Duo sfumato azzurro→viola→rosso con alone e doppia ombra 3D (src/components/GradientTitle.tsx, MaskedView su nativo, background-clip su web)
- Fix UI: chat con scroll interno che segue solo se sei in fondo, pannello ospiti e rubrica con pulsanti che non si schiacciano
- Font: Varela Round (titoli), Atkinson Hyperlegible (testi)

## Update: IT/EN (giu 2026)
- src/i18n.ts tr(it,en) + useLang; language choice at /language on first launch (phone language preselected), switch from Home menu
- src/gate.ts: language+terms gate in _layout for every route incl. invite links (pending link resumed)
- stage.html gets ?lang=en (T() helper); join.html by browser language, link preview by sender lang
- Quick replies localised on receive (CallChat localizeQuick)
- Home: smaller grey greeting, single-language slogan, renamed cards, compact layout at narrow width/large text
