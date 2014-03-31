/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true */
/*global nco*/
define(function (require, exports, module) {
    "use strict";
    
    var _           = nco.getModule("thirdparty/lodash"),
        AppInit     = nco.getModule("utils/AppInit"),
        AppModel    = nco.getModule("models/AppModel"),
        NicoLiveApi = nco.getModule("nicoapi/NicoLiveApi"),
        
        tmpl    = _.template(require("text!row.html"));
    
    var nsenCh = null,
        prevVideoId = null;
    
    /**
     * チャンネル変更リスナ
     * @param {Type} 
     */
    function _channelChanged() {
        var ch = AppModel.get("currentCh");
       
        if (ch) {
            NicoLiveApi.getLiveInfo(ch)
                .done(function (live) {
                    if (nsenCh) {
                        // 前のチャンネルオブジェクトがあったら
                        // そいつとはえんがちょ
                        nsenCh.off("moviechanged", _moviechanged);
                    }

                    // NsenChannelオブジェクトを取得する
                    nsenCh = NicoLiveApi.getNsenChannelFromLive(live);
                    nsenCh.on("moviechanged", _movieChanged);
                });
        }
    }
    
    function _movieChanged(ch, movie) {
        if (movie.id === prevVideoId) {
            return;
        }
        
        prevVideoId = movie.id;
        var $tr = $(tmpl(movie.toJSON()));
        $("#comment-view").append($tr);
    }
    
    
    // イベントリスニング
    AppModel.on("change:currentCh", _channelChanged);
    
    AppInit.htmlReady(function () {
        _channelChanged();
    });
});