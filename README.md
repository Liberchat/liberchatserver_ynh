# Liberchat for YunoHost

[![GitHub release](https://img.shields.io/github/v/release/Liberchat/liberchatserver_ynh?style=flat-square)](https://github.com/Liberchat/liberchatserver_ynh/releases)
[![GitHub license](https://img.shields.io/github/license/Liberchat/liberchatserver_ynh?style=flat-square)](https://github.com/Liberchat/liberchatserver_ynh/blob/main/LICENSE)
[![GitHub issues](https://img.shields.io/github/issues/Liberchat/liberchatserver_ynh?style=flat-square)](https://github.com/Liberchat/liberchatserver_ynh/issues)
[![YunoHost](https://img.shields.io/badge/YunoHost-11.2%2B-blue?style=flat-square)](https://yunohost.org)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?style=flat-square)](https://nodejs.org)
[![Multi-instance](https://img.shields.io/badge/Multi--instance-✓-success?style=flat-square)](https://github.com/Liberchat/liberchatserver_ynh)

*[Lire ce README en français.](./README_yunohost.md)*

> *This package allows you to install Liberchat quickly and simply on a YunoHost server.*
> *If you don't have YunoHost, please consult [the guide](https://yunohost.org/install) to learn how to install it.*

## Overview

Liberchat is a free and decentralized chat application that allows secure and private communication.

**Shipped version:** 6.1.20~ynh1

**Demo:** https://liberchat-3-0-1.onrender.com

## Features

- **Real-time chat** with WebSockets
- **File sharing** (images, documents)
- **Emoji reactions** on messages
- **Client-side encryption** for privacy
- **Responsive interface** mobile compatible
- **Multi-domain support** (Tor, local IPs, classic domains)
- **No logging** for total privacy



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

- Official app website: <https://liberchat-3-0-1.onrender.com>
- Official user documentation: <https://github.com/AnARCHIS12/Liberchat>
- Official admin documentation: <https://github.com/Liberchat/liberchatserver_ynh>
- Upstream app code repository: <https://github.com/AnARCHIS12/Liberchat>

- Report a bug: <https://github.com/Liberchat/liberchatserver_ynh/issues>

## Developer info

Please send your pull request to the [testing branch](https://github.com/Liberchat/Liberchat_ynh/tree/testing).

To try the testing branch, please proceed like that:

```bash
sudo yunohost app install https://github.com/Liberchat/Liberchat_ynh/tree/testing --debug
or
sudo yunohost app upgrade liberchat -u https://github.com/Liberchat/Liberchat_ynh/tree/testing --debug
```

**More info regarding app packaging:** <https://yunohost.org/packaging_apps>