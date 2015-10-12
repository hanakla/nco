global.$ = global.jQuery = require "jquery"
require "thirdparty/jquery.powertip"

global.Backbone = require "backbone"
global.Backbone.Marionette = global.Marionette = require "marionette"

App = require("app/App")
new App
