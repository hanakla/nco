packageJson = require "../../../package.json"

# See about properties
#   menuitem    : https://github.com/atom/electron/blob/02bdace366f38271b5c186412f42810ecb06e99e/docs/api/menu-item.md
#   accelerator : https://github.com/atom/electron/blob/02bdace366f38271b5c186412f42810ecb06e99e/docs/api/accelerator.md

module.exports = do ->
    menus = []

    menus.push {
        label: packageJson.productName
        submenu: [
            {
                label       : "New Window"
                command     : "app:new-window"
                accelerator : "CmdOrCtrl+N"
            }
            {
                label       : "Close Window"
                command     : "window:close"
                accelerator : "CmdOrCtrl+W"
            }
            { type: "separator"}
            {
                label       : "Preferences"
                command     : "app:show-settings"
                accelerator : "Command+,"
            }
            { type: "separator" }
            {
                label: "Quit"
                command: "app:quit", accelerator: "Command+Q"
            }
        ]
    }

    menus.push {
        label: "Edit"
        submenu: [
            {
                label       : "Undo"
                accelerator : "Command+Z"
            }
            {
                label       : "Redo"
                accelerator : "Shift+Command+Z"
            }
            { type: "separator"}
            {
                label       : "Cut"
                accelerator : "Command+X"
            }
            {
                label       : "Copy"
                accelerator : "Command+C"
            }
            {
                label       : "Paste"
                accelerator : "Command+V"
            }
            {
                label       : "Select All"
                accelerator : "Command+A"
            }
        ]
    }

    menus.push {
        label: "Developer"
        submenu: [
            {
                label       : "Reload"
                command     : "window:reload"
                accelerator : "Command+R"
            }
            {
                label       : "Toggle Developer Tools"
                command     : "window:toggle-dev-tools"
                accelerator : "F12"
            }
        ]
    } if global.app.isDevMode()

    menus.push {
        label: "Help"
        submenu: [
            {
                label       : "About #{packageJson.productName}"
                command     : "app:about"
            }
            { type: "separator" }
            {
                label       : "Version #{packageJson.version}"
                disable     : true
            }
        ]
    }

    return menus
