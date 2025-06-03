import { mat4 } from 'gl-matrix';
// Initialize WebGL context
const canvas = document.createElement('canvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
document.body.appendChild(canvas);
const gl = canvas.getContext('webgl');
if (!gl) {
    throw new Error('WebGL not supported');
}
// Vertex shader source
const vertexShaderSource = `
attribute vec2 a_position;
uniform mat4 u_matrix;
void main() {
    gl_Position = u_matrix * vec4(a_position, 0.0, 1.0);
}`;
// Fragment shader source
const fragmentShaderSource = `
precision mediump float;
uniform float u_age;
void main() {
    gl_FragColor = vec4(
        abs(sin(u_age * 3.14159)),
        abs(sin(u_age * 3.14159 + 2.0944)),
        abs(sin(u_age * 3.14159 + 4.1888)),
        1.0
    );
}`;
// Compile shader
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    if (!shader) {
        throw new Error('Failed to create shader');
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}
// Create program
function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    if (!program) {
        throw new Error('Failed to create program');
    }
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }
    return program;
}
const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
const program = createProgram(gl, vertexShader, fragmentShader);
// Set up attributes and uniforms
const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
const positions = [];
const gridSize = 50;
for (let x = 0; x < canvas.width; x += gridSize) {
    for (let y = 0; y < canvas.height; y += gridSize) {
        positions.push(x / canvas.width * 2 - 1, y / canvas.height * 2 - 1);
    }
}
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
const aPosition = gl.getAttribLocation(program, 'a_position');
gl.enableVertexAttribArray(aPosition);
gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
const uMatrix = gl.getUniformLocation(program, 'u_matrix');
const uAge = gl.getUniformLocation(program, 'u_age');
// Mouse interaction
let mouseX = 0;
let mouseY = 0;
canvas.addEventListener('mousemove', (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
});
// Animation loop
let age = 0;
function render() {
    if (!gl)
        return;
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    const matrix = mat4.create();
    mat4.ortho(matrix, -1, 1, -1, 1, -1, 1);
    gl.uniformMatrix4fv(uMatrix, false, matrix);
    age += 0.01;
    gl.uniform1f(uAge, age);
    gl.drawArrays(gl.POINTS, 0, positions.length / 2);
    requestAnimationFrame(render);
}
render();
