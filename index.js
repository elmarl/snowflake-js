"use strict";

var input, canvas, ctx, grid;
let pause = false;
let time = 0;
let ms = 700;
// t1 t2 s1 s2 b1 b2
// 0 0   0 0   0 0
//
var states = [
  //1 single
  { ptrn: 0b000001, pF: 1, pM: 0 },
  //2 two next to each other
  { ptrn: 0b000011, pF: 0, pM: 0.7 },
  //3 two next to each other with 1 empty in between
  { ptrn: 0b100100, pF: 0.6, pM: 0.5 },
  //4 three next to each other
  { ptrn: 0b110100, pF: 0, pM: 0.7 },
  //5 2 opposite sides
  { ptrn: 0b001100, pF: 0.3, pM: 0.7 },
  //6 three with one separated by 1 empty spot
  { ptrn: 0b001101, pF: 0.15, pM: 0.5 },
  { ptrn: 0b001110, pF: 0.15, pM: 0.5 }, // mirror
  //7 4 next to each other
  { ptrn: 0b001111, pF: 0, pM: 0.3 },
  //8 every other node
  { ptrn: 0b011001, pF: 0.2, pM: 0.5 },
  //9 4 with a 5 one separated from either side
  { ptrn: 0b011011, pF: 0, pM: 0.3 },
  //10 2 empty nodes on opposite sides
  { ptrn: 0b011110, pF: 0.2, pM: 0.2 },
  //11 5 nodes
  { ptrn: 0b011111, pF: 0, pM: 0.1 },
  //12 all nodes
  { ptrn: 0b111111, pF: 0.8, pM: 0 },
];

const pi = Math.PI;
const empty = "#888";
const full = "#fff";
//frozen 1, melt 0

const sin = Math.sin;
const cos = Math.cos;

function floor(x) {
  return Math.floor(x);
}
function ceil(x) {
  return Math.ceil(x);
}
function sqrt(x) {
  return Math.sqrt(x);
}

const log = console.log.bind(console);

function cyrb53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed,
    h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const a = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return a / 9007199254740991;
}

/**
 * no bytes in js, use array instead
 * @param {array} arr byte to right shift
 */
function shiftArrayToRight(arr) {
  arr.unshift(arr.pop());
}
function rotateHexagon(hex) {
  let newHex = [0, 0, 0, 0, 0, 0];
  // top
  newHex[1] = hex[0];
  newHex[3] = hex[1];
  // sides
  newHex[0] = hex[2];
  newHex[5] = hex[3];
  // bottom
  newHex[2] = hex[4];
  newHex[4] = hex[5];
  return newHex;
}

function toInt(arr) {
  return parseInt(arr.join(""), 2);
}

// pFreeze and pMelt cases
/**
 * 1-12, from top left to bottom right
 *
 * _0-0_    _0-0_   _0-0_   _0-0_   000001, 000011, 000101, 000111
 * *-?-0    *-?-0   *-?-0   *-?-0
 * _0-0_    _*-0_   _0-*_   _*-*_
 *
 * _0-0_    _0-0_   _0-0_   _0-*_   001001, 001011 or 0001101, 001111, 010101
 * *-?-*    *-?-*   *-?-*   *-?-0
 * _0-0_    _*-0_   _*-*_   _0-*_
 *
 * _0-*_    _0-*_   _0-*_   _*-*_   010111 or 011101, 011011 or 101101, 011111, 111111
 * *-?-0    *-?-*   *-?-*   *-?-*
 * _*-*_    _*-0_   _*-*_   _*-*_
 *
 */

/**
 * configuration parameters. Constants
 */
const config = {
  r: 4, // hexagon radius, pixels (float)
  a: Math.PI / 3, // angle between corners measured from the center of a hexagon, radians (float)
  h: 85, // grid height, units (int)
  w: 85, // grid width by short side, units (int)
};
config.d = config.r * 2; // hexagon diameter, pixels (float)
config.s = (config.r * sqrt(3)) / 2;
Object.freeze(config);

grid = Array(sizeOfGrid(config.w, config.h)).fill(0);
grid[floor(sizeOfGrid(config.w, config.h) / 2)] = 1;

function sizeOfGrid(w, h) {
  return floor(h / 2) * (w + 1) + ceil(h / 2) * w;
}

window.onload = () => {
  canvas = document.getElementById("c");
  input = document.getElementById("i");
  input.addEventListener("click", (e) => {
    const val = e.target.value;
    pause = !pause;
  });
  ctx = canvas.getContext("2d");
  loop();
};

function loop() {
  setInterval(() => {
    if (!pause) {
      draw();
      calcNext();
    }
  }, ms);
}

/**
 * top left
 * top right
 * left
 * right
 * bottom left
 * bottom right
 */
function calcNext() {
  let newGrid = JSON.parse(JSON.stringify(grid));
  const randomVar = cyrb53(time.toString()); //Math.random(); //cyrb53(time.toString());

  for (let index = 0; index < grid.length; index++) {
    let counter = [0, 0, 0, 0, 0, 0];
    if (index - config.w - 1) {
      if (grid[index - config.w - 1]) counter[0] = 1;
    }
    if (index - config.w) {
      if (grid[index - config.w]) counter[1] = 1;
    }
    if (index - 1) {
      if (grid[index - 1]) counter[2] = 1;
    }
    if (index + 1) {
      if (grid[index + 1]) counter[3] = 1;
    }
    if (index + config.w) {
      if (grid[index + config.w]) counter[4] = 1;
    }
    if (index + config.w + 1) {
      if (grid[index + config.w + 1]) counter[5] = 1;
    }
    let state = null;
    for (let i = 0; i < 7; i++) {
      const ans = toInt(counter);
      const m = states.find((f) => f.ptrn == ans);
      if (m) {
        state = m;
        break;
      } else {
        counter = rotateHexagon(counter);
      }
    }
    if (!state) {
      continue;
    }
    if (grid[index] == 1) {
      if (randomVar < state.pM) newGrid[index] = 0;
    } else {
      if (randomVar < state.pF) newGrid[index] = 1;
    }
    time++;
  }
  grid = newGrid;
}

/**
 * draw grid of hexagons
 */
function draw() {
  try {
    const xOffset = config.s * 2 + 1;
    const yOffset = config.r + 1;
    const v1 = {
      x: cos((2 * pi) / 3) * -2 * config.s,
      y: sin((2 * pi) / 3) * 2 * config.s,
    };
    const v2 = {
      x: -1 * v1.x,
      y: v1.y,
    };
    let shortSide = true; // start from the short side, alternate between long and short
    let offsetVec = { x: 0, y: 0 };
    for (let i = 0, index = 0; i < config.h; i++) {
      const maxWidthIndex = shortSide ? config.w : config.w + 1;
      for (let j = 0; j < maxWidthIndex; j++, index++) {
        drawHexagon(
          xOffset + j * config.r * cos(pi / 6) * 2 + offsetVec.x,
          yOffset + offsetVec.y,
          grid[index] === 0 ? empty : full
        );
      }
      if (shortSide) {
        offsetVec.x += v2.x;
        offsetVec.y += v2.y;
      } else {
        offsetVec.x += v1.x;
        offsetVec.y += v1.y;
      }
      shortSide = !shortSide;
    }
  } catch (e) {
    log(e);
  }
}

/**
 * draw hexagon at coordinates x, y
 * @param {float} x
 * @param {float} y
 * @param {string} fill
 */
function drawHexagon(x, y, fill) {
  ctx.strokeStyle = fill;
  ctx.fillStyle = fill;
  ctx.beginPath();
  const a = config.a;
  const r = config.r;
  for (var i = 0; i < 6; i++) {
    ctx.lineTo(
      x + r * Math.cos(a * i + pi / 2),
      y + r * Math.sin(a * i + pi / 2)
    );
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}
