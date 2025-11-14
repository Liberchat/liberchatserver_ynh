#!/bin/bash

# Test script for YunoHost Liberchat package installation

echo "Testing Liberchat YunoHost package..."

# Test 1: Check if Node.js version is compatible
echo "Checking Node.js version..."
if command -v node >/dev/null 2>&1; then
    node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    echo "Node.js version: $(node --version)"
    if [ "$node_version" -ge 20 ]; then
        echo "✓ Node.js version is compatible"
    else
        echo "✗ Node.js version is too old (need ≥20 for some dependencies)"
    fi
else
    echo "✗ Node.js not found"
fi

# Test 2: Check if npm is available
echo "Checking npm..."
if command -v npm >/dev/null 2>&1; then
    echo "✓ npm version: $(npm --version)"
else
    echo "✗ npm not found"
fi

# Test 3: Validate package.json
echo "Validating package.json..."
if [ -f "package.json" ]; then
    if node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf8'))" 2>/dev/null; then
        echo "✓ package.json is valid JSON"
    else
        echo "✗ package.json is invalid"
    fi
else
    echo "✗ package.json not found"
fi

# Test 4: Check required files
echo "Checking required files..."
required_files=("manifest.toml" "scripts/install" "scripts/upgrade" "server.js")
for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✓ $file exists"
    else
        echo "✗ $file missing"
    fi
done

# Test 5: Check for patch-package
echo "Checking patch-package..."
if command -v patch-package >/dev/null 2>&1; then
    echo "✓ patch-package is available"
else
    echo "✗ patch-package not found (install with: npm install -g patch-package)"
fi

# Test 6: Test npm install simulation
echo "Testing npm dependencies..."
if [ -f "package.json" ] && command -v npm >/dev/null 2>&1; then
    temp_dir=$(mktemp -d)
    cp package.json "$temp_dir/"
    cd "$temp_dir"
    if npm install --dry-run --legacy-peer-deps --ignore-engines >/dev/null 2>&1; then
        echo "✓ npm dependencies can be resolved"
    else
        echo "✗ npm dependency issues detected"
    fi
    cd - > /dev/null
    rm -rf "$temp_dir"
fi

echo "Test completed."