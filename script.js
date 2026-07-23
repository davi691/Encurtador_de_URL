(() => {
  "use strict";

  // Agora os links são criados e guardados pelo servidor (server.js),
  // não mais só no navegador. Isso é o que faz o link curto funcionar
  // de verdade para qualquer pessoa que clicar nele.
  const API_BASE = ""; // mesmo host que serviu esta página (ex: http://localhost:3000)

  const els = {
    domainInput: document.getElementById("customDomain"),
    slugPrefix: document.getElementById("slugPrefix"),
    form: document.getElementById("shortenForm"),
    longUrl: document.getElementById("longUrl"),
    customSlug: document.getElementById("customSlug"),
    linkVisual: document.getElementById("linkVisual"),
    formError: document.getElementById("formError"),
    resultCard: document.getElementById("resultCard"),
    resultShort: document.getElementById("resultShort"),
    resultOriginal: document.getElementById("resultOriginal"),
    btnCopy: document.getElementById("btnCopy"),
    manifestList: document.getElementById("manifestList"),
    manifestEmpty: document.getElementById("manifestEmpty"),
    btnClear: document.getElementById("btnClear"),
  };

  // ---------- domain field ----------
  // Isso é só cosmético, para você visualizar o prefixo enquanto digita o
  // apelido. O link que REALMENTE funciona é sempre o do host que está
  // servindo a página (window.location.origin) — que passa a ser o seu
  // domínio automaticamente quando você publicar o servidor lá.
  function currentHost() {
    return window.location.host;
  }

  function refreshDomainUI() {
    const saved = localStorage.getItem("linka:domain-label");
    els.domainInput.value = saved || "";
    els.domainInput.placeholder = currentHost();
    els.slugPrefix.textContent = `${saved || currentHost()}/`;
  }

  els.domainInput.addEventListener("input", () => {
    const value = els.domainInput.value.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    localStorage.setItem("linka:domain-label", value);
    els.slugPrefix.textContent = `${value || currentHost()}/`;
  });

  // ---------- validation ----------
  function isValidUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }

  // ---------- render ----------
  function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  async function fetchLinks() {
    try {
      const res = await fetch(`${API_BASE}/api/links`);
      if (!res.ok) return [];
      const data = await res.json(); // { code: { original, createdAt, clicks } }
      return Object.entries(data)
        .map(([code, entry]) => ({ code, ...entry }))
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } catch {
      return [];
    }
  }

  async function renderManifest() {
    const links = await fetchLinks();
    els.manifestList.innerHTML = "";

    if (links.length === 0) {
      els.manifestEmpty.hidden = false;
      return;
    }
    els.manifestEmpty.hidden = true;

    links
      .slice()
      .reverse()
      .forEach((link, i) => {
        const li = document.createElement("li");
        li.className = "manifest-item";
        li.innerHTML = `
          <span class="item-index">${String(links.length - i).padStart(2, "0")}</span>
          <span class="item-body">
            <span class="item-short">${currentHost()}/${link.code}</span>
            <span class="item-long" title="${escapeHtml(link.original)}">${escapeHtml(link.original)} · ${formatDate(link.createdAt)} · ${link.clicks} clique(s)</span>
          </span>
          <span class="item-actions">
            <button type="button" data-action="copy" data-code="${link.code}" title="Copiar link">
              <svg width="14" height="14" viewBox="0 0 15 15" fill="none"><rect x="4.5" y="4.5" width="8" height="8" rx="1.4" stroke="currentColor" stroke-width="1.3"/><path d="M2.5 9.5v-6A1 1 0 0 1 3.5 2.5h6" stroke="currentColor" stroke-width="1.3"/></svg>
            </button>
            <button type="button" class="danger" data-action="delete" data-code="${link.code}" title="Remover">
              <svg width="14" height="14" viewBox="0 0 15 15" fill="none"><path d="M3 4.5h9M6 4.5V3a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1.5M4.5 4.5l.6 8a1 1 0 0 0 1 .9h4.8a1 1 0 0 0 1-.9l.6-8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
            </button>
          </span>
        `;
        els.manifestList.appendChild(li);
      });
  }

  // ---------- form submit ----------
  els.form.addEventListener("submit", async (e) => {
    e.preventDefault();
    els.formError.textContent = "";

    const originalUrl = els.longUrl.value.trim();
    const customSlug = els.customSlug.value.trim();

    if (!isValidUrl(originalUrl)) {
      els.formError.textContent = "Cole um link válido, começando com http:// ou https://";
      return;
    }

    els.linkVisual.classList.add("is-active");

    try {
      const res = await fetch(`${API_BASE}/api/shorten`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: originalUrl, slug: customSlug || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        els.formError.textContent = data.error || "Não deu para encurtar esse link. Tente de novo.";
        els.linkVisual.classList.remove("is-active");
        return;
      }

      setTimeout(async () => {
        showResult({ code: data.code, original: originalUrl });
        await renderManifest();
        els.form.reset();
        els.linkVisual.classList.remove("is-active");
      }, 480);
    } catch {
      els.formError.textContent = "Não consegui falar com o servidor. Ele está rodando (node server.js)?";
      els.linkVisual.classList.remove("is-active");
    }
  });

  function showResult(link) {
    els.resultCard.hidden = false;
    els.resultShort.textContent = `${currentHost()}/${link.code}`;
    els.resultOriginal.textContent = link.original;
    els.btnCopy.dataset.code = link.code;
    els.btnCopy.classList.remove("is-copied");
    els.btnCopy.querySelector("span").textContent = "copiar";
    els.resultCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const temp = document.createElement("textarea");
      temp.value = text;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand("copy");
      document.body.removeChild(temp);
      return true;
    }
  }

  els.btnCopy.addEventListener("click", async () => {
    const url = `${window.location.origin}/${els.btnCopy.dataset.code}`;
    await copyToClipboard(url);
    els.btnCopy.classList.add("is-copied");
    els.btnCopy.querySelector("span").textContent = "copiado";
    setTimeout(() => {
      els.btnCopy.classList.remove("is-copied");
      els.btnCopy.querySelector("span").textContent = "copiar";
    }, 1600);
  });

  els.manifestList.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    if (btn.dataset.action === "copy") {
      const url = `${window.location.origin}/${btn.dataset.code}`;
      await copyToClipboard(url);
      btn.style.color = "var(--accent)";
      setTimeout(() => (btn.style.color = ""), 1000);
    }

    if (btn.dataset.action === "delete") {
      await fetch(`${API_BASE}/api/links/${btn.dataset.code}`, { method: "DELETE" });
      await renderManifest();
    }
  });

  els.btnClear.addEventListener("click", async () => {
    const links = await fetchLinks();
    if (links.length === 0) return;
    if (confirm("Remover todos os links encurtados?")) {
      await Promise.all(links.map((l) => fetch(`${API_BASE}/api/links/${l.code}`, { method: "DELETE" })));
      await renderManifest();
    }
  });

  // ---------- init ----------
  refreshDomainUI();
  renderManifest();
})();
