# Liberchat for YunoHost

[![GitHub release](https://img.shields.io/github/v/release/Liberchat/liberchatserver_ynh?style=flat-square)](https://github.com/Liberchat/liberchatserver_ynh/releases)
[![GitHub license](https://img.shields.io/github/license/Liberchat/liberchatserver_ynh?style=flat-square)](https://github.com/Liberchat/liberchatserver_ynh/blob/main/LICENSE)
[![GitHub issues](https://img.shields.io/github/issues/Liberchat/liberchatserver_ynh?style=flat-square)](https://github.com/Liberchat/liberchatserver_ynh/issues)
[![YunoHost](https://img.shields.io/badge/YunoHost-11.2%2B-blue?style=flat-square)](https://yunohost.org)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?style=flat-square)](https://nodejs.org)
[![Multi-instance](https://img.shields.io/badge/Multi--instance-✓-success?style=flat-square)](https://github.com/Liberchat/liberchatserver_ynh)

*[Lire ce README en français.](./README.md)*

> *This package allows you to install Liberchat quickly and simply on a YunoHost server.*
> *If you don't have YunoHost, please consult [the guide](https://yunohost.org/install) to learn how to install it.*

## Overview

Liberchat is a free and decentralized chat application that prioritizes privacy and security.

**Shipped version:** 6.1.21~ynh1

**Demo:** https://liberchat-3-0-1.onrender.com

## 🆕 What's new in version 6.1.21 (August 24, 2025)

### 🔧 Important fixes
- **Configuration panel**: Fixed "unbound variable" errors in configuration scripts
- **Environment variables**: All config panel features are now actually implemented

### ✨ New operational features
- **MAX_MESSAGES**: Real control of messages kept in memory (default: 100)
- **MAX_FILE_SIZE**: Effective file upload size limitation (default: 50MB)
- **PING_TIMEOUT**: Socket.IO timeout configuration (default: 60000ms)
- **PING_INTERVAL**: Socket.IO ping interval configuration (default: 25000ms)
- **ALLOWED_DOMAINS**: CORS allowed domains management

### 🐛 Bug fixes
- Configuration variables with default values to avoid errors
- Environment variables display in startup logs
- Dynamic error messages for file sizes

## Features

- **Real-time chat** with WebSockets
- **File sharing** (images, documents)
- **Emoji reactions** on messages
- **Client-side encryption** for privacy
- **Responsive interface** mobile compatible
- **Multi-domain support** (local IPs, classic domains)
- **No logging** for total privacy
- **Voice messages** and message replies

## Installation

### Simple installation

```bash
sudo yunohost app install https://github.com/Liberchat/liberchatserver_ynh
```

### Multi-instance installation

You can install multiple instances of Liberchat on the same YunoHost server with different paths:

```bash
sudo yunohost app install liberchat --args "domain=example.com&path=/team1"
sudo yunohost app install liberchat --args "domain=example.com&path=/team2"
```

### Installation from specific branch

To test the development branch:

```bash
sudo yunohost app install https://github.com/Liberchat/liberchatserver_ynh/tree/testing --debug
```

## Configuration

### Multi-user support

This application supports multi-instance installation. You can install multiple instances of Liberchat on the same YunoHost server with different paths.

### Supported domains

The application automatically works with:
- Classic domains (https://example.com/liberchat)

- Local IP addresses
- Localhost (in development)

### Advanced settings

- **Maximum file size**: Configurable via admin panel
- **Messages in memory**: Adjustable according to your needs
- **Socket.IO timeouts**: Customizable for performance optimization

## Usage

1. **Access your instance**: `https://your-domain.com/liberchat`
2. **Set an encryption key** shared with your contacts
3. **Choose a username**
4. **Start chatting** securely!

## Security

- **End-to-end encryption** with Web Crypto API
- **No message storage** on server
- **CSP, CORS, XSS protection**

- **Session keys** for privacy

## Documentation and resources

- Official app website: <https://liberchat-3-0-1.onrender.com>
- Official user documentation: <https://github.com/AnARCHIS12/Liberchat>
- Official admin documentation: <https://github.com/Liberchat/liberchatserver_ynh>
- Upstream app code repository: <https://github.com/AnARCHIS12/Liberchat>
- Report a bug: <https://github.com/Liberchat/liberchatserver_ynh/issues>

## Developer info

Please send your pull request to the [testing branch](https://github.com/Liberchat/liberchatserver_ynh/tree/testing).

To try the testing branch, please proceed like that:

```bash
sudo yunohost app install https://github.com/Liberchat/liberchatserver_ynh/tree/testing --debug
# or
sudo yunohost app upgrade liberchat -u https://github.com/Liberchat/liberchatserver_ynh/tree/testing --debug
```

**More info regarding app packaging:** <https://yunohost.org/packaging_apps>