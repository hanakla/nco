/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true */

/**
 * ニコニコ動画のマイリスト操作APIのラッピングを行います。
 * （参考！: http://efcl.info/wiki/niconicoapi/）
 * 
 * Methods
 *  - getMyListGroups:$.Promise　-- マイリスト一覧を取得します。
 *      取得に成功したらMyListGroupの配列と一緒にresolveされ、
 *      失敗すればエラーメッセージとともにrejectされます。
 * Events
 * Properties
 */
define(function (require, exports, module) {
    "use strict";
    
    var _           = require("thirdparty/lodash"),
        Global      = require("utils/Global"),
        NicoAuthApi = require("./NicoAuthApi"),
        NicoUrl     = require("./NicoUrl"),
        MyListGroup = require("../models/MyListGroup.js");
    
    var FETCH_INTERVAL = 60000,
        TOKEN_REGEXP = /NicoAPI.token = "([0-9a-z\-]*)";/;
    
    var _token = {
            timestamp: null,
            token: null,
        },
        _mylistGroups = {
            timestamp: null,
            groups: null,
        };
    
    /**
     * マイリストを操作するためのトークンを取得します。
     * @return {$.Promise}
     */
    function _fetchToken() {
        // 一定時間以内に取得したトークンがあればそれを返す
        if (_token.token && _token.timestamp &&
            (new Date() - _token.timestamp) < FETCH_INTERVAL
        ) {
            return $.Deferred().resolve(_token.token).promise();
        }
        
        // トークンがないか無効なら取得
        var dfd = $.Deferred();
        
        $.ajax({url: NicoUrl.MyList.FETCH_TOKEN, cache: false})
            .done(function (data) {
                var token = TOKEN_REGEXP.exec(data);
                
                if (token && token[1]) {
                    token = token[1];
                    
                    _token.timestamp = new Date();
                    _token.token = token;
                    
                    dfd.resolve(token);
                } else {
                    dfd.reject("トークンが取り出せませんでした。");
                }
            })
            .fail(function (jqxhr, status, error) {
                dfd.reject(error);
            });
        
        return dfd.promise();
    }
    
    /**
     * マイリスト一覧を取得します。
     * @param {?boolean} nocache マイリスト一覧の最新の状態を取得するように指定します。
     * @type {$.Promise} 取得に成功したら
     */
    function _getMyListGroups(nocache) {
        var dfd = $.Deferred(),
            getter = _myListGroupGetter.bind(null, dfd, nocache);
        
        NicoAuthApi.isLogin()
            .done(getter)
            .fail(function () {
                NicoAuthApi.once("login", getter);
            });
        
        return dfd.promise();
    }
    
    /**
     * マイリスト一覧を実際に取得するリスナ関数
     * @private
     * @param {$.Deferred} dfd
     * @param {boolean} nocache
     */
    function _myListGroupGetter(dfd, nocache) {
        var isRequireFetch = (new Date() - _mylistGroups.timestamp) > FETCH_INTERVAL;
        
        // 更新すべきタイミングでない + キャッシュ非使用指定なし + データが一回はとってある
        if (isRequireFetch === false && nocache !== true && _mylistGroups.groups !== null) {
            // キャッシュを返す
            dfd.resolve(_.clone(_mylistGroups.groups));
            return;
        }
        
        // APIからマイリスト一覧を取得
        $.ajax({url:NicoUrl.MyList.GET_GROUPS, dataType:"json"})
        
            // レスポンス受信
            .done(function (res) {
                if (res.status !== "ok") {
                    dfd.reject("不明なエラー(API接続完了)");
                    return;
                }
                
                // リストが初期化されていなければ初期化
                _mylistGroups.groups = _mylistGroups.groups || {};
                
                // 最終更新日時を更新
                _mylistGroups.timestamp = new Date();
                
                var cache = _mylistGroups.groups,
                    groups = res.mylistgroup;
                
                // 受信したデータからMyListGroupインスタンスを生成
                _.each(groups, function (group) {
                    var old = cache[group.id];
                    
                    if (old) {
                        old.fetch();
                    } else {
                        cache[group.id] = new MyListGroup(group);
                    }
                });
                
                // とりあえずマイリストを取得
                if (cache.default) {
                    cache.default.fetch();
                } else {
                    cache.default = new MyListGroup();
                }
                
                dfd.resolve(_.clone(cache));
            })
            .fail(function (jqxhr, status, error) {
                dfd.reject(error);
            });
    }
    
    exports._fetchToken = _fetchToken;
    exports.getMyListGroups = _getMyListGroups;
});