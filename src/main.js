/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
requirejs.config({
    paths : {
        "text" : "thirdparty/require-text",
    },
    
    shim : {
        "thirdparty/backbone" : { exports: "Backbone" }
    }
});

define(function (require, exports, module) {
    require("nco");
});