#!/bin/bash

# Enhanced build script for Quarto to Astro blog posts
# Features: incremental builds, caching, complete markdown optimization

set -e  # Exit on any error

echo "🚀 Building blog posts from Quarto with caching..."

# Create cache directory
mkdir -p .blog-cache

# Function to check if qmd file needs rendering
needs_rendering() {
    local qmd_file="$1"
    local md_file="${qmd_file%.qmd}.md"
    local cache_file=".blog-cache/$(echo "$qmd_file" | sed 's|/|_|g').timestamp"
    
    # If markdown doesn't exist, needs rendering
    if [ ! -f "$md_file" ]; then
        return 0
    fi
    
    # If cache file doesn't exist, needs rendering
    if [ ! -f "$cache_file" ]; then
        return 0
    fi
    
    # If qmd is newer than cache, needs rendering
    if [ "$qmd_file" -nt "$cache_file" ]; then
        return 0
    fi
    
    # Check if any _files directory was modified
    local files_dir="${qmd_file%.qmd}_files"
    if [ -d "$files_dir" ] && [ "$files_dir" -nt "$cache_file" ]; then
        return 0
    fi
    
    return 1
}

# Function to update cache timestamp
update_cache() {
    local qmd_file="$1"
    local cache_file=".blog-cache/$(echo "$qmd_file" | sed 's|/|_|g').timestamp"
    touch "$cache_file"
}

rendered_count=0
cached_count=0

# Find and render Quarto files (with caching)
find src/content/blog -name "*.qmd" -type f | while read qmd_file; do
    dir=$(dirname "$qmd_file")
    filename=$(basename "$qmd_file" .qmd)
    
    if needs_rendering "$qmd_file"; then
        echo "📝 Rendering $qmd_file"
        
        # Render using quarto
        cd "$dir"
        quarto render "$(basename "$qmd_file")" --to gfm --output-dir . --quiet
        cd - > /dev/null
        
        update_cache "$qmd_file"
        rendered_count=$((rendered_count + 1))
    else
        echo "✅ Cached: $qmd_file"
        cached_count=$((cached_count + 1))
    fi
done

echo "📊 Rendered: $rendered_count, Cached: $cached_count"

echo "🖼️  Organizing images for Astro optimization..."

# Create assets directory structure
mkdir -p src/assets/images/blog/{2017,2022,2023,2024,2025}

# Move generated images to year-organized structure
find src/content/blog -name "*_files" -type d | while read -r dir; do
    if [ -d "$dir/figure-commonmark" ]; then
        # Extract year and post name
        year=$(echo "$dir" | sed 's|.*blog/\([0-9]\{4\}\)/.*|\1|')
        post_name=$(basename "$dir" | sed 's|_files$||')
        
        target_dir="src/assets/images/blog/$year"
        mkdir -p "$target_dir"
        
        echo "  📁 $year/$post_name images"
        
        # Copy images with post prefix
        for img in "$dir/figure-commonmark"/*; do
            if [ -f "$img" ]; then
                img_name=$(basename "$img")
                target_file="$target_dir/${post_name}-${img_name}"
                
                # Only copy if image is newer or doesn't exist
                if [ ! -f "$target_file" ] || [ "$img" -nt "$target_file" ]; then
                    cp "$img" "$target_file"
                fi
            fi
        done
    fi
done

echo "🔧 Optimizing markdown for Astro..."

# Optimize markdown files for Astro
find src/content/blog -name "*.md" -type f | while read -r file; do
    # Extract year and post name
    year=$(echo "$file" | sed 's|.*blog/\([0-9]\{4\}\)/.*|\1|')
    post_name=$(basename "$file" .md)
    
    # Create a temporary file for processing
    temp_file=$(mktemp)
    
    # Process the markdown file
    {
        # 1. Update image paths for Astro optimization
        sed "s|[^/]*_files/figure-commonmark/\([^)]*\)|../../assets/images/blog/$year/${post_name}-\1|g" "$file" |
        
        # 2. Remove duplicate title (Quarto adds title as H1, but we have it in frontmatter)
        awk '
        BEGIN { in_frontmatter = 0; frontmatter_ended = 0; title_removed = 0 }
        /^---$/ { 
            if (in_frontmatter == 0) in_frontmatter = 1
            else if (in_frontmatter == 1) { frontmatter_ended = 1; in_frontmatter = 0 }
            print; next 
        }
        in_frontmatter == 1 { print; next }
        frontmatter_ended == 1 && /^# / && title_removed == 0 { 
            title_removed = 1; next 
        }
        { print }
        ' |
        
        # 3. Remove author/date lines that Quarto adds after title
        awk '
        BEGIN { skip_next = 0 }
        /^# / { print; skip_next = 2; next }
        skip_next > 0 && /^[A-Z]/ && length($0) < 50 { skip_next--; next }
        skip_next > 0 && /^[0-9]{4}-[0-9]{2}-[0-9]{2}/ { skip_next = 0; next }
        { skip_next = 0; print }
        ' |
        
        # 4. Clean up any extra blank lines
        awk '
        BEGIN { blank_count = 0 }
        /^$/ { blank_count++; if (blank_count <= 2) print; next }
        { blank_count = 0; print }
        '
    } > "$temp_file"
    
    # Replace original file if it changed
    if ! cmp -s "$file" "$temp_file"; then
        mv "$temp_file" "$file"
        echo "  ✨ Optimized: $file"
    else
        rm "$temp_file"
    fi
done

echo "🧹 Cleaning up temporary files..."

# Clean up _files directories after processing
find src/content/blog -name "*_files" -type d -exec rm -rf {} + 2>/dev/null || true

# Clean up any .quarto directories
find src/content/blog -name ".quarto" -type d -exec rm -rf {} + 2>/dev/null || true

echo "✅ Blog build complete!"
echo "   All Quarto files processed with caching and Astro optimization"
echo "   Images organized in src/assets/images/blog/YEAR/"
echo "   Markdown files optimized for Astro content collections"