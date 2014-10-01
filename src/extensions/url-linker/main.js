/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true */
/*global nco, define*/
define(function (require, exports, module) {
    "use strict";
    
    var _           = nco.getModule("thirdparty/underscore"),
        ContentsManager = nco.getModule("contents/ContentsManager");
    
    var regexp = /(https?:\/\/[^\s　<>]+)/;
    // http://d.hatena.ne.jp/sutara_lumpur/20100827/1282872312
    
    ContentsManager.addFilter("url-linker", function (tr, comment) {
        // コメント内のURLを検索して置き換え
        var $td = $(tr).find("td:first");
        var html = $td.html();
        
        $td.html(html.replace(regexp, "<a href='$&'>$&</a>"));
    });
});