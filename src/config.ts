import Store = require('electron-store');

interface LastWindowState {
  bounds: {
    width: number;
    height: number;
    x: number | undefined;
    y: number | undefined;
  };
  fullscreen: boolean;
  maximized: boolean;
}

export enum ConfigKey {
  LastWindowState = 'lastWindowState',
  LaunchMinimized = 'launchMinimized',
  AutoStartOnLogin = 'autoStartOnLogin',
  AutoHideMenuBar = 'autoHideMenuBar',
  EnableTrayIcon = 'enableTrayIcon',
  IsChatBGBlack = 'isUsingBlackChatBG',
  UseNativeDarkMode = 'useNativeDarkMode',
  EnableDarkTheme = 'EnableDarkTheme',
  DarkReaderConfig = 'DarkReaderConfig'
}

type TypedStore = {
  [ConfigKey.LastWindowState]: LastWindowState;
  [ConfigKey.LaunchMinimized]: boolean;
  [ConfigKey.AutoHideMenuBar]: boolean;
  [ConfigKey.AutoStartOnLogin]: boolean;
  [ConfigKey.EnableTrayIcon]: boolean;
  [ConfigKey.IsChatBGBlack]: boolean;
  [ConfigKey.EnableDarkTheme]: boolean;
  [ConfigKey.DarkReaderConfig]: object;
  [ConfigKey.UseNativeDarkMode]: boolean;
};

const defaultDarkReaderConfig = {
  brightness: 100,
  contrast: 100,
  sepia: 0
};

const defaults = {
  [ConfigKey.LastWindowState]: {
    bounds: {
      width: 800,
      height: 600,
      x: undefined,
      y: undefined
    },
    fullscreen: false,
    maximized: true
  },
  [ConfigKey.LaunchMinimized]: false,
  [ConfigKey.AutoHideMenuBar]: false,
  [ConfigKey.AutoStartOnLogin]: false,
  [ConfigKey.EnableTrayIcon]: true,
  [ConfigKey.IsChatBGBlack]: false,
  [ConfigKey.UseNativeDarkMode]: true,
  [ConfigKey.EnableDarkTheme]: false,
  [ConfigKey.DarkReaderConfig]: defaultDarkReaderConfig
};

const config = new Store<TypedStore>({
  defaults,
  name: 'config'
});

export default config;
