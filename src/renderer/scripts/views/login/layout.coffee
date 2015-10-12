$           = require "jquery"
_           = require "underscore"
Marionette  = require "marionette"

module.exports =
class LoginView extends Marionette.ItemView
    template    : require "./login.jade"

    ui          :
        wrap        : ".NcoLogin"
        form        : "form"
        error       : ".NcoLogin_error"
        inputEmail  : "[name='email']"

    events      :
        "submit @ui.form" : "_onSubmit"


    _initState  : ->
        @ui.form.find("input").val ""
        @ui.inputEmail.val app.config.get("nco.auth.user")
        @ui.error.text ""


    _onSubmit   : ->
        input = {}
        _.each @ui.form.serializeArray(), (obj) -> input[obj.name] = obj.value

        @_hideError()

        app.command.dispatch "session:login", input.email, input.password, (err) =>
            if err?
                @_showError "ログインに失敗しました。(#{err.message ? err})"
            else
                app.config.set "nco.auth.user", input.email if input.memory is "on"
                @close()


    _hideError  : ->
        @ui.error.hide().text ""

    _showError  : (error) ->
        @ui.error.slideDown(100).text error


    open        : ->
        @_initState()
        @ui.wrap.addClass "show"


    close       : ->
        @ui.wrap.removeClass "show"
