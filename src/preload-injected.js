import { ipcRenderer } from 'electron';

(function () {
  const OldNotify = window.Notification;

  function newNotify(title, opt) {
      const updatedNotif = new OldNotify(title, opt);
      updatedNotif.onclick = () => ipcRenderer.send('notification-click');
      return updatedNotif;
  }

  newNotify.requestPermission = OldNotify.requestPermission.bind(OldNotify);
  Object.defineProperty(newNotify, 'permission', {
      get: () => {
          return OldNotify.permission;
      }
  });

  window.Notification = newNotify;
})();
