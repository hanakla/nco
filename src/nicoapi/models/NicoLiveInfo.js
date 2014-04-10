/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true, eqnull: true */
/*global $, define*/

/**
 * ニコニコ生放送の放送情報のモデルです。
 * Backbone.Modelを継承しています。
 * 
 * Methods
 *  - isCorrect():boolean -- 放送情報が正しく取得されているか検証します。
 *  - isClosed():boolean -- 配信が終了しているか判定します。
 *  - isOfficial():boolean -- 公式放送番組か判定します。
 *  - isNsen():boolean -- 放送がNsenのチャンネルか判定します。
 *  - getCommentProvider(): CommentProvider
 *      -- この放送へのコメント送受信を行うCommentProviderオブジェクトを取得します。
 *  - destroy():void -- インスタンスが破棄可能か調べ、可能であれば破棄します。
 * 
 * Events
 *  - sync:(model:NicoLiveInfo) -- 放送情報を最新状態と同期した時に発火します。
 *  - seekDestroyConsent:(opposite:function()) -- インスタンスが破棄される前に発火します。
 *      インスタンスの破棄によって不都合が生じる可能性がある場合
 *      リスナーはoppositeをコールしなければなりません。
 *  - destroy:() -- インスタンスが破棄される時に発火します。
 *  - closed:() -- 配信が終了した時に発火します。
 * 
 * Properties
 *  - stream:Object -- 放送の基礎情報
 *      - liveId:string -- 放送ID
 *      - title:string -- 放送タイトル
 *      - description:string -- 放送の説明
 * 
 *      - watchCount:number -- 視聴数
 *      - commentCount:number -- コメント数
 * 
 *      - baseTime:Date -- 生放送の時間の関わる計算の"元になる時間"
 *      - startTime:Date -- 放送の開始時刻
 *      - openTime:Date -- 放送の開場時間
 *      - endTime:Date -- 放送の終了時刻（放送中であれば終了予定時刻）
 *      
 *      - isOfficial:boolean -- 公式配信か
 *      - isNsen:boolean -- Nsenのチャンネルか
 *      - nsenType:string -- Nsenのチャンネル種別（"nsen/***"の***の部分）
 *  
 *      - contents:Array.<Object>
 *          - id:string -- IDというより、メイン画面かサブ画面か
 *          - startTime:number -- 再生開始時間
 *          - disableAudio:boolean -- 音声が無効にされているか
 *          - disableVideo:boolean -- 映像が無効にされているか
 *          - duration:number|null -- 再生されているコンテンツの長さ（秒数）
 *          - title:string|null -- 再生されているコンテンツのタイトル
 *          - content:string -- 再生されているコンテンツのアドレス（動画の場合は"smile:動画ID"）
 * 
 *  - owner:Object -- 配信者の情報
 *      - userId:number -- ユーザーID
 *      - name:string -- ユーザー名
 * 
 *  - user:Object -- 自分自身の情報
 *      - id:number -- ユーザーID
 *      - name:string -- ユーザー名
 *      - isPremium:boolean -- プレミアムアカウントか
 *  
 *  - rtmp:Object -- 配信に関する情報。詳細不明
 *      - isFms:boolean
 *      - port:number
 *      - url:string
 *      - ticket: string
 *
 *  - comment:Object -- コメントサーバーの情報
 *      - addr:string -- サーバーアドレス
 *      - port:number -- サーバーポート
 *      - thread:number -- この放送と対応するスレッドID
 *
 */
define(function (require, exports, module) {
    "use strict";
    
    var UPDATE_INTERVAL = 10000;
    
    var _           = require("thirdparty/lodash"),
        Backbone    = require("thirdparty/backbone"),
        CommentProvider = require("./CommentProvider"),
        Global      = require("utils/Global"),
        NicoApi     = require("../NicoApi"),
        NicoUrl     = require("../impl/NicoUrl");
    
    var _instances = {},
        _updateEventer = _.extend({}, Backbone.Events);
    
    /**
     * valがnullもしくはundefinedの時にdefを返します。
     * @param {Object} val
     * @param {Object} def
     * @return {Object}
     */
    function defaultVal(val, def) {
        if (val !== void 0 && val !== null) {
            return val;
        } else {
            return def;
        }
    }
    
    /**
     * ニコニコ生放送の放送情報のモデルです。
     * @param {string} liveId 放送ID
     */
    function NicoLiveInfo(liveId) {
        if (_instances[liveId] != null) {
            return _instances[liveId];
        }
        Backbone.Model.call(this, {id: liveId});
        
        _.bindAll(this, "_autoUpdate", "_onClosed");
        
        // 自動アップデートイベントをリスニング
        _updateEventer.on("checkout", this._autoUpdate);
    }
    
    // Backbone.Modelを継承
    NicoLiveInfo.prototype = Object.create(Backbone.Model.prototype);
    NicoLiveInfo.prototype.constructor = NicoLiveInfo;
    NicoLiveInfo.prototype.parentClass = Backbone.Model.prototype;
    
    /**
     * @type {CommentProvider}
     */
    NicoLiveInfo.prototype._commentProvider = null;
    
    /**
     * @type {Object}
     */
    NicoLiveInfo.prototype.defaults = {
        "stream": {
            "liveId": null,
            "title": null,
            "description": null,

            "watchCount": -1,
            "commentCount": -1,

            "baseTime": null,
            "openTime": null,
            "startTime": null,
            "endTime": null,

            "isOfficial": false,
            "isNsen": false,
            "nsenType": null,

            "contents": [
                /*
                {
                    id:string,
                    startTime:number,
                    disableAudio:boolean,
                    disableVideo:boolean, 
                    duration:number|null,
                    title:string|null,
                    content:string
                }
                */
            ]
        },   
        "owner": {
            "userId": -1,
            "name": null,
        },
        "user": {
            "id": -1,
            "name": null,
            "isPremium": null,
        },
        "rtmp": {
            "isFms": null,
            "port": null,
            "url": null,
            "ticket": null
        },
        "comment": {
            "addr" : null,
            "port" : -1,
            "thread": null
        },
        "_hasError": true,
    };
    
    
    /**
     * 自動更新イベントのリスナ
     * @private
     */
    NicoLiveInfo.prototype._autoUpdate = function () {
        try {
            this.fetch();
        } catch (e) {
            Global.console.error(e.message);
        }
    };
    
    /**
     * 配信終了イベントのリスナ
     */
    NicoLiveInfo.prototype._onClosed = function () {
        this.trigger("closed");
        _dispose(this);
    };
    
    /**
     * APIから取得した情報をパースします。
     * @private
     * @param {string} res API受信結果
     */
    NicoLiveInfo.prototype.parse = function (res) {
        var $res    = $(res),
            $root   = $res.find(":root"),
            $stream = $res.find("stream"),
            $user   = $res.find("user"),
            $rtmp   = $res.find("rtmp"),
            $ms     = $res.find("ms"),
            val;

        if ($root.attr("status") !== "ok") {
            var msg = $res.find("error code").text();
            Global.console.error("NicoLiveInfo: 放送情報の取得に失敗しました。 (id: %s, Reason: %s)", this.id, msg);
            return { _hasError: true };
        }

        val = {
            // 放送情報
            stream: {
                liveId: $stream.find("id").text(),
                title: $stream.find("title").text(),
                description: $stream.find("description").text(),

                watchCount: $stream.find("watch_count").text()|0,
                commentCount: $stream.find("comment_count")|0,

                baseTime: new Date(($stream.find("base_time").text()|0) * 1000),
                openTime: new Date(($stream.find("open_time").text()|0) * 1000),
                startTime: new Date(($stream.find("start_time").text()|0) * 1000),
                endTime: new Date(($stream.find("end_time")|0) * 1000),

                isOfficial: $stream.find("provider_type").text() === "official",
                isNsen: $res.find("ns").length > 0,
                nsenType: $res.find("ns nstype").text()||null,

                contents: $.map($stream.find("contents_list contents"), function (content) {
                    var $content = $(content);
                    return {
                        id: $content.attr("id"),
                        startTime: new Date(($content.attr("start_time")|0) * 1000),
                        disableAudio: ($content.attr("disableAudio")|0) !== 1,
                        disableVideo: ($content.attr("disableVideo")|0) !== 1,
                        duration: defaultVal($content.attr("duration"), null)|0, // ついてない時がある
                        title: defaultVal($content.attr("title"), null), // ついてない時がある
                        content: $content.text()
                    };
                })
            },

            // 放送者情報
            owner: {
                userId: $stream.find("owner_id").text()|0,
                name: $stream.find("owner_name").text()
            },

            // ユーザー情報
            user: {
                id: $user.find("user_id").text()|0,
                name: $user.find("nickname").text(),
                isPremium: $user.find("is_premium").text() === "1"
            },

            // RTMP情報
            rtmp: {
                isFms: $rtmp.attr("is_fms") === "1",
                port: $rtmp.attr("rtmpt_port")|0,
                url: $rtmp.find("url").text(),
                ticket: $rtmp.find("ticket").text()
            },

            // コメントサーバー情報
            comment : {
                addr: $ms.find("addr").text(),
                port: $ms.find("port").text()|0,
                thread: $ms.find("thread").text()|0
            },

            _hasError: $res.find("getplayerstatus").attr("status") !== "ok"
        };

        return val;
    };
    
    /**
     * 番組情報を最新の状態に同期します。
     * @return {jQuery.Promise} 成功すればresolveされます。
     *    失敗した時はErrorオブジェクトとともにrejectされます。
     */
    NicoLiveInfo.prototype.fetch = function (options) {
        if (this.id === null) {
            Global.console.error("生放送IDが指定されていません。");
            var obj = new Error("生放送IDが指定されていません。");
            return $.Deferred().reject(obj).promise();
        }
        
        options = options ? _.clone(options) : {};
        
        var deferred = $.Deferred(),
            self = this,
            success = options.success;

        // getPlayerStatusの結果を取得
        $.ajax({url: NicoUrl.Live.GET_PLAYER_STATUS + this.id})
            .done(function (res) {
                if (!self.set(self.parse(res, options), options)) {
                    return false;
                }
                
                if (_.isFunction(success)) {
                    success(self, res, options);
                }
                
                // 最初に同期したらCommentProviderを取得
                if (self._commentProvider == null) {
                    self._commentProvider = new CommentProvider(self);
                    
                    // 配信終了イベントをリスニング
                    self._commentProvider.on("closed", self._onClosed);
                }
                
                deferred.resolve();
                self.trigger("sync", self);
            })
            .fail(function (jqxhr, status, err) {
                Global.console.error("番組情報の取得に失敗しました。", arguments);

                if (jqxhr.status === 503) {
                    deferred.reject(new Error("たぶんニコニコ動画がメンテナンス中です。"));
                } else {
                    deferred.reject(new Error(err));
                }

                self.trigger("error", self);
            });

        return deferred.promise();
    };
    
    /**
     * 放送情報が正しく同期されたか調べます。
     * @return {boolean}
     */
    NicoLiveInfo.prototype.isCorrect = function () {
        return !this.get("_hasError");
    };
    
    /**
     * 公式放送か調べます。
     * @return {boolean}
     */
    NicoLiveInfo.prototype.isOfficial = function () {
        return !!this.get("stream").isOfficial;
    };

    /**
     * Nsenのチャンネルか調べます。
     * @return {boolean}
     */
    NicoLiveInfo.prototype.isNsen = function () {
        return !!this.get("stream").isNsen;
    };
    
    /**
     * 放送が終了しているか調べます。
     * @return {boolean}
     */
    NicoLiveInfo.prototype.isClosed = function () {
        return this.get("isClosed") === true;
    };
    
    /**
     * この放送に対応するCommentProviderオブジェクトを取得します。
     * @return {?CommentProvider}
     */
    NicoLiveInfo.prototype.getCommentProvider = function () {
        return this._commentProvider;
    };
    
    /**
     * インスタンスが破棄可能か調べ、可能であれば破棄します。
     */
    NicoLiveInfo.prototype.destroy = function () {
        var opposite = false;
        this.trigger("seekDestroyConsent", function () {
            opposite = true;
        });
        
        if (opposite === false) {
            _dispose(this);
        }
    };
    
    // Backbone.Modelのメソッドを無効化
    NicoLiveInfo.prototype.sync = _.noop;
    NicoLiveInfo.prototype.save = _.noop;
    
    
    /**
     * 渡されたインスタンスを破棄します。
     * @param {NicoLiveInfo} self
     */
    function _dispose(self) {
        _updateEventer.off("checkout", self._autoUpdate);
        self.trigger("destroy");
        self.off();
        
        self._commentProvider.dispose();
        self._commentProvider = null;
        self.set("isClosed", true);
        delete _instances[self.id];
    }
    
    // 定期的にデータを取得しに行く
    setInterval(function () {
        NicoApi.Auth.isLogin()
            .done(function () {
                _updateEventer.trigger("checkout");
            });
    }, UPDATE_INTERVAL);
    
    
    module.exports = NicoLiveInfo;
});