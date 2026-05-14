const API = "https://api.sgiptv.com.br";

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
  // Padrao atual: "revendedor_token". Compat: builds antigos usavam "rev_token".
  return localStorage.getItem("revendedor_token") || localStorage.getItem("rev_token");
}

function setTokenRevendedor(token) {
  if (!token) return;
  // Mantem ambas as chaves para compatibilidade.
  localStorage.setItem("revendedor_token", token);
  localStorage.setItem("rev_token", token);
}

function limparTokenRevendedor() {
  localStorage.removeItem("revendedor_token");
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
    const senha2 = String(document.getElementById("cadRevSenha2")?.value || "").trim();
    const nome = String(document.getElementById("cadRevNome")?.value || "").trim();
    const cpf = String(document.getElementById("cadRevCpf")?.value || "").replace(/\D/g, "");
    const banco = String(document.getElementById("cadRevBanco")?.value || "").trim();

    if (!senha || senha.length < 4) {
      msg.innerHTML = `<p style="color:#ef4444;">Defina uma senha valida.</p>`;
      return;
    }

    if (senha !== senha2) {
      msg.innerHTML = `<p style="color:#ef4444;">As senhas nao conferem.</p>`;
      return;
    }

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
            <h3>Comissao pendente</h3>
            <p><strong>${formatarDinheiro(data.resumo.total_pendente)}</strong></p>
          </div>
        </div>
        <div class="grid-2" style="margin-top:12px;">
          <div class="info-card">
            <h3>Clientes ativos no mes</h3>
            <p><strong>${escaparHtml(data.resumo.clientes_ativos_mes)}</strong></p>
          </div>
          <div class="info-card">
            <h3>Bonus do mes <button type="button" title="Regras" style="margin-left:6px;" onclick="mostrarInfoComissaoBonus()">+</button></h3>
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
      lista.innerHTML = `<tr><td colspan="6">Nenhuma comissao ainda.</td></tr>`;
      return;
    }

    // Agrupa comissoes pagas por (transacao_id + comprovante) para aparecer 1 linha por comprovante.
    // As pendentes ficam 1 por linha (ainda nao tem comprovante).
    const pendentes = itens.filter((c) => c.status !== "pago");
    const pagas = itens.filter((c) => c.status === "pago");

    const pagasAgrupadas = (() => {
      const map = new Map();
      for (const c of pagas) {
        const transacaoId = c && c.transacao_id ? String(c.transacao_id) : "-";
        const comprovante = c && c.comprovante_nome ? String(c.comprovante_nome) : "-";
        const key = `${transacaoId}||${comprovante}`;
        const atual = map.get(key) || {
          pago_em: c.pago_em || c.criado_em,
          status: c.status || "pago",
          transacao_id: transacaoId,
          comprovante_nome: comprovante,
          total: 0,
          total_primeira: 0,
          total_renovacao: 0,
          // usamos um id do grupo para baixar comprovante
          any_id: c.id,
        };

        const v = Number(c.valor) || 0;
        atual.total += v;
        if (c.tipo === "primeira_compra") atual.total_primeira += v;
        else if (c.tipo === "renovacao") atual.total_renovacao += v;

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

    const linhasPendentes = pendentes.map((c) => {
      const tipo = c.tipo === "primeira_compra" ? "primeira_compra" : (c.tipo || "-");
      return `
        <tr>
          <td>${escaparHtml(formatarData(c.criado_em))}</td>
          <td>${escaparHtml(tipo)}</td>
          <td><strong>${formatarDinheiro(c.valor)}</strong></td>
          <td>${escaparHtml(c.status || "-")}</td>
          <td>${escaparHtml(String(c.transacao_id || "-"))}</td>
          <td>-</td>
        </tr>
      `;
    }).join("");

    const linhasPagas = pagasAgrupadas.map((c) => {
      const parts = [];
      if (c.total_primeira > 0) parts.push(`Primeira venda: ${formatarDinheiro(c.total_primeira)}`);
      if (c.total_renovacao > 0) parts.push(`Renovacao: ${formatarDinheiro(c.total_renovacao)}`);
      const tipoResumo = parts.length ? parts.join(" | ") : "-";
      const btnComprovante = (c.comprovante_nome && c.comprovante_nome !== "-")
        ? `<button type="button" class="btn-sm" onclick="verComprovanteComissao(${Number(c.any_id)})">Ver comprovante</button>`
        : "-";

      return `
        <tr>
          <td>${escaparHtml(formatarData(c.pago_em))}</td>
          <td>${escaparHtml(c.status || "pago")}</td>
          <td>${escaparHtml(tipoResumo)}</td>
          <td><strong>${formatarDinheiro(c.total)}</strong></td>
          <td>${escaparHtml(String(c.transacao_id || "-"))}</td>
          <td>
            <div class="comprovante-cell">
              ${btnComprovante === "-" ? "" : btnComprovante}
              <span class="comprovante-name">${escaparHtml(String(c.comprovante_nome || "-"))}</span>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    const html = `${linhasPendentes}${linhasPagas}`;
    lista.innerHTML = html || `<tr><td colspan="6">Nenhuma comissao ainda.</td></tr>`;

    // Bonus
    const listaBonus = document.getElementById("revListaBonus");
    if (listaBonus) {
      listaBonus.innerHTML = `<tr><td colspan="6">Carregando...</td></tr>`;
      const resB = await fetch(`${API}/revendedor/bonus`, { headers: { Authorization: token } });
      const dataB = await resB.json().catch(() => ({}));
      if (!resB.ok) throw new Error(dataB.error || "Erro ao carregar bonus.");

      const bonus = Array.isArray(dataB.bonus) ? dataB.bonus : [];
      if (bonus.length === 0) {
        listaBonus.innerHTML = `<tr><td colspan="6">Sem bonus pago.</td></tr>`;
      } else {
        listaBonus.innerHTML = bonus.slice(0, 24).map((b) => {
          const btn = (b.comprovante_nome && b.comprovante_nome !== "-" && b.id)
            ? `<button type="button" class="btn-sm" onclick="verComprovanteBonus(${Number(b.id)})">Ver comprovante</button>`
            : "";
          const dataRef = b.pago_em || b.criado_em || b.mes || "-";
          return `
            <tr>
              <td>${escaparHtml(formatarData(dataRef))}</td>
              <td>${escaparHtml(b.status || "-")}</td>
              <td>${escaparHtml("Bonus")}</td>
              <td><strong>${formatarDinheiro(b.valor)}</strong></td>
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
      }
    }
  } catch (e) {
    limparTokenRevendedor();
  }
}

async function verComprovanteComissao(comissaoId) {
  const token = getTokenRevendedor();
  if (!token) return;
  try {
    const res = await fetch(`${API}/revendedor/comissoes/${comissaoId}/comprovante`, {
      headers: { Authorization: token }
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Nao foi possivel abrir o comprovante.");
    }
    const blob = await res.blob();
    const dispo = res.headers.get("content-disposition") || "";
    const match = dispo.match(/filename=\"?([^\";]+)\"?/i);
    const filename = match ? match[1] : `comprovante-${comissaoId}.pdf`;

    const url = window.URL.createObjectURL(blob);
    const isImage = /^image\//i.test(blob.type || "");
    const isPdf = /pdf/i.test(blob.type || "") || String(filename).toLowerCase().endsWith(".pdf");
    const pdfContainerId = `revPdfViewer_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;

    const viewer = isImage
      ? `<img src="${url}" alt="Comprovante" style="max-width:100%; height:auto; border-radius:10px; display:block; margin:0 auto;" />`
      : isPdf
        ? `<div id="${pdfContainerId}" style="width:100%; height:82vh; border-radius:10px; background:#0b1220; overflow:auto; display:flex; align-items:flex-start; justify-content:center; padding:12px;"></div>`
        : `<iframe src="${url}" style="width:100%; height:82vh; border:0; border-radius:10px; background:#0b1220;"></iframe>`;

    // Modal simples (reaproveita estilos do admin)
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.style.display = "flex";
    overlay.innerHTML = `
      <div class="modal-card" role="dialog" aria-modal="true" aria-label="Comprovante" style="max-width: 1400px; width: min(1400px, 98vw);">
        <div class="modal-top">
          <div class="modal-title">Comprovante</div>
          <button class="modal-close" type="button" aria-label="Fechar">X</button>
        </div>
        <div style="margin: 10px 0; display:flex; align-items:center; justify-content:space-between; gap:10px;">
          <div style="opacity:.9; font-size:14px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
            ${escaparHtml(filename)}
          </div>
        </div>
        ${viewer}
      </div>
    `;
    document.body.appendChild(overlay);

    const fechar = () => {
      overlay.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 0);
    };
    overlay.addEventListener("click", (ev) => {
      if (ev.target === overlay) fechar();
    });
    overlay.querySelector(".modal-close")?.addEventListener("click", fechar);

    if (isPdf) {
      setTimeout(async () => {
        const el = document.getElementById(pdfContainerId);
        if (!el) return;
        try {
          await renderPdfComoImagemRevendedor(blob, el);
        } catch {
          el.innerHTML = `<div style="color:#e2e8f0; opacity:.9; padding:14px;">Nao foi possivel renderizar o PDF aqui.</div>`;
        }
      }, 0);
    }
  } catch (e) {
    alert(e.message || "Erro ao baixar comprovante.");
  }
}

async function verComprovanteBonus(bonusId) {
  const token = getTokenRevendedor();
  if (!token) return;
  try {
    const res = await fetch(`${API}/revendedor/bonus/${bonusId}/comprovante`, {
      headers: { Authorization: token }
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Nao foi possivel abrir o comprovante.");
    }

    const blob = await res.blob();
    const dispo = res.headers.get("content-disposition") || "";
    const match = dispo.match(/filename=\"?([^\";]+)\"?/i);
    const filename = match ? match[1] : `bonus-${bonusId}.pdf`;

    const url = window.URL.createObjectURL(blob);
    const isImage = /^image\//i.test(blob.type || "");
    const isPdf = /pdf/i.test(blob.type || "") || String(filename).toLowerCase().endsWith(".pdf");
    const pdfContainerId = `revPdfViewerB_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;

    const viewer = isImage
      ? `<img src="${url}" alt="Comprovante" style="max-width:100%; height:auto; border-radius:10px; display:block; margin:0 auto;" />`
      : isPdf
        ? `<div id="${pdfContainerId}" style="width:100%; height:82vh; border-radius:10px; background:#0b1220; overflow:auto; display:flex; align-items:flex-start; justify-content:center; padding:12px;"></div>`
        : `<iframe src="${url}" style="width:100%; height:82vh; border:0; border-radius:10px; background:#0b1220;"></iframe>`;

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.style.display = "flex";
    overlay.innerHTML = `
      <div class="modal-card" role="dialog" aria-modal="true" aria-label="Comprovante" style="max-width: 1400px; width: min(1400px, 98vw);">
        <div class="modal-top">
          <div class="modal-title">Comprovante (Bonus)</div>
          <button class="modal-close" type="button" aria-label="Fechar">X</button>
        </div>
        <div style="margin: 10px 0;">
          <div style="opacity:.9; font-size:14px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
            ${escaparHtml(filename)}
          </div>
        </div>
        ${viewer}
      </div>
    `;
    document.body.appendChild(overlay);

    const fechar = () => {
      overlay.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 0);
    };
    overlay.addEventListener("click", (ev) => {
      if (ev.target === overlay) fechar();
    });
    overlay.querySelector(".modal-close")?.addEventListener("click", fechar);

    if (isPdf) {
      setTimeout(async () => {
        const el = document.getElementById(pdfContainerId);
        if (!el) return;
        try {
          await renderPdfComoImagemRevendedor(blob, el);
        } catch {
          el.innerHTML = `<div style="color:#e2e8f0; opacity:.9; padding:14px;">Nao foi possivel renderizar o PDF aqui.</div>`;
        }
      }, 0);
    }
  } catch (e) {
    alert(e.message || "Erro ao abrir comprovante.");
  }
}

async function carregarPdfJsSePrecisoRevendedor() {
  if (window.pdfjsLib && window.pdfjsLib.getDocument) return window.pdfjsLib;
  await new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "assets/vendor/pdfjs/pdf.min.js";
    s.onload = resolve;
    s.onerror = () => reject(new Error("Falha ao carregar PDF.js"));
    document.head.appendChild(s);
  });
  const lib = window.pdfjsLib;
  if (!lib || !lib.getDocument) throw new Error("PDF.js indisponivel");
  lib.GlobalWorkerOptions.workerSrc = "assets/vendor/pdfjs/pdf.worker.min.js";
  return lib;
}

async function renderPdfComoImagemRevendedor(pdfBlob, containerEl) {
  const pdfjs = await carregarPdfJsSePrecisoRevendedor();
  const buf = await pdfBlob.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const page = await doc.getPage(1);

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

function sairRevendedor() {
  limparTokenRevendedor();
  window.location.reload();
}

function mostrarInfoComissaoBonus() {
  alert(
    [
      "Regras de comissao/bonus:",
      "",
      "- Primeira venda: valor fixo por plano (ex.: Mensal 1 tela = R$ 10,00).",
      "- Renovacao: 10% do valor do plano.",
      "- Bonus: se tiver mais de 10 vendas ativas no mes, ganha R$ 50,00."
    ].join("\n")
  );
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
