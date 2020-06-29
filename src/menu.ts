import { app, BrowserWindow, shell, Menu } from 'electron';
import config, { ConfigKey } from './config';
import log from 'electron-log';
import * as main from './app';

const menuTemplate: any[] = [
  {
    label: 'File',
    submenu: [
      {
        label: 'Clear app data and restart',
        click() {
          // Clear app config
          config.clear();
          // Restart without firing quitting events
          app.relaunch();
          app.exit(0);
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'Quit',
        accelerator: 'CommandOrControl+Shift+Q',
        click() {
          app.quit();
        }
      }
    ]
  },
  {
    role: 'editMenu'
  },
  {
    role: 'viewMenu'
  },
  {
    label: 'Settings',
    submenu: [
      {
        label: 'Auto-start at login',
        type: 'checkbox',
        checked: config.get(ConfigKey.AutoStartOnLogin),
        click({ checked }: { checked: boolean }) {
          config.set(ConfigKey.AutoStartOnLogin, checked);
          checked
            ? main.addSelfToSystemStartup()
            : main.removeSelfToSystemStartup();
        }
      },
      {
        label: 'Always launch minimized',
        type: 'checkbox',
        checked: config.get(ConfigKey.LaunchMinimized),
        click({ checked }: { checked: boolean }) {
          config.set(ConfigKey.LaunchMinimized, checked);
        }
      },
      {
        label: 'Auto-hide the menu bar',
        type: 'checkbox',
        checked: config.get(ConfigKey.AutoHideMenuBar),
        click({ checked }: { checked: boolean }) {
          config.set(ConfigKey.AutoHideMenuBar, checked);
          main.setAppMenus();
        }
      },
      {
        label: 'Enable Tray icon',
        type: 'checkbox',
        checked: config.get(ConfigKey.EnableTrayIcon),
        click({ checked }: { checked: boolean }) {
          config.set(ConfigKey.EnableTrayIcon, checked);
          checked ? main.createTray() : main.removeTrayIcon();
        }
      },
      {
        label: 'Use WhatsApp\'s Native Dark Mode',
        type: 'checkbox',
        checked: config.get(ConfigKey.UseNativeDarkMode),
        click({ checked }: { checked: boolean }) {
          config.set(ConfigKey.UseNativeDarkMode, checked);
          main.reloadAppTheme();
        }
      },
      {
        label: 'Enable Dark Mode',
        type: 'checkbox',
        checked: config.get(ConfigKey.EnableDarkTheme) === true,
        click({ checked }: { checked: boolean }) {
          config.set(ConfigKey.EnableDarkTheme, checked);
          main.reloadAppTheme();
        }
      },
      {
        label: 'Use Black Chat Background',
        type: 'checkbox',
        checked: config.get(ConfigKey.IsChatBGBlack) === true,
        click({ checked }: { checked: boolean }) {
          config.set(ConfigKey.IsChatBGBlack, checked);
          main.reloadAppTheme();
        }
      },
      {
        label: 'Reload theme',
        click() {
          main.reloadAppTheme();
        }
      },
      {
        label: 'Edit Config file manually',
        click() {
          config.openInEditor();
        }
      }
    ]
  },
  {
    label: 'Window',
    role: 'window',
    submenu: [
      {
        label: `Reload`,
        role: 'reload',
        accelerator: 'CommandOrControl+R',
        click() {
          let mainWindow = BrowserWindow.getAllWindows()[0];
          mainWindow.reload();
        }
      },
      {
        label: 'Minimize',
        accelerator: 'CommandOrControl+M',
        role: 'minimize'
      },
      {
        label: 'Close',
        accelerator: 'CommandOrControl+W',
        role: 'close'
      }
    ]
  },
  {
    label: 'Help',
    role: 'help',
    submenu: [
      {
        label: `About`,
        role: 'about',
        click() {
          main.showAppAbout();
        }
      },
      {
        label: 'View Logs',
        click() {
          shell.openPath(log.transports.file.findLogPath());
        }
      },
      {
        type: 'separator'
      },
      {
        label: `Visit GitHub repo`,
        click() {
          shell.openExternal('https://github.com/cyfrost/gmail-electron');
        }
      },
      {
        label: 'Report a problem',
        click() {
          shell.openExternal(
            'https://github.com/cyfrost/gmail-electron/issues/new/choose'
          );
        }
      }
    ]
  }
];

const menu = Menu.buildFromTemplate(menuTemplate);
export default menu;
