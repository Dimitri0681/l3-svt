"use strict";
// Pages de chapitre : chaque page déclare CHAPITRE (mot court) et VIDEOS avant de charger ce fichier.
// VIDEOS : [identifiant Vimeo, titre, durée "m:ss", lien de téléchargement du paquet Anki ("" = bientôt)].

const ICONES = {
  lecture: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 1l9 5-9 5z"/></svg>',
  fermer: '<svg class="icone" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  coche: '<svg class="icone" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  telecharger: '<svg class="icone" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
  cadenas: '<svg class="icone" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
};

// Chapitre fermé tant que l'heure OUVERTURE (déclarée par la page) n'est pas passée : la liste se voit en grisé,
// sans lecture des vidéos, ni cartes Anki, ni coches. La page se recharge seule à l'heure d'ouverture.
const ouverture = typeof OUVERTURE === "string" ? new Date(OUVERTURE).getTime() : 0;
const ferme = Date.now() < ouverture;
if (ferme) {
  const quand = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" }).format(ouverture).replace(/\b1 /, "1er ")
    + " à " + new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "numeric" }).format(ouverture).replace(/\s*h$/, "") + " h";
  document.body.classList.add("ferme");
  document.querySelector(".progression").innerHTML =
    '<p class="annonce">' + ICONES.cadenas + '<span><b>Ce chapitre s\'ouvre le ' + quand + '.</b> En attendant, voici les vidéos et les cartes Anki qu\'il contiendra.</span></p>';
  document.getElementById("consigne").textContent = "Disponibles le " + quand;
  if (ouverture - Date.now() < 2147483647) setTimeout(() => location.reload(), ouverture - Date.now() + 1000);
}

function secondes(duree) { const [m, s] = duree.split(":").map(Number); return m * 60 + s; }

// « Vue » est gardé dans le navigateur de l'étudiant, sur son appareil : personne d'autre ne le voit.
function lireVu(id) { try { return localStorage.getItem("vu-" + CHAPITRE + "-" + id) === "1"; } catch (e) { return false; } }
function ecrireVu(id, v) {
  try { v ? localStorage.setItem("vu-" + CHAPITRE + "-" + id, "1") : localStorage.removeItem("vu-" + CHAPITRE + "-" + id); } catch (e) {}
}

const liste = document.getElementById("videos");
const total = VIDEOS.length;

// Chiffres du tableau
(function () {
  const t = VIDEOS.reduce((acc, v) => acc + secondes(v[2]), 0);
  const min = Math.round(t / 60);
  document.getElementById("nb-videos").textContent = total + " vidéo" + (total > 1 ? "s" : "");
  document.getElementById("duree-totale").textContent =
    (min >= 60 ? Math.floor(min / 60) + " h " + String(min % 60).padStart(2, "0") : min + " min") + " au total";
  if (!total) {
    document.querySelector(".infos").hidden = true;
    document.querySelector(".progression").hidden = true;
    document.querySelector(".titre-section span").hidden = true;
    liste.outerHTML = '<div class="carte bientot"><strong>Les vidéos arrivent bientôt</strong>Je les ajoute dans l\'ordre du cours.</div>';
  }
})();

// Clin d'œil qui apparaît quand toutes les vidéos sont cochées.
const bravo = document.createElement("div");
bravo.className = "carte bravo";
bravo.hidden = true;
bravo.innerHTML =
  '<figure class="polaroid"><img src="' + liste.dataset.bravo + '" alt="Photo pour rire : deux personnes très maquillées en voiture, l\'une lève le pouce" width="480" height="643" loading="lazy">' +
  '<figcaption>Pouce levé pour vous !</figcaption></figure>' +
  '<div><h2>Bravo, vous avez vu toutes les vidéos !</h2>' +
  '<p class="sous">Il vous reste à réviser les cartes Anki de ce chapitre, quelques minutes par jour.</p></div>';
if (total) liste.after(bravo);

VIDEOS.forEach(function (v, i) {
  const [id, titre, duree, anki] = v;
  const li = document.createElement("li");
  li.className = "video";
  li.innerHTML =
    '<button class="tete" type="button" aria-expanded="false">' +
      '<span class="num">' + (i + 1) + '</span>' +
      '<span class="quoi"><strong></strong><small>' + Math.max(1, Math.round(secondes(duree) / 60)) + ' min</small></span>' +
      '<span class="lecture">' + ICONES.lecture + '</span>' +
    '</button>' +
    '<div class="outils">' +
      (anki && !ferme
        ? '<a class="pilule anki" href="' + anki + '">' + ICONES.telecharger + 'Cartes Anki</a>'
        : '<span class="pilule anki" aria-disabled="true">' + ICONES.telecharger + (anki ? 'Cartes Anki' : 'Cartes Anki bientôt') + '</span>') +
      (ferme ? '' : '<label class="pilule vu"><input type="checkbox"><span class="case">' + ICONES.coche + '</span>Vue</label>') +
    '</div>';
  li.querySelector(".quoi strong").textContent = titre;
  const tete = li.querySelector(".tete");
  if (ferme) {
    tete.disabled = true;
    li.querySelector(".lecture").innerHTML = ICONES.cadenas;
    liste.appendChild(li);
    return;
  }
  const caseVu = li.querySelector(".vu input");
  const num = li.querySelector(".num");
  function majVu() {
    li.classList.toggle("vue", caseVu.checked);
    num.innerHTML = caseVu.checked ? ICONES.coche : String(i + 1);
    majProgression();
  }
  caseVu.checked = lireVu(id);
  caseVu.addEventListener("change", function () {
    ecrireVu(id, caseVu.checked);
    majVu();
    if (caseVu.checked && !bravo.hidden) bravo.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  tete.addEventListener("click", function () {
    const ecran = li.querySelector(".ecran");
    if (ecran) {
      ecran.remove();
      li.classList.remove("ouverte");
      tete.setAttribute("aria-expanded", "false");
      li.querySelector(".lecture").innerHTML = ICONES.lecture;
      return;
    }
    const div = document.createElement("div");
    div.className = "ecran";
    const f = document.createElement("iframe");
    f.src = "https://player.vimeo.com/video/" + id + "?autoplay=1&dnt=1";
    f.title = titre;
    f.allow = "autoplay; fullscreen; picture-in-picture";
    f.allowFullscreen = true;
    div.appendChild(f);
    tete.after(div);
    li.classList.add("ouverte");
    tete.setAttribute("aria-expanded", "true");
    li.querySelector(".lecture").innerHTML = ICONES.fermer;
  });
  liste.appendChild(li);
  majVu();
});

function majProgression() {
  if (!total || ferme) return;
  const n = liste.querySelectorAll(".vu input:checked").length;
  bravo.hidden = n !== total;
  document.getElementById("prog-jauge").style.width = (100 * n / total) + "%";
  document.getElementById("prog-texte").innerHTML = n === 0
    ? "Aucune vidéo vue pour l'instant."
    : n === total ? "<b>Les " + total + " vidéos sont vues.</b> Continuez les cartes Anki chaque jour."
    : "<b>" + n + " vidéo" + (n > 1 ? "s" : "") + " sur " + total + "</b> " + (n > 1 ? "vues" : "vue") + ".";
}
majProgression();
