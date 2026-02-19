# 個人アウトプット・ダッシュボード システム要件定義書 (v4.0: GA4統合版)

## 1. プロジェクト概要

自身の技術発信（Zenn/Qiita）、OSS活動（GitHub/npm）、外部評価（Lapras）、および個人サイトのトラフィック（GA4）を一つの画面で集約・可視化する。
Next.jsとGCPのサーバーレス機能を活用し、低コストかつ高パフォーマンスな運用を目指す。

## 2. システムアーキテクチャ

* **Frontend/Backend:** Next.js (App Router)
  * Host: Cloud Run
  * Data Fetching: ISR (Incremental Static Regeneration) を活用しつつ、基本はFirestoreを参照。
* **Database:** Cloud Firestore
  * 各プラットフォームから取得した最新値と、グラフ表示用の履歴データを保存。
* **Batch Worker:** Cloud Run Job (Node.js)
  * 外部API（GA4/Zenn/Qiita/GitHub/npm/Lapras）を叩き、Firestoreを更新する役割。
* **Scheduler:** Cloud Scheduler (1日1回〜数回の定期実行)
* **Security:** Google Cloud Secret Manager
  * GA4サービスアカウントキー、Qiita/GitHubトークン等の管理。

---

## 3. 機能要件

### A. Webサイト解析 (GA4)

1. **リアルタイム/期間別ユーザー数:** サイト全体のユーザー数、セッション数。
2. **ページビュー (PV) ランキング:** 人気コンテンツの特定。
3. **流入元分析:** オーガニック検索、SNS、直接流入などの割合。

### B. OSS / npm 指標

1. **npmパッケージ統計:** 週間/累計ダウンロード数、バンドルサイズ(Minified/Gzipped)。
2. **依存関係の監視:** `package.json` の依存パッケージの現在/最新バージョンの比較。
3. **GitHub統計:** Star数、Fork数、Issue数。

### C. 技術記事指標 (Zenn/Qiita)

1. **Zenn:** 記事一覧、公開日、いいね数の表示（再帰的フェッチによる全件取得）。
2. **Qiita:** 記事ごとのView、いいね、ストック数。

### D. キャリア評価 (Lapras)

1. **Laprasスコア:** 技術力・ビジネス・影響力などのE-Score。
2. **ポートフォリオへの関心度:** アクセス推移。

---

## 4. 外部API連携仕様

| サービス | データソース / API | 取得方法・備考 |
| :--- | :--- | :--- |
| **GA4** | Google Analytics Data API | サービスアカウント認証。直近30日のデータを集計。 |
| **Lapras** | `https://lapras.com/public/luth.json` | JSONエンドポイントから直接取得。 |
| **Zenn** | `https://zenn.dev/api/articles?username=luth&order=latest` | `next_page` がなくなるまでループして取得。 |
| **Qiita** | Qiita API v2 | `/api/v2/items?query=user:ID` を使用。 |
| **npm** | npm Registry / Bundlephobia | バージョン、サイズ、ダウンロード数の取得。 |
| **GitHub** | GitHub GraphQL API | リポジトリ情報のメタデータを一括取得。 |

---

## 5. UI/UX 設計 (shadcn/ui コンポーネント)

* **Main Dashboard:**
  * `Card` + `Lucide Icons`: 各プラットフォームの主要KPIをトップに配置。
* **Analytics Tab:**
  * `Tabs` を使い、「GA4解析」「記事統計」「OSS統計」を切り替え。
* **Data Visualization:**
  * `Recharts`: PV推移やダウンロード推移の折れ線グラフ。
* **Management Table:**
  * `DataTable`: 依存パッケージのバージョン管理。最新版との差分を `Badge` で警告。

---

## 6. 非機能要件

* **認証:** 公開用ダッシュボードのためログイン制限なし（機密情報はAPI側で秘匿）。
* **パフォーマンス:** * GA4やGitHub APIはクォータやレートリミットがあるため、フロントエンドで直接叩かず、Firestoreに保存したデータを返す。
  * Next.jsのサーバーコンポーネントでFirestoreからデータをプリフェッチ。
* **拡張性:** 新たなプラットフォーム（例: Xのインプレッションなど）を追加しやすいよう、バッチ処理をモジュール化。

---

## 7. 実装ロードマップ

1. **Step 1:** Next.js + shadcn/ui で各APIの結果を表示するモック作成。
2. **Step 2:** Zenn (Pagination) / Lapras (JSON) / GA4 のフェッチロジック実装。
3. **Step 3:** Firestore スキーマ定義とバッチ処理の構築。
4. **Step 4:** Cloud Run / Cloud Scheduler へのデプロイ。
