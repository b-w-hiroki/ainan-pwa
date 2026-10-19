import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkDocumentationSync } from './check-documentation-sync.mjs';

test('documentation-only change passes without PR metadata', () => {
  assert.deepEqual(checkDocumentationSync(['docs/PRODUCT_SPEC.md'], ''), []);
});

test('product behavior change requires product spec', () => {
  const body = 'Docs impact: product\nDocs rationale: 釣り操作の振る舞いを更新したため仕様も更新する';
  assert.equal(checkDocumentationSync(['fishing-game/js/game/fish.js'], body).length, 1);
  assert.deepEqual(checkDocumentationSync(['fishing-game/js/game/fish.js', 'docs/PRODUCT_SPEC.md'], body), []);
});

test('architecture change requires technical design', () => {
  const body = 'Docs impact: both\nDocs rationale: 画面遷移と保存責務を変えるため両方を更新する';
  assert.equal(checkDocumentationSync(['src/App.tsx', 'docs/PRODUCT_SPEC.md'], body).length, 1);
  assert.deepEqual(checkDocumentationSync(['src/App.tsx', 'docs/PRODUCT_SPEC.md', 'docs/TECHNICAL_DESIGN.md'], body), []);
});

test('no-impact change needs concrete rationale', () => {
  assert.ok(checkDocumentationSync(['fishing-game/assets/foo.png'], 'Docs impact: none\nDocs rationale: 不要').length);
  assert.deepEqual(checkDocumentationSync(['fishing-game/assets/foo.png'], 'Docs impact: none\nDocs rationale: 既存素材の輪郭ノイズのみ修正し仕様と責務に変更なし'), []);
});

test('missing classification fails for code changes', () => {
  assert.ok(checkDocumentationSync(['vite.config.ts'], '').length >= 2);
});
