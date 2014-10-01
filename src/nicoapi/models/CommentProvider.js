/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true, eqnull: true*/
/*global define, $*/

/**
 * 放送中の番組のコメントの取得と投稿を行うクラスです。
 * NicoLiveInfo#getCommentProviderメソッドを通じてインスタンスを取得します。
 * （直接requireしてインスタンス化はNG）
 * Backbone.Collectionを継承しています。
 * 
 * Methods:
 *  - getLiveInfo(): LiveInfo -- 配信情報オブジェクトを取得します。
 *  - postComment(msg:string, command:string): $.Promise -- コメントを投稿します。
 *      投稿に成功すればresolveされ、失敗すれば投稿結果オブジェクトとともにrejectされます。
 *      投稿結果オブジェクトは以下の形式のオブジェクトです。
 *      {code:number, message:string} -- code:エラーコード, message:エラーメッセージ
 * 
 * Events:
 *  - receive:(response:String) -- コメントサーバーからレスポンスを受け取った際に発火します。
 *  - add:(model:LiveComment, collection:CommentProvider) -- コメントを受信した際に発火します。
 *  - error:(error:Error) -- コネクションエラーが発生した際に発火します。
 *  - disconnected:() -- コメントサーバから切断した時に発火します。
 *  - closed:() -- コメントサーバーから切断された際に発火します。
 */
define(function (require, exports, module) {
    "use strict";
    
    var INIT_GET_RESPONSES = 200,
        SEND_TIMEOUT = 3000;
    
    var _           = require("thirdparty/underscore"),
        Backbone    = require("thirdparty/backbone"),
        Global      = require("utils/Global"),
        LiveComment = require("./LiveComment"),
        NicoAuth     = require("../impl/NicoAuthApi"),
        NicoUrl     = require("../impl/NicoUrl"),
        StringUtil  = require("utils/StringUtil"),
        
        // Node.jsモジュール
        Net         = Global.requireNm("net"),
        cheerio     = Global.requireNm("cheerio");
    
    var CHAT_RESULT = {
        SUCCESS: 0,
        FAIL: 1,
        THREAD_ID_ERROR: 2,
        TICKET_ERROR: 3,
        DIFFERENT_POSTKEY: 4,
        _DIFFERENT_POSTKEY: 8,
        LOCKED: 5
    };
    
    var COMMANDS = {
        connect: _.template('<thread thread="<%=thread%>" version="20061206" res_from="' + -INIT_GET_RESPONSES + '"/>'),
        post: _.template('<chat thread="<%=threadId%>" ticket="<%=ticket%>" ' + //vpos="<%=vpos%>" 
                'postkey="<%=postKey%>" mail="<%=command%>" user_id="<%=userId%>" premium="<%=isPremium%>">' +
                '<%=comment%></chat>')
    };
    
    
    function escapeHtml(str) {
        return str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
    
    
    function CommentProvider(liveInfo) {
        if (liveInfo == null) {
            throw new Error("番組情報オブジェクトが渡されませんでした。");
        }
        
        Backbone.Collection.call(this);
        
        _.bindAll(this, "_responseParser", "_threadInfoDetector",
            "_postResultDetector", "_liveEndDetector", "_onLiveInfoSynced",
            "_onAuthLogout");
        
        this._postInfo = _.clone(this._postInfo);
        this._live = liveInfo;
        
        NicoAuth.once("logout", this._disconnect);
        
        this
            .on("receive", this._responseParser)
            .once("receive", this._threadInfoDetector) // スレッド情報リスナを登録
            .on("receive", this._postResultDetector) // コメントのポスト結果リスナ
            .on("add", this._liveEndDetector); // 放送終了検出リスナ

        // コメントサーバーへ接続
        this._connect();
    }
    
    // Backbone.Collectionを継承
    CommentProvider.prototype = Object.create(Backbone.Collection.prototype);
    CommentProvider.prototype.constructor = CommentProvider;
    CommentProvider.prototype.parentClass = Backbone.Collection.prototype;
    
    /**
     * @type {NicoLiveInfo}
     */
    CommentProvider.prototype._live = null;
    
    /**
     * @type {Net.Socket}
     */
    CommentProvider.prototype._connection = null;
    
    /**
     * コメント投稿に必要な情報
     * @type {Object.<string, string>}
     */
    CommentProvider.prototype._postInfo = {
        ticket: null,
        postKey: null,
        threadId: null,
    };
    
    /**
     * 受信したデータからLiveCommentインスタンスを生成してイベントを発火させる
     * @private
     * @param {string} res
     */
    CommentProvider.prototype._responseParser = function(res) {
        if (/^<chat /.test(res)) {
            var comment = LiveComment.fromPlainXml(res);

            // 時々流れてくるよくわからない無効データは破棄
            if (comment.get("comment") !== "") {
                // LiveCommentの自己ポスト判定が甘いので厳密に。
                if (comment.get("user").id === this._live.get("user").id) {
                    comment.set("isMyPost", true);
                }

                this.add(comment);
            }
        }
    };
    
    /**
     * コメントを受信した時にスレッド情報を取得するイベントリスナ
     * @private
     * @param {string} res
     */
    CommentProvider.prototype._threadInfoDetector = function (res) {
        var $thread = cheerio(res);

        if ($thread.is("thread")) {
            // 最初の接続応答を受け付け
            // チケットを取得
            this._postInfo.ticket = $thread.attr("ticket");
            Global.console.info("%s - スレッド情報を受信", this._live.get("id"));
        }
    };
    
    /**
     * 受信したデータの中から自分のコメント投稿結果を探すリスナ
     * @private
     * @param {string} res
     */
    CommentProvider.prototype._postResultDetector = function (res) {
        if (/^<chat_result /.test(res)) {
            var status = /status="([0-9]+)"/.exec(res);
            status = status && status[1]|0;
            this.trigger("_chatresult", {status:status});
        }
    };
    
    /**
     * 受信したコメントの中から、放送終了の制御コメントを探すリスナ
     * @private
     * @param {LiveComment} comment
     */
    CommentProvider.prototype._liveEndDetector = function (comment) {
        // 配信終了通知が来たら切断
        if (comment.isControl() || comment.isDistributorPost()) {
            comment.get("comment") === "/disconnect" && this._disconnect();
        }
    };
    
    /**
     * コメントサーバのスレッドID変更を監視するリスナ
     * @private
     */
    CommentProvider.prototype._onLiveInfoSynced = function () {
        // 時々threadIdが変わるのでその変化を監視
        this._postInfo.threadId = this._live.get("comment").thread;
    };
    
    /**
     * ログアウト検知リスナ
     * @private
     */
    CommentProvider.prototype._onAuthLogout = function () {
        this._disconnect();
    };
    
    
    /**
     * コメントサーバへ接続します。
     * @private
     * @param {CommentProvider} self
     */
    CommentProvider.prototype._connect = function () {
        var self = this,
            serverInfo = self._live.get("comment");

        // コメントサーバーへ接続する
        this._connection = Net.connect(serverInfo.port, serverInfo.addr);
        this._connection
            // 接続完了したら送信要求を送る
            .once("connect", function() {
                self._connection.write(COMMANDS.connect(serverInfo) + '\0');
            })

            // コメントを受信した時
            .on("data", function(data) {
                var $c = cheerio("<res>" + data + "</res>");

                // 要素をばらしてイベントを呼ぶ
                $c.find("*").each(function () {
                    self.trigger("receive", this.toString());
                });
            })

            // 接続エラーが起きた時
            .once("error", function (err) {
                self.trigger("error", new Error(err.message));
            })

            // 接続が閉じた時
            .once("close", function (hadError) {
                if (hadError) {
                    self.trigger("error", new Error("unknown"));
                }

                self.trigger("closed");
            });
    };
    
    /**
     * コメントサーバから切断します。
     * @private
     * @param {CommentProvider} self
     */
    CommentProvider.prototype._disconnect = function () {
        if (this._connection != null) {
            this._connection.removeAllListeners();
            this._connection.destroy();
            this._connection = null;
        }
        
        this.trigger("disconnected");
        this.off();
    };
    
    /**
     * このインスタンスが保持しているNicoLiveInfoオブジェクトを取得します。
     * @return {NicoLiveInfo}
     */
    CommentProvider.prototype.getLiveInfo = function () {
        return this._live;
    };
    
    /**
     * APIからpostkeyを取得します。
     * @private
     * @param {number} maxRetry 最大取得試行回数
     * @return {jQuery.Promise} 取得出来た時にpostkeyと共にresolveされ、
     *    失敗した時は、rejectされます。
     */
    CommentProvider.prototype._fetchPostKey = function (maxRetry) {
        var self = this,
            deferred = $.Deferred(),
            threadId = this._live.get("comment").thread,
            url = StringUtil.format(NicoUrl.Live.GET_POSTKEY, threadId),
            postKey = "";

        maxRetry = typeof maxRetry === "number" ?
                        Math.min(Math.abs(maxRetry|0), 5) : 5;

        $.ajax(url)
            // 通信成功
            .done(function (res, status, jqXhr) {
                if (jqXhr.status === 200) {
                    // 正常に通信できた時
                    postKey = /^postkey=(.*)\s*/.exec(res);
                    postKey && (postKey = postKey[1]);
                }

                if (postKey !== "") {
                    // ポストキーがちゃんと取得できれば
                    Global.console.info("postKeyを取得: %s", postKey);
                    self._postInfo.postKey = postKey; 
                    deferred.resolve(postKey);
                    return;
                }

                Global.console.error("postKeyの更新に失敗しました。", arguments);
                deferred.reject();
            })
            .fail(function (jqXhr, status, err) {
                Global.console.error("postKeyの更新に失敗しました。", arguments);

                if (maxRetry === 0) {
                    // 何回か試して無理ならあきらめる
                    deferred.reject();
                    return;
                }

                // ネットにつながってそうなときはリトライする。
                setTimeout(function () {
                    self._fetchPostKey(maxRetry - 1)
                        .done(function (key) {
                            deferred.resolve(key);
                        });
                }, 400);
            });

        return deferred.promise();
    };
    
    /**
     * コメントを投稿します。
     * @param {string} msg 投稿するコメント
     * @param {string} command コマンド(184, bigなど)
     * @return {jQuery.Promise} 投稿に成功すればresolveされ、
     *    失敗すればErrorオブジェクトとともにrejectされます。
     */
    CommentProvider.prototype.postComment = function (msg, command) {
        var err;
        
        if (typeof msg !== "string" || msg.replace(/\s/g, "") === "") {
            err = new Error("空コメントは投稿できません。");
            return $.Deferred().reject(err).promise();
        }

        if (this._connection == null) {
            err = new Error("コメントサーバと接続していません。");
            return $.Deferred().reject(err).promise();
        }

        var self = this,
            deferred = $.Deferred(),
            timeoutId = null,
            postInfo;

        // PostKeyを取得してコメントを送信
        this._fetchPostKey()
            .done(function () {
                // 取得成功
                // 送信する情報を集める
                postInfo = {
                    userId: self._live.get("user").id,
                    isPremium: self._live.get("user").isPremium|0,

                    comment: escapeHtml(msg),
                    command: command || "",

                    threadId: self._postInfo.threadId,
                    postKey: self._postInfo.postKey,
                    ticket: self._postInfo.ticket
                };
                
                // 投稿結果の受信イベントをリスニング
                self.once("_chatresult", function (result) {
                    clearTimeout(timeoutId);
                    
                    if (result.status === CHAT_RESULT.SUCCESS) {
                        deferred.resolve();
                        return;
                    }
                    
                    switch (result.status) {
                        case CHAT_RESULT.LOCKED:
                            err = new Error("コメント投稿がロックされています。");
                            deferred.reject(err);
                            break;

                        default:
                            err = new Error("投稿に失敗しました");
                            deferred.reject(err);
                    }
                });
                
                // 規定時間内に応答がなければタイムアウトとする
                timeoutId = setTimeout(function () {
                    deferred.reject(new Error("タイムアウトしました。"));
                }, SEND_TIMEOUT);

                // コメントを投稿
                self._connection.write(COMMANDS.post(postInfo) + "\0");
            })

            // 通信失敗
            .fail(function () {
                deferred.reject(new Error("postkeyの取得に失敗しました。"));
            });

        return deferred.promise();
    };
    
    /**
     * このインスタンスを破棄します。
     */
    CommentProvider.prototype.dispose = function () {
        this._live = null;
        this._postInfo = null;
        this._disconnect();
    };
    
    // Backbone.Collectionのいくつかのメソッドを無効化
    CommentProvider.prototype.create = _.noop;
    CommentProvider.prototype.fetch = _.noop;
    CommentProvider.prototype.sync = _.noop;
    
    
    module.exports = CommentProvider;
    module.exports.ChatResult = _.clone(CHAT_RESULT);
});
