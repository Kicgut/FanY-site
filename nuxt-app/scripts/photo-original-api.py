#!/usr/bin/env python3
"""Read-only Ubuntu photo original service for the ECS internal proxy."""
import hmac
import mimetypes
import os
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

TOKEN = os.environ.get("PHOTO_ORIGINALS_TOKEN", "")
HOST = os.environ.get("PHOTO_ORIGINALS_HOST", "127.0.0.1")
PORT = int(os.environ.get("PHOTO_ORIGINALS_PORT", "9801"))
ROOTS = [Path(value).resolve() for value in os.environ.get("PHOTO_ORIGINALS_ROOTS", "/mnt/data/personal-website/photos").split(":") if value]
SAFE_NAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,255}$")

def find_original(filename: str):
    if not SAFE_NAME.fullmatch(filename):
        return None
    for root in ROOTS:
        if not root.is_dir():
            continue
        for path in root.rglob(filename):
            resolved = path.resolve()
            if resolved.is_file() and (resolved == root or root in resolved.parents):
                return resolved
    return None

class Handler(BaseHTTPRequestHandler):
    server_version = "PhotoOriginalAPI/1.0"

    def log_message(self, *_args):
        return

    def send_error_response(self, status=404):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(b'{"error":"not found"}')

    def do_GET(self):
        if TOKEN and not hmac.compare_digest(self.headers.get("x-photo-internal-token", ""), TOKEN):
            self.send_error_response()
            return
        parsed = urlparse(self.path)
        if parsed.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"ok":true}')
            return
        prefix = "/photo/original/"
        if not parsed.path.startswith(prefix):
            self.send_error_response()
            return
        path = find_original(unquote(parsed.path[len(prefix):]))
        if not path:
            self.send_error_response()
            return
        try:
            size = path.stat().st_size
            self.send_response(200)
            self.send_header("Content-Type", mimetypes.guess_type(path.name)[0] or "application/octet-stream")
            self.send_header("Content-Length", str(size))
            self.send_header("Cache-Control", "private, no-store")
            self.end_headers()
            with path.open("rb") as source:
                while chunk := source.read(1024 * 1024):
                    self.wfile.write(chunk)
        except (BrokenPipeError, ConnectionResetError, OSError):
            return

if __name__ == "__main__":
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
