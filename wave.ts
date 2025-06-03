// WebGL Wave Interference Simulation - Modular TypeScript

// === Simulation Configuration ===
interface Config {
    GRID_DENSITY: number; // points per pixel
    DAMPING: number;
    DISTURBANCE: number;
    POINT_SIZE: number;
    INITIAL_RANDOM_WAVES: number;
    RANDOM_WAVE_INTERVAL_MIN: number;
    RANDOM_WAVE_INTERVAL_MAX: number;
    DISTURBANCE_RADIUS: number;
}

const CONFIG: Config = {
    GRID_DENSITY: 0.25, // Increased grid density for smoother waves
    DAMPING: 0.995,
    DISTURBANCE: 5.0, // Increase disturbance amplitude for visible waves
    POINT_SIZE: 3.0,
    INITIAL_RANDOM_WAVES: 5,
    RANDOM_WAVE_INTERVAL_MIN: 300, // ms
    RANDOM_WAVE_INTERVAL_MAX: 2000, // ms
    DISTURBANCE_RADIUS: 3,
};

// --- Portfolio UI ---
const aboutHTML = `
  <div class='animate__animated animate__fadeIn'>
    <h2 class='h5 mb-3'><i class='fa-solid fa-user me-2'></i>About Me</h2>
    <p class='mb-2'>Hi, I'm <b>Jun</b> – a computer science student passionate about graphics, simulations, machine learning, and general high performance compute.</p>
    <ul class='list-unstyled small mb-0'>
      <li><b>Location:</b> Amsterdam, Netherlands</li>
      <li><b>Specialties:</b> Python, Rust, C++, x86_64, PyTorch, Scikit</li>
    </ul>
  </div>`;

const projectDetails = [
  {
    title: 'WebGL Water Simulation',
    tech: 'TypeScript, WebGL',
    description: 'Real-time interactive water simulation with caustics, foam, and raytraced lighting.',
    github: 'https://github.com/yourusername/webgl-water-sim',
    details: `<h2 class='h5 mb-3'><i class='fa-solid fa-water me-2'></i>WebGL Water Simulation</h2><p>This project demonstrates a physically-based, interactive water simulation using WebGL and TypeScript. Features include caustics, foam, and raytraced lighting for realistic effects. <br><br><b>Technologies:</b> TypeScript, WebGL<br><b>Highlights:</b> Real-time performance, advanced shaders, physics simulation</p>`
  },
  {
    title: 'Project 2: TBF',
    tech: '[Tech Stack]',
    description: 'Short description of project 2.',
    github: 'https://github.com/yourusername/project2',
    details: `<h2 class='h5 mb-3'><i class='fa-solid fa-cube me-2'></i>Project 2</h2><p>Detailed description of project 2. <br><br><b>Technologies:</b> [Tech Stack]<br><b>Highlights:</b> [Key features].</p>`
  },
  {
    title: 'Project 3: TBF',
    tech: '[Tech Stack]',
    description: 'Short description of project 3.',
    github: 'https://github.com/yourusername/project3',
    details: `<h2 class='h5 mb-3'><i class='fa-solid fa-rocket me-2'></i>Project 3</h2><p>Detailed description of project 3. <br><br><b>Technologies:</b> [Tech Stack]<br><b>Highlights:</b> [Key features].</p>`
  }
];
const projectsHTML = `
  <div class='animate__animated animate__fadeIn'>
    <h2 class='h5 mb-3'><i class='fa-solid fa-code me-2'></i>Projects</h2>
    <div class="swiper" id="projectsSwiper">
      <div class="swiper-wrapper">
        ${projectDetails.map((proj, i) => `
          <div class="swiper-slide">
            <div class="card bg-dark text-white border-0 project-card" data-project-index="${i}">
              <div class="card-body d-flex flex-column h-100">
                <h5 class="card-title mb-1">${proj.title}</h5>
                <p class="card-text small mb-1">${proj.tech}</p>
                <p class="card-text small mb-2">${proj.description}</p>
                <a href="${proj.github}" class="btn btn-sm minimal-nav-btn mt-auto align-self-start" target="_blank" rel="noopener" title="View on GitHub"><i class="fab fa-github me-1"></i>GitHub</a>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="swiper-pagination"></div>
    </div>
  </div>`;
const contactHTML = `
  <div class='animate__animated animate__fadeIn'>
    <h2 class='h5 mb-3'><i class='fa-solid fa-envelope me-2'></i>Contact</h2>
    <div class='d-flex gap-3'>
      <a href='mailto:jun@dodel.xyz' class='btn minimal-nav-btn' title='Email'><i class='fa-solid fa-envelope'></i></a>
      <a href='https://github.com/MauJunSensei' target='_blank' class='btn minimal-nav-btn' title='GitHub'><i class='fab fa-github'></i></a>
      <a href='https://www.linkedin.com/in/jun-d-336494329/' target='_blank' class='btn minimal-nav-btn' title='LinkedIn'><i class='fab fa-linkedin'></i></a>
    </div>
  </div>`;

// === GL Context Manager ===
class GLContext {
    public readonly canvas: HTMLCanvasElement;
    public readonly gl: WebGLRenderingContext;

    constructor(canvasId: string) {
        const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        if (!canvas) throw new Error(`Canvas '#${canvasId}' not found`);
        // Request antialiasing in the context attributes
        const gl = canvas.getContext('webgl', { antialias: true }) as WebGLRenderingContext;
        if (!gl) throw new Error('WebGL not supported');
        this.canvas = canvas;
        this.gl = gl;
        // Set a clean background color (optional, helps with AA)
        gl.clearColor(0.08, 0.13, 0.22, 1.0);
        window.addEventListener('resize', () => this.resize());
        this.resize();
    }

    private resize(): void {
        const { canvas, gl } = this;
        canvas.style.position = 'fixed';
        canvas.style.left = '0';
        canvas.style.top = '0';
        canvas.style.width = '100vw';
        canvas.style.height = '100vh';
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
}

// === Shader Program Wrapper ===
class ShaderProgram {
    public readonly program: WebGLProgram;
    public readonly aPos: number;
    public readonly aAmp: number;
    public readonly uAspect: WebGLUniformLocation;
    public readonly uPointSize: WebGLUniformLocation;
    public readonly uTime: WebGLUniformLocation;

    constructor(private gl: WebGLRenderingContext, vertSrc: string, fragSrc: string) {
        const vert = this.compile(gl.VERTEX_SHADER, vertSrc);
        const frag = this.compile(gl.FRAGMENT_SHADER, fragSrc);
        const prog = gl.createProgram();
        if (!prog) throw new Error('Failed to create program');
        gl.attachShader(prog, vert);
        gl.attachShader(prog, frag);
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            throw new Error(`Program link error: ${gl.getProgramInfoLog(prog)}`);
        }
        gl.useProgram(prog);
        this.program = prog;
        this.aPos = gl.getAttribLocation(prog, 'aPos');
        this.aAmp = gl.getAttribLocation(prog, 'aAmp');
        const loc = gl.getUniformLocation(prog, 'uAspect');
        if (!loc) throw new Error('Uniform uAspect not found');
        this.uAspect = loc;
        const psLoc = gl.getUniformLocation(prog, 'uPointSize');
        if (!psLoc) throw new Error('Uniform uPointSize not found');
        this.uPointSize = psLoc;
        const tLoc = gl.getUniformLocation(prog, 'uTime');
        if (!tLoc) throw new Error('Uniform uTime not found');
        this.uTime = tLoc;
        gl.enableVertexAttribArray(this.aPos);
        gl.enableVertexAttribArray(this.aAmp);
    }

    private compile(type: number, src: string): WebGLShader {
        const shader = this.gl.createShader(type);
        if (!shader) throw new Error('Failed to create shader');
        this.gl.shaderSource(shader, src);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            throw new Error(`Shader compile error: ${this.gl.getShaderInfoLog(shader)}`);
        }
        return shader;
    }
}

// === Wave Field Simulation ===
class WaveField {
    private curr: Float32Array;
    private prev: Float32Array;
    private next: Float32Array;
    private gridW: number = 0;
    private gridH: number = 0;
    private width: number = 0;
    private height: number = 0;
    private readonly damping: number;
    private readonly disturbance: number;
    private density: number;

    constructor(density: number, disturbance: number, damping: number) {
        this.density = density;
        this.disturbance = disturbance;
        this.damping = damping;
        this.curr = new Float32Array(0);
        this.prev = new Float32Array(0);
        this.next = new Float32Array(0);
        this.resize(window.innerWidth, window.innerHeight);
        window.addEventListener('resize', () => this.resize(window.innerWidth, window.innerHeight));
    }

    public resize(width: number, height: number): void {
        this.width = width;
        this.height = height;
        // Calculate the number of points so that spacing is equal and grid fits in window
        // spacing = min(width, height) / (maxPoints - 1)
        // gridW = floor(width / spacing) + 1, gridH = floor(height / spacing) + 1
        const approxPoints = Math.max(2, Math.round(Math.min(width, height) * this.density));
        const spacing = Math.min(width, height) / (approxPoints - 1);
        this.gridW = Math.max(2, Math.floor(width / spacing) + 1);
        this.gridH = Math.max(2, Math.floor(height / spacing) + 1);
        const len = this.gridW * this.gridH;
        this.curr = new Float32Array(len);
        this.prev = new Float32Array(len);
        this.next = new Float32Array(len);
    }

    public addDisturbanceAtGrid(gx: number, gy: number): void {
        const r = CONFIG.DISTURBANCE_RADIUS;
        for (let dx = -r; dx <= r; dx++) {
            for (let dy = -r; dy <= r; dy++) {
                const nx = gx + dx;
                const ny = gy + dy;
                if (nx >= 0 && nx < this.gridW && ny >= 0 && ny < this.gridH) {
                    const i = ny * this.gridW + nx;
                    this.curr[i] += this.disturbance * Math.exp(-(dx*dx + dy*dy)/4);
                }
            }
        }
    }

    public addImpulseAtGrid(gx: number, gy: number, intensity: number): void {
        const r = CONFIG.DISTURBANCE_RADIUS;
        for (let dx = -r; dx <= r; dx++) {
            for (let dy = -r; dy <= r; dy++) {
                const nx = gx + dx;
                const ny = gy + dy;
                if (nx >= 0 && nx < this.gridW && ny >= 0 && ny < this.gridH) {
                    const i = ny * this.gridW + nx;
                    this.curr[i] += intensity * Math.exp(-(dx*dx + dy*dy)/4);
                }
            }
        }
    }

    public addDisturbance(xNDC: number, yNDC: number): void {
        // Map NDC to nearest grid point
        const gx = Math.round(((xNDC + 1) / 2) * (this.gridW - 1));
        const gy = Math.round(((yNDC + 1) / 2) * (this.gridH - 1));
        this.addDisturbanceAtGrid(gx, gy);
    }

    public update(): void {
        const W = this.gridW;
        const H = this.gridH;
        // interior finite difference
        for (let y = 1; y < H - 1; y++) {
            for (let x = 1; x < W - 1; x++) {
                const i = y * W + x;
                this.next[i] = (2 * this.curr[i] - this.prev[i] + 0.5 * (
                    this.curr[i - 1] + this.curr[i + 1] + this.curr[i - W] + this.curr[i + W] - 4 * this.curr[i]
                )) * this.damping;
            }
        }
        // boundaries
        for (let x = 0; x < W; x++) {
            this.next[x] = 0;
            this.next[(H - 1) * W + x] = 0;
        }
        for (let y = 0; y < H; y++) {
            this.next[y * W] = 0;
            this.next[y * W + (W - 1)] = 0;
        }
        // swap buffers
        [this.prev, this.curr, this.next] = [this.curr, this.next, this.prev];
    }

    public getHeightArray(): Float32Array {
        return this.curr;
    }
    public getGridWidth(): number { return this.gridW; }
    public getGridHeight(): number { return this.gridH; }
}

// === Input Handler ===
class InputHandler {
    private isMouseDown: boolean = false; // Track mouse state

    constructor(private canvas: HTMLCanvasElement, private field: WaveField) {
        canvas.addEventListener('mousedown', e => {
            this.isMouseDown = true;
            this.handle(e);
        });
        canvas.addEventListener('mouseup', () => {
            this.isMouseDown = false;
        });
        canvas.addEventListener('mousemove', e => {
            if (this.isMouseDown) this.handle(e);
        });
        canvas.addEventListener('touchstart', e => {
            this.isMouseDown = true;
            this.handle(e.touches[0]);
            e.preventDefault();
        });
        canvas.addEventListener('touchend', () => {
            this.isMouseDown = false;
        });
        canvas.addEventListener('touchmove', e => {
            if (this.isMouseDown) this.handle(e.touches[0]);
            e.preventDefault();
        });
        window.addEventListener('keydown', e => {
            if (e.code === 'Space') field.addDisturbance(0, 0);
        });
    }

    private handle(e: MouseEvent | Touch): void {
        const rect = this.canvas.getBoundingClientRect();
        const W = this.field.getGridWidth();
        const H = this.field.getGridHeight();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const cellW = this.canvas.width / (W - 1);
        const cellH = this.canvas.height / (H - 1);
        const cell = Math.min(cellW, cellH);
        const gridPixelW = cell * (W - 1);
        const gridPixelH = cell * (H - 1);
        const offsetX = (this.canvas.width - gridPixelW) / 2;
        const offsetY = (this.canvas.height - gridPixelH) / 2;
        const px = (sx * (this.canvas.width / rect.width)) - offsetX;
        const py = (sy * (this.canvas.height / rect.height)) - offsetY;
        const gx = Math.round(px / cell);
        const gy = Math.round((H - 1) - py / cell);
        const gxClamped = Math.max(0, Math.min(W - 1, gx));
        const gyClamped = Math.max(0, Math.min(H - 1, gy));
        this.field.addDisturbanceAtGrid(gxClamped, gyClamped);
    }
}

// === Renderer ===
class Renderer {
    private posBuf: WebGLBuffer;
    private ampBuf: WebGLBuffer;
    private cell: number;
    private startTime: number = performance.now();

    constructor(
        private glCtx: GLContext,
        private shader: ShaderProgram,
        private field: WaveField
    ) {
        const gl = glCtx.gl;
        this.posBuf = gl.createBuffer()!;
        this.ampBuf = gl.createBuffer()!;
    }

    private get gridW(): number { return this.field.getGridWidth(); }
    private get gridH(): number { return this.field.getGridHeight(); }

    public start(): void {
        requestAnimationFrame(() => this.loop());
    }
    private loop(): void {
        const { gl } = this.glCtx;
        this.field.update();
        const W = this.gridW;
        const H = this.gridH;
        // Compute cell size (equal in both directions)
        const cellW = this.glCtx.canvas.width / (W - 1);
        const cellH = this.glCtx.canvas.height / (H - 1);
        this.cell = Math.min(cellW, cellH);
        // Compute grid pixel size and offset to center
        const gridPixelW = this.cell * (W - 1);
        const gridPixelH = this.cell * (H - 1);
        const offsetX = (this.glCtx.canvas.width - gridPixelW) / 2;
        const offsetY = (this.glCtx.canvas.height - gridPixelH) / 2;
        const posArr = new Float32Array(W * H * 2);
        const ampArr = new Float32Array(this.field.getHeightArray());
        let idx = 0;
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                // Map grid to NDC coordinates, filling the grid area (not the whole canvas)
                const px = offsetX + x * this.cell;
                const py = offsetY + y * this.cell;
                const ndcX = (px / this.glCtx.canvas.width) * 2 - 1;
                const ndcY = (py / this.glCtx.canvas.height) * 2 - 1;
                posArr[2*idx]   = ndcX;
                posArr[2*idx+1] = ndcY;
                idx++;
            }
        }
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf);
        gl.bufferData(gl.ARRAY_BUFFER, posArr, gl.DYNAMIC_DRAW);
        gl.vertexAttribPointer(this.shader.aPos, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.ampBuf);
        gl.bufferData(gl.ARRAY_BUFFER, ampArr, gl.DYNAMIC_DRAW);
        gl.vertexAttribPointer(this.shader.aAmp, 1, gl.FLOAT, false, 0, 0);
        gl.uniform1f(this.shader.uAspect, 1.0); // No aspect correction needed
        gl.uniform1f(this.shader.uPointSize, this.cell);
        // Pass time in seconds for caustic animation
        const now = performance.now();
        gl.uniform1f(this.shader.uTime, (now - this.startTime) * 0.001);
        gl.drawArrays(gl.POINTS, 0, W * H);
        requestAnimationFrame(() => this.loop());
    }
}

// === Shader Sources ===
const vertSrc = `
attribute vec2 aPos;
attribute float aAmp;
varying float vAmp;
uniform float uAspect;
uniform float uPointSize;
void main() {
    vAmp = aAmp;
    vec2 pos = aPos;
    pos.x *= uAspect;
    gl_PointSize = uPointSize;
    gl_Position = vec4(pos, 0.0, 1.0);
}`;

const fragSrc = `
precision mediump float;
varying float vAmp;
uniform float uTime;

// Light source position in NDC (centered, above pool)
const vec3 lightPos = vec3(0.0, 0.0, 1.5); // x, y in NDC, z above pool

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
    float amp = clamp(vAmp, -1.0, 1.0);
    // Depth-based color: troughs are deeper/greener, crests are lighter/bluer
    float baseHue = mix(0.5, 0.6, 0.5 + 0.5 * amp); // 0.5=greenish, 0.6=blueish
    float baseSat = mix(0.8, 1.0, 0.5 + 0.5 * amp); // more saturated at crests
    float baseVal = 0.4 + 0.6 * abs(amp); // brightness based on amplitude
    vec3 color = hsv2rgb(vec3(baseHue, baseSat, baseVal));

    // Animated caustic shimmer (pool floor)
    float caustic = 0.0;
    vec2 uv = gl_FragCoord.xy * 0.01;
    caustic += 0.25 * sin(uv.x * 8.0 + uTime * 0.7);
    caustic += 0.25 * sin(uv.y * 8.0 - uTime * 0.8);
    caustic += 0.25 * sin((uv.x + uv.y) * 6.0 + uTime * 1.2);
    caustic += 0.25 * sin((uv.x - uv.y) * 6.0 - uTime * 1.5);
    caustic = 0.5 + 0.5 * caustic;

    // Raytracing from stationary light source (fixed normal)
    // --- Perspective Correction ---
    // Use canvas size to compute aspect ratio and perspective depth
    float aspect = 800.0 / 600.0; // Replace with uniform if dynamic
    float fov = 1.2; // Field of view (radians), tweak for effect
    float zNear = 0.5;
    float zFar = 2.5;
    // Map gl_FragCoord.xy to NDC [-1,1]
    vec2 fragNDC = (gl_FragCoord.xy / vec2(800.0, 600.0)) * 2.0 - 1.0;
    fragNDC.x *= aspect;
    // Project to view space (simple perspective)
    float z = zNear + (zFar - zNear) * 0.5; // Place surface at mid-depth
    float px = fragNDC.x * tan(fov * 0.5) * z;
    float py = fragNDC.y * tan(fov * 0.5) * z / aspect;
    vec3 fragPos = vec3(px, py, 0.0);
    vec3 normal = vec3(0.0, 0.0, 1.0); // Fixed normal (up)
    vec3 lightDir = normalize(lightPos - fragPos);
    float diff = max(dot(normal, lightDir), 0.0);
    float spec = pow(max(dot(reflect(-lightDir, normal), vec3(0,0,1)), 0.0), 32.0);
    float dist = length(lightPos - fragPos);
    float attenuation = 1.0 / (0.5 + dist * dist);

    // Modulate caustics by lighting (diffuse and attenuation)
    float causticMod = caustic * diff * attenuation;
    color *= 0.8 + 0.3 * causticMod; // brighten with shimmer modulated by light

    color *= 0.7 + 0.5 * diff * attenuation;
    color += vec3(1.0, 0.95, 0.8) * spec * attenuation * 0.5;

    // Foam/sparkle at high crests
    float foam = smoothstep(0.7, 0.95, abs(amp));
    float sparkle = step(0.95, fract(sin(dot(gl_PointCoord, vec2(12.9898,78.233))) * 43758.5453));
    foam *= 0.7 + 0.3 * sparkle;
    color = mix(color, vec3(1.0), foam);

    // Subtle ripples
    float ripple = sin(10.0 * gl_PointCoord.x) * sin(10.0 * gl_PointCoord.y) * 0.05;
    color += ripple;

    // Soft circular blur
    float dist2 = distance(gl_PointCoord, vec2(0.5, 0.5));
    float blur = exp(-16.0 * dist2 * dist2);
    float alpha = blur * 0.9;

    // Further soften the color for a cohesive look
    color = mix(vec3(0.1, 0.2, 0.4), color, blur * 1.2);

    gl_FragColor = vec4(color, alpha);
}`;

// === Simulation Orchestrator ===
class Simulation {
    private glCtx: GLContext;
    private field: WaveField;
    private shader: ShaderProgram;
    private renderer: Renderer;
    private inputHandler: InputHandler;
    public randomWavesEnabled: boolean = true;

    constructor(canvasId: string) {
        this.glCtx = new GLContext(canvasId);
        this.field = new WaveField(CONFIG.GRID_DENSITY, CONFIG.DISTURBANCE, CONFIG.DAMPING);
        this.inputHandler = new InputHandler(this.glCtx.canvas, this.field);
        this.shader = new ShaderProgram(this.glCtx.gl, vertSrc, fragSrc);
        this.renderer = new Renderer(this.glCtx, this.shader, this.field);
        (window as any)._waveSimInstance = this;
        this.spawnInitialRandomWaves(CONFIG.INITIAL_RANDOM_WAVES); // Use config
        this.scheduleRandomWave();
    }

    private spawnInitialRandomWaves(count: number): void {
        const W = this.field.getGridWidth();
        const H = this.field.getGridHeight();
        for (let i = 0; i < count; i++) {
            const gx = Math.floor(Math.random() * W);
            const gy = Math.floor(Math.random() * H);
            const intensity = CONFIG.DISTURBANCE * (0.5 + Math.random() * 1.5);
            this.field.addImpulseAtGrid(gx, gy, intensity);
        }
    }

    public start(): void {
        this.renderer.start();
    }

    public toggleRandomWaves(): void {
        this.randomWavesEnabled = !this.randomWavesEnabled;
        if (this.randomWavesEnabled) {
            this.scheduleRandomWave();
        } else {
            if (this.randomWaveTimer) {
                clearTimeout(this.randomWaveTimer);
                this.randomWaveTimer = 0;
            }
        }
    }

    private randomWaveTimer: number = 0;
    private scheduleRandomWave(): void {
        if (!this.randomWavesEnabled) return;
        // Use config for random interval
        const interval = CONFIG.RANDOM_WAVE_INTERVAL_MIN + Math.random() * (CONFIG.RANDOM_WAVE_INTERVAL_MAX - CONFIG.RANDOM_WAVE_INTERVAL_MIN);
        this.randomWaveTimer = window.setTimeout(() => {
            this.spawnRandomWave();
            this.scheduleRandomWave();
        }, interval);
    }

    private spawnRandomWave(): void {
        const W = this.field.getGridWidth();
        const H = this.field.getGridHeight();
        const gx = Math.floor(Math.random() * W);
        const gy = Math.floor(Math.random() * H);
        const intensity = CONFIG.DISTURBANCE * (0.5 + Math.random() * 1.5);
        this.field.addImpulseAtGrid(gx, gy, intensity);
    }
}

// Entry point and UI initialization

document.addEventListener('DOMContentLoaded', () => {
  // --- Start Simulation ---
  const sim = new Simulation('rippleCanvas');
  sim.start();
  (window as any)._waveSimInstance = sim;

  // --- Pause/resume random wave spawning on tab visibility ---
  let wasRandomWavesEnabled = false;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      wasRandomWavesEnabled = sim.randomWavesEnabled;
      sim.randomWavesEnabled = false;
      if ((sim as any).randomWaveTimer) {
        clearTimeout((sim as any).randomWaveTimer);
        (sim as any).randomWaveTimer = 0;
      }
      // Also update the toggle button UI
      const btn = document.getElementById('disableRandomWavesBtn');
      if (btn) btn.classList.add('btn-off');
    } else {
      if (wasRandomWavesEnabled && !sim.randomWavesEnabled) {
        sim.randomWavesEnabled = true;
        (sim as any).scheduleRandomWave();
        // Also update the toggle button UI
        const btn = document.getElementById('disableRandomWavesBtn');
        if (btn) btn.classList.remove('btn-off');
      }
    }
  });

  // --- Content switching logic ---
  const setContent = (html: string): void => {
    const cont = document.getElementById('portfolioContent');
    if (!cont) return;
    cont.classList.remove('animate__fadeIn');
    cont.innerHTML = html;
    // Initialize Swiper carousel if present
    setTimeout(() => {
      const swiperEl = document.getElementById('projectsSwiper');
      if (swiperEl && (window as any).Swiper) {
        if ((swiperEl as any)._swiper) {
          (swiperEl as any)._swiper.destroy(true, true);
        }
        const swiper = new (window as any).Swiper(swiperEl, {
          slidesPerView: 1,
          pagination: {
            el: '.swiper-pagination',
            clickable: true,
            dynamicBullets: true,
          },
          speed: 500,
          spaceBetween: 24,
          autoplay: {
            delay: 2000,
            disableOnInteraction: false,
          },
        });
        (swiperEl as any)._swiper = swiper;
      }
      // Project card click handler
      document.querySelectorAll('.project-card').forEach(el => {
        el.addEventListener('click', function (e) {
          if ((e.target as HTMLElement).closest('a')) return;
          e.preventDefault();
          const idx = this.getAttribute('data-project-index');
          if (idx !== null) {
            const proj = projectDetails[+idx];
            setContent(`<div class='animate__animated animate__fadeIn'>${proj.details}<br><button class='btn minimal-nav-btn mt-3 me-2' id='backToProjects'><i class='fa fa-arrow-left me-1'></i>Back</button><a href='${proj.github}' class='btn minimal-nav-btn mt-3' target='_blank' rel='noopener'><i class='fab fa-github me-1'></i>GitHub</a></div>`);
            setTimeout(() => {
              const backBtn = document.getElementById('backToProjects');
              if (backBtn) backBtn.addEventListener('click', () => setContent(projectsHTML));
            }, 0);
          }
        });
      });
    }, 0);
  };

  // --- Navigation event listeners ---
  document.getElementById('aboutBtn')?.addEventListener('click', () => setContent(aboutHTML));
  document.getElementById('projectsBtn')?.addEventListener('click', () => setContent(projectsHTML));
  document.getElementById('contactBtn')?.addEventListener('click', () => setContent(contactHTML));

  // --- Add Disable Random Waves toggle button ---
  const addDisableRandomWavesToggle = () => {
    let btn = document.getElementById('disableRandomWavesBtn') as HTMLButtonElement;
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'disableRandomWavesBtn';
      btn.className = 'btn minimal-nav-btn';
      btn.style.position = 'fixed';
      btn.style.bottom = '24px';
      btn.style.right = '24px';
      btn.style.zIndex = '12';
      btn.innerHTML = '<i class="fa fa-ban me-1"></i>Disable Random Waves';
      document.body.appendChild(btn);
    }
    const updateBtn = () => {
      if (sim && sim.randomWavesEnabled) {
        btn.innerHTML = '<i class="fa fa-ban me-1"></i>Disable Random Waves';
        btn.classList.remove('btn-off');
      } else {
        btn.innerHTML = '<i class="fa fa-water me-1"></i>Enable Random Waves';
        btn.classList.add('btn-off');
      }
    };
    btn.onclick = () => {
      sim.toggleRandomWaves();
      updateBtn();
    };
    updateBtn();
  };
  addDisableRandomWavesToggle();

  // --- Initial load ---
  setContent(aboutHTML);

  // --- Ensure overlay container does not block pointer events except for interactive elements
  const container = document.querySelector('.container');
  if (container) {
    (container as HTMLElement).style.pointerEvents = 'none';
    // Restore pointer events for nav, buttons, and links
    container.querySelectorAll('button, a, nav, .minimal-nav-btn').forEach(el => {
      (el as HTMLElement).style.pointerEvents = 'auto';
    });
  }
});