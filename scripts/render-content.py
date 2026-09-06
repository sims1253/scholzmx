#!/usr/bin/env python3
"""Fingerprint render inputs and transfer generated content without copying sources."""

import argparse
import hashlib
import re
from html.parser import HTMLParser
from urllib.parse import quote
import shutil
import subprocess
from pathlib import Path

CACHE = Path('.rendered-content')
IMAGES = {'.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'}


def tracked_files():
    return set(subprocess.check_output(['git', 'ls-files', '-z']).decode().split('\0')) - {''}


def posts():
    return sorted(Path('src/content/blog').glob('[0-9][0-9][0-9][0-9]/*/index.qmd'))


def fingerprint(toolchain=False):
    inputs = subprocess.check_output([
        'git', 'ls-files', '-z', '--cached', '--others', '--exclude-standard', '--',
        'src/content/blog', 'src/assets', 'public', 'scripts', 'build-blog.sh',
        '_quarto.yml', '.github/workflows/content-render.yml',
    ]).decode().split('\0')
    digest = hashlib.sha256()
    for name in sorted(set(inputs) - {''}):
        path = Path(name)
        digest.update(name.encode() + b'\0')
        digest.update(path.read_bytes() if path.is_file() else b'<deleted>')
        digest.update(b'\0')
    if toolchain:
        digest.update(subprocess.check_output(['quarto', '--version']))
        digest.update(subprocess.check_output([
            'Rscript', '-e',
            'cat(R.version.string); p <- installed.packages(); '
            'p <- p[order(p[,"Package"], p[,"Version"]),,drop=FALSE]; '
            'write.table(p[,c("Package", "Version")], row.names=FALSE)',
        ]))
    return digest.hexdigest()


def allowed(path):
    for post in posts():
        if path == post.with_suffix('.md'):
            return True
        image_dir = Path('src/assets/images/blog') / post.parent.relative_to('src/content/blog')
        if path.suffix.lower() in IMAGES and (
            path.parent == post.parent or path.is_relative_to(image_dir)
        ):
            return True
    return False


class QuartoImage(HTMLParser):
    def handle_starttag(self, tag, attributes):
        self.tag = tag
        self.attributes = dict(attributes)


def normalize_images(markdown):
    """Give Astro Markdown images instead of Quarto's raw HTML fig-alt output."""
    output = []
    fence = ''
    for line in markdown.read_text().splitlines(keepends=True):
        match = re.match(r'^ {0,3}(`{3,}|~{3,})', line)
        if match:
            marker = match.group(1)
            if not fence:
                fence = marker
            elif marker[0] == fence[0] and len(marker) >= len(fence):
                fence = ''
        if not fence and re.fullmatch(r'\s*<img\s+[^>]+/?>\s*', line):
            image = QuartoImage()
            image.feed(line)
            attributes = image.attributes
            source = attributes.get('src', '')
            if 'data-fig-alt' in attributes and (markdown.parent / source).is_file():
                alt = attributes.get('alt') or attributes['data-fig-alt']
                alt = alt.replace('\\', '\\\\').replace('[', r'\[').replace(']', r'\]')
                line = f'![{alt}]({quote(source, safe="/.-_")})\n'
        output.append(line)
    markdown.write_text(''.join(output))


def verify(root=Path('.')):
    for post in posts():
        output = root / post.with_suffix('.md')
        if not output.is_file() or output.stat().st_size == 0:
            raise ValueError(f'Missing rendered post: {output}')


def transfer(mode):
    tracked = tracked_files()
    if mode == 'export':
        verify()
        if CACHE.exists():
            shutil.rmtree(CACHE)
        CACHE.mkdir()
        # Keep the artifact nonempty for sites with no Quarto posts.
        (CACHE / '.complete').touch()
        candidates = set()
        for post in posts():
            candidates.update(post.parent.iterdir())
            image_dir = Path('src/assets/images/blog') / post.parent.relative_to('src/content/blog')
            candidates.update(image_dir.rglob('*'))
        files = [p for p in candidates if p.is_file() and allowed(p) and str(p) not in tracked]
        source, destination = Path('.'), CACHE
    else:
        if not (CACHE / '.complete').is_file():
            raise ValueError('Missing render artifact marker')
        files = []
        for item in CACHE.rglob('*'):
            if item.is_symlink():
                raise ValueError(f'Symlink in render artifact: {item}')
            if item.is_file() and item != CACHE / '.complete':
                files.append(item.relative_to(CACHE))
        source, destination = CACHE, Path('.')
        verify(CACHE)
    # Validate the entire transfer before touching the checkout.
    for path in files:
        if not allowed(path) or str(path) in tracked:
            raise ValueError(f'Refusing to overwrite source or restore obsolete output: {path}')
        for root in (source, destination):
            target = root / path
            if target.is_symlink() or any(p.is_symlink() for p in target.parents):
                raise ValueError(f'Symlink in render path: {target}')
    for path in files:
        target = destination / path
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source / path, target)
    verify(destination)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['key', 'export', 'restore', 'verify', 'normalize'])
    parser.add_argument('markdown', nargs='?', type=Path)
    parser.add_argument('--toolchain', action='store_true')
    args = parser.parse_args()
    if args.command == 'key':
        print(fingerprint(args.toolchain))
    elif args.command == 'normalize':
        if args.markdown is None:
            parser.error('normalize requires a Markdown path')
        normalize_images(args.markdown)
    elif args.command == 'verify':
        verify()
    else:
        transfer(args.command)
