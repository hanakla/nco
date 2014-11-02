define (require, exports, module) ->
    Marionette  = require "marionette"

    class NcoMainLayout extends Marionette.LayoutView
        template    : require "jade!./view"

        regions     :
            comments    : ".NcoComments"

        ui          : null

        events      : null


    return NcoMainLayout
