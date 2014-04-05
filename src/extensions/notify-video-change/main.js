/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true */
/*global $, nco, define*/
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
    ContentsManager.on("init", _onInit);
    ChannelManager.on("videochanged", _onVideoChanged);
    
    function _onInit() {
        var video = ChannelManager.getCurrentVideo();
        _onVideoChanged(video);
    }
    
    function _onVideoChanged(video) {
        if (!video || video.id === prevVideoId) {
            return;
        }
        
        var videoInfo = video.toJSON();
        prevVideoId = video.id;
        
        videoInfo.count.view = comma(videoInfo.count.view);
        videoInfo.count.comments = comma(videoInfo.count.comments);
        videoInfo.count.mylist = comma(videoInfo.count.mylist);
        
        var $tr = $(tmpl(videoInfo));
        
        // ContentsManagerAPIに行要素を投げる
        ContentsManager.addRow($tr[0]);
    }
});