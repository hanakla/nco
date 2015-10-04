NsenChannels = require "./NsenChannels"

{Emitter} = global.require "electron-kit"
{CompositeDisposable} = global.require "event-kit"

Colors = require "colors"

module.exports =
class ChannelManager extends Emitter
    constructor : ->
        super

        @_channelId = app.config.get("nco.lastSelectChannel")
        @_activeStream = null

        # @_handleEvents()
        @_handleCommands()


    _handleCommands : ->
        app.command.on
            "channel:reset-session" : (session) =>
                @setSession session

            "channel:change" : (channel) =>
                @changeChannel(channel)

            "channel:push-request" : (movieId) =>
                @_activeStream?.pushRequest(movieId)

            "channel:cancel-request" : =>
                @_activeStream?.cancelRequest()

            "channel:push-good" : =>
                @_activeStream?.pushGood()

            "channel:push-skip" : =>
                @_activeStream?.pushSkip()

        return


    ###*
    # Get current channel id (likes "nsen/***")
    ###
    currentChannel : ->
        @_channelId


    getStream : ->
        @_activeStream


    setSession : (@_session) ->
        return unless @_channelId?

        console.info "%c[NsenStream] Changing active session...", Colors.text.info

        @_activeStream?.dispose()

        @_session.live.getNsenChannelHandlerFor(@_channelId)
        .then (nsenCh) =>
            @_activeStream = nsenCh

            @_activeStream.onWillClose =>
                @_activeStream.moveToNextLive().then =>
                    console.log "%c[NsenStream] Stream swaped by /reset command", Colors.bg.info

            # @_activeStream._commentProvider.onDidReceiveData (data) =>
            #     console.log "Received", data

            @emit "did-change-stream", nsenCh
            console.info "%c[NsenStream] Active session changed.", Colors.text.success

        .catch (e) =>
            console.error "[NsenStream] Failed to change session.", e


    changeChannel : (channel) ->
        return if channel is @_channelId

        console.info "%c[NsenStream] Channel changing to #{channel}", Colors.text.info

        @_channelId = channel
        app.config.set "nco.lastSelectChannel", channel

        @_session.live.getNsenChannelHandlerFor(@_channelId)
        .then (nsenCh) =>
            @_activeStream?.dispose()
            @_activeStream = nsenCh
            @emit "did-change-stream", nsenCh
            @emit "did-change-channel", nsenCh

        .catch (e) =>
            console.error "[NsenStream] Failed change channel.", e

    #
    # Events
    #

    onDidChangeStream : (listener) ->
        @on "did-change-stream", listener

    onDidChangeChannel : (listener) ->
        @on "did-change-channel", listener
