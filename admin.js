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

function textoExpiracao(item) {
  if (!item?.data_expiracao) return "Aguardando confirmacao";

  return item.expirado
    ? `${formatarData(item.data_expiracao)} (vencido)`
    : formatarData(item.data_expiracao);
}

function textoPrazoPagamento(pagamento) {
  if (pagamento.status === "cancelado") return "Cancelado";
  if (pagamento.status === "confirmado") return textoExpiracao(pagamento);
  if (!pagamento.pix_expira_em) return "15 min apos gerar";

  const expiraEm = new Date(pagamento.pix_expira_em);

  if (Number.isNaN(expiraEm.getTime())) return "15 min apos gerar";

  return expiraEm < new Date()
    ? `${formatarData(pagamento.pix_expira_em)} (vencido)`
    : formatarData(pagamento.pix_expira_em);
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
      <td colspan="8">Carregando...</td>
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
          <td colspan="8">Nenhum pagamento encontrado.</td>
        </tr>
      `;
      return;
    }

    lista.innerHTML = "";

    dados.forEach(pagamento => {
      const telefone = pagamento.telefone || "Nao informado";
      const telefoneLink = String(pagamento.telefone || "").replace(/\D/g, "");
      const statusClass = pagamento.status === "confirmado"
        ? "status-confirmado"
        : pagamento.status === "cancelado"
        ? "status-cancelado"
        : "status-pendente";
      const acoesPagamento = pagamento.status === "pendente"
        ? `
          <button onclick="confirmarPagamento(${pagamento.id})">Confirmar</button>
          <button class="cancelar-btn" onclick="cancelarPagamento(${pagamento.id})">Cancelar</button>
        `
        : `<span class="${statusClass}">${escaparHtml(pagamento.status)}</span>`;

      lista.innerHTML += `
        <tr>
          <td>${escaparHtml(pagamento.id)}</td>
          <td>${escaparHtml(pagamento.email || "-")}</td>
          <td>${escaparHtml(telefone)}</td>
          <td>${escaparHtml(pagamento.plano || "-")}</td>
          <td>R$ ${escaparHtml(pagamento.valor)}</td>
          <td class="${statusClass}">${escaparHtml(pagamento.status)}</td>
          <td>${escaparHtml(textoPrazoPagamento(pagamento))}</td>
          <td>
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
