Marionette = require "marionette"
module.exports =
class AppRegions extends Marionette.RegionManager
    constructor : ->
        super

    initialize : ->
        @addRegions
            shell   : "#nco-shell"
            main    : "#nco-main"
            control : "#nco-control"
            login   : "#nco-login"
            preference : "#nco-preference"

        ShellView = require "views/shell/view"
        MainView = require "views/main/layout"
        ControlView = require "views/control/layout"
        LoginView = require "views/login/layout"
        PreferenceView = require "views/preference/view"

        @get("shell").show new ShellView
        @get("main").show new MainView
        @get("control").show new ControlView
        @get("login").show new LoginView
        @get("preference").show new PreferenceView
