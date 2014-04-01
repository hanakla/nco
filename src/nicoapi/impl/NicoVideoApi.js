/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true */

/**
 * ニコニコ動画のAPIへのアクセスを担当します。
 */
define(function (require, exports, module) {
    "use strict";
    
    var NicoVideoInfo   = require("../models/NicoVideoInfo");
    
    /**
     * 動画情報(NicoVideoInfo）を取得します。
     * 
     * @param {string} movieId 情報を取得したい動画ID
     * @return {$.Deferred} jQuery.Promiseオブジェクト。
     * 動画情報が用意できれば取得したNicoVideoInfoオブジェクトと一緒にresolveされます。
     */
    function _getVideoInfo(movieId) {
        var deferred = $.Deferred(),
            model = new NicoMovieInfo({id: movieId});
        
        model.fetch()
            .done(function () { deferred.resolve(model); })
            .fail(function (msg) { deferred.reject(msg); });
        
        return deferred;
    }
    
    exports._getVideoInfo = _getVideoInfo;
});