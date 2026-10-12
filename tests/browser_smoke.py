"""Teste de navegação e venda completa, com banco e acesso temporários."""
import json
import os
from pathlib import Path
import secrets
import socket
import subprocess
import tempfile
import time
import urllib.request
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / 'docs'
DOCS.mkdir(exist_ok=True)
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0))
    port = sock.getsockname()[1]
url = f'http://127.0.0.1:{port}'
with tempfile.TemporaryDirectory(prefix='conecta-browser-') as data_dir:
    server = subprocess.Popen(['node', 'server/index.mjs'], cwd=ROOT, env={**os.environ, 'DATA_DIR': data_dir, 'PORT': str(port)}, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(60):
            try:
                urllib.request.urlopen(url + '/api/health', timeout=1)
                break
            except Exception:
                time.sleep(.1)
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
            context = browser.new_context(viewport={'width': 1440, 'height': 1050}, permissions=['clipboard-read','clipboard-write'])
            page = context.new_page()
            page.set_default_timeout(10000)
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(url)
            expect(page.get_by_role('heading', name='Vamos começar?')).to_be_visible()
            page.screenshot(path=str(DOCS / 'conecta-acesso.png'), full_page=True)
            page.get_by_label('Seu nome', exact=True).fill('Alex')
            page.get_by_label('Seu negócio', exact=True).fill('Minha marca NFC')
            page.get_by_label('E-mail', exact=True).fill('teste@example.test')
            password = secrets.token_urlsafe(24)
            page.locator('input[name=password]').fill(password)
            page.get_by_role('checkbox').check()
            page.get_by_role('button', name='Criar meu espaço').click()
            expect(page.get_by_role('heading', name='Vamos fazer conexões, Alex?')).to_be_visible()
            page.evaluate('document.fonts.ready')
            page.screenshot(path=str(DOCS / 'conecta-desktop.png'), full_page=True)

            def nav(name):
                page.get_by_role('navigation', name='Menu principal').get_by_role('button', name=name, exact=True).click()

            def state():
                return page.evaluate("fetch('/api/state').then(r => r.json())")

            nav('Clientes')
            page.get_by_role('button', name='Novo cliente', exact=True).click()
            page.get_by_label('Nome do negócio *', exact=True).fill('Café Teste UI')
            page.get_by_label('Pessoa de contato').fill('Contato Teste')
            page.get_by_label('WhatsApp com DDD').fill('55999990000')
            page.get_by_label('Segmento', exact=True).fill('Cafeteria')
            page.get_by_label('Esse contato autorizou').check()
            page.get_by_role('button', name='Adicionar cliente', exact=True).click()
            expect(page.get_by_role('dialog')).to_have_count(0)
            customer = next(c for c in state()['customers'] if c['name'] == 'Café Teste UI')
            page.get_by_role('button', name='Abrir Café Teste UI', exact=True).click()
            page.get_by_role('button', name='Editar', exact=True).click()
            page.get_by_label('Etapa do funil').select_option('interested')
            page.get_by_role('button', name='Salvar alterações').click()
            expect(page.get_by_role('dialog')).to_have_count(0)

            nav('Mensagens')
            page.get_by_label('Para quem vamos escrever?').select_option(customer['id'])
            expect(page.get_by_label('Texto da mensagem')).to_contain_text('Café Teste UI')
            page.get_by_role('button', name='Copiar texto').click()
            expect(page.get_by_role('status')).to_contain_text('Mensagem copiada')
            assert next(c for c in state()['customers'] if c['id'] == customer['id'])['stage'] == 'interested'
            expect(page.get_by_role('button', name='Abrir no WhatsApp')).to_be_enabled()
            # No WhatsApp navigation or message sending is performed.
            page.get_by_role('button', name='Confirmar contato', exact=True).click()
            expect(page.get_by_role('status')).to_contain_text('Contato registrado')
            assert next(c for c in state()['customers'] if c['id'] == customer['id'])['lastContactAt']
            page.screenshot(path=str(DOCS / 'conecta-mensagens.png'), full_page=True)

            nav('Minha agenda')
            page.get_by_role('button', name='Nova tarefa').click()
            page.get_by_label('Tarefa *', exact=True).fill('Retorno de teste UI')
            page.get_by_label('Cliente', exact=True).select_option(customer['id'])
            page.get_by_role('button', name='Salvar', exact=True).click()
            expect(page.get_by_role('dialog')).to_have_count(0)
            page.get_by_role('button', name='Concluir Retorno de teste UI', exact=True).click()
            expect(page.get_by_role('status')).to_contain_text('concluído')
            page.get_by_role('tab', name='Concluídas', exact=True).click()
            expect(page.get_by_role('button', name='Reabrir Retorno de teste UI', exact=True)).to_be_visible()

            nav('Pedidos & estoque')
            page.get_by_role('tab', name='Estoque e produtos').click()
            page.get_by_role('button', name='Novo produto').click()
            page.get_by_label('Nome do produto *').fill('Placa edição teste')
            page.get_by_label('Preço de venda (R$) *').fill('90')
            page.get_by_role('button', name='Salvar', exact=True).click()
            expect(page.get_by_role('dialog')).to_have_count(0)
            product = next(product for product in state()['products'] if product['name'] == 'Placa edição teste')
            page.get_by_role('button', name='Entrada de estoque', exact=True).click()
            page.get_by_label('Produto', exact=True).select_option(product['id'])
            page.get_by_label('Quantidade *', exact=True).fill('4')
            page.get_by_label('Custo por unidade (R$) *').fill('20')
            page.get_by_role('button', name='Registrar entrada').click()
            expect(page.get_by_role('dialog')).to_have_count(0)
            page.get_by_role('button', name='Novo pedido', exact=True).click()
            page.get_by_label('Cliente *', exact=True).select_option(customer['id'])
            page.get_by_label('Produto 1', exact=True).select_option(product['id'])
            page.get_by_label('Quantidade 1', exact=True).fill('2')
            page.get_by_label('Desconto total (R$)').fill('10')
            page.get_by_role('button', name='Registrar pedido', exact=True).click()
            expect(page.get_by_role('dialog')).to_have_count(0)
            order = next(o for o in state()['orders'] if o['customerId'] == customer['id'])
            assert order['totalCents'] == 17000 and order['costCents'] == 4000
            assert next(l for l in state()['lots'] if l['productId'] == product['id'])['remaining'] == 2
            page.get_by_role('tab', name='Pedidos', exact=True).click()
            row = page.get_by_role('row').filter(has_text='Café Teste UI')
            row.get_by_role('button', name='Confirmar pagamento').click()
            expect(row.get_by_text('Pago', exact=True)).to_be_visible()
            row.get_by_role('button', name='Marcar entregue').click()
            expect(row.get_by_text('Entregue', exact=True)).to_be_visible()

            nav('Clientes')
            page.get_by_role('button', name='Importar lista').click()
            page.get_by_label('Ou cole o conteúdo do CSV').fill('nome;contato;telefone;segmento;bairro;cidade\nCliente CSV;Pessoa;;Ótica;Centro;Santos\nCliente CSV;Pessoa;;Ótica;Centro;Santos')
            page.get_by_role('button', name='Importar 2 clientes').click()
            expect(page.get_by_role('dialog')).to_have_count(0)
            assert sum(c['name'] == 'Cliente CSV' for c in state()['customers']) == 1
            page.reload()
            expect(page.get_by_role('heading', name='Cada cliente, uma conexão')).to_be_visible()
            assert len(state()['orders']) == 8
            nav('Funil de vendas')
            expect(page.get_by_role('heading', name='Seu funil de vendas')).to_be_visible()
            page.screenshot(path=str(DOCS / 'conecta-funil.png'), full_page=True)
            page.get_by_role('button', name='Configurações', exact=True).click()
            with page.expect_download() as download_info:
                page.get_by_role('link', name='Exportar meus dados').click()
            download = download_info.value
            exported = json.loads(Path(download.path()).read_text())
            assert exported['format'] == 'conecta-v1'
            assert any(c['name'] == 'Café Teste UI' for c in exported['data']['customers'])

            mobile = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, device_scale_factor=1, storage_state=context.storage_state())
            m = mobile.new_page()
            m.on('pageerror', lambda error: errors.append(str(error)))
            mobile_results = {}
            for view in ['dashboard', 'pipeline', 'customers', 'tasks', 'messages', 'orders', 'settings']:
                m.goto(url + '/#' + view)
                expect(m.locator('h1')).to_be_visible()
                m.evaluate('document.fonts.ready')
                mobile_results[view] = m.evaluate('document.documentElement.scrollWidth <= innerWidth')
                if view == 'dashboard': m.screenshot(path=str(DOCS / 'conecta-mobile.png'), full_page=True)
            assert all(mobile_results.values()), mobile_results
            page.get_by_role('button', name='Sair da conta', exact=True).last.click()
            expect(page.get_by_role('heading', name='Bom ter você de volta.')).to_be_visible()
            page.get_by_label('E-mail', exact=True).fill('teste@example.test')
            page.locator('input[name=password]').fill(password)
            page.get_by_role('button', name='Entrar no meu espaço').click()
            expect(page.locator('h1')).to_be_visible()
            assert errors == [], errors
            print(json.dumps({'passed': True, 'flows': ['account', 'customer', 'message_copy_without_stage_change', 'manual_contact', 'tasks', 'products', 'stock', 'order', 'payment', 'delivery', 'csv_deduplication', 'reload', 'export', 'logout_login'], 'mobile_pages_without_overflow': mobile_results, 'browser_errors': errors}, ensure_ascii=False, indent=2))
            browser.close()
    finally:
        server.terminate()
        server.wait(timeout=10)
