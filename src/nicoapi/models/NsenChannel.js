/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true, eqnull: true */

/**
 * Nsenのチャンネルと対応するモデルです。
 * リクエストの送信とキャンセル、再生中の動画の取得と監視ができます。
 * 
 * TODO:
 *  WaitListの取得
 * 
 * Methods
 *  - getCurrentVideo():NicoVideoInfo|null -- 現在再生中の動画情報を取得します。
 *  - getChannelType():string -- チャンネルの種別を取得します。（nsen/***の"***"の部分だけ）
 *  - isSkipRequestable():boolean -- 今現在、スキップリクエストを送ることができるか検証します。
 *  - sendRequest(movie:NicoVideoInfo) -- リクエストを送信します。
 *  - cancelRequest() -- リクエストをキャンセルします。
 *  - pushGood() -- Goodを送信します。
 *  - pushSkip() -- SkipRequestを送信します。
 * 
 * Events
 *  - videochanged:(video:NicoVideoInfo|null, beforeVideo:NicoVideoInfo|null)
 *      再生中の動画が変わった時に発火します。第２引数に変更後の動画の情報が渡され、第３引数には変更前の動画の情報が渡されます。
 *  - requested:(video:NicoVideoInfo)
 *      リクエストが完了した時に発火します。第２引数にリクエストされた動画の情報が渡されます。
 *  - cancelled:(video:NicoVideoInfo)
 *      リクエストがキャンセルされた時に発火します。第２引数にキャンセルされた動画の情報が渡されます。
 * 
 *  - thumbsup:() -- Goodが送信された時に発火します。
 *  - skipin:() -- SkipRequestが送信された時に発火します。
 * 
 *  - goodcall:() -- 誰かがGoodを送信した時に発火します。
 *  - mylistcall:() -- 誰かが動画をマイリストに追加した時に発火します。
 * 
 *  - skipAvailable:() -- スキップリクエストが送信可能になった時に発火します。
 * 
 *  - closing:(liveId:string)
 *      午前４時くらいから送られ始める、更新リクエストを受け取った時に発火します。
 *      第２引数は移動先の放送IDです。
 * 
 *  - closed:() -- 配信が終了した時に発火します。
 * 
 * @param {LiveInfo} liveInfo Nsenチャンネルとして扱う配信情報オブジェクト
 */
define(function (require, exports, module) {
    "use strict";
    
    var _               = require("thirdparty/lodash"),
        Backbone        = require("thirdparty/backbone"),
        Global          = require("utils/Global"),
        NicoVideoApi    = require("../impl/NicoVideoApi"),
        NicoVideoInfo   = require("./NicoVideoInfo"),
        NicoUrl         = require("../impl/NicoUrl"),
        StringUtil      = require("utils/StringUtil");
    
    var RequestErrors = {
        nsen_close: "現在リクエストを受け付けていません。"
    };
    
    var _instances = {};
    
    function descapeHTML(str) {
        return str.replace(/&lt;/g, "<")
                    .replace(/&gt;/g, ">")
                    .replace(/&amp;/g, "&")
                    .replace(/&quot;/g, "\"")
                    .replace(/&#39;/g, "'");
    }
    
    /**
     * v=放送id
     * id=動画ID / 動画URL
     */
    
    var NSEN_URL_REQUEST = NicoUrl.Live.NSEN_REQUEST,
        NSEN_URL_REQUEST_CANCEL = NicoUrl.Live.NSEN_REQUEST_CANCEL,
        NSEN_URL_REQUEST_SYNC = NicoUrl.Live.NSEN_REQUEST_SYNC,
        NSEN_URL_GOOD = NicoUrl.Live.NSEN_GOOD,
        NSEN_URL_SKIP = NicoUrl.Live.NSEN_SKIP,
        
        CommentRegExp = {
            good: /^\/nspanel show goodClick/i,
            mylist: /^\/nspanel show mylistClick/i,
            reset: /^\/reset (lv[0-9]*)/i
        };
    
    var NsenChannel = Backbone.Model.extend({
        _live: null,
        _commentProvider: null,
        
        _requestedMovie: null,
        _playingMovie: null,
        _lastSkippedMovieId: null,
        
        initialize: function (liveInfo) {
            _.bindAll(this, "_commentReceived", "_onVideoChange",
                "_onLiveClosed", "_liveInfoUpdated");
            
            // 必要なオブジェクトをキープ
            this._live = liveInfo;
            this._commentProvider = liveInfo.getCommentProvider();
            
            // イベントリスニング
            liveInfo
                .on("sync", this._liveInfoUpdated) // 配信情報が更新された時
                .on("closed", this._onLiveClosed); // 放送が終了した時
            
            this._commentProvider
                .on("add", this._commentReceived); // コメントを受信した時
            
            this.on("videochanged", this._onVideoChange); // 再生中の動画が変わった時
            
            this.fetch();
        },
        
        //
        // イベントリスナ
        //
        _commentReceived: function (comment) {
            if (comment.isControl() || comment.isDistributorPost()) {
                var com = comment.get("comment");
                
                if (CommentRegExp.good.test(com)) {
                    // 誰かがGood押した
                    this.trigger("goodcall");
                    return;
                }
                
                if (CommentRegExp.mylist.test(com)) {
                    // 誰かがマイリスに追加した
                    this.trigger("mylistcall");
                    return;
                }
                
                if (CommentRegExp.reset.test(com)) {
                    // ページ移動リクエストを受け付けた
                    var liveId = CommentRegExp.reset.exec(com);
                    liveId = liveId[0];
                    this.trigger("closing", liveId);
                }
            }
        },
        
        _onVideoChange: function () {
            this._lastSkippedMovieId = null;
            this.trigger("skipAvailable");
        },
        
        _onLiveClosed: function () {
            this.trigger("closed");
            
            this._commentProvider = null;
            this.off();
        },
        
        /**
         * 配信情報が更新された時に実行される
         * 再生中の動画などのデータを取得する
         * @param {NicoLiveInfo} live
         */
        _liveInfoUpdated: function (live) {
            var self = this,
                beforeVideo = this._playingMovie,
                content = live.get("stream").contents[0],
                videoId;
            
            videoId = content && content.content.match(/^smile:((?:sm|nm)[1-9][0-9]*)/);
            videoId = videoId ? videoId[1] : null;
            
            if (!videoId) {
                Global.console.info("再生中の動画が不明です。");
                this._playingMovie = null;
                self.trigger("videochanged", null, beforeVideo);
                return;
            }
            
            if (!this._playingMovie || this._playingMovie.id !== videoId) {
                
                // 直前の再生中動画と異なれば情報を更新
                NicoVideoApi.getVideoInfo(videoId)
                    .done(function (movie) {
                        self._playingMovie = movie;
                        self.trigger("videochanged", movie, beforeVideo);
                    });
                
                // 次に動画が変わるタイミングで配信情報を更新させる
                if (content.duration !== -1) {
                    var date = new Date(),
                        changeAt = (content.startTime.getTime() + (content.duration * 1000)),
                        timeLeft = changeAt - date.getTime() + 2000; // 再生終了までの残り時間
                    
                    setTimeout(function () { live.fetch(); }, timeLeft);
                }
            }
        },
        
        //
        // 非公開メソッド
        //
        fetch: function () {
            // リクエストした動画の情報を取得
            var self = this,
                url = StringUtil.format(NSEN_URL_REQUEST_SYNC, this._live.get("stream").liveId);
            
            $.ajax(url)
                .done(function (res) {
                    var $res = $(res),
                        videoId;
                    
                    if ($res.attr("status") === "ok") {
                        // リクエストの取得に成功したら動画情報を同期
                        videoId =  $res.find("id").text();
                        
                        // 直前にリクエストした動画と内容が異なれば
                        // 新しい動画に更新
                        if (!self._requestedMovie || self._requestedMovie.id !== videoId) {
                            NicoVideoApi.getVideoInfo(videoId)
                                .done(function (movie) {
                                    self._requestedMovie = movie;
                                    self.trigger("requested", self, movie);
                                });
                        }
                    }
                });
        },
        
        //
        // 公開メソッド
        //
        getChannelType: function () {
            return this._live.get("stream").nsenType;
        },
        
        getCurrentVideo: function () {
            return this._playingMovie;
        },
        
        isSkipRequestable: function () {
            return this._lastSkippedMovieId !== this.getCurrentVideo().id;
        },
        
        /**
         * リクエストを送信します。
         * @param {NicoVideoInfo} movie リクエストする動画のNicoVideoInfoオブジェクト
         * @return {$.Promise}
         */
        sendRequest: function (movie) {
            if (! movie instanceof NicoVideoInfo) {
                return;
            }
            
            this._requestedMovie = movie;
            
            var deferred = $.Deferred(),
                liveId = this._live.get("stream").liveId,
                movieId = movie.id,
                url = StringUtil.format(NSEN_URL_REQUEST, liveId, movieId);
            
            // NsenAPIにリクエストを送信する
            $.ajax(url)
            
                // 送信に成功したら、正しくリクエストされたか確認する
                .done(function (res) {
                    var $res = $(res).find(":root"),
                        status = $res.attr("status") === "ok";
                    
                    if (status) {
                        deferred.resolve({result: status});
                    } else {
                        // 何かしらのエラーが起きた
                        var errCode = $res.find("error code").text(),
                            reason = RequestErrors[errCode];
                        
                        if (reason == null) {
                            reason = errCode;
                        }
                        
                        deferred.reject({result: status, message: $res.find("error code").text()});
                    }
                })
            
            .fail(function (xhr, stat, err) {
                // 通信エラーが起きたらDeferredをリジェクト
                deferred.reject({result: false, message: err});
            });
            
            return deferred.promise();
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
            
            $.ajax(url)
            
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
            
            return deferred.promise();
        },
        
        
        /**
         * Goodを送信します。
         * @return {$.Deferred}
         */
        pushGood: function () {
            var self = this,
                deferred = $.Deferred(),
                liveId = this._live.get("stream").liveId;
            
            $.ajax(StringUtil.format(NSEN_URL_GOOD, liveId))
                .done(function (res) {
                    var $res = $(res).find(":root"),
                        status = $res.attr("status") === "ok";
                    
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
            
            return deferred.promise();
        },
        
        /**
         * SkipRequestを送信します。
         * @return {$.Deferred}
         */
        pushSkip: function () {
            var self = this,
                deferred = $.Deferred(),
                liveId = this._live.get("stream").liveId,
                movieId = this.getCurrentVideo().id;
            
            if (! this.isSkipRequestable()) {
                var obj = {result: false, message: "スキップリクエストはすでに送られています。"};
                return $.Deferred().reject(obj).promise();
            }
            
            $.ajax(StringUtil.format(NSEN_URL_SKIP, liveId))
                .done(function (res) {
                    var $res = $(res).find(":root"),
                        status = $res.attr("status") === "ok";
                    
                    if (status) {
                        self._lastSkippedMovieId = movieId;
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
            
            return deferred.promise();
        },
        
        sync: _.noop,
        destroy: _.noop,
        save: _.noop,
    });
    
    /**
     * @constructer
     * @param {LiveInfo} liveInfo Nsenチャンネルとして扱う配信情報オブジェクト
     */
    function NsenChannelProxy(liveInfo) {
        if (!require("./NicoLiveInfo").isInstance(liveInfo)) {
            throw new Error("値がNicoLiveInfoオブジェクトではありません。");
        }
        
        if (_instances[liveInfo.id]) {
            return _instances[liveInfo.id];
        }
        
        if (!liveInfo.isNsen()) {
            throw new Error(liveInfo.id + " この放送はNsenチャンネルではありません。");
        }
        
        _instances[liveInfo.id] = new NsenChannel(liveInfo);
        return _instances[liveInfo.id];
    }
    
    
    module.exports = NsenChannelProxy;
});