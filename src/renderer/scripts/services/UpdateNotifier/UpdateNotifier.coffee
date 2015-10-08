Request = global.require "request-promise"
Semver = global.require "semver"
packageJson = global.require "../../package.json"

module.exports =
class UpdateNotifier
    constructor : ->
        @_handleEvents()
        @_check()

    _handleEvents : ->
        app.onDidChangeNetworkState (isOnline) =>
            _check() if isOnline

    _check : ->
        return if navigator.onLine is no

        Request.get
            url : "https://api.github.com/repos/ragg-/nco/releases"
            headers :
                "User-Agent" : "Nco/#{packageJson.version}"

        .then (body) =>
            res = JSON.parse body
            newVer = res[0].tag_name

            if Semver.lt packageJson.version, newVer
                app.command.dispatch "notify:notify", "#{newVer}がリリースされました。", """
                <a href="#{res[0].html_url}">ダウンロード</a>
                """, {timeout: "10s"}

        .catch (e) ->
