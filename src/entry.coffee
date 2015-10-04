define (require, exports, module) ->
    nwutil      = require "utils/nwutil"
    NcoViewAPI  = require "cs!nco/_nco-bootstrap"
    NcoAPI      = require "cs!nco/nco"

    # Login check
    NcoAPI.request "checkLogged"
        .fail ->
            NcoViewAPI.execute "requestLogin"
