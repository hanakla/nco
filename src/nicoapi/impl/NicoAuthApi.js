/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true */

/**
 * ニコニコ動画へのログイン/ログアウトと
 * 認証状態の管理を行います。
 * 
 * Events
 *  - login:() -- ニコニコ動画へログインした時に発火します。
 *  - logout:() -- ニコニコ動画からログアウトした時に発火します。
 */
define(function (require, exports, module) {
    "use strict";
    
    var _           = require("thirdparty/lodash"),
        Backbone    = require("thirdparty/backbone"),
        Global      = require("utils/Global"),
        Cheerio     = Global.require("cheerio"),
        NicoUrl     = require("./NicoUrl");
    
    var NicoAuth = exports;
    
    /**
     * @type {boolean}
     */
    var _isLoginCache = null;
    
    /**
     * ニコニコ動画へログインします。
     * 
     * @param {!string} mail ログインするメースアドレス
     * @param {!string} password　パスワード
     * @return {$.Promise} jQuery.Promiseオブジェクト。ログインに成功した時はresolveされ、失敗した時にrejectされます。
     * コールバックにはログイン結果(result:boolean)とエラーメッセージ(message:string)が格納されたオブジェクトを返します。
     */
    function _login(mail, password) {
        if (typeof mail !== "string" || typeof password !== "string") {
            return $.Deferred()
                .reject({result: false, message: "メールアドレスかパスワードが不正です"}).promise();
        }
        
        var deferred = $.Deferred(),
            req;
        
        // ログイン
        $.ajax({
            url: NicoUrl.Auth.LOGIN,
            data: {mail: mail, password: password},
            method: "POST",
        })
        
            // 通信成功
            .done(function (data, status, xhr) {
                // jQuery使うと画像の読み込みとかが始まってしまうのでちぇりおでパースする
                var $res = new Cheerio(data),
                    authFlag = xhr.getResponseHeader("x-niconico-authflag")|0;

                if (xhr.status === 503) {
                    deferred.reject({result: false, message:"ニコニコ動画がメンテナンス中です。"});
                    return;
                }

                // x-niconico-authflag が 0でなければ多分ログイン成功
                if (authFlag !== 0) {
                    deferred.resolve({result: true, message: ""});
                } else {
                    // ログイン失敗
                    var msg = $res.find(".wrongPass").text();
                    deferred.reject({result: false, message: msg});
                }
            })
        
            // 通信エラー
            .fail(function (xhr, status, err) {
                Global.console.error("NicoAuth#login: 接続エラー(%s)", err);
                deferred.reject({result: false, message: "接続エラー(" + err +")"});
            });
        
        // ログイン完了イベントを発生させる
        deferred.done(function () {
            _isLoginCache = true;
            NicoAuth.trigger("login");
        });
        
        return deferred;
    }
    
    /**
     * ニコニコ動画からログアウトします。
     * @return {$.Promise} jQuery.Promiseオブジェクト。ログアウトに成功した時はresolveされ、失敗した時にrejectされます。
     * コールバックにはログイン結果(result:boolean)とエラーメッセージ(message:string)が格納されたオブジェクトを返します。
     */
    function _logout() {
        var deferred = $.Deferred();
        
        $.ajax(NicoUrl.Auth.LOGOUT)
            .done(function () {
                deferred.resolve({result: true, message:""});
            })
            .fail(function (xhr, status, err) {
                deferred.reject({result: false, message: err});
            });
        
        // ログアウトイベントを発生させる
        deferred.done(function () {
            _isLoginCache = false;
            NicoAuth.trigger("logout");
        });
        
        return deferred;
    }
    
    /**
     * ニコニコ動画へログインしているかチェックします。
     * @return {$.Promise} jQuery.Promiseオブジェクト。ログインしていればresolveを、違えばrejectされます。
     * ログインしているどうかを表すbooleanが渡されます。
     */
    function _isLogin() {
        var deferred = $.Deferred();
        
        // ログイン状態のキャッシュがあればそれを返す
        if (_isLoginCache !== null) {
            if (_isLoginCache === true) {
                deferred.resolve(true);
            } else {
                deferred.reject(false);
            }
            
            return deferred.promise();
        }
        
        // ログインしてないと使えないAPIを叩く
        $.ajax(NicoUrl.Auth.LOGINTEST)
            
            // 通信成功
            .done(
                function (res) {
                    var err = $(res).find("error code");
                    
                    // エラー情報がなければログイン済み
                    if (err.length) {
                        _isLoginCache = true;
                        deferred.resolve(_isLoginCache);
                    } else {
                        _isLoginCache = false;
                        deferred.reject(_isLoginCache);
                    }
                })
            
            // 通信失敗
            .fail(function () {
                _isLoginCache = false;
                deferred.reject(_isLoginCache);
            });
        
        
        return deferred.promise();
    }
    
    // Backbone.Eventsを継承する
    _.extend(exports, Backbone.Events);
    exports.login = _login;
    exports.logout = _logout;
    exports.isLogin = _isLogin;
});