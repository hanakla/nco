/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true */
define(function (require, exports, module) {
    "use strict";
    
    var _ = require("thirdparty/lodash");
    
    /**
     * str内の"%s"に第２引数以降の文字列を順番に埋め込みます。
     * Example:
     *  String.format("Value: %s", obj.val);
     * 
     * @param {string} str 文字列
     * @param {object...} obj 文字列に埋め込むパラメータ
     */
    function _format(string) {
        var args = _.toArray(arguments),
            str = args.shift(),
            regexp = /%s/;
        
        while (regexp.test(str) && args.length) {
            str = str.replace(/%s/, args.shift());
        }
        
        return str;
    }
    
    exports.format = _format;
});