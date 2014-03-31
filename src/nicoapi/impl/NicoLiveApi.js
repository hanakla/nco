/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true */

/**
 * ニコニコ生放送APIのラッピングを行います。
 */
define(function (require, exports, module) {
    "use strict";
    
    var Global          = require("utils/Global"),
        NicoAuthApi     = require("./NicoAuthApi"),
        NicoLiveInfo    = require("../models/NicoLiveInfo");
    
    /**
     * 指定された放送の情報を取得します。
     * @param {string} liveId 放送ID
     * @return {$.Promise} jQuery.Promiseオブジェクト。
     * 番組情報が取得できればNicoLiveInfoオブジェクトとともにresolveされます。
     * 取得中にエラーが発生した場合、エラーメッセージとともにrejectされます。
     */
    function _getLiveInfo(liveId) {
        if (typeof liveId !== "string" || liveId === "") {
            throw new Error("liveIdは文字列である必要があります。");
        }
        
        var deferred = $.Deferred(),
            info;
        
        // getplayerstatusAPIがログインしていないと使えない
        NicoAuthApi.isLogin()
            .done(_onLogged)
            .fail(function () {
                // ログイン完了したら取得する
                NicoAuthApi.once("login", _onLogged);
            });
        
        function _onLogged() {
            // ログインできたら番組情報を取得
            // 取得完了したらresolveする。
            info = new NicoLiveInfo(liveId);
            info.fetch()
                .done(function () { deferred.resolve(info); })
                .reject(function (err) { deferred.reject(err); });
        }
        
        return deferred;
    }
    
    exports.getLiveInfo = _getLiveInfo;
});