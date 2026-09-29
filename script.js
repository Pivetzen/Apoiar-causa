// CONFIGURAÇÕES DOS FORMULÁRIOS
const FORM_CADASTRO = {
  url: "https://docs.google.com/forms/u/0/d/15mVgmWlsuTg-LR_15KW5vQNR6bM2rq7ZaNVR2YsNpV0/formResponse",
  entryUser: "entry.1806499634",
  entryPass: "entry.239497675"
};

const FORM_PONTOS = {
  url: "https://docs.google.com/forms/u/0/d/1COFAA6SuB0x-Udtg95bAy4juQ2tYF0dla-5YavcGukE/formResponse",
  entryUser: "entry.220658126",
  entryRodada: "entry.456812872"
};

// ID da Planilha de Respostas para leitura
const SPREADSHEET_ID = "1pVrfO1IMzsEycgofFQvSac4wRPSsUPPyUYdppyW_tuA";

// CONFIGURAÇÃO DO PIX DE DOAÇÃO/APOIO
const CHAVE_PIX_RECEPTOR = "matheuzzu@hotmail.com";
const NOME_RECEPTOR = "MATHEUS ARRUDA MAIA";
const CIDADE_RECEPTOR = "FORTALEZA";

let currentUser = localStorage.getItem("gameUser") || null;
let currentRound = null; // Começa como null para ser detectado via data
let targetMeta = 21; 
let pointsCount = 0;
let adTimerInterval;

// Armazenamento global dos dados para cálculo de ranking e datas
let todosOsCliques = [];
let configuracoesRodadas = {};
let rankingGeralCalculado = [];

// TEMPO DE INATIVIDADE (10 Minutos)
const TEMPO_INATIVIDADE_MS = 10 * 60 * 1000;
let inatividadeTimer;

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  checkSession();
  updateCooldown();
  setInterval(updateCooldown, 1000);
  iniciarMonitorInatividade();
});

// --- HELPER DE CONVERSÃO DE DATAS DA PLANILHA ---
function parseSheetDate(dateStr) {
  if (!dateStr || dateStr === "N/A") return null;
  
  let str = String(dateStr).trim();
  
  // Trata formato gviz Date(YYYY,M,D,...)
  if (str.startsWith("Date(")) {
    const parts = str.match(/\d+/g);
    if (parts && parts.length >= 3) {
      return new Date(parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2]));
    }
  }

  // Trata formato DD/MM/YYYY
  const partsDDMM = str.split('/');
  if (partsDDMM.length === 3) {
    const day = parseInt(partsDDMM[0], 10);
    const month = parseInt(partsDDMM[1], 10) - 1;
    const year = parseInt(partsDDMM[2], 10);
    return new Date(year, month, day);
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

// --- SISTEMA DE LOGOUT E INATIVIDADE ---
function iniciarMonitorInatividade() {
  const eventos = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
  eventos.forEach(evt => {
    document.addEventListener(evt, resetarTimerInatividade, { passive: true });
  });
  resetarTimerInatividade();
}

function resetarTimerInatividade() {
  clearTimeout(inatividadeTimer);
  if (currentUser) {
    inatividadeTimer = setTimeout(() => {
      alert("A sua sessão expirou devido a 10 minutos de inatividade.");
      fazerLogout();
    }, TEMPO_INATIVIDADE_MS);
  }
}

function fazerLogout() {
  localStorage.removeItem("gameUser");
  currentUser = null;
  clearTimeout(inatividadeTimer);

  document.getElementById("authSection").classList.remove("hidden");
  document.getElementById("gameSection").classList.add("hidden");
  document.getElementById("rankingSection").classList.add("hidden");
  document.getElementById("userInfo").innerHTML = "";

  document.getElementById("loginUser").value = "";
  document.getElementById("loginPass").value = "";
  switchTab('login');
}

function switchTab(tab) {
  if (tab === 'login') {
    document.getElementById("loginForm").classList.remove("hidden");
    document.getElementById("registerForm").classList.add("hidden");
    document.getElementById("tabLoginBtn").classList.add("active");
    document.getElementById("tabRegisterBtn").classList.remove("active");
  } else {
    document.getElementById("loginForm").classList.add("hidden");
    document.getElementById("registerForm").classList.remove("hidden");
    document.getElementById("tabRegisterBtn").classList.add("active");
    document.getElementById("tabLoginBtn").classList.remove("active");
  }
}

// Checagem de Sessão com verificação de Banimento
async function checkSession() {
  if (currentUser) {
    try {
      const sheetUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?sheet=Respostas%20ao%20formul%C3%A1rio%201&tqx=out:json`;
      const res = await fetch(sheetUrl);
      const text = await res.text();
      const jsonString = text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1);
      const data = JSON.parse(jsonString);

      const rows = data.table.rows || [];
      let isBanned = false;

      for (let row of rows) {
        const dbUser = row.c && row.c[1] ? String(row.c[1].v).trim() : "";
        const dbStatus = row.c && row.c[3] && row.c[3].v !== null ? String(row.c[3].v).trim().toLowerCase() : "";

        if (dbUser.toLowerCase() === currentUser.toLowerCase() && dbStatus === "banido") {
          isBanned = true;
          break;
        }
      }

      if (isBanned) {
        alert("A sua conta foi banida e você foi desconectado.");
        fazerLogout();
        return;
      }
    } catch (err) {
      console.warn("Não foi possível verificar status de banimento na inicialização:", err);
    }

    document.getElementById("authSection").classList.add("hidden");
    document.getElementById("gameSection").classList.remove("hidden");
    document.getElementById("rankingSection").classList.remove("hidden");
    
    document.getElementById("userInfo").innerHTML = `
      <span>Olá, <strong>${currentUser}</strong></span>
      <div class="user-header-actions">
        <button class="btn-status" onclick="abrirModalStatus()">
          <i class="fa-solid fa-chart-pie"></i> Ver Status
        </button>
        <button class="btn-logout" onclick="fazerLogout()" title="Sair da Conta">
          <i class="fa-solid fa-right-from-bracket"></i> Sair
        </button>
      </div>
    `;
    
    carregarPontuacaoELeaderboard();
  }
}

// LOGIN COM VALIDAÇÃO REAL E CHECAGEM DE BANIMENTO (COLUNA D)
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const userEntered = document.getElementById("loginUser").value.trim();
  const passEntered = document.getElementById("loginPass").value.trim();
  const submitBtn = e.target.querySelector("button[type='submit']");

  if (!userEntered || !passEntered) {
    alert("Por favor, preencha o utilizador e a palavra-passe.");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerText = "A verificar...";

  try {
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?sheet=Respostas%20ao%20formul%C3%A1rio%201&tqx=out:json`;
    const res = await fetch(sheetUrl);
    const text = await res.text();
    const jsonString = text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const data = JSON.parse(jsonString);

    const rows = data.table.rows || [];
    let authenticated = false;
    let isBanned = false;

    for (let row of rows) {
      const dbUser = row.c && row.c[1] ? String(row.c[1].v).trim() : "";
      const dbPass = row.c && row.c[2] ? String(row.c[2].v).trim() : "";
      const dbStatus = row.c && row.c[3] && row.c[3].v !== null ? String(row.c[3].v).trim().toLowerCase() : "";

      if (dbUser.toLowerCase() === userEntered.toLowerCase() && dbPass === passEntered) {
        if (dbStatus === "banido") {
          isBanned = true;
        } else {
          authenticated = true;
        }
        break;
      }
    }

    if (isBanned) {
      alert("A sua conta está banida e não pode acessar o sistema!");
    } else if (authenticated) {
      localStorage.setItem("gameUser", userEntered);
      currentUser = userEntered;
      checkSession();
    } else {
      alert("Utilizador ou palavra-passe incorretos!");
    }

  } catch (err) {
    console.error("Erro na autenticação:", err);
    alert("Erro ao conectar à base de dados.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = "Entrar";
  }
});

// Cadastro de Usuário via Google Forms
document.getElementById("registerForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const user = document.getElementById("regUser").value.trim();
  const pass = document.getElementById("regPass").value.trim();

  const form = document.createElement("form");
  form.action = FORM_CADASTRO.url;
  form.method = "POST";
  form.target = "hidden_iframe_reg";

  form.appendChild(createHiddenInput(FORM_CADASTRO.entryUser, user));
  form.appendChild(createHiddenInput(FORM_CADASTRO.entryPass, pass));

  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);

  localStorage.setItem("gameUser", user);
  currentUser = user;
  checkSession();
  alert("Perfil criado com sucesso!");
});

// CARREGAR CONFIGURAÇÕES DA PLANILHA (ABA configuracoes)
async function carregarConfiguracoes() {
  try {
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?sheet=configuracoes&tqx=out:json`;
    const res = await fetch(gvizUrl);
    const text = await res.text();
    const jsonString = text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const data = JSON.parse(jsonString);

    const rows = data.table.rows || [];
    configuracoesRodadas = {};

    rows.forEach(row => {
      if (row.c && row.c[0] && row.c[0].v !== null) {
        const rodadaNum = parseInt(row.c[0].v);
        const dataInicioTexto = row.c[1] ? (row.c[1].f || String(row.c[1].v)) : "N/A";
        const dataFimTexto = row.c[2] ? (row.c[2].f || String(row.c[2].v)) : "N/A";
        
        let metaCliques = null;
        if (row.c && row.c[3] && row.c[3].v !== null) {
          const valLimpo = String(row.c[3].v).replace(/\D/g, "");
          metaCliques = parseInt(valLimpo, 10);
        }

        if (!isNaN(rodadaNum)) {
          configuracoesRodadas[rodadaNum] = {
            inicio: dataInicioTexto,
            fim: dataFimTexto,
            inicioDt: parseSheetDate(dataInicioTexto),
            fimDt: parseSheetDate(dataFimTexto),
            meta: metaCliques
          };
        }
      }
    });

    // Determina qual é a rodada ativa com base na data de HOJE
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    currentRound = null; // Reset para verificar

    for (let rNum in configuracoesRodadas) {
      const conf = configuracoesRodadas[rNum];
      if (conf.inicioDt && conf.fimDt) {
        const dtInicio = new Date(conf.inicioDt);
        dtInicio.setHours(0, 0, 0, 0);

        const dtFim = new Date(conf.fimDt);
        dtFim.setHours(23, 59, 59, 999);

        if (hoje >= dtInicio && hoje <= dtFim) {
          currentRound = parseInt(rNum);
          break;
        }
      }
    }

    // Se encontrou uma rodada ativa para a data atual
    if (currentRound && configuracoesRodadas[currentRound] && configuracoesRodadas[currentRound].meta) {
      targetMeta = configuracoesRodadas[currentRound].meta;
    } else {
      targetMeta = 0;
    }

    updateProgressUI();
    updateCooldown();

  } catch (err) {
    console.warn("Não foi possível carregar a aba configuracoes:", err);
  }
}

// Leitura de Dados da Planilha (Pontos e Ranking da Rodada Vigente)
async function carregarPontuacaoELeaderboard() {
  const rankingList = document.getElementById("rankingList");
  rankingList.innerHTML = `<p class="loading-text"><i class="fa-solid fa-spinner fa-spin"></i> Atualizando pontuações...</p>`;

  await carregarConfiguracoes();

  const gvizUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?sheet=Respostas%20ao%20formul%C3%A1rio%202&tqx=out:json`;

  try {
    const res = await fetch(gvizUrl);
    const text = await res.text();
    const jsonString = text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const data = JSON.parse(jsonString);

    const rows = data.table.rows || [];
    let totalCliquesRodadaAtual = 0;
    const contagemPorUsuarioGeral = {};
    const contagemPorUsuarioRodada = {};
    todosOsCliques = [];

    rows.forEach(row => {
      const userCell = row.c && row.c[1] ? row.c[1].v : null;
      const rodadaCell = row.c && row.c[2] ? row.c[2].v : 1;

      if (userCell) {
        const username = String(userCell).trim();
        const rodadaNum = parseInt(rodadaCell) || 1;

        contagemPorUsuarioGeral[username] = (contagemPorUsuarioGeral[username] || 0) + 1;

        todosOsCliques.push({
          user: username,
          rodada: rodadaNum
        });

        if (currentRound && rodadaNum === currentRound) {
          totalCliquesRodadaAtual++;
          contagemPorUsuarioRodada[username] = (contagemPorUsuarioRodada[username] || 0) + 1;
        }
      }
    });

    pointsCount = totalCliquesRodadaAtual;
    updateProgressUI();
    updateCooldown();

    rankingGeralCalculado = Object.keys(contagemPorUsuarioGeral).map(user => ({
      user: user,
      pontos: contagemPorUsuarioGeral[user]
    }));
    rankingGeralCalculado.sort((a, b) => b.pontos - a.pontos);

    const rankingRodadaCalculado = Object.keys(contagemPorUsuarioRodada).map(user => ({
      user: user,
      pontos: contagemPorUsuarioRodada[user]
    }));

    rankingRodadaCalculado.sort((a, b) => b.pontos - a.pontos);

    const top10Rodada = rankingRodadaCalculado.slice(0, 10);

    if (!currentRound) {
      rankingList.innerHTML = `<p class="empty-text">Aguardando início de uma nova rodada.</p>`;
    } else if (top10Rodada.length === 0) {
      rankingList.innerHTML = `<p class="empty-text">Nenhum clique registado nesta rodada até ao momento.</p>`;
    } else {
      rankingList.innerHTML = top10Rodada.map((item, index) => {
        let badge = `#${index + 1}`;
        if (index === 0) badge = '🥇';
        else if (index === 1) badge = '🥈';
        else if (index === 2) badge = '🥉';

        const isMe = item.user.toLowerCase() === (currentUser || "").toLowerCase();

        return `
          <div class="ranking-item ${isMe ? 'my-rank' : ''}">
            <span class="rank-pos">${badge}</span>
            <span class="rank-user">${item.user} ${isMe ? '(Você)' : ''}</span>
            <span class="rank-points">${item.pontos} ${item.pontos === 1 ? 'clique' : 'cliques'}</span>
          </div>
        `;
      }).join('');
    }

  } catch (error) {
    console.error("Erro ao carregar dados:", error);
    rankingList.innerHTML = `<p class="empty-text">Não foi possível carregar o ranking no momento.</p>`;
  }
}

// --- POPUP / MODAL DE STATUS DO UTILIZADOR ---
function abrirModalStatus() {
  document.getElementById("statusModal").classList.remove("hidden");
  
  const meusCliquesGeral = todosOsCliques.filter(c => c.user.toLowerCase() === (currentUser || "").toLowerCase());
  document.getElementById("userTotalPoints").innerText = meusCliquesGeral.length;

  const posGeral = rankingGeralCalculado.findIndex(item => item.user.toLowerCase() === (currentUser || "").toLowerCase());
  document.getElementById("userGeneralRank").innerText = posGeral !== -1 ? `#${posGeral + 1}` : "Sem Posição";

  const select = document.getElementById("selectRodada");
  
  // Pega todas as rodadas cadastradas na aba de configurações + as existentes nos cliques
  let rodadasExistentes = Object.keys(configuracoesRodadas).map(Number);
  
  todosOsCliques.forEach(item => {
    if (!rodadasExistentes.includes(item.rodada)) {
      rodadasExistentes.push(item.rodada);
    }
  });

  rodadasExistentes.sort((a, b) => a - b);

  if (rodadasExistentes.length === 0) {
    select.innerHTML = `<option value="">Nenhuma rodada disponível</option>`;
  } else {
    select.innerHTML = rodadasExistentes.map(r => `<option value="${r}">Rodada ${r}</option>`).join('');
    // Seleciona a rodada atual ou a primeira disponível
    select.value = currentRound ? currentRound : rodadasExistentes[0];
  }

  carregarEstatisticasRodada();
}

function fecharModalStatus() {
  document.getElementById("statusModal").classList.add("hidden");
}

function alternarAbaStatus(aba) {
  if (aba === 'geral') {
    document.getElementById("statusGeralView").classList.remove("hidden");
    document.getElementById("statusRodadaView").classList.add("hidden");
    document.getElementById("tabGeralBtn").classList.add("active");
    document.getElementById("tabRodadaBtn").classList.remove("active");
  } else {
    document.getElementById("statusGeralView").classList.add("hidden");
    document.getElementById("statusRodadaView").classList.remove("hidden");
    document.getElementById("tabGeralBtn").classList.remove("active");
    document.getElementById("tabRodadaBtn").classList.add("active");
  }
}

function carregarEstatisticasRodada() {
  const selectVal = document.getElementById("selectRodada").value;
  if (!selectVal) {
    document.getElementById("userRoundPoints").innerText = 0;
    document.getElementById("userRoundRank").innerText = "Sem Posição";
    document.getElementById("userRoundDate").innerText = "Datas não configuradas";
    return;
  }

  const rodadaSel = parseInt(selectVal);
  
  const cliquesDaRodada = todosOsCliques.filter(item => item.rodada === rodadaSel);
  const meusCliquesNaRodada = cliquesDaRodada.filter(item => item.user.toLowerCase() === (currentUser || "").toLowerCase());

  document.getElementById("userRoundPoints").innerText = meusCliquesNaRodada.length;

  const contagemRodada = {};
  cliquesDaRodada.forEach(item => {
    contagemRodada[item.user] = (contagemRodada[item.user] || 0) + 1;
  });

  const rankingRodada = Object.keys(contagemRodada).map(u => ({ user: u, pontos: contagemRodada[u] }));
  rankingRodada.sort((a, b) => b.pontos - a.pontos);

  const posRodada = rankingRodada.findIndex(item => item.user.toLowerCase() === (currentUser || "").toLowerCase());
  document.getElementById("userRoundRank").innerText = posRodada !== -1 ? `#${posRodada + 1}` : "Sem Posição";

  // Exibe o período configurado na planilha
  if (configuracoesRodadas[rodadaSel]) {
    const inicio = configuracoesRodadas[rodadaSel].inicio;
    const fim = configuracoesRodadas[rodadaSel].fim;
    document.getElementById("userRoundDate").innerText = `${inicio} até ${fim}`;
  } else {
    document.getElementById("userRoundDate").innerText = "Datas não configuradas";
  }
}

// Recompensa / Simulação do Ad
function iniciarRecompensa() {
  if (!currentRound) {
    alert("Aguardando nova rodada... Nenhuma rodada ativa no momento.");
    return;
  }

  if (pointsCount >= targetMeta) {
    alert("A meta desta rodada já foi alcançada!");
    return;
  }

  const lastClick = localStorage.getItem("lastClickTime");
  const now = Date.now();

  if (lastClick && (now - lastClick < 5 * 60 * 1000)) {
    alert("Aguarde o tempo limite de 5 minutos entre cliques.");
    return;
  }

  const modal = document.getElementById("adModal");
  const timerElem = document.getElementById("adTimer");
  const claimBtn = document.getElementById("claimBtn");

  modal.classList.remove("hidden");
  claimBtn.classList.add("hidden");

  let timeLeft = 15;
  timerElem.innerText = timeLeft;

  adTimerInterval = setInterval(() => {
    timeLeft--;
    timerElem.innerText = timeLeft;

    if (timeLeft <= 0) {
      clearInterval(adTimerInterval);
      claimBtn.classList.remove("hidden");
    }
  }, 1000);
}

// Confirmar Ponto e enviar ao Google Forms
function confirmarPontuacao() {
  if (!currentRound) {
    document.getElementById("adModal").classList.add("hidden");
    alert("Aguardando nova rodada... O ponto não foi registrado.");
    return;
  }

  if (pointsCount >= targetMeta) {
    document.getElementById("adModal").classList.add("hidden");
    alert("A meta desta rodada já foi atingida! O ponto não foi registrado.");
    return;
  }

  document.getElementById("adModal").classList.add("hidden");

  const form = document.createElement("form");
  form.action = FORM_PONTOS.url;
  form.method = "POST";
  form.target = "hidden_iframe_clk";

  form.appendChild(createHiddenInput(FORM_PONTOS.entryUser, currentUser));
  form.appendChild(createHiddenInput(FORM_PONTOS.entryRodada, currentRound));

  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);

  localStorage.setItem("lastClickTime", Date.now());
  
  updateCooldown();
  alert("Ponto enviado com sucesso!");

  setTimeout(carregarPontuacaoELeaderboard, 2500);
}

function updateCooldown() {
  const btn = document.getElementById("clickBtn");
  const cooldownText = document.getElementById("cooldownText");

  if (!btn) return;

  // SE NÃO HOUVER RODADA ATIVA PELA DATA
  if (!currentRound) {
    btn.disabled = true;
    btn.innerText = "Sem Rodada Ativa";
    if (cooldownText) cooldownText.innerText = "Aguardando início de uma nova rodada...";
    return;
  }

  // SE A META FOI ALCANÇADA
  if (pointsCount >= targetMeta) {
    btn.disabled = true;
    btn.innerText = "Meta Alcançada!";
    if (cooldownText) cooldownText.innerText = "A meta coletiva desta rodada já foi batida!";
    return;
  }

  btn.innerText = "Pontuar (+1 Clique)";

  const lastClick = localStorage.getItem("lastClickTime");

  if (!lastClick) {
    btn.disabled = false;
    if (cooldownText) cooldownText.innerText = "";
    return;
  }

  const now = Date.now();
  const diff = now - parseInt(lastClick);
  const fiveMinutes = 5 * 60 * 1000;

  if (diff < fiveMinutes) {
    btn.disabled = true;
    const remainingSeconds = Math.ceil((fiveMinutes - diff) / 1000);
    const min = Math.floor(remainingSeconds / 60);
    const sec = remainingSeconds % 60;
    if (cooldownText) cooldownText.innerText = `Próximo clique em: ${min}m ${sec < 10 ? '0' : ''}${sec}s`;
  } else {
    btn.disabled = false;
    if (cooldownText) cooldownText.innerText = "";
  }
}

function updateProgressUI() {
  const roundElem = document.getElementById("roundNumber");
  
  if (roundElem) {
    if (currentRound) {
      roundElem.innerText = currentRound;
      // Garante que se o texto antes era "Aguardando...", ele volte ao padrão
      const parentLabel = roundElem.parentElement;
      if (parentLabel && parentLabel.innerText.includes("Aguardando")) {
        parentLabel.innerHTML = `Rodada Atual: <span id="roundNumber">${currentRound}</span>`;
      }
    } else {
      const parentLabel = roundElem.parentElement;
      if (parentLabel) {
        parentLabel.innerText = "Aguardando nova rodada...";
      }
    }
  }

  document.getElementById("currentPoints").innerText = pointsCount;
  document.getElementById("targetPoints").innerText = targetMeta;

  const percentage = targetMeta > 0 ? Math.min((pointsCount / targetMeta) * 100, 100) : 0;
  document.getElementById("progressFill").style.width = `${percentage}%`;
}

function createHiddenInput(name, value) {
  const input = document.createElement("input");
  input.type = "hidden";
  input.name = name;
  input.value = value;
  return input;
}

// --- LÓGICA DO PIX DE DOAÇÃO / APOIO ---
function mascaraMoeda(input) {
  let value = input.value.replace(/\D/g, "");
  if (!value || value === "00") {
    input.value = "R$ 0,00";
    return;
  }
  let numberValue = (parseInt(value, 10) / 100).toFixed(2);
  let formatted = numberValue.replace(".", ",").replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
  input.value = "R$ " + formatted;
}

function gerarPayloadPix(chave, nome, cidade, valor, txid = "***") {
  function formatField(id, value) {
    const len = value.length.toString().padStart(2, '0');
    return `${id}${len}${value}`;
  }

  const gui = formatField('00', 'br.gov.bcb.pix');
  const key = formatField('01', chave);
  const merchantAccount = formatField('26', `${gui}${key}`);
  
  const categoryCode = formatField('52', '0000');
  const currency = formatField('53', '986');
  const amountStr = parseFloat(valor).toFixed(2);
  const amount = formatField('54', amountStr);
  const country = formatField('58', 'BR');
  const name = formatField('59', nome.substring(0, 25));
  const city = formatField('60', cidade.substring(0, 15));
  const additionalData = formatField('62', formatField('05', txid));

  let payload = `000201${merchantAccount}${categoryCode}${currency}${amount}${country}${name}${city}${additionalData}6304`;
  
  function crc16(str) {
    let crc = 0xFFFF;
    for (let i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        if ((crc & 0x8000) !== 0) {
          crc = (crc << 1) ^ 0x1021;
        } else {
          crc = crc << 1;
        }
      }
    }
    return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
  }

  return payload + crc16(payload);
}

function gerarECopiarPixDoacao() {
  const inputElement = document.getElementById('inputValorDoacao');
  let rawDigits = inputElement.value.replace(/\D/g, "");
  
  if (!rawDigits) {
    alert('Por favor, informe um valor válido.');
    return;
  }

  const valor = parseFloat(rawDigits) / 100;

  if (isNaN(valor) || valor <= 0) {
    alert('Por favor, informe um valor válido.');
    return;
  }

  const pixPayload = gerarPayloadPix(CHAVE_PIX_RECEPTOR, NOME_RECEPTOR, CIDADE_RECEPTOR, valor);

  navigator.clipboard.writeText(pixPayload).then(() => {
    const msg = document.getElementById('msgSucessoPix');
    if (msg) {
      msg.style.display = 'block';
      setTimeout(() => {
        msg.style.display = 'none';
      }, 5000);
    }
  }).catch(err => {
    alert('Não foi possível copiar automaticamente.');
  });
}
