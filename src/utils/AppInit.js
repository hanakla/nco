/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true */
define(function (require, exports, module) {
    "use strict";
    
    var htmlReadyDfd = $.Deferred();
    
    exports._triggerHtmlReady = function () {
        htmlReadyDfd.resolve();
    };
    
    /**
     * アプリケーションのメインビューが初期化された時に
     * 実行されるコールバックを登録します。
     * @param {function} fn コールバック関数
     */
    exports.htmlReady = function (fn) {
        htmlReadyDfd.done(fn);
    };
    
});