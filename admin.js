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

function tempoRestanteMs(data) {
  if (!data) return null;
  const alvo = new Date(data).getTime();
  if (Number.isNaN(alvo)) return null;
  return alvo - Date.now();
}

function tempoRestanteTexto(data) {
  const diff = tempoRestanteMs(data);
  if (diff === null) return "Nao informado";
  if (diff <= 0) return "Expirado";

  const totalHoras = Math.floor(diff / (60 * 60 * 1000));
  const totalMin = Math.floor((diff % (60 * 60 * 1000)) / 60000);
  const dias = Math.floor(totalHoras / 24);
  const horas = totalHoras % 24;

  if (dias > 0) return `${dias}d ${horas}h`;
  return `${totalHoras}h ${totalMin}min`;
}

async function avisarClientePagamento(id, telefone, email, plano) {
  const token = verificarAdminLogado();
  if (!token) return;

  try {
    const res = await fetch(`${API}/pagamentos/${id}/avisar`, {
      method: "POST",
      headers: {
        Authorization: token
      }
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Erro ao enviar aviso.");
      return;
    }

    const tel = String(telefone || "").replace(/\D/g, "");
    const msg = encodeURIComponent(
      `Ola! Seu plano da SG IPTV esta perto de expirar.\n\nEmail: ${email}\nPlano: ${plano}\n\nSe quiser renovar, acesse: https://sgiptv.com.br/cliente.html`
    );

    if (tel) {
      window.open(`https://wa.me/55${tel}?text=${msg}`, "_blank");
    }

    alert("Aviso registrado e email enviado para o suporte.");
    carregarPagamentos();
  } catch (error) {
    console.error(error);
    alert("Erro ao enviar aviso.");
  }
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
  const clientes = document.getElementById("clientes");
  const btnPagamentos = document.getElementById("btnPagamentos");
  const btnTestes = document.getElementById("btnTestes");
  const btnClientes = document.getElementById("btnClientes");

  if (!pagamentos || !testes || !clientes || !btnPagamentos || !btnTestes || !btnClientes) return;

  const mostrarPagamentos = secao === "pagamentos";
  const mostrarTestes = secao === "testes";
  const mostrarClientes = secao === "clientes";

  pagamentos.classList.toggle("admin-hidden", !mostrarPagamentos);
  testes.classList.toggle("admin-hidden", !mostrarTestes);
  clientes.classList.toggle("admin-hidden", !mostrarClientes);
  btnPagamentos.classList.toggle("nav-active", mostrarPagamentos);
  btnTestes.classList.toggle("nav-active", mostrarTestes);
  btnClientes.classList.toggle("nav-active", mostrarClientes);

  if (mostrarClientes) {
    carregarClientes();
  }
}

function criarTabsMeses() {
  const tabs = document.getElementById("monthTabs");
  if (!tabs) return;

  const nomes = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
  const agora = new Date();
  const ano = agora.getFullYear();
  const mesAtual = agora.getMonth() + 1;

  tabs.innerHTML = "";

  nomes.forEach((nome, idx) => {
    const mes = idx + 1;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = nome;
    btn.className = mes === mesAtual ? "tab-active" : "";
    btn.addEventListener("click", () => {
      Array.from(tabs.querySelectorAll("button")).forEach(b => b.classList.remove("tab-active"));
      btn.classList.add("tab-active");
      carregarRelatorioMes(ano, mes);
    });
    tabs.appendChild(btn);
  });

  carregarRelatorioMes(ano, mesAtual);
}

function formatarDinheiro(valor) {
  const num = Number(valor || 0);
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function carregarRelatorioMes(ano, mes) {
  const token = verificarAdminLogado();
  const summary = document.getElementById("monthSummary");
  const box = document.getElementById("monthTableBox");
  const lista = document.getElementById("listaPagamentosMes");

  if (!token || !summary || !box || !lista) return;

  summary.textContent = "Carregando relatorio...";
  box.classList.remove("admin-hidden");
  lista.innerHTML = `<tr><td colspan="6">Carregando...</td></tr>`;

  try {
    const res = await fetch(`${API}/pagamentos/mes?year=${encodeURIComponent(ano)}&month=${encodeURIComponent(mes)}`, {
      headers: {
        Authorization: token
      }
    });

    const data = await res.json();

    if (res.status === 401) {
      localStorage.removeItem("admin_token");
      window.location.href = "login.html";
      return;
    }

    if (!res.ok) {
      summary.textContent = data.error || "Erro ao carregar relatorio.";
      lista.innerHTML = `<tr><td colspan="6">Erro ao carregar.</td></tr>`;
      return;
    }

    summary.innerHTML = `Total recebido no mes: <strong>${formatarDinheiro(data.total)}</strong> | Pagamentos: <strong>${escaparHtml(data.quantidade)}</strong>`;

    if (!data.pagamentos || data.pagamentos.length === 0) {
      lista.innerHTML = `<tr><td colspan="6">Nenhum pagamento confirmado neste mes.</td></tr>`;
      return;
    }

    lista.innerHTML = "";

    data.pagamentos.forEach(p => {
      lista.innerHTML += `
        <tr>
          <td>${escaparHtml(formatarData(p.criado_em))}</td>
          <td>${escaparHtml(p.email || "-")}</td>
          <td>${escaparHtml(p.telefone || "-")}</td>
          <td>${escaparHtml(p.plano || "-")}</td>
          <td>${escaparHtml(formatarDinheiro(p.valor))}</td>
          <td>${escaparHtml(p.status || "-")}</td>
        </tr>
      `;
    });
  } catch (error) {
    console.error(error);
    summary.textContent = "Erro ao carregar relatorio.";
    lista.innerHTML = `<tr><td colspan="6">Erro ao carregar.</td></tr>`;
  }
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
      const restanteMs = tempoRestanteMs(pagamento.data_expiracao);
      const podeAvisar = pagamento.status === "confirmado" && restanteMs !== null && restanteMs > 0 && restanteMs <= 24 * 60 * 60 * 1000;
      const avisoEnviado = Boolean(pagamento.aviso_24h_enviado_em);
      const botaoAviso = podeAvisar
        ? `<button onclick="avisarClientePagamento(${pagamento.id}, '${escaparHtml(telefoneLink)}', '${escaparHtml(pagamento.email || "")}', '${escaparHtml(pagamento.plano || "")}')">${avisoEnviado ? "Avisar novamente" : "Avisar cliente"}</button>`
        : "";
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
                <strong>Tempo restante</strong>
                <p class="${statusClass}">${escaparHtml(tempoRestanteTexto(pagamento.data_expiracao))}</p>
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
                  ${botaoAviso}
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

async function carregarClientes() {
  const token = verificarAdminLogado();
  const lista = document.getElementById("listaClientes");

  if (!token) return;
  if (!lista) return;

  lista.innerHTML = `<tr><td colspan="6">Carregando...</td></tr>`;

  try {
    const res = await fetch(`${API}/clientes`, {
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
      lista.innerHTML = `<tr><td colspan="6">Erro ao carregar clientes.</td></tr>`;
      return;
    }

    if (dados.length === 0) {
      lista.innerHTML = `<tr><td colspan="6">Nenhum cliente encontrado.</td></tr>`;
      return;
    }

    lista.innerHTML = "";

    dados.forEach(c => {
      const vencimento = c.vencimento ? formatarDataFimDoDia(c.vencimento) : "Nao informado";
      const telefoneDigits = String(c.telefone || "").replace(/\D/g, "");
      const contato = telefoneDigits ? `55${telefoneDigits}` : "";
      const vencimentoDate = c.vencimento ? new Date(c.vencimento) : null;
      const diasRestantes = vencimentoDate && !Number.isNaN(vencimentoDate.getTime())
        ? Math.ceil((vencimentoDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
        : null;
      const vencimentoClasse = (diasRestantes !== null && diasRestantes <= 0)
        ? "badge-expirado"
        : (diasRestantes !== null && diasRestantes <= 3)
          ? "badge-urgente"
          : "badge-ok";
      const resumoContato = [
        c.nome ? escaparHtml(c.nome) : null,
        c.email ? escaparHtml(c.email) : null,
        c.telefone ? escaparHtml(c.telefone) : null
      ].filter(Boolean).join("<br>");
      const lembreteMsg = encodeURIComponent(
        `Ola${c.nome ? `, ${c.nome}` : ""}! Aqui e a equipe SG IPTV.\n\n` +
        `Seu plano esta proximo de expirar.\n` +
        `Login: ${c.usuario}\n` +
        `Senha: ${c.senha}\n` +
        `Vencimento: ${vencimento}\n\n` +
        `Para renovar, acesse a Area do Cliente: https://sgiptv.com.br/cliente.html`
      );
      const linkLembrete = contato
        ? `https://wa.me/${contato}?text=${lembreteMsg}`
        : "";
      const temContato = Boolean(c.nome || c.email || telefoneDigits);
      const textoEditar = temContato ? "Editar" : "Adicionar";

      lista.innerHTML += `
        <tr>
          <td>${escaparHtml(c.usuario)}</td>
          <td>${escaparHtml(c.senha)}</td>
          <td>${escaparHtml(c.plano)}</td>
          <td>${escaparHtml(c.conexoes)}</td>
          <td><span class="vencimento-badge ${vencimentoClasse}">${escaparHtml(vencimento)}</span></td>
          <td>
            <div class="cliente-contato">
              <div class="cliente-contato-resumo">${resumoContato || "-"}</div>
              <div class="cliente-contato-acoes">
                <button type="button" onclick="abrirModalCliente(${c.id}, '${escaparHtml(c.nome || "")}', '${escaparHtml(c.email || "")}', '${escaparHtml(c.telefone || "")}')">${textoEditar}</button>
                ${contato ? `<a class="whatsapp-btn" target="_blank" rel="noopener noreferrer" href="https://wa.me/${contato}?text=${encodeURIComponent("Ola! Aqui e a equipe SG IPTV.")}">WhatsApp</a>` : `<span class="whatsapp-btn whatsapp-disabled">WhatsApp</span>`}
                ${contato ? `<a class="whatsapp-btn" target="_blank" rel="noopener noreferrer" href="${linkLembrete}">Lembrar</a>` : ""}
              </div>
            </div>
          </td>
        </tr>
      `;
    });

  } catch (error) {
    console.error(error);
    lista.innerHTML = `<tr><td colspan="6">Erro ao carregar clientes.</td></tr>`;
  }
}

function garantirModalCliente() {
  let modal = document.getElementById("clienteModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "clienteModal";
  modal.className = "modal-overlay admin-hidden";
  modal.innerHTML = `
    <div class="modal-card" role="dialog" aria-modal="true" aria-label="Editar cliente">
      <div class="modal-header">
        <strong>Editar cliente</strong>
        <button type="button" class="modal-close" onclick="fecharModalCliente()">X</button>
      </div>

      <div class="modal-body">
        <input type="hidden" id="modal-cliente-id">

        <label>Nome</label>
        <input id="modal-cliente-nome" type="text" placeholder="Nome">

        <label>Email</label>
        <input id="modal-cliente-email" type="email" placeholder="Email">

        <label>WhatsApp (somente numeros)</label>
        <input id="modal-cliente-tel" type="text" placeholder="11912345678">

        <div class="modal-actions">
          <button type="button" onclick="salvarModalCliente()">Salvar</button>
          <button type="button" class="cancelar-btn" onclick="fecharModalCliente()">Cancelar</button>
        </div>
      </div>
    </div>
  `;

  modal.addEventListener("click", (event) => {
    if (event.target === modal) fecharModalCliente();
  });

  document.body.appendChild(modal);
  return modal;
}

function abrirModalCliente(id, nome, email, telefone) {
  const modal = garantirModalCliente();

  document.getElementById("modal-cliente-id").value = String(id);
  document.getElementById("modal-cliente-nome").value = String(nome || "");
  document.getElementById("modal-cliente-email").value = String(email || "");
  document.getElementById("modal-cliente-tel").value = String(telefone || "");

  modal.classList.remove("admin-hidden");
}

function fecharModalCliente() {
  const modal = document.getElementById("clienteModal");
  if (!modal) return;
  modal.classList.add("admin-hidden");
}

async function salvarModalCliente() {
  const token = verificarAdminLogado();
  if (!token) return;

  const id = document.getElementById("modal-cliente-id")?.value;
  const nome = document.getElementById("modal-cliente-nome")?.value || "";
  const email = document.getElementById("modal-cliente-email")?.value || "";
  const telefone = document.getElementById("modal-cliente-tel")?.value || "";

  try {
    const res = await fetch(`${API}/clientes/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: token
      },
      body: JSON.stringify({ nome, email, telefone })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Erro ao salvar cliente.");
      return;
    }

    alert("Cliente atualizado!");
    fecharModalCliente();
    carregarClientes();
  } catch (error) {
    console.error(error);
    alert("Erro ao salvar cliente.");
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
  const loginForm = document.getElementById("adminLoginForm");
  const userInput = document.getElementById("adminUser");
  const passInput = document.getElementById("adminPass");

  if (loginForm) {
    loginForm.addEventListener("submit", (event) => {
      event.preventDefault();
      loginAdmin();
    });
  }

  function tentarLoginPorEnter(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      loginAdmin();
    }
  }

  if (userInput) userInput.addEventListener("keydown", tentarLoginPorEnter);
  if (passInput) passInput.addEventListener("keydown", tentarLoginPorEnter);

  if (window.location.pathname.includes("admin.html")) {
    verificarAdminLogado();
    mostrarSecaoAdmin("pagamentos");
    criarTabsMeses();
    carregarPagamentos();
    carregarTestes();
  }
});
