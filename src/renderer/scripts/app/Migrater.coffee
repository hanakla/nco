packageJson = require "../../../package.json"

Colors = require "../colors"

module.exports =
class Migrater
    @migrate : =>
        @_notify = null

        # `nco.version` introduced since v0.1.0-alpha.6
        unless @get("nco.version")?
            @migrateTo_010alpha6()

        if @_notify?
            app.onDidInitialize =>
                app.command.dispatch "notify:notify", @_notify.title, @_notify.body, @_notify.options

        return

    @set : (k, v) =>
        app.config.set k, v
        return

    @get : (k) =>
        app.config.get k

    @moved : (fromKey, toKey, unsetKey) =>
        @set toKey, @get(fromKey)
        @set unsetKey ? fromKey, undefined

    #
    # Migration definitions
    #

    @migrateTo_010alpha6 : (v) =>
        return "v0.1.0-alpha.6" if v

        @set "nco.version", "v0.1.0-alpha.6"

        @moved "nco.lastSelectChannel", "nco.nsen.lastSelectChannel"
        @moved "nco.comment.postAsAnonymous", "nco.nsen.postAsAnonymous", "nco.comment"
        @moved "nco.autoMove", "nco.nsen.autoMoveToNextLive"
        @moved "nco.speech", "nco.services.speech.enabled"
        @moved "nco.player", "nco.services.player"

        @_notify =
            title   : "Nco"
            body    : """
                Nco v0.1.0-alpha.6へのアップデート、ありがとうございます！<br>
                Have a nice Nsen! ;)
            """
            options : {timeout: "10s"}

        console.info "%cMigrated to v0.1.0-alpha.6", Colors.bg.success

        return
