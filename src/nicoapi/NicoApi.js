/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true */
/**
 * このモジュールでは以下のイベントが発生します。
 *  "login"  : ニコニコ動画へログインした時に発生します。
 *  "logout" : ニコニコ動画からログアウトした時に発生します。
 */
define(function (require, exports, module) {
    "use strict";
    
    var NICO_URL_LOGIN = "https://secure.nicovideo.jp/secure/login?site=niconico",
        NICO_URL_LOGOUT = "https://secure.nicovideo.jp/secure/logout",
        NICO_URL_TESTLOGIN = "http://live.nicovideo.jp/api/getplayerstatus/";
    
    var Backbone    = require("thirdparty/backbone"),
        Global      = require("utils/Global"),
        Cheerio     = Global.require("cheerio"),
        MovieInfo   = require("./niconico/MovieInfo"),
        
        nsenChannels = require("text!nicoapi/nsenChannels.json");
    
    var nicoLiveApi = null,
        loginState = null;
    
    try {
        nsenChannels = JSON.parse(nsenChannels);
        
        NICO_URL_TESTLOGIN += nsenChannels[0].id;
    } catch (e) {
        throw new Error("nicoapi/nsenChannels.jsonの読み込み中にエラー (" + e.message + ")");
    }
    
    
    /**
     * ニコニコ動画へログインします。
     * 
     * @param {string} mail
     * @param {string} password
     * @return {$.Deferred} ログインに成功した時にresolveが、失敗した時にrejectが実行されます。
     *      ログインに失敗した時、第一引数にエラーメッセージが渡されます。
     */
    function _login(mail, password) {
        //var root = Global.nco.nodeApi;
        var deferred = $.Deferred(),
            req;
        
        // Ajaxでログイン
        $.ajax({
            url: NICO_URL_LOGIN,
            data: {mail: mail, password: password},
            method: "POST",
        })
            .then(
                function (data, status, xhr) {
                    // jQuery使うと画像の読み込みとかが始まってしまうのでちぇりおつかう
                    var $res = new Cheerio(data),
                        authFlag = xhr.getResponseHeader("x-niconico-authflag")|0;
                    
                    if (xhr.status === 503) {
                        deferred.reject("多分ニコニコ動画がメンテナンス中です。");
                        return;
                    }
                    
                    // x-niconico-authflag が 0以外なら多分ログインできてる。
                    if (authFlag === 0) {
                        var msg = $res.find(".wrongPass").text();
                        deferred.reject(msg);
                    } else {
                        deferred.resolve();
                    }
                },
                function (xhr, status, err) {
                    Global.console.error(err);
                    deferred.reject(status);
                }
            );
        
        // ログイン完了イベント
        deferred.done(function () {
            loginState = true;
            exports.trigger("login");
        });
        
        return deferred;
    }
    
    /**
     * ニコニコ動画からログアウトします。
     * @return {$.Deferred} 成功した時にresolveを、失敗した時にrejectされます。
     */
    function _logout() {
        var deferred = $.Deferred();
        
        $.ajax({url: NICO_URL_LOGOUT})
            .then(
                function () { deferred.resolve(); },
                function () { deferred.reject(); }
            );
        
        deferred.done(function () {
            loginState = false;
            exports.trigger("logout");
        });
        
        return deferred;
    }
    
    /**
     * ニコニコ動画へログインしているかチェックします。
     * @return {$.Deferred} ログインしている時にresolveを、そうでなければrejectします。
     */
    function _isLogin() {
        var deferred = $.Deferred();
        
        // ログイン状態のキャッシュがあればそれを返す
        if (loginState !== null) {
            return deferred.resolve(loginState).promise();
        }
        
        $.ajax({
            url: NICO_URL_TESTLOGIN
        })
            .done(
                function (res) {
                    var err = $(res).find("error code").text();
                    
                    // エラー状態が付加されていれば未ログインとしておこう
                    if (err !== "") {
                        loginState = false;
                        deferred.reject(loginState);
                    } else {
                        loginState = true;
                        deferred.resolve(loginState);
                    }
                })
            .fail(function () {
                // 通信エラーは論外。堕ちたな（現象論）
                loginState = false;
                deferred.reject(loginState);
            });
        
        
        return deferred.promise();
    }
    
    /**
     * 動画情報(ModelInfo）を取得します。
     * 
     * @param {string} movieId 動画ID
     * @return {$.Deferred}
     */
    function _getMovieInfo(movieId) {
        var model = new MovieInfo({id: movieId});
        return model.fetch();
    }
    
    _.extend(exports, Backbone.Events); // BackboneのEventsモジュールを継承
    exports.login = _login;
    exports.logout = _logout;
    exports.isLogin = _isLogin;
    exports.getMovieInfo = _getMovieInfo;
    
}); 