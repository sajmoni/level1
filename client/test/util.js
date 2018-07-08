import * as Util from '../src/Util';

describe('Util.getRandomInRange()', () => {
  context('with a range of random integers', () => {
    it('always returns a random integer between those numbers', () => {
      const randomRanges = [
        { from: 500, to: 1200 },
        { from: 100, to: 2000 },
        { from: 450, to: 550 },
        { from: 213, to: 301 },
        { from: 0, to: 10000 },
      ];

      randomRanges.forEach(r => {
        const { from, to } = r;
        const result = Util.getRandomInRange(from, to);
        expect(result).to.satisfy(res => res > from && res < to);
      });
    });
  });
});

describe('Util.grid()', () => {
  // TODO
});

describe('Util.distance()', () => {
  // TODO
});

describe('Util.angle()', () => {
  // TODO
});
