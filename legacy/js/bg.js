/* Fond animé — WebGL écrit à la main.
   L'ancienne version chargeait Three.js (~600 Ko) pour afficher un seul
   rectangle plein écran. Ici : un quad, deux shaders, aucune dépendance. */

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `
precision mediump float;
uniform vec2  uRes;
uniform vec2  uMouse;
uniform float uTime;
uniform vec3  uAccent;
uniform float uLight;

vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec2 x1 = x0.xy + C.xx - i1;
  vec2 x2 = x0.xy + C.zz;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x1, x1), dot(x2, x2)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x  = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * vec2(x1.x, x2.x) + h.yz * vec2(x1.y, x2.y);
  return 130.0 * dot(m, g);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p  = (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0);

  float t = uTime * 0.05;
  vec2 mo = (uMouse - 0.5) * 0.18;

  float n1 = snoise(p * 1.4 + vec2(t, t * 0.6) + mo);
  float n2 = snoise(p * 2.9 - vec2(t * 0.7, t));
  float n  = n1 * 0.68 + n2 * 0.32;

  float bands = smoothstep(-0.25, 0.85, n + (uv.y - 0.32) * 0.75);

  vec3 dark   = vec3(0.027, 0.039, 0.070);
  vec3 second = mix(uAccent, vec3(0.50, 0.22, 0.95), 0.55);
  vec3 col    = mix(dark, uAccent, bands * 0.40);
  col = mix(col, second, smoothstep(0.42, 1.0, n2) * 0.30);

  /* Thème clair : on inverse la logique — fond pâle, accents lavés. */
  vec3 light  = vec3(0.90, 0.92, 0.96);
  vec3 lcol   = mix(light, mix(uAccent, vec3(1.0), 0.45), bands * 0.35);
  lcol = mix(lcol, mix(second, vec3(1.0), 0.55), smoothstep(0.45, 1.0, n2) * 0.30);
  col = mix(col, lcol, uLight);

  float vig = smoothstep(1.25, 0.15, length(p));
  col *= mix(mix(0.72, 1.0, vig), 1.0, uLight * 0.7);

  /* Léger grain : casse les bandes de dégradé sur les écrans 8 bits. */
  float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  col += (grain - 0.5) * 0.012;

  gl_FragColor = vec4(col, 1.0);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255
  ];
}

export function startBackground() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return { setAccent() {}, setTheme() {} };

  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' })
          || canvas.getContext('experimental-webgl');

  /* Pas de WebGL (ou contexte refusé) : on retombe sur un dégradé CSS. */
  if (!gl) {
    canvas.style.background = 'radial-gradient(90% 70% at 20% 10%, rgba(76,194,255,.16), transparent 60%), radial-gradient(70% 60% at 85% 30%, rgba(123,92,255,.14), transparent 60%)';
    return { setAccent() {}, setTheme() {} };
  }

  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (e) {
    canvas.style.display = 'none';
    return { setAccent() {}, setTheme() {} };
  }

  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const U = {
    res: gl.getUniformLocation(prog, 'uRes'),
    mouse: gl.getUniformLocation(prog, 'uMouse'),
    time: gl.getUniformLocation(prog, 'uTime'),
    accent: gl.getUniformLocation(prog, 'uAccent'),
    light: gl.getUniformLocation(prog, 'uLight')
  };

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const scale = coarse ? 0.5 : 0.75;

  let accent = hexToRgb('#4cc2ff');
  let light = 0;
  let lightTarget = 0;
  const mouse = [0.5, 0.5];
  const mouseTarget = [0.5, 0.5];

  function resize() {
    const w = Math.max(1, Math.round(innerWidth * scale));
    const h = Math.max(1, Math.round(innerHeight * scale));
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
    gl.uniform2f(U.res, w, h);
  }
  resize();
  addEventListener('resize', resize, { passive: true });

  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    addEventListener('pointermove', (e) => {
      mouseTarget[0] = e.clientX / innerWidth;
      mouseTarget[1] = 1 - e.clientY / innerHeight;
    }, { passive: true });
  }

  let running = true;
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) requestAnimationFrame(frame);
  });

  const t0 = performance.now();
  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    mouse[0] += (mouseTarget[0] - mouse[0]) * 0.05;
    mouse[1] += (mouseTarget[1] - mouse[1]) * 0.05;
    light += (lightTarget - light) * 0.08;
    gl.uniform2f(U.mouse, mouse[0], mouse[1]);
    gl.uniform3f(U.accent, accent[0], accent[1], accent[2]);
    gl.uniform1f(U.light, light);
    gl.uniform1f(U.time, reduce ? 0 : (now - t0) / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  requestAnimationFrame(frame);

  return {
    setAccent(hex) { accent = hexToRgb(hex); },
    setTheme(theme) { lightTarget = theme === 'light' ? 1 : 0; }
  };
}
