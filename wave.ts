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
    CARD_MIN_WIDTH: number;
    CARD_MAX_WIDTH: number;
    CARD_MIN_HEIGHT: number;
    CARD_MAX_HEIGHT: number;
    CARD_BORDER_RADIUS: number;
    CARD_BODY_PADDING: string;
    CARD_MARGIN_Y: string;
    CARD_TITLE_FONT_SIZE: string;
    CARD_TITLE_MARGIN_BOTTOM: string;
    CARD_TEXT_FONT_SIZE: string;
    CARD_TEXT_MARGIN_BOTTOM: string;
    PROJECT_DETAILS_ACTIONS_MARGIN_TOP: string;
    // Add shader/animation and Swiper config values
    SHADER_ASPECT: number;
    SHADER_FOV: number;
    SHADER_Z_NEAR: number;
    SHADER_Z_FAR: number;
    SHADER_UV_SCALE: number;
    SHADER_CAUSTIC_FREQ1: number;
    SHADER_CAUSTIC_FREQ2: number;
    SHADER_CAUSTIC_FREQ3: number;
    SHADER_CAUSTIC_FREQ4: number;
    SHADER_CAUSTIC_AMP: number;
    SHADER_CAUSTIC_TIME1: number;
    SHADER_CAUSTIC_TIME2: number;
    SHADER_CAUSTIC_TIME3: number;
    SHADER_CAUSTIC_TIME4: number;
    SHADER_BLUR_EXP: number;
    SHADER_BLUR_ALPHA: number;
    SHADER_COLOR_MIX: number;
    SWIPER_SPEED: number;
    SWIPER_SPACE_BETWEEN: number;
    SWIPER_AUTOPLAY_DELAY: number;
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
    CARD_MIN_WIDTH: 260,
    CARD_MAX_WIDTH: 340,
    CARD_MIN_HEIGHT: 180,
    CARD_MAX_HEIGHT: 240,
    CARD_BORDER_RADIUS: 18,
    CARD_BODY_PADDING: '1.6rem 1.3rem 1.5rem 1.3rem',
    CARD_MARGIN_Y: '0.5rem',
    CARD_TITLE_FONT_SIZE: '1.18rem',
    CARD_TITLE_MARGIN_BOTTOM: '0.5em',
    CARD_TEXT_FONT_SIZE: '1.01rem',
    CARD_TEXT_MARGIN_BOTTOM: '0.5em',
    PROJECT_DETAILS_ACTIONS_MARGIN_TOP: '2.2rem',
    // Shader and animation config
    SHADER_ASPECT: 800 / 600,
    SHADER_FOV: 1.2,
    SHADER_Z_NEAR: 0.5,
    SHADER_Z_FAR: 2.5,
    SHADER_UV_SCALE: 0.01,
    SHADER_CAUSTIC_FREQ1: 8.0,
    SHADER_CAUSTIC_FREQ2: 8.0,
    SHADER_CAUSTIC_FREQ3: 6.0,
    SHADER_CAUSTIC_FREQ4: 6.0,
    SHADER_CAUSTIC_AMP: 0.25,
    SHADER_CAUSTIC_TIME1: 0.7,
    SHADER_CAUSTIC_TIME2: -0.8,
    SHADER_CAUSTIC_TIME3: 1.2,
    SHADER_CAUSTIC_TIME4: -1.5,
    SHADER_BLUR_EXP: 16.0,
    SHADER_BLUR_ALPHA: 0.9,
    SHADER_COLOR_MIX: 1.2,
    SWIPER_SPEED: 500,
    SWIPER_SPACE_BETWEEN: 24,
    SWIPER_AUTOPLAY_DELAY: 2000,
};

// --- Show canvas interactivity hint in main-content-box until user interacts ---
document.addEventListener('DOMContentLoaded', () => {
  const mainBox = document.querySelector('.main-content-box');
  const canvas = document.getElementById('rippleCanvas');
  if (mainBox && canvas && !document.getElementById('canvasHint')) {
    const hint = document.createElement('div');
    hint.id = 'canvasHint';
    hint.className = 'canvas-hint animate__animated animate__fadeInDown';
    hint.innerHTML = `
      <span class="hint-icon" aria-hidden="true"><i class="fa-solid fa-hand-pointer"></i></span>
      <span class="hint-text">Tap or click to make waves!</span>
    `;
    hint.style.opacity = '1';
    hint.style.pointerEvents = 'none';
    hint.style.transition = 'opacity 0.8s';
    hint.style.textAlign = 'center';
    hint.style.margin = '1.5rem auto 0 auto';
    mainBox.insertBefore(hint, mainBox.firstChild);

    // Animate mainBox height when hint is removed
    const animateHintRemoval = () => {
      const mainBoxEl = mainBox as HTMLElement;
      const startHeight = mainBoxEl.offsetHeight;
      // Add fadeOutUp animation
      hint.classList.remove('animate__fadeInDown');
      hint.classList.add('animate__fadeOutUp');
      hint.style.opacity = '0';
      setTimeout(() => {
        hint.remove();
        // After DOM update, animate height
        requestAnimationFrame(() => {
          const endHeight = mainBoxEl.offsetHeight;
          mainBoxEl.style.height = startHeight + 'px';
          void mainBoxEl.offsetWidth;
          mainBoxEl.style.transition = 'height 0.4s cubic-bezier(.4,1.6,.6,1)';
          mainBoxEl.style.height = endHeight + 'px';
          const clear = () => {
            mainBoxEl.style.transition = '';
            mainBoxEl.style.height = '';
            mainBoxEl.removeEventListener('transitionend', clear);
          };
          mainBoxEl.addEventListener('transitionend', clear);
        });
      }, 800); // match fadeOutUp duration
    };

    // Remove hint on first user interaction with the canvas (mousedown or touchstart only)
    const removeHint = () => {
      canvas.removeEventListener('mousedown', removeHint);
      canvas.removeEventListener('touchstart', removeHint);
      animateHintRemoval();
    };
    canvas.addEventListener('mousedown', removeHint);
    canvas.addEventListener('touchstart', removeHint);
  }
});

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
    github: 'https://github.com/MauJunSensei/wave-portfolio/',
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
            <div class="card bg-dark text-white border-0 project-card" data-project-index="${i}" style="
              min-width: ${CONFIG.CARD_MIN_WIDTH}px; max-width: ${CONFIG.CARD_MAX_WIDTH}px;
              min-height: ${CONFIG.CARD_MIN_HEIGHT}px; max-height: ${CONFIG.CARD_MAX_HEIGHT}px;
              border-radius: ${CONFIG.CARD_BORDER_RADIUS}px;
              margin-top: ${CONFIG.CARD_MARGIN_Y}; margin-bottom: ${CONFIG.CARD_MARGIN_Y};
            ">
              <div class="card-body d-flex flex-column h-100" style="padding: ${CONFIG.CARD_BODY_PADDING};">
                <h5 class="card-title mb-1" style="font-size: ${CONFIG.CARD_TITLE_FONT_SIZE}; margin-bottom: ${CONFIG.CARD_TITLE_MARGIN_BOTTOM};">${proj.title}</h5>
                <p class="card-text small mb-1" style="font-size: ${CONFIG.CARD_TEXT_FONT_SIZE}; margin-bottom: ${CONFIG.CARD_TEXT_MARGIN_BOTTOM};">${proj.tech}</p>
                <p class="card-text small mb-2" style="font-size: ${CONFIG.CARD_TEXT_FONT_SIZE}; margin-bottom: ${CONFIG.CARD_TEXT_MARGIN_BOTTOM};">${proj.description}</p>
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

// Settings page content integrated into main content
const settingsHTML = `
  <div class='animate__animated animate__fadeIn'>
    <h2 class='h5 mb-3'><i class='fa fa-cog me-2'></i>Settings</h2>
    <div>
      <label><input type='checkbox' id='randomWavesCheckbox'> Enable Random Waves</label>
    </div>
    <div>
      <label for='dampingRange'>Damping: <span id='dampingValue'>${CONFIG.DAMPING.toFixed(3)}</span></label>
      <input type='range' id='dampingRange' min='0.8' max='0.999' step='0.001' value='${CONFIG.DAMPING}'>
    </div>
    <div>
      <label for='disturbanceRange'>Disturbance: <span id='disturbanceValue'>${CONFIG.DISTURBANCE.toFixed(1)}</span></label>
      <input type='range' id='disturbanceRange' min='1' max='20' step='0.1' value='${CONFIG.DISTURBANCE}'>
    </div>
    <div>
      <label for='radiusNumber'>Disturbance Radius:</label>
      <input type='number' id='radiusNumber' min='1' max='10' step='1' value='${CONFIG.DISTURBANCE_RADIUS}'>
    </div>
    <div>
      <label for='intervalMinNumber'>Random Interval Min (ms):</label>
      <input type='number' id='intervalMinNumber' min='100' max='5000' step='100' value='${CONFIG.RANDOM_WAVE_INTERVAL_MIN}'>
    </div>
    <div>
      <label for='intervalMaxNumber'>Random Interval Max (ms):</label>
      <input type='number' id='intervalMaxNumber' min='100' max='10000' step='100' value='${CONFIG.RANDOM_WAVE_INTERVAL_MAX}'>
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
    public damping: number;
    public disturbance: number;
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
const vec3 lightPos = vec3(0.0, 0.0, 1.5);
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
    vec2 uv = gl_FragCoord.xy * float(${CONFIG.SHADER_UV_SCALE});
    caustic += float(${CONFIG.SHADER_CAUSTIC_AMP}) * sin(uv.x * float(${CONFIG.SHADER_CAUSTIC_FREQ1}) + uTime * float(${CONFIG.SHADER_CAUSTIC_TIME1}));
    caustic += float(${CONFIG.SHADER_CAUSTIC_AMP}) * sin(uv.y * float(${CONFIG.SHADER_CAUSTIC_FREQ2}) + uTime * float(${CONFIG.SHADER_CAUSTIC_TIME2}));
    caustic += float(${CONFIG.SHADER_CAUSTIC_AMP}) * sin((uv.x + uv.y) * float(${CONFIG.SHADER_CAUSTIC_FREQ3}) + uTime * float(${CONFIG.SHADER_CAUSTIC_TIME3}));
    caustic += float(${CONFIG.SHADER_CAUSTIC_AMP}) * sin((uv.x - uv.y) * float(${CONFIG.SHADER_CAUSTIC_FREQ4}) + uTime * float(${CONFIG.SHADER_CAUSTIC_TIME4}));
    caustic = 0.5 + 0.5 * caustic;

    // Raytracing from stationary light source (fixed normal)
    // --- Perspective Correction ---
    // Use canvas size to compute aspect ratio and perspective depth
    float aspect = float(${CONFIG.SHADER_ASPECT});
    float fov = float(${CONFIG.SHADER_FOV});
    float zNear = float(${CONFIG.SHADER_Z_NEAR});
    float zFar = float(${CONFIG.SHADER_Z_FAR});
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
    float blur = exp(-float(${CONFIG.SHADER_BLUR_EXP}) * dist2 * dist2);
    float alpha = blur * float(${CONFIG.SHADER_BLUR_ALPHA});

    // Further soften the color for a cohesive look
    color = mix(vec3(0.1, 0.2, 0.4), color, blur * float(${CONFIG.SHADER_COLOR_MIX}));

    gl_FragColor = vec4(color, alpha);
}`;

// === Simulation Orchestrator ===
class Simulation {
    private glCtx: GLContext;
    public field: WaveField;
    private shader: ShaderProgram;
    private renderer: Renderer;
    private inputHandler: InputHandler;
    public randomWavesEnabled: boolean = true;
    private randomWaveTimer: number = 0;

    constructor(canvasId: string) {
        this.glCtx = new GLContext(canvasId);
        this.field = new WaveField(CONFIG.GRID_DENSITY, CONFIG.DISTURBANCE, CONFIG.DAMPING);
        this.inputHandler = new InputHandler(this.glCtx.canvas, this.field);
        this.shader = new ShaderProgram(this.glCtx.gl, vertSrc, fragSrc);
        this.renderer = new Renderer(this.glCtx, this.shader, this.field);
        (window as any)._waveSimInstance = this;
        this.spawnInitialRandomWaves(CONFIG.INITIAL_RANDOM_WAVES);
        this.scheduleRandomWave();
    }

    private spawnRandomWaveAtRandomLocation(intensity?: number): void {
        const W = this.field.getGridWidth();
        const H = this.field.getGridHeight();
        const gx = Math.floor(Math.random() * W);
        const gy = Math.floor(Math.random() * H);
        const imp = intensity !== undefined ? intensity : CONFIG.DISTURBANCE * (0.5 + Math.random() * 1.5);
        this.field.addImpulseAtGrid(gx, gy, imp);
    }

    private spawnInitialRandomWaves(count: number): void {
        for (let i = 0; i < count; i++) {
            this.spawnRandomWaveAtRandomLocation();
        }
    }

    private scheduleRandomWave(): void {
        if (!this.randomWavesEnabled) return;
        const interval = CONFIG.RANDOM_WAVE_INTERVAL_MIN + Math.random() * (CONFIG.RANDOM_WAVE_INTERVAL_MAX - CONFIG.RANDOM_WAVE_INTERVAL_MIN);
        this.randomWaveTimer = window.setTimeout(() => {
            this.spawnRandomWaveAtRandomLocation();
            this.scheduleRandomWave();
        }, interval);
    }

    private clearRandomWaveTimer(): void {
        if (this.randomWaveTimer) {
            clearTimeout(this.randomWaveTimer);
            this.randomWaveTimer = 0;
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
            this.clearRandomWaveTimer();
        }
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

  // --- Animated height transition for main-content-box ---
  const animateHeight = (box: HTMLElement, updateContent: () => void) => {
    const startHeight = box.offsetHeight;
    updateContent();
    // Wait for DOM update
    requestAnimationFrame(() => {
      const endHeight = box.offsetHeight;
      box.style.height = startHeight + 'px';
      // Force reflow
      void box.offsetWidth;
      box.style.transition = 'height 0.4s cubic-bezier(.4,1.6,.6,1)';
      box.style.height = endHeight + 'px';
      const clear = () => {
        box.style.transition = '';
        box.style.height = '';
        box.removeEventListener('transitionend', clear);
      };
      box.addEventListener('transitionend', clear);
    });
  };

  // --- Content switching logic ---
  let currentContentKey: string | null = null;
  const setContent = (html: string, key?: string): void => {
    const cont = document.getElementById('portfolioContent');
    const box = cont?.closest('.main-content-box') as HTMLElement;
    // If the same button is pressed again, hide content
    if (key && currentContentKey === key) {
      if (box) {
        animateHeight(box, () => {
          cont!.innerHTML = '';
        });
      } else {
        cont!.innerHTML = '';
      }
      currentContentKey = null;
      return;
    }
    currentContentKey = key || null;
    if (!cont) return;
    if (box) {
      animateHeight(box, () => {
        cont.classList.remove('animate__fadeIn');
        cont.innerHTML = html;
      });
    } else {
      cont.classList.remove('animate__fadeIn');
      cont.innerHTML = html;
    }
    // Call settings initializer if showing settings
    if (html === settingsHTML) {
      setTimeout(initSettings, 0);
    }
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
          speed: CONFIG.SWIPER_SPEED,
          spaceBetween: CONFIG.SWIPER_SPACE_BETWEEN,
          autoplay: {
            delay: CONFIG.SWIPER_AUTOPLAY_DELAY,
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
            setContent(`
              <div class='animate__animated animate__fadeIn'>
                ${proj.details}
                <div class="project-details-actions" style="display: flex; justify-content: space-between; align-items: flex-end; width: 100%; margin-top: 2.2rem; gap: 0.5rem;">
                  <button class='btn minimal-nav-btn mt-3 me-2' id='backToProjects'><i class='fa fa-arrow-left me-1'></i>Back</button>
                  <a href='${proj.github}' class='btn minimal-nav-btn mt-3' target='_blank' rel='noopener'><i class='fab fa-github me-1'></i>GitHub</a>
                </div>
              </div>
            `);
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
  document.getElementById('aboutBtn')?.addEventListener('click', () => setContent(aboutHTML, 'about'));
  document.getElementById('projectsBtn')?.addEventListener('click', () => setContent(projectsHTML, 'projects'));
  document.getElementById('contactBtn')?.addEventListener('click', () => setContent(contactHTML, 'contact'));
  document.getElementById('settingsBtn')?.addEventListener('click', () => setContent(settingsHTML, 'settings'));

  // --- Animate settings button on load
  const settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) {
    settingsBtn.classList.add('animate__animated', 'animate__fadeInUp');
    settingsBtn.addEventListener('animationend', () => {
      settingsBtn.classList.remove('animate__animated', 'animate__fadeInUp');
    }, { once: true });
  }

  // Settings initializer: set initial values and attach event listeners dynamically
  const initSettings = (): void => {
    const sim = (window as any)._waveSimInstance as Simulation;
    const dampingRange = document.getElementById('dampingRange') as HTMLInputElement;
    const disturbanceRange = document.getElementById('disturbanceRange') as HTMLInputElement;
    const radiusNumber = document.getElementById('radiusNumber') as HTMLInputElement;
    const intervalMinNumber = document.getElementById('intervalMinNumber') as HTMLInputElement;
    const intervalMaxNumber = document.getElementById('intervalMaxNumber') as HTMLInputElement;
    const randomCheckbox = document.getElementById('randomWavesCheckbox') as HTMLInputElement;
    if (dampingRange) {
      dampingRange.value = sim.field.damping.toString();
      document.getElementById('dampingValue')!.innerText = sim.field.damping.toFixed(3);
      dampingRange.addEventListener('input', e => updateDamping(parseFloat((e.target as HTMLInputElement).value)));
    }
    if (disturbanceRange) {
      disturbanceRange.value = sim.field.disturbance.toString();
      document.getElementById('disturbanceValue')!.innerText = sim.field.disturbance.toFixed(1);
      disturbanceRange.addEventListener('input', e => updateDisturbance(parseFloat((e.target as HTMLInputElement).value)));
    }
    if (radiusNumber) {
      radiusNumber.value = CONFIG.DISTURBANCE_RADIUS.toString();
      radiusNumber.addEventListener('input', e => updateRadius(parseInt((e.target as HTMLInputElement).value, 10)));
    }
    if (intervalMinNumber) {
      intervalMinNumber.value = CONFIG.RANDOM_WAVE_INTERVAL_MIN.toString();
      intervalMinNumber.addEventListener('input', e => updateRandomIntervalMin(parseInt((e.target as HTMLInputElement).value, 10)));
    }
    if (intervalMaxNumber) {
      intervalMaxNumber.value = CONFIG.RANDOM_WAVE_INTERVAL_MAX.toString();
      intervalMaxNumber.addEventListener('input', e => updateRandomIntervalMax(parseInt((e.target as HTMLInputElement).value, 10)));
    }
    if (randomCheckbox) {
      randomCheckbox.checked = sim.randomWavesEnabled;
      randomCheckbox.addEventListener('change', () => {
        sim.randomWavesEnabled = randomCheckbox.checked;
        if (sim.randomWavesEnabled) {
          (sim as any).scheduleRandomWave();
        } else {
          if ((sim as any).randomWaveTimer) {
            clearTimeout((sim as any).randomWaveTimer);
            (sim as any).randomWaveTimer = 0;
          }
        }
      });
    }
  };

  // --- Settings panel value handlers ---
  const updateDamping = (value: number) => {
    sim.field.damping = value;
    const valElem = document.getElementById('dampingValue');
    if (valElem) valElem.innerText = value.toFixed(3);
  };
  const updateDisturbance = (value: number) => {
    sim.field.disturbance = value;
    const valElem = document.getElementById('disturbanceValue');
    if (valElem) valElem.innerText = value.toFixed(1);
  };
  const updateRadius = (value: number) => {
    CONFIG.DISTURBANCE_RADIUS = value;
  };
  const updateRandomIntervalMin = (value: number) => {
    CONFIG.RANDOM_WAVE_INTERVAL_MIN = value;
  };
  const updateRandomIntervalMax = (value: number) => {
    CONFIG.RANDOM_WAVE_INTERVAL_MAX = value;
  };
});