module.exports = (grunt) ->
    PATHS =
        "Windows_NT"    : "bin\\nw.exe\\nw.exe"
        "Darwin"        : "bin/node-webkit.app/Contents/MacOS/node-webkit"

    os      = require("os")
    path    = require("path")
    spawn   = require("child_process").spawn

    debug = ->
        DS      = path.sep
        bin     = PATHS[os.type()]
        proc    = null
        
        try
            if bin?
                proc = spawn bin, ["--debug", "src" + DS], {detached: true}
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
                dest    : "compiled/"
            
            nodeModules :
                expand  : true
                cwd     : "src/node_modules"
                src     : "**"
                dest    : "compiled/node_modules/"
            
        clean       :
            compiled        : ["compiled/*"]
            beforeBuild: [
                "release/*",
                #"compiled/*/*.js",
                "compiled/build.txt",
                "!compiled/*.js",
                "!compiled/**.min.js",
                "!compiled/thirdparty/*",
                "!compiled/node_modules/*"]
        cleanempty  :
            beforeBuild     :
                src     : ["compiled/*"]
        requirejs   :
            dist :
                options         :
                    appDir      : "src/"
                    baseUrl     : "./"
                    dir         : "compiled/"
                    
                    mainConfigFile: "src/main.js"
                    name        : "nco"
                    
                    fileExclusionRegExp: /^(node_modules)/
                    #removeCombined: true
        nodewebkit  :
            src     : ["./compiled/**/*"] # Your node-webkit app
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
        "nodewebkit"]
