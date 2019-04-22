let app = require('electron').app;
let AppMenu = require('electron').Menu;
let MenuItem = require('electron').MenuItem;
let AppTray = require('electron').Tray;
let fileSystem = require('fs');
let NativeImage = require('electron').nativeImage;
let BrowserWindow = require('electron').BrowserWindow;
let AutoLaunch = require("auto-launch");
let log = require("electron-log");
let join = require('path').join;
let pjson = require('./package.json');
let globalShortcut = require('electron').globalShortcut;
let ContextMenu = require('electron-context-menu');
let session = require('electron').session;

app.requestSingleInstanceLock();

const isAlreadyRunning = app.on('second-instance', () => {
  if (whatsApp.window) {
    if (whatsApp.window.isMinimized()) {
      whatsApp.window.restore();
    }
    whatsApp.window.show();
  }
});

if (isAlreadyRunning) {
  app.focus();
}

if (process.argv.indexOf("--debug-log") >= 0) {
  log.transports.file.level = 'debug';
  log.info("Log level set from command line switch");
}

if (process.argv.indexOf("--disable-gpu") >= 0) {
  log.warn("Disabling GPU acceleration");
  app.disableHardwareAcceleration();
}

log.info("Log init, file " + app.getPath('userData') + "/log.log");

global.autolauncher = new AutoLaunch({
  name: app.getName()
});

global.onlyLinux = function (callback) {
  if (process.platform === 'linux') {
    return Function.bind.apply(callback, this, [].slice.call(arguments, 0));
  }
  return function () {};
};

global.onlyWin = function (callback) {
  if (process.platform === 'win32' || process.platform === 'win64') {
    return Function.bind.apply(callback, this, [].slice.call(arguments, 0));
  }
  return function () {};
};


global.config = {
  defaultSettings: {
    width: 1000,
    height: 720,
    thumbSize: 0
  },

  currentSettings: {},

  init() {
    config.loadConfiguration();
    config.saveTimeout = null;
  },

  loadConfiguration() {
    log.info("Loading configuration");
    var settingsFile = app.getPath('userData') + "/settings.json";
    try {
      var data = fileSystem.readFileSync(settingsFile);
      if (data != "" && data != "{}" && data != "[]") {
        config.currentSettings = JSON.parse(data);
        log.info("Configuration loaded from " + settingsFile);
      } else {
        config.currentSettings = config.defaultSettings;
        log.warn("Configuration file empty, loading default");
      }
    } catch (e) {
      config.currentSettings = config.defaultSettings;
      log.warn("Error loading configuration from " + settingsFile + " (" + e + "), loading default");
    }
    // First time configuration - eg. before app init
    if (config.get("disablegpu") == true) {
      log.warn("Disabling GPU acceleration");
      app.disableHardwareAcceleration();
    }
  },

  applyConfiguration() {
    log.info("Applying configuration");
    if (config.get("maximized") && config.get("startminimized") != true) {
      whatsApp.window.maximize();
    }

    if (config.get("useProxy")) {
      var session = whatsApp.window.webContents.session;
      var httpProxy = config.get("httpProxy");
      var httpsProxy = config.get("httpsProxy") || httpProxy;
      if (httpProxy) {
        log.info("Proxy configured: " + "http=" + httpProxy + ";https=" + httpsProxy);
        session.setProxy("http=" + httpProxy + ";https=" + httpsProxy, function () {});
      } else {
        log.info("No proxy");
      }
    }

    if (config.get("trayicon") != false && whatsApp.tray == undefined) {
      whatsApp.createTray();
    } else if (config.get("trayicon") == false && whatsApp.tray != undefined) {
      log.info("Destroying tray icon");
      whatsApp.tray.destroy();
      whatsApp.tray = undefined;
    }
    if (config.get("autostart") == true) {
      autolauncher.isEnabled().then(function (enabled) {
        if (!enabled) {
          autolauncher.enable();
          log.info("Autostart enabled");
        }
      });
    } else {
      autolauncher.isEnabled().then(function (enabled) {
        if (enabled) {
          autolauncher.disable();
          log.info("Autostart disabled");
        }
      });
    }
    whatsApp.window.setMenuBarVisibility(config.get("autoHideMenuBar") != true);
    whatsApp.window.setAutoHideMenuBar(config.get("autoHideMenuBar") == true);
  },

  saveConfiguration() {
    if (config.saveTimeout != null) {
      clearTimeout(config.saveTimeout);
      config.saveTimeout = null;
    }
    config.saveTimeout = setTimeout(function () {
      log.info("Saving configuration");
      config.set("maximized", whatsApp.window.isMaximized());
      if (config.currentSettings == undefined || JSON.stringify(config.currentSettings) == "") {
        // TODO: if we land here, we need to figure why and how. And fix that
        log.error("Configuration empty! This should not happen!");
        return;
      }
      fileSystem.writeFileSync(app.getPath('userData') + "/settings.json", JSON.stringify(config.currentSettings), 'utf-8');
      config.saveTimeout = null;
    }, 2000);
  },

  get(key) {
    return config.currentSettings[key];
  },

  set(key, value) {
    config.currentSettings[key] = value;
  },

  unSet(key) {
    if (config.currentSettings.hasOwnProperty(key)) {
      delete config.currentSettings[key];
    }
  }
};

global.config.init();

global.whatsApp = {
  init() {
    global.whatsApp.warningIcon = false;
    whatsApp.tray = undefined;
    whatsApp.createMenu();
    // Bitmask: LSB
    // First bit: warning icon (phone disconnected)
    // Second bit: new message red-dot
    global.whatsApp.iconStatus = 0;
    global.whatsApp.oldIconStatus = 0;
    global.whatsApp.newVersion = null;


    whatsApp.clearCache();
    whatsApp.openWindow();
    config.applyConfiguration();
  },

  createMenu() {
    log.info("Creating menu");
    whatsApp.menu =
      AppMenu.buildFromTemplate(require('./AppMenu'));
    AppMenu.setApplicationMenu(whatsApp.menu);
  },

  setNormalTray() {
    global.whatsApp.iconStatus = global.whatsApp.iconStatus & 0xFFFFFFFE;
    global.whatsApp.updateTrayIcon();
  },

  setWarningTray() {
    global.whatsApp.iconStatus = global.whatsApp.iconStatus | 0x00000001;
    global.whatsApp.updateTrayIcon();
  },

  isWarningTrayIcon() {
    return (global.whatsApp.iconStatus & 0x1) > 0;
  },

  setNewMessageIcon() {
    global.whatsApp.iconStatus = global.whatsApp.iconStatus | 0x00000002;
    global.whatsApp.updateTrayIcon();
  },

  clearNewMessageIcon() {
    global.whatsApp.iconStatus = global.whatsApp.iconStatus & 0xFFFFFFFD;
    global.whatsApp.updateTrayIcon();
  },

  isNewMessageIcon() {
    return (global.whatsApp.iconStatus & 0x2) > 0;
  },

  updateTrayIcon() {
    if (global.whatsApp.oldIconStatus == global.whatsApp.iconStatus) {
      return;
    }
    if (global.whatsApp.isWarningTrayIcon() && !global.whatsApp.isNewMessageIcon()) {
      log.info("Setting tray icon to warning");
      whatsApp.tray.setImage(__dirname + '/assets/icons/iconWarning.png');
    }
    if (global.whatsApp.isWarningTrayIcon() && global.whatsApp.isNewMessageIcon()) {
      log.info("Setting tray icon to warning with messages");
      whatsApp.tray.setImage(__dirname + '/assets/icons/iconWarningWithMsg.png');
    }
    if (!global.whatsApp.isWarningTrayIcon() && global.whatsApp.isNewMessageIcon()) {
      log.info("Setting tray icon to normal with messages");
      whatsApp.tray.setImage(__dirname + '/assets/icons/iconWithMsg.png');
    } else {
      log.info("Setting tray icon to normal");
      whatsApp.tray.setImage(__dirname + '/assets/icons/icon.png');
    }
    log.info("Mask value: " + global.whatsApp.iconStatus);
    global.whatsApp.oldIconStatus = global.whatsApp.iconStatus;
  },

  createTray() {
    log.info("Creating tray icon");
    var trayImg = __dirname + '/assets/etc/trayTemplate.png';
    trayImg = __dirname + '/assets/icons/icon.png';
    whatsApp.tray = new AppTray(trayImg);

    // Setting up a trayicon context menu
    whatsApp.trayContextMenu = AppMenu.buildFromTemplate([{
        label: ('Show'),
        visible: config.get("startminimized"), // Hide this option on start
        click: function () {
          whatsApp.window.show();
          whatsApp.window.setAlwaysOnTop(true);
          whatsApp.window.focus();
          whatsApp.window.setAlwaysOnTop(false);
        }
      },

      {
        label: ('Hide'),
        visible: !config.get("startminimized"), // Show this option on start
        click: function () {
          whatsApp.window.hide();
        }
      },

      // Quit WhatsApp
      {
        label: ('Quit'),
        click: function () {
          app.quit();
        }
      }
    ]);
    whatsApp.tray.setContextMenu(whatsApp.trayContextMenu);

    // Normal this will show the main window, but electron under Linux
    // dosent work with the clicked event so we are using the above
    // contextmenu insted - Rightclick the trayicon and pick Show
    // WhatsApp
    // More info:
    // https://github.com/electron/electron/blob/master/docs/api/tray.md
    // See the Platform limitations section.
    whatsApp.tray.on('clicked', () => {
      whatsApp.window.show();
      whatsApp.window.setAlwaysOnTop(true);
      whatsApp.window.focus();
      whatsApp.window.setAlwaysOnTop(false);
    });
    whatsApp.tray.on('click', () => {
      whatsApp.window.show();
      whatsApp.window.setAlwaysOnTop(true);
      whatsApp.window.focus();
      whatsApp.window.setAlwaysOnTop(false);
    });

    whatsApp.tray.setToolTip('WhatsApp Desktop');
  },

  clearCache() {
    log.info("Clearing cache");
    try {
      fileSystem.unlinkSync(app.getPath('userData') + '/Application Cache/Index');
      log.info("Cache Cleared")
    } catch (e) {
      log.warn("Error clearing cache: " + e);
    }
  },

  openWindow() {
    log.info("Open main window");
    whatsApp.window = new BrowserWindow({
      "y": config.get("posY"),
      "x": config.get("posX"),
      "width": config.get("width"),
      "height": config.get("height"),
      "minWidth": 600,
      "minHeight": 600,
      //"type": "toolbar",
      "title": "WhatsApp",
      "show": false,
      "autoHideMenuBar": config.get("autoHideMenuBar") == true,
      "icon": __dirname + "/assets/icons/icon.png",
      "webPreferences": {
        "nodeIntegration": false,
        "preload": join(__dirname, 'js', 'injected.js')
      }
    });

    whatsApp.window.on('closed', () => {
      whatsApp.window = null
    });


    ContextMenu({
      window: whatsApp.window
    });

    whatsApp.window.loadURL('https://web.whatsapp.com');

    whatsApp.window.webContents.on('did-finish-load', function () {

      log.info("Node Version: ", process.versions.node);
      log.info("Electron Version: ", process.versions.electron);
      log.info("Chromium Version:", process.versions.chrome);
    });

    if (config.get("useProxy")) {
      var session = whatsApp.window.webContents.session;
      var httpProxy = config.get("httpProxy");
      var httpsProxy = config.get("httpsProxy") || httpProxy;
      if (httpProxy) {
        session.setProxy("http=" + httpProxy + ";https=" + httpsProxy, () => {});
      }
    }

    if (config.get("startminimized") != true) {
      whatsApp.window.show();
    }

    whatsApp.window.on('move', () => {
      config.set("posX", whatsApp.window.getBounds().x);
      config.set("posY", whatsApp.window.getBounds().y);
      config.set("width", whatsApp.window.getBounds().width);
      config.set("height", whatsApp.window.getBounds().height);
      config.saveConfiguration();
    });

    whatsApp.window.on('resize', () => {
      config.set("posX", whatsApp.window.getBounds().x);
      config.set("posY", whatsApp.window.getBounds().y);
      config.set("width", whatsApp.window.getBounds().width);
      config.set("height", whatsApp.window.getBounds().height);
      config.saveConfiguration();
    });

    whatsApp.window.on('page-title-updated', onlyLinux((event, title) => {
      var count = title.match(/\((\d+)\)/);
      count = count ? count[1] : '';

      if (parseInt(count) > 0) {
        if (!whatsApp.window.isFocused() && global.config.get("quietMode") !== true) {
          log.info("Flashing frame");
          whatsApp.window.flashFrame(true);
        }
        var badge = NativeImage.createFromPath(app.getAppPath() + "/assets/badges/badge-" + (count > 9 ? 0 : count) + ".png");
        whatsApp.window.setOverlayIcon(badge, "new messages");
        global.whatsApp.setNewMessageIcon();
      } else {
        whatsApp.window.setOverlayIcon(null, "no new messages");
        global.whatsApp.clearNewMessageIcon();
      }
      log.info("Badge updated: " + count);
    }));

    whatsApp.window.on('page-title-updated', onlyWin((event, title) => {
      var count = title.match(/\((\d+)\)/);
      count = count ? count[1] : '';

      if (parseInt(count) > 0) {
        if (!whatsApp.window.isFocused()) {
          whatsApp.window.flashFrame(true);
        }
        var badge = NativeImage.createFromPath(app.getAppPath() + "/assets/badges/badge-" + (count > 9 ? 0 : count) + ".png");
        whatsApp.window.setOverlayIcon(badge, "new messages");
        global.whatsApp.setNewMessageIcon();
      } else {
        whatsApp.window.setOverlayIcon(null, "no new messages");
        global.whatsApp.clearNewMessageIcon();
      }
      log.info("Badge updated: " + count);
    }));

    whatsApp.window.webContents.on("new-window", (e, url) => {
      require('electron').shell.openExternal(url);
      e.preventDefault();
    });

    whatsApp.window.on('close', onlyWin((e) => {
      if (whatsApp.tray == undefined) {
        app.quit();
      } else if (whatsApp.window.forceClose !== true) {
        e.preventDefault();
        whatsApp.window.hide();
      }
    }));

    whatsApp.window.on('close', onlyLinux((e) => {
      if (whatsApp.tray == undefined) {
        whatsApp.window = null
        app.quit();
      } else if (whatsApp.window.forceClose !== true) {
        e.preventDefault();
        whatsApp.window.hide();
      }
    }));

    whatsApp.window.on("close", function () {
      if (settings.window) {
        settings.window.close();
        settings.window = null;
      }
    });

    // Toggle contextmenu content when window is shown
    whatsApp.window.on("show", function () {
      if (whatsApp.tray != undefined) {
        whatsApp.trayContextMenu.items[0].visible = false;
        whatsApp.trayContextMenu.items[1].visible = true;

        // Need to re-set the contextmenu for this to work under Linux
        // TODO: Only trigger this under Linux
        whatsApp.tray.setContextMenu(whatsApp.trayContextMenu);
      }
    });

    // Toggle contextmenu content when window is hidden
    whatsApp.window.on("hide", function () {
      if (whatsApp.tray != undefined) {
        whatsApp.trayContextMenu.items[0].visible = true;
        whatsApp.trayContextMenu.items[1].visible = false;

        // Need to re-set the contextmenu for this to work under Linux
        // TODO: Only trigger this under Linux
        whatsApp.tray.setContextMenu(whatsApp.trayContextMenu);
      }
    });

    app.on('before-quit', onlyLinux(() => {
      whatsApp.window.forceClose = true;
    }));

    app.on('before-quit', onlyWin(() => {
      whatsApp.window.forceClose = true;
    }));

    app.on('window-all-closed', onlyWin(() => {
      app.quit();
    }));
  }
};


global.settings = {
  init() {
    // if there is already one instance of the window created show that one
    if (settings.window) {
      settings.window.show();
    } else {
      settings.openWindow();
      settings.createMenu();
    }
  },

  createMenu() {
    settings.menu = new AppMenu();
    settings.menu.append(new MenuItem({
      label: "close",
      visible: false,
      accelerator: "esc",
      click() {
        settings.window.close();
      }
    }));
    settings.menu.append(new MenuItem({
      label: 'Toggle DevTools',
      accelerator: 'Ctrl+Shift+I',
      visible: false,
      click() {
        settings.window.toggleDevTools();
      }
    }));
    settings.menu.append(new MenuItem({
      label: 'Reload settings view',
      accelerator: 'CmdOrCtrl+r',
      visible: false,
      click() {
        settings.window.reload();
      }
    }));
    settings.window.setMenu(settings.menu);
    settings.window.setMenuBarVisibility(false);
  },

  openWindow() {
    settings.window = new BrowserWindow({
      "width": 550,
      "height": 550,
      "resizable": true,
      "center": true,
      "frame": true,
      "webPreferences": {
        "nodeIntegration": true,
      }
    });

    settings.window.loadURL("file://" + __dirname + "/html/settings.html");
    settings.window.show();

    settings.window.on("close", () => {
      settings.window = null;
    });
  }
};

global.pjson = pjson;
global.about = {
  init() {
    // if there is already one instance of the window created show that one
    if (about.window) {
      about.window.show();
    } else {
      about.openWindow();
      about.window.setMenu(null);
      about.window.setMenuBarVisibility(false);
    }
  },

  openWindow() {
    about.window = new BrowserWindow({
      "width": 600,
      "height": 450,
      "resizable": true,
      "center": true,
      "frame": true,
      "webPreferences": {
        "nodeIntegration": true,
      }
    });

    about.window.loadURL("file://" + __dirname + "/html/about.html");
    about.window.show();
    about.window.webContents.on("new-window", (e, url) => {
      require('electron').shell.openExternal(url);
      e.preventDefault();
    });

    about.window.on("close", () => {
      about.window = null;
    });
  }
};

const {
  ipcMain
} = require('electron');
ipcMain.on('phoneinfoupdate', (event, arg) => {
  global.phoneinfo.infos = arg;
  if (arg.info != "NORMAL") {
    global.whatsApp.setWarningTray();
  } else {
    global.whatsApp.setNormalTray();
  }
});
ipcMain.on('notificationClick', () => {
  global.whatsApp.window.show();
  global.whatsApp.window.setAlwaysOnTop(true);
  global.whatsApp.window.focus();
  global.whatsApp.window.setAlwaysOnTop(false);
});

global.phoneinfo = {
  init() {
    // if there is already one instance of the window created show that one
    if (phoneinfo.window) {
      phoneinfo.window.show();
    } else {
      phoneinfo.openWindow();
      phoneinfo.createMenu();
    }
  },

  createMenu() {
    phoneinfo.menu = new AppMenu();
    phoneinfo.menu.append(new MenuItem({
      label: "close",
      visible: false,
      accelerator: "esc",
      click() {
        phoneinfo.window.close();
      }
    }));
    phoneinfo.menu.append(new MenuItem({
      label: 'Reload phoneinfo view',
      accelerator: 'CmdOrCtrl+r',
      visible: false,
      click() {
        phoneinfo.window.reload();
      }
    }));
    phoneinfo.menu.append(new MenuItem({
      label: 'Toggle Developer Tools',
      accelerator: (function () {
        return 'Ctrl+Shift+I';
      })(),
      click: function (item, focusedWindow) {
        if (focusedWindow)
          focusedWindow.toggleDevTools();
      }
    }));
    phoneinfo.window.setMenu(phoneinfo.menu);
    phoneinfo.window.setMenuBarVisibility(false);
  },

  openWindow() {
    phoneinfo.window = new BrowserWindow({
      "width": 500,
      "height": 500,
      "resizable": true,
      "center": true,
      "frame": true,
      "webPreferences": {
        "nodeIntegration": true,
      }
    });

    phoneinfo.window.loadURL("file://" + __dirname + "/html/phoneinfo.html");
    phoneinfo.window.show();

    phoneinfo.window.on("close", () => {
      phoneinfo.window = null;
    });
  }
}

function spoofGlobalUserAgent() {
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3641.0 Safari/537.36';
    callback({
      cancel: false,
      requestHeaders: details.requestHeaders
    });
  });
}


app.on('ready', () => {
  spoofGlobalUserAgent();
  whatsApp.init();
  // setting of globalShortcut
  if (config.get("globalshortcut") == true) {
    globalShortcut.register('CmdOrCtrl + Alt + W', function () {
      if (whatsApp.window.isFocused())
        whatsApp.window.hide();
      else
        whatsApp.window.show();
    })
  }
});

// unregistering the globalShorcut on quit of application
app.on('will-quit', function () {
  if (config.get("globalshortcut") == true) {
    globalShortcut.unregisterAll();
  }
});