# AINAN Final Device QA

Target: **iPhone Safari / installed PWA / 390×844 equivalent**

自動CIでは再現できない項目だけをここで確認する。

## First launch / migration
- [ ] 既存Save v1相当データから起動し、釣果・ポイント・施設が消えない
- [ ] Save v2追加項目（素材 / 竿Lv / アクセサリ / ボス / 図鑑報酬）が生成される
- [ ] 手動バックアップ → データ変更 → 復旧で元に戻る
- [ ] PWA再起動後もデータが維持される

## 390×844 layout
- [ ] Home: CTA / リソース / ガイド / Footerが重ならない
- [ ] Map: 3釣り場・日替わり環境表示・魚アイコンが読める
- [ ] Game: キャスト → 誘い → HIT → Battle → Resultが画面内に収まる
- [ ] Collection: 9魚種が3×3で表示され、最下段がFooterに隠れない
- [ ] Workshop: 竿3種とアクセサリ2種が操作できる
- [ ] Fish shop / diner: 店舗アート・食堂NPC・売却/料理UIが重ならない
- [ ] Boss: 3ボスカードがスクロール不要で確認できる
- [ ] Profile / Settings / Help: Footerと最下部情報が重ならない

## Final art
- [ ] サバ / イサキ / ヒラメ / カンパチがMap・図鑑・Resultで専用アートになる
- [ ] 魚屋 / 港食堂 / 食堂NPCが解放状態に応じて自然に表示される
- [ ] Result frame / primary button / harbor panelがコード描画と競合しない
- [ ] 既存5魚種と追加4魚種で線・彩度・影のテイストが大きくズレない

## Sound / haptics / motion
- [ ] 最初のユーザー操作後にSE/ambientが再生可能
- [ ] サウンドOFFでSEとambientが停止
- [ ] 振動OFFでHIT/釣果/町成長時に振動しない
- [ ] Reduced Motion ONで雨・水面光・レア魚オーラの常時アニメが減る
- [ ] Reduced Motion ONでもキャスト/HIT/バトル操作に支障がない

## Economy / progression
- [ ] 約1時間で最初の工房強化と町の序盤解放ができる
- [ ] 約3時間相当のテストデータでも町・竿・アクセサリを全完走できない
- [ ] 魚屋売却が強すぎて施設強化を即完走させない
- [ ] 料理3種がそれぞれ3セッション有効
- [ ] ボス報酬を受け取っても通常釣果の価値が残る

## Performance / regression
- [ ] 雨 + レア魚 + バトルでも目立つフレーム落ちがない
- [ ] シーン移動を20回程度繰り返してSE/ambientが多重再生しない
- [ ] Console error 0
- [ ] Title → Home → Map → Game → Result → Town → Shop → Workshop → Menu が正常
- [ ] CI / build が成功している
