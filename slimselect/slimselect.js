"use strict";

!function (t, e) {
  "object" == typeof exports && "undefined" != typeof module ? module.exports = e() : "function" == typeof define && define.amd ? define(e) : (t = "undefined" != typeof globalThis ? globalThis : t || self).SlimSelect = e();
}(void 0, function () {
  "use strict";

  class t {
    constructor(t) {
      t || (t = {}), this.main = t.main || "ss-main", this.placeholder = t.placeholder || "ss-placeholder", this.values = t.values || "ss-values", this.single = t.single || "ss-single", this.max = t.max || "ss-max", this.value = t.value || "ss-value", this.valueText = t.valueText || "ss-value-text", this.valueDelete = t.valueDelete || "ss-value-delete", this.valueOut = t.valueOut || "ss-value-out", this.deselect = t.deselect || "ss-deselect", this.deselectPath = t.deselectPath || "M10,10 L90,90 M10,90 L90,10", this.arrow = t.arrow || "ss-arrow", this.arrowClose = t.arrowClose || "M10,30 L50,70 L90,30", this.arrowOpen = t.arrowOpen || "M10,70 L50,30 L90,70", this.content = t.content || "ss-content", this.openAbove = t.openAbove || "ss-open-above", this.openBelow = t.openBelow || "ss-open-below", this.search = t.search || "ss-search", this.searchHighlighter = t.searchHighlighter || "ss-search-highlight", this.searching = t.searching || "ss-searching", this.addable = t.addable || "ss-addable", this.addablePath = t.addablePath || "M50,10 L50,90 M10,50 L90,50", this.list = t.list || "ss-list", this.optgroup = t.optgroup || "ss-optgroup", this.optgroupLabel = t.optgroupLabel || "ss-optgroup-label", this.optgroupLabelText = t.optgroupLabelText || "ss-optgroup-label-text", this.optgroupActions = t.optgroupActions || "ss-optgroup-actions", this.optgroupSelectAll = t.optgroupSelectAll || "ss-selectall", this.optgroupSelectAllBox = t.optgroupSelectAllBox || "M60,10 L10,10 L10,90 L90,90 L90,50", this.optgroupSelectAllCheck = t.optgroupSelectAllCheck || "M30,45 L50,70 L90,10", this.optgroupClosable = t.optgroupClosable || "ss-closable", this.option = t.option || "ss-option", this.optionDelete = t.optionDelete || "M10,10 L90,90 M10,90 L90,10", this.highlighted = t.highlighted || "ss-highlighted", this.open = t.open || "ss-open", this.close = t.close || "ss-close", this.selected = t.selected || "ss-selected", this.error = t.error || "ss-error", this.disabled = t.disabled || "ss-disabled", this.hide = t.hide || "ss-hide";
    }
  }
  function e() {
    return Math.random().toString(36).substring(2, 10);
  }
  function s(t, e = 50, s = !1) {
    let i;
    return function (...n) {
      const a = self,
        l = s && !i;
      clearTimeout(i), i = setTimeout(() => {
        i = null, s || t.apply(a, n);
      }, e), l && t.apply(a, n);
    };
  }
  function i(t, e) {
    return JSON.stringify(t) === JSON.stringify(e);
  }
  class n {
    constructor(t) {
      if (this.id = t.id && "" !== t.id ? t.id : e(), this.label = t.label || "", this.selectAll = void 0 !== t.selectAll && t.selectAll, this.selectAllText = t.selectAllText || "Select All", this.closable = t.closable || "off", this.options = [], t.options) for (const e of t.options) this.options.push(new a(e));
    }
  }
  class a {
    constructor(t) {
      this.id = t.id && "" !== t.id ? t.id : e(), this.value = void 0 === t.value ? t.text : t.value, this.text = t.text || "", this.html = t.html || "", this.selected = void 0 !== t.selected && t.selected, this.display = void 0 === t.display || t.display, this.disabled = void 0 !== t.disabled && t.disabled, this.mandatory = void 0 !== t.mandatory && t.mandatory, this.placeholder = void 0 !== t.placeholder && t.placeholder, this.class = t.class || "", this.style = t.style || "", this.data = t.data || {};
    }
  }
  class l {
    constructor(t, e) {
      this.selectType = "single", this.data = [], this.selectedOrder = [], this.selectType = t, this.setData(e);
    }
    validateDataArray(t) {
      if (!Array.isArray(t)) return new Error("Data must be an array");
      for (let e of t) if (e instanceof n || "label" in e) {
        if (!("label" in e)) return new Error("Optgroup must have a label");
        if ("options" in e && e.options) for (let t of e.options) {
          const e = this.validateOption(t);
          if (e) return e;
        }
      } else {
        if (!(e instanceof a || "text" in e)) return new Error("Data object must be a valid optgroup or option");
        {
          const t = this.validateOption(e);
          if (t) return t;
        }
      }
      return null;
    }
    validateOption(t) {
      return "text" in t ? null : new Error("Option must have a text");
    }
    partialToFullData(t) {
      let e = [];
      return t.forEach(t => {
        if (t instanceof n || "label" in t) {
          let s = [];
          "options" in t && t.options && t.options.forEach(t => {
            s.push(new a(t));
          }), s.length > 0 && e.push(new n(t));
        }
        (t instanceof a || "text" in t) && e.push(new a(t));
      }), e;
    }
    setData(t) {
      this.data = this.partialToFullData(t), "single" === this.selectType && this.setSelectedBy("id", this.getSelected());
    }
    getData() {
      return this.filter(null, !0);
    }
    getDataOptions() {
      return this.filter(null, !1);
    }
    addOption(t, e = !1) {
      if (e) {
        let e = [new a(t)];
        this.setData(e.concat(this.getData()));
      } else this.setData(this.getData().concat(new a(t)));
    }
    setSelectedBy(t, e) {
      let s = null,
        i = !1;
      const l = [];
      for (let o of this.data) {
        if (o instanceof n) for (let n of o.options) s || (s = n), n.selected = !i && e.includes(n[t]), n.selected && (l.push(n), "single" === this.selectType && (i = !0));
        o instanceof a && (s || (s = o), o.selected = !i && e.includes(o[t]), o.selected && (l.push(o), "single" === this.selectType && (i = !0)));
      }
      "single" === this.selectType && s && !i && (s.selected = !0, l.push(s));
      const o = e.map(e => {
        var s;
        return (null === (s = l.find(s => s[t] === e)) || void 0 === s ? void 0 : s.id) || "";
      });
      this.selectedOrder = o;
    }
    getSelected() {
      return this.getSelectedOptions().map(t => t.id);
    }
    getSelectedValues() {
      return this.getSelectedOptions().map(t => t.value);
    }
    getSelectedOptions() {
      return this.filter(t => t.selected, !1);
    }
    getOptgroupByID(t) {
      for (let e of this.data) if (e instanceof n && e.id === t) return e;
      return null;
    }
    getOptionByID(t) {
      let e = this.filter(e => e.id === t, !1);
      return e.length ? e[0] : null;
    }
    getSelectType() {
      return this.selectType;
    }
    getFirstOption() {
      let t = null;
      for (let e of this.data) if (e instanceof n ? t = e.options[0] : e instanceof a && (t = e), t) break;
      return t;
    }
    search(t, e) {
      return "" === (t = t.trim()) ? this.getData() : this.filter(s => e(s, t), !0);
    }
    filter(t, e) {
      const s = [];
      return this.data.forEach(i => {
        if (i instanceof n) {
          let l = [];
          if (i.options.forEach(i => {
            t && !t(i) || (e ? l.push(new a(i)) : s.push(new a(i)));
          }), l.length > 0) {
            let t = new n(i);
            t.options = l, s.push(t);
          }
        }
        i instanceof a && (t && !t(i) || s.push(new a(i)));
      }), s;
    }
    selectedOrderOptions(t) {
      const e = [];
      return this.selectedOrder.forEach(s => {
        const i = t.find(t => t.id === s);
        i && e.push(i);
      }), t.forEach(t => {
        let s = !1;
        e.forEach(e => {
          t.id !== e.id || (s = !0);
        }), s || e.push(t);
      }), e;
    }
  }
  class o {
    constructor(t, e, s, i) {
      this.store = s, this.settings = t, this.classes = e, this.callbacks = i, this.main = this.mainDiv(), this.content = this.contentDiv(), this.updateClassStyles(), this.updateAriaAttributes(), this.settings.contentLocation && this.settings.contentLocation.appendChild(this.content.main);
    }
    enable() {
      this.main.main.classList.remove(this.classes.disabled), this.content.search.input.disabled = !1;
    }
    disable() {
      this.main.main.classList.add(this.classes.disabled), this.content.search.input.disabled = !0;
    }
    open() {
      this.main.arrow.path.setAttribute("d", this.classes.arrowOpen), this.main.main.classList.add("up" === this.settings.openPosition ? this.classes.openAbove : this.classes.openBelow), this.main.main.setAttribute("aria-expanded", "true"), this.moveContent();
      const t = this.store.getSelectedOptions();
      if (t.length) {
        const e = t[t.length - 1].id,
          s = this.content.list.querySelector('[data-id="' + e + '"]');
        s && this.ensureElementInView(this.content.list, s);
      }
    }
    close() {
      this.main.main.classList.remove(this.classes.openAbove), this.main.main.classList.remove(this.classes.openBelow), this.main.main.setAttribute("aria-expanded", "false"), this.content.main.classList.remove(this.classes.openAbove), this.content.main.classList.remove(this.classes.openBelow), this.main.arrow.path.setAttribute("d", this.classes.arrowClose);
    }
    updateClassStyles() {
      if (this.main.main.className = "", this.main.main.removeAttribute("style"), this.content.main.className = "", this.content.main.removeAttribute("style"), this.main.main.classList.add(this.classes.main), this.content.main.classList.add(this.classes.content), "" !== this.settings.style && (this.main.main.style.cssText = this.settings.style, this.content.main.style.cssText = this.settings.style), this.settings.class.length) for (const t of this.settings.class) "" !== t.trim() && (this.main.main.classList.add(t.trim()), this.content.main.classList.add(t.trim()));
      "relative" !== this.settings.contentPosition && "fixed" !== this.settings.contentPosition || this.content.main.classList.add("ss-" + this.settings.contentPosition);
    }
    updateAriaAttributes() {
      this.main.main.role = "combobox", this.main.main.setAttribute("aria-haspopup", "listbox"), this.main.main.setAttribute("aria-controls", this.content.main.id), this.main.main.setAttribute("aria-expanded", "false"), this.content.main.setAttribute("role", "listbox");
    }
    mainDiv() {
      var t;
      const e = document.createElement("div");
      e.dataset.id = this.settings.id, e.setAttribute("aria-label", this.settings.ariaLabel), e.tabIndex = 0, e.onkeydown = t => {
        switch (t.key) {
          case "ArrowUp":
          case "ArrowDown":
            return this.callbacks.open(), "ArrowDown" === t.key ? this.highlight("down") : this.highlight("up"), !1;
          case "Tab":
            return this.callbacks.close(), !0;
          case "Enter":
          case " ":
            this.callbacks.open();
            const e = this.content.list.querySelector("." + this.classes.highlighted);
            return e && e.click(), !1;
          case "Escape":
            return this.callbacks.close(), !1;
        }
        return 1 === t.key.length && this.callbacks.open(), !0;
      }, e.onclick = t => {
        this.settings.disabled || (this.settings.isOpen ? this.callbacks.close() : this.callbacks.open());
      };
      const s = document.createElement("div");
      s.classList.add(this.classes.values), e.appendChild(s);
      const i = document.createElement("div");
      i.classList.add(this.classes.deselect);
      const n = null === (t = this.store) || void 0 === t ? void 0 : t.getSelectedOptions();
      !this.settings.allowDeselect || this.settings.isMultiple && n && n.length <= 0 ? i.classList.add(this.classes.hide) : i.classList.remove(this.classes.hide), i.onclick = t => {
        if (t.stopPropagation(), this.settings.disabled) return;
        let e = !0;
        const s = this.store.getSelectedOptions(),
          i = [];
        if (this.callbacks.beforeChange && (e = !0 === this.callbacks.beforeChange(i, s)), e) {
          if (this.settings.isMultiple) this.callbacks.setSelected([], !1), this.updateDeselectAll();else {
            const t = this.store.getFirstOption(),
              e = t ? t.id : "";
            this.callbacks.setSelected(e, !1);
          }
          this.settings.closeOnSelect && this.callbacks.close(), this.callbacks.afterChange && this.callbacks.afterChange(this.store.getSelectedOptions());
        }
      };
      const a = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      a.setAttribute("viewBox", "0 0 100 100");
      const l = document.createElementNS("http://www.w3.org/2000/svg", "path");
      l.setAttribute("d", this.classes.deselectPath), a.appendChild(l), i.appendChild(a), e.appendChild(i);
      const o = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      o.classList.add(this.classes.arrow), o.setAttribute("viewBox", "0 0 100 100");
      const h = document.createElementNS("http://www.w3.org/2000/svg", "path");
      return h.setAttribute("d", this.classes.arrowClose), this.settings.alwaysOpen && o.classList.add(this.classes.hide), o.appendChild(h), e.appendChild(o), {
        main: e,
        values: s,
        deselect: {
          main: i,
          svg: a,
          path: l
        },
        arrow: {
          main: o,
          path: h
        }
      };
    }
    mainFocus(t) {
      "click" !== t && this.main.main.focus({
        preventScroll: !0
      });
    }
    placeholder() {
      const t = this.store.filter(t => t.placeholder, !1);
      let e = this.settings.placeholderText;
      t.length && ("" !== t[0].html ? e = t[0].html : "" !== t[0].text && (e = t[0].text));
      const s = document.createElement("div");
      return s.classList.add(this.classes.placeholder), s.innerHTML = e, s;
    }
    renderValues() {
      this.settings.isMultiple ? (this.renderMultipleValues(), this.updateDeselectAll()) : this.renderSingleValue();
    }
    renderSingleValue() {
      const t = this.store.filter(t => t.selected && !t.placeholder, !1),
        e = t.length > 0 ? t[0] : null;
      if (e) {
        const t = document.createElement("div");
        t.classList.add(this.classes.single), e.html ? t.innerHTML = e.html : t.innerText = e.text, this.main.values.innerHTML = t.outerHTML;
      } else this.main.values.innerHTML = this.placeholder().outerHTML;
      this.settings.allowDeselect && t.length ? this.main.deselect.main.classList.remove(this.classes.hide) : this.main.deselect.main.classList.add(this.classes.hide);
    }
    renderMultipleValues() {
      let t = this.main.values.childNodes,
        e = this.store.filter(t => t.selected && t.display, !1);
      if (0 === e.length) return void (this.main.values.innerHTML = this.placeholder().outerHTML);
      {
        const t = this.main.values.querySelector("." + this.classes.placeholder);
        t && t.remove();
      }
      if (e.length > this.settings.maxValuesShown) {
        const t = document.createElement("div");
        return t.classList.add(this.classes.max), t.textContent = this.settings.maxValuesMessage.replace("{number}", e.length.toString()), void (this.main.values.innerHTML = t.outerHTML);
      }
      {
        const t = this.main.values.querySelector("." + this.classes.max);
        t && t.remove();
      }
      this.settings.keepOrder && (e = this.store.selectedOrderOptions(e));
      let s = [];
      for (let i = 0; i < t.length; i++) {
        const n = t[i],
          a = n.getAttribute("data-id");
        if (a) {
          e.filter(t => t.id === a, !1).length || s.push(n);
        }
      }
      for (const t of s) t.classList.add(this.classes.valueOut), setTimeout(() => {
        this.main.values.hasChildNodes() && this.main.values.contains(t) && this.main.values.removeChild(t);
      }, 100);
      t = this.main.values.childNodes;
      for (let s = 0; s < e.length; s++) {
        let i = !0;
        for (let n = 0; n < t.length; n++) e[s].id === String(t[n].dataset.id) && (i = !1);
        i && (this.settings.keepOrder || 0 === t.length ? this.main.values.appendChild(this.multipleValue(e[s])) : 0 === s ? this.main.values.insertBefore(this.multipleValue(e[s]), t[s]) : t[s - 1].insertAdjacentElement("afterend", this.multipleValue(e[s])));
      }
    }
    multipleValue(t) {
      const e = document.createElement("div");
      e.classList.add(this.classes.value), e.dataset.id = t.id;
      const s = document.createElement("div");
      if (s.classList.add(this.classes.valueText), s.textContent = t.text, e.appendChild(s), !t.mandatory) {
        const s = document.createElement("div");
        s.classList.add(this.classes.valueDelete), s.onclick = e => {
          if (e.preventDefault(), e.stopPropagation(), this.settings.disabled) return;
          let s = !0;
          const i = this.store.getSelectedOptions(),
            l = i.filter(e => e.selected && e.id !== t.id, !0);
          if (!(this.settings.minSelected && l.length < this.settings.minSelected) && (this.callbacks.beforeChange && (s = !0 === this.callbacks.beforeChange(l, i)), s)) {
            let t = [];
            for (const e of l) {
              if (e instanceof n) for (const s of e.options) t.push(s.id);
              e instanceof a && t.push(e.id);
            }
            this.callbacks.setSelected(t, !1), this.settings.closeOnSelect && this.callbacks.close(), this.callbacks.afterChange && this.callbacks.afterChange(l), this.updateDeselectAll();
          }
        };
        const i = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        i.setAttribute("viewBox", "0 0 100 100");
        const l = document.createElementNS("http://www.w3.org/2000/svg", "path");
        l.setAttribute("d", this.classes.optionDelete), i.appendChild(l), s.appendChild(i), e.appendChild(s);
      }
      return e;
    }
    contentDiv() {
      const t = document.createElement("div");
      t.dataset.id = this.settings.id;
      const e = this.searchDiv();
      t.appendChild(e.main);
      const s = this.listDiv();
      return t.appendChild(s), {
        main: t,
        search: e,
        list: s
      };
    }
    moveContent() {
      "relative" !== this.settings.contentPosition && "down" !== this.settings.openPosition ? "up" !== this.settings.openPosition ? "up" === this.putContent() ? this.moveContentAbove() : this.moveContentBelow() : this.moveContentAbove() : this.moveContentBelow();
    }
    searchDiv() {
      const t = document.createElement("div"),
        e = document.createElement("input"),
        i = document.createElement("div");
      t.classList.add(this.classes.search);
      const n = {
        main: t,
        input: e
      };
      if (this.settings.showSearch || (t.classList.add(this.classes.hide), e.readOnly = !0), e.type = "search", e.placeholder = this.settings.searchPlaceholder, e.tabIndex = -1, e.setAttribute("aria-label", this.settings.searchPlaceholder), e.setAttribute("autocapitalize", "off"), e.setAttribute("autocomplete", "off"), e.setAttribute("autocorrect", "off"), e.oninput = s(t => {
        this.callbacks.search(t.target.value);
      }, 100), e.onkeydown = t => {
        switch (t.key) {
          case "ArrowUp":
          case "ArrowDown":
            return "ArrowDown" === t.key ? this.highlight("down") : this.highlight("up"), !1;
          case "Tab":
            return this.callbacks.close(), !0;
          case "Escape":
            return this.callbacks.close(), !1;
          case " ":
            const e = this.content.list.querySelector("." + this.classes.highlighted);
            return !e || (e.click(), !1);
          case "Enter":
            if (this.callbacks.addable) return i.click(), !1;
            {
              const t = this.content.list.querySelector("." + this.classes.highlighted);
              if (t) return t.click(), !1;
            }
            return !0;
        }
        return !0;
      }, t.appendChild(e), this.callbacks.addable) {
        i.classList.add(this.classes.addable);
        const e = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        e.setAttribute("viewBox", "0 0 100 100");
        const s = document.createElementNS("http://www.w3.org/2000/svg", "path");
        s.setAttribute("d", this.classes.addablePath), e.appendChild(s), i.appendChild(e), i.onclick = t => {
          if (t.preventDefault(), t.stopPropagation(), !this.callbacks.addable) return;
          const e = this.content.search.input.value.trim();
          if ("" === e) return void this.content.search.input.focus();
          const s = t => {
              let e = new a(t);
              if (this.callbacks.addOption(e), this.settings.isMultiple) {
                let t = this.store.getSelected();
                t.push(e.id), this.callbacks.setSelected(t, !0);
              } else this.callbacks.setSelected([e.id], !0);
              this.callbacks.search(""), this.settings.closeOnSelect && setTimeout(() => {
                this.callbacks.close();
              }, 100);
            },
            i = this.callbacks.addable(e);
          !1 !== i && null != i && (i instanceof Promise ? i.then(t => {
            "string" == typeof t ? s({
              text: t,
              value: t
            }) : i instanceof Error ? this.renderError(i.message) : s(t);
          }) : "string" == typeof i ? s({
            text: i,
            value: i
          }) : i instanceof Error ? this.renderError(i.message) : s(i));
        }, t.appendChild(i), n.addable = {
          main: i,
          svg: e,
          path: s
        };
      }
      return n;
    }
    searchFocus() {
      this.content.search.input.focus();
    }
    getOptions(t = !1, e = !1, s = !1) {
      let i = "." + this.classes.option;
      return t && (i += ":not(." + this.classes.placeholder + ")"), e && (i += ":not(." + this.classes.disabled + ")"), s && (i += ":not(." + this.classes.hide + ")"), Array.from(this.content.list.querySelectorAll(i));
    }
    highlight(t) {
      const e = this.getOptions(!0, !0, !0);
      if (0 === e.length) return;
      if (1 === e.length && !e[0].classList.contains(this.classes.highlighted)) return void e[0].classList.add(this.classes.highlighted);
      let s = !1;
      for (const t of e) t.classList.contains(this.classes.highlighted) && (s = !0);
      if (!s) for (const t of e) if (t.classList.contains(this.classes.selected)) {
        t.classList.add(this.classes.highlighted);
        break;
      }
      for (let s = 0; s < e.length; s++) if (e[s].classList.contains(this.classes.highlighted)) {
        const i = e[s];
        i.classList.remove(this.classes.highlighted);
        const n = i.parentElement;
        if (n && n.classList.contains(this.classes.open)) {
          const t = n.querySelector("." + this.classes.optgroupLabel);
          t && t.click();
        }
        let a = e["down" === t ? s + 1 < e.length ? s + 1 : 0 : s - 1 >= 0 ? s - 1 : e.length - 1];
        a.classList.add(this.classes.highlighted), this.ensureElementInView(this.content.list, a);
        const l = a.parentElement;
        if (l && l.classList.contains(this.classes.close)) {
          const t = l.querySelector("." + this.classes.optgroupLabel);
          t && t.click();
        }
        return;
      }
      e["down" === t ? 0 : e.length - 1].classList.add(this.classes.highlighted), this.ensureElementInView(this.content.list, e["down" === t ? 0 : e.length - 1]);
    }
    listDiv() {
      const t = document.createElement("div");
      return t.classList.add(this.classes.list), t;
    }
    renderError(t) {
      this.content.list.innerHTML = "";
      const e = document.createElement("div");
      e.classList.add(this.classes.error), e.textContent = t, this.content.list.appendChild(e);
    }
    renderSearching() {
      this.content.list.innerHTML = "";
      const t = document.createElement("div");
      t.classList.add(this.classes.searching), t.textContent = this.settings.searchingText, this.content.list.appendChild(t);
    }
    renderOptions(t) {
      if (this.content.list.innerHTML = "", 0 === t.length) {
        const t = document.createElement("div");
        return t.classList.add(this.classes.search), this.callbacks.addable ? t.innerHTML = this.settings.addableText.replace("{value}", this.content.search.input.value) : t.innerHTML = this.settings.searchText, void this.content.list.appendChild(t);
      }
      if (this.settings.allowDeselect && !this.settings.isMultiple) {
        this.store.filter(t => t.placeholder, !1).length || this.store.addOption(new a({
          text: "",
          value: "",
          selected: !1,
          placeholder: !0
        }), !0);
      }
      for (const e of t) {
        if (e instanceof n) {
          const t = document.createElement("div");
          t.classList.add(this.classes.optgroup);
          const s = document.createElement("div");
          s.classList.add(this.classes.optgroupLabel), t.appendChild(s);
          const i = document.createElement("div");
          i.classList.add(this.classes.optgroupLabelText), i.textContent = e.label, s.appendChild(i);
          const n = document.createElement("div");
          if (n.classList.add(this.classes.optgroupActions), s.appendChild(n), this.settings.isMultiple && e.selectAll) {
            const t = document.createElement("div");
            t.classList.add(this.classes.optgroupSelectAll);
            let s = !0;
            for (const t of e.options) if (!t.selected) {
              s = !1;
              break;
            }
            s && t.classList.add(this.classes.selected);
            const i = document.createElement("span");
            i.textContent = e.selectAllText, t.appendChild(i);
            const a = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            a.setAttribute("viewBox", "0 0 100 100"), t.appendChild(a);
            const l = document.createElementNS("http://www.w3.org/2000/svg", "path");
            l.setAttribute("d", this.classes.optgroupSelectAllBox), a.appendChild(l);
            const o = document.createElementNS("http://www.w3.org/2000/svg", "path");
            o.setAttribute("d", this.classes.optgroupSelectAllCheck), a.appendChild(o), t.addEventListener("click", t => {
              t.preventDefault(), t.stopPropagation();
              const i = this.store.getSelected();
              if (s) {
                const t = i.filter(t => {
                  for (const s of e.options) if (t === s.id) return !1;
                  return !0;
                });
                this.callbacks.setSelected(t, !0);
              } else {
                const t = i.concat(e.options.map(t => t.id));
                for (const t of e.options) this.store.getOptionByID(t.id) || this.callbacks.addOption(t);
                this.callbacks.setSelected(t, !0);
              }
            }), n.appendChild(t);
          }
          if ("off" !== e.closable) {
            const i = document.createElement("div");
            i.classList.add(this.classes.optgroupClosable);
            const a = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            a.setAttribute("viewBox", "0 0 100 100"), a.classList.add(this.classes.arrow), i.appendChild(a);
            const l = document.createElementNS("http://www.w3.org/2000/svg", "path");
            a.appendChild(l), e.options.some(t => t.selected) || "" !== this.content.search.input.value.trim() ? (i.classList.add(this.classes.open), l.setAttribute("d", this.classes.arrowOpen)) : "open" === e.closable ? (t.classList.add(this.classes.open), l.setAttribute("d", this.classes.arrowOpen)) : "close" === e.closable && (t.classList.add(this.classes.close), l.setAttribute("d", this.classes.arrowClose)), s.addEventListener("click", e => {
              e.preventDefault(), e.stopPropagation(), t.classList.contains(this.classes.close) ? (t.classList.remove(this.classes.close), t.classList.add(this.classes.open), l.setAttribute("d", this.classes.arrowOpen)) : (t.classList.remove(this.classes.open), t.classList.add(this.classes.close), l.setAttribute("d", this.classes.arrowClose));
            }), n.appendChild(i);
          }
          t.appendChild(s);
          for (const s of e.options) t.appendChild(this.option(s));
          this.content.list.appendChild(t);
        }
        e instanceof a && this.content.list.appendChild(this.option(e));
      }
    }
    option(t) {
      if (t.placeholder) {
        const t = document.createElement("div");
        return t.classList.add(this.classes.option), t.classList.add(this.classes.hide), t;
      }
      const e = document.createElement("div");
      return e.dataset.id = t.id, e.classList.add(this.classes.option), e.setAttribute("role", "option"), t.class && t.class.split(" ").forEach(t => {
        e.classList.add(t);
      }), t.style && (e.style.cssText = t.style), this.settings.searchHighlight && "" !== this.content.search.input.value.trim() ? e.innerHTML = this.highlightText("" !== t.html ? t.html : t.text, this.content.search.input.value, this.classes.searchHighlighter) : "" !== t.html ? e.innerHTML = t.html : e.textContent = t.text, this.settings.showOptionTooltips && e.textContent && e.setAttribute("title", e.textContent), t.display || e.classList.add(this.classes.hide), t.disabled && e.classList.add(this.classes.disabled), t.selected && this.settings.hideSelected && e.classList.add(this.classes.hide), t.selected ? (e.classList.add(this.classes.selected), e.setAttribute("aria-selected", "true"), this.main.main.setAttribute("aria-activedescendant", e.id)) : (e.classList.remove(this.classes.selected), e.setAttribute("aria-selected", "false")), e.addEventListener("click", e => {
        e.preventDefault(), e.stopPropagation();
        const s = this.store.getSelected(),
          i = e.currentTarget,
          n = String(i.dataset.id);
        if (t.disabled || t.selected && !this.settings.allowDeselect) return;
        if (this.settings.isMultiple && this.settings.maxSelected <= s.length && !t.selected || this.settings.isMultiple && this.settings.minSelected >= s.length && t.selected) return;
        let a = !1;
        const l = this.store.getSelectedOptions();
        let o = [];
        this.settings.isMultiple && (o = t.selected ? l.filter(t => t.id !== n) : l.concat(t)), this.settings.isMultiple || (o = t.selected ? [] : [t]), this.callbacks.beforeChange || (a = !0), this.callbacks.beforeChange && (a = !1 !== this.callbacks.beforeChange(o, l)), a && (this.store.getOptionByID(n) || this.callbacks.addOption(t), this.callbacks.setSelected(o.map(t => t.id), !1), this.settings.closeOnSelect && this.callbacks.close(), this.callbacks.afterChange && this.callbacks.afterChange(o));
      }), e;
    }
    destroy() {
      this.main.main.remove(), this.content.main.remove();
    }
    highlightText(t, e, s) {
      let i = t;
      const n = new RegExp("(?![^<]*>)(" + e.trim() + ")(?![^<]*>[^<>]*</)", "i");
      if (!t.match(n)) return t;
      const a = t.match(n).index,
        l = a + t.match(n)[0].toString().length,
        o = t.substring(a, l);
      return i = i.replace(n, `<mark class="${s}">${o}</mark>`), i;
    }
    moveContentAbove() {
      const t = this.main.main.offsetHeight,
        e = this.content.main.offsetHeight;
      this.main.main.classList.remove(this.classes.openBelow), this.main.main.classList.add(this.classes.openAbove), this.content.main.classList.remove(this.classes.openBelow), this.content.main.classList.add(this.classes.openAbove);
      const s = this.main.main.getBoundingClientRect();
      this.content.main.style.margin = "-" + (t + e - 1) + "px 0px 0px 0px", this.content.main.style.top = s.top + s.height + ("fixed" === this.settings.contentPosition ? 0 : window.scrollY) + "px", this.content.main.style.left = s.left + ("fixed" === this.settings.contentPosition ? 0 : window.scrollX) + "px", this.content.main.style.width = s.width + "px";
    }
    moveContentBelow() {
      this.main.main.classList.remove(this.classes.openAbove), this.main.main.classList.add(this.classes.openBelow), this.content.main.classList.remove(this.classes.openAbove), this.content.main.classList.add(this.classes.openBelow);
      const t = this.main.main.getBoundingClientRect();
      this.content.main.style.margin = "-1px 0px 0px 0px", "relative" !== this.settings.contentPosition && (this.content.main.style.top = t.top + t.height + ("fixed" === this.settings.contentPosition ? 0 : window.scrollY) + "px", this.content.main.style.left = t.left + ("fixed" === this.settings.contentPosition ? 0 : window.scrollX) + "px", this.content.main.style.width = t.width + "px");
    }
    ensureElementInView(t, e) {
      const s = t.scrollTop + t.offsetTop,
        i = s + t.clientHeight,
        n = e.offsetTop,
        a = n + e.clientHeight;
      n < s ? t.scrollTop -= s - n : a > i && (t.scrollTop += a - i);
    }
    putContent() {
      const t = this.main.main.offsetHeight,
        e = this.main.main.getBoundingClientRect(),
        s = this.content.main.offsetHeight;
      return window.innerHeight - (e.top + t) <= s && e.top > s ? "up" : "down";
    }
    updateDeselectAll() {
      if (!this.store || !this.settings) return;
      const t = this.store.getSelectedOptions(),
        e = t && t.length > 0,
        s = this.settings.isMultiple,
        i = this.settings.allowDeselect,
        n = this.main.deselect.main,
        a = this.classes.hide;
      !i || s && !e ? n.classList.add(a) : n.classList.remove(a);
    }
  }
  class h {
    constructor(t) {
      this.listen = !1, this.observer = null, this.select = t, this.valueChange = this.valueChange.bind(this), this.select.addEventListener("change", this.valueChange, {
        passive: !0
      }), this.observer = new MutationObserver(this.observeCall.bind(this)), this.changeListen(!0);
    }
    enable() {
      this.select.disabled = !1;
    }
    disable() {
      this.select.disabled = !0;
    }
    hideUI() {
      this.select.tabIndex = -1, this.select.style.display = "none", this.select.setAttribute("aria-hidden", "true");
    }
    showUI() {
      this.select.removeAttribute("tabindex"), this.select.style.display = "", this.select.removeAttribute("aria-hidden");
    }
    changeListen(t) {
      this.listen = t, t && this.observer && this.observer.observe(this.select, {
        subtree: !0,
        childList: !0,
        attributes: !0
      }), t || this.observer && this.observer.disconnect();
    }
    valueChange(t) {
      return this.listen && this.onValueChange && this.onValueChange(this.getSelectedOptions()), !0;
    }
    observeCall(t) {
      if (!this.listen) return;
      let e = !1,
        s = !1,
        i = !1;
      for (const n of t) {
        if (n.target === this.select && ("disabled" === n.attributeName && (s = !0), "class" === n.attributeName && (e = !0), "childList" === n.type)) {
          for (const t of n.addedNodes) if ("OPTION" === t.nodeName && t.value === this.select.value) {
            this.select.dispatchEvent(new Event("change"));
            break;
          }
          i = !0;
        }
        "OPTGROUP" !== n.target.nodeName && "OPTION" !== n.target.nodeName || (i = !0);
      }
      e && this.onClassChange && this.onClassChange(this.select.className.split(" ")), s && this.onDisabledChange && (this.changeListen(!1), this.onDisabledChange(this.select.disabled), this.changeListen(!0)), i && this.onOptionsChange && (this.changeListen(!1), this.onOptionsChange(this.getData()), this.changeListen(!0));
    }
    getData() {
      let t = [];
      const e = this.select.childNodes;
      for (const s of e) "OPTGROUP" === s.nodeName && t.push(this.getDataFromOptgroup(s)), "OPTION" === s.nodeName && t.push(this.getDataFromOption(s));
      return t;
    }
    getDataFromOptgroup(t) {
      let e = {
        id: t.id,
        label: t.label,
        selectAll: !!t.dataset && "true" === t.dataset.selectall,
        selectAllText: t.dataset ? t.dataset.selectalltext : "Select all",
        closable: t.dataset ? t.dataset.closable : "off",
        options: []
      };
      const s = t.childNodes;
      for (const t of s) "OPTION" === t.nodeName && e.options.push(this.getDataFromOption(t));
      return e;
    }
    getDataFromOption(t) {
      return {
        id: t.id,
        value: t.value,
        text: t.text,
        html: t.dataset && t.dataset.html ? t.dataset.html : "",
        selected: t.selected,
        display: "none" !== t.style.display,
        disabled: t.disabled,
        mandatory: !!t.dataset && "true" === t.dataset.mandatory,
        placeholder: "true" === t.dataset.placeholder,
        class: t.className,
        style: t.style.cssText,
        data: t.dataset
      };
    }
    getSelectedOptions() {
      let t = [];
      const e = this.select.childNodes;
      for (const s of e) {
        if ("OPTGROUP" === s.nodeName) {
          const e = s.childNodes;
          for (const s of e) if ("OPTION" === s.nodeName) {
            const e = s;
            e.selected && t.push(this.getDataFromOption(e));
          }
        }
        if ("OPTION" === s.nodeName) {
          const e = s;
          e.selected && t.push(this.getDataFromOption(e));
        }
      }
      return t;
    }
    getSelectedValues() {
      return this.getSelectedOptions().map(t => t.value);
    }
    setSelected(t) {
      this.changeListen(!1);
      const e = this.select.childNodes;
      for (const s of e) {
        if ("OPTGROUP" === s.nodeName) {
          const e = s.childNodes;
          for (const s of e) if ("OPTION" === s.nodeName) {
            const e = s;
            e.selected = t.includes(e.id);
          }
        }
        if ("OPTION" === s.nodeName) {
          const e = s;
          e.selected = t.includes(e.id);
        }
      }
      this.changeListen(!0);
    }
    setSelectedByValue(t) {
      this.changeListen(!1);
      const e = this.select.childNodes;
      for (const s of e) {
        if ("OPTGROUP" === s.nodeName) {
          const e = s.childNodes;
          for (const s of e) if ("OPTION" === s.nodeName) {
            const e = s;
            e.selected = t.includes(e.value);
          }
        }
        if ("OPTION" === s.nodeName) {
          const e = s;
          e.selected = t.includes(e.value);
        }
      }
      this.changeListen(!0);
    }
    updateSelect(t, e, s) {
      this.changeListen(!1), t && (this.select.dataset.id = t), e && (this.select.style.cssText = e), s && (this.select.className = "", s.forEach(t => {
        "" !== t.trim() && this.select.classList.add(t.trim());
      })), this.changeListen(!0);
    }
    updateOptions(t) {
      this.changeListen(!1), this.select.innerHTML = "";
      for (const e of t) e instanceof n && this.select.appendChild(this.createOptgroup(e)), e instanceof a && this.select.appendChild(this.createOption(e));
      this.select.dispatchEvent(new Event("change", {
        bubbles: !0
      })), this.changeListen(!0);
    }
    createOptgroup(t) {
      const e = document.createElement("optgroup");
      if (e.id = t.id, e.label = t.label, t.selectAll && (e.dataset.selectAll = "true"), "off" !== t.closable && (e.dataset.closable = t.closable), t.options) for (const s of t.options) e.appendChild(this.createOption(s));
      return e;
    }
    createOption(t) {
      const e = document.createElement("option");
      return e.id = t.id, e.value = t.value, e.textContent = t.text, "" !== t.html && e.setAttribute("data-html", t.html), t.selected && (e.selected = t.selected), t.disabled && (e.disabled = !0), t.display || (e.style.display = "none"), t.placeholder && e.setAttribute("data-placeholder", "true"), t.mandatory && e.setAttribute("data-mandatory", "true"), t.class && t.class.split(" ").forEach(t => {
        e.classList.add(t);
      }), t.data && "object" == typeof t.data && Object.keys(t.data).forEach(s => {
        e.setAttribute("data-" + function (t) {
          const e = t.replace(/[A-Z\u00C0-\u00D6\u00D8-\u00DE]/g, t => "-" + t.toLowerCase());
          return t[0] === t[0].toUpperCase() ? e.substring(1) : e;
        }(s), t.data[s]);
      }), e;
    }
    destroy() {
      this.changeListen(!1), this.select.removeEventListener("change", this.valueChange), this.observer && (this.observer.disconnect(), this.observer = null), delete this.select.dataset.id, this.showUI();
    }
  }
  class c {
    constructor(t) {
      this.id = "", this.style = "", this.class = [], this.isMultiple = !1, this.isOpen = !1, this.isFullOpen = !1, this.intervalMove = null, t || (t = {}), this.id = "ss-" + e(), this.style = t.style || "", this.class = t.class || [], this.disabled = void 0 !== t.disabled && t.disabled, this.alwaysOpen = void 0 !== t.alwaysOpen && t.alwaysOpen, this.showSearch = void 0 === t.showSearch || t.showSearch, this.focusSearch = void 0 === t.focusSearch || t.focusSearch, this.ariaLabel = t.ariaLabel || "Combobox", this.searchPlaceholder = t.searchPlaceholder || "Search", this.searchText = t.searchText || "No Results", this.searchingText = t.searchingText || "Searching...", this.searchHighlight = void 0 !== t.searchHighlight && t.searchHighlight, this.closeOnSelect = void 0 === t.closeOnSelect || t.closeOnSelect, this.contentLocation = t.contentLocation || document.body, this.contentPosition = t.contentPosition || "absolute", this.openPosition = t.openPosition || "auto", this.placeholderText = void 0 !== t.placeholderText ? t.placeholderText : "Select Value", this.allowDeselect = void 0 !== t.allowDeselect && t.allowDeselect, this.hideSelected = void 0 !== t.hideSelected && t.hideSelected, this.keepOrder = void 0 !== t.keepOrder && t.keepOrder, this.showOptionTooltips = void 0 !== t.showOptionTooltips && t.showOptionTooltips, this.minSelected = t.minSelected || 0, this.maxSelected = t.maxSelected || 1e3, this.timeoutDelay = t.timeoutDelay || 200, this.maxValuesShown = t.maxValuesShown || 20, this.maxValuesMessage = t.maxValuesMessage || "{number} selected", this.addableText = t.addableText || 'Press "Enter" to add {value}';
    }
  }
  return class {
    constructor(e) {
      var i;
      if (this.events = {
        search: void 0,
        searchFilter: (t, e) => -1 !== t.text.toLowerCase().indexOf(e.toLowerCase()),
        addable: void 0,
        beforeChange: void 0,
        afterChange: void 0,
        beforeOpen: void 0,
        afterOpen: void 0,
        beforeClose: void 0,
        afterClose: void 0
      }, this.windowResize = s(() => {
        (this.settings.isOpen || this.settings.isFullOpen) && this.render.moveContent();
      }), this.windowScroll = s(() => {
        (this.settings.isOpen || this.settings.isFullOpen) && this.render.moveContent();
      }), this.documentClick = t => {
        this.settings.isOpen && t.target && !function (t, e) {
          function s(t, s) {
            return s && t && t.classList && t.classList.contains(s) || s && t && t.dataset && t.dataset.id && t.dataset.id === e ? t : null;
          }
          return s(t, e) || function t(e, i) {
            return e && e !== document ? s(e, i) ? e : t(e.parentNode, i) : null;
          }(t, e);
        }(t.target, this.settings.id) && this.close(t.type);
      }, this.windowVisibilityChange = () => {
        document.hidden && this.close();
      }, this.selectEl = "string" == typeof e.select ? document.querySelector(e.select) : e.select, !this.selectEl) return void (e.events && e.events.error && e.events.error(new Error("Could not find select element")));
      if ("SELECT" !== this.selectEl.tagName) return void (e.events && e.events.error && e.events.error(new Error("Element isnt of type select")));
      this.selectEl.dataset.ssid && this.destroy(), this.settings = new c(e.settings), this.cssClasses = new t(e.cssClasses);
      const n = ["afterChange", "beforeOpen", "afterOpen", "beforeClose", "afterClose"];
      for (const t in e.events) e.events.hasOwnProperty(t) && (-1 !== n.indexOf(t) ? this.events[t] = s(e.events[t], 100) : this.events[t] = e.events[t]);
      this.settings.disabled = (null === (i = e.settings) || void 0 === i ? void 0 : i.disabled) ? e.settings.disabled : this.selectEl.disabled, this.settings.isMultiple = this.selectEl.multiple, this.settings.style = this.selectEl.style.cssText, this.settings.class = this.selectEl.className.split(" "), this.select = new h(this.selectEl), this.select.updateSelect(this.settings.id, this.settings.style, this.settings.class), this.select.hideUI(), this.select.onValueChange = t => {
        this.setSelected(t.map(t => t.id));
      }, this.select.onClassChange = t => {
        this.settings.class = t, this.render.updateClassStyles();
      }, this.select.onDisabledChange = t => {
        t ? this.disable() : this.enable();
      }, this.select.onOptionsChange = t => {
        this.setData(t);
      }, this.store = new l(this.settings.isMultiple ? "multiple" : "single", e.data ? e.data : this.select.getData()), e.data && this.select.updateOptions(this.store.getData());
      const a = {
        open: this.open.bind(this),
        close: this.close.bind(this),
        addable: this.events.addable ? this.events.addable : void 0,
        setSelected: this.setSelected.bind(this),
        addOption: this.addOption.bind(this),
        search: this.search.bind(this),
        beforeChange: this.events.beforeChange,
        afterChange: this.events.afterChange
      };
      this.render = new o(this.settings, this.cssClasses, this.store, a), this.render.renderValues(), this.render.renderOptions(this.store.getData());
      const r = this.selectEl.getAttribute("aria-label"),
        d = this.selectEl.getAttribute("aria-labelledby");
      r ? this.render.main.main.setAttribute("aria-label", r) : d && this.render.main.main.setAttribute("aria-labelledby", d), this.selectEl.parentNode && this.selectEl.parentNode.insertBefore(this.render.main.main, this.selectEl.nextSibling), window.addEventListener("resize", this.windowResize, !1), "auto" === this.settings.openPosition && window.addEventListener("scroll", this.windowScroll, !1), document.addEventListener("visibilitychange", this.windowVisibilityChange), this.settings.disabled && this.disable(), this.settings.alwaysOpen && this.open(), this.selectEl.slim = this;
    }
    enable() {
      this.settings.disabled = !1, this.select.enable(), this.render.enable();
    }
    disable() {
      this.settings.disabled = !0, this.select.disable(), this.render.disable();
    }
    getData() {
      return this.store.getData();
    }
    setData(t) {
      const e = this.store.getSelected(),
        s = this.store.validateDataArray(t);
      if (s) return void (this.events.error && this.events.error(s));
      this.store.setData(t);
      const n = this.store.getData();
      this.select.updateOptions(n), this.render.renderValues(), this.render.renderOptions(n), this.events.afterChange && !i(e, this.store.getSelected()) && this.events.afterChange(this.store.getSelectedOptions());
    }
    getSelected() {
      let t = this.store.getSelectedOptions();
      return this.settings.keepOrder && (t = this.store.selectedOrderOptions(t)), t.map(t => t.value);
    }
    setSelected(t, e = !0) {
      const s = this.store.getSelected(),
        n = this.store.getDataOptions();
      t = Array.isArray(t) ? t : [t];
      const a = [];
      for (const e of t) if (n.find(t => t.id == e)) a.push(e);else for (const t of n.filter(t => t.value == e)) a.push(t.id);
      this.store.setSelectedBy("id", a);
      const l = this.store.getData();
      this.select.updateOptions(l), this.render.renderValues(), "" !== this.render.content.search.input.value ? this.search(this.render.content.search.input.value) : this.render.renderOptions(l), e && this.events.afterChange && !i(s, this.store.getSelected()) && this.events.afterChange(this.store.getSelectedOptions());
    }
    addOption(t) {
      const e = this.store.getSelected();
      this.store.getDataOptions().some(e => {
        var s;
        return e.value === (null !== (s = t.value) && void 0 !== s ? s : t.text);
      }) || this.store.addOption(t);
      const s = this.store.getData();
      this.select.updateOptions(s), this.render.renderValues(), this.render.renderOptions(s), this.events.afterChange && !i(e, this.store.getSelected()) && this.events.afterChange(this.store.getSelectedOptions());
    }
    open() {
      this.settings.disabled || this.settings.isOpen || (this.events.beforeOpen && this.events.beforeOpen(), this.render.open(), this.settings.showSearch && this.settings.focusSearch && this.render.searchFocus(), this.settings.isOpen = !0, setTimeout(() => {
        this.events.afterOpen && this.events.afterOpen(), this.settings.isOpen && (this.settings.isFullOpen = !0), document.addEventListener("click", this.documentClick);
      }, this.settings.timeoutDelay), "absolute" === this.settings.contentPosition && (this.settings.intervalMove && clearInterval(this.settings.intervalMove), this.settings.intervalMove = setInterval(this.render.moveContent.bind(this.render), 500)));
    }
    close(t = null) {
      this.settings.isOpen && !this.settings.alwaysOpen && (this.events.beforeClose && this.events.beforeClose(), this.render.close(), "" !== this.render.content.search.input.value && this.search(""), this.render.mainFocus(t), this.settings.isOpen = !1, this.settings.isFullOpen = !1, setTimeout(() => {
        this.events.afterClose && this.events.afterClose(), document.removeEventListener("click", this.documentClick);
      }, this.settings.timeoutDelay), this.settings.intervalMove && clearInterval(this.settings.intervalMove));
    }
    search(t) {
      if (this.render.content.search.input.value !== t && (this.render.content.search.input.value = t), !this.events.search) return void this.render.renderOptions("" === t ? this.store.getData() : this.store.search(t, this.events.searchFilter));
      this.render.renderSearching();
      const e = this.events.search(t, this.store.getSelectedOptions());
      e instanceof Promise ? e.then(t => {
        this.render.renderOptions(this.store.partialToFullData(t));
      }).catch(t => {
        this.render.renderError("string" == typeof t ? t : t.message);
      }) : Array.isArray(e) ? this.render.renderOptions(this.store.partialToFullData(e)) : this.render.renderError("Search event must return a promise or an array of data");
    }
    destroy() {
      document.removeEventListener("click", this.documentClick), window.removeEventListener("resize", this.windowResize, !1), "auto" === this.settings.openPosition && window.removeEventListener("scroll", this.windowScroll, !1), document.removeEventListener("visibilitychange", this.windowVisibilityChange), this.store.setData([]), this.render.destroy(), this.select.destroy();
    }
  };
});