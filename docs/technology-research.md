# technology-research.md — 採用技術と調査メモ

実行日: 2026-06-22 / 対象: sound escape（音波探索ホラー回収ゲーム）

## 採用スタック

| 領域 | 採用 | 理由 / 代替 |
|---|---|---|
| フレームワーク | Next.js 16 App Router + TS + Tailwind v4 | Skill必須スタック。Vercel最適。 |
| 描画 | Canvas 2D（rAF） | MVPに十分・低依存。完成版はWebGL/WebGPU FDTDへ拡張可能（要件§9.2）。PixiJS/Phaserは不採用（オーバースペック）。 |
| 音入力 | Web Audio API `AnalyserNode` の time-domain RMS | 録音・送信不要で要件のプライバシー方針に合致。`getUserMedia({autoGainControl:false})` で素の音量を測定。 |
| 効果音 | Web Audio 合成（OscillatorNode/Noise） | SEファイル不要＝ゼロ・インフラ依存。 |
| 永続化 | LocalStorage（標準）+ Supabase（任意） | 未設定でも動く分岐を実装（要件§22, deploy.md）。 |
| AIテキスト | OpenAI `gpt-4o-mini`（任意・サーバー側） | 依頼文/結果コメントのみ。失敗・未設定時は固定文へフォールバック（要件§21）。音声は送らない。 |
| 画像生成 | OpenAI `gpt-image-2`（quality=medium） | ユーザー指定（ChatGPT API）。10枚生成。 |

## 音波方式の判断（要件§9.3）

3時間MVP想定のため **物理近似型レイ・ウェーブハイブリッド** を採用。
- 360度に120本のレイを発射し、壁/棚の法線で反射（最大2回）、距離・反射・材質で減衰。
- 反射軸は移動前後の衝突セルから判定（`r = d - 2(d·n)n` の軸整列近似）。
- 描画は各レイのポリラインを波面半径でサンプリングし「欠けながら広がる円」を表現。
- 完成版の2D FDTD（WebGL/WebGPU ping-pong）へ置換できる構造を保持。

## モデル名・仕様の確認方針

OpenAIのモデル名（`gpt-image-2` / `gpt-4o-mini`）とパラメータ（`quality=medium`、Chat Completions `response_format: json_object`）は実装時点の公式仕様に準拠。料金はgpt-image-2 medium が概ね $0.01〜0.04/枚。AIテキストは任意機能のため障害時もゲームは継続。
