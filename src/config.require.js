requirejs({
    paths: {
        cs: "vendor/require/cs",
        text: "vendor/require/text",
        jade: "vendor/require/jade",
        styl: "vendor/require/styl",

        "coffee-script": "vendor/coffee-script",
        "jade-compiler": "vendor/jade-compiler",
        stylus: "vendor/stylus",
        backbone: "vendor/backbone",
        marionette: "vendor/backbone.marionette",
        underscore: "vendor/underscore",
        jquery: "vendor/jquery",
    },

    map : {
        "*": {
            // 古いAPI用
            "thirdparty/backbone" : "vendor/backbone",
            "thirdparty/underscore" : "vendor/underscore"
        }
    },

    shim: {
        backbone: {
            deps: ["underscore", "jquery"],
            exports: "Backbone"
        },
        marionette: {
            deps: ["backbone"],
            exports: "Backbone.Marionette"
        }

    }
}, ["cs!entry"]);
