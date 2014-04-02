/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true */
/*global nco*/
define(function (require, exports, module) {
    "use strict";
    
    var _           = nco.getModule("thirdparty/lodash"),
        AppInit     = nco.getModule("utils/AppInit"),
        AppModel    = nco.getModule("models/AppModel"),
        NicoApi     = nco.getModule("nicoapi/NicoApi"),
        
        tmpl    = _.template(require("text!row.html"));
    
    var nsenCh = null,
        prevVideoId = null;
    
    function comma(num) {
        return num.toString().replace(/(\d)(?=(\d\d\d)+$)/g , "$1,");
    }
    
    /**
     * チャンネル変更リスナ
     * @param {Type} 
     */
    function _channelChanged() {
        var ch = AppModel.get("currentCh");
       
        if (ch) {
            NicoApi.Live.getLiveInfo(ch)
                .done(function (live) {
                    if (nsenCh) {
                        // 前のチャンネルオブジェクトがあったら
                        // そいつとはえんがちょ
                        nsenCh.off("videochanged", _onVideoChanged);
                    }

                    // NsenChannelオブジェクトを取得する
                    nsenCh = live.asNsen();
                    nsenCh.on("videochanged", _onVideoChanged);
                });
        }
    }
    
    function _onVideoChanged(ch, movie) {
        if (!movie || movie.id === prevVideoId) {
            return;
        }
        
        var movieInfo = movie.toJSON();
        prevVideoId = movie.id;
        
        movieInfo.count.view = comma(movieInfo.count.view);
        movieInfo.count.comments = comma(movieInfo.count.comments);
        movieInfo.count.mylist = comma(movieInfo.count.mylist);
        
        var $tr = $(tmpl(movieInfo));
        
        setTimeout(function () { $("#comment-view").append($tr); }, 500);
    }
    
    
    // イベントリスニング
    AppModel.on("change:currentCh", _channelChanged);
    
    AppInit.htmlReady(function () {
        _channelChanged();
    });
});