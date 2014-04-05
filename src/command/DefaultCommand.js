/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global document, $, define */
define(function (require, exports, module) {
    "use strict";
    
    var Global  = require("utils/Global"),
        Gui     = Global.require('nw.gui');
    
    var menu = new Gui.Menu(),
        copy = new Gui.MenuItem({
            label: "コピー",
            click: function() {
                document.execCommand("copy");
            }
        }),
        paste = new Gui.MenuItem({
            label: "貼り付け",
            click: function() {
                document.execCommand("paste");
            }
        });

    menu.append(copy);
    menu.append(paste);

    $(document).on("contextmenu", function(e) {
        e.preventDefault();
        menu.popup(e.originalEvent.x, e.originalEvent.y);
    });
});

