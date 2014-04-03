/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true */
define(function (require, exports, module) {
    "use strict";
    
    var htmlEscape = [
        [/&lt;/g, "<"], [/&gt;/g, ">"],
        [/&amp;/g, "&"], [/&quot;/g, "\""],
        [/&#039;/g, "'"], [/&nbsp;/g, " "]
    ];
    
    /**
     * str内の"%s"に第２引数以降の文字列を順番に埋め込みます。
     * Example:
     *  String.format("Value: %s", obj.val);
     * 
     * @param {string} str 文字列
     * @param {Object...} obj 文字列に埋め込むパラメータ
     */
    function _format(string, obj) {
        var args = Array.prototype.slice.call(arguments),
            str = args.shift(),
            regexp = /%s/;
        
        while (regexp.test(str) && args.length) {
            str = str.replace(regexp, args.shift());
        }
        
        return str;
    }
    
    /**
     * HTMLエスケープを解除します。
     * @param {string} str エスケープを解く文字列
     */
    function _descapeHtml(str) {
        htmlEscape.forEach(function (pair) {
            str = str.replace(pair[0], pair[1]);
        });
        
        return str;
    }
    
    exports.format = _format;
    exports.descapeHtml = _descapeHtml;
});