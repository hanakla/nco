define(function (require, exports, module) {
    var Jade = require("../jade");
    
    var cache = {},
        loadText;
        
    loadText = function (url, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.onreadystatechange = function (e) {
            e.readyState === 4 && callback(xhr.responseText);
        };
        xhr.send(null);
    };
    
    
    
    return {
        version : "0.0.1",
        
        write   : function (pluginName, name, write) {
            if (name in cache) {
                var text = cache[name];
                write([
                    "define('", pluginName, "!", name, "', ['jade'], ",
                    "function (jade) { return ", text, "});\n"
                ].join(""));
            }
        },
        
        load : function (name, parentRequire, loadCallback, config) {
            var url = parentRequire.toUrl(name + ".jade");
            
            loadText(url, function (text) {
                // Cache for r.js optimizer
                if (config.isBuild) {
                    cache[name] = Jade.compile(text, {compileDebug: false, client: true});
                }
                                           
                loadCallback(Jade.compile(text));
            });
        }
    };
});