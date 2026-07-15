#!/usr/bin/env python3
"""
Local Skills API Service
Reads ~/.hermes/skills/ and exposes JSON API on port 9800
Used by ECS website via frp tunnel
"""
import os
import json
import re
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

SKILLS_DIR = Path.home() / '.hermes' / 'skills'
PORT = 9800


def parse_frontmatter(content: str) -> dict | None:
    """Parse YAML-like frontmatter from SKILL.md"""
    match = re.match(r'^---\s*\n(.*?)\n---', content, re.DOTALL)
    if not match:
        return None

    meta = {}
    current_key = ''
    in_array = False
    array_items = []

    for line in match.group(1).split('\n'):
        kv = re.match(r'^(\w+):\s*(.*)', line)
        if kv:
            if in_array and current_key:
                meta[current_key] = array_items
                in_array = False
                array_items = []
            key, value = kv.group(1), kv.group(2).strip().strip('"\'')
            current_key = key
            if value == '':
                in_array = True
            else:
                meta[key] = value
        elif in_array and line.strip().startswith('- '):
            array_items.append(line.strip()[2:].strip('"\''))

    if in_array and current_key:
        meta[current_key] = array_items

    return meta if meta.get('name') else None


def scan_skills() -> list[dict]:
    """Scan all skills from ~/.hermes/skills/"""
    skills = []

    if not SKILLS_DIR.exists():
        return skills

    for entry in sorted(SKILLS_DIR.iterdir()):
        if not entry.is_dir():
            continue

        # Direct SKILL.md
        skill_md = entry / 'SKILL.md'
        if skill_md.exists():
            content = skill_md.read_text()
            fm = parse_frontmatter(content)
            if fm:
                skills.append({
                    'name': fm['name'],
                    'category': fm.get('category', entry.name),
                    'path': str(skill_md),
                    'description': fm.get('description', ''),
                    'status': 'active',
                    'riskLevel': 'low',
                    'usageCount': 0,
                })

        # Category subdirectories
        for sub in sorted(entry.iterdir()):
            if not sub.is_dir():
                continue
            skill_md = sub / 'SKILL.md'
            if skill_md.exists():
                content = skill_md.read_text()
                fm = parse_frontmatter(content)
                if fm:
                    skills.append({
                        'name': fm['name'],
                        'category': fm.get('category', entry.name),
                        'path': str(skill_md),
                        'description': fm.get('description', ''),
                        'status': 'active',
                        'riskLevel': 'low',
                        'usageCount': 0,
                    })

    return skills


def get_skill_detail(name: str) -> dict | None:
    """Get full skill content by name"""
    skills = scan_skills()
    for skill in skills:
        if skill['name'] == name:
            try:
                content = Path(skill['path']).read_text()
                return {'skill': skill, 'content': content}
            except Exception:
                return {'skill': skill, 'content': '(Unable to read file)'}
    return None


class SkillsHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path.strip('/')

        if path == '' or path == 'skills':
            # List all skills
            skills = scan_skills()
            self.send_json({'success': True, 'data': skills})
        elif path.startswith('skills/'):
            # Get skill detail
            skill_name = path[len('skills/'):]
            detail = get_skill_detail(skill_name)
            if detail:
                self.send_json({'success': True, 'data': detail})
            else:
                self.send_error(404, 'Skill not found')
        elif path == 'health':
            self.send_json({'status': 'ok', 'skills_count': len(scan_skills())})
        else:
            self.send_error(404, 'Not found')

    def send_json(self, data: dict):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        # Quieter logging
        pass


def main():
    server = HTTPServer(('127.0.0.1', PORT), SkillsHandler)
    print(f'Skills API running on http://127.0.0.1:{PORT}')
    print(f'Scanning {SKILLS_DIR}...')
    skills = scan_skills()
    print(f'Found {len(skills)} skills')

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nShutting down...')
        server.shutdown()


if __name__ == '__main__':
    main()
