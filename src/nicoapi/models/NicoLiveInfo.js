/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true */

/**
 * ニコニコ生放送の放送情報のモデルです。
 * NicoApi.Live#getLiveInfoメソッドを通じてインスタンスを取得します。
 * （直接requireしてインスタンス化はNG）
 * Backbone.Modelを継承しています。
 * 
 * Methods
 *  - isCorrect():boolean -- 放送情報が正しく取得されているか検証します。
 *  - isClosed():boolean -- 配信が終了しているか判定します。
 *  - isOfficial():boolean -- 公式放送番組か判定します。
 *  - isNsen():boolean -- 放送がNsenのチャンネルか判定します。
 *  - getCommentProvider(): CommentProvider
 *      -- この放送へのコメント送受信を行うCommentProviderオブジェクトを取得します。
 *  - asNsen():NsenChannel -- NsenAPIハンドラを取得します。
 * 
 * Events
 *  - sync:(model:NicoLiveInfo) -- 放送情報を最新状態と同期した時に発火します。
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
        NicoUrl     = require("../impl/NicoUrl"),
        NsenChannel = require("./NsenChannel");
    
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
    
    var NicoLiveInfo = Backbone.Model.extend({
        url: NicoUrl.Live.GET_PLAYER_STATUS,
        _commentProvider: null,
        _nsenChannel: null,
        
        defaults: {
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
        },
        
        initialize: function () {
            var self = this;
            
            _.bindAll(this, "_autoUpdate", "_onClosed");
            
            // 自動アップデートイベントをリスニング
            _updateEventer.on("checkout", this._autoUpdate);
        },
        
        //
        // イベントリスナ
        //
        _autoUpdate: function () {
            try {
                this.fetch();
            } catch (e) {
                Global.conosle.error(e.message);
            }
        },
        
        _onClosed: function () {
            _updateEventer.off("checkout", this._autoUpdate);
            this.trigger("closed", this);
            this.off();
            
            this._commentProvider = null;
            this.set("isClosed", true);
            delete _instances[this.id];
        },
        
        //
        // 非公開メソッド
        //
        fetch: function (options) {
            if (this.id === null) {
                Global.console.error("生放送IDを指定せずに放送情報を取得できません。");
                return $.Deferred().reject("生放送IDを指定せずに放送情報を取得できません。").promise();
            }
            
            options = options ? _.clone(options) : {};
            
            var deferred = $.Deferred(),
                self = this,
                success = options.success,
                jqxhr;
            
            // getPlayerStatusの結果を取得
            jqxhr = $.ajax({url: this.url + this.id});
            jqxhr
                .done(function (res, status, xhr) {
                    if (!self.set(self.parse(res, options), options)) {
                        return false;
                    }
                    
                    if (_.isFunction(success)) {
                        success(self, res, options);
                    }
                    
                    // 最初に同期したらCommentProviderを取得
                    if (!self._commentProvider) {
                        self._commentProvider = new CommentProvider(null, {live: self});
                        
                        // 配信終了イベントをリスニング
                        self._commentProvider.on("closed", self._onClosed);
                    }
                    
                    deferred.resolve(self, res, options);
                    self.trigger("sync", self);
                })
                .fail(function (jqxhr, status, err) {
                    Global.console.error("番組情報の取得に失敗しました。", arguments);
                    
                    if (jqxhr.status === 503) {
                        deferred.reject("たぶんニコニコ動画がメンテナンス中です。", self);
                    } else {
                        deferred.reject(err);
                    }
                    
                    self.trigger("error", self);
                });
            
            return deferred.promise();
        },
        
        parse: function (res) {
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
        },
        
        //
        // 公開メソッド
        //
        isCorrect: function () {
            return !this.get("_hasError");
        },
        
        isOfficial: function () {
            return !!this.get("stream").isOfficial;
        },
        
        isNsen: function () {
            return !!this.get("stream").isNsen;
        },
        
        isClosed: function () {
            return this.get("isClosed") === true;
        },
        
        getCommentProvider: function () {
            return this._commentProvider;
        },
        
        asNsen: function () {
            if (!this.isNsen()) {
                throw new Error(this.id + " この放送はNsenチャンネルではありません。");
            }
            
            if (!this._nsenChannel) {
                this._nsenChannel = new NsenChannel(this);
            }
            
            return this._nsenChannel;
        },
        
        sync: _.noop,
        save: _.noop,
        destroy: _.noop
    });
    
    setInterval(function () {
        NicoApi.Auth.isLogin()
            .done(function () {
                _updateEventer.trigger("checkout");
            });
    }, UPDATE_INTERVAL);
    
    
    /**
     * 放送情報インスタンスを取得します。
     * @param {string} liveId 取得したい放送のID
     */
    function _getInstance(liveId) {
        var instance = _instances[liveId];
        
        // 指定された放送の放送情報インスタンスがキャッシュされていればそれを返す
        // キャッシュに対応する放送情報インスタンスがなければ、新規作成してキャッシュ
        return instance || (_instances[liveId] = new NicoLiveInfo({id: liveId}));
    }
    
    /**
     * オブジェクトがNicoLiveInfoのインスタンスか検証します。
     * @param {Object} obj
     */
    function _isInstance(obj) {
        return obj instanceof NicoLiveInfo;
    }
    
    module.exports = _getInstance;
    module.exports.isInstance = _isInstance;
});