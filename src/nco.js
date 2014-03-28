/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
define(function (require, exports, module) {
    var _           = require("thirdparty/lodash"),
        AppInit     = require("utils/AppInit"),
        Global      = require("utils/Global"),
        NicoApi     = require("nicoapi/NicoApi"),
        NicoLiveApi = require("nicoapi/NicoLiveApi"),
        NodeWebkit  = Global.require("nw.gui"),
        
        AppView     = require("views/AppView"),
        CommentListView = require("views/CommentListView"),
        LoginModalView = require("views/LoginModalView");
        
    require("widgets/bootstrap"); // モジュールじゃないけど必要
    
    AppInit.htmlReady(function () {
        if (Global.nco.debugMode === true) {
            // デバッグモード時に開発者ツールを開く
            var win = NodeWebkit.Window.get();
            
            win.on("devtools-closed", function () {
                win.showDevTools();
            });
            
            win.showDevTools();
        }
        
        console.log("App: HTML Ready");
    });
    
    /**
     * ログインチェック
     */
    NicoApi.isLogin()
        .fail(function () {
            LoginModalView.requestLogin();
        });
//        .then(function () {
//            return NicoLiveApi.getPlayerStatus("nsen/toho");
//        })
//        .then(function (info) {
//            var provider = NicoLiveApi.getCommentProvider(info);
//            console.log(provider);
//        });
    
    window.onbeforeunload = function () { return !1;};
});