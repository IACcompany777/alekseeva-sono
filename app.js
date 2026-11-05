(function () {
  const { categories, prices, packages, reviews } = window.SITE;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const money = (n) => n.toLocaleString("uk-UA").replace(/\s/g, " ") + " грн";
  const byId = Object.fromEntries(prices.map((p) => [p.id, p]));
  const fullPrice = (pack) => pack.items.reduce((s, id) => s + byId[id].price, 0);

  document.documentElement.classList.add("js");

  /* числа в шапці й на картках завжди беруться з прайсу */
  const minOf = (cat) => Math.min(...prices.filter((p) => p.cat === cat).map((p) => p.price));
  $("#factCount").textContent = prices.length;
  $("#factMin").textContent = Math.min(...prices.map((p) => p.price));
  $$("[data-min]").forEach((el) => (el.textContent = minOf(el.dataset.min)));

  /* пакети */
  const selected = new Set();
  $("#packs").innerHTML = packages
    .map((p, i) => {
      const full = fullPrice(p);
      return `<li><button class="pack" type="button" data-pack="${i}" aria-pressed="false">
        <span class="pack__name">${p.name}</span>
        <span class="pack__row"><b>${money(p.price)}</b><s>${money(full)}</s><em>−${money(full - p.price)}</em></span>
      </button></li>`;
    })
    .join("");

  /* прайс */
  let activeCat = "all";
  let query = "";

  const chips = [{ id: "all", label: "Усі" }, ...categories];
  $("#chips").innerHTML = chips
    .map((c) => `<button class="chip" type="button" data-cat="${c.id}" aria-pressed="${c.id === "all"}">${c.label}</button>`)
    .join("");

  /* пошук за основою слова: "серце" знаходить "серця", "нирки" — "нирок" */
  const aliases = { щитовид: "щитоподіб", печін: "черевн", живіт: "черевн", живот: "черевн", щитовка: "щитоподіб" };
  const stem = (w) => {
    for (const a in aliases) if (w.startsWith(a)) return aliases[a];
    return w.length >= 5 ? w.slice(0, -2) : w.length === 4 ? w.slice(0, -1) : w;
  };
  const matches = (name, words) => words.every((w) => name.includes(w));

  function renderList() {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean).map(stem);
    let html = "";
    let found = 0;
    for (const cat of categories) {
      if (activeCat !== "all" && activeCat !== cat.id) continue;
      const rows = prices.filter((p) => p.cat === cat.id && matches(p.name.toLowerCase(), words));
      if (!rows.length) continue;
      found += rows.length;
      html += `<p class="group">${cat.label}</p>`;
      html += rows
        .map(
          (p) => `<label class="row">
            <input type="checkbox" data-id="${p.id}" ${selected.has(p.id) ? "checked" : ""}>
            <span class="row__name">${p.name}</span>
            <span class="row__price">${money(p.price)}</span>
          </label>`
        )
        .join("");
    }
    $("#list").innerHTML = html;
    $("#list").hidden = !found;
    $("#empty").hidden = !!found;
  }

  /* найвигідніша комбінація пакетів, що не перетинаються, серед обраного */
  function bestPackages() {
    const fit = packages.filter((p) => p.items.every((id) => selected.has(id)));
    let best = { saving: 0, used: [] };
    (function walk(i, taken, used, saving) {
      if (saving > best.saving) best = { saving, used: [...used] };
      for (let k = i; k < fit.length; k++) {
        const p = fit[k];
        if (p.items.some((id) => taken.has(id))) continue;
        walk(k + 1, new Set([...taken, ...p.items]), [...used, p], saving + fullPrice(p) - p.price);
      }
    })(0, new Set(), [], 0);
    return best;
  }

  function renderTally() {
    const n = selected.size;
    $("#tally").hidden = !n;
    const sum = [...selected].reduce((s, id) => s + byId[id].price, 0);
    const { saving, used } = bestPackages();
    $("#tSum").textContent = money(sum - saving);
    const count = n === 1 ? "1 дослідження" : `${n} дослідження`.replace(/^(\d*[05-9]|\d*1\d) дослідження$/, "$1 досліджень");
    $("#tMeta").textContent = saving
      ? `${count} · пакетом дешевше на ${money(saving)}`
      : `${count} · орієнтовна сума`;
    $$(".pack").forEach((b) => {
      const on = used.includes(packages[+b.dataset.pack]);
      b.setAttribute("aria-pressed", on);
    });
  }

  function setCat(id) {
    activeCat = id;
    $$(".chip").forEach((c) => c.setAttribute("aria-pressed", c.dataset.cat === id));
    renderList();
  }

  $("#chips").addEventListener("click", (e) => {
    const c = e.target.closest(".chip");
    if (c) setCat(c.dataset.cat);
  });
  $("#q").addEventListener("input", (e) => {
    query = e.target.value;
    renderList();
  });
  $("#list").addEventListener("change", (e) => {
    if (!e.target.dataset.id) return;
    e.target.checked ? selected.add(e.target.dataset.id) : selected.delete(e.target.dataset.id);
    renderTally();
  });
  $("#packs").addEventListener("click", (e) => {
    const b = e.target.closest(".pack");
    if (!b) return;
    const p = packages[+b.dataset.pack];
    const on = b.getAttribute("aria-pressed") === "true";
    p.items.forEach((id) => (on ? selected.delete(id) : selected.add(id)));
    renderList();
    renderTally();
  });
  $("#tClear").addEventListener("click", () => {
    selected.clear();
    renderList();
    renderTally();
  });
  $$("[data-filter]").forEach((a) => a.addEventListener("click", () => {
    query = "";
    $("#q").value = "";
    setCat(a.dataset.filter);
  }));

  renderList();

  /* відгуки */
  $("#reviewList").innerHTML = reviews
    .map(
      (r) => `<article class="review reveal">
        <span class="review__topic">${r.topic}</span>
        <p>${r.text}</p>
        <footer><span>${r.source}</span>${r.stars ? '<span class="stars" role="img" aria-label="5 із 5">★★★★★</span>' : ""}</footer>
      </article>`
    )
    .join("");

  /* меню */
  const burger = $(".burger");
  const nav = $("#nav");
  const toggle = (open) => {
    nav.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", open);
  };
  burger.addEventListener("click", () => toggle(!nav.classList.contains("is-open")));
  nav.addEventListener("click", (e) => e.target.closest("a") && toggle(false));

  /* тінь шапки та поява блоків */
  const top = $(".top");
  addEventListener("scroll", () => top.classList.toggle("is-stuck", scrollY > 8), { passive: true });

  $$(".card, .pack, .doctor__text, .doctor__photos, .steps").forEach((el) => el.classList.add("reveal"));
  const items = $$(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((list) => {
      list.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: "0px 0px -6% 0px" });
    items.forEach((el) => io.observe(el));
  } else {
    items.forEach((el) => el.classList.add("is-in"));
  }
})();
