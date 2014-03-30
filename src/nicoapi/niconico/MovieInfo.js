/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true */
define(function (require, exports, module) {
    "use strict";
    
    var _           = require("thirdparty/lodash"),
        Backbone    = require("thirdparty/backbone"),
        Global      = require("utils/Global"),
        NicoApi     = require("nicoapi/NicoApi");
    
    var NICO_URL_GETTHUMB_INFO = "http://ext.nicovideo.jp/api/getthumbinfo/";
    
    var MovieInfo = Backbone.Model.extend({
        url: NICO_URL_GETTHUMB_INFO,
        
        defaults: {
            id: null,
            
            title: null,
            description: null,
            length: null, // 秒数
            movieType: null, // "flv", "mp4"
            
            isDeleted: false,
            
            count: {
                view: -1,
                comments: -1,
                mylist: -1
            },
            
            tags: {
                // {name:string, isCategory:boolean, isLocked:boolean}
            },
            
            user: {
                id: -1,
                name: null,
                icon: null, // URL
            }
        },
        
        initialize: function () {
            this.fetch();
        },
        
        fetch: function (options) {
            if (this.id === null) {
                Global.console.error("動画IDを指定せずに動画情報を取得することはできません。");
                return $.Deferred().reject().promise();
            }
            
            options = options ? _.clone(options) : {};
            var dfd = $.Deferred(),
                model = this,
                success = options.success,
                jqxhr;
            
            model.trigger("request", model, jqxhr, options);
            
            // getThumbInfoの結果を取得
            jqxhr = Backbone.ajax({url: this.url + this.id});
            jqxhr
                .done(function (res, status, xhr) {
                    if (!model.set(model.parse(res, options), options)) return false;
                    
                    if (_.isFunction(success)) success(model, res, options);
                    dfd.resolve(model, res, options);
                    model.trigger("sync", model, res, options);
                })
                .fail(function (xhr) {
                    console.error("動画情報の取得に失敗しました。", arguments);
                    
                    if (xhr.status === 503) {
                        dfd.reject("たぶんニコニコ動画がメンテナンス中です。", model);
                    }
                    
                    model.trigger("error", model);
                });
            
            return dfd;
        },
        
        parse: function (res) {
            var $res = $(res),
                length = 0,
                val = _.clone(this.defaults);
            
            if ($res.find(":root").attr("status") !== "ok") {
                var errCode = $res.find("error code");
                console.error("MovieInfo: 動画情報の取得に失敗しました。 (%s)", $res.find("error description"));
                return {
                    isDeleted: errCode === "DELETED"
                };
            }
            
            $res = $res.find("thumb");
            
            // 動画の秒単位の長さを出しておく
            length = (function (length) {
                length = length.split(":");
                var s = length.pop()|0,
                    m = length.pop()|0,
                    h = length.pop()|0;
                
                return s + (m * 60) + (h * 3600);
            }($res.find("length").text()));
            
            _.extend(val, {
                id: $res.find("video_id").text(),
                
                title: $res.find("title").text(),
                description: $res.find("description").text(),
                length: length, // 秒数
                
                movieType: $res.find("movie_type").text(), // "flv"とか
                
                count: {
                    view: $res.find("view_counter").text()|0,
                    comments: $res.find("comment_num").text()|0,
                    mylist: $res.find("mylist_counter").text()|0
                },

                tags: $.map($res.find("tags[domain='jp'] tag"), function (tag) {
                    var $t = $(tag);
                    
                    return {
                        name: $t.text(),
                        isCategory: $t.attr("category") === "1",
                        isLocked: $t.attr("lock") === "1"
                    };
                }),

                user: {
                    id: $res.find("user_id").text()|0,
                    name: $res.find("user_nickname").text(),
                    icon: $res.find("user_icon_url").text(),
                }
            });
            
            return val;
        },
        
        isDeleted: function () {
            return this.get("isDeleted");
        },
        
        sync: function () {},
        save: function () {},
        destroy: function () {}
    });
    
    module.exports = MovieInfo;
});