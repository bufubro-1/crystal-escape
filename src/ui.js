import { createGame, step, TURN_LIMIT } from './game.js';
import { BOARD_SIZE, maps } from './maps.js';

const board = document.querySelector('#board');
const mapSelect = document.querySelector('#map');
const outputs = Object.fromEntries(
  [...document.querySelectorAll('output, #status')].map((element) => [element.id, element]),
);

const keys = new Map([
  ['arrowup', 'up'], ['w', 'up'],
  ['arrowdown', 'down'], ['s', 'down'],
  ['arrowleft', 'left'], ['a', 'left'],
  ['arrowright', 'right'], ['d', 'right'],
]);
const tileTypes = new Map([['#', 'Wall'], ['!', 'Hazard'], ['E', 'Exit'], ['S', 'Start']]);
let state;

function coordinates(row, col) {
  return `Row ${row + 1}, column ${col + 1}`;
}

function updateText(element, text) {
  if (element.textContent !== String(text)) element.textContent = text;
}

function render() {
  const { position, mapId, crystals, score, health, turn, status, reason } = state;
  const rows = maps[mapId].rows;
  for (let row = 0; row < rows.length; row++) {
    for (let col = 0; col < rows[row].length; col++) {
      const cell = board.children[row * rows[row].length + col];
      const playerHere = position.row === row && position.col === col;
      const crystalHere = crystals.some((crystal) => crystal.row === row && crystal.col === col);
      const tile = crystalHere ? 'Crystal' : tileTypes.get(rows[row][col]) ?? 'Empty';
      cell.className = `tile ${tile.toLowerCase()}${playerHere ? ' occupied' : ''}`;
      updateText(cell.firstElementChild, `${coordinates(row, col)}: ${tile}${playerHere ? ', player' : ''}`);
    }
  }

  updateText(outputs.position, coordinates(position.row, position.col));
  updateText(outputs.score, score);
  updateText(outputs.health, health);
  updateText(outputs.turns, TURN_LIMIT - turn);
  updateText(outputs.crystals, crystals.length);

  const messages = {
    active: 'Playing',
    won: 'You won. All crystals escaped!',
    lost: reason === 'health' ? 'You lost. No health remaining.' : 'You lost. No turns remaining.',
  };
  outputs.status.dataset.state = status;
  updateText(outputs.status, messages[status]);
}

function restart() {
  state = createGame(mapSelect.value);
  render();
}

for (const [id, { name }] of Object.entries(maps)) mapSelect.add(new Option(name, id));

for (let index = 0; index < BOARD_SIZE ** 2; index++) {
  const cell = document.createElement('li');
  const text = document.createElement('span');
  text.className = 'visually-hidden';
  cell.append(text);
  board.append(cell);
}

mapSelect.addEventListener('change', restart);
document.querySelector('#restart').addEventListener('click', restart);
window.addEventListener('keydown', (event) => {
  if (event.target === mapSelect || event.altKey || event.ctrlKey || event.metaKey) return;

  const key = event.key.toLowerCase();
  const direction = keys.get(key);
  if (!direction || state.status !== 'active') return;
  if (key.startsWith('arrow')) event.preventDefault();

  state = step(state, direction).state;
  render();
});

restart();
