// ─────────────────────────────────────────────────────────────────────────────
// background.js
// Service Worker da extensão. Roda em background, invisível pro usuário.
// Responsabilidade única: manter as regras de bloqueio do Chrome sincronizadas
// com a lista de sites que está salva no storage.
// ─────────────────────────────────────────────────────────────────────────────

// syncRules é a função central de toda a extensão.
// Ela lê a lista de sites bloqueados do storage e recria todas as regras
// dinâmicas do declarativeNetRequest do zero.
async function syncRules() {

  // Lê duas chaves do storage local:
  // - blockedSites: array de strings com os domínios (ex: ["youtube.com", "twitter.com"])
  // - enabled: boolean que indica se o bloqueio está ativo ou pausado
  // O "= []" e "= true" são valores padrão caso ainda não existam no storage
  const { blockedSites = [], enabled = true } = await chrome.storage.local.get([
    "blockedSites",
    "enabled"
  ]);

  // Busca todas as regras dinâmicas que já existem no momento.
  // Precisamos dos IDs delas para poder removê-las antes de recriar.
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();

  // Extrai só os IDs numéricos de cada regra existente.
  // ex: [1, 2, 3] se tiver 3 sites bloqueados.
  const existingIds = existingRules.map((rule) => rule.id);

  // Constrói o array de novas regras a partir da lista de sites.
  // Se "enabled" for false, newRules é um array vazio — ou seja, nenhuma regra
  // é adicionada, efetivamente pausando o bloqueio sem apagar a lista.
  const newRules = enabled
    ? blockedSites.map((site, index) => ({
        // id precisa ser um número inteiro único. Usamos index + 1
        // porque IDs não podem ser 0.
        id: index + 1,

        // priority define qual regra vence se duas regras conflitarem.
        // 1 é suficiente aqui pois não temos regras concorrentes.
        priority: 1,

        // action define o que acontece quando a regra bate:
        // "redirect" redireciona o usuário para outra URL.
        // extensionPath aponta para um arquivo dentro da própria extensão.
        action: {
          type: "redirect",
          redirect: {
            extensionPath: "/blocked.html"
          }
        },

        // condition define quando a regra é ativada.
        // urlFilter faz um match na URL da página que o usuário está tentando acessar.
        // O padrão *site* significa "qualquer URL que contenha o domínio".
        // resourceTypes: ["main_frame"] significa que só bloqueia a navegação
        // principal (a aba em si), não bloqueia imagens/scripts de terceiros.
        condition: {
          urlFilter: `*${site}*`,
          resourceTypes: ["main_frame"]
        }
      }))
    : [];

  // Atualiza as regras dinâmicas de uma vez:
  // - removeRuleIds: remove todas as regras antigas pelos IDs que coletamos
  // - addRules: adiciona o novo conjunto de regras
  // Isso garante que o estado sempre reflita exatamente o que está no storage.
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existingIds,
    addRules: newRules
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Event Listeners
// ─────────────────────────────────────────────────────────────────────────────

// Sempre que qualquer coisa no storage local mudar, verifica se foi
// "blockedSites" ou "enabled" que mudou. Se sim, re-sincroniza as regras.
// Isso é o que faz a extensão reagir em tempo real quando o usuário
// adiciona ou remove um site no popup.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && (changes.blockedSites || changes.enabled)) {
    syncRules();
  }
});

// Sincroniza as regras quando o Chrome é iniciado.
// Necessário porque as regras dinâmicas não persistem entre reinicializações
// do browser por si só — o storage persiste, as regras não.
chrome.runtime.onStartup.addListener(syncRules);

// Sincroniza as regras quando a extensão é instalada ou atualizada.
chrome.runtime.onInstalled.addListener(syncRules);