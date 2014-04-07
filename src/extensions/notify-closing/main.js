/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true */
/*global $, nco, define*/
define(function (require, exports, module) {
    "use strict";
    
    var ChannelManager = nco.getModule("appcore/ChannelManager"),
        ContentsManager = nco.getModule("contents/ContentsManager"),
        
        closingTmpl = "<tr><td><div class='alert alert-info'>" +
                        "まもなく閉場時間です。" +
                     "</div></td></tr>",
        closedTmpl = "<tr><td><div class='alert alert-success'>" +
                        "閉場しました。次のチャンネルへ移動するとログがクリアされます。" +
                        "<a href='javascript:location.reload()'>次の放送へ移動</a>" +
                     "</div></td></tr>";
    
    // 閉場イベントをリスニング
    ChannelManager
        .once("closing", _receiveClosing)
        .once("closed", _receiveClosed);
    
    function _receiveClosing() {
        // ContentsManagerAPIに行要素を投げる
        ContentsManager.addRow($(closingTmpl));
    }
    
    function _receiveClosed() {
        // ContentsManagerAPIに行要素を投げる
        ContentsManager.addRow($(closedTmpl));
    }
});
