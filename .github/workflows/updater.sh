#!/bin/bash

# This script is meant to be run by GitHub Actions
# The YunoHost-Apps organisation offers a template to be used as reference:
# https://github.com/YunoHost-Apps/.github/blob/master/workflows/updater.yml

# Exit on command errors and treat unset variables as an error
set -euo pipefail

# The pre-commit hook, which is made for running on your local machine, is run by the CI/CD pipeline.
# The CI/CD pipeline passes the --bypass-local-check flag to the pre-commit to allow running it on a non-YunoHost machine.
# It may be useful to turn off some checks when running from CI/CD pipeline, by checking the GITHUB_ACTIONS variable.

# See the default config file https://github.com/YunoHost/package_linter/blob/master/package_linter/data/config.toml for the complete list of available options

# Package linter configuration
# PACKAGE_LINTER_CONFIG_FILE=".package_linter.yml"

# Fetching information
current_version=$(cat manifest.toml | toml_get python "version" | cut -d'~' -f1)
repo=$(cat manifest.toml | toml_get python "upstream.code")
# Some jq magic is needed, because the latest upstream release is not always the latest version (e.g. security patches for older versions)
version=$(curl --silent "https://api.github.com/repos/AnARCHIS12/Liberchat/releases/latest" | jq -r .tag_name | cut -d'v' -f2)
assets_url=$(curl --silent "https://api.github.com/repos/AnARCHIS12/Liberchat/releases/latest" | jq -r .assets_url)

# Later down the script, we assume the version has only digits and dots
# Sometimes the release name starts with a "v", so let's filter it out.
# You may need to adapt this sed filter depending on your app
version=$(echo "$version" | sed 's/[^0-9\.]//g')

if [[ "$version" == "$current_version" ]]; then
    echo "::warning ::No new version available"
    exit 0
# Proceed only if the retrieved version is greater than the current one
elif ! dpkg --compare-versions "$current_version" "lt" "$version"; then
    echo "::warning ::No new version available"
    exit 0
fi

# Proceed only if a PR for this new version does not already exist
elif git ls-remote -q --exit-code --heads origin ci-auto-update-v$version ; then
    echo "::warning ::A branch already exists for this update"
    exit 0
fi

# Each release can hold multiple assets (e.g. binaries for different architectures, source code, etc.)
echo "${version}" > /tmp/version
echo "${assets_url}" > /tmp/assets_url

echo "::notice ::Upgrading to version $version"

#=================================================
# UPDATE SOURCE FILES
#=================================================

# Here we use the $assets_url to get the resources published in the upstream release.
# Here is an example for Grav, it has to be adapted in accordance with how the upstream releases look like.

# Let's loop over the assets URL to extract the archive URL
tmpdir="$(mktemp -d)"

# Download sources and calculate checksum
filename="liberchat-$version.tar.gz"
curl --silent -4 -L "$assets_url" -o "$tmpdir/$filename"

# Create the temporary directory
mkdir -p $tmpdir

# Download sources and calculate checksum
asset_url="https://github.com/AnARCHIS12/Liberchat/archive/refs/tags/v$version.tar.gz"
curl --silent -4 -L "$asset_url" -o "$tmpdir/$filename"

checksum=$(sha256sum "$tmpdir/$filename" | head -c 64)

# Delete temporary directory
rm -rf $tmpdir

# Rewrite source file
cat <<EOT > conf/app.src
SOURCE_URL=$asset_url
SOURCE_SUM=$checksum
SOURCE_SUM_PRG=sha256sum
SOURCE_FORMAT=tar.gz
SOURCE_IN_SUBDIR=true
SOURCE_FILENAME=
EOT
echo "... conf/app.src updated"

#=================================================
# SPECIFIC UPDATE STEPS
#=================================================

# Any action on the app's source code can be done.
# The GitHub Action workflow takes care of committing all changes after this script ends.

#=================================================
# GENERIC FINALIZATION
#=================================================

# Replace new version in manifest
echo "$(cat manifest.toml | toml_set python "version" "${version}~ynh1")" > manifest.toml

# No need to update the README, yunohost-bot takes care of it

# The Action will proceed only if the PROCEED environment variable is set to true
echo "PROCEED=true" >> $GITHUB_ENV
echo "VERSION=$version" >> $GITHUB_ENV
echo "RELEASE_URL=https://github.com/AnARCHIS12/Liberchat/releases/tag/v$version" >> $GITHUB_ENV

# The Action will proceed only if the PROCEED environment variable is set to true
echo "PROCEED=true" >> $GITHUB_ENV