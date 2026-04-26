const API = "https://sgiptv-backend.onrender.com";

async function loginAdmin() {
  const usuario = document.getElementById("adminUser").value;
  const senha = document.getElementById("adminPass").value;
  const msg = document.getElementById("loginMsg");

  if (!usuario || !senha) {
    msg.innerHTML = `<p class="erro">Preencha usuário e senha.</p>`;
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
      msg.innerHTML = `<p class="erro">${data.error || "Login inválido."}</p>`;
      return;
    }

    localStorage.setItem("admin_token", data.token);

    setTimeout(() => {
      window.location.href = "admin.html";
    }, 500);

  } catch (error) {
    console.error(error);
    msg.innerHTML = `<p class="erro">Erro ao conectar com o servidor.</p>`;
  }
}

function verificarAdminLogado() {
  const token = localStorage.getItem("admin_token");

  if (!token && window.location.pathname.includes("admin.html")) {
    window.location.href = "login.html";
  }

  return token;
}

async function carregarPagamentos() {
  const token = verificarAdminLogado();
  const lista = document.getElementById("listaPagamentos");
  const msg = document.getElementById("adminMensagem");

  if (!lista) return;

  lista.innerHTML = `
    <tr>
      <td colspan="7">Carregando...</td>
    </tr>
  `;

  try {
    const res = await fetch(`${API}/pagamentos`, {
      headers: {
        Authorization: token
      }
    });

    const dados = await res.json();

    if (!res.ok) {
      msg.innerHTML = `<p class="erro">${dados.error || "Erro ao buscar pagamentos."}</p>`;
      return;
    }

    if (dados.length === 0) {
      lista.innerHTML = `
        <tr>
          <td colspan="7">Nenhum pagamento encontrado.</td>
        </tr>
      `;
      return;
    }

    lista.innerHTML = "";

    dados.forEach(pagamento => {
      const telefone = pagamento.telefone || "Não informado";
      const statusClass = pagamento.status === "confirmado"
        ? "status-confirmado"
        : "status-pendente";

      lista.innerHTML += `
        <tr>
          <td>${pagamento.id}</td>
          <td>${pagamento.email || "-"}</td>
          <td>${telefone}</td>
          <td>${pagamento.plano || "-"}</td>
          <td>R$ ${pagamento.valor}</td>
          <td class="${statusClass}">${pagamento.status}</td>
          <td>
            ${
              pagamento.status === "confirmado"
              ? `<span class="status-confirmado">Confirmado</span>`
              : `<button onclick="confirmarPagamento(${pagamento.id})">Confirmar</button>`
            }

            <a
              class="whatsapp-btn"
              href="https://wa.me/55${telefone}?text=${encodeURIComponent(
                `Olá! Identificamos seu pagamento na SG IPTV.\n\nEmail: ${pagamento.email}\nPlano: ${pagamento.plano}\nValor: R$ ${pagamento.valor}\nStatus: ${pagamento.status}`
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

async function confirmarPagamento(id) {
  const token = verificarAdminLogado();

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

function sairAdmin() {
  localStorage.removeItem("admin_token");
  window.location.href = "login.html";
}

window.addEventListener("load", () => {
  if (window.location.pathname.includes("admin.html")) {
    verificarAdminLogado();
    carregarPagamentos();
  }
});