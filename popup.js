// ─────────────────────────────────────────────────────────────────────────────
// popup.js
// Lógica do popup — a janelinha que abre quando você clica no ícone da extensão.
// Responsabilidade: ler/escrever no storage e refletir o estado na UI.
// ─────────────────────────────────────────────────────────────────────────────

// Captura referências para os elementos do HTML pelo ID.
// Feito uma vez aqui em cima para não precisar chamar getElementById
// toda vez que uma função roda.
const input = document.getElementById("site-input");
const addBtn = document.getElementById("add-btn");
const siteList = document.getElementById("site-list");
const toggleBtn = document.getElementById("toggle-btn");
const emptyState = document.getElementById("empty-state");
const counter = document.getElementById("counter");

// ─────────────────────────────────────────────────────────────────────────────
// Funções de Storage
// ─────────────────────────────────────────────────────────────────────────────

// Lê o estado completo do storage e retorna um objeto com
// blockedSites (array) e enabled (boolean).
async function getState() {
  const { blockedSites = [], enabled = true } = await chrome.storage.local.get([
    "blockedSites",
    "enabled"
  ]);
  return { blockedSites, enabled };
}

// Salva um novo array de sites bloqueados no storage.
// O background.js vai detectar essa mudança via onChanged e re-sincronizar as regras.
async function saveSites(sites) {
  await chrome.storage.local.set({ blockedSites: sites });
}

// Salva o estado de enabled (true = bloqueio ativo, false = pausado).
async function saveEnabled(value) {
  await chrome.storage.local.set({ enabled: value });
}

// ─────────────────────────────────────────────────────────────────────────────
// Funções de UI
// ─────────────────────────────────────────────────────────────────────────────

// Recebe o array de sites e o estado enabled, e redesenha
// a lista completa do zero. Simples e previsível.
function renderList(sites, enabled) {
  // Limpa a lista antes de redesenhar para não duplicar itens.
  siteList.innerHTML = "";

  // Mostra ou esconde o estado vazio ("Nenhum site bloqueado ainda")
  emptyState.style.display = sites.length === 0 ? "flex" : "none";

  // Atualiza o contador no header
  counter.textContent = sites.length;

  // Para cada site na lista, cria um elemento <li> com o domínio e um botão de remover.
  sites.forEach((site, index) => {
    const li = document.createElement("li");
    li.className = "site-item";

    // O span mostra o domínio
    const span = document.createElement("span");
    span.className = "site-name";
    span.textContent = site;

    // O botão de remover chama removeSite com o index do item
    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "×";
    removeBtn.setAttribute("aria-label", `Remover ${site}`);
    removeBtn.addEventListener("click", () => removeSite(index));

    li.appendChild(span);
    li.appendChild(removeBtn);
    siteList.appendChild(li);
  });

  // Atualiza o texto e a aparência do botão de toggle
  // dependendo se o bloqueio está ativo ou não.
  if (enabled) {
    toggleBtn.textContent = "Pausar";
    toggleBtn.classList.remove("paused");
  } else {
    toggleBtn.textContent = "Ativar";
    toggleBtn.classList.add("paused");
  }
}

// Limpa e normaliza o input para pegar só o domínio.
// ex: "https://www.youtube.com/watch?v=xxx" → "youtube.com"
// ex: "  YouTube.com  " → "youtube.com"
function normalizeDomain(raw) {
  // Remove espaços nas pontas e converte pra minúsculas
  let cleaned = raw.trim().toLowerCase();

  // Se o usuário colou uma URL completa, tenta extrair só o hostname
  try {
    // URL() só funciona se tiver protocolo, então adicionamos se não tiver
    if (!cleaned.startsWith("http")) {
      cleaned = "https://" + cleaned;
    }
    const url = new URL(cleaned);
    // hostname retorna ex: "www.youtube.com"
    // replace remove o "www." do começo se existir
    return url.hostname.replace(/^www\./, "");
  } catch {
    // Se não conseguiu parsear como URL, retorna a string limpa
    return cleaned.replace(/^www\./, "");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Ações
// ─────────────────────────────────────────────────────────────────────────────

// Adiciona um novo site à lista
async function addSite() {
  const raw = input.value;

  // Não faz nada se o input estiver vazio
  if (!raw.trim()) return;

  const domain = normalizeDomain(raw);

  // Valida se tem pelo menos um ponto no domínio (ex: "youtube.com")
  if (!domain.includes(".")) {
    input.classList.add("error");
    setTimeout(() => input.classList.remove("error"), 600);
    return;
  }

  const { blockedSites, enabled } = await getState();

  // Evita duplicatas — não adiciona se o domínio já está na lista
  if (blockedSites.includes(domain)) {
    input.classList.add("error");
    setTimeout(() => input.classList.remove("error"), 600);
    return;
  }

  // Cria um novo array com o site adicionado (imutável, boas práticas)
  const newSites = [...blockedSites, domain];

  await saveSites(newSites);

  // Limpa o input após adicionar
  input.value = "";

  // Re-renderiza a lista com o novo estado
  renderList(newSites, enabled);
}

// Remove um site pelo seu índice no array
async function removeSite(index) {
  const { blockedSites, enabled } = await getState();

  // filter cria um novo array excluindo o item no índice especificado
  const newSites = blockedSites.filter((_, i) => i !== index);

  await saveSites(newSites);
  renderList(newSites, enabled);
}

// Alterna entre bloqueio ativo e pausado
async function toggleEnabled() {
  const { blockedSites, enabled } = await getState();
  const newEnabled = !enabled;
  await saveEnabled(newEnabled);
  renderList(blockedSites, newEnabled);
}

// ─────────────────────────────────────────────────────────────────────────────
// Event Listeners
// ─────────────────────────────────────────────────────────────────────────────

// Adiciona site ao clicar no botão
addBtn.addEventListener("click", addSite);

// Adiciona site ao pressionar Enter no input
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addSite();
});

// Pausa/ativa o bloqueio
toggleBtn.addEventListener("click", toggleEnabled);

// ─────────────────────────────────────────────────────────────────────────────
// Inicialização
// ─────────────────────────────────────────────────────────────────────────────

// Quando o popup abre, lê o estado atual e renderiza a lista imediatamente.
(async () => {
  const { blockedSites, enabled } = await getState();
  renderList(blockedSites, enabled);

  // Foca o input automaticamente pra UX mais fluida
  input.focus();
})();