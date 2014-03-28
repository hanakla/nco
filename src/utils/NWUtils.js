/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
define(function (require, exports, module) {
    "use strict";
    
    var Global = require("utils/Global"),
        
        gui = Global.require("nw.gui"),
        win = gui.Window.get();
    
    var CookieUtil = {
        
    };
    
    Global.nco.win = win;
    
    console.log(win);
});