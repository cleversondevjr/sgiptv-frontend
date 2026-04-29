const API = "https://sgiptv-backend.onrender.com";

function escaparHtml(valor) {
  return String(valor || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatarData(data) {
  if (!data) return "-";
  try {
    return new Date(data).toLocaleString("pt-BR");
  } catch {
    return "-";
  }
}

function formatarDinheiro(valor) {
  const num = Number(valor || 0);
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getTokenRevendedor() {
  return localStorage.getItem("rev_token");
}

function setTokenRevendedor(token) {
  if (token) localStorage.setItem("rev_token", token);
}

function limparTokenRevendedor() {
  localStorage.removeItem("rev_token");
}

function abrirCadastroRevendedor() {
  document.getElementById("revCadastroMsg").textContent = "";
  document.getElementById("revCadastroModal").classList.remove("admin-hidden");
}

function fecharCadastroRevendedor() {
  document.getElementById("revCadastroModal").classList.add("admin-hidden");
}

async function cadastrarRevendedor() {
  const msg = document.getElementById("revCadastroMsg");
  const email = String(document.getElementById("cadRevEmail")?.value || "").trim().toLowerCase();
  const senha = String(document.getElementById("cadRevSenha")?.value || "").trim();
  const nome = String(document.getElementById("cadRevNome")?.value || "").trim();
  const cpf = String(document.getElementById("cadRevCpf")?.value || "").replace(/\D/g, "");
  const banco = String(document.getElementById("cadRevBanco")?.value || "").trim();

  msg.textContent = "Cadastrando...";

  try {
    const res = await fetch(`${API}/revendedor/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha, nome_completo: nome, pix_cpf: cpf, banco_nome: banco })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao cadastrar.");

    msg.innerHTML = `
      <p style="color:#22c55e;"><strong>Cadastro realizado com sucesso!</strong></p>
      <p>Seu codigo: <strong>${escaparHtml(data.codigo)}</strong></p>
      <p style="color:#facc15;">Aguarde ate 24 horas para aprovacao do master.</p>
    `;
  } catch (e) {
    msg.innerHTML = `<p style="color:#ef4444;">${escaparHtml(e.message)}</p>`;
  }
}

async function loginRevendedor(email, senha) {
  const res = await fetch(`${API}/revendedor/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, senha })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erro ao entrar.");
  return data;
}

async function carregarRevendedor() {
  const token = getTokenRevendedor();
  if (!token) return;

  const loginBox = document.getElementById("revLoginBox");
  const painel = document.getElementById("revPainel");

  try {
    const res = await fetch(`${API}/revendedor/me`, { headers: { Authorization: token } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Sessao expirada.");

    loginBox.style.display = "none";
    painel.style.display = "block";

    const resumo = document.getElementById("revResumo");
    resumo.innerHTML = `
      <div class="grid-2">
        <div class="info-card">
          <h3>Seu codigo</h3>
          <p><strong>${escaparHtml(data.revendedor.codigo)}</strong></p>
        </div>
        <div class="info-card">
          <h3>Pendente</h3>
          <p><strong>${formatarDinheiro(data.resumo.total_pendente)}</strong></p>
        </div>
      </div>
      <div class="grid-2" style="margin-top:12px;">
        <div class="info-card">
          <h3>Clientes ativos no mes</h3>
          <p><strong>${escaparHtml(data.resumo.clientes_ativos_mes)}</strong></p>
        </div>
        <div class="info-card">
          <h3>Bonus do mes</h3>
          <p><strong>${formatarDinheiro(data.resumo.bonus_mes)}</strong></p>
        </div>
      </div>
    `;

    const lista = document.getElementById("revListaComissoes");
    lista.innerHTML = `<tr><td colspan="4">Carregando...</td></tr>`;

    const res2 = await fetch(`${API}/revendedor/comissoes`, { headers: { Authorization: token } });
    const data2 = await res2.json();
    if (!res2.ok) throw new Error(data2.error || "Erro ao carregar comissoes.");

    const itens = Array.isArray(data2.comissoes) ? data2.comissoes : [];
    if (itens.length === 0) {
      lista.innerHTML = `<tr><td colspan="4">Nenhuma comissao ainda.</td></tr>`;
      return;
    }

    lista.innerHTML = itens.map((c) => `
      <tr>
        <td>${escaparHtml(formatarData(c.criado_em))}</td>
        <td>${escaparHtml(c.tipo)}</td>
        <td><strong>${formatarDinheiro(c.valor)}</strong></td>
        <td>${escaparHtml(c.status)}</td>
      </tr>
    `).join("");
  } catch (e) {
    limparTokenRevendedor();
  }
}

function sairRevendedor() {
  limparTokenRevendedor();
  window.location.reload();
}

document.getElementById("revLoginForm")?.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const msg = document.getElementById("revLoginMensagem");
  const email = String(document.getElementById("revEmail")?.value || "").trim().toLowerCase();
  const senha = String(document.getElementById("revSenha")?.value || "").trim();

  msg.textContent = "Entrando...";

  try {
    const data = await loginRevendedor(email, senha);
    setTokenRevendedor(data.token);
    await carregarRevendedor();
  } catch (e) {
    msg.innerHTML = `<p style="color:#ef4444;">${escaparHtml(e.message)}</p>`;
  }
});

carregarRevendedor();
