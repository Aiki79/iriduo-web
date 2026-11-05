# IriDuo → web app (Full Stack App) — migration guide

Target use: a computer with a VR180 camera (USB) broadcasts in Chrome/Edge → any headset (Meta Quest, Pico, HTC, PC VR, Vision Pro) watches in its browser via WebXR. No phone app, no stores.

## Reuse as-is
- `backend/server.py` (FastAPI): presence, codes, `/api/report` + auto-suspension after 3 reports, `/api/status`, `/api/join` (lang=it|en), rate limits, `/api/stage` serving `stage.html` and its libs.
- `backend/stage.html`: the whole core — Three.js WebXR rendering (SBS / TB / fisheye ELP shader + calibration), PeerJS WebRTC calls, chat/reactions data channel, recording with consent, 3D photo, multi-viewer. `?mode=viewer|sender&lang=it|en`. Talks to its host page with postMessage (see `frontend/src/components/stage-types.ts` for every command and event).
  DO NOT change the `<script>` imports or `renderer.setAnimationLoop` (broke Meta Quest before).
- `backend/join.html`, `backend/tests/`.

## Rebuild in React (web) from `frontend/` (logic can be copied almost 1:1)
- `src/i18n.ts` (tr(it,en), language choice), `src/gate.ts` (language + 14+/terms gate, also for invite links).
- Screens: `app/language.tsx`, `welcome.tsx` (onboarding + 14+ + rules), `legal.tsx` (terms/privacy IT+EN), `index.tsx` (Home), `sender.tsx` (broadcast: camera/mic pick, resolution, bitrate, auto-quality, guests, chat, reactions, recording), `viewer.tsx` (code, answer/decline, view modes, formats, fisheye panel, demos), `contacts.tsx`, `history.tsx`, `gallery.tsx`, `pro.tsx` (Pro is a LOCAL DEMO flag, no payment).
- Components: `src/components/*` (CallChat, GuestsPanel, Safety, FisheyePanel, CameraProfiles, CallStats, Reactions, ShareCode, GradientTitle, Warm).
- `StageView.web.tsx` already shows how the page embeds stage.html in an iframe — the web app should do the same.
- Design: dark "warm" theme in `src/theme.ts`; fonts Varela Round (titles) + Atkinson Hyperlegible (text), files in `frontend/assets/fonts`.

## New for the web version
- Wide desktop layout for the broadcaster (large camera preview, controls on the side).
- Headset-friendly viewer page (big buttons, "Enter the 3D headset"), installable (PWA manifest + icon) so it can be pinned in the headset menu.
- Test with the real VR180 USB camera when it arrives.
