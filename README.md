# sound escape — 夜間遺失物回収局

> **声を出さなければ進めない。声を出すほど、何かが近づいてくる。**

停電した深夜のホームセンターへ回収ロボットを投入し、**声で音波を出して暗闇を読み**、幽霊を避けながら忘れ物を入口まで持ち帰る、見下ろし型2Dの音波探索ホラー。マイクの「音量」だけを使う新感覚のソナー探索ゲームです。

URLを開いて数十秒でコア体験へ到達でき、**APIキー・DB・素材が一切無くても1プレイ完結**します（Mock + LocalStorage フォールバック）。

## 遊び方

| 操作 | 内容 |
|---|---|
| 声 / `Space` | 音波(Ping)を発射。波が当たった壁・棚・床・忘れ物が一時的に光る |
| `WASD` / 矢印 | 移動（声モードでは発声中だけ動ける） |
| `E` | 近くの忘れ物を回収 |
| `Shift` | ブースト（バッテリー消費） |
| `Esc` | 一時停止 |

大きな声ほど遠くまで見えるが、幽霊に発見されやすい。**忘れ物を回収して入口へ戻ればクリア。**

### モード

- **声モード**: マイクの音量で移動・探索する本来の体験。
- **手動モード**: マイク不要。疑似動力で移動し `Space` で手動Ping（スコア倍率は低め）。
- **DEMOモード** (`/?demo=1`): マイク許可不要・90秒の短縮マップ。審査・デモ向け。

## 技術スタック

- **Next.js 16 (App Router) + TypeScript + Tailwind CSS v4**
- **Canvas 2D** によるソナー描画（レイ・ウェーブハイブリッド方式）
- **Web Audio API**（RMS音量測定のみ。**音声は録音・保存・送信しません**）
- **LocalStorage**（標準）/ **Supabase**（任意・スコア記録）
- **OpenAI API**（任意・AI依頼文/結果コメント。未設定なら固定文）
- 画像は **gpt-image-2 (ChatGPT Image API)** で生成

## ローカル実行

```bash
npm install
npm run dev      # http://localhost:3000
```

環境変数は不要です（未設定でもフルプレイ可能）。AI・クラウド保存を有効化する場合は `.env.example` を参考に設定してください。

> ※ このリポジトリは Windows の非ASCIIパスでの Turbopack クラッシュを避けるため、`dev` / `build` を **Webpack** で実行する設定です（`--webpack`）。

## デプロイ（Vercel）

1. GitHub リポジトリを Vercel で **Import**（Next.js 自動検出）。
2. 必要に応じて Environment Variables を設定（任意）:
   - `OPENAI_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Supabase を使う場合は `supabase.sql` を SQL Editor で実行（RLSポリシー込み）。
4. 環境変数を後から追加したら **Redeploy** で反映。

## プライバシー

マイクは音量(RMS)の数値のみを端末内で利用します。音声の録音・ファイル化・外部送信・声紋/感情推定は一切行いません。
