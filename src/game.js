import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';

//define constants
const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;
const SENSITIVITY = Math.PI * 0.2

const PLAYER = {height: 1.5, turnSpeed: SENSITIVITY, canShoot: false}

const blocker = document.getElementById('blocker');
const instructions = document.getElementById('instructions');

const havePointerLock = 'pointerLockElement' in document || 'mozPointerLockElement' in document || 'webkitPointerLockElement' in document;

const bullets = [];
const keyboard = {};
let controls;
let scene;
let camera;
let target;
let renderer;
let clock;
let score = 0;

var start_time = performance.now();
var end_time;

function lockCursor() {
    if (havePointerLock) {
      const element = document.body;
      const pointerlockchange = function () {
        if (document.pointerLockElement === element || document.mozPointerLockElement === element
              || document.webkitPointerLockElement === element) {
          controls.enabled = true;
          blocker.style.display = 'none';
        } else {
          controls.enabled = false;
  
          blocker.style.display = '-webkit-box';
          blocker.style.display = '-moz-box';
          blocker.style.display = 'box';
  
          instructions.style.display = '';
        }
      };
  
      const pointerlockerror = function () {
        instructions.style.display = '';
      };
  
      // Hook pointer lock state change events
      document.addEventListener('pointerlockchange', pointerlockchange, false);
      document.addEventListener('mozpointerlockchange', pointerlockchange, false);
      document.addEventListener('webkitpointerlockchange', pointerlockchange, false);
  
      document.addEventListener('pointerlockerror', pointerlockerror, false);
      document.addEventListener('mozpointerlockerror', pointerlockerror, false);
      document.addEventListener('webkitpointerlockerror', pointerlockerror, false);
  
      instructions.addEventListener('click', (event) => {
        instructions.style.display = 'none';
  
        // Ask the browser to lock the pointer
        element.requestPointerLock = element.requestPointerLock || element.mozRequestPointerLock || element.webkitRequestPointerLock;
  
        if (/Firefox/i.test(navigator.userAgent)) {
          var fullscreenchange = function (event) {
            if (document.fullscreenElement === element || document.mozFullscreenElement === element || document.mozFullScreenElement === element) {
              document.removeEventListener('fullscreenchange', fullscreenchange);
              document.removeEventListener('mozfullscreenchange', fullscreenchange);
  
              element.requestPointerLock();
            }
          };
  
          document.addEventListener('fullscreenchange', fullscreenchange, false);
          document.addEventListener('mozfullscreenchange', fullscreenchange, false);
          element.requestFullscreen = element.requestFullscreen || element.mozRequestFullscreen || element.mozRequestFullScreen || element.webkitRequestFullscreen;
  
          element.requestFullscreen();
        } else {
          element.requestPointerLock();
        }
      }, false);
    } else {
      instructions.innerHTML = 'Your browser doesn\'t seem to support Pointer Lock API';
    }
}

function getRandomSize(min, max) {
    return Math.random() * (max - min) + min;
}

function getRandomLoc(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min); // The maximum is exclusive and the minimum is inclusive
}

function spawnTarget(scene) {
    const geometry = new THREE.SphereGeometry(getRandomSize(0.2, 0.9), 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: 0xffbf00 });
    target = new THREE.Mesh(geometry, material);
    scene.add(target);
  
    //TODO: NEED TO CHANGE THIS
    target.position.x += getRandomLoc(-10, 10);
    target.position.y += getRandomLoc(1, 5);
    target.position.z += getRandomLoc(0, 10);
  
    scene.add(target);
}

function createSpace(scene) {
    let floor = new THREE.Mesh(
      new THREE.PlaneGeometry(150, 150, 150, 150),
      new THREE.MeshBasicMaterial({ color: 0xa9a9a9 }),
    );
    floor.rotation.x -= Math.PI / 2; // Rotate the floor 90 degrees
    scene.add(floor);
  
    let wall1 = new THREE.Mesh(
      new THREE.BoxGeometry(200, 40, 20),
      new THREE.MeshBasicMaterial({ color: 0x282828 }),
    );
    wall1.position.y -= 1;
    wall1.position.z += 20;
    scene.add(wall1);
  
    let wall2 = new THREE.Mesh(
      new THREE.BoxGeometry(20, 40, 200),
      new THREE.MeshBasicMaterial({ color: 0x282828 }),
    );
    wall2.position.y -= 1;
    wall2.position.x += 30;
    scene.add(wall2);
  
    let wall3 = new THREE.Mesh(
      new THREE.BoxGeometry(20, 40, 200),
      new THREE.MeshBasicMaterial({ color: 0x282828 }),
    );
    wall3.position.y -= 1;
    wall3.position.x -= 30;
    scene.add(wall3);
  
    let wall4 = new THREE.Mesh(
      new THREE.BoxGeometry(200, 40, 20),
      new THREE.MeshBasicMaterial({ color: 0x606060 }),
    );
    wall4.position.y -= 1;
    wall4.position.z -= 40;
    scene.add(wall4);
  
    let ceiling = new THREE.Mesh(
      new THREE.BoxGeometry(200, 1, 200),
      new THREE.MeshBasicMaterial({ color: 0x484848 }),
    );
    ceiling.position.y += 40;
    scene.add(ceiling);
}

function createPlayer(scene) {
    camera.position.set(0, PLAYER.height, -5);
    camera.lookAt(new THREE.Vector3(0, PLAYER.height, 0));
  
    controls = new PointerLockControls(camera, document.body);
    scene.add(controls.getObject());
}

function addScore() {
    $('body').append('<div id="hud"><p>Score: <span id="score">0</span></p></div>');
}

function render(scene) {
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(WIDTH, HEIGHT);
    document.body.appendChild(renderer.domElement);
}

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
    clock = new THREE.Clock();
  
    createSpace(scene);
    spawnTarget(scene);
    addScore();
    createPlayer(scene);
    lockCursor(havePointerLock);

    render(scene);
    animate();
}

function keyDown(event) {
    keyboard[event.keyCode] = true;
}
document.body.onmousedown = function () {
    // const bullet = new THREE.Mesh(
    //     new THREE.SphereGeometry(0.05, 8, 8),
    //     new THREE.MeshBasicMaterial({ color: 0xffffff }),
    // );
    // bullet.position.set(0, PLAYER.height, -5);

    // // Calculate the direction vector based on camera rotation
    // const direction = new THREE.Vector3();
    // controls.getDirection(direction);
    // bullet.velocity = direction.clone().multiplyScalar(10);

    // //bullet.velocity = new THREE.Vector3(-Math.sin(camera.rotation.y), 0, Math.cos(camera.rotation.y));
    // bullet.alive = true;

    // setTimeout(() => {
    //     bullet.alive = false;
    //     scene.remove(bullet);
    // }, 1000);

    // bullets.push(bullet);
    // scene.add(bullet);
    // PLAYER.canShoot = 10;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);

    const intersects = raycaster.intersectObjects(scene.children);

    if (intersects.length > 0) {
        const intersection = intersects[0];
        // Check if the intersected object is a target
        if (intersection.object === target) {
          // Increment the score
          end_time = performance.now();
          var diff = end_time - start_time;
          console.log(diff + "  milliseconds")
          start_time = performance.now();
          score += 1;
          updateScore();
          // Remove target when hit
          scene.remove(target);
          // Respawn the target at a new location
          spawnTarget(scene);
            
        }
    }
};

function updateScore() {
  // Update the score display
  const scoreElement = document.getElementById('score');
  if (scoreElement) {
      scoreElement.textContent = score.toString();
  }
}

function trackBullets() {
    for (let index = 0; index < bullets.length; index += 1) {
        if (bullets[index] === undefined) {
        continue;
    }

    if (bullets[index].alive == false) {
        bullets.splice(index, 1);
        continue;
    }

        bullets[index].position.add(bullets[index].velocity);
    }
}

function keyUp(event) {
    keyboard[event.keyCode] = false;
}
  
window.addEventListener('keydown', keyDown);
window.addEventListener('keyup', keyUp);
window.onload = init;

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
  
    target.rotation.x += 0.01;
    target.rotation.y += 0.02;
  
    trackBullets();

    
  
    renderer.render(scene, camera);
}

window.addEventListener('resize', onWindowResize, false);

