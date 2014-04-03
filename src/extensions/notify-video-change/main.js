/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true */
/*global nco*/
define(function (require, exports, module) {
    "use strict";
    
    var _           = nco.getModule("thirdparty/lodash"),
        ChannelManager = nco.getModule("appcore/ChannelManager"),
        ContentsManager = nco.getModule("appcore/ContentsManager"),
        
        tmpl    = _.template(require("text!row.html"));
    
    var prevVideoId = null;
    
    function comma(num) {
        return num.toString().replace(/(\d)(?=(\d\d\d)+$)/g , "$1,");
    }
    
    // 動画変更イベントをリスニング
    ChannelManager.on("videochanged", _onVideoChanged);
    
    function _onVideoChanged(movie) {
        if (!movie || movie.id === prevVideoId) {
            return;
        }
        
        var movieInfo = movie.toJSON();
        prevVideoId = movie.id;
        
        movieInfo.count.view = comma(movieInfo.count.view);
        movieInfo.count.comments = comma(movieInfo.count.comments);
        movieInfo.count.mylist = comma(movieInfo.count.mylist);
        
        var $tr = $(tmpl(movieInfo));
        
        // ContentsManagerAPIに行要素を投げる
        ContentsManager.addRow($tr[0]);
    }
});