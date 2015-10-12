$ = require "jquery"
_ = require "lodash"

module.exports =
class PreferenceView extends Marionette.ItemView
    template    : require "./view.jade"

    ui          :
        wrap        : ".NcoPref"
        form        : "form"

        prefSpeech  : "#pref-speech"
        collapses   : ".NcoPref_section-collapse"

    events      :
        "submit @ui.form" : "_onSubmit"
        "mouseup input" : "_updateValues"
        "click @ui.collapses" : "_openCollapse"

    initialize : ->
        app.command.on "app:show-settings", =>
            @open()

        $(window).on "keydown", (e) =>
            return if e.keyCode isnt 27
            @close()


    _initState  : ->
        @$(".NcoPref_section-collapse").removeClass "open"

        @$("input").each ->
            value = app.config.get @name

            switch @type
                when "checkbox"
                    @checked = value

                when "range"
                    @value = value

                else
                    @value = value

            return

        @_updateValues()

        return


    _onSubmit   : ->
        @$("input").each ->
            name = @name
            value = @value

            switch @type
                when "checkbox"
                    value = @checked

                when "range"
                    value = parseFloat(@value, 10)

            app.config.set @name, value
            return

        @close()


    _updateValues : ->
        @$("[valueof]").each (i, el) =>
            el.innerText = @$("input[name='#{$(el).attr("valueof")}']").val()
        return

    _openCollapse : (e) ->
        if e.target.matches(".NcoPref_section_header")
            $(e.currentTarget).toggleClass "open"


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
