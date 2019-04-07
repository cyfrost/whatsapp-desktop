# WhatsApp Desktop

WhatsApp desktop client for Linux and Windows, built using electron.js

# Features

* Native notifications
* System tray icon
* Open links in browser
* Badge with the number of notifications in the dock/taskbar
* Dock icon bounces when a new message is received
* Focus on contact search input via WIN+F
* Phone info window (s/w versions, battery status, etc)
* Auto-launch on login
* Start minimized to tray icon
* Logging system (log to console and *userData*/log.log)
* Apply custom CSS stylesheet
* Auto-hide menu bar (Windows, Linux)
* Disabling GPU rendering (useful when dealing with bugged video drivers)
* A couple of things can be configured:
  * Toggle avatar visibility
  * Toggle preview of the messages visibility
  * Set the size for the media thumbs
  * Proxy settings connect to WhatsApp web

# Download

For distros using APT (Debian and Ubuntu +/ derivatives): get the `.deb` package from [releases page](https://github.com/cyfrost/Whatsapp-Desktop/releases).

For DNF based distros (Fedora, RHEL, CentOS, SuSE): get the `.rpm` package from [releases page](https://github.com/cyfrost/Whatsapp-Desktop/releases).

`.AppImage` for everyone else.

# Screens

![screenshot](http://i1-win.softpedia-static.com/screenshots/WhatsApp-Desktop_1.png "Main Window")

# Build Instructions

1. Clone repos using `$ git clone https://github.com/cyfrost/whatsapp-desktop`

2. Open terminal in cloned directory and run `$ make env` to install all project dependencies.

3. To run the app, just do `$ make run` in the project directory.

## Build dist packages

Simply run `$ make build` to build `DEB`, `RPM`, `AppImage`, `pacman`, and `Snap` packages.

They're created in the `dist/` directory of the project root.

# Contributing

No rules for contributing, send a PR :)
