/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true */
/*global $, nco, define*/
define(function (require, exports, module) {
    "use strict";
    
    var ChannelManager = nco.getModule("appcore/ChannelManager"),
        ContentsManager = nco.getModule("contents/ContentsManager"),
        
        closingTmpl = "<tr nco-ext-notify-closing><td><div class='alert alert-info'>" +
                        "まもなく閉場時間です。<a href='#' nco-ext-action='swap'>次の放送へ移動</a>" +
                     "</div></td></tr>",
        closedTmpl = "<tr><td><div class='alert alert-success'>" +
                        "閉場しました。次のチャンネルへ移動するとログがクリアされます。" +
                        "<a href='#' nco-ext-action='swap'>次の放送へ移動</a>" +
                     "</div></td></tr>";
    
    // 閉場イベントをリスニング
    ChannelManager.on("liveSwapped", _init);
    
    _init();
    
    function _init() {
        ChannelManager
            .once("closing", _receiveClosing)
            .once("closed", _receiveClosed);
    }
    
    function _onClickSwap() {
        ChannelManager.moveToNextLive();
    }
    
    function _receiveClosing() {
        // ContentsManagerAPIに行要素を投げる
        var $row = $(closingTmpl).on("click", "a[nco-ext-action='swap']", _onClickSwap);
        ContentsManager.addRow($row);
    }
    
    function _receiveClosed() {
        // ContentsManagerAPIに行要素を投げる
        var $row = $(closedTmpl).on("click", "a[nco-ext-action='swap']", _onClickSwap);
        ContentsManager.addRow($row);
    }
});
