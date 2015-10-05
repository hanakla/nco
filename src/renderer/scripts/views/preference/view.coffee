$ = require "jquery"
_ = require "lodash"

module.exports =
class PreferenceView extends Marionette.ItemView
    template    : require "./view.jade"

    ui          :
        wrap        : ".NcoLogin"
        form        : "form"

        prefSpeech  : "#pref-speech"

    events      :
        "submit @ui.form" : "_onSubmit"

    initialize : ->
        app.command.on "app:show-settings", =>
            @open()

        $(window).on "keydown", (e) =>
            return if e.keyCode isnt 27
            @close()


    _initState  : ->
        @ui.prefSpeech.prop("checked", app.config.get("nco.speech"))
        return


    _onSubmit   : ->
        app.config.set "nco.speech", @ui.prefSpeech.prop("checked")
        @close()


    _hideError  : ->
        @ui.error.hide().text ""

    _showError  : (error) ->
        @ui.error.slideDown(100).text error


    open        : ->
        @_initState()
        @ui.wrap.addClass "show"
        return


    close       : ->
        @ui.wrap.removeClass "show"
        return
