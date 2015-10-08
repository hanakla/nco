packageJson = require "../../../package.json"

module.exports =
class Migrater
    @migrate : =>
        # `nco.version` introduced since v0.1.0-alpha.6
        unless @get("nco.version")?
            @migrateTo_010alpha6()
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
        @moved "nco.comment", "nco.services.comment"
        @moved "nco.speech", "nco.services.speech.enabled"
        @moved "nco.player", "nco.services.player"

        return
