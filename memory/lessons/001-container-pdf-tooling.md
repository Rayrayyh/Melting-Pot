# 001 Reading the spec PDFs in this container requires poppler, not pypdf

Summary: pypdf is broken in this environment (system cryptography package fails to import); `apt-get update && apt-get install -y poppler-utils` works and gives pdftotext and pdftoppm.

## Details

- `import pypdf` crashes with `ModuleNotFoundError: No module named '_cffi_backend'` inside the system cryptography package, so Python-side PDF extraction is a dead end here.
- The Read tool cannot render PDFs until poppler is installed, and `apt-get install poppler-utils` 404s until `apt-get update` refreshes the index.
- After install, `pdftotext -layout <file> <out.txt>` extracted all four repo PDFs cleanly.

## Why it mattered

The repo's product docs are PDFs; every future session that wants to re-read them should go straight to poppler instead of burning time on the broken Python path.
