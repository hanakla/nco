/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true */

/**
 * TODO: コメント
 */
define(function (require, exports, module) {
    "use strict";
    
    var UPDATE_INTERVAL = 10000;
    
    var Backbone    = require("thirdparty/backbone"),
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
    
    var NicoLiveInfo = Backbone.Model.extend({
        url: NicoUrl.Live.GET_PLAYER_STATUS,
        
        defaults: {
            "hasError": null,
            
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

                "isOfficial": null,
                "isNsen": null,
                "nsenType": null,
                
                "contents": [
                    // {id:string, startTime:number, disableAudio:boolean, disableVideo:boolean, content:string}
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
            }
        },
        
        initialize: function () {
            var self = this;
            
            _.bindAll(this, "isValid", "isOfficial", "isNsen", "fetch", "parse");
            
            // 自動アップデートイベントをリスニング
            _updateEventer.on("checkout", function () {
                try {
                    self.fetch();
                } catch (e) {
                    Global.conosle.error(e.message);
                }
            });
        },
        
        isValid: function () { return this.get("_isValid") === true; },
        isOfficial: function () { return !!this.get("stream").isOfficial; },
        isNsen: function () { return !!this.get("stream").isNsen; },
        
        fetch: function (options) {
            if (this.id === null) {
                Global.console.error("生放送IDを指定せずに配信情報を取得できません。");
                return $.Deferred().reject("生放送IDを指定せずに配信情報を取得できません。").promise();
            }
            
            options = options ? _.clone(options) : {};
            
            var dfd = $.Deferred(),
                model = this,
                success = options.success,
                jqxhr;
            
            model.trigger("request", model, jqxhr, options);
            
            // getPlayerStatusの結果を取得
            jqxhr = $.ajax({url: this.url + this.id});
            jqxhr
                .done(function (res, status, xhr) {
                    if (!model.set(model.parse(res, options), options)) return false;
                    
                    if (_.isFunction(success)) success(model, res, options);
                    dfd.resolve(model, res, options);
                    model.trigger("sync", model, res, options);
                })
                .fail(function (jqxhr, status, err) {
                    Global.console.error("番組情報の取得に失敗しました。", arguments);
                    
                    if (jqxhrxhr.status === 503) {
                        dfd.reject("たぶんニコニコ動画がメンテナンス中です。", model);
                    } else {
                        dfd.reject(err);
                    }
                    
                    model.trigger("error", model);
                });
            
            return dfd;
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
                Global.console.error("NicoLiveInfo: 配信情報の取得に失敗しました。 (id: %s, Reason: %s)", this.id, msg);
                return {};
            }
            
            val = {
                hasError: $res.find("getplayerstatus").attr("status") !== "ok",
                
                // 配信情報
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
                    nsenType: $res.find("ns nstype").text(),
                    
                    contents: $.map($stream.find("contents_list contents"), function (content) {
                        var $content = $(content);
                        return {
                            id: $content.attr("id"),
                            startTime: new Date(($content.attr("start_time")|0) * 1000),
                            disableAudio: ($content.attr("disableAudio")|0) !== 1,
                            disableVideo: ($content.attr("disableVideo")|0) !== 1,
                            duration: defaultVal($content.attr("duration"), -1)|0, // ついてない時がある
                            title: defaultVal($content.attr("title"), null), // ついてない時がある
                            content: $content.text()
                        };
                    })
                },
                
                // 配信者情報
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
                
                _isValid: true
            };
            
            return val;
        },
        
        sync: function () {},
        save: function () {},
        destroy: function () {}
    });
    
    setInterval(function () {
        NicoApi.Auth.isLogin()
            .done(function () {
                _updateEventer.trigger("checkout");
            });
    }, UPDATE_INTERVAL);
    
    
    /**
     * 配信情報インスタンスを取得します。
     * @param {string} liveId 取得したい配信のID
     */
    function _getInstance(liveId) {
        var instance = _instances[liveId];
        
        // 指定された配信の配信情報インスタンスがキャッシュされていればそれを返す
        // キャッシュに対応する配信情報インスタンスがなければ、新規作成してキャッシュ
        return instance || (_instances[liveId] = new NicoLiveInfo({id: liveId}));
    }
    
    module.exports = _getInstance;
});