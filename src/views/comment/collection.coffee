define (require, exports, module) ->
    Backbone    = require "backbone"

    NicoAPI     = window.require("node-nicovideo-api")

    class CommentCollection extends Backbone.Collection
        model   : NicoAPI.Live.NicoLiveComment

    module.exports = CommentCollection
