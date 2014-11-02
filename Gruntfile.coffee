module.exports = (grunt) ->
    NWPATH =
        "Windows_NT"    : "bin\\nw.exe\\nw.exe"
        "Darwin"        : "bin/node-webkit.app/Contents/MacOS/node-webkit"

    os      = require "os"
    path    = require "path"
    spawn   = require("child_process").spawn

    debug = ->
        DS      = path.sep
        bin     = NWPATH[os.type()]
        proc    = null

        try
            if bin?
                proc = spawn bin, ["--enable-experimental-web-platform-features", "--debug", "src" + DS], {detached: true}
            else
                grunt.fail.fatal "Unsupported environment (#{os.type()})"

        catch e
            console.error e


    grunt.initConfig
        copy        :
            srcToWork   :
                expand  : true
                cwd     : "src"
                src     : "**"
                dest    : "_compiled/"

            nodeModules :
                expand  : true
                cwd     : "src/node_modules"
                src     : "**"
                dest    : "_compiled/node_modules/"
        coffee      :
            compile     :
                expand  : true
                cwd     : "src"
                src     : "*.coffee"
                dest    : "_compiled/",
                ext     : ".js"
        clean       :
            compiled        : ["_compiled/*"]
            beforeBuild: [
                "_release/*",
                #"_compiled/*/*.js",
                "_compiled/build.txt",
                "!_compiled/*.js",
                "!_compiled/**.min.js",
                "!_compiled/vendor/*",
                "!_compiled/node_modules/*"]
        cleanempty  :
            beforeBuild     :
                src     : ["_compiled/*"]
        requirejs   :
            dist :
                options         :
                    appDir      : "src/"
                    baseUrl     : "./"
                    dir         : "_compiled/"

                    mainConfigFile: "src/main.js"
                    name        : "nco"

                    fileExclusionRegExp: /^(node_modules)/
                    #removeCombined: true

        nodewebkit  :
            src     : ["./_compiled/**/*"] # Your node-webkit app
            options :
                platforms   : ['win', 'osx']
                version     : "0.10.4"
                buildDir    : "./release"
                cacheFir    : "./release/cache"
                #macCredits  :
                #macIcns     :
                #winIco      :

    # loadTasks
    grunt.loadNpmTasks "grunt-contrib-copy"
    grunt.loadNpmTasks "grunt-contrib-clean"
    grunt.loadNpmTasks 'grunt-contrib-coffee'
    grunt.loadNpmTasks "grunt-cleanempty"
    grunt.loadNpmTasks "grunt-contrib-requirejs"
    grunt.loadNpmTasks "grunt-node-webkit-builder"

    # regist Tasks
    grunt.registerTask "debug", debug
    grunt.registerTask "release", [
        "clean:compiled",
        "copy:srcToWork",
        "requirejs",
        "copy:nodeModules",
        "clean:beforeBuild",
        "cleanempty:beforeBuild",
        "nodewebkit"
    ]
    grunt.registerTask "default", ["debug"]
