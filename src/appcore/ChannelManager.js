/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true */
/*global define, $ */

/**
 * Nsenのチャンネル状態などを管理します。
 * 
 * Objects
 *  - エラーオブジェクト: {message:string}
 *      このAPIのメソッドで返されたjQuery.Promiseオブジェクトがrejectされた時
 *      この形式のオブジェクトを必ず返します。(resultプロパティはそのうち削除する）
 *      messageにエラーメッセージが格納されています。
 *  
 * Methods
 *  - changeChannel(chId:string):$.Promise
 *      チャンネルを変更します。chIdは"nsen/***"形式のチャンネルIDです。
 *  
 *  - getCurrentVideo():NicoVideoInfo|null
 *      現在再生中の動画情報を取得します。
 *      （基本的にはこのメソッドを用いず、"videochanged"イベントをリスニングしてください）
 * 
 *  - getChannelType():string|null
 *      チャンネルの種別を取得します。（nsen/***の"***"の部分だけ）
 *
 *  - getComments():Array.<LiveComment>|null
 *      受信済みのコメントを全て取得します。
 * 
 *  - pushRequest(video:NicoVideoInfo|string):$.Promise
 *      リクエストを送信します。リクエストの送信が成功すればresolveされます。
 *      失敗すればエラーオブジェクトとともにrejectされます。
 * 
 *  - cancelRequest():$.Promise
 *      リクエストをキャンセルします。
 *      リクエストが送信されていない、もしくはキャンセルに失敗した場合はエラーオブジェクトとともにrejectされます。
 * 
 *  - pushComment(message:string, command:?string):$.Promise
 *      コメントを送信します。messageにはコメントを渡し、commandには"184"などのコマンドを指定できます。
 *  
 *  - pushGood():$.Promise
 *      Goodを送信します。
 * 
 *  - pushSkip():$.Promise
 *      SkipRequestを送信します。
 * 
 *  - isSkipRequestable():boolean
 *      SkipRequestが送信できるか確認できます。
 *      (スキップリクエストが利用可能になったことをを通知する"skipAvailable"イベントを利用できます。）
 * 
 *  - moveToNextLive():$.Promise
 *      次の配信の情報を受け取っていれば、次の配信へ切り替えを行います。
 * 
 * Events
 *  - channelChanged:(viewName:string, id:string, ch: NsenChannel)
 *      チャンネルが変更された時に発火します。
 *      viewName - チャンネル名
 *      id - チャンネルID (nsen/***)
 *      ch - 新しくアクティブ化されたチャンネルのハンドラオブジェクト
 *  
 *  # Nsen
 *   - liveSwapped:(newLive:NicoLiveInfo)
 *      午前４時過ぎ以降、内部で接続している放送が切り替えられたときに発火します。
 * 
 *  - videochanged:(next:NicoVideoInfo|null, before:NicoVideoInfo|null, ch:NsenChannel)
 *      再生中の動画が変わった時に発火します。
 *      第２引数に変更後の動画の情報が渡され、
 *      第３引数には変更前の動画の情報が渡されます。
 *  
 *  - skipAvailable:(ch:NsenChannel)
 *      スキップリクエストが利用可能になったことを通知します。
 * 
 *  # コメント
 *  - said:(comment:LiveComment)
 *      コメントを受信した際に発火します。
 * 
 *  - receive:(response:String)
 *      コメントサーバーからレスポンスを受け取った際に発火します。
 *      XMLノードの文字列が渡されます。
 *  
 *  # リクエスト
 *  - requested:(video:NicoVideoInfo, ch:NsenChannel)
 *      リクエストが完了した時に発火します。第２引数にリクエストされた動画の情報が渡されます。
 * 
 *  - cancelled:(video:NicoVideoInfo, ch:NsenChannel)
 *      リクエストがキャンセルされた時に発火します。第２引数にキャンセルされた動画の情報が渡されます。
 *  
 *  # Good & Skip
 *  - thumbsup:(ch:NsenChannel)
 *      Goodが送信された時に発火します。
 * 
 *  - skipin:(ch:NsenChannel)
 *      SkipRequestが送信された時に発火します。
 * 
 *  - goodcall:(ch:NsenChannel)
 *      誰かがGoodを送信した時に発火します。
 * 
 *  - mylistcall:(ch:NsenChannel)
 *      誰かが動画をマイリストに追加した時に発火します。
 * 
 *  # 切断
 *  - closing:(liveId:string, ch:NsenChannel)
 *      午前４時くらいから送られ始める、更新リクエストを受け取った時に発火します。
 *      第２引数は移動先の放送IDです。
 * 
 *  - closed:(ch:NsenChannel)
 *      配信が終了した時に発火します。
 */
define(function (require, exports, module) {
    "use strict";
    
    var _        = require("thirdparty/underscore"),
        Global   = require("utils/Global"),
        AppModel = require("models/AppModel"), // そのうち削除
        Backbone = require("thirdparty/backbone"),
        NicoApi  = require("nicoapi/NicoApi"),
        
        nsenChannels = JSON.parse(require("text!nicoapi/NsenChannels.json"));
    
    /**
     * 現在アクティブなチャンネルの配信情報オブジェクト
     * @type {NicoLiveInfo}
     */
    var _live               = null;
    
    /**
     * 現在アクティブなチャンネルのCommentProvider
     * @type {CommentProvider}
     */
    var _commentProvider    = null;
    
    /**
     * 現在アクティブなNsenチャンネルハンドラ
     * @type {NsenChannel}
     */
    var _nsenChannel        = null;
    
    /**
     * 各オブジェクトへのイベントリスナ
     * @enum {Object.<string, Object.<string, function>>}
     */
    var _listeners = {
        live: {},
        comment: {
            "add": function (comment) {
                exports.trigger("said", comment);
            },
            "receive": function (response) {
                exports.trigger("receive",  response);
            }
        },
        nsen: {
            "liveSwapped": _onLiveSwapped,
            "videochanged": function (before, after) { 
                exports.trigger("videochanged", before, after, _nsenChannel);
            },
            "skipAvailable": function () {
                exports.trigger("skipAvailable", _nsenChannel);
            },
            
            "requested": function (video) {
                exports.trigger("requested", video, _nsenChannel);
            },
            "cancelled": function (video) {
                exports.trigger("cancelled", video, _nsenChannel);
            },
            
            "thumbsup": function () {
                exports.trigger("thumbsup", _nsenChannel);
            },
            "skipin": function () {
                exports.trigger("skipin", _nsenChannel);
            },
            "goodcall": function () {
                exports.trigger("goodcall", _nsenChannel);
            },
            "mylistcall": function () {
                exports.trigger("mylistcall", _nsenChannel);
            },
            
            "closing": function () {
                exports.trigger("closing", _nsenChannel);
            },
            "closed": function () {
                exports.trigger("closed", _nsenChannel);
            }
        }
    };
    
    
    /**
     * 関係オブジェクトのイベントリスニングを停止します。
     */
    function _stopListening() {
        if (!_isNotInitialized()) {
            _.each(_listeners.live, function (fn, ev) { _live.off(ev, fn); });
            _.each(_listeners.comment, function (fn, ev) { _commentProvider.off(ev, fn); });
            _.each(_listeners.nsen, function (fn, ev) { _nsenChannel.off(ev, fn); });
        }
    }
    
    /**
     * 関係オブジェクトのイベントをリスニングします。
     */
    function _startListening() {
        _.each(_listeners.live, function (fn, ev) { _live.on(ev, fn); });
        _.each(_listeners.comment, function (fn, ev) { _commentProvider.on(ev, fn); });
        _.each(_listeners.nsen, function (fn, ev) { _nsenChannel.on(ev, fn); });
    }
    
    /**
     * このモジュールの初期化状態を調べます。
     * @return {boolean}
     */
    function _isNotInitialized() {
        return _nsenChannel === null;
    }
    
    /**
     * 配信が切り替えられた時のリスナ
     * 古い関連オブジェクトと関係を切り、新しい関連オブジェクトと関係を繋ぎます。
     * @private
     */
    function _onLiveSwapped() {
        // 古い配信のイベントリスニングを停止
        _.each(_listeners.live, function (fn, ev) { _live.off(ev, fn); });
        _.each(_listeners.comment, function (fn, ev) { _commentProvider.off(ev, fn); });
        
        // オブジェクトを差し替え
        _live = _nsenChannel.getLiveInfo();
        _commentProvider = _live.getCommentProvider();

        // 新しい配信のイベントをリスニング
        _.each(_listeners.live, function (fn, ev) { _live.on(ev, fn); });
        _.each(_listeners.comment, function (fn, ev) { _commentProvider.on(ev, fn); });
        
        // イベントを発火
        exports.trigger("liveSwapped", _live);
    }
    
    /**
     * チャンネルを変更します。
     * @param {string} chId チャンネルID(nsen/***)
     * @return {$.Promise}
     */
    function changeChannel(chId) {
        var dfd = $.Deferred(),
            ch = _.findWhere(nsenChannels, {id: chId});
        
        if (!ch) {
            Global.console.error("存在しないチャンネルです。(id: %s)", chId);
            return dfd.reject(new Error("存在しないチャンネルです。(id: " + chId + ")")).promise();
        }
        
        NicoApi.Live.getLiveInfo(ch.id)
            .done(function (liveInfo) {
                _stopListening(); // 前のチャンネルのイベントリスニングを停止
                
                _live = liveInfo;
                _commentProvider = liveInfo.getCommentProvider();
                _nsenChannel = NicoApi.Live.nsenChannelFrom(_live);
                
                _startListening(); // 現在のチャンネルをイベントリスニング
                
                // AppModel廃止時に削除
                AppModel.set("currentCh", ch.id);
                
                dfd.resolve();
                exports.trigger("channelChanged", ch.name, ch.id, _nsenChannel);
            });
        
        return dfd.promise();
    }
    
    /**
     * 現在再生中の動画を取得します。
     * チャンネルが選択されていない場合などでnullを返すことがあります。
     * 基本的にはこのメソッドを用いず、代わりに"videochanged"イベントをリスニングしてください。
     * @return {?NicoVideoInfo}
     */
    function getCurrentVideo() {
        if (_isNotInitialized()) {
            return null;
        }
        
        return _nsenChannel.getCurrentVideo();
    }
    
    /**
     * チャンネルの種別を取得します。（nsen/***の"***"の部分だけ）
     * @param {?string} 
     */
    function getChannelType() {
        if (_isNotInitialized()) {
            // そのうち変更
            var id = AppModel.get("currentCh");
            id && (id = id.replace("nsen/", ""));
            return id || null;
        }
        
        return _nsenChannel.getChannelType();
    }
    
    /**
     *  受信済みのコメントを全て取得します。
     * @param {?Array.<LiveComment>} 
     */
    function getComments() {
        if (_isNotInitialized()) {
            return null;
        }
        
        return _.clone(_commentProvider.models);
    }
    
    /**
     * リクエストを送信します。
     * @param {NicoVideoInfo|string} movie リクエストする動画の動画情報か、動画ID
     * @return {$.Promise}
     */
    function pushRequest(movie) {
        if (_isNotInitialized()) {
            var o = {result: false, message: "チャンネルが選択されていません"};
            return $.Deferred().reject(o).promise();
        }
        
        var waiter;
        
        if (typeof movie === "string") {
            waiter = NicoApi.Video.getVideoInfo(movie)
                .then(function (videoInfo) {
                    return _nsenChannel.sendRequest(videoInfo);
                });
        } else if (movie.isCorrect()) {
            waiter = _nsenChannel.sendRequest(movie);
        } else {
            Global.console.error("不正な引数です。読み込み済みNicoVideoInfoか、動画IDである必要があります。", movie);
            waiter = $.Deferred()
                .reject(new Error("不正な引数です。読み込み済みNicoVideoInfoか、動画IDである必要があります。"))
                .promise();
        }
        
        return waiter;
    }
    
    /**
     * リクエストをキャンセルします。
     * @return {$.Promise}
     */
    function cancelRequest() {
        if (_isNotInitialized()) {
            var o = {result: false, message: "チャンネルが選択されていません"};
            return $.Deferred().reject(o).promise();
        }
        
        return _nsenChannel.cancelRequest();
    }
    
    /**
     * コメントを送信します。
     * @param {string} message 送信するコメント
     * @param {?string} command 同時に送るコマンド(184, shitaなど)
     * @return {$.Promise}
     */
    function pushComment(message, command) {
        if (_isNotInitialized()) {
            var err = new Error("チャンネルが選択されていません");
            return $.Deferred().reject(err).promise();
        }
        
        var dfd = $.Deferred();
        
        _commentProvider.postComment(message, command)
            .done(function () {
                dfd.resolve();
            })
            .fail(function (err) {
                dfd.reject(err);
            });
        
        return dfd.promise();
    }
    
    /**
     * Goodを送信します。
     * @return {$.Promise}
     */
    function pushGood() {
        if (_isNotInitialized()) {
            var o = {result: false, message: "チャンネルが選択されていません"};
            return $.Deferred().reject(o).promise();
        }
        
        return _nsenChannel.pushGood();
    }
    
    /**
     * Skipを送信します。
     * @return {$.Promise}
     */
    function pushSkip() {
        if (_isNotInitialized()) {
            var err = {result: false, message: "チャンネルが選択されていません"};
            return $.Deferred().reject(err).promise();
        }
        
        return _nsenChannel.pushSkip();
    }
    
    /**
     * スキップを再送信可能か調べます。
     * @param {boolean} 
     */
    function isSkipRequestable() {
        return !!(_nsenChannel && _nsenChannel.isSkipRequestable());
    }
    
    /**
     * 次のチャンネル情報を受信していれば、その配信へ移動します。
     * @return {jQuery.Promise} 成功すればresolveされ、失敗した時にrejectされます。
     */
    function moveToNextLive() {
        if (_isNotInitialized()) {
            return $.Deferred().reject().promise();
        }
        
        return _nsenChannel.moveToNextLive();
    }
    
    /**
     * 起動直前のチャンネルを復元
     */
    if (AppModel.get("currentCh")) {
        changeChannel(AppModel.get("currentCh")); // そのうち削除
    }
    
    // 公開メソッド
    _.extend(exports, Backbone.Events);
    exports.changeChannel = changeChannel;
    
    exports.getCurrentVideo = getCurrentVideo;
    exports.getChannelType = getChannelType;
    exports.getComments = getComments;
    
    exports.pushRequest = pushRequest;
    exports.cancelRequest = cancelRequest;
    
    exports.pushComment = pushComment;
    
    exports.pushGood = pushGood;
    exports.pushSkip = pushSkip;
    exports.isSkipRequestable = isSkipRequestable;
    
    exports.moveToNextLive = moveToNextLive;
});