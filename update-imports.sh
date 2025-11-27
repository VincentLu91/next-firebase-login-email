#!/bin/bash
# Script to update all imports from deprecated auth-helpers to custom hooks

find pages components layout -name "*.js" -type f | while read file; do
  if grep -q "@supabase/auth-helpers-react" "$file"; then
    # Calculate relative path to utils
    depth=$(echo "$file" | grep -o "/" | wc -l)
    if [ $depth -eq 1 ]; then
      prefix="../utils"
    else
      prefix="../../utils"
    fi
    
    sed -i '' "s|from ['\"]@supabase/auth-helpers-react['\"]|from \"${prefix}/supabase-hooks\"|g" "$file"
    echo "Updated: $file"
  fi
done
