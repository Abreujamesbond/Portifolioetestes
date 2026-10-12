"""Check the standalone file and the Vercel static demo without an API."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    results = []
    for kind in ['standalone', 'vercel']:
        context = browser.new_context(viewport={'width': 1440, 'height': 1050})
        errors, unexpected = [], []
        def route(request):
            # A virtual HTTPS origin tests the exact artifact without publishing it.
            from urllib.parse import urlparse, unquote
            path = unquote(urlparse(request.request.url).path)
            if kind == 'standalone' and path == '/':
                request.fulfill(path=str(ROOT / 'preview/Conecta-previa.html'), content_type='text/html')
            elif kind == 'vercel' and not path.startswith('/api/'):
                target = (ROOT / 'dist' / (path.lstrip('/') or 'index.html')).resolve()
                if target.is_relative_to(ROOT / 'dist') and target.is_file():
                    request.fulfill(path=str(target))
                else:
                    unexpected.append(path)
                    request.abort()
            else:
                unexpected.append(path)
                request.abort()
        context.route('**/*', route)
        page = context.new_page()
        page.set_default_timeout(10000)
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto('https://conecta-preview.example/')
        expect(page.get_by_role('heading', name='Vamos fazer conexões, Alex?')).to_be_visible()
        expect(page.locator('.demo-banner')).to_contain_text('navegador')
        page.get_by_role('navigation', name='Menu principal').get_by_role('button', name='Clientes', exact=True).click()
        page.get_by_role('button', name='Novo cliente', exact=True).click()
        page.get_by_label('Nome do negócio *', exact=True).fill('Cliente da prévia')
        page.get_by_role('button', name='Adicionar cliente', exact=True).click()
        expect(page.get_by_role('dialog')).to_have_count(0)
        page.reload()
        expect(page.get_by_role('button', name='Abrir Cliente da prévia', exact=True)).to_be_visible()
        page.get_by_role('navigation', name='Menu principal').get_by_role('button', name='Mensagens', exact=True).click()
        expect(page.get_by_role('button', name='Abrir no WhatsApp')).to_be_disabled()
        page.get_by_role('button', name='Configurações', exact=True).click()
        with page.expect_download() as saved:
            page.get_by_role('button', name='Exportar meus testes').click()
        exported = json.loads(Path(saved.value.path()).read_text())
        assert exported['format'] == 'conecta-preview-v1'
        assert any(c['name'] == 'Cliente da prévia' for c in exported['data']['customers'])
        page.set_viewport_size({'width': 390, 'height': 844})
        for view in ['dashboard', 'pipeline', 'customers', 'tasks', 'messages', 'orders', 'settings']:
            page.goto('https://conecta-preview.example/#' + view)
            expect(page.locator('h1')).to_be_visible()
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), view
        page.set_viewport_size({'width': 1440, 'height': 1050})
        page.goto('https://conecta-preview.example/#dashboard')
        expect(page.locator('h1')).to_be_visible()
        if kind == 'standalone':
            page.screenshot(path=str(ROOT / 'docs/conecta-previa.png'), full_page=True)
        assert errors == [], errors
        assert unexpected == [], unexpected
        results.append({'mode': kind, 'passed': True, 'api_requests': 0, 'mobile_pages': 7})
        context.close()
    browser.close()
    print(json.dumps(results, ensure_ascii=False, indent=2))
