import test from 'node:test';
import assert from 'node:assert/strict';
import { thumbGeometry, pointerToOffset, offsetToThumb, nearestLandmark, targetScroll, shouldShowBack, isCancelled, trialOrigin } from '../experiments/recognition/math.mjs';

test('thumb scales proportionally and never shrinks below minimum', () => {
  assert.deepEqual(thumbGeometry(1000, 4000, 600), { maxScroll:3000, thumbHeight:150, travel:450 });
  assert.equal(thumbGeometry(1000, 100000, 600).thumbHeight,40);
  assert.equal(thumbGeometry(1000, 1000, 600).maxScroll,0);
});
test('preserve grab offset on pointerdown and map full range', () => {
  const {travel,maxScroll}=thumbGeometry(800,4800,500);
  const start=1550, top=85, y=offsetToThumb(start,travel,maxScroll);
  const grab=top+y+17-top-y;
  assert.equal(pointerToOffset(top+y+17,grab,top,travel,maxScroll),start);
  assert.equal(pointerToOffset(-100,grab,top,travel,maxScroll),0);
  assert.equal(pointerToOffset(9999,grab,top,travel,maxScroll),maxScroll);
});
test('nearest landmark uses document position not duplicated section title', () => {
  const list=[{top:100,id:0},{top:550,id:1},{top:1200,id:2}];
  assert.equal(nearestLandmark(list,750).id,1);
  assert.equal(nearestLandmark(list,880).id,2);
  assert.equal(nearestLandmark(list,-10).id,0);
  assert.equal(nearestLandmark([],500),null);
});
test('sticky offset and end clamp', () => {
  assert.equal(targetScroll(380,72,1000),298);
  assert.equal(targetScroll(55,72,1000),0);
  assert.equal(targetScroll(4000,72,1000),1000);
});
test('back appears only after distance strictly exceeds threshold', () => {
  assert.equal(shouldShowBack(0,1200,800),false);
  assert.equal(shouldShowBack(0,1201,800),true);
});
test('horizontal cancellation uses distance from physical edge for RTL and LTR', () => {
  assert.equal(isCancelled(200,390,150),true);
  assert.equal(isCancelled(280,390,150),false);
  assert.equal(isCancelled(180,390,150,true),true);
  assert.equal(isCancelled(80,390,150,true),false);
});
test('task origin is far from remembered target',()=>{
  assert.equal(trialOrigin(200,10000),8300);
  assert.equal(trialOrigin(8000,10000),700);
  assert.equal(trialOrigin(100,0),0);
});
