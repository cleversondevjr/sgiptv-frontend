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
  if (!data) return "Aguardando confirmacao";

  try {
    return new Date(data).toLocaleString("pt-BR");
  } catch {
    return "Nao informado";
  }
}

function formatarDataFimDoDia(data) {
  if (!data) return "Aguardando confirmacao";

  try {
    return `${new Date(data).toLocaleDateString("pt-BR")}, 23:59:59`;
  } catch {
    return "Nao informado";
  }
}

function textoExpiracao(item) {
  if (!item?.data_expiracao) return "Aguardando confirmacao";

  return item.expirado
    ? `${formatarDataFimDoDia(item.data_expiracao)} (vencido)`
    : formatarDataFimDoDia(item.data_expiracao);
}

function textoPrazoPagamento(pagamento) {
  if (pagamento.status === "cancelado") return "Cancelado";
  if (!pagamento.pix_expira_em) return "15 min apos gerar";

  const expiraEm = new Date(pagamento.pix_expira_em);

  if (Number.isNaN(expiraEm.getTime())) return "15 min apos gerar";

  return expiraEm < new Date()
    ? `${formatarData(pagamento.pix_expira_em)} (vencido)`
    : formatarData(pagamento.pix_expira_em);
}

function quantidadeTelas(plano) {
  const texto = String(plano || "").toLowerCase();

  if (texto.includes("2 tela")) return "2";
  if (texto.includes("1 tela")) return "1";

  return "-";
}

function statusClassPagamento(status) {
  if (status === "confirmado") return "status-confirmado";
  if (status === "cancelado") return "status-cancelado";
  return "status-pendente";
}

function alternarDetalhesPagamento(id) {
  const detalhes = document.getElementById(`detalhes-pagamento-${id}`);
  const botao = document.getElementById(`toggle-pagamento-${id}`);

  if (!detalhes || !botao) return;

  const fechado = detalhes.classList.toggle("admin-hidden");
  botao.textContent = fechado ? "+" : "-";
}

function mostrarSecaoAdmin(secao) {
  const pagamentos = document.getElementById("pagamentos");
  const testes = document.getElementById("testes");
  const btnPagamentos = document.getElementById("btnPagamentos");
  const btnTestes = document.getElementById("btnTestes");

  if (!pagamentos || !testes || !btnPagamentos || !btnTestes) return;

  const mostrarPagamentos = secao === "pagamentos";

  pagamentos.classList.toggle("admin-hidden", !mostrarPagamentos);
  testes.classList.toggle("admin-hidden", mostrarPagamentos);
  btnPagamentos.classList.toggle("nav-active", mostrarPagamentos);
  btnTestes.classList.toggle("nav-active", !mostrarPagamentos);
}

async function loginAdmin() {
  const usuario = document.getElementById("adminUser").value.trim();
  const senha = document.getElementById("adminPass").value.trim();
  const msg = document.getElementById("loginMsg");

  if (!usuario || !senha) {
    msg.innerHTML = `<p class="erro">Preencha usuario e senha.</p>`;
    return;
  }

  msg.innerHTML = `<p class="sucesso">Entrando...</p>`;

  try {
    const res = await fetch(`${API}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ usuario, senha })
    });

    const data = await res.json();

    if (!res.ok) {
      msg.innerHTML = `<p class="erro">${escaparHtml(data.error || "Usuario ou senha invalidos.")}</p>`;
      return;
    }

    localStorage.setItem("admin_token", data.token);
    window.location.href = "admin.html";

  } catch (error) {
    console.error(error);
    msg.innerHTML = `<p class="erro">Erro ao conectar com o servidor.</p>`;
  }
}

function verificarAdminLogado() {
  const token = localStorage.getItem("admin_token");

  if (!token && window.location.pathname.includes("admin.html")) {
    window.location.href = "login.html";
    return null;
  }

  return token;
}

async function carregarPagamentos() {
  const token = verificarAdminLogado();
  const lista = document.getElementById("listaPagamentos");
  const msg = document.getElementById("adminMensagem");

  if (!lista || !token) return;

  lista.innerHTML = `
    <tr>
      <td colspan="5">Carregando...</td>
    </tr>
  `;

  try {
    const res = await fetch(`${API}/pagamentos`, {
      headers: {
        Authorization: token
      }
    });

    const dados = await res.json();

    if (res.status === 401) {
      localStorage.removeItem("admin_token");
      window.location.href = "login.html";
      return;
    }

    if (!res.ok) {
      msg.innerHTML = `<p class="erro">${escaparHtml(dados.error || "Erro ao buscar pagamentos.")}</p>`;
      return;
    }

    if (dados.length === 0) {
      lista.innerHTML = `
        <tr>
          <td colspan="5">Nenhum pagamento encontrado.</td>
        </tr>
      `;
      return;
    }

    lista.innerHTML = "";

    dados.forEach(pagamento => {
      const telefone = pagamento.telefone || "Nao informado";
      const telefoneLink = String(pagamento.telefone || "").replace(/\D/g, "");
      const statusClass = statusClassPagamento(pagamento.status);
      const acoesPagamento = pagamento.status === "pendente"
        ? `
          <button onclick="confirmarPagamento(${pagamento.id})">Confirmar</button>
          <button class="cancelar-btn" onclick="cancelarPagamento(${pagamento.id})">Cancelar</button>
        `
        : `<span class="${statusClass}">${escaparHtml(pagamento.status)}</span>`;

      lista.innerHTML += `
        <tr>
          <td>${escaparHtml(pagamento.email || "-")}</td>
          <td>${escaparHtml(telefone)}</td>
          <td>${escaparHtml(pagamento.email || "-")}</td>
          <td>${escaparHtml(telefone)}</td>
          <td>
            <button id="toggle-pagamento-${escaparHtml(pagamento.id)}" class="detalhe-btn" onclick="alternarDetalhesPagamento(${pagamento.id})">+</button>
          </td>
        </tr>
        <tr id="detalhes-pagamento-${escaparHtml(pagamento.id)}" class="detalhes-row admin-hidden">
          <td colspan="5">
            <div class="detalhes-grid">
              <div>
                <strong>Status</strong>
                <p class="${statusClass}">${escaparHtml(pagamento.status)}</p>
              </div>
              <div>
                <strong>Tipo de plano</strong>
                <p>${escaparHtml(pagamento.plano || "-")}</p>
              </div>
              <div>
                <strong>Valor</strong>
                <p>R$ ${escaparHtml(pagamento.valor)}</p>
              </div>
              <div>
                <strong>Quantidade de telas</strong>
                <p>${escaparHtml(quantidadeTelas(pagamento.plano))}</p>
              </div>
              <div>
                <strong>Data de criacao</strong>
                <p>${escaparHtml(formatarData(pagamento.criado_em))}</p>
              </div>
              <div>
                <strong>Data de expiracao</strong>
                <p>${escaparHtml(textoExpiracao(pagamento))}</p>
              </div>
              <div>
                <strong>Prazo do Pix</strong>
                <p>${escaparHtml(textoPrazoPagamento(pagamento))}</p>
              </div>
              <div>
                <strong>ID pagamento</strong>
                <p>${escaparHtml(pagamento.payment_id || pagamento.id || "-")}</p>
              </div>
              <div class="detalhes-acoes">
                <strong>Acoes</strong>
                <div>
                  ${acoesPagamento}
                  <a
                    class="whatsapp-btn"
                    href="https://wa.me/55${telefoneLink}?text=${encodeURIComponent(
                      `Ola! Identificamos seu pagamento na SG IPTV.\n\nEmail: ${pagamento.email}\nPlano: ${pagamento.plano}\nValor: R$ ${pagamento.valor}\nStatus: ${pagamento.status}`
                    )}"
                    target="_blank"
                  >
                    WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </td>
        </tr>
      `;
    });

  } catch (error) {
    console.error(error);
    msg.innerHTML = `<p class="erro">Erro ao carregar pagamentos.</p>`;
  }
}

async function carregarTestes() {
  const token = verificarAdminLogado();
  const lista = document.getElementById("listaTestes");

  if (!token) return;
  if (!lista) return;

  lista.innerHTML = `<tr><td colspan="7">Carregando...</td></tr>`;

  try {
    const res = await fetch(`${API}/testes-iptv`, {
      headers: {
        Authorization: token
      }
    });

    const dados = await res.json();

    if (res.status === 401) {
      localStorage.removeItem("admin_token");
      window.location.href = "login.html";
      return;
    }

    if (!res.ok) {
      lista.innerHTML = `<tr><td colspan="7">Erro ao carregar testes.</td></tr>`;
      return;
    }

    if (dados.length === 0) {
      lista.innerHTML = `<tr><td colspan="7">Nenhum teste encontrado.</td></tr>`;
      return;
    }

    lista.innerHTML = "";

    dados.forEach(t => {
      lista.innerHTML += `
        <tr>
          <td>${escaparHtml(t.id)}</td>
          <td>${escaparHtml(t.email || "-")}</td>
          <td>${escaparHtml(t.telefone || "-")}</td>
          <td>${escaparHtml(t.login || "-")}</td>
          <td>${escaparHtml(t.senha || "-")}</td>
          <td>${escaparHtml(formatarData(t.criado_em))}</td>
          <td>${escaparHtml(textoExpiracao(t))}</td>
        </tr>
      `;
    });

  } catch (error) {
    console.error(error);
    lista.innerHTML = `<tr><td colspan="7">Erro ao carregar testes.</td></tr>`;
  }
}

async function confirmarPagamento(id) {
  const token = verificarAdminLogado();

  if (!token) return;

  if (!confirm("Confirmar este pagamento?")) {
    return;
  }

  try {
    const res = await fetch(`${API}/pagamentos/${id}/confirmar`, {
      method: "PUT",
      headers: {
        Authorization: token
      }
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Erro ao confirmar pagamento.");
      return;
    }

    alert("Pagamento confirmado com sucesso!");
    carregarPagamentos();

  } catch (error) {
    console.error(error);
    alert("Erro ao confirmar pagamento.");
  }
}

async function cancelarPagamento(id) {
  const token = verificarAdminLogado();

  if (!token) return;

  if (!confirm("Cancelar este Pix pendente?")) {
    return;
  }

  try {
    const res = await fetch(`${API}/pagamentos/${id}/cancelar`, {
      method: "PUT",
      headers: {
        Authorization: token
      }
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Erro ao cancelar pagamento.");
      return;
    }

    alert("Pagamento cancelado com sucesso!");
    carregarPagamentos();

  } catch (error) {
    console.error(error);
    alert("Erro ao cancelar pagamento.");
  }
}

function sairAdmin() {
  localStorage.removeItem("admin_token");
  window.location.href = "login.html";
}

window.addEventListener("load", () => {
  if (window.location.pathname.includes("admin.html")) {
    verificarAdminLogado();
    mostrarSecaoAdmin("pagamentos");
    carregarPagamentos();
    carregarTestes();
  }
});
