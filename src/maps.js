export const BOARD_SIZE = 8;

const fixtures = {
  quarry: ['Quarry', [
    'SC.C.C.E',
    '!#......',
    '..##.#..',
    '.#..!...',
    '...#..#.',
    '.!....#.',
    '..##....',
    '........',
  ]],
  crossing: ['Crossing', [
    'S.#..C..',
    '..#..#..',
    '.C...#..',
    '##!.##..',
    '....C...',
    '.#.!..#.',
    '...##...',
    '......E.',
  ]],
  grotto: ['Grotto', [
    '..#....E',
    '.C#.!...',
    '..#..#C.',
    '....##..',
    '.#!.....',
    '.#..#.#.',
    'SC..#...',
    '...#....',
  ]],
  ridge: ['Ridge', [
    '.C..#..S',
    '....#...',
    '.#!..C#.',
    '....#...',
    '###.##..',
    'C.....!.',
    '.#..#...',
    '...E....',
  ]],
  spring: ['Spring', [
    '...#..C.',
    '.C.#.#..',
    '..!.S...',
    '#....##.',
    '....!...',
    '.#..#..C',
    '.E.....#',
    '...#....',
  ]],
  vault: ['Vault', [
    'E..#..C.',
    '##.#.!..',
    '...C.##.',
    '.!#.....',
    '....##..',
    '.##....C',
    '....!#..',
    'S.......',
  ]],
};

export const maps = Object.freeze(Object.fromEntries(
  Object.entries(fixtures).map(([id, [name, rows]]) => [
    id, Object.freeze({ name, rows: Object.freeze(rows) }),
  ]),
));

export function validateMap(rows) {
  if (!Array.isArray(rows) || rows.length !== BOARD_SIZE ||
      rows.some((row) => typeof row !== 'string' || !/^[SEC#!.]{8}$/.test(row))) {
    throw new Error('Invalid map: expected an 8 × 8 grid of supported tiles');
  }

  const tiles = rows.join('');
  for (const [tile, count] of [['S', 1], ['E', 1], ['C', 3]]) {
    if (tiles.split(tile).length - 1 !== count) {
      throw new Error(`Invalid map: expected ${count} ${tile} tile(s)`);
    }
  }
  if (!tiles.includes('#') || !tiles.includes('!')) {
    throw new Error('Invalid map: expected at least one wall and one hazard');
  }
}
