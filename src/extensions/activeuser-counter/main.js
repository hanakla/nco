/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true */
/*global _, nco, define*/
define(function (require, exports, module) {
    "use strict";
    
    var ChannelManager  = nco.getModule("appcore/ChannelManager"),
        ContentsManager = nco.getModule("contents/ContentsManager"),
        
        closingTmpl = _.template(
            "<tr><td class='text-info'>アクティブ人数: <%= count %></td></tr>");
    
    var usermap;
    
    // 初期化完了したら
    ChannelManager.once("videochanged", _init);
    
    function _init() {
        ChannelManager.on("said", _countUp);
        
        usermap = {};
        setInterval(_exportResult, 1000 * 60 * 2);
    }
    
    function _countUp(comment) {
        if (!comment.isControl()&& !comment.isDistributorPost()) {
            var userid = comment.get("user").id;
            usermap[userid] = true;
        }
    }
    
    function _exportResult() {
        var count = _.size(usermap),
            el = closingTmpl({count: count});
        ContentsManager.addRow(el);

        usermap = void 0;
        usermap = {};
    }
});