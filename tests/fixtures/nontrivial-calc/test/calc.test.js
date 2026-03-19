const test = require('node:test');
const assert = require('node:assert/strict');

const { parseAndSum } = require('../src/calc');

test('parseAndSum sums comma-separated signed integers', () => {
  assert.equal(parseAndSum('10,-2,5'), 13);
  assert.equal(parseAndSum('-1,-1,-1'), -3);
});

test('parseAndSum tolerates extra whitespace around tokens', () => {
  assert.equal(parseAndSum(' 1, 2 ,   3 '), 6);
});

test('parseAndSum rejects malformed tokens with index context', () => {
  assert.throws(
    () => parseAndSum('1,foo,3'),
    /Invalid integer token at index 1: "foo"/
  );
});

test('parseAndSum rejects empty input', () => {
  assert.throws(() => parseAndSum(''), /Input must be a non-empty comma-separated string/);
});
