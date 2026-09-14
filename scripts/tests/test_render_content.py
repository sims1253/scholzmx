"""Exercise the renderer boundary and source-safe artifact transfers in disposable repos."""

import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]


class RenderTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.post = Path('src/content/blog/2025/example')
        (self.root / self.post).mkdir(parents=True)
        (self.root / 'scripts').mkdir()
        shutil.copy2(REPO / 'scripts/render-content.py', self.root / 'scripts')
        shutil.copy2(REPO / 'build-blog.sh', self.root)
        self.write(self.post / 'index.qmd', '---\ntitle: Example\n---\nSource\n')
        self.write(self.post / 'references.bib', 'original bibliography')
        self.write('_quarto.yml', 'format: gfm\n')
        self.write('.gitignore', '.rendered-content/\n.blog-cache/\n**/index.md\n**/*.png\n')
        self.run_command('git', 'init', '-q')
        self.run_command('git', 'add', '.')
        self.bin = self.root / 'bin'
        self.bin.mkdir()
        self.write('bin/Rscript', '#!/bin/sh\necho "R test runtime"\n')
        self.write('bin/quarto', '#!/bin/sh\nif [ "$1" = "--version" ]; then echo test; exit 0; fi\nexit 42\n')
        for file in self.bin.iterdir():
            file.chmod(0o755)
        self.env = {**os.environ, 'PATH': str(self.bin) + ':' + os.environ['PATH']}

    def write(self, path, content):
        target = self.root / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content)

    def run_command(self, *command, success=True):
        result = subprocess.run(command, cwd=self.root, env=getattr(self, 'env', None), capture_output=True, text=True)
        if success:
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        else:
            self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        return result.stdout.strip()

    def helper(self, command, **kwargs):
        return self.run_command('python3', 'scripts/render-content.py', command, **kwargs)

    def export(self):
        self.write(self.post / 'index.md', '# Rendered\n')
        self.write(self.post / 'figure.png', 'generated image')
        self.helper('export')

    def test_quarto_failure_is_fatal_even_with_old_markdown(self):
        self.write(self.post / 'index.md', '# Previous render\n')
        self.run_command('bash', 'build-blog.sh', '--force', success=False)
        self.assertFalse(list((self.root / '.blog-cache').glob('*.hash')))

    def test_success_without_markdown_is_fatal(self):
        self.write('bin/quarto', '#!/bin/sh\nexit 0\n')
        self.run_command('bash', 'build-blog.sh', '--force', success=False)

    def test_success_cannot_reuse_old_markdown_when_no_output_is_written(self):
        self.write(self.post / 'index.md', '# Old output\n')
        self.write('bin/quarto', '#!/bin/sh\nexit 0\n')
        self.run_command('bash', 'build-blog.sh', '--force', success=False)

    def test_local_cache_invalidates_for_bibliography_config_and_runtime(self):
        self.write('bin/quarto', """#!/bin/sh
if [ "$1" = "--version" ]; then echo test; exit 0; fi
echo rendered >> "$RENDER_TEST_COUNTER"
printf '%s\\n' '---' 'title: Example' '---' 'Body' > index.md
""")
        counter = self.root / 'render-count'
        self.env['RENDER_TEST_COUNTER'] = str(counter)
        self.run_command('bash', 'build-blog.sh')
        self.run_command('bash', 'build-blog.sh')
        self.assertEqual(counter.read_text().splitlines(), ['rendered'])
        for path in [self.post / 'references.bib', Path('_quarto.yml'), Path('bin/Rscript')]:
            with (self.root / path).open('a') as output:
                output.write('\necho changed\n')
            self.run_command('bash', 'build-blog.sh')
        self.assertEqual(len(counter.read_text().splitlines()), 4)

    def test_authored_image_paths_survive_postprocessing(self):
        image = '../../../../assets/images/blog/2025/example/source.png'
        self.write('bin/quarto', f"""#!/bin/sh
if [ "$1" = "--version" ]; then echo test; exit 0; fi
cat > index.md <<'MARKDOWN'
---
title: Example
---
![Authored image]({image})
MARKDOWN
""")
        self.run_command('bash', 'build-blog.sh', '--force')
        self.assertIn(image, (self.root / self.post / 'index.md').read_text())

    def test_quarto_html_figure_becomes_markdown_without_changing_code_examples(self):
        self.write(self.post / 'figure.png', 'image')
        markup = '<img src="./figure.png" data-fig-alt="A &amp; B [groups]" />'
        self.write(self.post / 'index.md', f'```html\n{markup}\n```\n\n{markup}\n')
        self.run_command('python3', 'scripts/render-content.py', 'normalize', str(self.post / 'index.md'))
        output = (self.root / self.post / 'index.md').read_text()
        self.assertIn(f'```html\n{markup}\n```', output)
        self.assertIn(r'![A & B \[groups\]](./figure.png)', output)
        self.assertEqual(output.count('<img'), 1)

    def test_artifact_contains_only_generated_files(self):
        self.export()
        files = {str(p.relative_to(self.root / '.rendered-content')) for p in (self.root / '.rendered-content').rglob('*') if p.is_file()}
        self.assertEqual(files, {'.complete', str(self.post / 'index.md'), str(self.post / 'figure.png')})
        (self.root / self.post / 'index.md').unlink()
        self.helper('restore')
        self.assertEqual((self.root / self.post / 'index.md').read_text(), '# Rendered\n')

    def test_artifact_cannot_overwrite_qmd(self):
        self.export()
        self.write(Path('.rendered-content') / self.post / 'index.qmd', 'stale source')
        before = (self.root / self.post / 'index.qmd').read_text()
        self.helper('restore', success=False)
        self.assertEqual((self.root / self.post / 'index.qmd').read_text(), before)

    def test_artifact_cannot_overwrite_tracked_image(self):
        self.export()
        self.run_command('git', 'add', '-f', str(self.post / 'figure.png'))
        self.helper('restore', success=False)

    def test_deleted_post_is_not_restored(self):
        self.export()
        shutil.rmtree(self.root / self.post)
        self.helper('restore', success=False)
        self.assertFalse((self.root / self.post).exists())

    def test_incomplete_artifact_is_rejected(self):
        self.export()
        (self.root / '.rendered-content' / self.post / 'index.md').unlink()
        self.helper('restore', success=False)

    def test_symlink_artifact_is_rejected(self):
        self.export()
        image = self.root / '.rendered-content' / self.post / 'figure.png'
        image.unlink()
        image.symlink_to(self.root / self.post / 'references.bib')
        self.helper('restore', success=False)

    def test_key_changes_with_inputs_but_not_generated_outputs(self):
        initial = self.helper('key')
        self.export()
        self.assertEqual(self.helper('key'), initial)
        for path in [self.post / 'references.bib', Path('_quarto.yml'), Path('build-blog.sh')]:
            before = self.helper('key')
            with (self.root / path).open('a') as output:
                output.write('\nchanged')
            self.assertNotEqual(self.helper('key'), before)
        (self.root / self.post / 'index.qmd').unlink()
        self.assertNotEqual(self.helper('key'), before)

    def test_no_quarto_posts_is_valid(self):
        shutil.rmtree(self.root / self.post)
        self.helper('export')
        self.helper('restore')
