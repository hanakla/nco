/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true */
define(function (require, exports, module) {
    "use strict";
    
    var UPDATE_INTERVAL = 10000,
        NICOLIVE_URL_GETPLAYERSTATUS = "http://live.nicovideo.jp/api/getplayerstatus/";
    
    var Backbone = require("thirdparty/backbone"),
        Global = require("utils/Global");
    
    var liveInfoUpdater = _.extend({}, Backbone.Events);
    
    var NicoLiveInfo = Backbone.Model.extend({
        url: NICOLIVE_URL_GETPLAYERSTATUS,
        
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
            
            _.bindAll(this, "fetch");
            liveInfoUpdater.on("checkout", function () {
                try {
                    self.fetch();
                } catch (e) {
                    Global.conosle.error(e.message);
                }
            });
        },
        
        isOfficial: function () { return !!this.get("stream").isOfficial; },
        isNsen: function () { return !!this.get("stream").isNsen; },
        
        fetch: function (options) {
            if (this.id === null) {
                Global.console.error("生放送IDを指定せずに配信情報を取得できません。");
                return $.Deferred().reject().promise();
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
                .fail(function (xhr) {
                    console.log("番組情報の取得に失敗しました。", arguments);
                    
                    if (xhr.status === 503) {
                        dfd.reject("たぶんニコニコ動画がメンテナンス中です。", model);
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
                val     = _.clone(this.defaults);
            
            if ($root.attr("status") !== "ok") {
                throw new Error("NicoLiveInfo: 配信情報の取得に失敗しました。 (" + $res.find("error code") + ")");
            }
            
            _.extend(val, {
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
                    
                    contents: $stream.find("contents_list contents").map(function () {
                        var $content = $(this);
                        return {
                            id: $content.attr("id"),
                            startTime: $content.attr("start_time"),
                            disableAudio: ($content.attr("disableAudio")|0) !== 1,
                            disableVideo: ($content.attr("disableVideo")|0) !== 1,
                            comment: $content.text()
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
                }
            });
            
            return val;
        },
        
        save: function () {},
        destroy: function () {}
    });
    
    setInterval(liveInfoUpdater.trigger.bind(liveInfoUpdater, "checkout"), UPDATE_INTERVAL);
    
    module.exports = NicoLiveInfo;
});