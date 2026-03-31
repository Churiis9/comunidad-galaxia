import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import TWEEN from '@tweenjs/tween.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onChildAdded } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// --- CONFIGURACIÓN FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyBpYd9yrcMcbnco4gyAnPLa0buW_5fIq8k",
    authDomain: "comunidad-galaxia.firebaseapp.com",
    databaseURL: "https://comunidad-galaxia-default-rtdb.firebaseio.com",
    projectId: "comunidad-galaxia",
    storageBucket: "comunidad-galaxia.firebasestorage.app",
    messagingSenderId: "612196718460",
    appId: "1:612196718460:web:43ce2bb059bf64384136f9",
    measurementId: "G-MY9Z6J9PCM"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const astrosRef = ref(db, 'astros');

// --- ESCENA 3D ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 60000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
camera.position.set(7000, 5000, 9000);

const followersGroup = new THREE.Group();
scene.add(followersGroup);
let dataBase = {};

// FONDO
const skyGeo = new THREE.SphereGeometry(30000, 32, 32);
const skyMat = new THREE.ShaderMaterial({
    uniforms: { c1: { value: new THREE.Color(0x1a0033) }, c2: { value: new THREE.Color(0x000205) } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec2 vUv; uniform vec3 c1; uniform vec3 c2; void main() { float d = distance(vUv, vec2(0.5)); gl_FragColor = vec4(mix(c1, c2, d*1.5), 1.0); }`,
    side: THREE.BackSide
});
scene.add(new THREE.Mesh(skyGeo, skyMat));

// --- FUNCIONES ---
function crearAstroVisual(name, x, y, z, color, esNuevo) {
    const id = name.trim().toLowerCase().replace(/[^a-z0-9]/g, "_");
    if (dataBase[id]) return;
    const container = new THREE.Group();
    const astro = new THREE.Mesh(new THREE.SphereGeometry(35, 24, 24), new THREE.MeshBasicMaterial({ color: color }));
    container.add(astro);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 512; canvas.height = 128;
    ctx.fillStyle = 'white'; ctx.font = 'Bold 52px Arial'; ctx.textAlign = 'center';
    ctx.fillText(name.toUpperCase(), 256, 80);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true }));
    sprite.scale.set(240, 60, 1); sprite.position.y = -90;
    container.add(sprite);
    container.position.set(x, y, z);
    followersGroup.add(container);
    dataBase[id] = { container };
    document.getElementById('counter').innerText = Object.keys(dataBase).length;
}

onChildAdded(astrosRef, (snapshot) => {
    const d = snapshot.val();
    crearAstroVisual(d.name, d.x, d.y, d.z, d.color, true);
});

document.getElementById('confirm-btn').addEventListener('click', async () => {
    const n = document.getElementById('follower-name-input').value.trim();
    if (!n || localStorage.getItem('user_has_astro')) return alert("¡Ya tienes un astro en la galaxia! No puedes registrar más de uno desde el mismo dispositivo.");
    const idLimpio = n.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const nuevoAstroRef = ref(db, 'astros/' + idLimpio);
    try {
        await set(nuevoAstroRef, {
            name: n, x: (Math.random()-0.5)*12000, y: (Math.random()-0.5)*12000, z: (Math.random()-0.5)*12000,
            color: [0xffffff, 0x81d4fa, 0xfff176, 0xffab91, 0xe1bee7][Math.floor(Math.random()*5)]
        });
        localStorage.setItem('user_has_astro', n);
        document.getElementById('register-modal').classList.add('hidden');
    } catch (e) { alert("Este nombre ya existe."); }
});

// --- PAYPAL VOLUNTARIO ---
if (window.paypal) {
    paypal.Buttons({
        createOrder: (data, actions) => {
            const monto = document.getElementById('donate-amount').value;
            if (monto < 1) return alert("El monto mínimo es $1");
            return actions.order.create({
                purchase_units: [{ amount: { currency_code: "USD", value: monto } }]
            });
        },
        onApprove: (data, actions) => {
            return actions.order.capture().then(() => {
                alert("¡Gracias por tu apoyo!");
                document.getElementById('donate-modal').classList.add('hidden');
            });
        }
    }).render('#paypal-button-container');
}

// BÚSQUEDA
document.getElementById('search-btn').addEventListener('click', () => {
    const q = document.getElementById('search-input').value.trim().toLowerCase().replace(/[^a-z0-9]/g, "_");
    if (dataBase[q]) {
        const pos = dataBase[q].container.position;
        controls.enabled = false;
        new TWEEN.Tween(camera.position).to({ x: pos.x+500, y: pos.y+200, z: pos.z+800 }, 2000)
            .easing(TWEEN.Easing.Cubic.InOut).onUpdate(() => camera.lookAt(pos))
            .onComplete(() => { controls.target.copy(pos); controls.enabled = true; }).start();
    } else { alert("No encontrado."); }
});

function animate() {
    requestAnimationFrame(animate);
    TWEEN.update();
    controls.update();
    followersGroup.rotation.y += 0.0001;
    renderer.render(scene, camera);
}
animate();

document.getElementById('add-btn').onclick = () => document.getElementById('register-modal').classList.remove('hidden');
document.getElementById('cancel-btn').onclick = () => document.getElementById('register-modal').classList.add('hidden');
document.getElementById('donate-btn').onclick = () => document.getElementById('donate-modal').classList.remove('hidden');
document.getElementById('close-donate').onclick = () => document.getElementById('donate-modal').classList.add('hidden');