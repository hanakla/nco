/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true, eqnull: true */
/*global $, define*/

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
 *      再生中の動画が変わった時に発火します。
 *      第２引数に変更後の動画の情報が渡され、第３引数には変更前の動画の情報が渡されます。
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
        NicoLiveInfo    = require("./NicoLiveInfo"),
        NicoUrl         = require("../impl/NicoUrl"),
        StringUtil      = require("utils/StringUtil");
    
    var NSEN_URL_REQUEST = NicoUrl.Live.NSEN_REQUEST,
        NSEN_URL_REQUEST_CANCEL = NicoUrl.Live.NSEN_REQUEST_CANCEL,
        NSEN_URL_REQUEST_SYNC = NicoUrl.Live.NSEN_REQUEST_SYNC,
        NSEN_URL_GOOD = NicoUrl.Live.NSEN_GOOD,
        NSEN_URL_SKIP = NicoUrl.Live.NSEN_SKIP;
    
    /**
     * Nsenリクエスト時のエラーコード
     * @const {Object.<string, string>}
     */
    var RequestErrors = {
        nsen_close: "現在リクエストを受け付けていません。",
        nsen_tag: "リクエストに必要なタグが登録されていません。",
        nsen_long: "動画が長過ぎます。",
        nsen_requested: "リクエストされたばかりです。"
    };
    
    /**
     * コメント種別判定パターン
     * @const {Object.<string, RegExp>}
     */
    var CommentRegExp = {
        good: /^\/nspanel show goodClick/i,
        mylist: /^\/nspanel show mylistClick/i,
        reset: /^\/reset (lv[0-9]*)/i
    };
    
    
    /**
     * 各チャンネル毎のインスタンス
     * @type {Object.<string, NsenChannel>}
     */
    var _instances = {};
    
    /**
     * イベントリスナ
     * @type {Object.<string, Object.<string, function()>>}
     */
    var _listeners = {
        "NicoLiveInfo": {
            "sync": _onLiveInfoUpdated,
            "closed": _onLiveClosed
        },
        "CommentProvider": {
            "add": _onCommentAdded
        }
    };
    
    /**
     * Nsenチャンネルのハンドラです。
     * チャンネル上で発生するイベントを検知して通知します。
     * @constructor
     * @param {NicoLiveInfo} liveInfo Nsenの配信を指すLiveInfoオブジェクト
     */
    function NsenChannel(liveInfo) {
        if (!liveInfo instanceof NicoLiveInfo) {
            throw new Error("オブジェクトはNicoLiveInfoインスタンスではありません");
        }
        
        if (liveInfo.isNsen() === false) {
            throw new Error("Nsenの放送ではありません。");
        }
        
        // インスタンス重複チェック
        var nsenType = liveInfo.get("stream").nsenType;
        if (_instances[nsenType] != null) {
            return _instances[nsenType];
        }
        
        // 必要なオブジェクトを取得
        this._live = liveInfo;
        this._commentProvider = liveInfo.getCommentProvider();
        
        // イベントリスニング
        _startListening(this);
        
        // 再生中の動画が変わった時
        this.on("videochanged", function () {
            this._lastSkippedMovieId = null;
            this.trigger("skipAvailable");
        });
        
        _instances[nsenType] = this;

        this.fetch();
    }
    
    // Backbone.Eventsを継承
    NsenChannel.prototype = Object.create(Backbone.Collection.prototype);
    NsenChannel.prototype.constructor = NsenChannel;
    NsenChannel.prototype.parentClass = Backbone.Collection.prototype;
    
    /**
     * @private
     * @type {NicoLiveInfo}
     */
    NsenChannel.prototype._live = null;
    
    /**
     * @private
     * @type {CommentProvider}
     */
    NsenChannel.prototype._commentProvider = null;
    
    /**
     * 再生中の動画情報
     * @private
     * @type {NicoLiveInfo}
     */
    NsenChannel.prototype._playingMovie = null;
    
    /**
     * 最後にリクエストした動画情報
     * @private
     * @type {NicoVideoInfo}
     */
    NsenChannel.prototype._requestedMovie = null;
    
    /**
     * 最後にスキップした動画のID。
     * 比較用なので動画IDだけ。
     * @private
     * @type {string}
     */
    NsenChannel.prototype._lastSkippedMovieId = null;
    
    
    /**
     * チャンネルの種類を取得します。
     * @return {string} "vocaloid", "toho"など
     */
    NsenChannel.prototype.getChannelType = function () {
        return this._live.get("stream").nsenType;
    };
    
    /**
     * 現在再生中の動画情報を取得します。
     * @return {?NicoVideoInfo}
     */
    NsenChannel.prototype.getCurrentVideo =function () {
        return this._playingMovie;
    };
    
    /**
     * スキップリクエストを送信可能か確認します。
     * 基本的には、skipinイベント、skipAvailableイベントで
     * 状態の変更を確認するようにします。
     * @return {boolean}
     */
    NsenChannel.prototype.isSkipRequestable = function () {
        var video = this.getCurrentVideo();
        return video != null && this._lastSkippedMovieId !== video.id;
    };
    
    /**
     * サーバー側の情報とインスタンスの情報を同期します。
     * @return {jQuery.Promise}
     */
    NsenChannel.prototype.fetch = function () {
        if (this._live == null) {
            var obj = new Error("放送情報が割り当てられていません。");
            return $.Deferred().reject(obj).promise();
        }
        
        // リクエストした動画の情報を取得
        var self = this,
            dfd = $.Deferred(),
            liveId = this._live.get("stream").liveId,
            url = StringUtil.format(NSEN_URL_REQUEST_SYNC, liveId);

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
                                dfd.resolve();
                            })
                            .fail(function (msg) {
                                dfd.reject(new Error(msg));
                            });
                    }
                }
            })
            .fail(function (jqxhr, status, err) {
                dfd.reject(new Error(err));
            });
        
        return dfd.promise();
    };
    
    /**
     * リクエストを送信します。
     * @param {NicoVideoInfo} movie リクエストする動画のNicoVideoInfoオブジェクト
     * @return {jQuery.Promise} リクエストに成功したらresolveされます。
     *    リクエストに失敗した時、Errorオブジェクトつきでrejectされます。
     */
    NsenChannel.prototype.sendRequest = function (movie) {
        // TODO: インスタンス比較方法の修正
        //（NicoVideoInfoクラスの外部公開）
        if (!NicoVideoInfo.isInstance(movieId)) {
            return;
        }
        
        var self = this,
            dfd = $.Deferred(),
            liveId = this._live.get("stream").liveId,
            movieId = movie.id,
            url = StringUtil.format(NSEN_URL_REQUEST, liveId, movieId);

        // NsenAPIにリクエストを送信する
        $.ajax(url)
            .done(function (res) {
                // 送信に成功したら、正しくリクエストされたか確認する
                var $res = $(res).find(":root"),
                    result = $res.attr("status") === "ok";

                if (result) {
                    // リクエスト成功
                    self._requestedMovie = movie;
                    self.trigger("requested", movie);
                    dfd.resolve();
                } else {
                    // リクエスト失敗
                    // エラーメッセージを取得
                    var errCode = $res.find("error code").text(),
                        reason = RequestErrors[errCode];

                    if (reason == null) {
                        reason = errCode;
                    }

                    dfd.reject(new Error(reason));
                }
            })
            .fail(function (xhr, stat, err) {
                // 通信エラーが起きたらDeferredをリジェクト
                dfd.reject(new Error("通信エラー: " + err));
            });

        return dfd.promise();
    };
    
    /**
     * リクエストをキャンセルします
     * @return {jQuery.Promise} キャンセルに成功すればresolveされます。
     *    リクエストに失敗した時、Errorオブジェクトつきでrejectされます。
     *    事前にリクエストが送信されていない場合も同様です。
     */
    NsenChannel.prototype.cancelRequest = function () {
        if (! this._requestedMovie) {
            var err = new Error("リクエストした動画はありません");
            return $.Deferred().reject(err).promise();
        }

        var self        = this,
            deferred    = $.Deferred(),
            liveId      = this._live.get("stream").liveId,
            url         = StringUtil.format(NSEN_URL_REQUEST_CANCEL, liveId);

        // NsenAPIにリクエストキャンセルを送信
        $.ajax(url)
            .done(function (res) {
                // キャンセルの送信が成功したら
                var $res = $(res),
                    result = $res.attr("status") === "ok";

                if (result) {
                    self.trigger("cancelled", self._requestedMovie);
                    self._requestedMovie = null;
                    deferred.resolve();
                } else {
                    deferred.reject(new Error($res.find("error code").text()));
                }
            })
            .fail(function (xhr, stat, err) {
                // 通信に失敗
                deferred.reject(new Error(err));
            });

        return deferred.promise();
    };
    
    /**
     * Goodを送信します。
     * @return {jQuery.Promise} 成功したらresolveされます。
     *    失敗した時、Errorオブジェクトつきでrejectされます。
     */
    NsenChannel.prototype.pushGood = function () {
        var self = this,
            deferred = $.Deferred(),
            liveId = this._live.get("stream").liveId;

        $.ajax(StringUtil.format(NSEN_URL_GOOD, liveId))
            .done(function (res) {
                var $res = $(res).find(":root"),
                    result = $res.attr("status") === "ok";

                if (result) {
                    self.trigger("thumbsup");
                    deferred.resolve();
                } else {
                    deferred.reject(new Error($res.find("error code").text()));
                }
            })

            // 通信に失敗
            .fail(function (xhr, stat, err) {
                deferred.reject(new Error(err));
            });

        return deferred.promise();
    };
    
    /**
     * SkipRequestを送信します。
     * @return {jQuery.Promise} 成功したらresolveされます。
     *    失敗した時、Errorオブジェクトつきでrejectされます。
     */
    NsenChannel.prototype.pushSkip = function () {
        var self = this,
            deferred = $.Deferred(),
            liveId = this._live.get("stream").liveId,
            movieId = this.getCurrentVideo().id;

        if (! this.isSkipRequestable()) {
            var obj = new Error("スキップリクエストはすでに送られています。");
            return $.Deferred().reject(obj).promise();
        }

        $.ajax(StringUtil.format(NSEN_URL_SKIP, liveId))
            .done(function (res) {
                var $res = $(res).find(":root"),
                    status = $res.attr("status") === "ok";

                if (status) {
                    self._lastSkippedMovieId = movieId;
                    self.trigger("skipin");
                    deferred.resolve();
                } else {
                    deferred.reject(new Error($res.find("error code").text()));
                }
            })

            // 通信に失敗
            .fail(function (xhr, stat, err) {
                deferred.reject(new Error(err));
            });

        return deferred.promise();
    };
    
    
    /**
     * 関係イベントのリスニングを開始します。
     * @param {NsenChannel} self
     */
    function _startListening(self) {
        if (self._live != null) {
            _.each(_listeners.NicoLiveInfo, function (fn, ev) {
                self._live.on(ev, fn);
            });
        }
        
        if (self._commentProvider) {
            _.each(_listeners.CommentProvider, function (fn, ev) {
                self._commentProvider.on(ev, fn);
            });
        }
    }
    
    /**
     * 関係イベントのリスニングを止めます。
     * @param {NsenChannel} self
     */
    function _stopListening(self) {
        if (self._live != null) {
            _.each(_listeners.NicoLiveInfo, function (fn, ev) {
                self._live.off(ev, fn);
            });
        }
        
        if (self._commentProvider != null) {
            _.each(_listeners.CommentProvider, function (fn, ev) {
                self._commentProvider.off(ev, fn);
            });
        }
    }
    
    
    //
    // イベントリスナ
    //
    /**
     * コメントを受信した時のイベントリスナ。
     * 制御コメントの中からNsen内イベントを通知するコメントを取得して
     * 関係するイベントを発火させます。
     * @param {LiveComment} comment
     */
    function _onCommentAdded(comment) {
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
    }
    
    /**
     * 放送が終了した時のイベントリスナ
     */
    function _onLiveClosed() {
        this.trigger("closed");
        
        this._live = null;
        this._commentProvider = null;
        this.off();
        
        _stopListening(this);
    }
    
    /**
     * 配信情報が更新された時に実行される
     * 再生中の動画などのデータを取得する
     * @param {NicoLiveInfo} live
     */
    function _onLiveInfoUpdated(live) {
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
    }
    
    
    module.exports = NsenChannel;
    module.exports.Errors = {};
    module.exports.Errors.Request = _.clone(RequestErrors);
});