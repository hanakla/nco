/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true */
/*global $, define, document */
/**
 * コンテンツマネージャ。コメント一覧に表示するコンテンツを管理します。
 * Method
 *  - registColumn(id:string, name:string, generator:function(el:HTMLTableCellElement, comment:LiveComment)):boolean
 *      カラムジェネレータを登録します。idは任意でかぶらなそうなID、nameは列名です。
 *      generatorは必要なタイミングで新しいtd要素、コメント情報(LiveComment)とともに呼び出されるので
 *      受け取ったtd要素にコンテンツを設定してください（同期非同期問わない）
 *      generatorはコンテンツの生成をキャンセルできません。（しないでください）
 *      
 *      td要素には data-generator-id属性が付与され、それにジェネレータのidが設定されます。
 * 
 * - addFilter(id:string, filter:function(el:HTMLTableRowElement, comment:LiveComment)):boolean
 *      フィルターを登録します。
 *      filterは行を追加する前にtr要素、コメント情報(LiveComment)とともに呼び出され、
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
    
    var _tmpl = _.template((function () {/*
            <tr data-userid="<%=user.id%>" data-premium="<%=user.isPremium%>"
                data-date="<%=date.getTime()%>" data-score="<%=user.score%>"
                data-command="<%=command%>" <%=isMyPost?"data-mypost":""%>>
                <td><%=comment%></td>
            </tr>
        */}).toString().match(/[^]*\/\*([^]*)\*\/\}$/)[1]);
    
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
    
    /**
     * 直前に削除されるまでに追加されたtr要素
     * @type {Array.<HTMLTableRowElement>}
     */
    var _rows = [];
    
    function _noImplement(method) {
        return function () {
            console.info("ContentManager#%s は現在実装されていません。（今後実装するかも）", method);
        };
    }
    
    // 継承
    _.extend(exports, Backbone.Events);
    
    
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
        var tr = $(_tmpl(comment.toJSON()))[0];
        
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
     * @param {string} name 列名
     * @param {Function(HTMLTableCellElement, Object)} generator 列の内容を生成する関数
     * @return {boolean}
     */
    function registColumn(colId, name, generator) {
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
    function addFilter(filterId, filter) {
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
    function addRow(el) {
        if ($(el).is("tr")) {
            exports.trigger("_addRow", el);
        }
        
        return true;
    }
    
    
    /**
     * 今までに追加された行を取得します。
     * @param {Array.<HTMLTableRowElement>} 
     */
    function getRows() {
        return _.clone(_rows);
    }
    
    
    /**
     * カラム数を取得
     */
    function getColsCount() {
        return _.size(_columnGenerators);
    }
    
    // イベントリスニング
    ChannelManager
        .on("changeChannel", _onChannelChange)
        .on("said", _onReceiveComment);
    
    exports.on("_addRow", function (el) { _rows.push(el); });
    
    // 公開メソッド
    
    exports.registColumn = registColumn;
    exports.addFilter = addFilter;
    exports.addRow = addRow;
    
    exports.getColsCount = getColsCount;
    exports.getRows = getRows;
    
    exports.removeColumn = _noImplement("removeColumn");
    exports.removeFilter = _noImplement("removeFilter");
});