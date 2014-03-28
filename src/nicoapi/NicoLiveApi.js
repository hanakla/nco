/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true */
define(function (require, exports, module) {
    "use strict";
    
    var Global = require("utils/Global"),
        NicoApi = require("./NicoApi"),
        NicoLiveInfo = require("./nicolive/NicoLiveInfo"),
        CommentProvider = require("./nicolive/CommentProvider");
    
    var commentProviders = {};
    
    /**
     * 指定された放送の情報を取得します。
     * @param {string} liveId 放送ID
     * @return {$.Deferred}
     */
    function _getLiveInfo(liveId) {
        var info = new NicoLiveInfo({id: liveId});
        
        return info.fetch();
    }
    
    /**
     * 渡された配信のコメントプロバイダを取得します。
     * @param {NicoLiveInfo} liveInfo 配信情報オブジェクト
     * @return {Backbone.Collection} コメントプロバイダ
     */
    function _getCommentProvider(liveInfo) {
        var cp = commentProviders[liveInfo.id];
        
        if (cp) {
            return cp;
        }
        
        cp = new CommentProvider([], {live: liveInfo});
        cp.on("closed", _commentProviderClosed);
        commentProviders[liveInfo.id] = cp;
        
        return cp;
    }
    
    /**
     * コメントプロバイダが閉じられた時の処理
     * @param {CommentProvider} cp
     */
    function _commentProviderClosed(cp) {
        var liveId = cp.getLiveInfo().id;
        delete commentProviders[liveId];
    }
    
    
    exports.getPlayerStatus = function () { 
        Global.console.error("非推奨APIがコールされました (NicoLiveApi#getPlayerStatus)");
        return _getLiveInfo.apply(this, arguments);
    };
    
    exports.getLiveInfo = _getLiveInfo;
    exports.getCommentProvider = _getCommentProvider;
});