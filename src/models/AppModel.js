/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true */
define(function (require, exports, module) {
    "use strict";
    
    var Global = require("utils/Global"),
        Backbone = require("thirdparty/backbone");
    
    var AppModel = Backbone.Model.extend({
        defaults : {
            "id": 0,
            "currentCh": null,
        },
        
        initialize: function () {
            this.set("currentCh", "nsen/toho");
            
            this.on("change", function () { this.save(); });
            this.on("change:currentCh", function (model) {
                Global.console.info("チャンネルが変更されました: %s", this.get("currentCh"));
            });
            
            this.fetch();
        },
        
        sync: function (method, model, options) {
            var resp = null;
            
            if (method === "create" || method === "update") {
                localStorage.setItem("nco.config", JSON.stringify(model.toJSON()));
                resp = JSON.parse(localStorage.getItem("nco.config"));
            }
            
            if (method === "delete") {
                localStorage.removeItem("nco.config");
                resp = {result: "success"};
            }
            
            if (method === "read") {
                resp = localStorage.getItem("nco.config");
                resp = resp ? JSON.parse(resp) : {};
            }
            
            if (typeof options.success === "function") {
                options.success(resp);
            }
            
            return $.Deferred().resolve().promise();
        }
    });
    
    module.exports = new AppModel();
});