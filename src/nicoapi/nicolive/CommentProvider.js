/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true */
define(function (require, exports, module) {
    "use strict";
    
    var INIT_GET_RESPONSES = 100,
        NICO_URL_GETPOSTKEY = "http://live.nicovideo.jp/api/getpostkey?thread=%s";
    
    var _           = require("thirdparty/lodash"),
        Backbone    = require("thirdparty/backbone"),
        Global      = require("utils/Global"),
        LiveComment = require("./LiveComment"),
        NicoApi     = require("../NicoApi"),
        NicoLiveInfo = require("./NicoLiveInfo"),
        StringUtil  = require("utils/StringUtil"),
        
        Net         = Global.require("net"),
        Socket      = Net.Socket;
    
    var commands = {
        connect: _.template('<thread thread="<%=thread%>" version="20061206" res_from="' + -INIT_GET_RESPONSES + '"/>'),
        post: _.template('<chat thread="<%=threadId%>" ticket="<%=ticket%>" ' + //vpos="<%=vpos%>" 
                'postkey="<%=postKey%>" mail="<%=command%>" user_id="<%=userId%>" premium="<%=isPremium%>">' +
                '<%=comment%></chat>')
    };
    
    /**
     * @constructor
     * 
     * 放送中の番組のコメントの取得と投稿を行うクラスです。
     * 初期化時にNicoLiveInfoオブジェクトが必要になります。
     * 
     * Example:
     *  var commentProvider;
     * 
     *  NicoLiveApi.getLiveInfo("番組ID")
     *      .done(function (liveInfo) {
     *          commentProvider = NicoLiveApi.getCommentProvider([], {live: liveInfo});
     *      });
     * 
     * CommentProviderクラスは通常のイベントに加えて、
     * コメントサーバーからのレスポンスを受け取った際に"receive"イベントを発火します。
     *      receive: (response) responseは文字列型です。
     */
    var CommentProvider = Backbone.Collection.extend({
        model: LiveComment,
        
        live: null,
        conn: null,
        
        postInfo : {
            threadId: null,
            ticket: null,
            postKey: null
        },
        
        initialize: function (none, options) {
            if (! options.live instanceof NicoLiveInfo) {
                Global.console.error("番組情報オブジェクトが渡されませんでした。");
                return;
            }
            
            _.bindAll(this, "_nicoApiLogout", "_parseComment",
                            "_parseThreadInfo", "_fetchPostKey");
        
            NicoApi.once("logout", this._nicoApiLogout);
            this.once("receive", this._parseThreadInfo);
            this.on("receive", this._parseComment);
            
            // コメントサーバーへ接続する
            var self = this,
                liveInfo = this.live = options.live,
                svinfo = liveInfo.get("comment");
            
            this.conn = Net.connect(svinfo.port, svinfo.addr);
            
            this.conn.on("connect", function() {
                    // 接続要求を送信する
                    self.conn.write(commands.connect(svinfo) + '\0');
                })
                    .on('data', function(data) {
                        // コメント受信
                        self.trigger("receive", data.toString());
                    });
        },
        
        _nicoApiLogout: function () {
            this.conn.end();
            this.conn = null;
            this.trigger("closed", this);
            this.off();
        },
        
        _parseThreadInfo: function (res) {
            var $thread = $("<root>" + res + "</root>").find("thread");
            
            if ($thread.length) {
                // 初期の接続応答を受け付け
                this.postInfo.threadId = $thread.attr("thread")|0;
                this.postInfo.ticket = $thread.attr("ticket");
                Global.console.info("%s - スレッド情報を受信", this.live.get("id"));
            }
            
            this.off("receive", this._parseThreadInfo);
        },
        
        _parseComment: function (res) {
            var self = this,
                $res = $("<root>" + res + "</root>");
            
            $res.find("chat").each(function () {
                var comment = LiveComment.fromPlainXml(this.outerHTML);
                
                // 時々流れてくるよくわからない無効データは破棄
                if (comment.get("comment") !== "") {
                    
                    // LiveCommentの自己ポスト判定が甘いので厳密に。
                    if (comment.get("user").id === self.live.get("user").id) {
                        comment.set("isMyPost", true);
                    }
                    
                    self.add(comment);
                }
            });
        },
        
        _fetchPostKey: function () {
            var self = this,
                deferred = $.Deferred(),
                url = StringUtil.format(NICO_URL_GETPOSTKEY, this.postInfo.threadId),
                postKey;
            
            // TODO: postkey取得時にまれによく例外が発生する問題の修正
            //       (Cannot call method 'open' of undefined)
            // FIX?: 失敗した時にもう一度取得しに行くようにした
            $.ajax({url: url})
                .done(function (res) {
                    res = res.match(/^postkey=(.*)\s*/);
                    postKey = res && res[1];
                    deferred.resolve(postKey);
                    
                    Global.console.info("postKeyを取得: %s", res[1]);
                })
                .fail(function (xhr, status, err) {
                    Global.console.error("postKeyの更新に失敗しました。", arguments);
                    
                    self._fetchPostKey()
                        .done(function (key) {
                            deferred.resolve(key);
                        });
                });
            
            return deferred;
        },
        
        postComment: function (msg, command) {
            if (!_.isString(msg) || msg === "") {
                throw new Error("空コメントは投稿できません。");
            }
            
            var self = this,
                deferred = $.Deferred(),
                postInfo = _.clone(this.postInfo);
            
            this._fetchPostKey()
                .done(function (postKey) {
                    _.extend(postInfo, {
                        userId: self.live.get("user").id,
                        isPremium: self.live.get("user").isPremium|0,
                        postKey: postKey,
                        comment: msg,
                        command: command
                    });

                    self.conn.write(commands.post(postInfo) + "\0");
                    deferred.resolve(msg, command);
                });
            
            return deferred;
        },
        
        getLiveInfo: function () {
            return _.clone(this.live);
        },
        
        fetch: function () {},
        sync: function () {}
    });
    
    module.exports = CommentProvider;
});