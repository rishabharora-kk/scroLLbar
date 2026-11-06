import test from 'node:test';
import assert from 'node:assert/strict';
import { getMaxScroll,getThumbHeight,scrollToThumb,thumbToScroll,sectionProgress,snapTarget,exceedsBackThreshold } from '../src/math.mjs';

test('scroll / thumb roundtrip is absolute and preserves arbitrary grab offsets', () => {
  const viewport = 780, total = 14800, track = 756, max = getMaxScroll(total,viewport);
  const thumb = getThumbHeight(viewport,total,40,track);
  const travel = track - thumb;
  for (const offset of [0,1,100,5000,13999,max]) {
    const pos = scrollToThumb(offset,max,travel);
    for (const grab of [-12,0,thumb/2,thumb+12]) {
      assert.ok(Math.abs(thumbToScroll(12+pos+grab,grab,12,travel,max)-offset) < 1e-8);
    }
  }
});
test('proportional thumb never smaller than min; non-scrollable document is safe', () => {
  assert.equal(getThumbHeight(800,800,40,776),776);
  assert.equal(getThumbHeight(800,80000,40,776),40);
  assert.equal(thumbToScroll(100,20,0,0,0),0);
  assert.equal(scrollToThumb(100,0,0),0);
  assert.equal(getMaxScroll(700,800),0);
});
test('continuous section progress interpolates, remains inside same band, handles duplicates', () => {
  assert.deepEqual(sectionProgress([],300),{index:-1,progress:0});
  assert.deepEqual(sectionProgress([0,100,400],170,30),{index:1,progress:1+100/300});
  assert.equal(sectionProgress([0,100,400],400).index,2);
  assert.equal(sectionProgress([0,0,100],0).index,1);
  assert.ok(sectionProgress([0,100],99,0).progress < 1);
});
test('snap nearest heading within threshold, header offset, and no snap at end', () => {
  assert.equal(snapTarget([0,600,1200],550,2400,60),600);
  assert.equal(snapTarget([0,600,1200],505,2400,60),null);
  assert.equal(snapTarget([0,600,1200],548,2400,60,48),552);
  assert.equal(snapTarget([0,600,1200],2400,2400,60),null);
});
test('back threshold strict greater than 1.5 viewports', () => {
  assert.equal(exceedsBackThreshold(0,1170,780),false);
  assert.equal(exceedsBackThreshold(0,1171,780),true);
  assert.equal(exceedsBackThreshold(1500,200,780),true);
});
