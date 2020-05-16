import { ipcRenderer } from 'electron';
const DarkReader = require('darkreader');

(function () {
  const OldNotify = window.Notification;

  function newNotify(title, opt) {
    const updatedNotif = new OldNotify(title, opt);
    updatedNotif.onclick = () => ipcRenderer.send('notification-click');
    return updatedNotif;
  }

  function enableDarkTheme(darkReaderConfig) {
    DarkReader.enable(darkReaderConfig);
  }

  function disableDarkTheme() {
    DarkReader.disable();
  }

  newNotify.requestPermission = OldNotify.requestPermission.bind(OldNotify);
  Object.defineProperty(newNotify, 'permission', {
    get: () => {
      return OldNotify.permission;
    },
  });

  window.Notification = newNotify;

  ipcRenderer.on('enable-dark-mode', function(event, store) {
    const darkReaderConfig = store;
    enableDarkTheme(darkReaderConfig);
  });
  ipcRenderer.on('disable-dark-mode', disableDarkTheme);
})();
