"use strict";

function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n6 = 0, F = function F() {}; return { s: F, n: function n() { return _n6 >= r.length ? { done: !0 } : { done: !1, value: r[_n6++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t.return || t.return(); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
!function (t, e) {
  "object" == typeof exports && "undefined" != typeof module ? module.exports = e() : "function" == typeof define && define.amd ? define(e) : (t = "undefined" != typeof globalThis ? globalThis : t || self).SlimSelect = e();
}(void 0, function () {
  "use strict";

  var t = /*#__PURE__*/_createClass(function t(_t) {
    _classCallCheck(this, t);
    _t || (_t = {}), this.main = _t.main || "ss-main", this.placeholder = _t.placeholder || "ss-placeholder", this.values = _t.values || "ss-values", this.single = _t.single || "ss-single", this.max = _t.max || "ss-max", this.value = _t.value || "ss-value", this.valueText = _t.valueText || "ss-value-text", this.valueDelete = _t.valueDelete || "ss-value-delete", this.valueOut = _t.valueOut || "ss-value-out", this.deselect = _t.deselect || "ss-deselect", this.deselectPath = _t.deselectPath || "M10,10 L90,90 M10,90 L90,10", this.arrow = _t.arrow || "ss-arrow", this.arrowClose = _t.arrowClose || "M10,30 L50,70 L90,30", this.arrowOpen = _t.arrowOpen || "M10,70 L50,30 L90,70", this.content = _t.content || "ss-content", this.openAbove = _t.openAbove || "ss-open-above", this.openBelow = _t.openBelow || "ss-open-below", this.search = _t.search || "ss-search", this.searchHighlighter = _t.searchHighlighter || "ss-search-highlight", this.searching = _t.searching || "ss-searching", this.addable = _t.addable || "ss-addable", this.addablePath = _t.addablePath || "M50,10 L50,90 M10,50 L90,50", this.list = _t.list || "ss-list", this.optgroup = _t.optgroup || "ss-optgroup", this.optgroupLabel = _t.optgroupLabel || "ss-optgroup-label", this.optgroupLabelText = _t.optgroupLabelText || "ss-optgroup-label-text", this.optgroupActions = _t.optgroupActions || "ss-optgroup-actions", this.optgroupSelectAll = _t.optgroupSelectAll || "ss-selectall", this.optgroupSelectAllBox = _t.optgroupSelectAllBox || "M60,10 L10,10 L10,90 L90,90 L90,50", this.optgroupSelectAllCheck = _t.optgroupSelectAllCheck || "M30,45 L50,70 L90,10", this.optgroupClosable = _t.optgroupClosable || "ss-closable", this.option = _t.option || "ss-option", this.optionDelete = _t.optionDelete || "M10,10 L90,90 M10,90 L90,10", this.highlighted = _t.highlighted || "ss-highlighted", this.open = _t.open || "ss-open", this.close = _t.close || "ss-close", this.selected = _t.selected || "ss-selected", this.error = _t.error || "ss-error", this.disabled = _t.disabled || "ss-disabled", this.hide = _t.hide || "ss-hide";
  });
  function e() {
    return Math.random().toString(36).substring(2, 10);
  }
  function s(t) {
    var e = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 50;
    var s = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : !1;
    var i;
    return function () {
      for (var _len = arguments.length, n = new Array(_len), _key = 0; _key < _len; _key++) {
        n[_key] = arguments[_key];
      }
      var a = self,
        l = s && !i;
      clearTimeout(i), i = setTimeout(function () {
        i = null, s || t.apply(a, n);
      }, e), l && t.apply(a, n);
    };
  }
  function i(t, e) {
    return JSON.stringify(t) === JSON.stringify(e);
  }
  var n = /*#__PURE__*/_createClass(function n(t) {
    _classCallCheck(this, n);
    if (this.id = t.id && "" !== t.id ? t.id : e(), this.label = t.label || "", this.selectAll = void 0 !== t.selectAll && t.selectAll, this.selectAllText = t.selectAllText || "Select All", this.closable = t.closable || "off", this.options = [], t.options) {
      var _iterator = _createForOfIteratorHelper(t.options),
        _step;
      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var _e = _step.value;
          this.options.push(new a(_e));
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
    }
  });
  var a = /*#__PURE__*/_createClass(function a(t) {
    _classCallCheck(this, a);
    this.id = t.id && "" !== t.id ? t.id : e(), this.value = void 0 === t.value ? t.text : t.value, this.text = t.text || "", this.html = t.html || "", this.selected = void 0 !== t.selected && t.selected, this.display = void 0 === t.display || t.display, this.disabled = void 0 !== t.disabled && t.disabled, this.mandatory = void 0 !== t.mandatory && t.mandatory, this.placeholder = void 0 !== t.placeholder && t.placeholder, this.class = t.class || "", this.style = t.style || "", this.data = t.data || {};
  });
  var l = /*#__PURE__*/function () {
    function l(t, e) {
      _classCallCheck(this, l);
      this.selectType = "single", this.data = [], this.selectedOrder = [], this.selectType = t, this.setData(e);
    }
    return _createClass(l, [{
      key: "validateDataArray",
      value: function validateDataArray(t) {
        if (!Array.isArray(t)) return new Error("Data must be an array");
        var _iterator2 = _createForOfIteratorHelper(t),
          _step2;
        try {
          for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
            var _e2 = _step2.value;
            if (_e2 instanceof n || "label" in _e2) {
              if (!("label" in _e2)) return new Error("Optgroup must have a label");
              if ("options" in _e2 && _e2.options) {
                var _iterator3 = _createForOfIteratorHelper(_e2.options),
                  _step3;
                try {
                  for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
                    var _t2 = _step3.value;
                    var _e3 = this.validateOption(_t2);
                    if (_e3) return _e3;
                  }
                } catch (err) {
                  _iterator3.e(err);
                } finally {
                  _iterator3.f();
                }
              }
            } else {
              if (!(_e2 instanceof a || "text" in _e2)) return new Error("Data object must be a valid optgroup or option");
              {
                var _t3 = this.validateOption(_e2);
                if (_t3) return _t3;
              }
            }
          }
        } catch (err) {
          _iterator2.e(err);
        } finally {
          _iterator2.f();
        }
        return null;
      }
    }, {
      key: "validateOption",
      value: function validateOption(t) {
        return "text" in t ? null : new Error("Option must have a text");
      }
    }, {
      key: "partialToFullData",
      value: function partialToFullData(t) {
        var e = [];
        return t.forEach(function (t) {
          if (t instanceof n || "label" in t) {
            var _s = [];
            "options" in t && t.options && t.options.forEach(function (t) {
              _s.push(new a(t));
            }), _s.length > 0 && e.push(new n(t));
          }
          (t instanceof a || "text" in t) && e.push(new a(t));
        }), e;
      }
    }, {
      key: "setData",
      value: function setData(t) {
        this.data = this.partialToFullData(t), "single" === this.selectType && this.setSelectedBy("id", this.getSelected());
      }
    }, {
      key: "getData",
      value: function getData() {
        return this.filter(null, !0);
      }
    }, {
      key: "getDataOptions",
      value: function getDataOptions() {
        return this.filter(null, !1);
      }
    }, {
      key: "addOption",
      value: function addOption(t) {
        var e = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : !1;
        if (e) {
          var _e4 = [new a(t)];
          this.setData(_e4.concat(this.getData()));
        } else this.setData(this.getData().concat(new a(t)));
      }
    }, {
      key: "setSelectedBy",
      value: function setSelectedBy(t, e) {
        var s = null,
          i = !1;
        var _l = [];
        var _iterator4 = _createForOfIteratorHelper(this.data),
          _step4;
        try {
          for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
            var _o = _step4.value;
            if (_o instanceof n) {
              var _iterator5 = _createForOfIteratorHelper(_o.options),
                _step5;
              try {
                for (_iterator5.s(); !(_step5 = _iterator5.n()).done;) {
                  var _n = _step5.value;
                  s || (s = _n), _n.selected = !i && e.includes(_n[t]), _n.selected && (_l.push(_n), "single" === this.selectType && (i = !0));
                }
              } catch (err) {
                _iterator5.e(err);
              } finally {
                _iterator5.f();
              }
            }
            _o instanceof a && (s || (s = _o), _o.selected = !i && e.includes(_o[t]), _o.selected && (_l.push(_o), "single" === this.selectType && (i = !0)));
          }
        } catch (err) {
          _iterator4.e(err);
        } finally {
          _iterator4.f();
        }
        "single" === this.selectType && s && !i && (s.selected = !0, _l.push(s));
        var o = e.map(function (e) {
          var s;
          return (null === (s = _l.find(function (s) {
            return s[t] === e;
          })) || void 0 === s ? void 0 : s.id) || "";
        });
        this.selectedOrder = o;
      }
    }, {
      key: "getSelected",
      value: function getSelected() {
        return this.getSelectedOptions().map(function (t) {
          return t.id;
        });
      }
    }, {
      key: "getSelectedValues",
      value: function getSelectedValues() {
        return this.getSelectedOptions().map(function (t) {
          return t.value;
        });
      }
    }, {
      key: "getSelectedOptions",
      value: function getSelectedOptions() {
        return this.filter(function (t) {
          return t.selected;
        }, !1);
      }
    }, {
      key: "getOptgroupByID",
      value: function getOptgroupByID(t) {
        var _iterator6 = _createForOfIteratorHelper(this.data),
          _step6;
        try {
          for (_iterator6.s(); !(_step6 = _iterator6.n()).done;) {
            var _e5 = _step6.value;
            if (_e5 instanceof n && _e5.id === t) return _e5;
          }
        } catch (err) {
          _iterator6.e(err);
        } finally {
          _iterator6.f();
        }
        return null;
      }
    }, {
      key: "getOptionByID",
      value: function getOptionByID(t) {
        var e = this.filter(function (e) {
          return e.id === t;
        }, !1);
        return e.length ? e[0] : null;
      }
    }, {
      key: "getSelectType",
      value: function getSelectType() {
        return this.selectType;
      }
    }, {
      key: "getFirstOption",
      value: function getFirstOption() {
        var t = null;
        var _iterator7 = _createForOfIteratorHelper(this.data),
          _step7;
        try {
          for (_iterator7.s(); !(_step7 = _iterator7.n()).done;) {
            var _e6 = _step7.value;
            if (_e6 instanceof n ? t = _e6.options[0] : _e6 instanceof a && (t = _e6), t) break;
          }
        } catch (err) {
          _iterator7.e(err);
        } finally {
          _iterator7.f();
        }
        return t;
      }
    }, {
      key: "search",
      value: function search(t, e) {
        return "" === (t = t.trim()) ? this.getData() : this.filter(function (s) {
          return e(s, t);
        }, !0);
      }
    }, {
      key: "filter",
      value: function filter(t, e) {
        var s = [];
        return this.data.forEach(function (i) {
          if (i instanceof n) {
            var _l2 = [];
            if (i.options.forEach(function (i) {
              t && !t(i) || (e ? _l2.push(new a(i)) : s.push(new a(i)));
            }), _l2.length > 0) {
              var _t4 = new n(i);
              _t4.options = _l2, s.push(_t4);
            }
          }
          i instanceof a && (t && !t(i) || s.push(new a(i)));
        }), s;
      }
    }, {
      key: "selectedOrderOptions",
      value: function selectedOrderOptions(t) {
        var e = [];
        return this.selectedOrder.forEach(function (s) {
          var i = t.find(function (t) {
            return t.id === s;
          });
          i && e.push(i);
        }), t.forEach(function (t) {
          var s = !1;
          e.forEach(function (e) {
            t.id !== e.id || (s = !0);
          }), s || e.push(t);
        }), e;
      }
    }]);
  }();
  var o = /*#__PURE__*/function () {
    function o(t, e, s, i) {
      _classCallCheck(this, o);
      this.store = s, this.settings = t, this.classes = e, this.callbacks = i, this.main = this.mainDiv(), this.content = this.contentDiv(), this.updateClassStyles(), this.updateAriaAttributes(), this.settings.contentLocation && this.settings.contentLocation.appendChild(this.content.main);
    }
    return _createClass(o, [{
      key: "enable",
      value: function enable() {
        this.main.main.classList.remove(this.classes.disabled), this.content.search.input.disabled = !1;
      }
    }, {
      key: "disable",
      value: function disable() {
        this.main.main.classList.add(this.classes.disabled), this.content.search.input.disabled = !0;
      }
    }, {
      key: "open",
      value: function open() {
        this.main.arrow.path.setAttribute("d", this.classes.arrowOpen), this.main.main.classList.add("up" === this.settings.openPosition ? this.classes.openAbove : this.classes.openBelow), this.main.main.setAttribute("aria-expanded", "true"), this.moveContent();
        var t = this.store.getSelectedOptions();
        if (t.length) {
          var _e7 = t[t.length - 1].id,
            _s2 = this.content.list.querySelector('[data-id="' + _e7 + '"]');
          _s2 && this.ensureElementInView(this.content.list, _s2);
        }
      }
    }, {
      key: "close",
      value: function close() {
        this.main.main.classList.remove(this.classes.openAbove), this.main.main.classList.remove(this.classes.openBelow), this.main.main.setAttribute("aria-expanded", "false"), this.content.main.classList.remove(this.classes.openAbove), this.content.main.classList.remove(this.classes.openBelow), this.main.arrow.path.setAttribute("d", this.classes.arrowClose);
      }
    }, {
      key: "updateClassStyles",
      value: function updateClassStyles() {
        if (this.main.main.className = "", this.main.main.removeAttribute("style"), this.content.main.className = "", this.content.main.removeAttribute("style"), this.main.main.classList.add(this.classes.main), this.content.main.classList.add(this.classes.content), "" !== this.settings.style && (this.main.main.style.cssText = this.settings.style, this.content.main.style.cssText = this.settings.style), this.settings.class.length) {
          var _iterator8 = _createForOfIteratorHelper(this.settings.class),
            _step8;
          try {
            for (_iterator8.s(); !(_step8 = _iterator8.n()).done;) {
              var _t5 = _step8.value;
              "" !== _t5.trim() && (this.main.main.classList.add(_t5.trim()), this.content.main.classList.add(_t5.trim()));
            }
          } catch (err) {
            _iterator8.e(err);
          } finally {
            _iterator8.f();
          }
        }
        "relative" !== this.settings.contentPosition && "fixed" !== this.settings.contentPosition || this.content.main.classList.add("ss-" + this.settings.contentPosition);
      }
    }, {
      key: "updateAriaAttributes",
      value: function updateAriaAttributes() {
        this.main.main.role = "combobox", this.main.main.setAttribute("aria-haspopup", "listbox"), this.main.main.setAttribute("aria-controls", this.content.main.id), this.main.main.setAttribute("aria-expanded", "false"), this.content.main.setAttribute("role", "listbox");
      }
    }, {
      key: "mainDiv",
      value: function mainDiv() {
        var _this = this;
        var t;
        var e = document.createElement("div");
        e.dataset.id = this.settings.id, e.setAttribute("aria-label", this.settings.ariaLabel), e.tabIndex = 0, e.onkeydown = function (t) {
          switch (t.key) {
            case "ArrowUp":
            case "ArrowDown":
              return _this.callbacks.open(), "ArrowDown" === t.key ? _this.highlight("down") : _this.highlight("up"), !1;
            case "Tab":
              return _this.callbacks.close(), !0;
            case "Enter":
            case " ":
              _this.callbacks.open();
              var _e8 = _this.content.list.querySelector("." + _this.classes.highlighted);
              return _e8 && _e8.click(), !1;
            case "Escape":
              return _this.callbacks.close(), !1;
          }
          return 1 === t.key.length && _this.callbacks.open(), !0;
        }, e.onclick = function (t) {
          _this.settings.disabled || (_this.settings.isOpen ? _this.callbacks.close() : _this.callbacks.open());
        };
        var s = document.createElement("div");
        s.classList.add(this.classes.values), e.appendChild(s);
        var i = document.createElement("div");
        i.classList.add(this.classes.deselect);
        var n = null === (t = this.store) || void 0 === t ? void 0 : t.getSelectedOptions();
        !this.settings.allowDeselect || this.settings.isMultiple && n && n.length <= 0 ? i.classList.add(this.classes.hide) : i.classList.remove(this.classes.hide), i.onclick = function (t) {
          if (t.stopPropagation(), _this.settings.disabled) return;
          var e = !0;
          var s = _this.store.getSelectedOptions(),
            i = [];
          if (_this.callbacks.beforeChange && (e = !0 === _this.callbacks.beforeChange(i, s)), e) {
            if (_this.settings.isMultiple) _this.callbacks.setSelected([], !1), _this.updateDeselectAll();else {
              var _t6 = _this.store.getFirstOption(),
                _e9 = _t6 ? _t6.id : "";
              _this.callbacks.setSelected(_e9, !1);
            }
            _this.settings.closeOnSelect && _this.callbacks.close(), _this.callbacks.afterChange && _this.callbacks.afterChange(_this.store.getSelectedOptions());
          }
        };
        var a = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        a.setAttribute("viewBox", "0 0 100 100");
        var l = document.createElementNS("http://www.w3.org/2000/svg", "path");
        l.setAttribute("d", this.classes.deselectPath), a.appendChild(l), i.appendChild(a), e.appendChild(i);
        var _o2 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        _o2.classList.add(this.classes.arrow), _o2.setAttribute("viewBox", "0 0 100 100");
        var h = document.createElementNS("http://www.w3.org/2000/svg", "path");
        return h.setAttribute("d", this.classes.arrowClose), this.settings.alwaysOpen && _o2.classList.add(this.classes.hide), _o2.appendChild(h), e.appendChild(_o2), {
          main: e,
          values: s,
          deselect: {
            main: i,
            svg: a,
            path: l
          },
          arrow: {
            main: _o2,
            path: h
          }
        };
      }
    }, {
      key: "mainFocus",
      value: function mainFocus(t) {
        "click" !== t && this.main.main.focus({
          preventScroll: !0
        });
      }
    }, {
      key: "placeholder",
      value: function placeholder() {
        var t = this.store.filter(function (t) {
          return t.placeholder;
        }, !1);
        var e = this.settings.placeholderText;
        t.length && ("" !== t[0].html ? e = t[0].html : "" !== t[0].text && (e = t[0].text));
        var s = document.createElement("div");
        return s.classList.add(this.classes.placeholder), s.innerHTML = e, s;
      }
    }, {
      key: "renderValues",
      value: function renderValues() {
        this.settings.isMultiple ? (this.renderMultipleValues(), this.updateDeselectAll()) : this.renderSingleValue();
      }
    }, {
      key: "renderSingleValue",
      value: function renderSingleValue() {
        var t = this.store.filter(function (t) {
            return t.selected && !t.placeholder;
          }, !1),
          e = t.length > 0 ? t[0] : null;
        if (e) {
          var _t7 = document.createElement("div");
          _t7.classList.add(this.classes.single), e.html ? _t7.innerHTML = e.html : _t7.innerText = e.text, this.main.values.innerHTML = _t7.outerHTML;
        } else this.main.values.innerHTML = this.placeholder().outerHTML;
        this.settings.allowDeselect && t.length ? this.main.deselect.main.classList.remove(this.classes.hide) : this.main.deselect.main.classList.add(this.classes.hide);
      }
    }, {
      key: "renderMultipleValues",
      value: function renderMultipleValues() {
        var _this2 = this;
        var t = this.main.values.childNodes,
          e = this.store.filter(function (t) {
            return t.selected && t.display;
          }, !1);
        if (0 === e.length) return void (this.main.values.innerHTML = this.placeholder().outerHTML);
        {
          var _t8 = this.main.values.querySelector("." + this.classes.placeholder);
          _t8 && _t8.remove();
        }
        if (e.length > this.settings.maxValuesShown) {
          var _t9 = document.createElement("div");
          return _t9.classList.add(this.classes.max), _t9.textContent = this.settings.maxValuesMessage.replace("{number}", e.length.toString()), void (this.main.values.innerHTML = _t9.outerHTML);
        }
        {
          var _t10 = this.main.values.querySelector("." + this.classes.max);
          _t10 && _t10.remove();
        }
        this.settings.keepOrder && (e = this.store.selectedOrderOptions(e));
        var s = [];
        var _loop = function _loop() {
          var n = t[_i],
            a = n.getAttribute("data-id");
          if (a) {
            e.filter(function (t) {
              return t.id === a;
            }, !1).length || s.push(n);
          }
        };
        for (var _i = 0; _i < t.length; _i++) {
          _loop();
        }
        var _loop2 = function _loop2() {
          var t = _s3[_i2];
          t.classList.add(_this2.classes.valueOut), setTimeout(function () {
            _this2.main.values.hasChildNodes() && _this2.main.values.contains(t) && _this2.main.values.removeChild(t);
          }, 100);
        };
        for (var _i2 = 0, _s3 = s; _i2 < _s3.length; _i2++) {
          _loop2();
        }
        t = this.main.values.childNodes;
        for (var _s4 = 0; _s4 < e.length; _s4++) {
          var _i3 = !0;
          for (var _n2 = 0; _n2 < t.length; _n2++) e[_s4].id === String(t[_n2].dataset.id) && (_i3 = !1);
          _i3 && (this.settings.keepOrder || 0 === t.length ? this.main.values.appendChild(this.multipleValue(e[_s4])) : 0 === _s4 ? this.main.values.insertBefore(this.multipleValue(e[_s4]), t[_s4]) : t[_s4 - 1].insertAdjacentElement("afterend", this.multipleValue(e[_s4])));
        }
      }
    }, {
      key: "multipleValue",
      value: function multipleValue(t) {
        var _this3 = this;
        var e = document.createElement("div");
        e.classList.add(this.classes.value), e.dataset.id = t.id;
        var s = document.createElement("div");
        if (s.classList.add(this.classes.valueText), s.textContent = t.text, e.appendChild(s), !t.mandatory) {
          var _s5 = document.createElement("div");
          _s5.classList.add(this.classes.valueDelete), _s5.onclick = function (e) {
            if (e.preventDefault(), e.stopPropagation(), _this3.settings.disabled) return;
            var s = !0;
            var i = _this3.store.getSelectedOptions(),
              l = i.filter(function (e) {
                return e.selected && e.id !== t.id;
              }, !0);
            if (!(_this3.settings.minSelected && l.length < _this3.settings.minSelected) && (_this3.callbacks.beforeChange && (s = !0 === _this3.callbacks.beforeChange(l, i)), s)) {
              var _t11 = [];
              var _iterator9 = _createForOfIteratorHelper(l),
                _step9;
              try {
                for (_iterator9.s(); !(_step9 = _iterator9.n()).done;) {
                  var _e10 = _step9.value;
                  if (_e10 instanceof n) {
                    var _iterator10 = _createForOfIteratorHelper(_e10.options),
                      _step10;
                    try {
                      for (_iterator10.s(); !(_step10 = _iterator10.n()).done;) {
                        var _s6 = _step10.value;
                        _t11.push(_s6.id);
                      }
                    } catch (err) {
                      _iterator10.e(err);
                    } finally {
                      _iterator10.f();
                    }
                  }
                  _e10 instanceof a && _t11.push(_e10.id);
                }
              } catch (err) {
                _iterator9.e(err);
              } finally {
                _iterator9.f();
              }
              _this3.callbacks.setSelected(_t11, !1), _this3.settings.closeOnSelect && _this3.callbacks.close(), _this3.callbacks.afterChange && _this3.callbacks.afterChange(l), _this3.updateDeselectAll();
            }
          };
          var _i4 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          _i4.setAttribute("viewBox", "0 0 100 100");
          var _l3 = document.createElementNS("http://www.w3.org/2000/svg", "path");
          _l3.setAttribute("d", this.classes.optionDelete), _i4.appendChild(_l3), _s5.appendChild(_i4), e.appendChild(_s5);
        }
        return e;
      }
    }, {
      key: "contentDiv",
      value: function contentDiv() {
        var t = document.createElement("div");
        t.dataset.id = this.settings.id;
        var e = this.searchDiv();
        t.appendChild(e.main);
        var s = this.listDiv();
        return t.appendChild(s), {
          main: t,
          search: e,
          list: s
        };
      }
    }, {
      key: "moveContent",
      value: function moveContent() {
        "relative" !== this.settings.contentPosition && "down" !== this.settings.openPosition ? "up" !== this.settings.openPosition ? "up" === this.putContent() ? this.moveContentAbove() : this.moveContentBelow() : this.moveContentAbove() : this.moveContentBelow();
      }
    }, {
      key: "searchDiv",
      value: function searchDiv() {
        var _this4 = this;
        var t = document.createElement("div"),
          e = document.createElement("input"),
          i = document.createElement("div");
        t.classList.add(this.classes.search);
        var n = {
          main: t,
          input: e
        };
        if (this.settings.showSearch || (t.classList.add(this.classes.hide), e.readOnly = !0), e.type = "search", e.placeholder = this.settings.searchPlaceholder, e.tabIndex = -1, e.setAttribute("aria-label", this.settings.searchPlaceholder), e.setAttribute("autocapitalize", "off"), e.setAttribute("autocomplete", "off"), e.setAttribute("autocorrect", "off"), e.oninput = s(function (t) {
          _this4.callbacks.search(t.target.value);
        }, 100), e.onkeydown = function (t) {
          switch (t.key) {
            case "ArrowUp":
            case "ArrowDown":
              return "ArrowDown" === t.key ? _this4.highlight("down") : _this4.highlight("up"), !1;
            case "Tab":
              return _this4.callbacks.close(), !0;
            case "Escape":
              return _this4.callbacks.close(), !1;
            case " ":
              var _e11 = _this4.content.list.querySelector("." + _this4.classes.highlighted);
              return !_e11 || (_e11.click(), !1);
            case "Enter":
              if (_this4.callbacks.addable) return i.click(), !1;
              {
                var _t12 = _this4.content.list.querySelector("." + _this4.classes.highlighted);
                if (_t12) return _t12.click(), !1;
              }
              return !0;
          }
          return !0;
        }, t.appendChild(e), this.callbacks.addable) {
          i.classList.add(this.classes.addable);
          var _e12 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          _e12.setAttribute("viewBox", "0 0 100 100");
          var _s7 = document.createElementNS("http://www.w3.org/2000/svg", "path");
          _s7.setAttribute("d", this.classes.addablePath), _e12.appendChild(_s7), i.appendChild(_e12), i.onclick = function (t) {
            if (t.preventDefault(), t.stopPropagation(), !_this4.callbacks.addable) return;
            var e = _this4.content.search.input.value.trim();
            if ("" === e) return void _this4.content.search.input.focus();
            var s = function s(t) {
                var e = new a(t);
                if (_this4.callbacks.addOption(e), _this4.settings.isMultiple) {
                  var _t13 = _this4.store.getSelected();
                  _t13.push(e.id), _this4.callbacks.setSelected(_t13, !0);
                } else _this4.callbacks.setSelected([e.id], !0);
                _this4.callbacks.search(""), _this4.settings.closeOnSelect && setTimeout(function () {
                  _this4.callbacks.close();
                }, 100);
              },
              i = _this4.callbacks.addable(e);
            !1 !== i && null != i && (i instanceof Promise ? i.then(function (t) {
              "string" == typeof t ? s({
                text: t,
                value: t
              }) : i instanceof Error ? _this4.renderError(i.message) : s(t);
            }) : "string" == typeof i ? s({
              text: i,
              value: i
            }) : i instanceof Error ? _this4.renderError(i.message) : s(i));
          }, t.appendChild(i), n.addable = {
            main: i,
            svg: _e12,
            path: _s7
          };
        }
        return n;
      }
    }, {
      key: "searchFocus",
      value: function searchFocus() {
        this.content.search.input.focus();
      }
    }, {
      key: "getOptions",
      value: function getOptions() {
        var t = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : !1;
        var e = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : !1;
        var s = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : !1;
        var i = "." + this.classes.option;
        return t && (i += ":not(." + this.classes.placeholder + ")"), e && (i += ":not(." + this.classes.disabled + ")"), s && (i += ":not(." + this.classes.hide + ")"), Array.from(this.content.list.querySelectorAll(i));
      }
    }, {
      key: "highlight",
      value: function highlight(t) {
        var e = this.getOptions(!0, !0, !0);
        if (0 === e.length) return;
        if (1 === e.length && !e[0].classList.contains(this.classes.highlighted)) return void e[0].classList.add(this.classes.highlighted);
        var s = !1;
        var _iterator11 = _createForOfIteratorHelper(e),
          _step11;
        try {
          for (_iterator11.s(); !(_step11 = _iterator11.n()).done;) {
            var _t17 = _step11.value;
            _t17.classList.contains(this.classes.highlighted) && (s = !0);
          }
        } catch (err) {
          _iterator11.e(err);
        } finally {
          _iterator11.f();
        }
        if (!s) {
          var _iterator12 = _createForOfIteratorHelper(e),
            _step12;
          try {
            for (_iterator12.s(); !(_step12 = _iterator12.n()).done;) {
              var _t14 = _step12.value;
              if (_t14.classList.contains(this.classes.selected)) {
                _t14.classList.add(this.classes.highlighted);
                break;
              }
            }
          } catch (err) {
            _iterator12.e(err);
          } finally {
            _iterator12.f();
          }
        }
        for (var _s8 = 0; _s8 < e.length; _s8++) if (e[_s8].classList.contains(this.classes.highlighted)) {
          var _i5 = e[_s8];
          _i5.classList.remove(this.classes.highlighted);
          var _n3 = _i5.parentElement;
          if (_n3 && _n3.classList.contains(this.classes.open)) {
            var _t15 = _n3.querySelector("." + this.classes.optgroupLabel);
            _t15 && _t15.click();
          }
          var _a = e["down" === t ? _s8 + 1 < e.length ? _s8 + 1 : 0 : _s8 - 1 >= 0 ? _s8 - 1 : e.length - 1];
          _a.classList.add(this.classes.highlighted), this.ensureElementInView(this.content.list, _a);
          var _l4 = _a.parentElement;
          if (_l4 && _l4.classList.contains(this.classes.close)) {
            var _t16 = _l4.querySelector("." + this.classes.optgroupLabel);
            _t16 && _t16.click();
          }
          return;
        }
        e["down" === t ? 0 : e.length - 1].classList.add(this.classes.highlighted), this.ensureElementInView(this.content.list, e["down" === t ? 0 : e.length - 1]);
      }
    }, {
      key: "listDiv",
      value: function listDiv() {
        var t = document.createElement("div");
        return t.classList.add(this.classes.list), t;
      }
    }, {
      key: "renderError",
      value: function renderError(t) {
        this.content.list.innerHTML = "";
        var e = document.createElement("div");
        e.classList.add(this.classes.error), e.textContent = t, this.content.list.appendChild(e);
      }
    }, {
      key: "renderSearching",
      value: function renderSearching() {
        this.content.list.innerHTML = "";
        var t = document.createElement("div");
        t.classList.add(this.classes.searching), t.textContent = this.settings.searchingText, this.content.list.appendChild(t);
      }
    }, {
      key: "renderOptions",
      value: function renderOptions(t) {
        var _this5 = this;
        if (this.content.list.innerHTML = "", 0 === t.length) {
          var _t18 = document.createElement("div");
          return _t18.classList.add(this.classes.search), this.callbacks.addable ? _t18.innerHTML = this.settings.addableText.replace("{value}", this.content.search.input.value) : _t18.innerHTML = this.settings.searchText, void this.content.list.appendChild(_t18);
        }
        if (this.settings.allowDeselect && !this.settings.isMultiple) {
          this.store.filter(function (t) {
            return t.placeholder;
          }, !1).length || this.store.addOption(new a({
            text: "",
            value: "",
            selected: !1,
            placeholder: !0
          }), !0);
        }
        var _iterator13 = _createForOfIteratorHelper(t),
          _step13;
        try {
          var _loop3 = function _loop3() {
            var e = _step13.value;
            if (e instanceof n) {
              var _t19 = document.createElement("div");
              _t19.classList.add(_this5.classes.optgroup);
              var _s9 = document.createElement("div");
              _s9.classList.add(_this5.classes.optgroupLabel), _t19.appendChild(_s9);
              var _i6 = document.createElement("div");
              _i6.classList.add(_this5.classes.optgroupLabelText), _i6.textContent = e.label, _s9.appendChild(_i6);
              var _n4 = document.createElement("div");
              if (_n4.classList.add(_this5.classes.optgroupActions), _s9.appendChild(_n4), _this5.settings.isMultiple && e.selectAll) {
                var _t20 = document.createElement("div");
                _t20.classList.add(_this5.classes.optgroupSelectAll);
                var _s10 = !0;
                var _iterator14 = _createForOfIteratorHelper(e.options),
                  _step14;
                try {
                  for (_iterator14.s(); !(_step14 = _iterator14.n()).done;) {
                    var _t24 = _step14.value;
                    if (!_t24.selected) {
                      _s10 = !1;
                      break;
                    }
                  }
                } catch (err) {
                  _iterator14.e(err);
                } finally {
                  _iterator14.f();
                }
                _s10 && _t20.classList.add(_this5.classes.selected);
                var _i7 = document.createElement("span");
                _i7.textContent = e.selectAllText, _t20.appendChild(_i7);
                var _a2 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                _a2.setAttribute("viewBox", "0 0 100 100"), _t20.appendChild(_a2);
                var _l5 = document.createElementNS("http://www.w3.org/2000/svg", "path");
                _l5.setAttribute("d", _this5.classes.optgroupSelectAllBox), _a2.appendChild(_l5);
                var _o3 = document.createElementNS("http://www.w3.org/2000/svg", "path");
                _o3.setAttribute("d", _this5.classes.optgroupSelectAllCheck), _a2.appendChild(_o3), _t20.addEventListener("click", function (t) {
                  t.preventDefault(), t.stopPropagation();
                  var i = _this5.store.getSelected();
                  if (_s10) {
                    var _t21 = i.filter(function (t) {
                      var _iterator15 = _createForOfIteratorHelper(e.options),
                        _step15;
                      try {
                        for (_iterator15.s(); !(_step15 = _iterator15.n()).done;) {
                          var _s11 = _step15.value;
                          if (t === _s11.id) return !1;
                        }
                      } catch (err) {
                        _iterator15.e(err);
                      } finally {
                        _iterator15.f();
                      }
                      return !0;
                    });
                    _this5.callbacks.setSelected(_t21, !0);
                  } else {
                    var _t22 = i.concat(e.options.map(function (t) {
                      return t.id;
                    }));
                    var _iterator16 = _createForOfIteratorHelper(e.options),
                      _step16;
                    try {
                      for (_iterator16.s(); !(_step16 = _iterator16.n()).done;) {
                        var _t23 = _step16.value;
                        _this5.store.getOptionByID(_t23.id) || _this5.callbacks.addOption(_t23);
                      }
                    } catch (err) {
                      _iterator16.e(err);
                    } finally {
                      _iterator16.f();
                    }
                    _this5.callbacks.setSelected(_t22, !0);
                  }
                }), _n4.appendChild(_t20);
              }
              if ("off" !== e.closable) {
                var _i8 = document.createElement("div");
                _i8.classList.add(_this5.classes.optgroupClosable);
                var _a3 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                _a3.setAttribute("viewBox", "0 0 100 100"), _a3.classList.add(_this5.classes.arrow), _i8.appendChild(_a3);
                var _l6 = document.createElementNS("http://www.w3.org/2000/svg", "path");
                _a3.appendChild(_l6), e.options.some(function (t) {
                  return t.selected;
                }) || "" !== _this5.content.search.input.value.trim() ? (_i8.classList.add(_this5.classes.open), _l6.setAttribute("d", _this5.classes.arrowOpen)) : "open" === e.closable ? (_t19.classList.add(_this5.classes.open), _l6.setAttribute("d", _this5.classes.arrowOpen)) : "close" === e.closable && (_t19.classList.add(_this5.classes.close), _l6.setAttribute("d", _this5.classes.arrowClose)), _s9.addEventListener("click", function (e) {
                  e.preventDefault(), e.stopPropagation(), _t19.classList.contains(_this5.classes.close) ? (_t19.classList.remove(_this5.classes.close), _t19.classList.add(_this5.classes.open), _l6.setAttribute("d", _this5.classes.arrowOpen)) : (_t19.classList.remove(_this5.classes.open), _t19.classList.add(_this5.classes.close), _l6.setAttribute("d", _this5.classes.arrowClose));
                }), _n4.appendChild(_i8);
              }
              _t19.appendChild(_s9);
              var _iterator17 = _createForOfIteratorHelper(e.options),
                _step17;
              try {
                for (_iterator17.s(); !(_step17 = _iterator17.n()).done;) {
                  var _s12 = _step17.value;
                  _t19.appendChild(_this5.option(_s12));
                }
              } catch (err) {
                _iterator17.e(err);
              } finally {
                _iterator17.f();
              }
              _this5.content.list.appendChild(_t19);
            }
            e instanceof a && _this5.content.list.appendChild(_this5.option(e));
          };
          for (_iterator13.s(); !(_step13 = _iterator13.n()).done;) {
            _loop3();
          }
        } catch (err) {
          _iterator13.e(err);
        } finally {
          _iterator13.f();
        }
      }
    }, {
      key: "option",
      value: function option(t) {
        var _this6 = this;
        if (t.placeholder) {
          var _t25 = document.createElement("div");
          return _t25.classList.add(this.classes.option), _t25.classList.add(this.classes.hide), _t25;
        }
        var e = document.createElement("div");
        return e.dataset.id = t.id, e.classList.add(this.classes.option), e.setAttribute("role", "option"), t.class && t.class.split(" ").forEach(function (t) {
          e.classList.add(t);
        }), t.style && (e.style.cssText = t.style), this.settings.searchHighlight && "" !== this.content.search.input.value.trim() ? e.innerHTML = this.highlightText("" !== t.html ? t.html : t.text, this.content.search.input.value, this.classes.searchHighlighter) : "" !== t.html ? e.innerHTML = t.html : e.textContent = t.text, this.settings.showOptionTooltips && e.textContent && e.setAttribute("title", e.textContent), t.display || e.classList.add(this.classes.hide), t.disabled && e.classList.add(this.classes.disabled), t.selected && this.settings.hideSelected && e.classList.add(this.classes.hide), t.selected ? (e.classList.add(this.classes.selected), e.setAttribute("aria-selected", "true"), this.main.main.setAttribute("aria-activedescendant", e.id)) : (e.classList.remove(this.classes.selected), e.setAttribute("aria-selected", "false")), e.addEventListener("click", function (e) {
          e.preventDefault(), e.stopPropagation();
          var s = _this6.store.getSelected(),
            i = e.currentTarget,
            n = String(i.dataset.id);
          if (t.disabled || t.selected && !_this6.settings.allowDeselect) return;
          if (_this6.settings.isMultiple && _this6.settings.maxSelected <= s.length && !t.selected || _this6.settings.isMultiple && _this6.settings.minSelected >= s.length && t.selected) return;
          var a = !1;
          var l = _this6.store.getSelectedOptions();
          var _o4 = [];
          _this6.settings.isMultiple && (_o4 = t.selected ? l.filter(function (t) {
            return t.id !== n;
          }) : l.concat(t)), _this6.settings.isMultiple || (_o4 = t.selected ? [] : [t]), _this6.callbacks.beforeChange || (a = !0), _this6.callbacks.beforeChange && (a = !1 !== _this6.callbacks.beforeChange(_o4, l)), a && (_this6.store.getOptionByID(n) || _this6.callbacks.addOption(t), _this6.callbacks.setSelected(_o4.map(function (t) {
            return t.id;
          }), !1), _this6.settings.closeOnSelect && _this6.callbacks.close(), _this6.callbacks.afterChange && _this6.callbacks.afterChange(_o4));
        }), e;
      }
    }, {
      key: "destroy",
      value: function destroy() {
        this.main.main.remove(), this.content.main.remove();
      }
    }, {
      key: "highlightText",
      value: function highlightText(t, e, s) {
        var i = t;
        var n = new RegExp("(?![^<]*>)(" + e.trim() + ")(?![^<]*>[^<>]*</)", "i");
        if (!t.match(n)) return t;
        var a = t.match(n).index,
          l = a + t.match(n)[0].toString().length,
          _o5 = t.substring(a, l);
        return i = i.replace(n, "<mark class=\"".concat(s, "\">").concat(_o5, "</mark>")), i;
      }
    }, {
      key: "moveContentAbove",
      value: function moveContentAbove() {
        var t = this.main.main.offsetHeight,
          e = this.content.main.offsetHeight;
        this.main.main.classList.remove(this.classes.openBelow), this.main.main.classList.add(this.classes.openAbove), this.content.main.classList.remove(this.classes.openBelow), this.content.main.classList.add(this.classes.openAbove);
        var s = this.main.main.getBoundingClientRect();
        this.content.main.style.margin = "-" + (t + e - 1) + "px 0px 0px 0px", this.content.main.style.top = s.top + s.height + ("fixed" === this.settings.contentPosition ? 0 : window.scrollY) + "px", this.content.main.style.left = s.left + ("fixed" === this.settings.contentPosition ? 0 : window.scrollX) + "px", this.content.main.style.width = s.width + "px";
      }
    }, {
      key: "moveContentBelow",
      value: function moveContentBelow() {
        this.main.main.classList.remove(this.classes.openAbove), this.main.main.classList.add(this.classes.openBelow), this.content.main.classList.remove(this.classes.openAbove), this.content.main.classList.add(this.classes.openBelow);
        var t = this.main.main.getBoundingClientRect();
        this.content.main.style.margin = "-1px 0px 0px 0px", "relative" !== this.settings.contentPosition && (this.content.main.style.top = t.top + t.height + ("fixed" === this.settings.contentPosition ? 0 : window.scrollY) + "px", this.content.main.style.left = t.left + ("fixed" === this.settings.contentPosition ? 0 : window.scrollX) + "px", this.content.main.style.width = t.width + "px");
      }
    }, {
      key: "ensureElementInView",
      value: function ensureElementInView(t, e) {
        var s = t.scrollTop + t.offsetTop,
          i = s + t.clientHeight,
          n = e.offsetTop,
          a = n + e.clientHeight;
        n < s ? t.scrollTop -= s - n : a > i && (t.scrollTop += a - i);
      }
    }, {
      key: "putContent",
      value: function putContent() {
        var t = this.main.main.offsetHeight,
          e = this.main.main.getBoundingClientRect(),
          s = this.content.main.offsetHeight;
        return window.innerHeight - (e.top + t) <= s && e.top > s ? "up" : "down";
      }
    }, {
      key: "updateDeselectAll",
      value: function updateDeselectAll() {
        if (!this.store || !this.settings) return;
        var t = this.store.getSelectedOptions(),
          e = t && t.length > 0,
          s = this.settings.isMultiple,
          i = this.settings.allowDeselect,
          n = this.main.deselect.main,
          a = this.classes.hide;
        !i || s && !e ? n.classList.add(a) : n.classList.remove(a);
      }
    }]);
  }();
  var h = /*#__PURE__*/function () {
    function h(t) {
      _classCallCheck(this, h);
      this.listen = !1, this.observer = null, this.select = t, this.valueChange = this.valueChange.bind(this), this.select.addEventListener("change", this.valueChange, {
        passive: !0
      }), this.observer = new MutationObserver(this.observeCall.bind(this)), this.changeListen(!0);
    }
    return _createClass(h, [{
      key: "enable",
      value: function enable() {
        this.select.disabled = !1;
      }
    }, {
      key: "disable",
      value: function disable() {
        this.select.disabled = !0;
      }
    }, {
      key: "hideUI",
      value: function hideUI() {
        this.select.tabIndex = -1, this.select.style.display = "none", this.select.setAttribute("aria-hidden", "true");
      }
    }, {
      key: "showUI",
      value: function showUI() {
        this.select.removeAttribute("tabindex"), this.select.style.display = "", this.select.removeAttribute("aria-hidden");
      }
    }, {
      key: "changeListen",
      value: function changeListen(t) {
        this.listen = t, t && this.observer && this.observer.observe(this.select, {
          subtree: !0,
          childList: !0,
          attributes: !0
        }), t || this.observer && this.observer.disconnect();
      }
    }, {
      key: "valueChange",
      value: function valueChange(t) {
        return this.listen && this.onValueChange && this.onValueChange(this.getSelectedOptions()), !0;
      }
    }, {
      key: "observeCall",
      value: function observeCall(t) {
        if (!this.listen) return;
        var e = !1,
          s = !1,
          i = !1;
        var _iterator18 = _createForOfIteratorHelper(t),
          _step18;
        try {
          for (_iterator18.s(); !(_step18 = _iterator18.n()).done;) {
            var _n5 = _step18.value;
            if (_n5.target === this.select && ("disabled" === _n5.attributeName && (s = !0), "class" === _n5.attributeName && (e = !0), "childList" === _n5.type)) {
              var _iterator19 = _createForOfIteratorHelper(_n5.addedNodes),
                _step19;
              try {
                for (_iterator19.s(); !(_step19 = _iterator19.n()).done;) {
                  var _t26 = _step19.value;
                  if ("OPTION" === _t26.nodeName && _t26.value === this.select.value) {
                    this.select.dispatchEvent(new Event("change"));
                    break;
                  }
                }
              } catch (err) {
                _iterator19.e(err);
              } finally {
                _iterator19.f();
              }
              i = !0;
            }
            "OPTGROUP" !== _n5.target.nodeName && "OPTION" !== _n5.target.nodeName || (i = !0);
          }
        } catch (err) {
          _iterator18.e(err);
        } finally {
          _iterator18.f();
        }
        e && this.onClassChange && this.onClassChange(this.select.className.split(" ")), s && this.onDisabledChange && (this.changeListen(!1), this.onDisabledChange(this.select.disabled), this.changeListen(!0)), i && this.onOptionsChange && (this.changeListen(!1), this.onOptionsChange(this.getData()), this.changeListen(!0));
      }
    }, {
      key: "getData",
      value: function getData() {
        var t = [];
        var e = this.select.childNodes;
        var _iterator20 = _createForOfIteratorHelper(e),
          _step20;
        try {
          for (_iterator20.s(); !(_step20 = _iterator20.n()).done;) {
            var _s13 = _step20.value;
            "OPTGROUP" === _s13.nodeName && t.push(this.getDataFromOptgroup(_s13)), "OPTION" === _s13.nodeName && t.push(this.getDataFromOption(_s13));
          }
        } catch (err) {
          _iterator20.e(err);
        } finally {
          _iterator20.f();
        }
        return t;
      }
    }, {
      key: "getDataFromOptgroup",
      value: function getDataFromOptgroup(t) {
        var e = {
          id: t.id,
          label: t.label,
          selectAll: !!t.dataset && "true" === t.dataset.selectall,
          selectAllText: t.dataset ? t.dataset.selectalltext : "Select all",
          closable: t.dataset ? t.dataset.closable : "off",
          options: []
        };
        var s = t.childNodes;
        var _iterator21 = _createForOfIteratorHelper(s),
          _step21;
        try {
          for (_iterator21.s(); !(_step21 = _iterator21.n()).done;) {
            var _t27 = _step21.value;
            "OPTION" === _t27.nodeName && e.options.push(this.getDataFromOption(_t27));
          }
        } catch (err) {
          _iterator21.e(err);
        } finally {
          _iterator21.f();
        }
        return e;
      }
    }, {
      key: "getDataFromOption",
      value: function getDataFromOption(t) {
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
    }, {
      key: "getSelectedOptions",
      value: function getSelectedOptions() {
        var t = [];
        var e = this.select.childNodes;
        var _iterator22 = _createForOfIteratorHelper(e),
          _step22;
        try {
          for (_iterator22.s(); !(_step22 = _iterator22.n()).done;) {
            var _s14 = _step22.value;
            if ("OPTGROUP" === _s14.nodeName) {
              var _e13 = _s14.childNodes;
              var _iterator23 = _createForOfIteratorHelper(_e13),
                _step23;
              try {
                for (_iterator23.s(); !(_step23 = _iterator23.n()).done;) {
                  var _s15 = _step23.value;
                  if ("OPTION" === _s15.nodeName) {
                    var _e14 = _s15;
                    _e14.selected && t.push(this.getDataFromOption(_e14));
                  }
                }
              } catch (err) {
                _iterator23.e(err);
              } finally {
                _iterator23.f();
              }
            }
            if ("OPTION" === _s14.nodeName) {
              var _e15 = _s14;
              _e15.selected && t.push(this.getDataFromOption(_e15));
            }
          }
        } catch (err) {
          _iterator22.e(err);
        } finally {
          _iterator22.f();
        }
        return t;
      }
    }, {
      key: "getSelectedValues",
      value: function getSelectedValues() {
        return this.getSelectedOptions().map(function (t) {
          return t.value;
        });
      }
    }, {
      key: "setSelected",
      value: function setSelected(t) {
        this.changeListen(!1);
        var e = this.select.childNodes;
        var _iterator24 = _createForOfIteratorHelper(e),
          _step24;
        try {
          for (_iterator24.s(); !(_step24 = _iterator24.n()).done;) {
            var _s16 = _step24.value;
            if ("OPTGROUP" === _s16.nodeName) {
              var _e16 = _s16.childNodes;
              var _iterator25 = _createForOfIteratorHelper(_e16),
                _step25;
              try {
                for (_iterator25.s(); !(_step25 = _iterator25.n()).done;) {
                  var _s17 = _step25.value;
                  if ("OPTION" === _s17.nodeName) {
                    var _e17 = _s17;
                    _e17.selected = t.includes(_e17.id);
                  }
                }
              } catch (err) {
                _iterator25.e(err);
              } finally {
                _iterator25.f();
              }
            }
            if ("OPTION" === _s16.nodeName) {
              var _e18 = _s16;
              _e18.selected = t.includes(_e18.id);
            }
          }
        } catch (err) {
          _iterator24.e(err);
        } finally {
          _iterator24.f();
        }
        this.changeListen(!0);
      }
    }, {
      key: "setSelectedByValue",
      value: function setSelectedByValue(t) {
        this.changeListen(!1);
        var e = this.select.childNodes;
        var _iterator26 = _createForOfIteratorHelper(e),
          _step26;
        try {
          for (_iterator26.s(); !(_step26 = _iterator26.n()).done;) {
            var _s18 = _step26.value;
            if ("OPTGROUP" === _s18.nodeName) {
              var _e19 = _s18.childNodes;
              var _iterator27 = _createForOfIteratorHelper(_e19),
                _step27;
              try {
                for (_iterator27.s(); !(_step27 = _iterator27.n()).done;) {
                  var _s19 = _step27.value;
                  if ("OPTION" === _s19.nodeName) {
                    var _e20 = _s19;
                    _e20.selected = t.includes(_e20.value);
                  }
                }
              } catch (err) {
                _iterator27.e(err);
              } finally {
                _iterator27.f();
              }
            }
            if ("OPTION" === _s18.nodeName) {
              var _e21 = _s18;
              _e21.selected = t.includes(_e21.value);
            }
          }
        } catch (err) {
          _iterator26.e(err);
        } finally {
          _iterator26.f();
        }
        this.changeListen(!0);
      }
    }, {
      key: "updateSelect",
      value: function updateSelect(t, e, s) {
        var _this7 = this;
        this.changeListen(!1), t && (this.select.dataset.id = t), e && (this.select.style.cssText = e), s && (this.select.className = "", s.forEach(function (t) {
          "" !== t.trim() && _this7.select.classList.add(t.trim());
        })), this.changeListen(!0);
      }
    }, {
      key: "updateOptions",
      value: function updateOptions(t) {
        this.changeListen(!1), this.select.innerHTML = "";
        var _iterator28 = _createForOfIteratorHelper(t),
          _step28;
        try {
          for (_iterator28.s(); !(_step28 = _iterator28.n()).done;) {
            var _e22 = _step28.value;
            _e22 instanceof n && this.select.appendChild(this.createOptgroup(_e22)), _e22 instanceof a && this.select.appendChild(this.createOption(_e22));
          }
        } catch (err) {
          _iterator28.e(err);
        } finally {
          _iterator28.f();
        }
        this.select.dispatchEvent(new Event("change", {
          bubbles: !0
        })), this.changeListen(!0);
      }
    }, {
      key: "createOptgroup",
      value: function createOptgroup(t) {
        var e = document.createElement("optgroup");
        if (e.id = t.id, e.label = t.label, t.selectAll && (e.dataset.selectAll = "true"), "off" !== t.closable && (e.dataset.closable = t.closable), t.options) {
          var _iterator29 = _createForOfIteratorHelper(t.options),
            _step29;
          try {
            for (_iterator29.s(); !(_step29 = _iterator29.n()).done;) {
              var _s20 = _step29.value;
              e.appendChild(this.createOption(_s20));
            }
          } catch (err) {
            _iterator29.e(err);
          } finally {
            _iterator29.f();
          }
        }
        return e;
      }
    }, {
      key: "createOption",
      value: function createOption(t) {
        var e = document.createElement("option");
        return e.id = t.id, e.value = t.value, e.textContent = t.text, "" !== t.html && e.setAttribute("data-html", t.html), t.selected && (e.selected = t.selected), t.disabled && (e.disabled = !0), t.display || (e.style.display = "none"), t.placeholder && e.setAttribute("data-placeholder", "true"), t.mandatory && e.setAttribute("data-mandatory", "true"), t.class && t.class.split(" ").forEach(function (t) {
          e.classList.add(t);
        }), t.data && "object" == typeof t.data && Object.keys(t.data).forEach(function (s) {
          e.setAttribute("data-" + function (t) {
            var e = t.replace(/[A-Z\u00C0-\u00D6\u00D8-\u00DE]/g, function (t) {
              return "-" + t.toLowerCase();
            });
            return t[0] === t[0].toUpperCase() ? e.substring(1) : e;
          }(s), t.data[s]);
        }), e;
      }
    }, {
      key: "destroy",
      value: function destroy() {
        this.changeListen(!1), this.select.removeEventListener("change", this.valueChange), this.observer && (this.observer.disconnect(), this.observer = null), delete this.select.dataset.id, this.showUI();
      }
    }]);
  }();
  var c = /*#__PURE__*/_createClass(function c(t) {
    _classCallCheck(this, c);
    this.id = "", this.style = "", this.class = [], this.isMultiple = !1, this.isOpen = !1, this.isFullOpen = !1, this.intervalMove = null, t || (t = {}), this.id = "ss-" + e(), this.style = t.style || "", this.class = t.class || [], this.disabled = void 0 !== t.disabled && t.disabled, this.alwaysOpen = void 0 !== t.alwaysOpen && t.alwaysOpen, this.showSearch = void 0 === t.showSearch || t.showSearch, this.focusSearch = void 0 === t.focusSearch || t.focusSearch, this.ariaLabel = t.ariaLabel || "Combobox", this.searchPlaceholder = t.searchPlaceholder || "Search", this.searchText = t.searchText || "No Results", this.searchingText = t.searchingText || "Searching...", this.searchHighlight = void 0 !== t.searchHighlight && t.searchHighlight, this.closeOnSelect = void 0 === t.closeOnSelect || t.closeOnSelect, this.contentLocation = t.contentLocation || document.body, this.contentPosition = t.contentPosition || "absolute", this.openPosition = t.openPosition || "auto", this.placeholderText = void 0 !== t.placeholderText ? t.placeholderText : "Select Value", this.allowDeselect = void 0 !== t.allowDeselect && t.allowDeselect, this.hideSelected = void 0 !== t.hideSelected && t.hideSelected, this.keepOrder = void 0 !== t.keepOrder && t.keepOrder, this.showOptionTooltips = void 0 !== t.showOptionTooltips && t.showOptionTooltips, this.minSelected = t.minSelected || 0, this.maxSelected = t.maxSelected || 1e3, this.timeoutDelay = t.timeoutDelay || 200, this.maxValuesShown = t.maxValuesShown || 20, this.maxValuesMessage = t.maxValuesMessage || "{number} selected", this.addableText = t.addableText || 'Press "Enter" to add {value}';
  });
  return /*#__PURE__*/function () {
    function _class(e) {
      var _this8 = this;
      _classCallCheck(this, _class);
      var i;
      if (this.events = {
        search: void 0,
        searchFilter: function searchFilter(t, e) {
          return -1 !== t.text.toLowerCase().indexOf(e.toLowerCase());
        },
        addable: void 0,
        beforeChange: void 0,
        afterChange: void 0,
        beforeOpen: void 0,
        afterOpen: void 0,
        beforeClose: void 0,
        afterClose: void 0
      }, this.windowResize = s(function () {
        (_this8.settings.isOpen || _this8.settings.isFullOpen) && _this8.render.moveContent();
      }), this.windowScroll = s(function () {
        (_this8.settings.isOpen || _this8.settings.isFullOpen) && _this8.render.moveContent();
      }), this.documentClick = function (t) {
        _this8.settings.isOpen && t.target && !function (t, e) {
          function s(t, s) {
            return s && t && t.classList && t.classList.contains(s) || s && t && t.dataset && t.dataset.id && t.dataset.id === e ? t : null;
          }
          return s(t, e) || function t(e, i) {
            return e && e !== document ? s(e, i) ? e : t(e.parentNode, i) : null;
          }(t, e);
        }(t.target, _this8.settings.id) && _this8.close(t.type);
      }, this.windowVisibilityChange = function () {
        document.hidden && _this8.close();
      }, this.selectEl = "string" == typeof e.select ? document.querySelector(e.select) : e.select, !this.selectEl) return void (e.events && e.events.error && e.events.error(new Error("Could not find select element")));
      if ("SELECT" !== this.selectEl.tagName) return void (e.events && e.events.error && e.events.error(new Error("Element isnt of type select")));
      this.selectEl.dataset.ssid && this.destroy(), this.settings = new c(e.settings), this.cssClasses = new t(e.cssClasses);
      var n = ["afterChange", "beforeOpen", "afterOpen", "beforeClose", "afterClose"];
      for (var _t28 in e.events) e.events.hasOwnProperty(_t28) && (-1 !== n.indexOf(_t28) ? this.events[_t28] = s(e.events[_t28], 100) : this.events[_t28] = e.events[_t28]);
      this.settings.disabled = (null === (i = e.settings) || void 0 === i ? void 0 : i.disabled) ? e.settings.disabled : this.selectEl.disabled, this.settings.isMultiple = this.selectEl.multiple, this.settings.style = this.selectEl.style.cssText, this.settings.class = this.selectEl.className.split(" "), this.select = new h(this.selectEl), this.select.updateSelect(this.settings.id, this.settings.style, this.settings.class), this.select.hideUI(), this.select.onValueChange = function (t) {
        _this8.setSelected(t.map(function (t) {
          return t.id;
        }));
      }, this.select.onClassChange = function (t) {
        _this8.settings.class = t, _this8.render.updateClassStyles();
      }, this.select.onDisabledChange = function (t) {
        t ? _this8.disable() : _this8.enable();
      }, this.select.onOptionsChange = function (t) {
        _this8.setData(t);
      }, this.store = new l(this.settings.isMultiple ? "multiple" : "single", e.data ? e.data : this.select.getData()), e.data && this.select.updateOptions(this.store.getData());
      var a = {
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
      var r = this.selectEl.getAttribute("aria-label"),
        d = this.selectEl.getAttribute("aria-labelledby");
      r ? this.render.main.main.setAttribute("aria-label", r) : d && this.render.main.main.setAttribute("aria-labelledby", d), this.selectEl.parentNode && this.selectEl.parentNode.insertBefore(this.render.main.main, this.selectEl.nextSibling), window.addEventListener("resize", this.windowResize, !1), "auto" === this.settings.openPosition && window.addEventListener("scroll", this.windowScroll, !1), document.addEventListener("visibilitychange", this.windowVisibilityChange), this.settings.disabled && this.disable(), this.settings.alwaysOpen && this.open(), this.selectEl.slim = this;
    }
    return _createClass(_class, [{
      key: "enable",
      value: function enable() {
        this.settings.disabled = !1, this.select.enable(), this.render.enable();
      }
    }, {
      key: "disable",
      value: function disable() {
        this.settings.disabled = !0, this.select.disable(), this.render.disable();
      }
    }, {
      key: "getData",
      value: function getData() {
        return this.store.getData();
      }
    }, {
      key: "setData",
      value: function setData(t) {
        var e = this.store.getSelected(),
          s = this.store.validateDataArray(t);
        if (s) return void (this.events.error && this.events.error(s));
        this.store.setData(t);
        var n = this.store.getData();
        this.select.updateOptions(n), this.render.renderValues(), this.render.renderOptions(n), this.events.afterChange && !i(e, this.store.getSelected()) && this.events.afterChange(this.store.getSelectedOptions());
      }
    }, {
      key: "getSelected",
      value: function getSelected() {
        var t = this.store.getSelectedOptions();
        return this.settings.keepOrder && (t = this.store.selectedOrderOptions(t)), t.map(function (t) {
          return t.value;
        });
      }
    }, {
      key: "setSelected",
      value: function setSelected(t) {
        var e = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : !0;
        var s = this.store.getSelected(),
          n = this.store.getDataOptions();
        t = Array.isArray(t) ? t : [t];
        var a = [];
        var _iterator30 = _createForOfIteratorHelper(t),
          _step30;
        try {
          var _loop4 = function _loop4() {
            var e = _step30.value;
            if (n.find(function (t) {
              return t.id == e;
            })) a.push(e);else {
              var _iterator31 = _createForOfIteratorHelper(n.filter(function (t) {
                  return t.value == e;
                })),
                _step31;
              try {
                for (_iterator31.s(); !(_step31 = _iterator31.n()).done;) {
                  var _t29 = _step31.value;
                  a.push(_t29.id);
                }
              } catch (err) {
                _iterator31.e(err);
              } finally {
                _iterator31.f();
              }
            }
          };
          for (_iterator30.s(); !(_step30 = _iterator30.n()).done;) {
            _loop4();
          }
        } catch (err) {
          _iterator30.e(err);
        } finally {
          _iterator30.f();
        }
        this.store.setSelectedBy("id", a);
        var l = this.store.getData();
        this.select.updateOptions(l), this.render.renderValues(), "" !== this.render.content.search.input.value ? this.search(this.render.content.search.input.value) : this.render.renderOptions(l), e && this.events.afterChange && !i(s, this.store.getSelected()) && this.events.afterChange(this.store.getSelectedOptions());
      }
    }, {
      key: "addOption",
      value: function addOption(t) {
        var e = this.store.getSelected();
        this.store.getDataOptions().some(function (e) {
          var s;
          return e.value === (null !== (s = t.value) && void 0 !== s ? s : t.text);
        }) || this.store.addOption(t);
        var s = this.store.getData();
        this.select.updateOptions(s), this.render.renderValues(), this.render.renderOptions(s), this.events.afterChange && !i(e, this.store.getSelected()) && this.events.afterChange(this.store.getSelectedOptions());
      }
    }, {
      key: "open",
      value: function open() {
        var _this9 = this;
        this.settings.disabled || this.settings.isOpen || (this.events.beforeOpen && this.events.beforeOpen(), this.render.open(), this.settings.showSearch && this.settings.focusSearch && this.render.searchFocus(), this.settings.isOpen = !0, setTimeout(function () {
          _this9.events.afterOpen && _this9.events.afterOpen(), _this9.settings.isOpen && (_this9.settings.isFullOpen = !0), document.addEventListener("click", _this9.documentClick);
        }, this.settings.timeoutDelay), "absolute" === this.settings.contentPosition && (this.settings.intervalMove && clearInterval(this.settings.intervalMove), this.settings.intervalMove = setInterval(this.render.moveContent.bind(this.render), 500)));
      }
    }, {
      key: "close",
      value: function close() {
        var _this10 = this;
        var t = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
        this.settings.isOpen && !this.settings.alwaysOpen && (this.events.beforeClose && this.events.beforeClose(), this.render.close(), "" !== this.render.content.search.input.value && this.search(""), this.render.mainFocus(t), this.settings.isOpen = !1, this.settings.isFullOpen = !1, setTimeout(function () {
          _this10.events.afterClose && _this10.events.afterClose(), document.removeEventListener("click", _this10.documentClick);
        }, this.settings.timeoutDelay), this.settings.intervalMove && clearInterval(this.settings.intervalMove));
      }
    }, {
      key: "search",
      value: function search(t) {
        var _this11 = this;
        if (this.render.content.search.input.value !== t && (this.render.content.search.input.value = t), !this.events.search) return void this.render.renderOptions("" === t ? this.store.getData() : this.store.search(t, this.events.searchFilter));
        this.render.renderSearching();
        var e = this.events.search(t, this.store.getSelectedOptions());
        e instanceof Promise ? e.then(function (t) {
          _this11.render.renderOptions(_this11.store.partialToFullData(t));
        }).catch(function (t) {
          _this11.render.renderError("string" == typeof t ? t : t.message);
        }) : Array.isArray(e) ? this.render.renderOptions(this.store.partialToFullData(e)) : this.render.renderError("Search event must return a promise or an array of data");
      }
    }, {
      key: "destroy",
      value: function destroy() {
        document.removeEventListener("click", this.documentClick), window.removeEventListener("resize", this.windowResize, !1), "auto" === this.settings.openPosition && window.removeEventListener("scroll", this.windowScroll, !1), document.removeEventListener("visibilitychange", this.windowVisibilityChange), this.store.setData([]), this.render.destroy(), this.select.destroy();
      }
    }]);
  }();
});