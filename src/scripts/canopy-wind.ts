// The canopy's wind, drawn by a small WebGL shader. Smooth noise bends the leaf masks so
// each patch of the canopy moves on its own, and the gusts of the CSS wind sweep across
// from the left. The noise is a small pre-blurred texture, looked up twice per pixel,
// rather than computed; anything that's the same for every pixel is worked out once per
// frame here. It draws one pixel per CSS pixel on phones (the shadows are soft anyway),
// at most 1.5 million, thirty times a second, and only while the canopy is in view and
// the tab is open. Without WebGL, under reduced motion, or with ?wind=css, the CSS wind
// in Canopy.astro stays in charge.

const FAR_MASK = '/grotto/canopy-high.svg';
const NEAR_MASK = '/grotto/canopy-low.svg';
const MASK_WIDTH = 1600;
const MASK_HEIGHT = 900;
const MAX_PIXELS = 1_500_000;
const NOISE_SIZE = 128;
const FRAME_MS = 1000 / 30;

const VERTEX = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = vec2(a_position.x * 0.5 + 0.5, 0.5 - a_position.y * 0.5);
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform sampler2D u_far;
uniform sampler2D u_near;
uniform sampler2D u_noise;
uniform float u_aspect;
uniform vec4 u_shade;
uniform float u_crisp;
uniform float u_cycle;
uniform vec2 u_drift;
uniform vec2 u_flutter;
uniform vec2 u_sway;
varying vec2 v_uv;

// A push, then damped swings back.
float swing(float s, float strength) {
  return s < 0.0 ? 0.0 : strength * sin(s * 2.6) * exp(-s * 0.55) * smoothstep(0.0, 0.4, s);
}

void main() {
  vec2 uv = v_uv;
  // Leaves hang from the beam at the top, so they move more the lower they hang.
  float hang = smoothstep(0.02, 0.75, uv.y);
  // Patches of a few leaves share a breath of wind; single leaves flutter faster.
  vec2 p = vec2(uv.x * u_aspect, uv.y);
  float drift = texture2D(u_noise, p * 0.29 + u_drift).r * 2.0 - 1.0;
  float flutter = texture2D(u_noise, p * 0.8 + u_flutter).g * 2.0 - 1.0;
  // The CSS wind's cycle: a soft and a strong gust every 26 seconds, crossing the canopy
  // from left to right in about a second. A gust only leans the leaves downwind, and they
  // settle back without swinging past where they hang. Leaning, they drop a little too,
  // as if turning on their stems rather than sliding sideways.
  float c = mod(u_cycle - uv.x * 1.1, 26.0);
  vec2 lean = vec2(1.0, 0.12) * max(0.0, swing(c - 4.2, 0.5) + swing(c - 15.6, 1.0));
  float sway = sin(u_sway.x + uv.x * 1.3) * 0.5 + u_sway.y;
  // The far canopy is heavy and moves least; the near vines catch every gust.
  vec2 far = (vec2(0.003 * sway + 0.006 * drift, 0.003 * flutter) + 0.011 * lean) * hang;
  vec2 near = (vec2(0.005 * sway + 0.01 * drift + 0.004 * flutter, 0.005 * flutter) + 0.025 * lean) * hang;
  float a1 = texture2D(u_far, uv - far).a * u_shade.a;
  float a2 = texture2D(u_near, uv - near).a * u_shade.a * u_crisp;
  float a = 1.0 - (1.0 - a1) * (1.0 - a2);
  gl_FragColor = vec4(u_shade.rgb * a, a);
}`;

interface Shade {
  red: number;
  green: number;
  blue: number;
  alpha: number;
}

interface Uniforms {
  aspect: WebGLUniformLocation | null;
  shade: WebGLUniformLocation | null;
  crisp: WebGLUniformLocation | null;
  cycle: WebGLUniformLocation | null;
  drift: WebGLUniformLocation | null;
  flutter: WebGLUniformLocation | null;
  sway: WebGLUniformLocation | null;
}

// Two channels of smooth, tiling noise: seeded random values, blurred until soft.
function noiseTexture(): Uint8Array {
  const size = NOISE_SIZE;
  let seed = 917;
  const random = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = Math.imul(seed ^ (seed >>> 15), seed | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pixels = new Uint8Array(size * size * 4);
  for (let channel = 0; channel < 2; channel++) {
    let field = Float32Array.from({ length: size * size }, random);
    // Three wrapping box blurs along each axis come close to a Gaussian.
    for (let pass = 0; pass < 6; pass++) {
      const next = new Float32Array(size * size);
      const across = pass % 2 === 0;
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          let sum = 0;
          for (let k = -4; k <= 4; k++) {
            const sx = across ? (x + k + size) % size : x;
            const sy = across ? y : (y + k + size) % size;
            sum += field[sy * size + sx] ?? 0;
          }
          next[y * size + x] = sum / 9;
        }
      }
      field = next;
    }
    let low = Infinity;
    let high = -Infinity;
    for (const value of field) {
      low = Math.min(low, value);
      high = Math.max(high, value);
    }
    field.forEach((value, index) => {
      pixels[index * 4 + channel] = Math.round(((value - low) / (high - low)) * 255);
    });
  }
  return pixels;
}

const fract = (value: number) => value - Math.floor(value);

// Computed colours come back as rgba(…) or, for mixed colours, color(srgb …).
function readShade(value: string): Shade {
  const numbers = (value.match(/[\d.]+/g) ?? []).map(Number);
  const scale = value.startsWith('color(') ? 1 : 255;
  return {
    red: (numbers[0] ?? 0) / scale,
    green: (numbers[1] ?? 0) / scale,
    blue: (numbers[2] ?? 0) / scale,
    alpha: numbers[3] ?? 1,
  };
}

// Firefox only draws an SVG into a canvas when it has a size, so give the mask one.
async function loadMask(url: string): Promise<HTMLImageElement> {
  const text = await (await fetch(url)).text();
  const sized = text.replace('<svg ', `<svg width="${MASK_WIDTH}" height="${MASK_HEIGHT}" `);
  const image = new Image();
  image.src = URL.createObjectURL(new Blob([sized], { type: 'image/svg+xml' }));
  await image.decode();
  return image;
}

function compile(gl: WebGLRenderingContext, kind: number, source: string): WebGLShader | null {
  const shader = gl.createShader(kind);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

async function startWind(canopy: HTMLElement): Promise<void> {
  const canvas = canopy.querySelector<HTMLCanvasElement>('[data-canopy-wind]');
  const farLayer = canopy.querySelector<HTMLElement>('.canopy-leaves--high');
  const nearLayer = canopy.querySelector<HTMLElement>('.canopy-leaves--low');
  if (!canvas || !farLayer || !nearLayer) return;

  const gl = canvas.getContext('webgl', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'low-power',
  });
  if (!gl) return;

  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  gl.useProgram(program);

  // One triangle that covers the whole canvas.
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const uniforms: Uniforms = {
    aspect: gl.getUniformLocation(program, 'u_aspect'),
    shade: gl.getUniformLocation(program, 'u_shade'),
    crisp: gl.getUniformLocation(program, 'u_crisp'),
    cycle: gl.getUniformLocation(program, 'u_cycle'),
    drift: gl.getUniformLocation(program, 'u_drift'),
    flutter: gl.getUniformLocation(program, 'u_flutter'),
    sway: gl.getUniformLocation(program, 'u_sway'),
  };
  gl.uniform1i(gl.getUniformLocation(program, 'u_far'), 0);
  gl.uniform1i(gl.getUniformLocation(program, 'u_near'), 1);
  gl.uniform1i(gl.getUniformLocation(program, 'u_noise'), 2);

  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    NOISE_SIZE,
    NOISE_SIZE,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    noiseTexture()
  );

  const textures = [gl.createTexture(), gl.createTexture()];
  textures.forEach((texture, unit) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  });

  const masks = await Promise.all([loadMask(FAR_MASK), loadMask(NEAR_MASK)]);
  const scratch = document.createElement('canvas');
  const paint = scratch.getContext('2d');
  if (!paint) return;

  // Rasterize the masks the way CSS places them (top centre, cover) at the canvas size.
  const fit = () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    // Soft shadows don't need the screen's full sharpness: one pixel per CSS pixel on
    // phones, a little more on larger screens.
    const coarse = matchMedia('(pointer: coarse)').matches;
    let ratio = coarse ? 1 : Math.min(window.devicePixelRatio || 1, 1.25);
    if (width * height * ratio * ratio > MAX_PIXELS) {
      ratio = Math.sqrt(MAX_PIXELS / (width * height));
    }
    canvas.width = scratch.width = Math.round(width * ratio);
    canvas.height = scratch.height = Math.round(height * ratio);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform1f(uniforms.aspect, width / height);
    const scale = Math.max(width / MASK_WIDTH, height / MASK_HEIGHT) * ratio;
    const drawn = MASK_WIDTH * scale;
    masks.forEach((mask, unit) => {
      paint.clearRect(0, 0, scratch.width, scratch.height);
      paint.drawImage(mask, (scratch.width - drawn) / 2, 0, drawn, MASK_HEIGHT * scale);
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, textures[unit] ?? null);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, scratch);
    });
  };

  // Colour and crispness follow the theme and the clock, like the CSS layers they replace.
  const readLight = () => {
    const shade = readShade(getComputedStyle(farLayer).backgroundColor);
    gl.uniform4f(uniforms.shade, shade.red, shade.green, shade.blue, shade.alpha);
    gl.uniform1f(uniforms.crisp, Number(getComputedStyle(nearLayer).opacity) || 1);
  };

  fit();
  readLight();

  let frame = 0;
  let last = 0;
  let visible = true;
  const draw = (now: number) => {
    frame = requestAnimationFrame(draw);
    if (now - last < FRAME_MS) return;
    last = now;
    // Everything that's the same for every pixel is worked out here, once. Offsets wrap,
    // since the noise tiles, so they never grow large enough to lose precision.
    const t = now / 1000;
    gl.uniform1f(uniforms.cycle, t % 26);
    gl.uniform2f(uniforms.drift, fract(-t * 0.0105), fract(t * 0.0037));
    gl.uniform2f(uniforms.flutter, fract(t * 0.05), fract(-t * 0.03));
    gl.uniform2f(uniforms.sway, (t * 0.27) % (Math.PI * 2), Math.sin(t * 0.61 + 1.7) * 0.3);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    canopy.setAttribute('data-webgl', '');
  };
  const run = () => {
    if (!frame && visible && document.visibilityState === 'visible') {
      frame = requestAnimationFrame(draw);
    }
  };
  const halt = () => {
    cancelAnimationFrame(frame);
    frame = 0;
  };
  const giveUp = () => {
    halt();
    canopy.removeAttribute('data-webgl');
  };

  new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? false;
    if (visible) run();
    else halt();
  }).observe(canopy);
  document.addEventListener('visibilitychange', () =>
    document.visibilityState === 'visible' ? run() : halt()
  );

  let resizing = 0;
  new ResizeObserver(() => {
    clearTimeout(resizing);
    resizing = window.setTimeout(fit, 150);
  }).observe(canvas);
  new MutationObserver(readLight).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'style'],
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', readLight);
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', giveUp);
  canvas.addEventListener('webglcontextlost', giveUp);

  run();
}

const canopy = document.querySelector<HTMLElement>('[data-canopy]');
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
const css = new URLSearchParams(location.search).get('wind') === 'css';
if (canopy && !still && !css) {
  // Wait until the page has settled; the CSS wind covers the first moments.
  const begin = () => void startWind(canopy).catch(() => canopy.removeAttribute('data-webgl'));
  if ('requestIdleCallback' in window) requestIdleCallback(begin, { timeout: 2000 });
  else setTimeout(begin, 600);
}
