define(function (require, module, exports) {
    var nw      = window.require('nw.gui'),
        path    = window.require("path");

    window.nw = nw;

    var debugMode, escapeRegExp, nwWindow;

    nwWindow    = nw.Window.get();
    debugMode   = (nw.App.argv.indexOf("--debug")) !== -1;

    /**
     * from http://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
     */
    escapeRegExp = function (str) {
        return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    };


    if (debugMode) {
        nwWindow.on("devtools-closed", function() { nwWindow.showDevTools();});
        nwWindow.showDevTools();
    }


    // Attach global exception catcher
    (function () {
        var uncaughtCallback = function(ex) {
            typeof console.groupCollapsed === "function"
                && console.groupCollapsed("%cCatch %cUncaught exception: " + ex.message, "color:#00c3d5", "color:red");

            var trace   = ex.stack,
                path    = process.env.PWD;

            trace = trace.replace(new RegExp(escapeRegExp(path + "/"), "g"), "");

            console.debug("%c" + ex.message, "color:red");
            console.debug("Stack Trace\n\n" + trace)

            typeof console.groupEnd === "function"
                && console.groupEnd();

            return false;
        };

        process.on("uncaughtException", uncaughtCallback);

        window.addEventListener("beforeunload", function() {
            process.removeListener("uncaughtException", uncaughtCallback);
            console.log("Exception listener dispose successfully");
        }, false);
    }());


    // Create MacOS default menus
    (function () {
        var mb = new nw.Menu({type:"menubar"});
        mb.createMacBuiltin("Nco");
        nwWindow.menu = mb;
    }());


    //
    // Module cache clear command
    //
    (function () {
        window.clearModuleCache = function () {
            global.module.constructor._cache = {}
            //
            // delete global.require.cache;
            // global.require.cache = [];
        };

        Object.defineProperty(window, "cmc", {
            get : function () {
                window.clearModuleCache();
                return true;
            },
            set : function () {}
        });
    }());
}());
