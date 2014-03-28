/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
define(function (require, exports, module) {
    var _ = require("thirdparty/lodash"),
        NicoApi = require("nicoapi/NicoApi"),
        
        modalLogin = require("text!htmlContent/modal-login.html");
    
    var $modal,
        $alert;
    
    // モーダルウィンドウを初期化
    $modal = $(modalLogin);
    $alert = $modal.find(".alert").alert();
    
    $modal
        .filter("#modal-login")
        .on("submit", _submitLogin)
        .on("hidden.bs.modal", function () { $modal.remove(); });
    
    /**
     * ログインボタンを押された時のイベント
     * @param {Type} 
     */
    function _submitLogin() {
        var mail = $modal.find("[name='mail']").val(),
            password = $modal.find("[name='password']").val();
        
        NicoApi.login(mail, password)
            .done(function () {
                $modal.modal("hide");
                $alert.hide();
            })
            .fail(function (msg) {
                $alert.text(msg).show();
            });
        
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
            .modal({backdrop: "static", keyboard: false})
            .appendTo(document.body);
        
        return loginDeferred;
    }
    
    exports.requestLogin = _requestLogin;
});