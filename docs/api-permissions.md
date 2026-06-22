# api-permissions.md — 外部API利用と許可状態

ユーザー確認（AskUserQuestion, 2026-06-22）の結果に基づく。

| API | 用途 | 送信データ | 環境変数 | 課金 | 状態 |
|---|---|---|---|---|---|
| OpenAI gpt-image-2 | UI画像生成（開発時のみ） | 英語プロンプト（テキスト） | `OPENAI_API_KEY` | あり（許可済み・最大10枚） | **APPROVED**：10枚生成済み |
| OpenAI gpt-4o-mini | 依頼文/結果コメント（任意） | ゲーム結果の数値・選択のみ | `OPENAI_API_KEY` | あり（軽量・任意） | **APPROVED**：未設定/失敗時は固定文へフォールバック |
| Supabase | スコア記録（任意） | 名前/スコア/ランク等の数値 | `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 無料枠 | **APPROVED**：実装済み・未設定なら LocalStorage |

## 厳守事項

- **音声データ（録音・ファイル・波形）は一切送信しない**。AIへ渡すのは結果の数値と成否・ランクのみ（要件§21, §26）。
- `OPENAI_API_KEY` はサーバー側（`app/api/*`）でのみ使用。クライアントへ露出しない。
- 画像生成は開発時のローカル実行のみ。生成済みPNGは `public/` に静的配置され、実行時にAPIキーは不要。
- API keyの値は質問・表示・保存しない。`.env*` はコミットしない。
