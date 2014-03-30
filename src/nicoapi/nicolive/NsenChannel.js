/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true */
define(function (require, exports, module) {
    "use strict";
    
    var _               = require("thirdparty/lodash"),
        Backbone        = require("thirdparty/backbone"),
        Global          = require("utils/Global"),
        NicoApi         = require("../NicoApi"),
        NicoLiveApi     = require("../NicoLiveApi"),
        NicoLiveInfo    = require("./NicoLiveInfo"),
        NicoMovieInfo   = require("../niconico/NicoMovieInfo"),
        StringUtil      = require("utils/StringUtil");
    
    /**
     * v=放送id
     * id=動画ID / 動画URL
     */
    var NSEN_URL_REQUEST = "http://live.nicovideo.jp/api/nsenrequest?v=%s&id=%s",
        NSEN_URL_REQUEST_CANCEL = "http://live.nicovideo.jp/api/nsenrequest?v=%s&mode=cancel",
        NSEN_URL_REQUEST_SYNC = "http://live.nicovideo.jp/api/nsenrequest?v=%s&mode=requesting",
        NSEN_URL_GOOD = "http://ow.live.nicovideo.jp/api/nsengood?v=%s",
        NSEN_URL_SKIP = "http://ow.live.nicovideo.jp/api/nsenskip?v=%s";
    
    /**
     * @constructer
     * 
     * Nsenのチャンネルと対応するモデルです。
     * リクエストの送信とキャンセル、再生中の動画の取得と監視ができます。
     * 
     * TODO:
     *  Good / Skip の送信
     *  WaitListの取得
     * 
     * 以下のイベントを発火させます。
     *  - moviechanged: (NsenChannel, NicoMovieInfo, NicoMovieInfo)
     *      動画が変わったことを通知します。
     *      第２引数に変更後の動画の情報が渡され、
     *      第３引数には変更前の動画の情報が渡されます。
     * 
     *  - requested: (NsenChannel, NicoMovieInfo)
     *      動画のリクエスト完了を通知します。
     *      第２引数にリクエストされた動画の情報が渡されます。
     * 
     *  - cancelled: (NsenChannel, NicoMovieInfo)
     *      動画のリクエストがキャンセルされたことを通知します。
     *      第２引数にキャンセルされた動画の情報が渡されます。
     * 
     *  - thumbsup: ()
     *      Goodが送信された時に発火します。
     * 
     *  - skipin: ()
     *      SkipRequestが送信された時に発火します。
     * 
     * @param {LiveInfo} liveInfo Nsenチャンネルとして扱う配信情報オブジェクト
     */
    var NsenChannel = Backbone.Model.extend({
        _live: null,
        _commentProvider: null,
        _requestedMovie: null,
        _playingMovie: null,
        
        initialize: function (liveInfo) {
            _.bindAll(this, "_liveInfoUpdated", "fetch", "sendRequest",
                "cancelRequest", "pushGood", "pushSkip");
            
            // 配信情報
            this._live = liveInfo;
            this._commentProvider = NicoLiveApi.getCommentProvider(liveInfo);
            
            // 配信情報が更新された時
            liveInfo.on("sync", this._liveInfoUpdated);
            
            // コメントを受信した時
            this._commentProvider.on("add", function () {});
            
            this.fetch();
        },
        
        getCurrentVideo: function () {
            return this._playingMovie;
        },
        
        /**
         * 配信情報が更新された時に実行される
         * 再生中の動画などのデータを取得する
         * @param {NicoLiveInfo} live
         */
        _liveInfoUpdated: function (live) {
            var self = this,
                content = live.get("stream").contents[0],
                oldMovie = this._playingMovie,
                videoId;
            
            videoId = content.content.match(/smile:((?:sm|nm)[1-9][0-9]*)/);
            
            if (videoId) {
                videoId = videoId[1];
            } else {
                Global.console.error("動画IDが取得できません。");
                return;
            }
            
            // 直前の再生中動画と異なれば情報を更新
            if (!this._playingMovie || this._playingMovie.id !== videoId) {
                NicoApi.getMovieInfo(videoId)
                    .done(function (movie) {
                        self._playingMovie = movie;
                        self.trigger("moviechanged", self, movie, oldMovie);
                    });
                
                // 次に動画が変わったタイミングで配信情報を更新させる
                if (content.duration !== -1) {
                    var date = new Date(),
                        changeAt = (content.startTime.getTime() + (content.duration * 1000)),
                        timeLeft = changeAt - date.getTime() + 1000; // 再生終了までの残り時間
                    
                    setTimeout(function () { live.fetch(); }, timeLeft);
                }
            }
        },
        
        fetch: function () {
            // リクエストした動画の情報を取得
            var self = this,
                url = StringUtil.format(NSEN_URL_REQUEST_SYNC, this._live.get("stream").liveId);
            
            Backbone.ajax(url)
                .done(function (res) {
                    var $res = $(res),
                        videoId;
                    
                    if ($res.attr("status") === "ok") {
                        // リクエストの取得に成功したら動画情報を同期
                        videoId =  $res.find("id").text();
                        
                        // 直前にリクエストした動画と内容が異なれば
                        // 新しい動画に更新
                        if (!self._requestedMovie || self._requestedMovie.id !== videoId) {
                            NicoApi.getMovieInfo(videoId)
                                .done(function (movie) {
                                    self._requestedMovie = movie;
                                });
                        }
                    }
                });
            
            // 番組情報を確認する
            this._liveInfoUpdated(this._live);
        },
        
        sync: function () {},
        destroy: function () {},
        save: function () {},
        
        
        /**
         * リクエストを送信します。
         * @param {NicoMovieInfo} movie リクエストする動画のNicoMovieInfoオブジェクト
         * @return {$.Deferred}
         */
        sendRequest: function (movie) {
            if (! movie instanceof NicoMovieInfo) {
                return;
            }
            
            this._requestedMovie = movie;
            
            var deferred = $.Deferred(),
                liveId = this._live.get("stream").liveId,
                movieId = movie.id,
                url = StringUtil.format(NSEN_URL_REQUEST, liveId, movieId);
            
            // NsenAPIにリクエストを送信する
            Backbone.ajax(url)
            
                // 送信に成功したら、正しくリクエストされたか確認する
                .done(function (res) {
                    var $res = $(res),
                        status = $res.attr("status") === "ok";
                    
                    if (status) {
                        deferred.resolve({result: status});
                    } else {
                        // 何かしらのエラーが起きた
                        deferred.reject({result: status, message: $res.find("error code").text()});
                    }
                })
            
            .fail(function (xhr, stat, err) {
                // 通信エラーが起きたらDeferredをリジェクト
                deferred.reject({result: false, message: err});
            });
            
            return deferred;
        },
        
        
        /**
         * リクエストをキャンセルします
         * 事前にリクエストが送信されていない場合はなにもしません。
         * @return {$.Deferred}
         */
        cancelRequest: function () {
            if (! this._requestedMovie) {
                var obj = {result: false, message: "リクエストした動画はありません"};
                return $.Deferred().reject(obj).promise();
            }
            
            var self        = this,
                deferred    = $.Deferred(),
                liveId      = this._live.get("stream").liveId,
                requestMovie = self._requestedMovie,
                url         = StringUtil.format(NSEN_URL_REQUEST_CANCEL, liveId);
            
            Backbone.ajax(url)
            
                // キャンセルの送信が成功したら
                .done(function (res) {
                    var $res = $(res),
                        status = ret.result = $res.attr("status") === "ok";
                    
                    if (status) {
                        self.trigger("cancelled", self, self._requestedMovie);
                        deferred.resolve({result: status});
                    } else {
                        deferred.reject({result: status, message: $res.find("error code").text()});
                    }
                })
                
                // 通信に失敗
                .fail(function (xhr, stat, err) {
                    deferred.reject({result:false, message:err});
                });
            
            return deferred;
        },
        
        
        /**
         * Goodを送信します。
         * @return {$.Deferred}
         */
        pushGood: function () {
            var deferred = $.Deferred(),
                liveId = this._live.get("stream").liveId;
            
            Backbone.ajax(StringUtil.format(NSEN_URL_GOOD, liveId))
                .done(function (res) {
                    var $res = $(res),
                        status = ret.result = $res.attr("status") === "ok";
                    
                    if (status) {
                        self.trigger("thumbsup");
                        deferred.resolve({result: status});
                    } else {
                        deferred.reject({result: status, message: $res.find("error code").text()});
                    }
                })
                
                // 通信に失敗
                .fail(function (xhr, stat, err) {
                    deferred.reject({result:false, message:err});
                });
        },
        
        /**
         * SkipRequestを送信します。
         * @return {$.Deferred}
         */
        pushSkip: function () {
            var deferred = $.Deferred(),
                liveId = this._live.get("stream").liveId;
            
            Backbone.ajax(StringUtil.format(NSEN_URL_SKIP, liveId))
                .done(function (res) {
                    var $res = $(res),
                        status = ret.result = $res.attr("status") === "ok";
                    
                    if (status) {
                        self.trigger("skipin");
                        deferred.resolve({result: status});
                    } else {
                        deferred.reject({result: status, message: $res.find("error code").text()});
                    }
                })
                
                // 通信に失敗
                .fail(function (xhr, stat, err) {
                    deferred.reject({result:false, message:err});
                });
            
            return deferred;
        }
    });
    
    /**
     * @constructer
     * @param {LiveInfo} liveInfo Nsenチャンネルとして扱う配信情報オブジェクト
     */
    function NsenChannelProxy(liveInfo) {
        if (! liveInfo instanceof NicoLiveInfo) {
            throw new Error("値がNicoLiveInfoオブジェクトではありません。");
        }
        
        if (! liveInfo.isNsen()) {
            throw new Error("この放送はNsenのチャンネルではありません。");
        }
        
        return new NsenChannel(liveInfo);
    }
    
    module.exports = NsenChannelProxy;
});