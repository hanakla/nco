/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true */

/**
 * ニコニコ動画APIの動画情報モデルクラス
 * 
 * Properties
 * getメソッドで第１階層まで取得できます。Ex. NicoVideoInfo.get("user").id
 * 
 *  - id:String -- 動画ID
 *  - title:String -- 動画タイトル
 *  - description:String -- 動画説明文
 *  - length:Number -- 動画の長さ（秒）
 *  - movieType:String -- 動画のファイル種別(mp4, flv, swf)
 *  - thumbnail:String -- サムネイル画像のURL
 *  
 *  - count:Object -- カウンタ系の情報が詰められたオブジェクト
 *      - view:Number -- 再生数
 *      - comments:Number -- コメント数
 *      - mylist:Number -- マイリスト数
 *  
 *  - tags:Array.<{name:String, isCategory:Boolean, isLocked:Boolean}>
 *      -- 動画に設定されたタグ情報の配列
 *          - name:String -- タグ名
 *          - isCategory:Boolean -- カテゴリタグか
 *          - isLocked:Boolean -- ロックされているか
 * -  user:Object -- 投稿者情報
 *      - id:Number -- ユーザーID
 *      - name:String -- ユーザー名
 *      - icon: ユーザーアイコンURL
 * Events
 *  - sync:(model:NicoVideoInfo, xhr:jqXHR, options:Object) -- 動画情報が同期された時に発火します。
 *  - change:(model:NicoVideoInfo, options:Object) -- 動画情報が更新された時に発火します。
 *  - "change:[attribute]":(model:NicoVideoInfo, value:Object, options:Object)
 *      -- [attribute]に指定されたプロパティが変更された時に発火します。
 *  - error:(model:NicoVideoInfo) -- 同期に失敗した時に発火します。
 */
define(function (require, exports, module) {
    "use strict";
    
    var _           = require("thirdparty/lodash"),
        Backbone    = require("thirdparty/backbone"),
        Global      = require("utils/Global"),
        NicoUrl     = require("../impl/NicoUrl");
    
    var _instances = {};
    
    var NicoVideoInfo = Backbone.Model.extend({
        url: NicoUrl.Video.GET_VIDEO_INFO,
        
        defaults: {
            id: null,
            
            title: null,
            description: null,
            length: null, // 秒数
            movieType: null, // "flv", "mp4"
            thumbnail: null,
            
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
            _.bind(this, "isValid", "fetch", "parse", "isDeleted");
        },
        
        isValid: function () { return this.get("_isValid") === true; },
        isDeleted: function () { return this.get("isDeleted"); },
        
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
            
            // getThumbInfoの結果を取得
            jqxhr = Backbone.ajax({url: this.url + this.id});
            jqxhr
                .done(function (res, status, xhr) {
                    if (!model.set(model.parse(res, options), options)) return false;
                    
                    if (_.isFunction(success)) success(model, res, options);
                    dfd.resolve(model, res, options);
                    model.trigger("sync", model, res, options);
                })
                .fail(function (xhr, status, err) {
                    console.error("動画情報の取得に失敗しました。", arguments);
                    
                    if (xhr.status === 503) {
                        dfd.reject("たぶんニコニコ動画がメンテナンス中です。", model);
                    } else {
                        dfd.reject(err, model);
                    }
                    
                    model.trigger("error", model);
                });
            
            return dfd;
        },
        
        parse: function (res) {
            var $res = $(res),
                length = 0,
                val;
            
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
            
            val = {
                id: $res.find("video_id").text(),
                
                title: $res.find("title").text(),
                description: $res.find("description").text(),
                length: length, // 秒数
                movieType: $res.find("movie_type").text(), // "flv"とか
                thumbnail: $res.find("thumbnail_url").text(),
                
                isDeleted: false,
                
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
                },
                
                _isValid: true
            };
            
            return val;
        },
        
        sync: function () {},
        save: function () {},
        destroy: function () {}
    });
    
    /**
     * 動画情報インスタンスを取得します。
     * @param {string} liveId 取得したい動画のID
     */
    function _getInstance(videoId) {
        var instance = _instances[videoId];
        
        // 指定された動画の動画情報インスタンスがキャッシュされていればそれを返す
        // キャッシュに対応する動画情報インスタンスがなければ、新規作成してキャッシュ
        return instance || (_instances[videoId] = new NicoVideoInfo({id: videoId}));
    }
    
    /**
     * オブジェクトがNicoVideoInfoのインスタンスか検証します。
     * @param {Object} obj
     */
    function _isInstance(obj) {
        return obj instanceof NicoVideoInfo;
    }
    
    module.exports = _getInstance;
    module.exports.isInstance = _isInstance;
});