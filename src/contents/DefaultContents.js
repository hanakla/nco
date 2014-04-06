/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true, eqnull: true */
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
 *  - init
 *      チャンネル切り替え後の初期化完了を通知します。
 * 
 *  （内部モジュール用イベント）
 *  - _clear:()
 *      一覧の削除リクエストを通知する
 *  - _addrow:(row:HTMLTableRowElement)
 *      行の追加リクエスト
 */
define(function (require, exports, module) {
    "use strict";
    
    var _               = require("thirdparty/lodash"),
        ContentsManager = require("contents/ContentsManager");
    
    var NL = /\n/,
        TPL_ML = _.template((function () {/*
        <pre><%=comment%></pre>
        <a class="nco-comment-ml-toggle" href="#"></a>
        */}).toString().match(/[^]*\/\*([^]*)\*\/\}$/)[1]);
    
    ////
    // 標準コメント列
    ////
    $(document).on("click", "a.nco-comment-ml-toggle", function () {
        $(this).parent().toggleClass("open");
    });
    
    ContentsManager.registColumn("nco-comment", "コメント", function (el, comment) {
        var com = comment.get("comment"),
            isMultiLine = NL.test(com);
        
        if (isMultiLine) {
            el.classList.add("nco-comment-ml");
            el.innerHTML = TPL_ML({comment: com});
        } else {
            el.innerHTML = com;
        }
        
        // <td><pre class="nco-comment-item"><%=comment%></pre></td>
    });
    
//    ContentsManager.registColumn("nco-dbg", "コメント", function (el, comment) {
//        el.innerText="Fuck";
//    });
});