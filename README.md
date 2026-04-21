# ⛔ Bloqueador

Uma extensão para Chrome que bloqueia sites que te distraem — sem limite de domínios, sem frescura.

---

## Funcionalidades

- Adiciona qualquer domínio à lista de bloqueio (sem limite)
- Aceita URLs completas ou só o domínio — normaliza automaticamente
- Botão de pausar/ativar o bloqueio sem apagar a lista
- Página de bloqueio customizada no lugar do site
- Lista persiste entre sessões e reinicializações do browser

---

## Instalação

Como a extensão não está publicada na Chrome Web Store, a instalação é manual — mas é simples.

**1. Clone o repositório**
```bash
git clone https://github.com/seu-usuario/bloqueador.git
```

**2. Abra a página de extensões do Chrome**
```
chrome://extensions
```

**3. Ative o Modo do desenvolvedor** (toggle no canto superior direito)

**4. Clique em "Carregar sem compactação"** e selecione a pasta do projeto

Pronto. O ícone vai aparecer na barra do Chrome.

---

## Como usar

Clique no ícone da extensão para abrir o popup.

| Ação | Como fazer |
|---|---|
| Bloquear um site | Digite o domínio e pressione `Enter` ou `+` |
| Remover um site | Clique no `×` ao lado do domínio |
| Pausar tudo | Clique em **Pausar** no rodapé |
| Reativar | Clique em **Ativar** no rodapé |

O campo de input aceita qualquer formato:
```
youtube.com
www.youtube.com
https://www.youtube.com/watch?v=xyz
```
Todos viram `youtube.com`.

---

## Estrutura do projeto

```
bloqueador/
├── manifest.json   # Configuração e permissões da extensão
├── background.js   # Service worker — gerencia as regras de bloqueio
├── popup.html      # Markup do popup
├── popup.css       # Estilos do popup
├── popup.js        # Lógica do popup
└── blocked.html    # Página exibida ao tentar acessar um site bloqueado
```

---

## Como funciona

O bloqueio usa a API `declarativeNetRequest` do Chrome (Manifest V3), que redireciona requisições de navegação antes mesmo da página carregar. As regras são **dinâmicas** — criadas e removidas em runtime conforme você edita a lista — e a lista em si fica salva no `chrome.storage.local`, persistindo entre sessões.

---

## Roadmap

- [ ] Proteção por senha para impedir desativar no impulso
- [ ] Pomodoro embutido — bloqueia automaticamente durante o foco
- [ ] Horários de bloqueio (ex: bloquear só das 9h às 18h)
- [ ] Exportar/importar lista de sites
