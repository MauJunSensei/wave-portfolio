// WebGL Wave Interference Simulation - Modular TypeScript
var CONFIG = {
    GRID_DENSITY: 0.25, // Increased grid density for smoother waves
    DAMPING: 0.995,
    DISTURBANCE: 5.0, // Increase disturbance amplitude for visible waves
    POINT_SIZE: 3.0,
    INITIAL_RANDOM_WAVES: 5,
    RANDOM_WAVE_INTERVAL_MIN: 300, // ms
    RANDOM_WAVE_INTERVAL_MAX: 2000, // ms
    DISTURBANCE_RADIUS: 3,
};
// === GL Context Manager ===
var GLContext = /** @class */ (function () {
    function GLContext(canvasId) {
        var _this = this;
        var canvas = document.getElementById(canvasId);
        if (!canvas)
            throw new Error("Canvas '#".concat(canvasId, "' not found"));
        // Request antialiasing in the context attributes
        var gl = canvas.getContext('webgl', { antialias: true });
        if (!gl)
            throw new Error('WebGL not supported');
        this.canvas = canvas;
        this.gl = gl;
        // Set a clean background color (optional, helps with AA)
        gl.clearColor(0.08, 0.13, 0.22, 1.0);
        window.addEventListener('resize', function () { return _this.resize(); });
        this.resize();
    }
    GLContext.prototype.resize = function () {
        var _a = this, canvas = _a.canvas, gl = _a.gl;
        canvas.style.position = 'fixed';
        canvas.style.left = '0';
        canvas.style.top = '0';
        canvas.style.width = '100vw';
        canvas.style.height = '100vh';
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
    };
    return GLContext;
}());
// === Shader Program Wrapper ===
var ShaderProgram = /** @class */ (function () {
    function ShaderProgram(gl, vertSrc, fragSrc) {
        this.gl = gl;
        var vert = this.compile(gl.VERTEX_SHADER, vertSrc);
        var frag = this.compile(gl.FRAGMENT_SHADER, fragSrc);
        var prog = gl.createProgram();
        if (!prog)
            throw new Error('Failed to create program');
        gl.attachShader(prog, vert);
        gl.attachShader(prog, frag);
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            throw new Error("Program link error: ".concat(gl.getProgramInfoLog(prog)));
        }
        gl.useProgram(prog);
        this.program = prog;
        this.aPos = gl.getAttribLocation(prog, 'aPos');
        this.aAmp = gl.getAttribLocation(prog, 'aAmp');
        var loc = gl.getUniformLocation(prog, 'uAspect');
        if (!loc)
            throw new Error('Uniform uAspect not found');
        this.uAspect = loc;
        var psLoc = gl.getUniformLocation(prog, 'uPointSize');
        if (!psLoc)
            throw new Error('Uniform uPointSize not found');
        this.uPointSize = psLoc;
        var tLoc = gl.getUniformLocation(prog, 'uTime');
        if (!tLoc)
            throw new Error('Uniform uTime not found');
        this.uTime = tLoc;
        gl.enableVertexAttribArray(this.aPos);
        gl.enableVertexAttribArray(this.aAmp);
    }
    ShaderProgram.prototype.compile = function (type, src) {
        var shader = this.gl.createShader(type);
        if (!shader)
            throw new Error('Failed to create shader');
        this.gl.shaderSource(shader, src);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            throw new Error("Shader compile error: ".concat(this.gl.getShaderInfoLog(shader)));
        }
        return shader;
    };
    return ShaderProgram;
}());
// === Wave Field Simulation ===
var WaveField = /** @class */ (function () {
    function WaveField(density, disturbance, damping) {
        var _this = this;
        this.gridW = 0;
        this.gridH = 0;
        this.width = 0;
        this.height = 0;
        this.density = density;
        this.disturbance = disturbance;
        this.damping = damping;
        this.curr = new Float32Array(0);
        this.prev = new Float32Array(0);
        this.next = new Float32Array(0);
        this.resize(window.innerWidth, window.innerHeight);
        window.addEventListener('resize', function () { return _this.resize(window.innerWidth, window.innerHeight); });
    }
    WaveField.prototype.resize = function (width, height) {
        this.width = width;
        this.height = height;
        // Calculate the number of points so that spacing is equal and grid fits in window
        // spacing = min(width, height) / (maxPoints - 1)
        // gridW = floor(width / spacing) + 1, gridH = floor(height / spacing) + 1
        var approxPoints = Math.max(2, Math.round(Math.min(width, height) * this.density));
        var spacing = Math.min(width, height) / (approxPoints - 1);
        this.gridW = Math.max(2, Math.floor(width / spacing) + 1);
        this.gridH = Math.max(2, Math.floor(height / spacing) + 1);
        var len = this.gridW * this.gridH;
        this.curr = new Float32Array(len);
        this.prev = new Float32Array(len);
        this.next = new Float32Array(len);
    };
    WaveField.prototype.addDisturbanceAtGrid = function (gx, gy) {
        var r = CONFIG.DISTURBANCE_RADIUS;
        for (var dx = -r; dx <= r; dx++) {
            for (var dy = -r; dy <= r; dy++) {
                var nx = gx + dx;
                var ny = gy + dy;
                if (nx >= 0 && nx < this.gridW && ny >= 0 && ny < this.gridH) {
                    var i = ny * this.gridW + nx;
                    this.curr[i] += this.disturbance * Math.exp(-(dx * dx + dy * dy) / 4);
                }
            }
        }
    };
    WaveField.prototype.addImpulseAtGrid = function (gx, gy, intensity) {
        var r = CONFIG.DISTURBANCE_RADIUS;
        for (var dx = -r; dx <= r; dx++) {
            for (var dy = -r; dy <= r; dy++) {
                var nx = gx + dx;
                var ny = gy + dy;
                if (nx >= 0 && nx < this.gridW && ny >= 0 && ny < this.gridH) {
                    var i = ny * this.gridW + nx;
                    this.curr[i] += intensity * Math.exp(-(dx * dx + dy * dy) / 4);
                }
            }
        }
    };
    WaveField.prototype.addDisturbance = function (xNDC, yNDC) {
        // Map NDC to nearest grid point
        var gx = Math.round(((xNDC + 1) / 2) * (this.gridW - 1));
        var gy = Math.round(((yNDC + 1) / 2) * (this.gridH - 1));
        this.addDisturbanceAtGrid(gx, gy);
    };
    WaveField.prototype.update = function () {
        var _a;
        var W = this.gridW;
        var H = this.gridH;
        // interior finite difference
        for (var y = 1; y < H - 1; y++) {
            for (var x = 1; x < W - 1; x++) {
                var i = y * W + x;
                this.next[i] = (2 * this.curr[i] - this.prev[i] + 0.5 * (this.curr[i - 1] + this.curr[i + 1] + this.curr[i - W] + this.curr[i + W] - 4 * this.curr[i])) * this.damping;
            }
        }
        // boundaries
        for (var x = 0; x < W; x++) {
            this.next[x] = 0;
            this.next[(H - 1) * W + x] = 0;
        }
        for (var y = 0; y < H; y++) {
            this.next[y * W] = 0;
            this.next[y * W + (W - 1)] = 0;
        }
        // swap buffers
        _a = [this.curr, this.next, this.prev], this.prev = _a[0], this.curr = _a[1], this.next = _a[2];
    };
    WaveField.prototype.getHeightArray = function () {
        return this.curr;
    };
    WaveField.prototype.getGridWidth = function () { return this.gridW; };
    WaveField.prototype.getGridHeight = function () { return this.gridH; };
    return WaveField;
}());
// === Input Handler ===
var InputHandler = /** @class */ (function () {
    function InputHandler(canvas, field) {
        var _this = this;
        this.canvas = canvas;
        this.field = field;
        this.isMouseDown = false; // Track mouse state
        canvas.addEventListener('mousedown', function (e) {
            _this.isMouseDown = true;
            _this.handle(e);
        });
        canvas.addEventListener('mouseup', function () {
            _this.isMouseDown = false;
        });
        canvas.addEventListener('mousemove', function (e) {
            if (_this.isMouseDown)
                _this.handle(e);
        });
        canvas.addEventListener('touchstart', function (e) {
            _this.isMouseDown = true;
            _this.handle(e.touches[0]);
            e.preventDefault();
        });
        canvas.addEventListener('touchend', function () {
            _this.isMouseDown = false;
        });
        canvas.addEventListener('touchmove', function (e) {
            if (_this.isMouseDown)
                _this.handle(e.touches[0]);
            e.preventDefault();
        });
        window.addEventListener('keydown', function (e) {
            if (e.code === 'Space')
                field.addDisturbance(0, 0);
        });
    }
    InputHandler.prototype.handle = function (e) {
        var rect = this.canvas.getBoundingClientRect();
        var W = this.field.getGridWidth();
        var H = this.field.getGridHeight();
        var sx = e.clientX - rect.left;
        var sy = e.clientY - rect.top;
        var cellW = this.canvas.width / (W - 1);
        var cellH = this.canvas.height / (H - 1);
        var cell = Math.min(cellW, cellH);
        var gridPixelW = cell * (W - 1);
        var gridPixelH = cell * (H - 1);
        var offsetX = (this.canvas.width - gridPixelW) / 2;
        var offsetY = (this.canvas.height - gridPixelH) / 2;
        var px = (sx * (this.canvas.width / rect.width)) - offsetX;
        var py = (sy * (this.canvas.height / rect.height)) - offsetY;
        var gx = Math.round(px / cell);
        var gy = Math.round((H - 1) - py / cell);
        var gxClamped = Math.max(0, Math.min(W - 1, gx));
        var gyClamped = Math.max(0, Math.min(H - 1, gy));
        this.field.addDisturbanceAtGrid(gxClamped, gyClamped);
    };
    return InputHandler;
}());
// === Renderer ===
var Renderer = /** @class */ (function () {
    function Renderer(glCtx, shader, field) {
        this.glCtx = glCtx;
        this.shader = shader;
        this.field = field;
        this.startTime = performance.now();
        var gl = glCtx.gl;
        this.posBuf = gl.createBuffer();
        this.ampBuf = gl.createBuffer();
    }
    Object.defineProperty(Renderer.prototype, "gridW", {
        get: function () { return this.field.getGridWidth(); },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Renderer.prototype, "gridH", {
        get: function () { return this.field.getGridHeight(); },
        enumerable: false,
        configurable: true
    });
    Renderer.prototype.start = function () {
        var _this = this;
        requestAnimationFrame(function () { return _this.loop(); });
    };
    Renderer.prototype.loop = function () {
        var _this = this;
        var gl = this.glCtx.gl;
        this.field.update();
        var W = this.gridW;
        var H = this.gridH;
        // Compute cell size (equal in both directions)
        var cellW = this.glCtx.canvas.width / (W - 1);
        var cellH = this.glCtx.canvas.height / (H - 1);
        this.cell = Math.min(cellW, cellH);
        // Compute grid pixel size and offset to center
        var gridPixelW = this.cell * (W - 1);
        var gridPixelH = this.cell * (H - 1);
        var offsetX = (this.glCtx.canvas.width - gridPixelW) / 2;
        var offsetY = (this.glCtx.canvas.height - gridPixelH) / 2;
        var posArr = new Float32Array(W * H * 2);
        var ampArr = new Float32Array(this.field.getHeightArray());
        var idx = 0;
        for (var y = 0; y < H; y++) {
            for (var x = 0; x < W; x++) {
                // Map grid to NDC coordinates, filling the grid area (not the whole canvas)
                var px = offsetX + x * this.cell;
                var py = offsetY + y * this.cell;
                var ndcX = (px / this.glCtx.canvas.width) * 2 - 1;
                var ndcY = (py / this.glCtx.canvas.height) * 2 - 1;
                posArr[2 * idx] = ndcX;
                posArr[2 * idx + 1] = ndcY;
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
        var now = performance.now();
        gl.uniform1f(this.shader.uTime, (now - this.startTime) * 0.001);
        gl.drawArrays(gl.POINTS, 0, W * H);
        requestAnimationFrame(function () { return _this.loop(); });
    };
    return Renderer;
}());
// === Shader Sources ===
var vertSrc = "\nattribute vec2 aPos;\nattribute float aAmp;\nvarying float vAmp;\nuniform float uAspect;\nuniform float uPointSize;\nvoid main() {\n    vAmp = aAmp;\n    vec2 pos = aPos;\n    pos.x *= uAspect;\n    gl_PointSize = uPointSize;\n    gl_Position = vec4(pos, 0.0, 1.0);\n}";
var fragSrc = "\nprecision mediump float;\nvarying float vAmp;\nuniform float uTime;\n\n// Light source position in NDC (centered, above pool)\nconst vec3 lightPos = vec3(0.0, 0.0, 1.5); // x, y in NDC, z above pool\n\nvec3 hsv2rgb(vec3 c) {\n    vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);\n    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);\n    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);\n}\n\nvoid main() {\n    float amp = clamp(vAmp, -1.0, 1.0);\n    // Depth-based color: troughs are deeper/greener, crests are lighter/bluer\n    float baseHue = mix(0.5, 0.6, 0.5 + 0.5 * amp); // 0.5=greenish, 0.6=blueish\n    float baseSat = mix(0.8, 1.0, 0.5 + 0.5 * amp); // more saturated at crests\n    float baseVal = 0.4 + 0.6 * abs(amp); // brightness based on amplitude\n    vec3 color = hsv2rgb(vec3(baseHue, baseSat, baseVal));\n\n    // Animated caustic shimmer (pool floor)\n    float caustic = 0.0;\n    vec2 uv = gl_FragCoord.xy * 0.01;\n    caustic += 0.25 * sin(uv.x * 8.0 + uTime * 0.7);\n    caustic += 0.25 * sin(uv.y * 8.0 - uTime * 0.8);\n    caustic += 0.25 * sin((uv.x + uv.y) * 6.0 + uTime * 1.2);\n    caustic += 0.25 * sin((uv.x - uv.y) * 6.0 - uTime * 1.5);\n    caustic = 0.5 + 0.5 * caustic;\n\n    // Raytracing from stationary light source (fixed normal)\n    // --- Perspective Correction ---\n    // Use canvas size to compute aspect ratio and perspective depth\n    float aspect = 800.0 / 600.0; // Replace with uniform if dynamic\n    float fov = 1.2; // Field of view (radians), tweak for effect\n    float zNear = 0.5;\n    float zFar = 2.5;\n    // Map gl_FragCoord.xy to NDC [-1,1]\n    vec2 fragNDC = (gl_FragCoord.xy / vec2(800.0, 600.0)) * 2.0 - 1.0;\n    fragNDC.x *= aspect;\n    // Project to view space (simple perspective)\n    float z = zNear + (zFar - zNear) * 0.5; // Place surface at mid-depth\n    float px = fragNDC.x * tan(fov * 0.5) * z;\n    float py = fragNDC.y * tan(fov * 0.5) * z / aspect;\n    vec3 fragPos = vec3(px, py, 0.0);\n    vec3 normal = vec3(0.0, 0.0, 1.0); // Fixed normal (up)\n    vec3 lightDir = normalize(lightPos - fragPos);\n    float diff = max(dot(normal, lightDir), 0.0);\n    float spec = pow(max(dot(reflect(-lightDir, normal), vec3(0,0,1)), 0.0), 32.0);\n    float dist = length(lightPos - fragPos);\n    float attenuation = 1.0 / (0.5 + dist * dist);\n\n    // Modulate caustics by lighting (diffuse and attenuation)\n    float causticMod = caustic * diff * attenuation;\n    color *= 0.8 + 0.3 * causticMod; // brighten with shimmer modulated by light\n\n    color *= 0.7 + 0.5 * diff * attenuation;\n    color += vec3(1.0, 0.95, 0.8) * spec * attenuation * 0.5;\n\n    // Foam/sparkle at high crests\n    float foam = smoothstep(0.7, 0.95, abs(amp));\n    float sparkle = step(0.95, fract(sin(dot(gl_PointCoord, vec2(12.9898,78.233))) * 43758.5453));\n    foam *= 0.7 + 0.3 * sparkle;\n    color = mix(color, vec3(1.0), foam);\n\n    // Subtle ripples\n    float ripple = sin(10.0 * gl_PointCoord.x) * sin(10.0 * gl_PointCoord.y) * 0.05;\n    color += ripple;\n\n    // Soft circular blur\n    float dist2 = distance(gl_PointCoord, vec2(0.5, 0.5));\n    float blur = exp(-16.0 * dist2 * dist2);\n    float alpha = blur * 0.9;\n\n    // Further soften the color for a cohesive look\n    color = mix(vec3(0.1, 0.2, 0.4), color, blur * 1.2);\n\n    gl_FragColor = vec4(color, alpha);\n}";
// === Simulation Orchestrator ===
var Simulation = /** @class */ (function () {
    function Simulation(canvasId) {
        this.randomWavesEnabled = true;
        this.randomWaveTimer = 0;
        this.glCtx = new GLContext(canvasId);
        this.field = new WaveField(CONFIG.GRID_DENSITY, CONFIG.DISTURBANCE, CONFIG.DAMPING);
        this.inputHandler = new InputHandler(this.glCtx.canvas, this.field);
        this.shader = new ShaderProgram(this.glCtx.gl, vertSrc, fragSrc);
        this.renderer = new Renderer(this.glCtx, this.shader, this.field);
        window._waveSimInstance = this;
        this.spawnInitialRandomWaves(CONFIG.INITIAL_RANDOM_WAVES); // Use config
        this.scheduleRandomWave();
    }
    Simulation.prototype.spawnInitialRandomWaves = function (count) {
        var W = this.field.getGridWidth();
        var H = this.field.getGridHeight();
        for (var i = 0; i < count; i++) {
            var gx = Math.floor(Math.random() * W);
            var gy = Math.floor(Math.random() * H);
            var intensity = CONFIG.DISTURBANCE * (0.5 + Math.random() * 1.5);
            this.field.addImpulseAtGrid(gx, gy, intensity);
        }
    };
    Simulation.prototype.start = function () {
        this.renderer.start();
    };
    Simulation.prototype.toggleRandomWaves = function () {
        this.randomWavesEnabled = !this.randomWavesEnabled;
        if (this.randomWavesEnabled) {
            this.scheduleRandomWave();
        }
        else {
            if (this.randomWaveTimer) {
                clearTimeout(this.randomWaveTimer);
                this.randomWaveTimer = 0;
            }
        }
    };
    Simulation.prototype.scheduleRandomWave = function () {
        var _this = this;
        if (!this.randomWavesEnabled)
            return;
        // Use config for random interval
        var interval = CONFIG.RANDOM_WAVE_INTERVAL_MIN + Math.random() * (CONFIG.RANDOM_WAVE_INTERVAL_MAX - CONFIG.RANDOM_WAVE_INTERVAL_MIN);
        this.randomWaveTimer = window.setTimeout(function () {
            _this.spawnRandomWave();
            _this.scheduleRandomWave();
        }, interval);
    };
    Simulation.prototype.spawnRandomWave = function () {
        var W = this.field.getGridWidth();
        var H = this.field.getGridHeight();
        var gx = Math.floor(Math.random() * W);
        var gy = Math.floor(Math.random() * H);
        var intensity = CONFIG.DISTURBANCE * (0.5 + Math.random() * 1.5);
        this.field.addImpulseAtGrid(gx, gy, intensity);
    };
    return Simulation;
}());
// Entry point and UI initialization
document.addEventListener('DOMContentLoaded', function () {
    var _a, _b, _c;
    // --- Start Simulation ---
    var sim = new Simulation('rippleCanvas');
    sim.start();
    window._waveSimInstance = sim;
    // --- Pause/resume random wave spawning on tab visibility ---
    var wasRandomWavesEnabled = false;
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
            wasRandomWavesEnabled = sim.randomWavesEnabled;
            sim.randomWavesEnabled = false;
            if (sim.randomWaveTimer) {
                clearTimeout(sim.randomWaveTimer);
                sim.randomWaveTimer = 0;
            }
            // Also update the toggle button UI
            var btn = document.getElementById('disableRandomWavesBtn');
            if (btn)
                btn.classList.add('btn-off');
        }
        else {
            if (wasRandomWavesEnabled && !sim.randomWavesEnabled) {
                sim.randomWavesEnabled = true;
                sim.scheduleRandomWave();
                // Also update the toggle button UI
                var btn = document.getElementById('disableRandomWavesBtn');
                if (btn)
                    btn.classList.remove('btn-off');
            }
        }
    });
    // --- Portfolio UI ---
    var aboutHTML = "\n    <div class='animate__animated animate__fadeIn'>\n      <h2 class='h5 mb-3'><i class='fa-solid fa-user me-2'></i>About Me</h2>\n      <p class='mb-2'>Hi, I'm <b>Jun</b> \u2013 a creative developer passionate about interactive graphics, simulations, and modern web technologies.</p>\n      <ul class='list-unstyled small mb-0'>\n        <li><b>Location:</b> [Your City, Country]</li>\n        <li><b>Specialties:</b> WebGL, TypeScript, UI/UX, Creative Coding</li>\n      </ul>\n    </div>";
    var projectDetails = [
        {
            title: 'WebGL Water Simulation',
            tech: 'TypeScript, WebGL, OOP',
            description: 'Real-time interactive water simulation with caustics, foam, and raytraced lighting.',
            github: 'https://github.com/yourusername/webgl-water-sim',
            details: "<h2 class='h5 mb-3'><i class='fa-solid fa-water me-2'></i>WebGL Water Simulation</h2><p>This project demonstrates a physically-based, interactive water simulation using WebGL and TypeScript. Features include caustics, foam, and raytraced lighting for realistic effects. <br><br><b>Technologies:</b> TypeScript, WebGL, GLSL, OOP<br><b>Highlights:</b> Real-time performance, modular code, advanced shaders.</p>"
        },
        {
            title: 'Project 2: [Title]',
            tech: '[Tech Stack]',
            description: 'Short description of project 2.',
            github: 'https://github.com/yourusername/project2',
            details: "<h2 class='h5 mb-3'><i class='fa-solid fa-cube me-2'></i>Project 2</h2><p>Detailed description of project 2. <br><br><b>Technologies:</b> [Tech Stack]<br><b>Highlights:</b> [Key features].</p>"
        },
        {
            title: 'Project 3: [Title]',
            tech: '[Tech Stack]',
            description: 'Short description of project 3.',
            github: 'https://github.com/yourusername/project3',
            details: "<h2 class='h5 mb-3'><i class='fa-solid fa-rocket me-2'></i>Project 3</h2><p>Detailed description of project 3. <br><br><b>Technologies:</b> [Tech Stack]<br><b>Highlights:</b> [Key features].</p>"
        }
    ];
    var projectsHTML = "\n    <div class='animate__animated animate__fadeIn'>\n      <h2 class='h5 mb-3'><i class='fa-solid fa-code me-2'></i>Projects</h2>\n      <div class=\"swiper\" id=\"projectsSwiper\">\n        <div class=\"swiper-wrapper\">\n          ".concat(projectDetails.map(function (proj, i) { return "\n            <div class=\"swiper-slide\">\n              <div class=\"card bg-dark text-white border-0 project-card\" data-project-index=\"".concat(i, "\">\n                <div class=\"card-body d-flex flex-column h-100\">\n                  <h5 class=\"card-title mb-1\">").concat(proj.title, "</h5>\n                  <p class=\"card-text small mb-1\">").concat(proj.tech, "</p>\n                  <p class=\"card-text small mb-2\">").concat(proj.description, "</p>\n                  <a href=\"").concat(proj.github, "\" class=\"btn btn-sm minimal-nav-btn mt-auto align-self-start\" target=\"_blank\" rel=\"noopener\" title=\"View on GitHub\"><i class=\"fab fa-github me-1\"></i>GitHub</a>\n                </div>\n              </div>\n            </div>\n          "); }).join(''), "\n        </div>\n        <div class=\"swiper-pagination\"></div>\n      </div>\n    </div>");
    var contactHTML = "\n    <div class='animate__animated animate__fadeIn'>\n      <h2 class='h5 mb-3'><i class='fa-solid fa-envelope me-2'></i>Contact</h2>\n      <div class='d-flex gap-3'>\n        <a href='mailto:jun@dodel.xyz' class='btn minimal-nav-btn' title='Email'><i class='fa-solid fa-envelope'></i></a>\n        <a href='https://github.com/MauJunSensei' target='_blank' class='btn minimal-nav-btn' title='GitHub'><i class='fab fa-github'></i></a>\n        <a href='https://www.linkedin.com/in/jun-d-336494329/' target='_blank' class='btn minimal-nav-btn' title='LinkedIn'><i class='fab fa-linkedin'></i></a>\n      </div>\n    </div>";
    // --- Content switching logic ---
    var setContent = function (html) {
        var cont = document.getElementById('portfolioContent');
        if (!cont)
            return;
        cont.classList.remove('animate__fadeIn');
        cont.innerHTML = html;
        // Initialize Swiper carousel if present
        setTimeout(function () {
            var swiperEl = document.getElementById('projectsSwiper');
            if (swiperEl && window.Swiper) {
                if (swiperEl._swiper) {
                    swiperEl._swiper.destroy(true, true);
                }
                var swiper = new window.Swiper(swiperEl, {
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
                swiperEl._swiper = swiper;
            }
            // Project card click handler
            document.querySelectorAll('.project-card').forEach(function (el) {
                el.addEventListener('click', function (e) {
                    if (e.target.closest('a'))
                        return;
                    e.preventDefault();
                    var idx = this.getAttribute('data-project-index');
                    if (idx !== null) {
                        var proj = projectDetails[+idx];
                        setContent("<div class='animate__animated animate__fadeIn'>".concat(proj.details, "<br><button class='btn minimal-nav-btn mt-3 me-2' id='backToProjects'><i class='fa fa-arrow-left me-1'></i>Back</button><a href='").concat(proj.github, "' class='btn minimal-nav-btn mt-3' target='_blank' rel='noopener'><i class='fab fa-github me-1'></i>GitHub</a></div>"));
                        setTimeout(function () {
                            var backBtn = document.getElementById('backToProjects');
                            if (backBtn)
                                backBtn.addEventListener('click', function () { return setContent(projectsHTML); });
                        }, 0);
                    }
                });
            });
        }, 0);
    };
    // --- Navigation event listeners ---
    (_a = document.getElementById('aboutBtn')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', function () { return setContent(aboutHTML); });
    (_b = document.getElementById('projectsBtn')) === null || _b === void 0 ? void 0 : _b.addEventListener('click', function () { return setContent(projectsHTML); });
    (_c = document.getElementById('contactBtn')) === null || _c === void 0 ? void 0 : _c.addEventListener('click', function () { return setContent(contactHTML); });
    // --- Add Disable Random Waves toggle button ---
    var addDisableRandomWavesToggle = function () {
        var btn = document.getElementById('disableRandomWavesBtn');
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
        var updateBtn = function () {
            if (sim && sim.randomWavesEnabled) {
                btn.innerHTML = '<i class="fa fa-ban me-1"></i>Disable Random Waves';
                btn.classList.remove('btn-off');
            }
            else {
                btn.innerHTML = '<i class="fa fa-water me-1"></i>Enable Random Waves';
                btn.classList.add('btn-off');
            }
        };
        btn.onclick = function () {
            sim.toggleRandomWaves();
            updateBtn();
        };
        updateBtn();
    };
    addDisableRandomWavesToggle();
    // --- Initial load ---
    setContent(aboutHTML);
    // --- Ensure overlay container does not block pointer events except for interactive elements
    var container = document.querySelector('.container');
    if (container) {
        container.style.pointerEvents = 'none';
        // Restore pointer events for nav, buttons, and links
        container.querySelectorAll('button, a, nav, .minimal-nav-btn').forEach(function (el) {
            el.style.pointerEvents = 'auto';
        });
    }
});
