define (require, exports, module) ->
    Backbone    = require "backbone"

    class LocalStorageModel extends Backbone.Model
        initialize : ->
            @fetch()
            @bind "change", @save, @ if @id?


        save        : ->
            if @id?
                localStorage[@id] = JSON.stringify @toJSON()

            return @


        fetch       : ->
            if @id? and (params = localStorage[@id])?
                @set JSON.parse params

            return @

    module.exports = new LocalStorageModel id : "nco.config"
