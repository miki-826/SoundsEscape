## UI Direction — sound escape

### Visual Concept
このアプリは「停電した深夜のホームセンターに投入した回収ロボットを、音波ソナーだけで遠隔操作する“夜間遺失物回収局”の管制ターミナル」のUIにする。潜水艦ソナー卓＋産業用ロボット遠隔端末＋CRTレーダーのネオ・レトロ計器。

### Avoid
紫青グラデの主役化 / ガラスカード多用 / 汎用AIチャット風 / 意味のない発光blob / SaaSダッシュボード / 「録音中」赤丸 / 画像への文字焼き込み。

### Layout
- 共通: 黒地のCRTスコープ。走査線・ビネット・四隅のビス留めベゼル。
- タイトル: 中央に大型エンブレム＋タイトル、下部に「回収を開始する」(primary) / 「手動モード」「遊び方」「DEMO」(secondary)。背景に薄く広がる音波。
- 依頼画面: 端末の「業務指示書」。依頼人・忘れ物・最終確認場所・危険度・報酬・ステージ名を計器ラベル調で。
- マイク設定: 入力音量メーター（横バー）＋ノイズフロア＋感度スライダー＋テストPing。「端末内で音量のみ測定」明記。
- プレイ: 左/中央 70〜80% に円形スコープCanvasのHUD、右に操作盤（耐久/バッテリー/騒音/警戒/時間/Ping CD）、下に状態ログ。
- 結果: 大型の成功/失敗、スコア・ランク・称号、回収物、計測値、AI風コメント、シード、再挑戦。

### Components
ScopeFrame(計器ベゼル) / GaugeBar(縦横メーター) / PrimaryAction(金属ボタン) / GhostBadge(エンブレム) / MissionSlip(指示書パネル) / StatusLog(ログ) / ResultPanel / Stat(計測値) / Slider(感度) / ScreenShell(走査線+ビネット背景)。

### Color
- Base `#04060A` / Panel `#0A1410`
- Accent(音波) `#39FF9E`
- Item(忘れ物) `#FFD34E`
- Danger(幽霊/危険) `#FF3D6E` 〜 `#B026FF`
- Text `#CFF7E0` / Muted `#7FAE98`

### Typography
- Title: Orbitron（計器見出し・タイトル・ランク）
- Body/Label: JetBrains Mono（数値・ラベル・ログ＝計器らしさ）
- 日本語本文: system-ui（自然な日本語マイクロコピー）

### Genre pattern
ui-patterns.md「レトロゲーム（アーケード機・スキャンライン）」＋「結果画面」を土台に、ソナー計器へ寄せる。
</content>
