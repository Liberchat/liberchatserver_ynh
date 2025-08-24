#!/bin/bash

# Exit on errors and treat unset variables as errors
set -euo pipefail

#=================================================
# INSTALL DEPENDENCIES (Python TOML parser)
#=================================================
pip install --quiet toml

#=================================================
# FETCH INFORMATION
#=================================================

# Read current version from manifest.toml using Python
current_version=$(python3 - <<'EOF'
import toml
manifest = toml.load("manifest.toml")
print(manifest['python']['version'].split('~')[0])
EOF
)

# Read repo code (optional, if needed)
repo=$(python3 - <<'EOF'
import toml
manifest = toml.load("manifest.toml")
print(manifest['python']['upstream']['code'])
EOF
)

# Get latest upstream release
version=$(curl --silent "https://api.github.com/repos/AnARCHIS12/Liberchat/releases/latest" \
  | jq -r .tag_name | sed 's/[^0-9\.]//g')

assets_url=$(curl --silent "https://api.github.com/repos/AnARCHIS12/Liberchat/releases/latest" \
  | jq -r .assets_url)

# Check if version has changed
if [[ "$version" == "$current_version" ]]; then
    echo "::warning ::No new version available"
    exit 0
elif ! dpkg --compare-versions "$current_version" "lt" "$version"; then
    echo "::warning ::No new version available"
    exit 0
elif git ls-remote -q --exit-code --heads origin ci-auto-update-v$version ; then
    echo "::warning ::A branch already exists for this update"
    exit 0
fi

echo "::notice ::Upgrading to version $version"

#=================================================
# DOWNLOAD ASSETS AND CALCULATE CHECKSUM
#=================================================
tmpdir=$(mktemp -d)
filename="liberchat-$version.tar.gz"
asset_url="https://github.com/AnARCHIS12/Liberchat/archive/refs/tags/v$version.tar.gz"

curl --silent -L "$asset_url" -o "$tmpdir/$filename"

checksum=$(sha256sum "$tmpdir/$filename" | awk '{print $1}')

rm -rf $tmpdir

#=================================================
# UPDATE conf/app.src
#=================================================
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
# UPDATE manifest.toml
#=================================================
python3 - <<EOF
import toml
manifest = toml.load("manifest.toml")
manifest['python']['version'] = f"{version}~ynh1"
with open("manifest.toml", "w") as f:
    toml.dump(manifest, f)
EOF

#=================================================
# EXPORT VARIABLES FOR WORKFLOW
#=================================================
echo "PROCEED=true" >> $GITHUB_ENV
echo "VERSION=$version" >> $GITHUB_ENV
echo "RELEASE_URL=https://github.com/AnARCHIS12/Liberchat/releases/tag/v$version" >> $GITHUB_ENV
