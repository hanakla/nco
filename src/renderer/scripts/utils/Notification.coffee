_ = require "lodash"
{Emitter} = global.require "electron-kit"
{CompositeDisposable, Disposable} = global.require "event-kit"


module.exports =
class Notification extends Emitter
    constructor : (@_title, options) ->
        super

        if arguments.length is 0
            throw new TypeError("Failed to construct 'Notification': 1 argument required, but only 0 present.")

        options = _.defaults options,
            body : ""
            dir : "auto"
            icon : ""
            lang : ""
            silent : false
            tag : "a"
            timeout: false # milli seconds

        if typeof options.onclick is "function"
            @on "click", options.onclick

        if typeof options.onshow is "function"
            @on "show", options.onshow

        if typeof options.onerror is "function"
            @on "error", options.onerror

        if typeof options.onclose is "function"
            @on "close", options.onclose

        Object.defineProperties @,
            # onclick :
            #     get : -> null
            # onshow :
            #     get : -> null
            # onerror :
            #     get : -> null
            # onclose :
            #     get : -> null

            title :
                get : -> options.title
            dir :
                get : -> options.dir
            lang :
                get : -> options.lang
            body :
                get : -> options.body
            tag :
                get : -> options.tag
            icon :
                get : -> options.icon
            silent :
                get : -> options.silent
            timeout :
                get : -> options.timeout


    addEventListener : (event, listener) ->
        @_subs.add @on event, listener
        return

    open : ->
        @_notify = new global.Notification(@_title, @)
        @_notify.addEventListener "click", (args) => @emit "click", args...
        @_notify.addEventListener "close", (args) => @emit "close", args...
        @_notify.addEventListener "error", (args) => @emit "error", args...
        @_notify.addEventListener "show", (args) => @emit "show", args...
        @once "close", => @_notify = null

        if @timeout?
            setTimeout (=> @close()), @timeout

        return

    close : ->
        @_notify?.close()
