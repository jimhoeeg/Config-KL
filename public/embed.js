/*
 * KL Køleteknik – Varmepumperådgiveren embed.
 *
 * Usage on klkoleteknik.dk:
 *   <script src="https://<app-domain>/embed.js" defer></script>
 *   <kl-varmepumpe></kl-varmepumpe>
 *
 * Optional attributes:
 *   consent="granted|denied"  forward the site's own cookie-consent decision
 *   min-height="700"          initial height in px
 */
(function () {
  if (customElements.get("kl-varmepumpe")) return;
  var script = document.currentScript;
  var origin = script ? new URL(script.src).origin : "";

  class KlVarmepumpe extends HTMLElement {
    connectedCallback() {
      if (this._iframe) return;
      var params = new URLSearchParams(window.location.search);
      var forward = new URLSearchParams();
      ["utm_source", "utm_medium", "utm_campaign", "utm_content", "fbclid", "gclid", "session"].forEach(function (k) {
        if (params.get(k)) forward.set(k, params.get(k));
      });
      var consent = this.getAttribute("consent");
      if (consent) forward.set("consent", consent);

      var iframe = document.createElement("iframe");
      iframe.src = origin + "/embed" + (forward.toString() ? "?" + forward : "");
      iframe.title = "Varmepumperådgiveren";
      iframe.loading = "lazy";
      iframe.allow = "clipboard-write";
      iframe.style.cssText = "width:100%;border:0;display:block;min-height:" + (this.getAttribute("min-height") || 700) + "px";
      this._iframe = iframe;
      this.appendChild(iframe);

      this._onMessage = (e) => {
        if (e.origin !== origin || e.source !== iframe.contentWindow || !e.data) return;
        if (e.data.type === "kl-vpr-height") iframe.style.height = e.data.height + "px";
        if (e.data.type === "kl-vpr-scroll") {
          var top = this.getBoundingClientRect().top + window.scrollY - 16;
          if (window.scrollY > top) window.scrollTo({ top: top, behavior: "smooth" });
        }
      };
      window.addEventListener("message", this._onMessage);
    }
    disconnectedCallback() {
      window.removeEventListener("message", this._onMessage);
    }
  }
  customElements.define("kl-varmepumpe", KlVarmepumpe);
})();
