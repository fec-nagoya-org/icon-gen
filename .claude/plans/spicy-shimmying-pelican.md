# フロントエンドカンファレンス名古屋 アイコンジェネレーター

## Context

フロントエンドカンファレンス名古屋のSNSアイコン枠を生成するWebツールを作る。技育祭の同種ツール（https://geek.supporterz.jp/apps/icon-app/geeksai2025springのHTML）を参考に、以下の3機能を提供する。

1. ユーザーがローカル画像をアップロード（クリック or ドラッグ＆ドロップ）
2. 枠（`sns-icon.png`）に対してユーザー画像の位置・拡大率を調整
3. 枠を合成した画像をPNGとしてダウンロード

ホスティング先はGitHub Pages。ユーザーの回答により **プレーンHTML + JS** で実装し、ビルド工程なしで `main` ブランチのルートをそのまま配信する構成とする。枠PNGは現状中央が透過されていないが、同名ファイルで後日差し替える前提で、中央が透過されていれば下のユーザー画像が透けて見える設計にする。

## Architecture

- ビルド工程なし。`index.html` + `styles.css` + `app.js` + `assets/frame.png` の4ファイル構成
- Canvas 2D APIで「ユーザー画像 → 枠画像」の順にオフスクリーン描画し、合成結果を `canvas.toDataURL('image/png')` でダウンロードリンクに渡す
- 出力サイズはフレームPNGの固有サイズに合わせる（現状の `sns-icon.png` に合わせて正方形を想定。差し替えに備え、fixed値ではなく枠画像の `naturalWidth/Height` を使用）
- ドラッグで平行移動、ホイール／ピンチ／スライダーで拡大率を操作。モバイル対応のため Pointer Events API を使用
- Pages 配信は `main` ブランチのルートを Source に指定する運用（ユーザーが Repository 設定で有効化）

## ファイル構成

```
/
  index.html              # エントリ。セマンティックなマークアップ
  styles.css              # レイアウト・ボタン・ドロップゾーン
  app.js                  # Canvas合成・入力ハンドリング（ES Modules不使用、1ファイルで完結）
  assets/
    frame.png             # 既存 sns-icon.png を git mv で移動
  .nojekyll               # GitHub Pages の Jekyll 処理を無効化
  README.md               # 使い方・Pages 公開手順（ユーザー明示要求がなければ作成しない）
```

## 実装詳細

### `index.html`

- `<html lang="ja">`、`<meta name="viewport">`、OGP（タイトル・説明・画像として合成結果のサンプルは後回し）
- 構造:
  - ヘッダー: タイトル「フロントエンドカンファレンス名古屋 アイコンジェネレーター」
  - メイン:
    - ドロップゾーン兼ファイル入力（`<input type="file" accept="image/*">` と `<label>` で一体化）
    - `<canvas id="preview" width="400" height="400">`（フレーム画像読み込み後に実寸へ更新）
    - コントロール群
      - 拡大率スライダー `<input type="range" id="scale" min="0.1" max="3" step="0.01">`
      - 位置リセットボタン
      - 画像を選び直すボタン（ファイル入力を再トリガー）
      - ダウンロードボタン `<a id="download" download="fec-nagoya-icon.png">`
  - フッター: リンク（公式サイトは不明のためプレースホルダーをコメント化して残す）

### `app.js`

状態:
```js
const state = { userImage: null, offsetX: 0, offsetY: 0, scale: 1, frameImage: null };
```

主要関数（全てアロー関数、純粋に近い形で設計）:
- `loadFrame()`: `assets/frame.png` を `Image` でロードし、`state.frameImage` と canvas サイズを設定
- `loadUserFile(file)`: `FileReader` → `Image` → `state.userImage`、位置・スケールを初期化（枠にフィットするよう `cover` 相当で計算）、`render()`
- `render()`: canvas をクリア → ユーザー画像を `offset`・`scale` を反映して描画 → フレーム画像を同サイズで上書き描画
- `onPointerDown/Move/Up`: ドラッグで `offsetX/Y` を更新し `render()`
- `onWheel(e)`: カーソル位置を基準に `scale` を更新
- `onSliderInput(e)`: スライダー値で `scale` を更新
- `reset()`: 位置・スケールを初期値に戻す
- `download()`: `canvas.toBlob()` → `URL.createObjectURL` → `<a>.href` に設定して `click()`

ユーザー画像の初期スケール:
- `cover` 相当（`Math.max(canvasW/imgW, canvasH/imgH)`）でフィットさせ、中央寄せ

アクセシビリティ:
- ボタンに `aria-label`
- ドロップゾーンは `<label for="file-input">` で通常のクリック操作が成立
- キーボード: Tab 巡回可、スライダーで矢印キー操作可能

### `styles.css`

- レスポンシブ対応（`max-width: 480px` で縦並び）
- カラー: 現状不明なのでニュートラル（白背景＋アクセント青）。後でフロカン名古屋のブランドカラーに差し替え可能な CSS 変数 `--accent` を用意
- モバイル時に canvas が画面幅いっぱいになるよう `max-width: 100%`、`height: auto`

## 既存ファイルの扱い

- `sns-icon.png` → `assets/frame.png` に `git mv` で移動（rules/git.md 準拠）

## GitHub Pages 公開手順（実装後の運用メモ）

1. `main` ブランチへ push
2. GitHub リポジトリ Settings → Pages → Source を "Deploy from a branch"、Branch を `main` / `(root)` に設定
3. 数分後に `https://<user>.github.io/icon-gen/` で閲覧可能
4. `assets/frame.png` を差し替える場合も同名で push すればキャッシュ切れ次第反映（必要なら `?v=2` クエリ）

GitHub Actions によるデプロイは、ビルドが不要なので導入しない（シンプル優先）。

## 検証方法

1. `python3 -m http.server 8000` など任意の静的サーバで起動
2. ブラウザで `http://localhost:8000/` を開く
3. 画像アップロード（クリック・ドラッグ＆ドロップ両方）を確認
4. スライダー・ドラッグ操作で位置・スケールが変わり、枠が常に最前面に表示されることを確認
5. ダウンロードボタンで PNG が保存され、開くと合成済みであることを確認
6. モバイル（Chrome DevTools のデバイスエミュレーション）でタッチ操作・レイアウト崩れがないことを確認
7. `assets/frame.png` を中央透過済みのテスト画像と差し替え、下のユーザー画像が透けて見えることを確認

## 非スコープ（今回は作らない）

- 画像編集（回転・フィルタ等）
- 複数枠の切り替えUI（PNG 差し替え前提のシンプル運用）
- サーバーサイド処理（完全クライアント完結）
- テストコード（プレーンHTML + 手動検証で十分と判断、必要になれば Playwright 追加）
