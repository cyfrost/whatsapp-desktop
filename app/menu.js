(function(scope) {
    "use strict";
   
    var template = [{
      label: "&" + ('Edit'),
      submenu: [{
        label: ('Undo'),
        accelerator: 'CmdOrCtrl+Z',
        role: 'undo'
       },
       {
        label: ('Redo'),
        accelerator: 'Shift+CmdOrCtrl+Z',
        role: 'redo'
       },
       {
        type: 'separator'
       },
       {
        label: ('Cut'),
        accelerator: 'CmdOrCtrl+X',
        role: 'cut'
       },
       {
        label: ('Copy'),
        accelerator: 'CmdOrCtrl+C',
        role: 'copy'
       },
       {
        label: ('Paste'),
        accelerator: 'CmdOrCtrl+V',
        role: 'paste'
       },
       {
        label: ('Select All'),
        accelerator: 'CmdOrCtrl+A',
        role: 'selectall'
       },
       {
        type: 'separator'
       },
       {
        label: ('Settings'),
        accelerator: 'CmdOrCtrl+,',
        click: function() {
         global.settings.init();
        }
       }
      ]
     },
     {
      label: "&" + ('View'),
      submenu: [{
        label: ('Reload'),
        accelerator: 'CmdOrCtrl+R',
        click: function(item, focusedWindow) {
         if (focusedWindow)
          focusedWindow.reload();
        }
       },
       {
        type: 'separator'
       },
       {
        label: ('Toggle Full Screen'),
        accelerator: (function() {
         return 'F11';
        })(),
        click: function(item, focusedWindow) {
         if (focusedWindow)
          focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
        }
       },
       {
        label: ('Dark mode'),
        accelerator: 'CmdOrCtrl+Shift+Alt+D',
        type: 'checkbox',
        checked: (function() {
         return global.config.get("darkMode");
        })(),
        click: function(item, focusedWindow) {
         global.config.set("darkMode", global.config.get("darkMode") != true);
         item.checked = global.config.get("darkMode");
         global.config.saveConfiguration();
         global.config.applyConfiguration();
         if (focusedWindow)
          focusedWindow.reload();
        }
       },
       {
        label: ('Quiet mode'),
        accelerator: 'CmdOrCtrl+Shift+Alt+Q',
        type: 'checkbox',
        checked: (function() {
         return global.config.get("quietMode");
        })(),
        click: function(item, focusedWindow) {
         global.config.set("quietMode", global.config.get("quietMode") != true);
         item.checked = global.config.get("quietMode");
         global.config.saveConfiguration();
        }
       },
       {
        type: 'separator'
       },
       {
        label: ('Toggle Developer Tools'),
        accelerator: (function() {
         return 'Ctrl+Shift+I';
        })(),
        click: function(item, focusedWindow) {
         if (focusedWindow)
          focusedWindow.toggleDevTools();
        }
       },
       {
        type: 'separator'
       },
       {
        label: ('Phone info'),
        accelerator: (function() {
         return 'Ctrl+Shift+N';
        })(),
        click: function(item, focusedWindow) {
         if (focusedWindow)
          global.phoneinfo.init();
        }
       }
      ]
     },
     {
      label: "&" + ('Window'),
      role: 'window',
      submenu: [{
        label: ('Minimize'),
        accelerator: 'CmdOrCtrl+M',
        role: 'minimize'
       },
       {
        label: ('Close'),
        accelerator: 'CmdOrCtrl+W',
        role: 'close'
       },
       {
        label: 'close2',
        visible: false,
        accelerator: "esc",
        role: 'close'
       }
      ]
     },
     {
      label: "&" + ('Audio'),
      submenu: [{
        label: ('Increase Audio Rate by 20%'),
        accelerator: 'CmdOrCtrl+=',
        click: function(item, focusedWindow) {
         focusedWindow && focusedWindow.webContents.executeJavaScript(
          "window.audioRate = (window.audioRate || 1) + 0.2"
         )
        }
       },
       {
        label: ('Decrease Audio Rate by 20%'),
        accelerator: 'CmdOrCtrl+-',
        click: function(item, focusedWindow) {
         focusedWindow && focusedWindow.webContents.executeJavaScript(
          "window.audioRate = (window.audioRate || 1) - 0.2"
         )
        }
       }
      ]
     }
    ];
   
    template.unshift({
     label: '&File',
     submenu: [{
       label: ('About'),
       click: () => {
        global.about.init();
       }
      },
      {
       label: ('Quit'),
       accelerator: 'Ctrl+Q',
       click: () => {
        require('electron').app.quit()
       }
      },
     ]
    });
   
    module.exports = template;
   
   })(this);