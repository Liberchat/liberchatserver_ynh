# Liberchat for YunoHost

[![Integration level](https://dash.yunohost.org/integration/liberchat.svg)](https://dash.yunohost.org/appci/app/liberchat) ![Working status](https://ci-apps.yunohost.org/ci/badges/liberchat.status.svg) ![Maintenance status](https://ci-apps.yunohost.org/ci/badges/liberchat.maintain.svg)

[![Install Liberchat with YunoHost](https://install-app.yunohost.org/install-with-yunohost.svg)](https://install-app.yunohost.org/?app=liberchat)

*[Lire ce README en français.](./README_yunohost.md)*

> *This package allows you to install Liberchat quickly and simply on a YunoHost server.*
> *If you don't have YunoHost, please consult [the guide](https://yunohost.org/install) to learn how to install it.*

## Overview

Liberchat is a free and decentralized chat application that allows secure and private communication.

**Shipped version:** 6.1.20~ynh1

**Demo:** https://liberchat.net/

## Features

- **Real-time chat** with WebSockets
- **File sharing** (images, documents)
- **Emoji reactions** on messages
- **Client-side encryption** for privacy
- **Responsive interface** mobile compatible
- **Multi-domain support** (Tor, local IPs, classic domains)
- **No logging** for total privacy

## Screenshots

![Screenshot](./doc/screenshots/screenshot.png)

## Configuration

### Multi-user support

This application supports multi-instance installation. You can install multiple instances of Liberchat on the same YunoHost server with different paths.

### Supported domains

The application automatically works with:
- Classic domains (https://example.com/liberchat)
- .onion domains (Tor)
- Local IP addresses
- Localhost (in development)

## Documentation and resources

- Official app website: <https://liberchat.net/>
- Official user documentation: <https://github.com/AnARCHIS12/Liberchat>
- Official admin documentation: <https://github.com/Liberchat/Liberchat_ynh>
- Upstream app code repository: <https://github.com/AnARCHIS12/Liberchat>
- YunoHost Store: <https://apps.yunohost.org/app/liberchat>
- Report a bug: <https://github.com/Liberchat/Liberchat_ynh/issues>

## Developer info

Please send your pull request to the [testing branch](https://github.com/Liberchat/Liberchat_ynh/tree/testing).

To try the testing branch, please proceed like that:

```bash
sudo yunohost app install https://github.com/Liberchat/Liberchat_ynh/tree/testing --debug
or
sudo yunohost app upgrade liberchat -u https://github.com/Liberchat/Liberchat_ynh/tree/testing --debug
```

**More info regarding app packaging:** <https://yunohost.org/packaging_apps>