/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true */
/*global $, define*/

/**
 * ニコニコ生放送APIラッパークラスエントランス
 */
define(function (require, exports, module) {
    "use strict";
    
    var NicoAuthApi     = require("./NicoAuthApi"),
        NicoLiveInfo    = require("../models/NicoLiveInfo"),
        NsenChannel     = require("../models/NsenChannel");
    
    /**
     * 指定された放送の情報を取得します。
     * @param {string} liveId 放送ID
     * @return {$.Promise} jQuery.Promiseオブジェクト。
     *    番組情報が取得できればNicoLiveInfoオブジェクトとともにresolveされます。
     *    取得中にエラーが発生した場合、エラーメッセージとともにrejectされます。
     */
    function getLiveInfo(liveId) {
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
                .fail(function (err) { deferred.reject(err); });
        }
        
        return deferred.promise();
    }
    
    
    /**
     * NicoLiveInfoオブジェクトからNsenChannelのインスタンスを取得します。
     * @param {NicoLiveInfo} obj
     * @return {NsenChannel}
     */
    function nsenChannelFrom(obj) {
        return new NsenChannel(obj);
    }
    
    exports.getLiveInfo = getLiveInfo;
    exports.NsenChannelFrom = nsenChannelFrom;
});