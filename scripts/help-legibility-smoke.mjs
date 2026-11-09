import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const s=readFileSync(new URL('../fishing-game/js/scenes/HelpScene.js',import.meta.url),'utf8');
for (const token of ["this._narrowHelp ? '12px' : '10px'","this._narrowHelp ? '12px' : '8px'","this._narrowHelp ? '13px' : '11px'",'const contentBottom = 1022','this._narrowHelp ? 464 : 284','this._narrowHelp ? 90 : 50','this._narrowHelp ? 84 : 44']) assert.ok(s.includes(token), token);
assert.ok(s.includes('useAdvancedWrap: true'), 'Japanese descriptions must wrap long words at every width');
assert.ok(s.includes('this._narrowHelp ? y + 56 : y + 31'), 'normal descriptions must clear titles after wrapping');
assert.equal(558+464,1022,'scroll bound must include full panel');
assert.ok(48+3*90+84<464-20,'last row must clear footer note');
console.log('compact help typography and layout-source contract passed (not browser QA)');
