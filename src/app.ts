import * as path from 'path';
import * as fs from 'fs';
import {
  app,
  ipcMain as ipc,
  shell,
  dialog,
  BrowserWindow,
  Menu,
  Tray,
  MenuItemConstructorOptions,
  session,
  nativeImage
} from 'electron';
import * as log from 'electron-log';
import * as electronContextMenu from 'electron-context-menu';
import config, { ConfigKey } from './config';
import menu from './menu';
import { is } from 'electron-util';

let mainWindow: BrowserWindow;
let onlineStatusWindow: BrowserWindow;
let aboutWindow: BrowserWindow;
let isQuitting = false;
let tray: Tray;
let isOnline = false;
let trayContextMenu: any;
let chatBGCSSKey: string;
const shouldStartMinimized =
  config.get(ConfigKey.EnableTrayIcon) &&
  (app.commandLine.hasSwitch('start-minimized') ||
    app.commandLine.hasSwitch('launch-minimized') ||
    config.get(ConfigKey.LaunchMinimized));

init();

function noMacOS() {
  if (is.macos) {
    log.error(
      'Fatal: Detected process env as darwin, aborting due to lack of app support.'
    );
    app.quit();
  }
}

function init() {
  noMacOS();
  validateSingleInstance();
  app.setAppUserModelId('WhatsApp');
  electronContextMenu({
    showCopyImageAddress: true,
    showSaveImageAs: true,
    showCopyImage: true
  });

  app.on('before-quit', () => {
    isQuitting = true;
    config.set(ConfigKey.LastWindowState, {
      bounds: mainWindow.getBounds(),
      fullscreen: mainWindow.isFullScreen(),
      maximized: mainWindow.isMaximized()
    });
  });

  app.on('ready', initWhatsApp);
}

function initWhatsApp() {
  loadNetworkChangeHandler();
  spoofGlobalUserAgent();
  createWindow();
  setAppMenus();
  checkAutoStartStatus();
  createTray();
  registerIPCHandlers();
}

function registerIPCHandlers() {
  ipc.on('notification-click', () => mainWindow.show());
}

function spoofGlobalUserAgent() {
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['User-Agent'] =
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.88 Safari/537.36';
    callback({
      cancel: false,
      requestHeaders: details.requestHeaders
    });
  });
}

function validateSingleInstance() {
  const gotTheLock = app.requestSingleInstanceLock();

  if (!gotTheLock) {
    log.error(
      'Fatal: Failed to acquire single instance lock on main thread. Aborting!'
    );
    app.quit();
  } else {
    app.on('second-instance', () => {
      log.info(
        'Detected second instance invocation, resuing initial instance instead'
      );
      mainWindow.show();
    });
  }
}

function displayMainWindow() {
  shouldStartMinimized ? mainWindow.hide() : mainWindow.show();
  log.info(
    `Window display mode: ${shouldStartMinimized ? 'hidden' : 'visible'}`
  );
}

function createWindow(): void {
  const lastWindowState: any = config.get(ConfigKey.LastWindowState);

  mainWindow = new BrowserWindow({
    title: app.name,
    width: lastWindowState.bounds.width,
    height: lastWindowState.bounds.height,
    x: lastWindowState.bounds.x,
    y: lastWindowState.bounds.y,
    webPreferences: {
      nodeIntegration: false,
      nativeWindowOpen: false,
      preload: path.join(__dirname, 'preload-injected.js')
    },
    show: !shouldStartMinimized
  });

  log.info('Main window creation successful!');

  if (
    lastWindowState.maximized &&
    !mainWindow.isMaximized() &&
    !shouldStartMinimized
  ) {
    mainWindow.maximize();
  }

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.blur();
      mainWindow.hide();
    }
  });

  mainWindow.on('minimize', () => toggleAppVisiblityTrayItem(false));
  mainWindow.on('hide', () => toggleAppVisiblityTrayItem(false));
  mainWindow.on('show', () => toggleAppVisiblityTrayItem(true));
  mainWindow.webContents.on('did-finish-load', onLoadSuccess);
  mainWindow.webContents.on('new-window', (event, url, _1, _2, options) =>
    shell.openExternal(url)
  );

  mainWindow.on('page-title-updated', (event, title) => {
    let count: any = title.match(/\((\d+)\)/);
    count = count ? count[1] : '';

    if (parseInt(count) > 0) {
      mainWindow.flashFrame(true);
      var badge = nativeImage.createFromPath(
        app.getAppPath() +
          'src/assets/badges/badge-' +
          (count > 9 ? 0 : count) +
          '.png'
      );
      mainWindow.setOverlayIcon(badge, 'new messages');
    } else {
      mainWindow.setOverlayIcon(null, 'no new messages');
    }
    log.info('Badge updated: ' + count);
  });

  mainWindow.loadURL('https://web.whatsapp.com');
}

function removeTrayIcon() {
  if (is.linux) {
    log.warn(
      'Tray icon cannot be removed under linux due to a inconsistent behaviour of Tray indicators extension under GNOME and KDE. Waiting for app restart instead.'
    );
    dialog.showMessageBox(mainWindow, {
      buttons: ['OK'],
      message: 'WhatsApp desktop needs to be restarted',
      detail: 'This change will take place on next restart of WhatsApp.'
    });
    return;
  }
  tray.destroy();
  tray = undefined;
  log.info('Tray destroyed!');
}

function toggleAppVisiblityTrayItem(isMainWindowVisible: boolean): void {
  if (!config.get(ConfigKey.EnableTrayIcon) || !tray || !trayContextMenu) {
    return;
  }

  trayContextMenu.getMenuItemById('show-win').visible = !isMainWindowVisible;
  trayContextMenu.getMenuItemById('hide-win').visible = isMainWindowVisible;
  tray.setContextMenu(trayContextMenu);
}

function loadNetworkChangeHandler() {
  onlineStatusWindow = new BrowserWindow({
    width: 0,
    height: 0,
    show: false,
    webPreferences: { nodeIntegration: true }
  });

  const onlineStatusWindowRes = `file://${path.resolve(
    app.getAppPath(),
    'src/network-status.html'
  )}`;

  onlineStatusWindow.loadURL(onlineStatusWindowRes);

  ipc.on('online-status-changed', (_event: any, status: string) => {
    isOnline = status === 'online';
    log.info('Network change detected: now ' + status);
    if (config.get(ConfigKey.EnableTrayIcon) && tray) {
      const icon = status === 'online' ? 'icon.png' : 'offline.png';
      const iconPath = path.join(app.getAppPath(), 'src/assets/icons/', icon);
      tray.setImage(iconPath);
    }
  });
  log.info('Registered IPC handler for network change detection.');
}

function setAppMenus() {
  const isMenuBarVisible = !config.get(ConfigKey.AutoHideMenuBar);
  Menu.setApplicationMenu(menu);
  mainWindow.setMenuBarVisibility(isMenuBarVisible);
  mainWindow.autoHideMenuBar = !isMenuBarVisible;
  log.info(`App menu is ${isMenuBarVisible ? 'set' : 'removed'}`);
}

function checkAutoStartStatus() {
  const isAutoStartEnabled = config.get(ConfigKey.AutoStartOnLogin);
  log.info(
    `Auto-start at login is ${isAutoStartEnabled ? 'enabled' : 'disabled'}, ${
      isAutoStartEnabled ? 'enabling' : 'disabling'
    } login item (if applicable).`
  );

  isAutoStartEnabled ? addSelfToSystemStartup() : removeSelfToSystemStartup();
}

function onLoadSuccess() {
  log.info(
    `WhatsApp loaded successfully...\n\nDebug Info:\n============\nNode: ${process.versions.node} \nElectron: ${process.versions.electron} \nChromium: ${process.versions.chrome}\n\n`
  );

  if (config.get(ConfigKey.EnableTrayIcon) && tray) {
    tray.setImage(path.join(app.getAppPath(), 'src/assets/icons/icon.png'));
  }

  displayMainWindow();
  reloadAppTheme();
}

function createTray() {
  if (!config.get(ConfigKey.EnableTrayIcon) || tray) {
    log.error('Tray already exists, ignoring recreation request.');
    return;
  }

  const appName = app.name;
  const icon = isOnline ? 'icon.png' : 'offline.png';
  const iconPath = path.join(app.getAppPath(), 'src/assets/icons/', icon);

  const contextMenuTemplate: MenuItemConstructorOptions[] = [
    {
      label: 'Show',
      click: () => mainWindow.show(),
      visible: false,
      id: 'show-win'
    },
    {
      label: 'Hide',
      click: () => mainWindow.hide(),
      id: 'hide-win'
    },
    {
      label: 'About',
      click: showAppAbout
    },
    {
      role: 'quit'
    }
  ];

  trayContextMenu = Menu.buildFromTemplate(contextMenuTemplate);
  tray = new Tray(iconPath);
  tray.setToolTip(appName);
  tray.setContextMenu(trayContextMenu);
  tray.on('click', () => mainWindow.show());
  tray.on('double-click', () => mainWindow.show());
  log.info('Tray created successfully!');
}

function setAutoStartOnFreedesktop(enableAutoStart: boolean) {
  const xdgConfigDirectory: string = process.env.XDG_CONFIG_HOME;
  const useFallback = !xdgConfigDirectory || !fs.existsSync(xdgConfigDirectory);
  const startupDirectory = useFallback
    ? path.join(require('os').homedir(), '.config/autostart')
    : path.join(xdgConfigDirectory, 'autostart');
  const dotDesktopFile = path.join(startupDirectory, 'whatsapp.desktop');
  log.info(`File: ${dotDesktopFile}, using fallback: ${useFallback}`);

  if (!enableAutoStart) {
    if (!fs.existsSync(dotDesktopFile)) {
      log.warn('File not found: autostart script not found.');
      return;
    }

    fs.unlink(dotDesktopFile, (err) => {
      if (err) {
        return log.error(`Failed to remove self from autostart. ${err}`);
      }

      log.info('Successfully removed self from autostart on Linux');
    });
    return;
  }

  const freeDesktopStartupScript = `[Desktop Entry]
Name=WhatsApp
Exec=/opt/WhatsApp/whatsapp %U
Terminal=false
Type=Application
Icon=whatsapp
StartupWMClass=WhatsApp
Comment=WhatsApp desktop client for Linux, and Windows.
Categories=Network;
`;

  if (fs.existsSync(dotDesktopFile)) {
    log.warn(
      'Autostart script already exists, overwriting with current config.'
    );
  }

  fs.writeFile(dotDesktopFile, freeDesktopStartupScript, (err) => {
    if (err) {
      return log.error(`Failed to add WhatsApp to startup ${err}`);
    }

    log.info('WhatsApp added to startup on Linux successfully!');
  });
}

function addSelfToSystemStartup() {
  if (is.windows) {
    const appFolder = path.dirname(process.execPath);
    const exeName = path.basename(process.execPath);
    const appPath = path.resolve(appFolder, exeName);

    app.setLoginItemSettings({
      openAtLogin: true,
      path: appPath
    });
    log.info('Added WhatsApp to auto-start at login');
  } else if (is.linux) {
    setAutoStartOnFreedesktop(true);
  }
}

function removeSelfToSystemStartup() {
  if (is.windows) {
    app.setLoginItemSettings({
      openAtLogin: false
    });
    log.info('Removed WhatsApp from startup items');
  } else if (is.linux) {
    setAutoStartOnFreedesktop(false);
  }
}

function showAppAbout() {
  if (aboutWindow) {
    aboutWindow.show();
    return;
  }

  aboutWindow = new BrowserWindow({
    title: 'About WhatsApp Desktop',
    width: 490,
    height: 630,
    resizable: false,
    center: true,
    frame: true,
    webPreferences: {
      nodeIntegration: true,
      nativeWindowOpen: true
    }
  });

  aboutWindow.on('close', () => (aboutWindow = undefined));
  aboutWindow.setMenu(null);
  aboutWindow.setMenuBarVisibility(false);
  aboutWindow.loadURL(
    `file://${path.resolve(app.getAppPath(), 'src/about-window', 'about.html')}`
  );
  aboutWindow.show();
}

function reloadAppTheme() {
  const isDarkThemeEnabled = config.get(ConfigKey.EnableDarkTheme) === true;
  const shouldUseBlackChatBG = config.get(ConfigKey.IsChatBGBlack);
  const style =
    '#main { background-image: none !important; background: black !important; }';
  const wc = mainWindow.webContents;
  const ipcEvent = isDarkThemeEnabled
    ? 'enable-dark-mode'
    : 'disable-dark-mode';

  wc.send(ipcEvent, config.get(ConfigKey.DarkReaderConfig));

  shouldUseBlackChatBG
    ? wc.insertCSS(style).then((res) => (chatBGCSSKey = res))
    : wc.removeInsertedCSS(chatBGCSSKey);
}

export {
  setAppMenus,
  removeTrayIcon,
  createTray,
  showAppAbout,
  addSelfToSystemStartup,
  removeSelfToSystemStartup,
  reloadAppTheme
};
