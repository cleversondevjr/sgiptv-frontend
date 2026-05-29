const API = "https://api.sgiptv.com.br";

// PWA: registra Service Worker (se suportado).
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

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

  // Para testes IPTV, a expiracao deve ser exata (ex: +3h), nao "fim do dia".
  return item.expirado
    ? `${formatarData(item.data_expiracao)} (vencido)`
    : formatarData(item.data_expiracao);
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
  const revendedores = document.getElementById("revendedores");
  const farm = document.getElementById("farm");
  const btnPagamentos = document.getElementById("btnPagamentos");
  const btnTestes = document.getElementById("btnTestes");
  const btnClientes = document.getElementById("btnClientes");
  const btnRevendedores = document.getElementById("btnRevendedores");
  const btnFarm = document.getElementById("btnFarm");

  if (!pagamentos || !testes || !clientes || !revendedores || !farm) return;
  if (!btnPagamentos || !btnTestes || !btnClientes || !btnRevendedores || !btnFarm) return;

  const mostrarPagamentos = secao === "pagamentos";
  const mostrarTestes = secao === "testes";
  const mostrarClientes = secao === "clientes";
  const mostrarRevendedores = secao === "revendedores";
  const mostrarFarm = secao === "farm";

  pagamentos.classList.toggle("admin-hidden", !mostrarPagamentos);
  testes.classList.toggle("admin-hidden", !mostrarTestes);
  clientes.classList.toggle("admin-hidden", !mostrarClientes);
  revendedores.classList.toggle("admin-hidden", !mostrarRevendedores);
  farm.classList.toggle("admin-hidden", !mostrarFarm);
  btnPagamentos.classList.toggle("nav-active", mostrarPagamentos);
  btnTestes.classList.toggle("nav-active", mostrarTestes);
  btnClientes.classList.toggle("nav-active", mostrarClientes);
  btnRevendedores.classList.toggle("nav-active", mostrarRevendedores);
  btnFarm.classList.toggle("nav-active", mostrarFarm);

  if (mostrarClientes) {
    carregarClientes();
  }

  if (mostrarRevendedores) {
    carregarRevendedores();
  }
}

async function atualizarDadosAdmin() {
  const token = verificarAdminLogado();
  if (!token) return;

  const msg = document.getElementById("adminMensagem");
  if (msg) {
    msg.style.color = "#eab308";
    msg.textContent = "Atualizando...";
  }

  // Atualiza tudo. O usuário espera que esse botão "forçe" o refresh geral.
  const resultados = await Promise.allSettled([
    carregarPagamentos(),
    carregarTestes(),
    carregarClientes(),
    carregarRevendedores(),
  ]);

  const teveFalha = resultados.some((r) => r.status === "rejected");
  if (msg) {
    msg.style.color = teveFalha ? "#ef4444" : "#22c55e";
    msg.textContent = teveFalha ? "Atualizado com avisos (alguma aba falhou)." : "Dados atualizados!";
    setTimeout(() => {
      if (msg.textContent) msg.textContent = "";
    }, 2500);
  }
}

function alternarClientesRevendedor(id) {
  const detalhes = document.getElementById(`rev-clientes-${id}`);
  const botao = document.getElementById(`rev-toggle-${id}`);
  if (!detalhes || !botao) return;

  const fechado = detalhes.classList.toggle("admin-hidden");
  botao.textContent = fechado ? "+" : "-";

  if (!fechado && !detalhes.dataset.loaded) {
    carregarClientesDoRevendedor(id);
  }
}

async function carregarClientesDoRevendedor(id) {
  const token = verificarAdminLogado();
  if (!token) return;

  const box = document.getElementById(`rev-clientes-${id}`);
  if (!box) return;

  box.dataset.loaded = "1";
  box.innerHTML = `<td colspan="6"><div style="padding:12px;">Carregando...</div></td>`;

  try {
    const [resClientes, resComissoes, resHistorico] = await Promise.all([
      fetch(`${API}/revendedores/${id}/clientes`, { headers: { Authorization: token } }),
      fetch(`${API}/revendedores/${id}/comissoes`, { headers: { Authorization: token } }),
      fetch(`${API}/revendedores/${id}/historico`, { headers: { Authorization: token } })
    ]);

    const dataClientes = await resClientes.json();
    const dataComissoes = await resComissoes.json();
    const dataHistorico = await resHistorico.json();

    if (!resClientes.ok) throw new Error(dataClientes.error || "Erro ao carregar clientes.");
    if (!resComissoes.ok) throw new Error(dataComissoes.error || "Erro ao carregar comissoes.");
    if (!resHistorico.ok) throw new Error(dataHistorico.error || "Erro ao carregar historico.");

    const clientes = Array.isArray(dataClientes.clientes) ? dataClientes.clientes : [];
    const comissoes = Array.isArray(dataComissoes.comissoes) ? dataComissoes.comissoes : [];

    // Historico: usamos o endpoint /historico (comissoes + bonus) para exibir tambem bonus pagos.
    const histCom = Array.isArray(dataHistorico.comissoes)
      ? dataHistorico.comissoes.filter(c => String(c.status || "").toLowerCase() === "pago")
      : comissoes.filter(c => String(c.status || "").toLowerCase() === "pago");
    const histBonus = Array.isArray(dataHistorico.bonus)
      ? dataHistorico.bonus.filter(b => String(b.status || "").toLowerCase() === "pago")
      : [];

    const comissoesPendentes = comissoes.filter(c => String(c.status || "").toLowerCase() === "pendente");

    const sum = (arr) => arr.reduce((acc, it) => acc + (Number(it.valor) || 0), 0);
    const totalPrimeira = sum(comissoesPendentes.filter(c => c.tipo === "primeira_compra"));
    const totalRenovacao = sum(comissoesPendentes.filter(c => c.tipo === "renovacao"));
    const totalPendente = totalPrimeira + totalRenovacao;

    const formatarClienteComissao = (c) => {
      const nome = String(c.cliente_nome || "").trim();
      const usuario = String(c.cliente_usuario || "").trim();
      const email = String(c.cliente_email || "").trim();
      if (nome) return `${nome}${usuario ? ` (${usuario})` : ""}`;
      if (usuario) return usuario;
      if (email) return email;
      return String(c.cliente_id || "-");
    };

    const linhasComissoes = comissoesPendentes.length === 0
      ? `<tr><td colspan="5">Nenhuma comissao pendente.</td></tr>`
      : comissoesPendentes.map((c) => `
          <tr>
            <td>${escaparHtml(formatarData(c.criado_em))}</td>
            <td>${escaparHtml(c.tipo === "primeira_compra" ? "Primeira venda" : "Renovacao")}</td>
            <td>${formatarDinheiro(c.valor)}</td>
            <td>${escaparHtml(String(c.pagamento_id || "-"))}</td>
            <td>${escaparHtml(formatarClienteComissao(c))}</td>
          </tr>
        `).join("");

    const blocoComissoes = `
      <div style="padding: 10px 0 6px 0;">
        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center; justify-content:space-between;">
          <strong>Comissoes pendentes</strong>
          <span style="opacity:.9;">
            Primeira venda: <strong>${formatarDinheiro(totalPrimeira)}</strong> |
            Renovacao: <strong>${formatarDinheiro(totalRenovacao)}</strong> |
            Total: <strong>${formatarDinheiro(totalPendente)}</strong>
          </span>
        </div>
        <div class="tabela-area" style="margin: 8px 0 12px 0;">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Valor</th>
                <th>Pagamento</th>
                <th>Cliente</th>
              </tr>
            </thead>
            <tbody>${linhasComissoes}</tbody>
          </table>
        </div>
      </div>
    `;

    // Historico de comissoes: agrupa por comprovante/ID para mostrar 1 linha por pagamento.
    // (ex.: duas comissoes com mesmo transacao_id+comprovante viram 1 linha com total somado)
    const comissoesAgrupadas = (() => {
      const map = new Map();
      for (const c of (histCom || [])) {
        const transacaoId = c && c.transacao_id ? String(c.transacao_id) : "-";
        const comprovante = c && c.comprovante_nome ? String(c.comprovante_nome) : "-";
        const key = `${transacaoId}||${comprovante}`;
        const atual = map.get(key) || {
          pago_em: c.pago_em || c.criado_em,
          status: c.status || "-",
          transacao_id: transacaoId,
          comprovante_nome: comprovante,
          total: 0,
          // Contadores por tipo para dar mais controle visual
          total_primeira: 0,
          total_renovacao: 0,
          any_id: c.id
        };

        const v = Number(c.valor) || 0;
        atual.total += v;
        if (c.tipo === "primeira_compra") atual.total_primeira += v;
        else if (c.tipo === "renovacao") atual.total_renovacao += v;

        if (c.id && (!atual.any_id || Number(c.id) > Number(atual.any_id))) atual.any_id = c.id;

        const tsAtual = new Date(atual.pago_em || 0).getTime();
        const tsNovo = new Date(c.pago_em || c.criado_em || 0).getTime();
        if (Number.isFinite(tsNovo) && (!Number.isFinite(tsAtual) || tsNovo > tsAtual)) {
          atual.pago_em = c.pago_em || c.criado_em;
        }

        map.set(key, atual);
      }
      const arr = Array.from(map.values());
      arr.sort((a, b) => new Date(b.pago_em || 0).getTime() - new Date(a.pago_em || 0).getTime());
      return arr;
    })();

    const linhasHistCom = comissoesAgrupadas.length === 0
      ? `<tr><td colspan="6">Sem historico.</td></tr>`
      : comissoesAgrupadas.slice(0, 20).map((c) => {
          const tipoResumoParts = [];
          if (c.total_primeira > 0) tipoResumoParts.push(`Primeira venda: ${formatarDinheiro(c.total_primeira)}`);
          if (c.total_renovacao > 0) tipoResumoParts.push(`Renovacao: ${formatarDinheiro(c.total_renovacao)}`);
          const tipoResumo = tipoResumoParts.length ? tipoResumoParts.join(" | ") : "-";

          const btn = (c.comprovante_nome && c.comprovante_nome !== "-" && c.any_id)
            ? `<button type="button" class="btn-sm" onclick="verComprovanteComissaoAdmin(${Number(c.any_id)})">Ver comprovante</button>`
            : "";

          return `
            <tr>
              <td>${escaparHtml(formatarData(c.pago_em))}</td>
              <td>${escaparHtml(c.status || "-")}</td>
              <td>${escaparHtml(tipoResumo)}</td>
              <td>${formatarDinheiro(c.total)}</td>
              <td>${escaparHtml(String(c.transacao_id || "-"))}</td>
              <td>
                <div class="comprovante-cell">
                  ${btn}
                  <span class="comprovante-name">${escaparHtml(String(c.comprovante_nome || "-"))}</span>
                </div>
              </td>
            </tr>
          `;
        }).join("");

    const linhasHistBonus = histBonus.length === 0
      ? `<tr><td colspan="6">Sem bonus pago.</td></tr>`
      : histBonus.slice(0, 12).map((b) => {
          const btn = (b.comprovante_nome && b.comprovante_nome !== "-" && b.id)
            ? `<button type="button" class="btn-sm" onclick="verComprovanteBonusAdmin(${Number(b.id)})">Ver comprovante</button>`
            : "";
          const dataRef = b.pago_em || b.criado_em || b.mes || "-";
          return `
            <tr>
              <td>${escaparHtml(formatarData(dataRef))}</td>
              <td>${escaparHtml(b.status || "-")}</td>
              <td>${escaparHtml("Bonus")}</td>
              <td>${formatarDinheiro(b.valor)}</td>
              <td>${escaparHtml(String(b.transacao_id || "-"))}</td>
              <td>
                <div class="comprovante-cell">
                  ${btn}
                  <span class="comprovante-name">${escaparHtml(String(b.comprovante_nome || "-"))}</span>
                </div>
              </td>
            </tr>
          `;
        }).join("");

    const blocoHistorico = `
      <div style="padding: 10px 0 6px 0;">
        <strong>Historico de pagamentos</strong>
        <div class="tabela-area" style="margin: 8px 0 12px 0;">
          <div style="opacity:.9; font-weight:700; margin: 2px 0 6px 0;">Comissoes</div>
          <table class="hist-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Status</th>
                <th>Tipo</th>
                <th>Valor</th>
                <th>ID/Ref</th>
                <th>Comprovante</th>
              </tr>
            </thead>
            <tbody>${linhasHistCom}</tbody>
          </table>
        </div>
        <div class="tabela-area" style="margin: 8px 0 12px 0;">
          <div style="opacity:.9; font-weight:700; margin: 2px 0 6px 0;">Bonus</div>
          <table class="hist-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Status</th>
                <th>Tipo</th>
                <th>Valor</th>
                <th>ID/Ref</th>
                <th>Comprovante</th>
              </tr>
            </thead>
            <tbody>${linhasHistBonus}</tbody>
          </table>
        </div>
      </div>
    `;

    const linhasClientes = clientes.length === 0
      ? `<tr><td colspan="4">Nenhum cliente vinculado.</td></tr>`
      : clientes.map((c) => `
      <tr>
        <td>${escaparHtml(c.usuario)}</td>
        <td>${escaparHtml(c.plano)}</td>
        <td>${escaparHtml(formatarDataFimDoDia(c.vencimento))}</td>
        <td>${escaparHtml(c.nome || "-")}<br>${escaparHtml(c.email || "-")}<br>${escaparHtml(c.telefone || "-")}</td>
      </tr>
    `).join("");

    box.innerHTML = `
      <td colspan="6">
        <div class="tabela-area" style="margin: 10px 0 0 0;">
          ${blocoComissoes}
          ${blocoHistorico}
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Plano</th>
                <th>Vencimento</th>
                <th>Contato</th>
              </tr>
            </thead>
            <tbody>${linhasClientes}</tbody>
          </table>
        </div>
      </td>
    `;
  } catch (e) {
    console.error(e);
    box.innerHTML = `<td colspan="6"><div style="padding:12px; color:#ef4444;">Erro ao carregar clientes.</div></td>`;
  }
}

async function carregarRevendedores() {
  const token = verificarAdminLogado();
  if (!token) return;

  const lista = document.getElementById("listaRevendedores");
  if (!lista) return;

  lista.innerHTML = `<tr><td colspan="6">Carregando...</td></tr>`;

  try {
    const res = await fetch(`${API}/revendedores`, {
      headers: { Authorization: token }
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Erro ao buscar revendedores");
    }

    const itens = Array.isArray(data.revendedores) ? data.revendedores : [];
    if (itens.length === 0) {
      lista.innerHTML = `<tr><td colspan="6">Nenhum revendedor cadastrado.</td></tr>`;
      return;
    }

    lista.innerHTML = itens.map((item) => {
      const pendente = formatarDinheiro(item.total_pendente || 0);
      const bonusMes = Number(item.bonus_mes || 0);
      const bonusPago = Number(item.bonus_pago_mes || 0);
      const bonusPendenteMes = Number(item.bonus_pendente_mes || 0);
      const bonusTexto = formatarDinheiro(bonusPendenteMes);
      const status = String(item.status || "pendente");
      const podeAprovar = status === "pendente";

      return `
        <tr>
          <td><strong>${escaparHtml(item.nome_completo || "-")}</strong><br><span style="opacity:.9;">${escaparHtml(item.codigo)}</span></td>
          <td>${escaparHtml(item.email)}</td>
          <td>${escaparHtml(item.pix_cpf || "-")}</td>
          <td><strong>${pendente}</strong></td>
          <td><strong>${bonusTexto}</strong></td>
          <td>
            <button id="rev-toggle-${item.id}" type="button" onclick="alternarClientesRevendedor(${item.id})">+</button>
            <button type="button" onclick="mostrarInfoComissoesRevendedor()">?</button>
            ${podeAprovar ? `<button type="button" onclick="aprovarRevendedor(${item.id})">Aprovar</button>` : ``}
            ${podeAprovar ? `<button type="button" onclick="reprovarRevendedor(${item.id})">Reprovar</button>` : ``}
            <button type="button" onclick="abrirPagarComissao(${item.id}, '${pendente.replace("R$","").trim()}', '${escaparHtml(item.pix_cpf || "")}')">Pagar Comissao</button>
            <button type="button" onclick="abrirPagarBonus(${item.id}, ${bonusMes}, ${bonusPago}, ${bonusPendenteMes}, '${escaparHtml(item.pix_cpf || "")}')">Pagar Bonus</button>
            <button type="button" onclick="excluirRevendedor(${item.id})">Excluir</button>
          </td>
        </tr>
        <tr id="rev-clientes-${item.id}" class="admin-hidden">
          <td colspan="6"></td>
        </tr>
      `;
    }).join("");
  } catch (error) {
    console.error(error);
    lista.innerHTML = `<tr><td colspan="6">Erro ao carregar.</td></tr>`;
  }
}

async function aprovarRevendedor(id) {
  const token = verificarAdminLogado();
  if (!token) return;

  try {
    const res = await fetch(`${API}/revendedores/${id}/aprovar`, {
      method: "PUT",
      headers: { Authorization: token }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao aprovar.");
    alert("Revendedor aprovado.");
    carregarRevendedores();
  } catch (e) {
    alert(e.message || "Erro ao aprovar.");
  }
}

async function reprovarRevendedor(id) {
  const token = verificarAdminLogado();
  if (!token) return;

  if (!confirm("Reprovar este revendedor?")) return;

  try {
    const res = await fetch(`${API}/revendedores/${id}/reprovar`, {
      method: "PUT",
      headers: { Authorization: token }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao reprovar.");
    alert("Revendedor reprovado.");
    carregarRevendedores();
  } catch (e) {
    alert(e.message || "Erro ao reprovar.");
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

function criarModalBasico({ titulo, corpoHtml, onConfirmText = "Confirmar", onConfirm, confirmDanger = false } = {}) {
  let modal = document.getElementById("adminModalBase");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "adminModalBase";
    modal.className = "admin-modal-overlay";
    modal.innerHTML = `
      <div class="admin-modal">
        <div class="admin-modal-header">
          <div class="admin-modal-title"></div>
          <button type="button" class="admin-modal-close" aria-label="Fechar">X</button>
        </div>
        <div class="admin-modal-body"></div>
        <div class="admin-modal-footer">
          <label class="admin-modal-check">
            <input type="checkbox" id="adminModalConfirmCheck" />
            Confirmo esta acao
          </label>
          <label class="admin-modal-check">
            <input type="checkbox" id="adminModalNotifyCheck" checked />
            Enviar email ao revendedor
          </label>
          <div class="admin-modal-actions">
            <button type="button" class="admin-btn-secondary" id="adminModalCancelBtn">Cancelar</button>
            <button type="button" class="admin-btn-primary" id="adminModalOkBtn">${onConfirmText}</button>
          </div>
        </div>
        <div class="admin-modal-msg" id="adminModalMsg"></div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("open");
    });

    // Delegacao: botoes dentro do modal (evita depender de onclick inline).
    modal.addEventListener("click", (e) => {
      const el = e.target && e.target.closest ? e.target.closest("[data-copy]") : null;
      if (!el) return;
      const texto = el.getAttribute("data-copy") || "";
      const msg = el.getAttribute("data-copy-msg") || "Copiado";
      copiarTexto(texto, msg);
    });
    modal.querySelector(".admin-modal-close").addEventListener("click", () => modal.classList.remove("open"));
    modal.querySelector("#adminModalCancelBtn").addEventListener("click", () => modal.classList.remove("open"));
  }

  modal.querySelector(".admin-modal-title").textContent = titulo || "Confirmar";
  modal.querySelector(".admin-modal-body").innerHTML = corpoHtml || "";
  modal.querySelector("#adminModalConfirmCheck").checked = false;
  modal.querySelector("#adminModalNotifyCheck").checked = true;
  modal.querySelector("#adminModalMsg").textContent = "";

  const okBtn = modal.querySelector("#adminModalOkBtn");
  okBtn.textContent = onConfirmText || "Confirmar";
  okBtn.classList.toggle("danger", !!confirmDanger);

  okBtn.onclick = async () => {
    const checked = modal.querySelector("#adminModalConfirmCheck").checked;
    if (!checked) {
      modal.querySelector("#adminModalMsg").textContent = "Marque a confirmacao para continuar.";
      return;
    }
    try {
      await onConfirm?.();
      modal.classList.remove("open");
    } catch (e) {
      modal.querySelector("#adminModalMsg").textContent = e?.message || "Erro.";
    }
  };

  modal.classList.add("open");
}

function abrirPagarComissao(revendedorId, pendenteValorTexto, pixCpf) {
  const valor = String(pendenteValorTexto || "").trim();
  const desc = `SG IPTV - Comissao revendedor ${revendedorId} - ${new Date().toLocaleDateString("pt-BR")}`;
  const pix = String(pixCpf || "");
  const valorStr = `R$ ${valor || "0,00"}`;
  criarModalBasico({
    titulo: "Marcar Comissao Como Paga",
    corpoHtml: `
      <div style="display:grid; gap:10px;">
        <div><strong>Revendedor ID:</strong> ${escaparHtml(String(revendedorId))}</div>
        <div><strong>Chave PIX/CPF:</strong> ${escaparHtml(String(pixCpf || "-"))}</div>
        <div><strong>Valor pendente:</strong> R$ ${escaparHtml(valor || "0,00")}</div>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button type="button" class="admin-btn-secondary" data-copy="${escaparHtml(pix)}" data-copy-msg="Chave PIX copiada">Copiar chave</button>
          <button type="button" class="admin-btn-secondary" data-copy="${escaparHtml(valorStr)}" data-copy-msg="Valor copiado">Copiar valor</button>
          <button type="button" class="admin-btn-secondary" data-copy="${escaparHtml(desc)}" data-copy-msg="Descricao copiada">Copiar descricao</button>
          <a class="admin-btn-secondary" style="text-decoration:none; display:inline-flex; align-items:center;" href="https://www.mercadopago.com.br/money-out/transfer/pix-methods#from=dashboard&flow_detail=new_transfer" target="_blank" rel="noreferrer">Abrir Mercado Pago (Pix)</a>
        </div>
        <label>Comprovante/ID transacao (opcional)<br>
          <input id="mpTransacaoId" class="admin-input" placeholder="Ex.: TX123, comprovante, etc" />
        </label>
        <label>Anexar comprovante (opcional)<br>
          <input id="mpComprovanteFile" class="admin-input" type="file" accept="image/*,application/pdf" />
          <div style="opacity:.85; font-size:12px; margin-top:6px;">Ate ~2MB (imagem/PDF).</div>
        </label>
      </div>
    `,
    onConfirmText: "Marcar como pago",
    confirmDanger: false,
    onConfirm: async () => {
      const token = verificarAdminLogado();
      if (!token) throw new Error("Admin nao logado.");
      const transacao_id = document.getElementById("mpTransacaoId")?.value?.trim() || null;
      const notificar = !!document.getElementById("adminModalNotifyCheck")?.checked;
      const comprovante = await lerComprovanteArquivo("mpComprovanteFile");
      const res = await fetch(`${API}/revendedores/${revendedorId}/comissoes/pagar`, {
        method: "POST",
        headers: { Authorization: token, "Content-Type": "application/json" },
        body: JSON.stringify({ transacao_id, notificar, comprovante })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao marcar comissao.");
      await carregarRevendedores();
    }
  });
}

function abrirPagarBonus(revendedorId, bonusMes, bonusPago, bonusPendente, pixCpf) {
  const desc = `SG IPTV - Bonus revendedor ${revendedorId} - ${new Date().toLocaleDateString("pt-BR")}`;
  const pix = String(pixCpf || "");
  const valorStr = String(formatarDinheiro(bonusPendente || 0));
  criarModalBasico({
    titulo: "Marcar Bonus Como Pago",
    corpoHtml: `
      <div style="display:grid; gap:10px;">
        <div><strong>Revendedor ID:</strong> ${escaparHtml(String(revendedorId))}</div>
        <div><strong>Chave PIX/CPF:</strong> ${escaparHtml(String(pixCpf || "-"))}</div>
        <div><strong>Bonus do mes:</strong> ${formatarDinheiro(bonusMes || 0)}</div>
        <div><strong>Bonus ja pago no mes:</strong> ${formatarDinheiro(bonusPago || 0)}</div>
        <div><strong>Bonus pendente:</strong> ${formatarDinheiro(bonusPendente || 0)}</div>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button type="button" class="admin-btn-secondary" data-copy="${escaparHtml(pix)}" data-copy-msg="Chave PIX copiada">Copiar chave</button>
          <button type="button" class="admin-btn-secondary" data-copy="${escaparHtml(valorStr)}" data-copy-msg="Valor copiado">Copiar valor</button>
          <button type="button" class="admin-btn-secondary" data-copy="${escaparHtml(desc)}" data-copy-msg="Descricao copiada">Copiar descricao</button>
          <a class="admin-btn-secondary" style="text-decoration:none; display:inline-flex; align-items:center;" href="https://www.mercadopago.com.br/money-out/transfer/pix-methods#from=dashboard&flow_detail=new_transfer" target="_blank" rel="noreferrer">Abrir Mercado Pago (Pix)</a>
        </div>
        <label>Comprovante/ID transacao (opcional)<br>
          <input id="mpBonusTransacaoId" class="admin-input" placeholder="Ex.: TX123, comprovante, etc" />
        </label>
        <label>Anexar comprovante (opcional)<br>
          <input id="mpBonusComprovanteFile" class="admin-input" type="file" accept="image/*,application/pdf" />
          <div style="opacity:.85; font-size:12px; margin-top:6px;">Ate ~2MB (imagem/PDF).</div>
        </label>
      </div>
    `,
    onConfirmText: "Marcar bonus como pago",
    confirmDanger: false,
    onConfirm: async () => {
      const token = verificarAdminLogado();
      if (!token) throw new Error("Admin nao logado.");
      const transacao_id = document.getElementById("mpBonusTransacaoId")?.value?.trim() || null;
      const notificar = !!document.getElementById("adminModalNotifyCheck")?.checked;
      const comprovante = await lerComprovanteArquivo("mpBonusComprovanteFile");
      const res = await fetch(`${API}/revendedores/${revendedorId}/bonus/pagar`, {
        method: "POST",
        headers: { Authorization: token, "Content-Type": "application/json" },
        body: JSON.stringify({ transacao_id, notificar, comprovante })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao marcar bonus.");
      await carregarRevendedores();
    }
  });
}

async function lerComprovanteArquivo(inputId) {
  const el = document.getElementById(inputId);
  const file = el && el.files && el.files[0] ? el.files[0] : null;
  if (!file) return null;
  if (file.size > 2_000_000) throw new Error("Comprovante muito grande (max ~2MB).");

  const base64 = await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(new Error("Falha ao ler comprovante."));
    fr.onload = () => {
      const dataUrl = String(fr.result || "");
      const idx = dataUrl.indexOf("base64,");
      if (idx === -1) return reject(new Error("Formato de comprovante invalido."));
      resolve(dataUrl.slice(idx + "base64,".length));
    };
    fr.readAsDataURL(file);
  });

  return { name: file.name, mime: file.type || "application/octet-stream", base64 };
}

async function copiarTexto(texto, msgOk) {
  const t = String(texto || "");
  if (!t) return;
  try {
    // Ajuda o Chrome a liberar a area de transferencia quando o modal/aba perdeu foco.
    window.focus?.();
    document.body?.focus?.();
    await navigator.clipboard.writeText(t);
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = t;
      ta.setAttribute("readonly", "readonly");
      ta.style.position = "fixed";
      ta.style.top = "0";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    } catch {
      // Ultimo fallback: abre prompt com o texto para o usuario copiar manualmente.
      window.prompt("Copie o texto abaixo:", t);
    }
  }

  const box = document.getElementById("adminModalMsg");
  if (box && msgOk) {
    box.style.color = "#22c55e";
    box.textContent = msgOk;
    setTimeout(() => {
      if (box.textContent === msgOk) {
        box.textContent = "";
        box.style.color = "#ef4444";
      }
    }, 2000);
  }
}

async function verComprovanteComissaoAdmin(comissaoId) {
  try {
    const token = "Bearer " + (localStorage.getItem("admin_token") || "");
    if (token === "Bearer ") throw new Error("Token admin ausente.");

    const res = await fetch(`${API}/admin/comissoes/${comissaoId}/comprovante`, {
      headers: { Authorization: token }
    });
    const err = !res.ok ? await res.json().catch(() => ({})) : null;
    if (!res.ok) throw new Error(err?.error || "Nao foi possivel abrir o comprovante.");

    const blob = await res.blob();
    const dispo = res.headers.get("content-disposition") || "";
    const match = dispo.match(/filename=\"?([^\";]+)\"?/i);
    const filename = match ? match[1] : `comprovante-${comissaoId}.pdf`;

    const url = window.URL.createObjectURL(blob);

    // Modal interno (evita abrir nova aba)
    const isImage = /^image\//i.test(blob.type || "");
    const isPdf = /pdf/i.test(blob.type || "") || String(filename).toLowerCase().endsWith(".pdf");
    const pdfContainerId = `pdfViewer_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;

    const viewer = isImage
      ? `<img src="${url}" alt="Comprovante" style="max-width:100%; height:auto; border-radius:10px; display:block; margin:0 auto;" />`
      : isPdf
        ? `<div id="${pdfContainerId}" style="width:100%; height:82vh; border-radius:10px; background:#0b1220; overflow:auto; display:flex; align-items:flex-start; justify-content:center; padding:12px;"></div>`
        : `<iframe src="${url}" style="width:100%; height:82vh; border:0; border-radius:10px; background:#0b1220;"></iframe>`;

    criarModalBasico({
      titulo: "Comprovante",
      corpoHtml: `
        <div style="margin-bottom:10px; display:flex; align-items:center; justify-content:space-between; gap:10px;">
          <div style="opacity:.9; font-size:14px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
            ${escaparHtml(filename)}
          </div>
        </div>
        ${viewer}
      `,
      onConfirmText: "Fechar",
      onConfirm: () => {}
    });

    // Aumenta o modal para o comprovante (mais largura/altura)
    setTimeout(() => {
      const modal = document.getElementById("adminModalBase");
      const card = modal ? modal.querySelector(".admin-modal") : null;
      if (card) {
        card.style.maxWidth = "1400px";
        card.style.width = "min(1400px, 98vw)";
      }
    }, 0);

    if (isPdf) {
      // Renderiza o PDF como imagem (canvas) para nao mostrar botoes de imprimir/baixar do viewer nativo.
      setTimeout(async () => {
        const el = document.getElementById(pdfContainerId);
        if (!el) return;
        try {
          await renderPdfComoImagem(blob, el);
        } catch (e) {
          el.innerHTML = `<div style="color:#e2e8f0; opacity:.9; padding:14px;">Nao foi possivel renderizar o PDF aqui. Tente novamente.</div>`;
        }
      }, 0);
    }

    // revoga depois de um tempo (para nao quebrar o iframe)
    setTimeout(() => window.URL.revokeObjectURL(url), 5 * 60_000);
  } catch (e) {
    alert(e.message || "Erro ao abrir comprovante.");
  }
}

async function carregarPdfJsSePreciso() {
  if (window.pdfjsLib && window.pdfjsLib.getDocument) return window.pdfjsLib;

  // Carrega PDF.js dinamicamente (sem bundler) para rodar no GitHub Pages.
  await new Promise((resolve, reject) => {
    const s = document.createElement("script");
    // Self-host (CSP 'self' do site pode bloquear CDN). Arquivo em assets/vendor/pdfjs/
    s.src = "assets/vendor/pdfjs/pdf.min.js";
    s.onload = resolve;
    s.onerror = () => reject(new Error("Falha ao carregar PDF.js"));
    document.head.appendChild(s);
  });

  const lib = window.pdfjsLib;
  if (!lib || !lib.getDocument) throw new Error("PDF.js indisponivel");
  // Worker via CDN
  lib.GlobalWorkerOptions.workerSrc = "assets/vendor/pdfjs/pdf.worker.min.js";
  return lib;
}

async function renderPdfComoImagem(pdfBlob, containerEl) {
  const pdfjs = await carregarPdfJsSePreciso();
  const buf = await pdfBlob.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const page = await doc.getPage(1);

  // Render ajustando para caber (largura e altura) no container visivel.
  const viewport1 = page.getViewport({ scale: 1 });
  const maxW = Math.max(320, Math.min(1400, (containerEl.clientWidth || 0) - 24));
  const maxH = Math.max(240, (containerEl.clientHeight || window.innerHeight * 0.82) - 24);
  const scaleW = maxW / viewport1.width;
  const scaleH = maxH / viewport1.height;
  const scale = Math.max(0.1, Math.min(scaleW, scaleH));
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  // Nao force 100% width, senao o browser estica e parece "zoomado".
  canvas.style.width = `${canvas.width}px`;
  canvas.style.height = `${canvas.height}px`;
  canvas.style.maxWidth = "100%";
  canvas.style.maxHeight = "100%";
  canvas.style.borderRadius = "10px";
  canvas.style.background = "#fff";

  containerEl.innerHTML = "";
  containerEl.appendChild(canvas);

  const ctx = canvas.getContext("2d", { alpha: false });
  await page.render({ canvasContext: ctx, viewport }).promise;
}

async function verComprovanteBonusAdmin(bonusId) {
  try {
    const token = "Bearer " + (localStorage.getItem("admin_token") || "");
    if (token === "Bearer ") throw new Error("Token admin ausente.");

    const res = await fetch(`${API}/admin/bonus/${bonusId}/comprovante`, {
      headers: { Authorization: token }
    });
    const err = !res.ok ? await res.json().catch(() => ({})) : null;
    if (!res.ok) throw new Error(err?.error || "Nao foi possivel abrir o comprovante.");

    const blob = await res.blob();
    const dispo = res.headers.get("content-disposition") || "";
    const match = dispo.match(/filename=\"?([^\";]+)\"?/i);
    const filename = match ? match[1] : `bonus-${bonusId}.pdf`;

    const url = window.URL.createObjectURL(blob);
    const isImage = /^image\//i.test(blob.type || "");
    const isPdf = /pdf/i.test(blob.type || "") || String(filename).toLowerCase().endsWith(".pdf");
    const pdfContainerId = `pdfViewerB_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;

    const viewer = isImage
      ? `<img src="${url}" alt="Comprovante" style="max-width:100%; height:auto; border-radius:10px; display:block; margin:0 auto;" />`
      : isPdf
        ? `<div id="${pdfContainerId}" style="width:100%; height:82vh; border-radius:10px; background:#0b1220; overflow:auto; display:flex; align-items:flex-start; justify-content:center; padding:12px;"></div>`
        : `<iframe src="${url}" style="width:100%; height:82vh; border:0; border-radius:10px; background:#0b1220;"></iframe>`;

    criarModalBasico({
      titulo: "Comprovante (Bonus)",
      corpoHtml: `
        <div style="margin-bottom:10px;">
          <div style="opacity:.9; font-size:14px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
            ${escaparHtml(filename)}
          </div>
        </div>
        ${viewer}
      `,
      onConfirmText: "Fechar",
      onConfirm: () => {}
    });

    setTimeout(() => {
      const modal = document.getElementById("adminModalBase");
      const card = modal ? modal.querySelector(".admin-modal") : null;
      if (card) {
        card.style.maxWidth = "1200px";
        card.style.width = "min(1200px, 96vw)";
      }
    }, 0);

    if (isPdf) {
      setTimeout(async () => {
        const el = document.getElementById(pdfContainerId);
        if (!el) return;
        try {
          await renderPdfComoImagem(blob, el);
        } catch {
          el.innerHTML = `<div style="color:#e2e8f0; opacity:.9; padding:14px;">Nao foi possivel renderizar o PDF aqui. Tente novamente.</div>`;
        }
      }, 0);
    }

    setTimeout(() => window.URL.revokeObjectURL(url), 5 * 60_000);
  } catch (e) {
    alert(e.message || "Erro ao abrir comprovante.");
  }
}

function mostrarInfoComissoesRevendedor() {
  alert(
    [
      "Regras de comissao/bonus:",
      "",
      "- Primeira venda: valor fixo por plano (ex.: Mensal 1 tela = R$ 10,00).",
      "- Renovacao: 10% do valor do plano.",
      "- Bonus: se o revendedor tiver mais de 10 vendas ativas no mes, ganha R$ 50,00."
    ].join("\n")
  );
}

function abrirModalConfirmacaoExclusao({ titulo = "Confirmar exclusao", mensagem = "Deseja excluir?", textoCheckbox = "Eu entendo e quero excluir", onConfirm } = {}) {
  const modal = garantirModalBasico("confirmDeleteModal", titulo);
  const body = document.getElementById("confirmDeleteModal-body");

  body.innerHTML = `
    <p style="margin:0 0 12px 0; color:#e2e8f0;">${escaparHtml(mensagem)}</p>

    <label style="display:flex; gap:10px; align-items:center; user-select:none; cursor:pointer;">
      <input id="confirmDeleteCheckbox" type="checkbox" style="width:18px; height:18px; accent-color:#facc15;">
      <span>${escaparHtml(textoCheckbox)}</span>
    </label>

    <div id="confirmDeleteMsg" style="margin-top:10px;"></div>

    <div class="modal-actions" style="grid-template-columns: 1fr 1fr;">
      <button type="button" onclick="confirmarExclusaoModal()">Sim, excluir</button>
      <button type="button" class="cancelar-btn" onclick="document.getElementById('confirmDeleteModal').classList.add('admin-hidden')">Cancelar</button>
    </div>
  `;

  window.__sgiptvConfirmDelete = typeof onConfirm === "function" ? onConfirm : null;
  modal.classList.remove("admin-hidden");
}

async function confirmarExclusaoModal() {
  const cb = document.getElementById("confirmDeleteCheckbox");
  const msg = document.getElementById("confirmDeleteMsg");

  if (!cb || !cb.checked) {
    if (msg) msg.innerHTML = `<p class="erro">Marque a caixa para confirmar a exclusao.</p>`;
    return;
  }

  const fn = window.__sgiptvConfirmDelete;
  if (typeof fn !== "function") {
    if (msg) msg.innerHTML = `<p class="erro">Acao invalida.</p>`;
    return;
  }

  if (msg) msg.textContent = "Excluindo...";
  try {
    await fn();
    const modal = document.getElementById("confirmDeleteModal");
    if (modal) modal.classList.add("admin-hidden");
  } catch (e) {
    if (msg) msg.innerHTML = `<p class="erro">${escaparHtml(e.message || String(e))}</p>`;
  }
}

function garantirModalBasico(id, titulo) {
  let modal = document.getElementById(id);
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = id;
  modal.className = "modal-overlay admin-hidden";
  modal.innerHTML = `
    <div class="modal-card" role="dialog" aria-modal="true" aria-label="${escaparHtml(titulo)}">
      <div class="modal-header">
        <strong>${escaparHtml(titulo)}</strong>
        <button type="button" class="modal-close" onclick="document.getElementById('${id}').classList.add('admin-hidden')">X</button>
      </div>
      <div class="modal-body" id="${id}-body"></div>
    </div>
  `;

  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.classList.add("admin-hidden");
  });

  document.body.appendChild(modal);
  return modal;
}

function abrirModalPixTeste() {
  const modal = garantirModalBasico("pixTesteModal", "Gerar Pix (Teste)");
  const body = document.getElementById("pixTesteModal-body");

  body.innerHTML = `
    <label>Email</label>
    <input id="pixTesteEmail" type="email" placeholder="cliente@email.com">

    <label>WhatsApp (somente numeros)</label>
    <input id="pixTesteTel" type="text" placeholder="11912345678">

    <label>Plano</label>
    <select id="pixTestePlano">
      <option value="mensal_1_tela">Mensal - 1 Tela</option>
      <option value="mensal_2_telas">Mensal - 2 Telas</option>
      <option value="trimestral_1_tela">Trimestral - 1 Tela</option>
      <option value="trimestral_2_telas">Trimestral - 2 Telas</option>
    </select>

    <div class="modal-actions" style="grid-template-columns: 1fr;">
      <button type="button" onclick="gerarPixTesteAdmin()">Gerar</button>
    </div>

    <div id="pixTesteResultado" style="margin-top:12px;"></div>
  `;

  modal.classList.remove("admin-hidden");
}

async function excluirRevendedor(id) {
  const token = verificarAdminLogado();
  if (!token) return;

  abrirModalConfirmacaoExclusao({
    titulo: "Excluir revendedor",
    mensagem: "Excluir este revendedor? (Apenas testes; nao pode ter clientes vinculados)",
    onConfirm: async () => {
      const res = await fetch(`${API}/revendedores/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: token }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || "Erro ao excluir.");
      carregarRevendedores();
    }
  });
}

function abrirModalDinheiro() {
  const modal = garantirModalBasico("dinheiroModal", "Confirmar Pagamento (Dinheiro)");
  const body = document.getElementById("dinheiroModal-body");

  body.innerHTML = `
    <label>Email</label>
    <input id="dinheiroEmail" type="email" placeholder="cliente@email.com">

    <label>WhatsApp (somente numeros)</label>
    <input id="dinheiroTel" type="text" placeholder="11912345678">

    <label>Plano</label>
    <select id="dinheiroPlano">
      <option value="Mensal - 1 Tela" data-valor="30">Mensal - 1 Tela</option>
      <option value="Mensal - 2 Telas" data-valor="50">Mensal - 2 Telas</option>
      <option value="Trimestral - 1 Tela" data-valor="80">Trimestral - 1 Tela</option>
      <option value="Trimestral - 2 Telas" data-valor="140">Trimestral - 2 Telas</option>
    </select>

    <label>Valor (R$)</label>
    <input id="dinheiroValor" type="number" min="1" step="0.01" placeholder="30.00">

    <label>Data (opcional)</label>
    <input id="dinheiroData" type="datetime-local">

    <label>Login (opcional)</label>
    <input id="dinheiroUsuario" type="text" placeholder="usuario">

    <label>Senha (opcional)</label>
    <input id="dinheiroSenha" type="text" placeholder="senha">

    <div class="modal-actions" style="grid-template-columns: 1fr;">
      <button type="button" onclick="confirmarDinheiro()">Confirmar</button>
    </div>

    <div id="dinheiroMsg" style="margin-top:12px;"></div>
  `;

  // Preenche o valor automaticamente ao trocar o plano (evita digitar manualmente).
  const planoEl = document.getElementById("dinheiroPlano");
  const valorEl = document.getElementById("dinheiroValor");
  if (planoEl && valorEl) {
    const atualizarValor = () => {
      const opt = planoEl.options[planoEl.selectedIndex];
      const sugerido = opt?.getAttribute("data-valor");
      if (!sugerido) return;
      valorEl.value = String(sugerido);
    };
    planoEl.addEventListener("change", atualizarValor);
    // Ao abrir o modal, ja sugere o valor do plano selecionado.
    atualizarValor();
  }

  modal.classList.remove("admin-hidden");
}

// Abre o modal de "pagamento em dinheiro" com campos pre-preenchidos (ex: vindo da aba Clientes).
function abrirModalDinheiroPreenchido({ email = "", telefone = "", plano = "", valor = "", cliente_usuario = "", cliente_senha = "" } = {}) {
  abrirModalDinheiro();

  const setVal = (id, v) => {
    const el = document.getElementById(id);
    if (el && v !== undefined && v !== null) el.value = String(v);
  };

  setVal("dinheiroEmail", String(email || "").trim().toLowerCase());
  setVal("dinheiroTel", String(telefone || "").replace(/\\D/g, ""));
  if (plano) setVal("dinheiroPlano", plano);
  if (valor) setVal("dinheiroValor", valor);
  if (cliente_usuario) setVal("dinheiroUsuario", cliente_usuario);
  if (cliente_senha) setVal("dinheiroSenha", cliente_senha);
}

async function confirmarDinheiro() {
  const token = verificarAdminLogado();
  if (!token) return;

  const msg = document.getElementById("dinheiroMsg");
  if (msg) msg.textContent = "Confirmando...";

  const email = String(document.getElementById("dinheiroEmail")?.value || "").trim().toLowerCase();
  const telefone = String(document.getElementById("dinheiroTel")?.value || "").replace(/\\D/g, "");
  const plano = String(document.getElementById("dinheiroPlano")?.value || "").trim();
  const valor = String(document.getElementById("dinheiroValor")?.value || "").trim();
  const data = String(document.getElementById("dinheiroData")?.value || "").trim();
  const cliente_usuario = String(document.getElementById("dinheiroUsuario")?.value || "").trim();
  const cliente_senha = String(document.getElementById("dinheiroSenha")?.value || "").trim();

  if (!plano || !valor || Number(valor) <= 0) {
    if (msg) msg.innerHTML = `<p class="erro">Informe plano e valor.</p>`;
    return;
  }

  try {
    const res = await fetch(`${API}/pagamentos/dinheiro`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: token },
      body: JSON.stringify({
        email: email || null,
        telefone: telefone || null,
        plano,
        valor,
        cliente_usuario: cliente_usuario || null,
        cliente_senha: cliente_senha || null,
        confirmado_em: data ? new Date(data).toISOString() : null
      })
    });

    const payload = await res.json();
    if (!res.ok) {
      throw new Error(payload.detail || payload.error || "Erro ao confirmar pagamento.");
    }

    if (msg) msg.innerHTML = `<p style="color:#22c55e;"><strong>Pagamento confirmado!</strong></p>`;
    carregarPagamentos();
  } catch (e) {
    if (msg) msg.innerHTML = `<p class="erro">${escaparHtml(e.message)}</p>`;
  }
}

async function gerarPixTesteAdmin() {
  const token = verificarAdminLogado();
  if (!token) return;

  const email = String(document.getElementById("pixTesteEmail")?.value || "").trim().toLowerCase();
  const telefone = String(document.getElementById("pixTesteTel")?.value || "").replace(/\D/g, "");
  const planoId = String(document.getElementById("pixTestePlano")?.value || "").trim();
  const resultado = document.getElementById("pixTesteResultado");
  const usuario = "admin_teste";
  const senha = "admin_teste";

  if (!resultado) return;

  resultado.innerHTML = `<p>Gerando Pix...</p>`;

  try {
    const res = await fetch(`${API}/admin/pix/teste`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token
      },
      body: JSON.stringify({ email, telefone, planoId, cliente_usuario: usuario, cliente_senha: senha })
    });

    const data = await res.json();

    if (!res.ok) {
      resultado.innerHTML = `<p class="erro">${escaparHtml(data.error || "Erro ao gerar Pix.")}</p>`;
      return;
    }

    const codigo = String(data.qr_code || "");

    resultado.innerHTML = `
      <p><strong>Payment ID:</strong> ${escaparHtml(data.payment_id)}</p>
      <p><strong>Expira em:</strong> ${escaparHtml(formatarData(data.pix_expira_em))}</p>
      <div class="pix-flex" style="grid-template-columns: 260px minmax(0,1fr);">
        <div class="pix-preview">
          <img alt="QR Code Pix" src="data:image/png;base64,${data.qr_base64}">
        </div>
        <div>
          <label>Codigo copia e cola</label>
          <textarea id="pixTesteCopia" readonly>${escaparHtml(codigo)}</textarea>
          <button type="button" style="margin-top:10px;" onclick="copiarTextoArea('pixTesteCopia', this)">Copiar codigo</button>
        </div>
      </div>
    `;
  } catch (error) {
    console.error(error);
    resultado.innerHTML = `<p class="erro">Erro ao gerar Pix.</p>`;
  }
}

function copiarTextoArea(id, botao) {
  const el = document.getElementById(id);
  if (!el) return;

  el.focus();
  el.select();

  try {
    document.execCommand("copy");
    if (botao) botao.textContent = "Copiado!";
    setTimeout(() => {
      if (botao) botao.textContent = "Copiar codigo";
    }, 1500);
  } catch {
    alert("Nao foi possivel copiar automaticamente.");
  }
}

function abrirModalEmailsTeste() {
  const modal = garantirModalBasico("emailsTesteModal", "Enviar Emails (Teste)");
  const body = document.getElementById("emailsTesteModal-body");

  body.innerHTML = `
    <label>Usuario do cliente</label>
    <input id="emailsTesteUsuario" type="text" placeholder="913162386">

    <div class="modal-actions" style="grid-template-columns: 1fr;">
      <button type="button" onclick="enviarEmailsTesteVencimento()">Enviar 2 emails (3d e 1d)</button>
    </div>

    <div id="emailsTesteResultado" style="margin-top:12px;"></div>
  `;

  modal.classList.remove("admin-hidden");
}

async function enviarEmailsTesteVencimento() {
  const token = verificarAdminLogado();
  if (!token) return;

  const usuario = String(document.getElementById("emailsTesteUsuario")?.value || "").trim();
  const resultado = document.getElementById("emailsTesteResultado");
  if (!resultado) return;

  resultado.innerHTML = `<p>Enviando...</p>`;

  try {
    const res = await fetch(`${API}/admin/teste-emails-vencimento`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token
      },
      body: JSON.stringify({ usuario })
    });

    const data = await res.json();

    if (!res.ok) {
      resultado.innerHTML = `<p class="erro">${escaparHtml(data.error || "Erro ao enviar emails.")}</p>`;
      return;
    }

    resultado.innerHTML = `<p class="sucesso">Emails de teste enviados para ${escaparHtml("suportesgiptv01@gmail.com")}.</p>`;
  } catch (error) {
    console.error(error);
    resultado.innerHTML = `<p class="erro">Erro ao enviar emails.</p>`;
  }
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
      <td colspan="6">Carregando...</td>
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
          <td colspan="6">Nenhum pagamento encontrado.</td>
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

      const botaoExcluir = `<button class="cancelar-btn" onclick="excluirPagamento(${pagamento.id})">Excluir</button>`;

      const botaoEditar = `<button onclick='abrirModalPagamentoDetalhes(${JSON.stringify(pagamento).replace(/</g,"\\u003c")})'>Editar</button>`;

      lista.innerHTML += `
        <tr>
          <td>${escaparHtml(pagamento.email || "-")}</td>
          <td>${escaparHtml(telefone)}</td>
          <td>${escaparHtml(pagamento.cliente_usuario || "-")}</td>
          <td>${escaparHtml(pagamento.cliente_senha || "-")}</td>
          <td><span class="${statusClass}">${escaparHtml(pagamento.status)}</span></td>
          <td>
            <button id="toggle-pagamento-${escaparHtml(pagamento.id)}" class="detalhe-btn" onclick="alternarDetalhesPagamento(${pagamento.id})">+</button>
          </td>
        </tr>
        <tr id="detalhes-pagamento-${escaparHtml(pagamento.id)}" class="detalhes-row admin-hidden">
          <td colspan="6">
            <div class="detalhes-grid">
              <div>
                <strong>Status</strong>
                <p class="${statusClass}">${escaparHtml(pagamento.status)}</p>
              </div>
              <div>
                <strong>Origem</strong>
                <p>${escaparHtml(pagamento.origem || (String(pagamento.payment_id || "").startsWith("DINHEIRO-") ? "dinheiro" : "pix"))}</p>
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
                <strong>Login</strong>
                <p>${escaparHtml(pagamento.cliente_usuario || "-")}</p>
              </div>
              <div>
                <strong>Senha</strong>
                <p>${escaparHtml(pagamento.cliente_senha || "-")}</p>
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
                  ${botaoEditar}
                  ${botaoExcluir}
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

  lista.innerHTML = `<tr><td colspan="8">Carregando...</td></tr>`;

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
      lista.innerHTML = `<tr><td colspan="8">Erro ao carregar testes.</td></tr>`;
      return;
    }

    if (dados.length === 0) {
      lista.innerHTML = `<tr><td colspan="8">Nenhum teste encontrado.</td></tr>`;
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
          <td><button type="button" onclick="excluirTesteIptv(${escaparHtml(t.id)})">Excluir</button></td>
        </tr>
      `;
    });

  } catch (error) {
    console.error(error);
    lista.innerHTML = `<tr><td colspan="8">Erro ao carregar testes.</td></tr>`;
  }
}

async function carregarClientes() {
  const token = verificarAdminLogado();
  const lista = document.getElementById("listaClientes");

  if (!token) return;
  if (!lista) return;

  lista.innerHTML = `<tr><td colspan="8">Carregando...</td></tr>`;

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
      lista.innerHTML = `<tr><td colspan="8">Erro ao carregar clientes.</td></tr>`;
      return;
    }

    if (dados.length === 0) {
      lista.innerHTML = `<tr><td colspan="8">Nenhum cliente encontrado.</td></tr>`;
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
      const nomeCliente = String(c.nome || "").trim();
      const loginCliente = String(c.usuario || "").trim();
      const senhaCliente = String(c.senha || "").trim();
      const textoWhatsapp =
        `Ola!${nomeCliente ? ` ${nomeCliente}` : ""}\n\n` +
        `Aqui e a equipe SG IPTV. Seu plano esta proximo de expirar.\n` +
        `Vencimento: ${vencimento}\n` +
        `Para renovar, acesse a Area do Cliente: https://sgiptv.com.br/cliente.html\n\n` +
        `Login: ${loginCliente}\n` +
        `Senha: ${senhaCliente}`;
      const linkWhatsapp = contato
        ? `https://wa.me/${contato}?text=${encodeURIComponent(textoWhatsapp)}`
        : "";
      const temContato = Boolean(c.nome || c.email || telefoneDigits);
      const textoEditar = temContato ? "Editar" : "Adicionar";

      lista.innerHTML += `
        <tr>
          <td>${escaparHtml(String(c.id ?? ""))}</td>
          <td>${escaparHtml(c.usuario)}</td>
          <td>${escaparHtml(c.senha)}</td>
          <td>${escaparHtml(c.plano)}</td>
          <td>${escaparHtml(c.conexoes)}</td>
          <td><span class="vencimento-badge ${vencimentoClasse}">${escaparHtml(vencimento)}</span></td>
          <td>
            <div class="cliente-contato">
              <div class="cliente-contato-resumo">${resumoContato || "-"}</div>
              <div class="cliente-contato-acoes">
                <button type="button" onclick="abrirModalCliente(${c.id}, '${escaparHtml(c.nome || "")}', '${escaparHtml(c.email || "")}', '${escaparHtml(c.telefone || "")}', ${c.conexoes ?? "null"}, '${escaparHtml(c.vencimento || "")}', '${escaparHtml(c.revendedor_codigo || "")}')">${textoEditar}</button>
                <button type="button" onclick="abrirModalDinheiroPreenchido({ email: '${escaparHtml(c.email || "")}', telefone: '${escaparHtml(c.telefone || "")}', plano: '${escaparHtml(c.plano || "")}', cliente_usuario: '${escaparHtml(c.usuario || "")}', cliente_senha: '${escaparHtml(c.senha || "")}' })">Dinheiro</button>
                ${contato ? `<a class="whatsapp-btn" target="_blank" rel="noopener noreferrer" href="${linkWhatsapp}">WhatsApp</a>` : `<span class="whatsapp-btn whatsapp-disabled">WhatsApp</span>`}
              </div>
            </div>
          </td>
          <td><button type="button" onclick="excluirCliente(${c.id})">Excluir</button></td>
        </tr>
      `;
    });

  } catch (error) {
    console.error(error);
    lista.innerHTML = `<tr><td colspan="7">Erro ao carregar clientes.</td></tr>`;
  }
}

async function excluirTesteIptv(id) {
  const token = verificarAdminLogado();
  if (!token) return;

  abrirModalConfirmacaoExclusao({
    titulo: "Excluir teste IPTV",
    mensagem: "Excluir este teste IPTV?",
    onConfirm: async () => {
      const res = await fetch(`${API}/testes-iptv/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: token }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || "Erro ao excluir.");
      carregarTestes();
    }
  });
}

async function excluirCliente(id) {
  const token = verificarAdminLogado();
  if (!token) return;

  abrirModalConfirmacaoExclusao({
    titulo: "Excluir cliente",
    mensagem: "Excluir este cliente?",
    onConfirm: async () => {
      const res = await fetch(`${API}/clientes/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: token }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || "Erro ao excluir.");
      carregarClientes();
    }
  });
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

        <label>Conexoes</label>
        <select id="modal-cliente-conexoes">
          <option value="">(manter)</option>
          <option value="1">1</option>
          <option value="2">2</option>
        </select>

        <label>Vencimento (opcional)</label>
        <input id="modal-cliente-vencimento" type="datetime-local">

        <label>Codigo do revendedor (opcional)</label>
        <input id="modal-cliente-revendedor" type="text" placeholder="Ex: ABC123">

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

function abrirModalCliente(id, nome, email, telefone, conexoes, vencimento, revendedorCodigo) {
  const modal = garantirModalCliente();

  document.getElementById("modal-cliente-id").value = String(id);
  document.getElementById("modal-cliente-nome").value = String(nome || "");
  document.getElementById("modal-cliente-email").value = String(email || "");
  document.getElementById("modal-cliente-tel").value = String(telefone || "");
  document.getElementById("modal-cliente-conexoes").value = conexoes != null ? String(conexoes) : "";

  // datetime-local espera "YYYY-MM-DDTHH:mm"
  const vInput = document.getElementById("modal-cliente-vencimento");
  if (vInput) {
    const raw = String(vencimento || "").trim();
    if (!raw) {
      vInput.value = "";
    } else {
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) {
        vInput.value = "";
      } else {
        const pad = (n) => String(n).padStart(2, "0");
        vInput.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      }
    }
  }

  const revInput = document.getElementById("modal-cliente-revendedor");
  if (revInput) revInput.value = String(revendedorCodigo || "");

  modal.classList.remove("admin-hidden");
}

async function excluirPagamento(id) {
  const token = verificarAdminLogado();
  if (!token) return;

  abrirModalConfirmacaoExclusao({
    titulo: "Excluir pagamento",
    mensagem: "Excluir este pagamento?",
    onConfirm: async () => {
      const res = await fetch(`${API}/pagamentos/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: token }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || "Erro ao excluir.");
      carregarPagamentos();
    }
  });
}

function garantirModalPagamentoDetalhes() {
  let modal = document.getElementById("pagamentoDetalhesModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "pagamentoDetalhesModal";
  modal.className = "modal-overlay admin-hidden";
  modal.innerHTML = `
    <div class="modal-card" role="dialog" aria-modal="true" aria-label="Editar Pagamento">
      <div class="modal-header">
        <strong>Editar Pagamento</strong>
        <button type="button" class="modal-close" onclick="fecharModalPagamentoDetalhes()">X</button>
      </div>

      <div class="modal-body">
        <input id="pagdetId" type="hidden">

        <label>Email (do cadastro)</label>
        <input id="pagdetEmail" type="email" placeholder="cliente@email.com">

        <label>WhatsApp (do cadastro)</label>
        <input id="pagdetTel" type="text" placeholder="11912345678">

        <label>Login do cliente</label>
        <input id="pagdetUsuario" type="text" placeholder="usuario">

        <label>Senha (preenche automatico se encontrar no cadastro)</label>
        <input id="pagdetSenha" type="text" placeholder="senha">

        <label>Origem</label>
        <select id="pagdetOrigem">
          <option value="">(manter)</option>
          <option value="pix">pix</option>
          <option value="dinheiro">dinheiro</option>
        </select>

        <div class="modal-actions" style="grid-template-columns: 1fr 1fr; gap:10px;">
          <button type="button" onclick="buscarDadosClienteParaPagamento()">Buscar no cadastro</button>
          <button type="button" onclick="salvarPagamentoDetalhes()">Salvar</button>
        </div>

        <div id="pagdetMsg" style="margin-top:12px;"></div>
      </div>
    </div>
  `;

  modal.addEventListener("click", (event) => {
    if (event.target === modal) fecharModalPagamentoDetalhes();
  });

  document.body.appendChild(modal);
  return modal;
}

function abrirModalPagamentoDetalhes(pagamento) {
  const modal = garantirModalPagamentoDetalhes();

  const setVal = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.value = v == null ? "" : String(v);
  };

  setVal("pagdetId", pagamento?.id || "");
  setVal("pagdetEmail", pagamento?.email || "");
  setVal("pagdetTel", pagamento?.telefone || "");
  setVal("pagdetUsuario", pagamento?.cliente_usuario || "");
  setVal("pagdetSenha", pagamento?.cliente_senha || "");
  setVal("pagdetOrigem", pagamento?.origem || "");

  const msg = document.getElementById("pagdetMsg");
  if (msg) msg.textContent = "";

  modal.classList.remove("admin-hidden");
}

function fecharModalPagamentoDetalhes() {
  const modal = document.getElementById("pagamentoDetalhesModal");
  if (!modal) return;
  modal.classList.add("admin-hidden");
}

async function buscarDadosClienteParaPagamento() {
  const token = verificarAdminLogado();
  if (!token) return;

  const msg = document.getElementById("pagdetMsg");
  if (msg) msg.textContent = "Buscando...";

  const usuario = String(document.getElementById("pagdetUsuario")?.value || "").trim();
  if (!usuario) {
    if (msg) msg.innerHTML = `<p class="erro">Informe o login do cliente.</p>`;
    return;
  }

  try {
    // Busca lista de clientes e tenta achar pelo usuario.
    const res = await fetch(`${API}/clientes`, { headers: { Authorization: token } });
    const lista = await res.json();
    if (!res.ok) throw new Error(lista.detail || lista.error || "Erro ao buscar clientes.");

    const cliente = Array.isArray(lista)
      ? lista.find(c => String(c.usuario || "").trim() === usuario)
      : null;

    if (!cliente) {
      if (msg) msg.innerHTML = `<p class="erro">Cliente nao encontrado no cadastro.</p>`;
      return;
    }

    const senhaEl = document.getElementById("pagdetSenha");
    if (senhaEl && cliente.senha) senhaEl.value = String(cliente.senha);

    const emailEl = document.getElementById("pagdetEmail");
    if (emailEl && cliente.email) emailEl.value = String(cliente.email);

    const telEl = document.getElementById("pagdetTel");
    if (telEl && cliente.telefone) telEl.value = String(cliente.telefone);

    if (msg) msg.innerHTML = `<p style="color:#22c55e;"><strong>OK:</strong> dados carregados do cliente.</p>`;
  } catch (e) {
    if (msg) msg.innerHTML = `<p class="erro">${escaparHtml(e.message)}</p>`;
  }
}

async function salvarPagamentoDetalhes() {
  const token = verificarAdminLogado();
  if (!token) return;

  const msg = document.getElementById("pagdetMsg");
  if (msg) msg.textContent = "Salvando...";

  const id = String(document.getElementById("pagdetId")?.value || "").trim();
  const email = String(document.getElementById("pagdetEmail")?.value || "").trim().toLowerCase();
  const telefone = String(document.getElementById("pagdetTel")?.value || "").replace(/\\D/g, "");
  const cliente_usuario = String(document.getElementById("pagdetUsuario")?.value || "").trim();
  const cliente_senha = String(document.getElementById("pagdetSenha")?.value || "").trim();
  const origem = String(document.getElementById("pagdetOrigem")?.value || "").trim();

  if (!id) {
    if (msg) msg.innerHTML = `<p class="erro">Pagamento invalido.</p>`;
    return;
  }
  if (!cliente_usuario) {
    if (msg) msg.innerHTML = `<p class="erro">Informe o login do cliente.</p>`;
    return;
  }

  try {
    const res = await fetch(`${API}/pagamentos/${encodeURIComponent(id)}/detalhes`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: token },
      body: JSON.stringify({
        cliente_usuario: cliente_usuario || null,
        cliente_senha: cliente_senha || null,
        email: email || null,
        telefone: telefone || null,
        origem: origem || null
      })
    });

    const payload = await res.json();
    if (!res.ok) throw new Error(payload.detail || payload.error || "Erro ao salvar.");

    if (msg) msg.innerHTML = `<p style="color:#22c55e;"><strong>Salvo!</strong></p>`;
    carregarPagamentos();
  } catch (e) {
    if (msg) msg.innerHTML = `<p class="erro">${escaparHtml(e.message)}</p>`;
  }
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
  const conexoes = document.getElementById("modal-cliente-conexoes")?.value;
  const vencimento = document.getElementById("modal-cliente-vencimento")?.value || "";
  const revendedor_codigo = document.getElementById("modal-cliente-revendedor")?.value || "";

  try {
    const res = await fetch(`${API}/clientes/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: token
      },
      body: JSON.stringify({ nome, email, telefone, conexoes, vencimento: vencimento || null, revendedor_codigo: String(revendedor_codigo || "").trim() || null })
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

// ===== FARM (Fazendinha Online) =====
function abrirFarmLogin() { window.open("https://sgiptv.com.br/farm/login", "_blank"); }

function baixarFarmApk() {
  const el = document.getElementById("farmApkFile");
  const file = (el && el.value ? String(el.value) : "fazendinha-online-latest.apk").trim();
  const safe = /^[a-z0-9._-]+$/i.test(file) ? file : "fazendinha-online-latest.apk";
  const url = "https://sgiptv.com.br/farm/download/" + safe;

  const box = document.getElementById("farmApkUrl");
  if (box) box.textContent = url;

  // Verifica se existe antes de abrir (melhor UX)
  fetch(url, { method: "HEAD", cache: "no-store" })
    .then((r) => {
      if (!r.ok) {
        alert("APK ainda nao esta no servidor (HTTP " + r.status + ").\\n\\nEnvie o arquivo para /farm/download/ com esse nome.");
        return;
      }
      window.open(url, "_blank");
    })
    .catch(() => {
      // fallback: tenta abrir mesmo assim
      window.open(url, "_blank");
    });
}

async function carregarFarmUsuarios() {
  const box = document.getElementById("farmJogadores");
  if (!box) return;
  box.innerHTML = `<div style="padding:12px; color:rgba(255,255,255,.75);">Carregando...</div>`;

  try {
    const res = await fetch("https://sgiptv.com.br/farm/api/admin/users", { credentials: "include", cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

    const users = Array.isArray(data.users) ? data.users : [];
    const rows = users.map((u) => {
      const banido = Boolean(u.banido_em);
      const status = banido ? `<span style="color:#ef4444; font-weight:900;">BANIDO</span>` : `<span style="color:#22c55e; font-weight:900;">OK</span>`;
      const created = u.criado_em ? new Date(u.criado_em).toLocaleString("pt-BR") : "-";
      const last = u.ultimo_login_em ? new Date(u.ultimo_login_em).toLocaleString("pt-BR") : "-";
      const safeLogin = escaparHtml(u.login);
      const safeEmail = escaparHtml(u.email);
      const btn = banido
        ? `<button type="button" onclick="farmUnbanUser(${Number(u.id)})">Desbanir</button>`
        : `<button type="button" onclick="farmBanUserPrompt(${Number(u.id)}, '${safeLogin.replace(/'/g, \"&#39;\")}')">Banir</button>`;
      return `
        <tr>
          <td>${Number(u.id)}</td>
          <td>${safeLogin}</td>
          <td>${safeEmail}</td>
          <td>${created}</td>
          <td>${last}</td>
          <td>${status}</td>
          <td>${btn}</td>
        </tr>
      `;
    }).join("");

    box.innerHTML = `
      <div class="tabela-area" style="margin-top:0;">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Login</th>
              <th>Email</th>
              <th>Criado</th>
              <th>Ultimo login</th>
              <th>Status</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>${rows || `<tr><td colspan="7" style="padding:12px; opacity:.8;">Nenhum jogador.</td></tr>`}</tbody>
        </table>
      </div>
    `;
  } catch (e) {
    box.innerHTML = `<div style="padding:12px; color:#ef4444; font-weight:900;">Erro ao carregar jogadores: ${escaparHtml(e.message)}</div>`;
  }
}

async function farmBanUserPrompt(id, login) {
  const motivo = window.prompt(`Banir \"${login}\"? Motivo (opcional):`, "");
  if (motivo === null) return;
  try {
    const body = new URLSearchParams();
    if (motivo) body.set("motivo", motivo);
    const res = await fetch(`https://sgiptv.com.br/farm/api/admin/users/${encodeURIComponent(id)}/ban`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    await carregarFarmUsuarios();
  } catch (e) {
    alert(e.message || "Erro ao banir");
  }
}

async function farmUnbanUser(id) {
  if (!confirm("Desbanir este jogador?")) return;
  try {
    const res = await fetch(`https://sgiptv.com.br/farm/api/admin/users/${encodeURIComponent(id)}/unban`, {
      method: "POST",
      credentials: "include"
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    await carregarFarmUsuarios();
  } catch (e) {
    alert(e.message || "Erro ao desbanir");
  }
}
