import { ipcRenderer } from 'electron';
import { ConfigKey } from './config';
import DarkReader = require('darkreader');

(function () {
  const OldNotify = window.Notification;

  function newNotify(title, opt) {
    const updatedNotif = new OldNotify(title, opt);
    updatedNotif.onclick = () => ipcRenderer.send('notification-click');
    return updatedNotif;
  }

  function enableDarkTheme(darkReaderConfig: object) {
    DarkReader.enable(darkReaderConfig);
  }

  function disableDarkTheme() {
    DarkReader.disable();
  }

  ipcRenderer.on('set-custom-style', (_: Event, key: ConfigKey, enabled: boolean) => {
    document.body.classList[enabled ? 'add' : 'remove'](key)
  })

  newNotify.requestPermission = OldNotify.requestPermission.bind(OldNotify);
  Object.defineProperty(newNotify, 'permission', {
    get: () => {
      return OldNotify.permission;
    },
  });

  (window as any).Notification = newNotify;

  ipcRenderer.on('enable-dark-mode', function(event, store) {
    const darkReaderConfig = store;
    enableDarkTheme(darkReaderConfig);
  });
  ipcRenderer.on('disable-dark-mode', disableDarkTheme);
})();
