_ = require "lodash"
notifyTemplate = require "./notify.jade"

module.exports =
class NotifyView extends Marionette.View
    initialize : ->
        app.command.on "notify:notify", (title, body, options) =>
            @_notify title, body, options

    _notify : (title, body, options = {}) ->
        options = _.defaults options,
            timeout : null
            level : "info"

        $content = $ notifyTemplate({title, body})
        $content.addClass options.level
        $content.css "animation-duration", options.timeout if options.timeout?

        @$el.append $content
        $content.addClass("show").on "webkitAnimationEnd", ->
            $content.remove()
            $content = null
            return

        return
