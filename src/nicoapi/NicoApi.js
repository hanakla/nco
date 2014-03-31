/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true */
/**
 * このモジュールでは以下のイベントが発生します。
 *  "login"  : ニコニコ動画へログインした時に発生します。
 *  "logout" : ニコニコ動画からログアウトした時に発生します。
 */
define(function (require, exports, module) {
    "use strict";
    
    var NicoAuthApi     = require("./impl/NicoAuth"),
        NicoLiveApi     = require("./impl/NicoLiveApi"),
        NicoVideoApi    = require("./impl/NicoVideoApi");
    
    Object.defineProperties(exports, {
        Auth: { get: function () { return NicoAuthApi; } },
        Live: { get: function () { return NicoLiveApi;} },
        Video: { get: function () { return NicoVideoApi; } }
    });
}); 