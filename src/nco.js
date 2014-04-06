/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define*/
define(function (require, exports, module) {
    var AppInit     = require("utils/AppInit"),
        Global      = require("utils/Global"),
        NicoApi     = require("nicoapi/NicoApi"),
        NodeWebkit  = Global.require("nw.gui"),
        ExtensionLoader = require("utils/ExtensionLoader"),
        
        LoginModalView = require("views/LoginModalView");
        
    require("widgets/bootstrap");
    require("views/AppView");
    require("views/CommentListView");
    require("views/CommentPostView");
    require("command/DefaultCommand");
    require("contents/DefaultContents");
    
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
     * 拡張機能を読み込み
     */
    ExtensionLoader.init()
        .done(function () {
            Global.console.info("拡張機能読み込み完了");
        });
    
    /**
     * ログインチェック
     */
    NicoApi.Auth.isLogin()
        .fail(function () {
            LoginModalView.requestLogin();
        });
    
    NicoApi.Auth.on("logout", function () {
        LoginModalView.requestLogin();
    });
    
//    window.onbeforeunload = function () { return !1;};
});