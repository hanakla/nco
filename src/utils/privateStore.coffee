define (require, exports, module) ->
    if ! WeakMap?
        exports.set = exports.get = -> undefined
        return

    _wm = new WeakMap()

    exports.set = (obj, key, value) ->
        store = if _wm.has(obj) then _wm.get(obj) else {}
        store[key] = value
        _wm.set obj, store

    exports.get = (obj, key) ->
        if _wm.has(obj)
            return _wm.get obj, key
        else
            return undefined
