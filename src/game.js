import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';

//define constants
const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;
const SENSITIVITY = Math.PI * 0.1
const ROOM_SIZE = 1000;
const PLAYER = {height: 1.5, turnSpeed: SENSITIVITY, canShoot: false}
const PLAYER_POV = 80
//how many times game 'repeats'- game is repeated when all targets in targetPositions are destroyed
const NUM_GAMELOOP = 1

const targetPositions = [
  { x: 0, y: 3, z: 3 },    // Center
  { x: -10, y: 3, z: 3 },    // Far Left
  { x: 10, y: 3, z: 3 },     // Far Right
  { x: -5, y: 3, z: 3 },      // Close Left
  { x: 5, y: 3, z: 3 },       // Close Right
];

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
let numTargets = 1;
let reactionTime = [];

let totalShotsTaken = 0;

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
        document.addEventListener('mousedown', onMouseDown);
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


//declare an index for target positions: start at 0
//whenever spawn target is called add 1 to index
//index is obtained by index mod 5

let index = 0; 

function spawnTarget(scene) {
  const geometry = new THREE.SphereGeometry(0.5, 32, 32);
  const material = new THREE.MeshBasicMaterial({ color: 0xAA4A44});
  target = new THREE.Mesh(geometry, material);

  if(numTargets <= targetPositions.length * NUM_GAMELOOP){
    target.position.set(targetPositions[index].x, targetPositions[index].y, targetPositions[index].z)
    scene.add(target);
    if (numTargets < targetPositions.length * NUM_GAMELOOP) {
      numTargets++;
    }
    //set new index correspondingly
    index = (index + 1) % targetPositions.length
  }
  
}


function createSpace(scene) {
  let floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE, ROOM_SIZE, ROOM_SIZE),
    new THREE.MeshBasicMaterial({ color: 0xa9a9a9 }),
  );
  floor.rotation.x -= Math.PI / 2; // Rotate the floor 90 degrees
  scene.add(floor);

  let wall1 = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM_SIZE, 40, 20),
    new THREE.MeshBasicMaterial({ color: 0x282828 }),
  );
  wall1.position.y -= 1;
  wall1.position.z += 20;
  scene.add(wall1);

  let wall2 = new THREE.Mesh(
    new THREE.BoxGeometry(20, 40, ROOM_SIZE),
    new THREE.MeshBasicMaterial({ color: 0x282828 }),
  );
  wall2.position.y -= 1;
  wall2.position.x += 30;
  scene.add(wall2);

  let wall3 = new THREE.Mesh(
    new THREE.BoxGeometry(20, 40, ROOM_SIZE),
    new THREE.MeshBasicMaterial({ color: 0x282828 }),
  );
  wall3.position.y -= 1;
  wall3.position.x -= 30;
  scene.add(wall3);

  let wall4 = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM_SIZE, 40, 20),
    new THREE.MeshBasicMaterial({ color: 0x606060 }),
  );
  wall4.position.y -= 1;
  wall4.position.z -= 40;
  scene.add(wall4);

  let ceiling = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM_SIZE, 1, ROOM_SIZE),
    new THREE.MeshBasicMaterial({ color: 0x484848 }),
  );
  ceiling.position.y += 40;
  scene.add(ceiling);
}

function createPlayer(scene) {
  camera.position.set(0, PLAYER.height, -5);
  camera.lookAt(new THREE.Vector3(0, PLAYER.height, 0));

  controls = new PointerLockControls(camera, document.body);
  controls.minAzimuthAngle = -Math.PI / 4; // -45 degrees
  controls.maxAzimuthAngle = Math.PI / 4; // 45 degrees
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
  camera = new THREE.PerspectiveCamera(PLAYER_POV, window.innerWidth / window.innerHeight, 0.1, 1000);
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


function onMouseDown(event) {
  if (event.button === 0) { // Left mouse button clicked
    shoot(event);
    console.log('pew')
  }
}

function shoot(event) {
  // Create a raycaster
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera({ x: 0, y: 0 }, camera);

  // Check for intersections with objects in the scene
  const intersects = raycaster.intersectObjects(scene.children);
  // Add 1 to total shots taken
  totalShotsTaken++;
  if (intersects.length > 0) {
    const intersection = intersects[0];
    
    // Check if the intersected object is the target
    if (intersection.object === target) {

      // Get the time
      end_time = performance.now();
      var diff = end_time - start_time;
      console.log(diff + "  milliseconds")
      reactionTime.push(diff)
      start_time = performance.now();
      
      // Increment the score
      updateScore();

      // Remove the target
      scene.remove(target);

      // Respawn the target at a new location
      spawnTarget(scene);

    }
  }
}

function updateScore() {
  score += 1;
  const scoreElement = document.getElementById('score');
  if (scoreElement) {
    scoreElement.textContent = score.toString();
    if (score >= targetPositions.length * NUM_GAMELOOP) {
      endGame();
    }
  }
}

function endGame(){ 
  console.log('Number of targets: ' + numTargets)
  console.log('Total shots taken: ' + totalShotsTaken)
  let accuracy = (numTargets / totalShotsTaken) * 100;
  let averageReactionTime = getAverageReactionTime(reactionTime);
  let totalReactionTime = getTotalReactionTime(reactionTime);
  // Display alert to inform the player that the game has ended
  alert('Game Over! Your statistics are: \nAccuracy: ' + accuracy.toFixed(2) + ' %' + '\nAverage Reaction Time: ' + averageReactionTime.toFixed(2) + ' seconds' + '\nTotal Time: ' + totalReactionTime.toFixed(2) + ' seconds');
  
  //refresh page
  window.location.reload();

}

function getAverageReactionTime(arr) {
  if (arr.length === 0) {
    return 0;
  }

  let sum = arr.reduce((total, currentValue) => total + currentValue, 0);

  let average = sum / arr.length;

  return average/1000;
}

function getTotalReactionTime(arr){
  let sum = arr.reduce((total, currentValue) => total + currentValue, 0);
    
  return sum/1000;
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

  renderer.render(scene, camera);
}

window.addEventListener('resize', onWindowResize, false);

