define (require, exports, module) ->
    $           = require "jquery"
    _           = require "underscore"
    Marionette  = require "marionette"

    NcoAPI      = require "cs!nco/nco"

    class LoginView extends Marionette.LayoutView
        template    : require "jade!./login"

        ui          :
            wrap        : ".NcoLogin"
            form        : "form"
            error       : ".NcoLogin_error"

        events      :
            "submit @ui.form" : "_onSubmit"


        initialize  : ->
            self = @

        _initState  : ->
            @ui.form.find("input").val ""
            @ui.error.text ""


        _onSubmit   : ->
            input = {}
            _.each @ui.form.serializeArray(), (obj) -> input[obj.name] = obj.value

            @_hideError()

            self = @
            NcoAPI.request("login", input.email, input.password, input.memory is "on")
                .then ->
                    self.close()
                , (err) ->
                    self._showError "ログインに失敗しました。"


        _hideError  : ->
            @ui.error
                .hide()
                .text ""

        _showError  : (error) ->
            @ui.error
                .slideDown 100
                .text error


        open        : ->
            @ui.wrap.addClass "show"


        close       : ->
            @ui.wrap.removeClass "show"


    module.exports = LoginView
