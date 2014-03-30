/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true */
define(function (require, exports, module) {
    "use strict";
    
    var _           = require("thirdparty/lodash"),
        Global      = require("utils/Global"),
        FileSystem  = Global.require("fs"),
        Path        = Global.require("path"),
        StringUtil   = require("utils/StringUtil");
    
    var isInit = false,
        requireContexts = [],
        
        ncoRoot = Path.resolve("./"),
        ncoExtensions = Path.resolve("./extensions/"),
        
        globalConfig = {
            paths: {
                text: ncoRoot + "/thirdparty/require-text"
            }
        };
    
    
    /**
     * 拡張機能を読み込みます。
     * 
     * @param {string} directory 一つの拡張機能のルートディレクトリ
     * @param {Type} name 拡張機能の名前
     * @param {Type} entryPoint 最初に呼び出すファイルの名前(拡張子なし)
     * @return {$.Deferred}
     */
    function _loadExtension(directory, name, entryPoint) {
        var deferred = $.Deferred();
        
        if (FileSystem.existsSync(directory + "/" + entryPoint + ".js")) {
            var cfg = _.extend(_.clone(globalConfig), {
                context: name,
                baseUrl: directory
            }),
                requireContext = Global.requirejs.config(cfg);
            
            requireContext([entryPoint], function () { deferred.resolve(); }, function () { deferred.reject(); });
        }
        
        return deferred;
    }
    
    /**
     * ExtensionLoaderの初期化
     * @return {$.Deferred}
     */
    function _init() {
        if (isInit) {
            return $.Deferred().resolve().promise();
        }
        
        var loaders = [];
        
        try {
            var entries = FileSystem.readdirSync(ncoExtensions);
            var infos;
            
            infos = $.map(entries, function (entry) {
                var stat;
                
                var dir = StringUtil.format("%s/%s", ncoExtensions, entry);
                stat = FileSystem.statSync(dir);
                
                if (stat.isDirectory()) {
                    return {dir:dir, name: entry};
                }
            });
            
            _.each(infos, function (info) {
                loaders.push(_loadExtension(info.dir, info.name, "main"));
            });
        } catch (e) {
            Global.console.error("拡張機能の読み込みに失敗しました。 (%s)", e.message);
        }
        
        isInit = true;
        
        return $.when.apply(null, loaders);
    }
    
    
    exports.init = _init;
});