#!/usr/bin/env python3
"""Strip TypeScript-specific syntax from Taro project files for Babel compatibility."""
import re, os, sys

SRC = '/Users/grandy/Desktop/备课系统/apps/miniprogram/src'

def fix_file(filepath):
    with open(filepath) as f:
        content = f.read()
    original = content
    
    # Skip types/ directory files
    if '/types/' in filepath:
        return False
    
    # 1. Remove generic type params from useState/useRef/etc hooks
    content = re.sub(r'(useState|useRef|useCallback|useMemo|useContext)<[^>]+>', r'\1', content)
    
    # 2. Remove return type annotations on function declarations
    #    function name(...): Type {  →  function name(...) {
    content = re.sub(r'(function\s+\w+\s*\([^)]*\))\s*:\s*\w+(\[\])?(\s*\{)', r'\1\3', content)
    
    # 3. Remove return type annotations on arrow functions (simplified)
    #    => Promise<Type> → =>
    content = re.sub(r':\s*Promise<[^>]+>', '', content)
    
    # 4. Remove type annotations on variable declarations (const x: Type = ...)
    content = re.sub(r'(const|let|var)\s+(\w+)\s*:\s*[^=]+(\s*=\s*)', r'\1 \2\3', content)
    
    # 5. Remove `as Type` casts
    content = re.sub(r'\s+as\s+\w+(\[\])?', '', content)
    
    # 6. Remove interface and type declarations inside .tsx/.ts files
    content = re.sub(r'^interface\s+\w+(\s*\{[^}]*\})', '', content, flags=re.MULTILINE)
    
    # 7. Fix content/detail import paths (3 levels up)
    if 'content/detail/index.tsx' in filepath:
        content = content.replace("from '../../services/", "from '../../../services/")
        content = content.replace("from '../../components/", "from '../../../components/")
        content = content.replace("from '../../types/", "from '../../../types/")
        content = content.replace("from '../../hooks/", "from '../../../hooks/")
    
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        return True
    return False

count = 0
for root, dirs, files in os.walk(SRC):
    for f in files:
        if f.endswith('.tsx') or f.endswith('.ts'):
            if fix_file(os.path.join(root, f)):
                count += 1
                print(f'Fixed: {os.path.relpath(os.path.join(root, f), SRC)}')

print(f'\nTotal files fixed: {count}')
