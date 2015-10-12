path    = require "path"
config  = require "./gulp"
pjson   = require path.join(__dirname, "../../package.json")

module.exports =
    dir         : config.buildDir
    name        : pjson.name
    platform    : "darwin,win32"
    arch        : "all"
    version     : "0.33.4"

    out                 : "publish/"
    icon                : "icon/nco.icns"
    "app-bundle-id"     : null
    "app-version"       : pjson.version
    "helper-bundle-id"  : null
    ignore              : null
    prune               : true
    overwrite           : true
    asar                : true
    "sign"              : false
    "version-string"    :
        CompanyName         : pjson.author
        LegalCopyright      : "Copyright (c) 2015 Ragg"
        FileDescription     : "Nsen用コメントビューワ Nco"
        OriginalFilename    : "nco.exe"
        FileVersion         : pjson.version
        ProductVersion      : pjson.version
        ProductName         : pjson.productName
        InternalName        : null
