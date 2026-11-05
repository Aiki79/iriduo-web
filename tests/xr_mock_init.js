// Fake WebXR runtime (Quest-like) injected into the IriDuo stage iframe for Playwright tests.
(() => {
  if (!location.pathname.includes('/api/stage')) {
    window.__msgs = [];
    window.addEventListener('message', e => { try { window.__msgs.push(typeof e.data === 'string' ? JSON.parse(e.data) : e.data); } catch (_) {} });
    return;
  }
  window.__xrCalls = [];
  window.__xrReject = false;
  window.__eyeRenders = [];
  const ident = () => new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
  const persp = () => { const f = 1 / Math.tan(Math.PI / 4), n = 0.1, fa = 100; return new Float32Array([f,0,0,0, 0,f,0,0, 0,0,(fa+n)/(n-fa),-1, 0,0,2*fa*n/(n-fa),0]); };
  const view = (eye, dx) => { const m = ident(); m[12] = dx; return { eye, transform: { matrix: m, position: { x: dx, y: 0, z: 0 }, orientation: { x: 0, y: 0, z: 0, w: 1 } }, projectionMatrix: persp() }; };
  class FakeLayer {
    constructor(session, gl) { this.framebuffer = null; this.framebufferWidth = gl.canvas.width; this.framebufferHeight = gl.canvas.height; this.fixedFoveation = 0; }
    getViewport(v) { const w = this.framebufferWidth / 2, h = this.framebufferHeight; return v.eye === 'left' ? { x: 0, y: 0, width: w, height: h } : { x: w, y: 0, width: w, height: h }; }
  }
  window.XRWebGLLayer = FakeLayer;
  for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) if (C) C.prototype.makeXRCompatible = function () { return Promise.resolve(); };
  class FakeSession extends EventTarget {
    constructor() { super(); this.renderState = { baseLayer: null, depthNear: 0.1, depthFar: 1000 }; this.inputSources = []; this.environmentBlendMode = 'opaque'; this.visibilityState = 'visible'; this._ended = false; this._id = 0; this.frames = 0; }
    updateRenderState(s) { Object.assign(this.renderState, s); }
    async requestReferenceSpace(t) { window.__xrCalls.push('refspace:' + t); return { getOffsetReferenceSpace() { return this; } }; }
    requestAnimationFrame(cb) {
      const id = ++this._id;
      setTimeout(() => {
        if (this._ended) return;
        this.frames++;
        const pose = { transform: { matrix: ident(), position: { x: 0, y: 0, z: 0 }, orientation: { x: 0, y: 0, z: 0, w: 1 } }, views: [view('left', -0.032), view('right', 0.032)] };
        try { cb(performance.now(), { session: this, getViewerPose: () => pose, getPose: () => null }); } catch (e) { window.__xrCalls.push('frameError:' + e.message); }
      }, 16);
      return id;
    }
    cancelAnimationFrame() {}
    async end() { if (this._ended) return; this._ended = true; this.dispatchEvent(new Event('end')); }
  }
  const xr = {
    isSessionSupported: (m) => { window.__xrCalls.push('supported:' + m); return Promise.resolve(m === 'immersive-vr'); },
    requestSession: (m, o) => {
      window.__xrCalls.push('request:' + m + ':' + JSON.stringify(o || {}));
      if (window.__xrReject) return Promise.reject(new DOMException('mock denied', 'NotAllowedError'));
      window.__session = new FakeSession();
      return Promise.resolve(window.__session);
    },
    addEventListener() {}, removeEventListener() {},
  };
  Object.defineProperty(Navigator.prototype, 'xr', { get: () => xr, configurable: true });
})();
