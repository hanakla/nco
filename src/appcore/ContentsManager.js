/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true */
/*global $, define, document */
/**
 * コンテンツマネージャ。コメント一覧に表示するコンテンツを管理します。
 * Method
 *  - registColumn(id:string, generator:function(el:HTMLTableCellElement, comment:LiveComment#toJSON())):boolean
 *      カラムジェネレータを登録します。
 *      generatorは必要なタイミングで新しいtd要素、コメント情報(LiveCommentのJSON化オブジェクト)とともに呼び出されるので
 *      受け取ったtd要素にコンテンツを設定してください（同期非同期問わない）
 *      generatorはコンテンツの生成をキャンセルできません。（しないでください）
 *      
 *      td要素には data-generator-id属性が付与され、それにジェネレータのidが設定されます。
 * 
 * - addFilter(id:string, filter:function(el:HTMLTableRowElement, comment:LiveComment#toJSON())):boolean
 *      フィルターを登録します。
 *      filterは行を追加する前にtr要素、コメント情報(LiveCommentのJSON化オブジェクト)とともに呼び出され、
 *      登録されたすべてのフィルターを通過した後に行として表示されます。
 *      もしいずれかのフィルターが"false"を返した場合、その要素の表示はキャンセルされます。
 * 
 * - addRow(el:HTMLTableRowElement)
 *      カスタムtr要素をコメントリストに追加します。
 * 
 * - getColsCount():number
 *      列数列数を取得します。
 * 
 * Events
 *  （内部モジュール用イベント）
 *  - _clear:()
 *      一覧の削除リクエストを通知する
 *  - _addrow:(row:HTMLTableRowElement)
 *      行の追加リクエスト
 */
define(function (require, exports, module) {
    "use strict";
    
    var _               = require("thirdparty/lodash"),
        Backbone        = require("thirdparty/backbone"),
        ChannelManager  = require("appcore/ChannelManager"),
        Global          = require("utils/Global");
    
    /**
     * 生成した列
     */
    
    /**
     * カラムジェネレータのid-functionマップ
     * @type {Object.<string, Function>}
     */
    var _columnGenerators = {};
    
    /**
     * フィルターのid-functionマップ
     * @type {Object.<string, Function>}
     */
    var _rowFilters = {};
    
    
    function _noImplement(method) {
        return function () {
            console.info("ContentManager#%s は現在実装されていません。（今後実装するかも）", method);
        };
    }
    
    
    /**
     * チャンネル変更時のイベント 
     */
    function _onChannelChange() {
        exports.trigger("_clear");
    }
    
    
    /**
     * コメント受信時のイベント
     * @param {LiveComment} comment
     */
    function _onReceiveComment(comment) {
        var tr = document.createElement("tr");
        comment = comment.toJSON();
        
        // ジェネレータを通す
        _.each(_columnGenerators, function (fn, id) {
            var el = document.createElement("td");
            
            fn(el, _.clone(comment));
            el.setAttribute("data-data-generator-id", id);
            
            tr.appendChild(el);
        });
        
        // フィルターを通す
        var result =  true;
        _.each(_rowFilters, function (fn, id) {
            var r = fn(tr, _.clone(comment));
            result = result && (r !== false);
            return r !== false;
        });
        
        if (result !== false) {
            exports.trigger("_addRow", tr);
        }
    }
    
    /**
     * @param {string} generatorId ジェネレータID
     * @param {Function(HTMLTableCellElement, Object)} generator 列の内容を生成する関数
     * @return {boolean}
     */
    function _registColGenerator(colId, generator) {
        if (_columnGenerators[colId]) {
            Global.console.error("このIDのカスタム列は登録済みです(%s)", colId);
            return false;
        }
        
        if (!_.isString(colId) || !_.isFunction(generator)) {
            Global.console.error("不正な引数です。", colId, generator);
            return false;
        }
        
        _columnGenerators[colId] = generator;
        return true;
    }
    
    
    /**
     * @param {string} filterId フィルタID
     * @param {function(HTMLTableRowElement, Object)} filter フィルタ関数
     * @return {boolean}
     */
    function _registFilter(filterId, filter) {
        if (_rowFilters.filters[filterId]) {
            Global.console.error("このIDのフィルターは登録済みです(%s)", filterId);
            return false;
        }
        
        if (!_.isString(filterId) || !_.isFunction(filter)) {
            Global.console.error("不正な引数です。", filterId, filter);
            return false;
        }
        
        _rowFilters.filters[filterId] = filter;
        return true;
    }
    
    
    /**
     * @param {HTMLTableRowElement} el 追加するtr要素
     */
    function _addRow(el) {
        if ($(el).is("tr")) {
            exports.trigger("_addRow", el);
        }
        
        return true;
    }
    
    
    /**
     * カラム数を取得
     */
    function _getColsCount() {
        return _.size(_columnGenerators);
    }
    
    // イベントリスニング
    ChannelManager
        .on("changeChannel", _onChannelChange)
        .on("said", _onReceiveComment);
    
    // 公開メソッド
    _.extend(exports, Backbone.Events);
    
    exports.registColumn = _registColGenerator;
    exports.addFilter = _registFilter;
    exports.addRow = _addRow;
    
    exports.getColsCount = _getColsCount;
    
    exports.removeColumn = _noImplement("removeColumn");
    exports.removeFilter = _noImplement("removeFilter");
});