// CONFIGURAÇÕES DOS FORMULÁRIOS
const FORM_CADASTRO = {
  url: "https://docs.google.com/forms/u/0/d/15mVgmWlsuTg-LR_15KW5vQNR6bM2rq7ZaNVR2YsNpV0/formResponse",
  entryUser: "entry.1806499634",
  entryPass: "entry.239497675",
  entryPix: "entry.1173920273"
};

const FORM_PONTOS = {
  url: "https://docs.google.com/forms/u/0/d/1COFAA6SuB0x-Udtg95bAy4juQ2tYF0dla-5YavcGukE/formResponse",
  entryUser: "entry.220658126",
  entryRodada: "entry.456812872"
};

// ID da Planilha para leitura dos pontos acumulados
const SPREADSHEET_ID = "1pVrfO1IMzsEycgofFQvSac4wRPSsUPPyUYdppyW_tuA";

let currentUser = localStorage.getItem("gameUser") || null;
let currentRound = 1; // Pode ser dinâmico no futuro
let targetMeta = 1000;
let pointsCount = 0;
let adTimerInterval;

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  checkSession();
  updateCooldown();
  setInterval(updateCooldown, 1000);
});

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

function checkSession() {
  if (currentUser) {
    document.getElementById("authSection").classList.add("hidden");
    document.getElementById("gameSection").classList.remove("hidden");
    document.getElementById("userInfo").innerText = `Olá, ${currentUser}`;
  }
}

// Cadastro via Google Forms de fundo
document.getElementById("registerForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const user = document.getElementById("regUser").value;
  const pass = document.getElementById("regPass").value;
  const pix = document.getElementById("regPix").value;

  const form = document.createElement("form");
  form.action = FORM_CADASTRO.url;
  form.method = "POST";
  form.target = "hidden_iframe_reg";

  form.appendChild(createHiddenInput(FORM_CADASTRO.entryUser, user));
  form.appendChild(createHiddenInput(FORM_CADASTRO.entryPass, pass));
  form.appendChild(createHiddenInput(FORM_CADASTRO.entryPix, pix));

  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);

  localStorage.setItem("gameUser", user);
  currentUser = user;
  checkSession();
  alert("Perfil criado com sucesso!");
});

// Login Simples (Sessão Local)
document.getElementById("loginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const user = document.getElementById("loginUser").value;
  localStorage.setItem("gameUser", user);
  currentUser = user;
  checkSession();
});

// Recompensa / Simulação do Ad
function iniciarRecompensa() {
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

  // Regista o tempo do clique
  localStorage.setItem("lastClickTime", Date.now());
  
  // Atualização visual local
  pointsCount++;
  updateProgressUI();
  updateCooldown();
  alert("Ponto computado!");
}

function updateCooldown() {
  const lastClick = localStorage.getItem("lastClickTime");
  const btn = document.getElementById("clickBtn");
  const cooldownText = document.getElementById("cooldownText");

  if (!lastClick) {
    btn.disabled = false;
    cooldownText.innerText = "";
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
    cooldownText.innerText = `Próximo clique em: ${min}m ${sec < 10 ? '0' : ''}${sec}s`;
  } else {
    btn.disabled = false;
    cooldownText.innerText = "";
  }
}

function updateProgressUI() {
  document.getElementById("currentPoints").innerText = pointsCount;
  document.getElementById("targetPoints").innerText = targetMeta;
  document.getElementById("roundNumber").innerText = currentRound;

  const percentage = Math.min((pointsCount / targetMeta) * 100, 100);
  document.getElementById("progressFill").style.width = `${percentage}%`;
}

function createHiddenInput(name, value) {
  const input = document.createElement("input");
  input.type = "hidden";
  input.name = name;
  input.value = value;
  return input;
}

function copiarPix() {
  const pixInput = document.getElementById("pixKey");
  pixInput.select();
  navigator.clipboard.writeText(pixInput.value);
  alert("Chave PIX copiada!");
}
