import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';

//define constants
const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;
const MOUSE_SENSITIVITY = Math.PI * 0.1
const JOYSTICK_SENSITIVITY = Math.PI * 0.002;
const ROOM_SIZE = 1000;
const PLAYER = {height: 1.5, turnSpeed: MOUSE_SENSITIVITY, canShoot: false}
const PLAYER_POV = 80
//how many times game 'repeats'- game is repeated when all targets in targetPositions are destroyed
const NUM_GAMELOOP = 5

//1 for now because I have a keyboard connected else 0
const GAMEPAD_INDEX = 1;
// shoot button =  RT
const SHOOT_BUTTON = 0;
const X_AXIS = 0;
const Y_AXIS = 1

//CONFIG: Horizontal
const targetPositions = [
  { x: -5, y: 3, z: 3 },
  { x: 0, y: 3, z: 3 },
  { x: 5, y: 3, z: 3 },
];


// //CONFIG: Vertical
// const targetPositions =[
//   { x: 0, y: 7, z: 3},
//   { x: 0, y: 3, z: 3},
// ];


// //CONFIG: Z-shaped
// const targetPositions =[
//   { x: -3, y: 7, z: 3},
//   { x: 3, y: 3, z: 3}, 
//   { x: -3, y: 3, z: 3},
//   { x: 3, y: 7, z: 3},
// ];

// //CONFIG: Box
// const targetPositions =[
//   { x: -3, y: 7, z: 3},
//   { x: -3, y: 3, z: 3}, 
//   { x: 3, y: 3, z: 3},
//   { x: 3, y: 7, z: 3},
// ];

// //CONFIG: Differing Sizes Z
// const targetPositions =[
//   { x: -3, y: 7, z: 3},
//   { x: 3, y: 3, z: 10}, 
//   { x: -3, y: 3, z: 3},
//   { x: 3, y: 7, z: 10},
// ];

const blocker = document.getElementById('blocker');
const instructions = document.getElementById('instructions');

const havePointerLock = 'pointerLockElement' in document || 'mozPointerLockElement' in document || 'webkitPointerLockElement' in document;

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
var move_counter = 0;
var move_dir = 1;

function lockCursor() {
  if (havePointerLock) {
    const element = document.body;
    const pointerlockchange = function () {
      if (document.pointerLockElement === element || document.mozPointerLockElement === element
            || document.webkitPointerLockElement === element) {
        controls.enabled = true;
        blocker.style.display = 'none';
        document.addEventListener('mousedown', onMouseDown);
        window.addEventListener('gamepadconnected', onGamepadConnected);
        window.addEventListener('gyroconnected', onGyroConnected);
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

    //TODO: add condition here when any button in gamepad is clicked
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
    new THREE.MeshBasicMaterial({ color: 0xAFEEEE }),
  );
  wall1.position.y -= 1;
  wall1.position.z += 20;
  scene.add(wall1);

  let wall2 = new THREE.Mesh(
    new THREE.BoxGeometry(20, 40, ROOM_SIZE),
    new THREE.MeshBasicMaterial({ color: 0xAFEEEE }),
  );
  wall2.position.y -= 1;
  wall2.position.x += 30;
  scene.add(wall2);

  let wall3 = new THREE.Mesh(
    new THREE.BoxGeometry(20, 40, ROOM_SIZE),
    new THREE.MeshBasicMaterial({ color: 0xAFEEEE }),
  );
  wall3.position.y -= 1;
  wall3.position.x -= 30;
  scene.add(wall3);

  let wall4 = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM_SIZE, 40, 20),
    new THREE.MeshBasicMaterial({ color: 0xAFEEEE }),
  );
  wall4.position.y -= 1;
  wall4.position.z -= 40;
  scene.add(wall4);

  let ceiling = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM_SIZE, 1, ROOM_SIZE),
    new THREE.MeshBasicMaterial({ color: 0x00FFFF }),
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
  if (event.type === 'mousedown' && event.button === 0) { // Left mouse button clicked
    shoot(event);
  }
}

function onGamepadConnected(event){
  gamepadLoop();
}

function onGyroConnected(event){
  gyroLoop();
}


let isShootButtonPressed = false;
const deadZone = 0.2; // Adjust this value as needed

function gyroLoop(){

  const SerialPort = require('serialport');
  const Readline = require('@serialport/parser-readline');

  let prevX = null; // Initialize prevX and prevY as null initially
  let prevY = null;

  const port = new SerialPort('COM3', { baudRate: 9600 });
  const parser = port.pipe(new Readline({ delimiter: '\n' }));

  parser.on('data', (data) => {
    // Parse the received data as X and Y values (assuming they are separated by a space)
    const [x, y, z] = data.split(' ').map(Number);
  
    // If prevX and prevY are null, set them to the initial values
    if (prevX === null || prevY === null) {
      prevX = x;
      prevY = y;
      return; // Skip further processing for the first data point
    }
  
    // Compute the change in X and Y
    const deltaX = x - prevX;
    const deltaY = y - prevY;
  
    // Update previous X and Y values
    prevX = x;
    prevY = y;
  
    console.log('Change in X:', deltaX, 'Change in Y:', deltaY);
    // Now you can use deltaX and deltaY as needed in your application
  });

  // Create quaternions for rotation
  const quaternionUpDown = new THREE.Quaternion();
  const quaternionLeftRight = new THREE.Quaternion();

  if (deltaY >= deadZone || deltaY <= -deadZone) {
    // Adjust rotation around the x-axis (up and down movement)
    quaternionUpDown.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -deltaY * JOYSTICK_SENSITIVITY);
  } else {
    quaternionUpDown.set(0, 0, 0, 1); // Identity quaternion if no input
  }

  if (deltaX >= deadZone || deltaX <= -deadZone) {
    // Adjust rotation around the y-axis (left and right movement)
    quaternionLeftRight.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -deltaX * JOYSTICK_SENSITIVITY);
  } else {
    quaternionLeftRight.set(0, 0, 0, 1); // Identity quaternion if no input
  }

  // Combine rotations
  const combinedQuaternion = quaternionUpDown.multiply(quaternionLeftRight);

  // Apply rotation to the camera
  controls.getObject().quaternion.multiply(combinedQuaternion).normalize();

  requestAnimationFrame(gyroLoop);
}


function gamepadLoop(){
  const gamepad = navigator.getGamepads()[GAMEPAD_INDEX];
  const upDown = gamepad.axes[1]
  const leftRight = gamepad.axes[0]

  // Need to do this to avoid multiple registers of one button press/hold
  if (gamepad.buttons[SHOOT_BUTTON].value === 1 && !isShootButtonPressed) {
    shoot();
    isShootButtonPressed = true;
  } else if (gamepad.buttons[SHOOT_BUTTON].value === 0) {
    isShootButtonPressed = false;
  }

  //  if(upDown >= deadZone){
  //   console.log('Down pressed!')
  //   controls.getObject().rotation.x += JOYSTICK_SENSITIVITY 
  // }
  // else if(upDown <= -deadZone){
  //   console.log('Up pressed!')
  //   controls.getObject().rotation.x -= JOYSTICK_SENSITIVITY 
  // }

  // if(leftRight >= deadZone) {
  //   console.log('Right pressed!')
  //   controls.getObject().rotation.y += JOYSTICK_SENSITIVITY 
  // }
  // else if (leftRight <= -deadZone) {
  //   console.log('Left pressed!')
  //   controls.getObject().rotation.y -= JOYSTICK_SENSITIVITY 
  // }

  // Create quaternions for rotation
  const quaternionUpDown = new THREE.Quaternion();
  const quaternionLeftRight = new THREE.Quaternion();

  if (upDown >= deadZone || upDown <= -deadZone) {
    // Adjust rotation around the x-axis (up and down movement)
    quaternionUpDown.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -upDown * JOYSTICK_SENSITIVITY);
  } else {
    quaternionUpDown.set(0, 0, 0, 1); // Identity quaternion if no input
  }

  if (leftRight >= deadZone || leftRight <= -deadZone) {
    // Adjust rotation around the y-axis (left and right movement)
    quaternionLeftRight.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -leftRight * JOYSTICK_SENSITIVITY);
  } else {
    quaternionLeftRight.set(0, 0, 0, 1); // Identity quaternion if no input
  }

  // Combine rotations
  const combinedQuaternion = quaternionUpDown.multiply(quaternionLeftRight);

  // Apply rotation to the camera
  controls.getObject().quaternion.multiply(combinedQuaternion).normalize();

 



  requestAnimationFrame(gamepadLoop);
}


function shoot(event) {
  // Create a raycaster
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera({ x: 0, y: 0 }, camera);
  console.log('pew')
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

  // Prepare files
  let reactionTimeCSV = reactionTime.join('\n');
  let statisticsCSV = 'Accuracy,Total Reaction Time,Average Reaction Time\n' +
                      accuracy + ',' +
                      totalReactionTime + ',' +
                      averageReactionTime;

  // Export CSV files
  exportToCSV(reactionTimeCSV, 'reaction_times.csv');
  exportToCSV(statisticsCSV, 'game_statistics.csv');

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

function exportToCSV(data, filename) {
  let csvContent = 'data:text/csv;charset=utf-8,' + data;
  let encodedUri = encodeURI(csvContent);
  let link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click(); 
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


  // //CONFIG: Moving Target Horizontal
  // if(move_counter <= 2 && move_dir){
  //   move_dir = 1;
  //   target.position.x += 0.05;
  //   move_counter += 0.05;
  // }
  // else 
  //   move_dir = 0;
  
  // if(move_counter >= -2 && !move_dir)
  // {
  //   move_dir = 0;
  //   target.position.x -= 0.05;
  //   move_counter -= 0.05;
  // }
  // else
  //   move_dir = 1;

  //CONFIG: Moving Target Vertical
  if(move_counter <= 1 && move_dir){
    move_dir = 1;
    target.position.y += 0.05;
    move_counter += 0.05;
  }
  else 
    move_dir = 0;
  
  if(move_counter >= -1 && !move_dir)
  {
    move_dir = 0;
    target.position.y -= 0.05;
    move_counter -= 0.05;
  }
  else
    move_dir = 1;

  renderer.render(scene, camera);
}

window.addEventListener('resize', onWindowResize, false);

