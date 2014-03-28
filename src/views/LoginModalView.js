/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
define(function (require, exports, module) {
    var _ = require("thirdparty/lodash"),
        NicoApi = require("nicoapi/NicoApi"),
        
        modalLogin = require("text!htmlContent/modal-login.html");
    
    var $modal,
        $alert;
    
    // モーダルウィンドウを初期化
    $modal = $(modalLogin).modal({backdrop: "static", keyboard: false, show: false});
    $alert = $modal.find("[data-login-alert]").alert();
    
    /**
     * ログインボタンを押された時のイベント
     * @param {Type} 
     */
    function _submitLogin() {
        var mail = $modal.find("[name='mail']").val(),
            password = $modal.find("[name='password']").val();
        
        $alert
            .removeClass("alert-danger")
            .addClass("alert-info")
            .text("ログイン中です...");
        
        NicoApi.login(mail, password)
            .done(function () {
                $alert
                    .removeClass("alert-danger alert-info")
                    .addClass("alert-success")
                    .text("ログインしました。")
                    .fadeOut(1000);
                $modal.modal("hide");
            })
            .fail(function (msg) {
                $alert
                    .addClass("alert-danger")
                    .text(msg)
                    .show();
            });
        console.log("hi");
        return !1;
    }
    
    /**
     * ログインモーダルを表示します。
     * @return {$.Deferred}
     */
    function _requestLogin() {
        var loginDeferred = $.Deferred();
        
        $modal
            .one("hidden.bs.modal", function () { loginDeferred.resolve(); })
            .modal("show")
            .filter("#modal-login")
                .one("submit", _submitLogin);
        
        return loginDeferred;
    }
    
    exports.requestLogin = _requestLogin;
});