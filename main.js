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
camera.position.set(8000, 6000, 10000);

const followersGroup = new THREE.Group();
scene.add(followersGroup);
let dataBase = {};

// --- FONDO DE NEBULOSA ---
const skyGeo = new THREE.SphereGeometry(35000, 32, 32);
const skyMat = new THREE.ShaderMaterial({
    uniforms: { c1: { value: new THREE.Color(0x1a0033) }, c2: { value: new THREE.Color(0x000205) } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec2 vUv; uniform vec3 c1; uniform vec3 c2; void main() { float d = distance(vUv, vec2(0.5)); gl_FragColor = vec4(mix(c1, c2, d*1.5), 1.0); }`,
    side: THREE.BackSide
});
scene.add(new THREE.Mesh(skyGeo, skyMat));

// --- ESTRELLAS BLANCAS ---
const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(15000 * 3);
for(let i=0; i<45000; i++) starPos[i] = (Math.random() - 0.5) * 40000;
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 2, transparent: true, opacity: 0.8 });
scene.add(new THREE.Points(starGeo, starMaterial));

// --- FUNCIONES ---
function crearAstroVisual(name, x, y, z, color) {
    const id = name.trim().toLowerCase().replace(/[^a-z0-9]/g, "_");
    if (dataBase[id]) return;

    const container = new THREE.Group();
    
    // El planeta
    const astro = new THREE.Mesh(
        new THREE.SphereGeometry(40, 24, 24), 
        new THREE.MeshBasicMaterial({ color: color })
    );
    container.add(astro);
    
    // Etiqueta
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 512; canvas.height = 128;
    ctx.fillStyle = 'white'; ctx.font = 'Bold 56px Arial'; ctx.textAlign = 'center';
    ctx.fillText(name.toUpperCase(), 256, 80);
    
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ 
        map: new THREE.CanvasTexture(canvas), 
        transparent: true 
    }));
    sprite.scale.set(300, 75, 1); 
    sprite.position.y = -100;
    container.add(sprite);
    
    container.position.set(x, y, z);
    followersGroup.add(container);

    // GUARDAMOS LA POSICIÓN EN UN VECTOR PARA LA CÁMARA
    dataBase[id] = { 
        container: container, 
        worldPos: new THREE.Vector3(x, y, z) 
    };
    
    document.getElementById('counter').innerText = Object.keys(dataBase).length;
}

onChildAdded(astrosRef, (snapshot) => {
    const d = snapshot.val();
    crearAstroVisual(d.name, d.x, d.y, d.z, d.color);
});

// REGISTRO
document.getElementById('confirm-btn').addEventListener('click', async () => {
    const n = document.getElementById('follower-name-input').value.trim();
    if (localStorage.getItem('user_has_astro')) return alert("Ya tienes un astro.");
    if (!n) return alert("Ingresa un nombre.");

    const idLimpio = n.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const nuevoAstroRef = ref(db, 'astros/' + idLimpio);
    
    try {
        await set(nuevoAstroRef, {
            name: n, x: (Math.random()-0.5)*15000, y: (Math.random()-0.5)*15000, z: (Math.random()-0.5)*15000,
            color: [0xffffff, 0x81d4fa, 0xfff176, 0xffab91, 0xe1bee7][Math.floor(Math.random()*5)]
        });
        localStorage.setItem('user_has_astro', n);
        document.getElementById('register-modal').classList.add('hidden');
    } catch (e) { alert("Error o nombre duplicado."); }
});

// --- VIAJE DE CÁMARA CORREGIDO ---
document.getElementById('search-btn').addEventListener('click', () => {
    const q = document.getElementById('search-input').value.trim().toLowerCase().replace(/[^a-z0-9]/g, "_");
    
    if (dataBase[q]) {
        const targetPos = dataBase[q].worldPos;
        controls.enabled = false;

        new TWEEN.Tween(camera.position)
            .to({ 
                x: targetPos.x + 800, 
                y: targetPos.y + 400, 
                z: targetPos.z + 1000 
            }, 2500)
            .easing(TWEEN.Easing.Cubic.InOut)
            .onUpdate(() => {
                camera.lookAt(targetPos);
            })
            .onComplete(() => {
                controls.target.copy(targetPos);
                controls.enabled = true;
            })
            .start();
    } else {
        alert("Astro no encontrado.");
    }
});

// PAYPAL
if (window.paypal) {
    paypal.Buttons({
        createOrder: (data, actions) => {
            const monto = document.getElementById('donate-amount').value;
            return actions.order.create({
                purchase_units: [{ amount: { currency_code: "USD", value: monto } }]
            });
        },
        onApprove: (data, actions) => {
            return actions.order.capture().then(() => {
                alert("¡Gracias!");
                document.getElementById('donate-modal').classList.add('hidden');
            });
        }
    }).render('#paypal-button-container');
}

// ANIMACIÓN
function animate() {
    requestAnimationFrame(animate);
    TWEEN.update();
    controls.update();
    followersGroup.rotation.y += 0.0001; 
    renderer.render(scene, camera);
}
animate();

// UI EVENTOS
document.getElementById('add-btn').onclick = () => document.getElementById('register-modal').classList.remove('hidden');
document.getElementById('cancel-btn').onclick = () => document.getElementById('register-modal').classList.add('hidden');
document.getElementById('donate-btn').onclick = () => document.getElementById('donate-modal').classList.remove('hidden');
document.getElementById('close-donate').onclick = () => document.getElementById('donate-modal').classList.add('hidden');

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
