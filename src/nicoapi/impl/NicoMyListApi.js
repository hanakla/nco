/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true, eqnull: true */
/*global $, define*/

/**
 * ニコニコ動画のマイリスト操作APIのラッピングを行います。
 * （参考！: http://efcl.info/wiki/niconicoapi/）
 * 
 * Methods
 *  - getMyListIndex(?withoutDefList:boolean):$.Promise
 *      マイリストの簡略な一覧情報を取得します。
 *      withoutDefListにtrueを指定すると"とりあえずマイリスト"を一覧から除外します。
 *      取得に成功したら{Array.<OmittedMyListGroup>}をresolveし、
 *      失敗した時はエラーメッセージとともにrejectされます。
 * 
 *  - getMyListGroup(?id:OmittedMyListGroup|number):$.Promise
 *      指定されたOmittedMyListGroupまたはidと対応する、MyListGroupインスタンスを取得します。
 *      取得できればMyListGroupオブジェクトと共にresolveされ、
 *      そうでなければエラーメッセージと共にrejectされます
 * 
 * Events
 * Properties
 */
define(function (require, exports, module) {
    "use strict";
    
    var _           = require("thirdparty/lodash"),
        Global      = require("utils/Global"),
        NicoAuthApi = require("./NicoAuthApi"),
        NicoUrl     = require("./NicoUrl"),
        OmittedMyListGroup = require("../models/OmittedMyListGroup"),
        MyListGroup = require("../models/MyListGroup.js");
    
    var 
        // 一分以上経過したらトークンを取得する
        FETCH_INTERVAL = 60000,
        
        // トークン抽出用パターン
        TOKEN_REGEXP = /NicoAPI.token = "([0-9a-z\-]*)";/;
    
    var _token = {
            timestamp: null,
            token: null,
        };
    
    /**
     * マイリストを操作するためのトークンを取得します。
     * @return {$.Promise}
     */
    function _fetchToken() {
        // 一定時間以内に取得したトークンがあればそれを返す
        if (_token.token != null && (new Date() - _token.timestamp) < FETCH_INTERVAL) {
            return $.Deferred().resolve(_token.token).promise();
        }
        
        //
        // トークン取得
        //
        var dfd = $.Deferred();
        $.ajax({url: NicoUrl.MyList.FETCH_TOKEN, cache: false})
            .done(function (data) {
                // データを取得したらトークンを取り出す
                var token = TOKEN_REGEXP.exec(data);
                
                if (token && token[1]) {
                    token = token[1];
                    
                    // キャッシュ
                    _token.timestamp = new Date();
                    _token.token = token;
                    
                    // トークンを返す
                    dfd.resolve(token);
                } else {
                    // 何故か取り出せない
                    dfd.reject("トークンが取り出せませんでした。");
                }
            })
            .fail(function (jqxhr, status, error) {
                // 通信エラー
                dfd.reject(error);
            });
        
        return dfd.promise();
    }
    
    
    /**
     * マイリストの簡略な一覧情報を取得します。
     * @param {boolean} withoutDefList trueを指定すると"とりあえずマイリスト"を
     *    一覧から除外します。
     * @return {$.Promise} 取得に成功したら{Array.<OmittedMyListGroup>}をresolveします。
     *    失敗した時はエラーメッセージとともにrejectされます。
     */
    function getMyListIndex(withoutDefList) {
        var dfd = $.Deferred(),
            lists = [];
        
        $.ajax({url:NicoUrl.MyList.GET_GROUPS, dataType:"json"})
            .done(function (res) {
                if (res.status !== "ok") {
                    dfd.reject("不明なエラー(API接続完了)");
                    return;
                }
                
                // 受信したデータからインデックスを作成
                _.each(res.mylistgroup, function (group) {
                    lists.push(new OmittedMyListGroup(group, getMyListGroup));
                });
                
                // とりあえずマイリストを取得
                if (withoutDefList !== true) {
                    lists.push(new OmittedMyListGroup(null, getMyListGroup));
                }
                
                dfd.resolve(lists);
            })
            .fail(function (jqxhr, status, error) {
                // 通信エラー
                dfd.reject(error);
            });
        
        return dfd.promise();
    }
    
    
    /**
     * MyListGroupインスタンスを取得します。
     * @param {OmittedMyListGroup|number} id OmittedMyListGroupかマイリストIDを渡します。
     * @return {$.Promise} 取得できればMyListGroupオブジェクトと共にresolveされ、
     *    そうでなければエラーメッセージと共にrejectされます
     */
    function getMyListGroup(id) {
        if (!id) {
            id = "default";
        }
        
        var dfd = $.Deferred(),
            getInstanceDfd = $.Deferred();
        
        if (id instanceof OmittedMyListGroup) {
            getInstanceDfd.resolve(new MyListGroup(id));
        } else {
            
            if (id !== "default") {
                id = id|0;
            }
            
            getMyListIndex().done(function (groups) {
                _.each(groups, function (obj) {
                    
                    // マイリストIDを元にインスタンスを取得
                    if (obj.id === id) {
                        getInstanceDfd.resolve(new MyListGroup(obj));
                        return false;
                    }
                });
                
                getInstanceDfd.reject("指定されたIDのマイリストは見つかりませんでした。");
            });
        }
        
        getInstanceDfd
            .done(function (instance) {
                instance.fetch()
                    .done(function () { dfd.resolve(instance); })
                    .fail(function (msg) { dfd.reject(msg); });
            })
            .fail(function (msg) { dfd.reject(msg); });
        
        
        /*
        if (_mylistGroups.groups && _mylistGroups.groups[id]) {
            return dfd.resolve(_mylistGroups.groups[id]).promise();
        }
        
        if (["", "default", null, void 0].indexOf(id) !== -1) {
            return dfd.resolve(new MyListGroup()).promise();
        }
        
        $.ajax({url:NicoUrl.MyList.GET_GROUPS, dataType:"json"})
            .done(function (res) {
                if (res.status !== "ok") {
                    dfd.reject("不明なエラー(API接続完了)");
                    return;
                }
                
                // リストが初期化されていなければ初期化
                _mylistGroups.groups = _mylistGroups.groups || {};
                
                var cache = _mylistGroups.groups,
                    groups = res.mylistgroup;
                
                // 受信したデータからMyListGroupインスタンスを生成
                _.each(groups, function (group) {
                    if (group.id === id) {
                        cache[group.id] = new MyListGroup(group);
                    }
                });
                
                if (_mylistGroups.groups[id]) {
                    dfd.resolve(_mylistGroups.groups[id]);
                } else {
                    dfd.reject("指定されたマイリストは見つかりませんでした。");
                }
            })
            .fail(function (jqxhr, status, error) {
                dfd.reject(error);
            });
        */
        return dfd.promise();
    }
    
    exports._fetchToken = _fetchToken;
    exports.getMyListIndex = getMyListIndex;
    exports.getMyListGroup = getMyListGroup;
});