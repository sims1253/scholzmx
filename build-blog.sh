#!/bin/bash

# Build script for blog posts
# Usage:
#   ./build-blog.sh                                    # Build all posts
#   ./build-blog.sh path/to/post-folder/index.qmd      # Build specific post
#   ./build-blog.sh --force                            # Force rebuild all
#   ./build-blog.sh --force path/to/post-folder/index.qmd # Force rebuild specific

set -e  # Exit on any error

# Parse arguments
FORCE_REBUILD=false
SPECIFIC_FILE=""

for arg in "$@"; do
    case $arg in
        --force)
            FORCE_REBUILD=true
            shift
            ;;
        */index.qmd)
            SPECIFIC_FILE="$arg"
            shift
            ;;
        *)
            echo "Unknown argument: $arg"
            echo "Usage: $0 [--force] [path/to/post-folder/index.qmd]"
            exit 1
            ;;
    esac
done

if [ -n "$SPECIFIC_FILE" ]; then
    echo "Building specific post: $SPECIFIC_FILE"
else
    echo "Building all blog posts"
fi

# Create cache directory
mkdir -p .blog-cache

# Function to check if qmd file needs rendering
needs_rendering() {
    local qmd_file="$1"
    local md_file="${qmd_file%.qmd}.md"
    local hash_file=".blog-cache/$(echo "$qmd_file" | sed 's|/|_|g').hash"

    # Force rebuild if requested
    if [ "$FORCE_REBUILD" = true ]; then
        echo "  → Force rebuild requested"
        return 0
    fi

    # If markdown doesn't exist, needs rendering
    if [ ! -f "$md_file" ]; then
        echo "  → No MD file found"
        return 0
    fi

    # If hash file doesn't exist, needs rendering
    if [ ! -f "$hash_file" ]; then
        echo "  → No hash cache found"
        return 0
    fi

    # Calculate current hash of QMD file content
    local current_hash=$(sha256sum "$qmd_file" | cut -d' ' -f1)
    local cached_hash=$(cat "$hash_file" 2>/dev/null || echo "")

    # If content changed, needs rendering
    if [ "$current_hash" != "$cached_hash" ]; then
        echo "  → Content changed (${current_hash:0:8} != ${cached_hash:0:8})"
        return 0
    fi

    # Content unchanged, skip rendering
    echo "  → Content unchanged, using cache"
    return 1
}

# Function to update cache with content hash
update_cache() {
    local qmd_file="$1"
    local hash_file=".blog-cache/$(echo "$qmd_file" | sed 's|/|_|g').hash"
    local current_hash=$(sha256sum "$qmd_file" | cut -d' ' -f1)
    echo "$current_hash" > "$hash_file"
}

# Function to move code block output outside of code-collapse details blocks
extract_output_from_details() {
    local md_file="$1"

    # Use awk to process the file and extract output after code blocks from code-collapse details blocks
    awk '
    BEGIN {
        in_details = 0
        details_content = ""
        extracted_output = ""
        in_code_block = 0
        found_code_block = 0
    }

    # Start of code-collapse details block
    /^<details class="code-collapse">/ {
        in_details = 1
        details_content = $0 "\n"
        found_code_block = 0
        next
    }

    # End of details block
    /^<\/details>$/ && in_details == 1 {
        # Print the details block without extracted output
        printf "%s", details_content
        print "</details>"

        # Print any extracted output after the details block
        if (extracted_output != "") {
            print ""
            printf "%s", extracted_output
        }

        # Reset variables
        in_details = 0
        details_content = ""
        extracted_output = ""
        in_code_block = 0
        found_code_block = 0
        next
    }

    # Inside details block
    in_details == 1 {
        # Track code blocks
        if ($0 ~ /^```/) {
            if (in_code_block == 0) {
                # Starting a code block
                in_code_block = 1
                found_code_block = 1
                details_content = details_content $0 "\n"
            } else {
                # Ending a code block
                in_code_block = 0
                details_content = details_content $0 "\n"
            }
            next
        }

        # Inside a code block - keep in details
        if (in_code_block == 1) {
            details_content = details_content $0 "\n"
            next
        }

        # After code block has been found and we are outside code block
        if (found_code_block == 1 && in_code_block == 0) {
            # This is output after the code block - extract it
            extracted_output = extracted_output $0 "\n"
            next
        }

        # Before any code block or other content - keep in details
        details_content = details_content $0 "\n"
        next
    }

    # Outside details block - print as-is
    { print }
    ' "$md_file" > "${md_file}.tmp" && mv "${md_file}.tmp" "$md_file"
}

rendered_count=0
cached_count=0

# Function to process a single qmd file
process_qmd_file() {
    local qmd_file="$1"
    local dir=$(dirname "$qmd_file")

    if needs_rendering "$qmd_file"; then
        echo "Rendering $qmd_file"

        # Change to the post directory and render
        cd "$dir"
        mkdir -p .blog-cache
        if ! quarto render "index.qmd" --to gfm --output-dir . --execute-daemon=false 2> .blog-cache/last-error.log; then
          echo "Error: Quarto render failed. See $dir/.blog-cache/last-error.log" >&2
          quarto render "index.qmd" --to gfm --output-dir . --execute-daemon=false || true
          cd - > /dev/null
          return 0
        fi
        cd - > /dev/null

        # Post-processing: clean up Quarto output for Astro
        local md_file="${qmd_file%.qmd}.md"
        if [ -f "$md_file" ]; then
            # Extract year and folder name for image path fixing
            year=$(echo "$qmd_file" | sed 's|.*/\([0-9]\{4\}\)/.*|\1|')
            post_folder=$(basename "$(dirname "$qmd_file")")

            # Move Quarto index_files assets to the POST DIRECTORY (colocation)
            # This allows Astro Content Layer to resolve relative paths properly
            post_dir=$(dirname "$md_file")

            # Handle both index_files (older Quarto) and nested src structure (newer Quarto)
            if [ -d "$post_dir/index_files" ]; then
              find "$post_dir/index_files" -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" -o -name "*.gif" -o -name "*.svg" -o -name "*.webp" \) | while read img; do
                base=$(basename "$img")
                cp -f "$img" "${post_dir}/$base"
                rel_index_path=$(echo "$img" | sed "s|$post_dir/||")
                # Replace markdown refs with simple relative path
                sed -i "s|$rel_index_path|./$base|g" "$md_file"
              done
              rm -rf "$post_dir/index_files"
            fi

            # Handle nested src/assets structure created by Quarto (from fig.path setting)
            if [ -d "$post_dir/src/assets/images/blog/${year}/${post_folder}" ]; then
              find "$post_dir/src/assets/images/blog/${year}/${post_folder}" -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" -o -name "*.gif" -o -name "*.svg" -o -name "*.webp" \) | while read img; do
                base=$(basename "$img")
                cp -f "$img" "${post_dir}/$base"
              done
              rm -rf "$post_dir/src"
            fi

            # 1. Fix markdown body image paths: use simple relative paths for colocation
            # Remove any deep path prefixes, keep just the filename with ./
            sed -i "s|src/assets/images/blog/${year}/${post_folder}/\([^)]*\)|./\1|g" "$md_file"

            # CRITICAL: Also catch any remaining index_files paths that weren't replaced in the loop
            # This handles cases where the subfolder structure varies (figure-commonmark, figure-gfm, etc.)
            sed -i 's|index_files/[^/]*/\([^)]*\)|./\1|g' "$md_file"

            # Convert plain image references (no path) to relative paths with ./
            sed -i "s|!\[\](\([^/.][^/)]*\.\(png\|jpg\|jpeg\|gif\|svg\|webp\)\))|![](./\1)|g" "$md_file"

            # 2. Fix frontmatter images: heroImage should still use ../../../../assets/ path
            # (these work because Astro handles frontmatter images via content config schema)
            # No change needed for frontmatter - keep existing paths


            # 3. Extract code block output from code-collapse details blocks
            extract_output_from_details "$md_file"

            # 4. Remove Quarto-generated title and date from the markdown body
            # Extract title from frontmatter (handle both quoted and unquoted titles)
            title_from_yaml=$(awk '/^title:/ {sub(/^title: */, ""); gsub(/^["'\'']|["'\'']$/, ""); print; exit}' "$md_file")

            # More precise AWK script to remove duplicate title/date and clean up blank lines
            awk -v title="$title_from_yaml" '
            BEGIN {
                in_body = 0
                found_frontmatter_end = 0
                content_started = 0
                skip_blanks = 0
            }

            # Track when we exit the frontmatter
            /^---$/ && NR > 1 && !found_frontmatter_end {
                found_frontmatter_end = 1
                in_body = 1
                skip_blanks = 1  # Skip initial blank lines after frontmatter
                print
                next
            }

            # Skip everything before frontmatter ends
            !in_body {
                print
                next
            }

            # In body content after frontmatter
            in_body == 1 {
                # Skip duplicate title (exact match with # prefix)
                if ($0 == "# " title) {
                    skip_blanks = 1
                    next
                }

                # Skip standalone date pattern (YYYY-MM-DD format)
                if ($0 ~ /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/) {
                    skip_blanks = 1
                    next
                }

                # Skip standalone author line (typically appears after title)
                if ($0 ~ /^[A-Z][a-z]+ [A-Z][a-z]+$/ && skip_blanks == 1) {
                    next
                }

                # Skip blank lines when we are still cleaning up
                if ($0 == "" && skip_blanks == 1) {
                    next
                }

                # Found real content - stop skipping blanks and start printing
                if ($0 != "") {
                    skip_blanks = 0
                    content_started = 1
                }

                # Only print if we have started real content or this is not a blank line
                if (content_started == 1 || $0 != "") {
                    print
                }
            }' "$md_file" > "${md_file}.tmp" && mv "${md_file}.tmp" "$md_file"

        fi

        update_cache "$qmd_file"
        rendered_count=$((rendered_count + 1))
    else
        echo "Cached: $qmd_file"
        cached_count=$((cached_count + 1))
    fi
}

# Process either specific file or all files
if [ -n "$SPECIFIC_FILE" ]; then
    # Build specific file
    if [ ! -f "$SPECIFIC_FILE" ]; then
        echo "Error: File $SPECIFIC_FILE not found"
        exit 1
    fi
    process_qmd_file "$SPECIFIC_FILE"
else
    # Find and render all index.qmd files in the new structure
    while IFS= read -r -d '' qmd_file; do
        process_qmd_file "$qmd_file"
    done < <(find src/content/blog -name "index.qmd" -path "*/[0-9][0-9][0-9][0-9]/*/*" -type f -print0)
fi

echo "Rendered: $rendered_count, Cached: $cached_count"
echo "Blog build complete"
echo "All posts processed"
echo "Images placed in correct directories"
