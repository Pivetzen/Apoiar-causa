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

// CONFIGURAÇÃO DO PIX DE DOAÇÃO/APOIO
const CHAVE_PIX_RECEPTOR = "matheuzzu@hotmail.com";
const NOME_RECEPTOR = "MATHEUS ARRUDA MAIA";
const CIDADE_RECEPTOR = "FORTALEZA";

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
    alert('Não foi possível copiar automaticamente. Tente novamente.');
  });
}
