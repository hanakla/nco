define (require, exports, module) ->
    Marionette  = require "marionette"

    ActionView    = require "cs!./action-view"

    class NcoControlLayout extends Marionette.LayoutView
        template    : require "jade!./view"

        regions     :
            actions : ".NcoControl_actions"
            comment : ".NcoControl_comment"
            subControls : ".NcoControl_subControls"

        initialize  : (option) ->
            @actions.attachView new ActionView


    return NcoControlLayout
