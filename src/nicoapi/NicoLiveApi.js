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
        if (commentProviders[liveInfo.id]) {
            return commentProviders[liveInfo.id];
        }
        
        commentProviders[liveInfo.id] = new CommentProvider([], {live: liveInfo});
        return commentProviders[liveInfo.id];
    }
    
    exports.getPlayerStatus = function () { 
        Global.console.error("非推奨APIがコールされました (NicoLiveApi#getPlayerStatus)");
        return _getLiveInfo.apply(this, arguments);
    };
    
    exports.getLiveInfo = _getLiveInfo;
    exports.getCommentProvider = _getCommentProvider;
});