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
 *  - getLiveInfo():NicoLiveInfo -- 現在接続中の配信のNicoLiveInfoオブジェクトを取得します。
 *  - getCurrentVideo():NicoVideoInfo|null -- 現在再生中の動画情報を取得します。
 *  - getChannelType():string -- チャンネルの種別を取得します。（nsen/***の"***"の部分だけ）
 *  - isSkipRequestable():boolean -- 今現在、スキップリクエストを送ることができるか検証します。
 *  - sendRequest(movie:NicoVideoInfo) -- リクエストを送信します。
 *  - cancelRequest() -- リクエストをキャンセルします。
 *  - pushGood() -- Goodを送信します。
 *  - pushSkip() -- SkipRequestを送信します。
 *  - moveToNextLive() -- 次の配信情報を受け取っていれば、次の配信へ移動します。
 * 
 * Events
 *  - liveSwapped:(newLive:NicoLiveInfo)
 *      午前４時以降、インスタンス内部で参照している放送が切り変わった時に発火します。
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
        NicoLiveApi     = require("../impl/NicoLiveApi"),
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
        if (_instances[nsenType] != null && this._nextLiveId == null) {
            return _instances[nsenType];
        }
        
        _.bindAll(this, "_onCommentAdded", "_onLiveInfoUpdated",
            "_onDetectionClosing", "_onLiveClosed", "_onVideoChanged");
        
        // 必要なオブジェクトを取得
        this._live = liveInfo;
        this._commentProvider = liveInfo.getCommentProvider();
        
        // イベントリスニング
        this._live
            .on("sync", this._onLiveInfoUpdated)
            .on("closed", this._onLiveClosed);
        
        this._commentProvider
            .on("add", this._onCommentAdded);
        
        this
            .on("videochanged", this._onVideoChanged) // 再生中の動画が変わった時
            .on("closing", this._onDetectionClosing); // 配信終了前イベントが発された時
        
        _instances[nsenType] = this;

        this.fetch();
    }
    
    // Backbone.Eventsを継承
    NsenChannel.prototype = Object.create(Backbone.Events);
    NsenChannel.prototype.constructor = NsenChannel;
    NsenChannel.prototype.parentClass = Backbone.Events;
    
    
    //
    // プロパティ
    //
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
     * 移動先の配信のID
     * @type {string}
     */
    NsenChannel.prototype._nextLiveId = null;
    
    
    //
    // イベントリスナ
    //
    /**
     * コメントを受信した時のイベントリスナ。
     * 制御コメントの中からNsen内イベントを通知するコメントを取得して
     * 関係するイベントを発火させます。
     * @param {LiveComment} comment
     */
    NsenChannel.prototype._onCommentAdded = function (comment) {
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
                liveId = liveId[1];
                this.trigger("closing", liveId);
            }
        }
    };
    
    /**
     * 配信情報が更新された時に実行される
     * 再生中の動画などのデータを取得する
     * @param {NicoLiveInfo} live
     */
    NsenChannel.prototype._onLiveInfoUpdated = function (live) {
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
    };
    
    /**
     * チャンネルの内部放送IDの変更を検知するリスナ
     * @param {string} nextLiveId
     */
    NsenChannel.prototype._onDetectionClosing = function (nextLiveId) {
        this._nextLiveId = nextLiveId;
    };
    
    /**
     * 放送が終了した時のイベントリスナ
     */
    NsenChannel.prototype._onLiveClosed = function () {
        this.trigger("closed");
        
        // 放送情報を差し替え
        this.moveToNextLive();
    };
    
    /**
     * 再生中の動画が変わった時のイベントリスナ
     */
    NsenChannel.prototype._onVideoChanged = function () {
        this._lastSkippedMovieId = null;
        this.trigger("skipAvailable");
    };
    
    
    //
    // メソッド
    //
    /**
     * チャンネルの種類を取得します。
     * @return {string} "vocaloid", "toho"など
     */
    NsenChannel.prototype.getChannelType = function () {
        return this._live.get("stream").nsenType;
    };
    
    /**
     * 現在接続中の放送のNicoLiveInfoオブジェクトを取得します。
     * @return {NicoLiveInfo}
     */
    NsenChannel.prototype.getLiveInfo = function () {
        return this._live;
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
     * 次のチャンネル情報を受信していれば、その配信へ移動します。
     * @return {jQuery.Promise} 成功すればresolveされ、失敗した時にrejectされます。
     */
    NsenChannel.prototype.moveToNextLive = function () {
        if (this._nextLiveId == null) {
            var err = new Error("次の放送情報を受信していません。");
            return $.Deferred().reject(err).progress();
        }
        
        var self = this,
            dfd = $.Deferred(),
            liveId = this._nextLiveId;
        
        // 放送情報を取得
        NicoLiveApi.getLiveInfo(liveId)
            .done(function (liveInfo) {
                // 放送情報の取得に成功した
                
                // イベントリスニングを停止
                self._live
                    .off("sync", self._onLiveInfoUpdated)
                    .off("closed", self._onLiveClosed);

                self._commentProvider
                    .off("add", self._onCommentAdded);
                
                // オブジェクトを破棄
                self._live != null && self._live.dispose();
                self._live = null;
                self._commentProvider = null;
                
                // オブジェクトを保持
                self._live = liveInfo;
                self._commentProvider = liveInfo.getCommentProvider();

                // イベントリスニング開始
                self._live
                    .on("sync", self._onLiveInfoUpdated)
                    .on("closed", self._onLiveClosed);

                self._commentProvider
                    .on("add", self._onCommentAdded);
                
                self._nextLiveId = null;
                
                // 配信変更イベントを発生させる。
                self.trigger("liveSwapped", liveInfo);
                dfd.resolve();
                
                self.fetch();
            })
            .fail(function (err) {
                dfd.reject(err);
            });
        
        return dfd.promise();
    };
    
    
    module.exports = NsenChannel;
    module.exports.Errors = {};
    module.exports.Errors.Request = _.clone(RequestErrors);
});