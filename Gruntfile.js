module.exports = function(grunt) {
    grunt.initConfig({
        nodewebkit: {
            options: {
                build_dir: "./build",
                credits: "./src/credits.html",
                //mac_icns: "./example/icon.icns", // Mac用アイコン
                mac: true,
                win: true, 
                linux32: false,
                linux64: false,
            },
            src: "./src/**/*" // Your node-webkit app
        }
    });

    grunt.loadNpmTasks("grunt-node-webkit-builder");
    
    grunt.registerTask("run", function () {
        var os      = require("os"),
            path    = require("path"),
            spawn   = require("child_process").spawn,
            
            ds = path.sep,
            bin,
            proc;
        
        try {
            switch (os.type()) {
                case "Windows_NT":
                    // Windows
                    bin = "bin\\nw.exe\\nw.exe";
                    break;
                case "Darwin":
                    // Mac OS X
                    bin = "bin/node-webkit.app/Contents/MacOS/node-webkit";
                    break;
                default:
                    grunt.fail.fatal("Unsupported environment (" + os.type() + ")");
                    return;
            }
        } catch (e) {
            grunt.fail.fatal("Unknown error (" + e.message + ")");
            return;
        }
        
        if (bin) {
            proc = spawn(bin, ["src" + ds, "--debug"]);
        }
    });
    
    grunt.registerTask("build", ["nodewebkit"]);
};