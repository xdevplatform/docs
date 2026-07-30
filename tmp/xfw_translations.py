import os

# Map: source relative path (from x-for-websites/) -> (dst path in ja/x-for-websites/, new frontmatter text)
FILES = {
    "direct-message-button.mdx": '''---
title: Direct Message ボタン
sidebarTitle: Direct Message ボタン
description: あなたの X アカウントと訪問者が直接会話を開始できる Direct Message ボタンをウェブサイトに追加します。セットアップとカスタマイズオプションを含みます。
---
''',
    "oembed-api.mdx": '''---
title: oEmbed API
description: "oEmbed API を使うと、Tweet やタイムラインなどの埋め込みコンテンツをプログラム的に返せます。oEmbed API のレスポンスは HTML を返します。"
mode: wide
keywords: ["oEmbed", "oEmbed API", "embed API", "embed tweets", "embed content", "oEmbed format", "embed HTML"]
---
''',
    "supported-languages.mdx": '''---
title: サポート対象言語とブラウザー
sidebarTitle: サポート対象言語とブラウザー
description: X for Websites ウィジェットがサポートする言語およびブラウザー。ロケールコード、言語フォールバック、最低サポートブラウザーバージョンを含みます。
---
''',
    "tools-and-libraries.mdx": '''---
title: ツールとライブラリ
mode: wide
description: X for Websites の埋め込みおよびウィジェットをサイトに追加するためのツール、ライブラリ、プラグイン(WordPress、CMS 統合を含む)。
keywords: ["X for Websites tools", "embed tools", "website tools", "embed libraries", "website integration tools", "embed SDK"]
---
''',
    "webpage-properties.mdx": '''---
title: X ウィジェットのウェブページプロパティ
sidebarTitle: ウェブページプロパティ
description: meta および link 要素を使ってサイト全体で X ウィジェットのデフォルトを構成します。dnt、lang、in-reply-to、その他ウェブページレベルのウィジェットプロパティを含みます。
---
''',
    "embedded-posts/faq.mdx": '''---
title: よくある質問
sidebarTitle: FAQ
description: "埋め込み投稿は 2 つの部分から構成されます: Post 情報を含む要素と、X サーバーから読み込まれる JavaScript ファイル。それらが完全にレンダリングされた Post に変換されます。"
---
''',
    "embedded-posts/overview.mdx": '''---
title: 埋め込み投稿
description: "HTML マークアップ、oEmbed API、または JavaScript factory function を使って、テーマ、配置、メディア表示のオプションを備えた個々の投稿をサイトに埋め込みます。"
sidebarTitle: 概要
---
''',
    "follow-button/faqs-follow-button.mdx": '''---
title: よくある質問
description: "X Follow ボタンに関するよくある質問。寸法、サイズ変更の挙動、screen_name の扱い、フォロワー数の表示オプションをカバーします。"
sidebarTitle: FAQ
---
''',
    "follow-button/overview.mdx": '''---
title: Follow ボタン
description: "HTML マークアップまたは publish.x.com を使ってウェブサイトに X Follow ボタンを追加し、サイズやスクリーンネームの表示をカスタマイズし、widgets.js で読み込みます。"
sidebarTitle: Follow ボタン
---
''',
    "javascript-api/overview.mdx": '''---
title: X for Websites の JavaScript インターフェース
sidebarTitle: 概要
description: "動的なウィジェット読み込みとイベントで、埋め込み投稿、タイムライン、Web Intent をサイト上で強化する、X for Websites の JavaScript API の概要。"
---
''',
    "log-in-with-x/overview.mdx": '''---
title: X でサインイン
description: "OAuth を使って、ウェブサイトやモバイル・デスクトップアプリでユーザーが登録・認証し、X API へワンクリックでアクセスできる「X でサインイン」ボタンを追加します。"
sidebarTitle: 概要
---
''',
    "post-button/faq.mdx": '''---
title: よくある質問
description: "X Post ボタンに関するよくある質問。サポート言語、寸法、1 ページ上の複数ボタン、HTTPS、関連アカウントをカバーします。"
sidebarTitle: FAQ
---
''',
    "post-button/overview.mdx": '''---
title: Post ボタン
description: "HTML マークアップと widgets.js でウェブサイトに Post ボタンを追加し、プリセットのテキスト、ハッシュタグ、via アトリビューション付きで X 上でのシェアを訪問者に促します。"
sidebarTitle: Post ボタン
---
''',
    "timelines/overview.mdx": '''---
title: 埋め込みタイムライン
description: "X のプロフィールおよびリストタイムラインをウェブサイトに埋め込みます。サイズ、カスタムクローム、テーマ、投稿数の上限、publish.x.com のマークアップジェネレーターによる簡単なセットアップに対応します。"
sidebarTitle: 概要
---
''',
    "web-intents/image-resources.mdx": '''---
title: 画像リソース
sidebarTitle: 画像リソース
description: "Web Intent や埋め込みを統合するアプリやウェブサイトで一貫した X のユーザー体験を構築するための画像リソース、ロゴ、Post アクションマーク。"
---
''',
    "web-intents/overview.mdx": '''---
title: Web Intent
description: "X Web Intent を使うと、訪問者はアプリを認可せずにサイトから直接、投稿、返信、Retweet、Like、フォロー、ミニプロフィール表示を行えます。"
sidebarTitle: 概要
---
''',
    "embedded-posts/guides/cms-best-practices.mdx": '''---
title: 埋め込み投稿の CMS ベストプラクティス
sidebarTitle: CMS ベストプラクティス
description: "埋め込み投稿は、X 上で行われているグローバルな会話の一部を、サイト、コンテンツ、コメンタリーに追加します。CMS やカスタムソフトウェアで構築されたサイトでもこれを実現できます。"
---
''',
    "embedded-posts/guides/css-for-embedded-posts.mdx": '''---
title: 埋め込み投稿の CSS
sidebarTitle: 埋め込み投稿の CSS
description: "埋め込み投稿は、Post の引用テキストを含む要素としてページに現れます。このマークアップは後で X for Websites のコードによって解釈され、完全な埋め込みとしてレンダリングされます。"
---
''',
    "embedded-posts/guides/embedded-post-javascript-factory-function.mdx": '''---
title: 埋め込み投稿 JavaScript Factory Function
sidebarTitle: 埋め込み投稿 JavaScript Factory Function
description: "X for Websites ライブラリの twttr.widgets.createTweet JavaScript factory function を使って、ウェブページに X の埋め込み投稿を動的に挿入します。"
---
''',
    "embedded-posts/guides/embedded-tweet-parameter-reference.mdx": '''---
title: 埋め込み投稿のパラメーターリファレンス
description: "埋め込み投稿の data-* 属性と JavaScript factory のパラメーターのリファレンス。テーマ、幅、配置、会話、Card、言語、DNT をカバーします。"
sidebarTitle: 埋め込み投稿のパラメーターリファレンス
---
''',
    "follow-button/guides/javascript-factory-function-follow-button.mdx": '''---
title: Follow ボタン JavaScript Factory Function
description: "twttr.widgets.createFollowButton を使って、ユーザー名、対象要素、カスタムオプション、Promise コールバックを渡し、ページに Follow ボタンを動的に挿入します。"
sidebarTitle: JavaScript Factory Function
---
''',
    "follow-button/guides/parameter-reference-follow-button.mdx": '''---
title: パラメーター
sidebarTitle: パラメーターリファレンス
description: "Follow ボタンは、パラメーターを上書きすることでデフォルト設定からカスタマイズできます。X デベロッパープラットフォームのドキュメントで、パラメーターについて解説します。"
---
''',
    "follow-button/guides/web-intent-follow-button.mdx": '''---
title: Follow ボタンの Web Intent
sidebarTitle: Web Intent
description: "Web Intent は、小さなブラウザーウィンドウでの表示に最適化された X のアクションを表示します。ウェブサイトは、任意のリンクからシンプルなリンクを通じて follow Web Intent にリンクできます。"
---
''',
    "javascript-api/guides/javascript-api.mdx": '''---
title: "スクリプティング: イベント"
description: "twttr.events.bind を使って、loaded、rendered、tweet、follow、retweet、like、click などの X for Websites ウィジェットイベントにコールバックを紐づけ、アナリティクスに活用します。"
sidebarTitle: "スクリプティング: イベント"
---
''',
    "javascript-api/guides/scripting-factory-functions.mdx": '''---
title: "スクリプティング: Factory Function"
sidebarTitle: "スクリプティング: Factory Function"
description: "X for Websites と Web Intent を使ってサイトを X と統合する場合、JavaScript 関数でウィジェットを動的に生成できます。"
---
''',
    "javascript-api/guides/scripting-loading-and-initialization.mdx": '''---
title: "スクリプティング: 読み込みと初期化"
description: "twttr.widgets.load を使って DOM をスキャンし、遅延読み込みや pushState ナビゲーションで動的に追加された新しい X for Websites のボタンやウィジェットを初期化します。"
sidebarTitle: "スクリプティング: 読み込みと初期化"
---
''',
    "javascript-api/guides/set-up-x-for-websites.mdx": '''---
title: X for Websites をセットアップする
description: "widgets.js の非同期ローダースニペットをサイトのテンプレートに追加して X for Websites をセットアップします。より高速なウィジェットレンダリングと安定した埋め込みサポートを実現します。"
sidebarTitle: X for Websites をセットアップする
---
''',
    "log-in-with-x/guides/browser-sign-in-flow.mdx": '''---
title: ブラウザーサインインフロー
description: "デスクトップおよびモバイル上での「X でサインイン」のブラウザーフローの仕組み。認可のためにユーザーを x.com にリダイレクトし、その後アプリケーション URL に戻します。"
sidebarTitle: ブラウザーサインインフロー
---
''',
    "log-in-with-x/guides/implementing-sign-in-with-x.mdx": '''---
title: X でサインインを実装する
sidebarTitle: X でサインインを実装する
description: "「X でサインイン」のブラウザー実装は OAuth に基づいています。このページでは、サインインフロー用のアクセストークンを取得するために必要なリクエストを紹介します。"
---
''',
    "post-button/guides/hashtag-button.mdx": '''---
title: ハッシュタグボタン
sidebarTitle: ハッシュタグボタン
description: "ハッシュタグボタンは、キーワードでグループ化された会話への参加を促す、特別なタイプの Post ボタンです。X 上のハッシュタグについて詳しくご覧ください。"
---
''',
    "post-button/guides/javascript-factory-function.mdx": '''---
title: Post ボタン JavaScript Factory Function
description: "twttr.widgets.createShareButton に共有 URL、対象要素、プリセットの共有テキストなどのオプションを渡して、Post ボタンを動的に挿入します。"
sidebarTitle: JavaScript Factory Function
---
''',
    "post-button/guides/mention-button.mdx": '''---
title: メンションボタン
sidebarTitle: メンションボタン
description: "メンションボタンは、ユーザーとメンションされたアカウントの間のやり取りに焦点を絞った新しい Post を促す、特別なタイプの Post ボタンです。"
---
''',
    "post-button/guides/parameter-reference.mdx": '''---
title: Post ボタンのパラメーターリファレンス
description: "Post ボタンのパラメーターリファレンス。HTML の data-* 属性または JavaScript で使用する text、url、hashtags、via、関連アカウント、サイズ、言語、DNT を含みます。"
sidebarTitle: パラメーターリファレンス
---
''',
    "post-button/guides/web-intent.mdx": '''---
title: Web Intent
sidebarTitle: Web Intent
description: "X Post Web Intent を使うと、リンクから訪問者が投稿を作成でき、ページに関連付けたテキスト、ハッシュタグ、URL、関連する X アカウントの参照をあらかじめ入力できます。"
---
''',
    "timelines/guides/list-timeline.mdx": '''---
title: 埋め込みリスト
description: "リスト URL を持つアンカータグ、または twttr.widgets.createTimeline factory を使って、キュレーションされた公開リストから最新の投稿を表示する X リストタイムラインを埋め込みます。"
sidebarTitle: リストタイムライン
---
''',
    "timelines/guides/oembed-api.mdx": '''---
title: oEmbed API
sidebarTitle: oEmbed API
description: "タイムライン URL で指定した X タイムラインに対して、シンプルな埋め込み HTML を oEmbed 互換の JSON 形式で返します。ユーザー、リスト、いいね、コレクションタイムラインに対応。"
---
''',
    "timelines/guides/parameter-reference.mdx": '''---
title: パラメーター
description: "埋め込みタイムラインの data-* オプションのリファレンス。chrome、theme、width、height、tweet-limit、show-replies、aria-polite アクセシビリティ、DNT 設定を含みます。"
sidebarTitle: パラメーターリファレンス
---
''',
    "timelines/guides/profile-timeline.mdx": '''---
title: 埋め込みプロフィール
description: "プロフィール URL を持つアンカーマークアップ、または twttr.widgets.createTimeline を使って、公開アカウントの最新投稿を表示する X プロフィールタイムラインを埋め込みます。"
sidebarTitle: プロフィールタイムライン
---
''',
}

SRC_ROOT = "/home/daytona/workspace/x-for-websites"
DST_ROOT = "/home/daytona/workspace/ja/x-for-websites"

for rel, new_front in FILES.items():
    src = os.path.join(SRC_ROOT, rel)
    dst = os.path.join(DST_ROOT, rel)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with open(src) as f:
        content = f.read()
    lines = content.split('\n')
    end = 0
    # Handle BOM-like prefix
    i = 0
    while i < len(lines) and lines[i].strip() == '':
        i += 1
    # Skip past first '---'
    if i < len(lines) and '---' in lines[i]:
        for j, ln in enumerate(lines[i+1:], i+1):
            if ln.strip() == '---':
                end = j + 1
                break
    body = '\n'.join(lines[end:])
    with open(dst, 'w') as f:
        f.write(new_front + body)
    print("done", rel, len(new_front + body))
