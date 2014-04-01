/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true */

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
 *  - add:(model:LiveComment, collection:CommentProvider) -- コメントを受信した際に発火します。
 *  - receive:(response:String) -- コメントサーバーからレスポンスを受け取った際に発火します。
 *  - error:(message:String) -- コネクションエラーが発生した際に発火します。
 *  - closed:() -- コメントサーバーから切断された際に発火します。
 */
define(function (require, exports, module) {
    "use strict";
    
    var INIT_GET_RESPONSES = 200;
    
    var _           = require("thirdparty/lodash"),
        Backbone    = require("thirdparty/backbone"),
        Global      = require("utils/Global"),
        LiveComment = require("./LiveComment"),
        NicoAuth     = require("../impl/NicoAuthApi"),
        NicoUrl     = require("../impl/NicoUrl"),
        NicoLiveInfo = require("./NicoLiveInfo"),
        StringUtil  = require("utils/StringUtil"),
        
        // Node.jsモジュール
        Net         = Global.require("net"),
        cheerio     = Global.require("cheerio");
    
    var ChatResult = {
        SUCCESS: 0,
        FAIL: 1,
        THREAD_ID_ERROR: 2,
        TICKET_ERROR: 3,
        DIFFERENT_POSTKEY: 4,
        _DIFFERENT_POSTKEY: 8,
        LOCKED: 5
    };
    
    var commands = {
        connect: _.template('<thread thread="<%=thread%>" version="20061206" res_from="' + -INIT_GET_RESPONSES + '"/>'),
        post: _.template('<chat thread="<%=threadId%>" ticket="<%=ticket%>" ' + //vpos="<%=vpos%>" 
                'postkey="<%=postKey%>" mail="<%=command%>" user_id="<%=userId%>" premium="<%=isPremium%>">' +
                '<%=comment%></chat>')
    };
    
    function escapeHtml(str) {
        return str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
    
    var CommentProvider = Backbone.Collection.extend({
        _live: null,
        _connection: null,
        
        _postInfo : {
            threadId: null,
            ticket: null,
            postKey: null
        },
        
        initialize: function (collection, option) {
            if (!option.live) {
                throw new Error("番組情報オブジェクトが渡されませんでした。");
            }
            
            this._live = option.live;
            
            _.bindAll(this, "_parseComment", "_parseThreadInfo", "_fetchPostKey");
            
            NicoAuth.once("logout", this._disconnect);
            this.on("receive", this._parseThreadInfo); // スレッド情報リスナを登録
            this.on("receive", this._parseComment); // 通常のコメントリスナ
            this.on("receive", this._patsePostResult); // コメントのポスト結果リスナ
            this.on("add", this._parseLiveEnd); // 放送終了リスナ
            
            // コメントサーバーへ接続
            this._connect();
        },
        
        //
        // イベントリスナ
        //
        _parseThreadInfo: function (res) {
            var $thread = cheerio(res);
            
            if ($thread.is("thread")) {
                // 最初の接続応答を受け付け
                this._postInfo.threadId = $thread.attr("thread")|0;
                this._postInfo.ticket = $thread.attr("ticket");
                Global.console.info("%s - スレッド情報を受信", this._live.get("id"));
                
                this.off("receive", this._parseThreadInfo);
            }
        },
        
        _parseComment: function (res) {
            var self = this;
            
            if (/^<chat /.test(res)) {
                var comment = LiveComment.fromPlainXml(res);
                
                // 時々流れてくるよくわからない無効データは破棄
                if (comment.get("comment") !== "") {
                    // LiveCommentの自己ポスト判定が甘いので厳密に。
                    if (comment.get("user").id === self._live.get("user").id) {
                        comment.set("isMyPost", true);
                    }
                    
                    self.add(comment);
                }
            }
        },
        
        _listenPostResult: function (res) {
            if (/^<chat_result /.test(res)) {
                var status = /status="([0-9]+)"/.exec(res);
                status = status && status[0]|0;
                this.trigger("_chatresult", {status:status});
            }
        },
        
        _listenLiveEnd: function (comment) {
            // 配信終了通知が来たら切断
            if (comment.isControl() || comment.isDistributorPost()) {
                comment.get("comment") === "/disconnect" && this._disconnect();
            }
        },
        
        //
        // メソッド
        //
        _connect: function () {
            var self = this,
                server = this._live.get("comment");
            
            // コメントサーバーへ接続する
            this._connection = Net.connect(server.port, server.addr);
            this._connection
                // 接続完了したら送信要求を送る
                .on("connect", function() {
                    self._connection.write(commands.connect(server) + '\0');
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
                .on("error", function (err) {
                    self.trigger("error", err.message);
                })
            
                // 接続が閉じた時
                .on("close", function (hadError) {
                    if (hadError) {
                        self.trigger("error", "unknown");
                    }
                    
                    self.trigger("closed");
                });
        },
        
        _disconnect: function () {
            this._connection.destroy();
            this._connection = null;
            this.off();
        },
        
        _fetchPostKey: function () {
            var self = this,
                deferred = $.Deferred(),
                url = StringUtil.format(NicoUrl.Live.GET_POSTKEY, this._postInfo.threadId),
                postKey = "";
            
            $.ajax(url)
                // 通信成功
                .done(function (res, status, jqXhr) {
                    if (jqXhr.status === 200) {
                        // 正常に通信できた時
                        postKey = /^postkey=(.*)\s*/.exec(res);
                        postKey && (postKey = postKey[0]);
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
                    
                    if (status === "timeout") {
                        // ネットにつながってない？
                        deferred.reject();
                        return;
                    }
                    
                    // ネットにつながってそうなときはリトライする。
                    self._fetchPostKey()
                        .done(function (key) {
                            deferred.resolve(key);
                        });
                });
            
            return deferred.promise();
        },
        
        getLiveInfo: function () {
            return this._live;
        },
        
        postComment: function (msg, command) {
            if (!_.isString(msg) || msg === "") {
                throw new Error("空コメントは投稿できません。");
            }
            
            var self = this,
                deferred = $.Deferred(),
                postInfo = this._postInfo;
            
            // PostKeyを取得してコメントを送信
            this._fetchPostKey()
                
                // 通信成功
                .done(function (postKey) {
                    // 送信する情報を集める
                    postInfo = _.defaults(postInfo, {
                        userId: self._live.get("user").id,
                        isPremium: self._live.get("user").isPremium|0,
                        postKey: postKey,
                        comment: escapeHtml(msg),
                        command: command
                    });
                    
                    // 投稿結果をリスニング
                    self.once("_chatresult", function (result) {
                        switch (result.status) {
                            case ChatResult.SUCCESS:
                                deferred.resolve();
                                break;
                                
                            case ChatResult.LOCKED:
                                deferred.reject({code: result.status, message: "コメント投稿がロックされています。"});
                                break;
                            
                            default:
                                deferred.reject({code: result.status, message: "もう一度投稿してください"});
                        }
                    });
                    
                    // コメントを投稿
                    self._connection.write(commands.post(postInfo) + "\0");
                })
            
                // 通信失敗
                .fail(function () {
                    deferred.reject({code: -1, message: "PostKeyの取得に失敗しました。"});
                });
            
            return deferred.promise();
        },
        
        
        create: _.noop,
        fetch: _.noop,
        sync: _.noop
    });
    
    module.exports = CommentProvider;
    module.exports.ChatResult = _.clone(ChatResult);
});