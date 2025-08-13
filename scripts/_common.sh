#!/bin/bash

nodejs_version=18

pkg_dependencies="nodejs npm"

# Get app install directory
install_dir=$(ynh_app_setting_get --app=$app --key=install_dir)