﻿/*
 html2canvas v0.34 <http://html2canvas.hertzen.com>
 Copyright (c) 2011 Niklas von Hertzen. All rights reserved.
 http://www.twitter.com/niklasvh

 Released under MIT License
*/
(function (t, u, l) {
    function E(c) { i.logging && t.console && t.console.log && t.console.log(c) } function U(c, g) { var e = []; return { storage: e, width: c, height: g, fillRect: function () { e.push({ type: "function", name: "fillRect", arguments: arguments }) }, drawImage: function () { e.push({ type: "function", name: "drawImage", arguments: arguments }) }, fillText: function () { e.push({ type: "function", name: "fillText", arguments: arguments }) }, setVariable: function (a, d) { e.push({ type: "variable", name: a, arguments: d }) } } } var i = {}, T, L; i.Util = {}; i.Util.backgroundImage =
    function (c) { if (/data:image\/.*;base64,/i.test(c) || /^(-webkit|-moz|linear-gradient|-o-)/.test(c)) return c; c.toLowerCase().substr(0, 5) === 'url("' ? (c = c.substr(5), c = c.substr(0, c.length - 2)) : (c = c.substr(4), c = c.substr(0, c.length - 1)); return c }; i.Util.Bounds = function (c) { var g = {}; if (c.getBoundingClientRect) return c = c.getBoundingClientRect(), g.top = c.top, g.bottom = c.bottom || c.top + c.height, g.left = c.left, g.width = c.width || c.right - c.left, g.height = c.height || c.bottom - c.top, g }; i.Util.getCSS = function (c, g) {
        function e(a,
        b) { var g = c.runtimeStyle && c.runtimeStyle[a], e, k = c.style; if (!/^-?[0-9]+\.?[0-9]*(?:px)?$/i.test(b) && /^-?\d/.test(b)) { e = k.left; if (g) c.runtimeStyle.left = c.currentStyle.left; k.left = a === "fontSize" ? "1em" : b || 0; b = k.pixelLeft + "px"; k.left = e; if (g) c.runtimeStyle.left = g } return !/^(thin|medium|thick)$/i.test(b) ? Math.round(parseFloat(b)) + "px" : b } var a; if (t.getComputedStyle) void 0 !== c && (T = u.defaultView.getComputedStyle(c, null)), a = T[g], g === "backgroundPosition" && (a = (a.split(",")[0] || "0 0").split(" "), a[0] = a[0].indexOf("%") ===
        -1 ? e(g + "X", a[0]) : a[0], a[1] = a[1] === l ? a[0] : a[1], a[1] = a[1].indexOf("%") === -1 ? e(g + "Y", a[1]) : a[1]); else if (c.currentStyle) if (g === "backgroundPosition") a = [e(g + "X", c.currentStyle[g + "X"]), e(g + "Y", c.currentStyle[g + "Y"])]; else if (a = e(g, c.currentStyle[g]), /^(border)/i.test(g) && /^(medium|thin|thick)$/i.test(a)) switch (a) { case "thin": a = "1px"; break; case "medium": a = "0px"; break; case "thick": a = "5px" } return a
    }; i.Util.BackgroundPosition = function (c, g, e) {
        var c = i.Util.getCSS(c, "backgroundPosition"), a, d; c.length === 1 && (a =
        c, c = [], c[0] = a, c[1] = a); c[0].toString().indexOf("%") !== -1 ? (d = parseFloat(c[0]) / 100, a = g.width * d - e.width * d) : a = parseInt(c[0], 10); c[1].toString().indexOf("%") !== -1 ? (d = parseFloat(c[1]) / 100, g = g.height * d - e.height * d) : g = parseInt(c[1], 10); return { top: g, left: a }
    }; i.Util.Extend = function (c, g) { for (var e in c) c.hasOwnProperty(e) && (g[e] = c[e]); return g }; i.Util.Children = function (c) {
        var g; try {
            g = c.nodeName && c.nodeName.toUpperCase() === "IFRAME" ? c.contentDocument || c.contentWindow.document : function (a) {
                var d = []; a !== null && function (a,
                d) { var c = a.length, g = 0; if (typeof d.length === "number") for (var e = d.length; g < e; g++) a[c++] = d[g]; else for (; d[g] !== l;) a[c++] = d[g++]; a.length = c; return a }(d, a); return d
            }(c.childNodes)
        } catch (e) { E("html2canvas.Util.Children failed with exception: " + e.message), g = [] } return g
    }; (function () {
        i.Generate = {}; var c = [/^(-webkit-linear-gradient)\(([a-z\s]+)([\w\d\.\s,%\(\)]+)\)$/, /^(-o-linear-gradient)\(([a-z\s]+)([\w\d\.\s,%\(\)]+)\)$/, /^(-webkit-gradient)\((linear|radial),\s((?:\d{1,3}%?)\s(?:\d{1,3}%?),\s(?:\d{1,3}%?)\s(?:\d{1,3}%?))([\w\d\.\s,%\(\)-]+)\)$/,
        /^(-moz-linear-gradient)\(((?:\d{1,3}%?)\s(?:\d{1,3}%?))([\w\d\.\s,%\(\)]+)\)$/, /^(-webkit-radial-gradient)\(((?:\d{1,3}%?)\s(?:\d{1,3}%?)),\s(\w+)\s([a-z-]+)([\w\d\.\s,%\(\)]+)\)$/, /^(-moz-radial-gradient)\(((?:\d{1,3}%?)\s(?:\d{1,3}%?)),\s(\w+)\s?([a-z-]*)([\w\d\.\s,%\(\)]+)\)$/, /^(-o-radial-gradient)\(((?:\d{1,3}%?)\s(?:\d{1,3}%?)),\s(\w+)\s([a-z-]+)([\w\d\.\s,%\(\)]+)\)$/]; i.Generate.parseGradient = function (g, e) {
            var a, d, b = c.length, h, f, k, n; for (d = 0; d < b; d += 1) if (h = g.match(c[d])) break; if (h) switch (h[1]) {
                case "-webkit-linear-gradient": case "-o-linear-gradient": a =
                { type: "linear", x0: null, y0: null, x1: null, y1: null, colorStops: [] }; if (b = h[2].match(/\w+/g)) { f = b.length; for (d = 0; d < f; d += 1) switch (b[d]) { case "top": a.y0 = 0; a.y1 = e.height; break; case "right": a.x0 = e.width; a.x1 = 0; break; case "bottom": a.y0 = e.height; a.y1 = 0; break; case "left": a.x0 = 0, a.x1 = e.width } } if (a.x0 === null && a.x1 === null) a.x0 = a.x1 = e.width / 2; if (a.y0 === null && a.y1 === null) a.y0 = a.y1 = e.height / 2; if (b = h[3].match(/((?:rgb|rgba)\(\d{1,3},\s\d{1,3},\s\d{1,3}(?:,\s[0-9\.]+)?\)(?:\s\d{1,3}(?:%|px))?)+/g)) {
                    f = b.length; k = 1 / Math.max(f -
                    1, 1); for (d = 0; d < f; d += 1) n = b[d].match(/((?:rgb|rgba)\(\d{1,3},\s\d{1,3},\s\d{1,3}(?:,\s[0-9\.]+)?\))\s*(\d{1,3})?(%|px)?/), n[2] ? (h = parseFloat(n[2]), h /= n[3] === "%" ? 100 : e.width) : h = d * k, a.colorStops.push({ color: n[1], stop: h })
                } break; case "-webkit-gradient": a = { type: h[2] === "radial" ? "circle" : h[2], x0: 0, y0: 0, x1: 0, y1: 0, colorStops: [] }; if (b = h[3].match(/(\d{1,3})%?\s(\d{1,3})%?,\s(\d{1,3})%?\s(\d{1,3})%?/)) a.x0 = b[1] * e.width / 100, a.y0 = b[2] * e.height / 100, a.x1 = b[3] * e.width / 100, a.y1 = b[4] * e.height / 100; if (b = h[4].match(/((?:from|to|color-stop)\((?:[0-9\.]+,\s)?(?:rgb|rgba)\(\d{1,3},\s\d{1,3},\s\d{1,3}(?:,\s[0-9\.]+)?\)\))+/g)) {
                    f =
                    b.length; for (d = 0; d < f; d += 1) n = b[d].match(/(from|to|color-stop)\(([0-9\.]+)?(?:,\s)?((?:rgb|rgba)\(\d{1,3},\s\d{1,3},\s\d{1,3}(?:,\s[0-9\.]+)?\))\)/), h = parseFloat(n[2]), n[1] === "from" && (h = 0), n[1] === "to" && (h = 1), a.colorStops.push({ color: n[3], stop: h })
                } break; case "-moz-linear-gradient": a = { type: "linear", x0: 0, y0: 0, x1: 0, y1: 0, colorStops: [] }; if (b = h[2].match(/(\d{1,3})%?\s(\d{1,3})%?/)) a.x0 = b[1] * e.width / 100, a.y0 = b[2] * e.height / 100, a.x1 = e.width - a.x0, a.y1 = e.height - a.y0; if (b = h[3].match(/((?:rgb|rgba)\(\d{1,3},\s\d{1,3},\s\d{1,3}(?:,\s[0-9\.]+)?\)(?:\s\d{1,3}%)?)+/g)) {
                    f =
                    b.length; k = 1 / Math.max(f - 1, 1); for (d = 0; d < f; d += 1) n = b[d].match(/((?:rgb|rgba)\(\d{1,3},\s\d{1,3},\s\d{1,3}(?:,\s[0-9\.]+)?\))\s*(\d{1,3})?(%)?/), n[2] ? (h = parseFloat(n[2]), n[3] && (h /= 100)) : h = d * k, a.colorStops.push({ color: n[1], stop: h })
                } break; case "-webkit-radial-gradient": case "-moz-radial-gradient": case "-o-radial-gradient": a = { type: "circle", x0: 0, y0: 0, x1: e.width, y1: e.height, cx: 0, cy: 0, rx: 0, ry: 0, colorStops: [] }; if (b = h[2].match(/(\d{1,3})%?\s(\d{1,3})%?/)) a.cx = b[1] * e.width / 100, a.cy = b[2] * e.height / 100; b = h[3].match(/\w+/);
                    n = h[4].match(/[a-z-]*/); if (b && n) switch (n[0]) {
                        case "farthest-corner": case "cover": case "": d = Math.sqrt(Math.pow(a.cx, 2) + Math.pow(a.cy, 2)); b = Math.sqrt(Math.pow(a.cx, 2) + Math.pow(a.y1 - a.cy, 2)); f = Math.sqrt(Math.pow(a.x1 - a.cx, 2) + Math.pow(a.y1 - a.cy, 2)); n = Math.sqrt(Math.pow(a.x1 - a.cx, 2) + Math.pow(a.cy, 2)); a.rx = a.ry = Math.max(d, b, f, n); break; case "closest-corner": d = Math.sqrt(Math.pow(a.cx, 2) + Math.pow(a.cy, 2)); b = Math.sqrt(Math.pow(a.cx, 2) + Math.pow(a.y1 - a.cy, 2)); f = Math.sqrt(Math.pow(a.x1 - a.cx, 2) + Math.pow(a.y1 - a.cy,
                        2)); n = Math.sqrt(Math.pow(a.x1 - a.cx, 2) + Math.pow(a.cy, 2)); a.rx = a.ry = Math.min(d, b, f, n); break; case "farthest-side": b[0] === "circle" ? a.rx = a.ry = Math.max(a.cx, a.cy, a.x1 - a.cx, a.y1 - a.cy) : (a.type = b[0], a.rx = Math.max(a.cx, a.x1 - a.cx), a.ry = Math.max(a.cy, a.y1 - a.cy)); break; case "closest-side": case "contain": b[0] === "circle" ? a.rx = a.ry = Math.min(a.cx, a.cy, a.x1 - a.cx, a.y1 - a.cy) : (a.type = b[0], a.rx = Math.min(a.cx, a.x1 - a.cx), a.ry = Math.min(a.cy, a.y1 - a.cy))
                    } if (b = h[5].match(/((?:rgb|rgba)\(\d{1,3},\s\d{1,3},\s\d{1,3}(?:,\s[0-9\.]+)?\)(?:\s\d{1,3}(?:%|px))?)+/g)) {
                        f =
                        b.length; k = 1 / Math.max(f - 1, 1); for (d = 0; d < f; d += 1) n = b[d].match(/((?:rgb|rgba)\(\d{1,3},\s\d{1,3},\s\d{1,3}(?:,\s[0-9\.]+)?\))\s*(\d{1,3})?(%|px)?/), n[2] ? (h = parseFloat(n[2]), h /= n[3] === "%" ? 100 : e.width) : h = d * k, a.colorStops.push({ color: n[1], stop: h })
                    }
            } return a
        }; i.Generate.Gradient = function (c, e) {
            var a = u.createElement("canvas"), d = a.getContext("2d"), b, h, f, k, n; a.width = e.width; a.height = e.height; b = i.Generate.parseGradient(c, e); n = new Image; if (b) if (b.type === "linear") {
                h = d.createLinearGradient(b.x0, b.y0, b.x1, b.y1); f =
                0; for (k = b.colorStops.length; f < k; f += 1) try { h.addColorStop(b.colorStops[f].stop, b.colorStops[f].color) } catch (t) { E(["failed to add color stop: ", t, "; tried to add: ", b.colorStops[f], "; stop: ", f, "; in: ", c]) } d.fillStyle = h; d.fillRect(0, 0, e.width, e.height); n.src = a.toDataURL()
            } else if (b.type === "circle") {
                h = d.createRadialGradient(b.cx, b.cy, 0, b.cx, b.cy, b.rx); f = 0; for (k = b.colorStops.length; f < k; f += 1) try { h.addColorStop(b.colorStops[f].stop, b.colorStops[f].color) } catch (l) {
                    E(["failed to add color stop: ", l, "; tried to add: ",
                    b.colorStops[f], "; stop: ", f, "; in: ", c])
                } d.fillStyle = h; d.fillRect(0, 0, e.width, e.height); n.src = a.toDataURL()
            } else if (b.type === "ellipse") {
                var v = u.createElement("canvas"), x = v.getContext("2d"); h = Math.max(b.rx, b.ry); var K = h * 2, G; v.width = v.height = K; h = x.createRadialGradient(b.rx, b.ry, 0, b.rx, b.ry, h); f = 0; for (k = b.colorStops.length; f < k; f += 1) try { h.addColorStop(b.colorStops[f].stop, b.colorStops[f].color) } catch (B) { E(["failed to add color stop: ", B, "; tried to add: ", b.colorStops[f], "; stop: ", f, "; in: ", c]) } x.fillStyle =
                h; x.fillRect(0, 0, K, K); d.fillStyle = b.colorStops[f - 1].color; d.fillRect(0, 0, a.width, a.height); G = new Image; G.onload = function () { d.drawImage(G, b.cx - b.rx, b.cy - b.ry, 2 * b.rx, 2 * b.ry); n.src = a.toDataURL() }; G.src = v.toDataURL()
            } return n
        }; i.Generate.ListAlpha = function (c) { var e = "", a; do a = c % 26, e = String.fromCharCode(a + 64) + e, c /= 26; while (c * 26 > 26); return e }; i.Generate.ListRoman = function (c) {
            var e = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"], a = [1E3, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1], d = "", b, h = e.length; if (c <=
            0 || c >= 4E3) return c; for (b = 0; b < h; b += 1) for (; c >= a[b];) c -= a[b], d += e[b]; return d
        }
    })(); i.Parse = function (c, g) {
        function e() { return { width: Math.max(Math.max(z.body.scrollWidth, z.documentElement.scrollWidth), Math.max(z.body.offsetWidth, z.documentElement.offsetWidth), Math.max(z.body.clientWidth, z.documentElement.clientWidth)), height: Math.max(Math.max(z.body.scrollHeight, z.documentElement.scrollHeight), Math.max(z.body.offsetHeight, z.documentElement.offsetHeight), Math.max(z.body.clientHeight, z.documentElement.clientHeight)) } }
        function a(a, b) { var c = parseInt(y(a, b), 10); return isNaN(c) ? 0 : c } function d(a, b, c, d, g, e) { e !== "transparent" && (a.setVariable("fillStyle", e), a.fillRect(b, c, d, g), H += 1) } function b(a, b) { switch (b) { case "lowercase": return a.toLowerCase(); case "capitalize": return a.replace(/(^|\s|:|-|\(|\))([a-z])/g, function (a, b, V) { if (a.length > 0) return b + V.toUpperCase() }); case "uppercase": return a.toUpperCase(); default: return a } } function h(a) { return a.replace(/^\s*/g, "").replace(/\s*$/g, "") } function f(a, c, e) {
            var e = e.ctx, f = y(a,
            "fontFamily"), j = y(a, "fontSize"), k = y(a, "color"), n = y(a, "textDecoration"), F = y(a, "textAlign"), p = y(a, "letterSpacing"), I, q, m = y(a, "fontWeight"), r = y(a, "fontStyle"), s = y(a, "fontVariant"), A = 0, o; c.nodeValue = b(c.nodeValue, y(a, "textTransform")); if (h(c.nodeValue).length > 0) {
                if (n !== "none") if (w[f + "-" + j] !== l) q = w[f + "-" + j]; else {
                    q = z.createElement("div"); a = z.createElement("img"); o = z.createElement("span"); var v; q.style.visibility = "hidden"; q.style.fontFamily = f; q.style.fontSize = j; q.style.margin = 0; q.style.padding = 0; O.appendChild(q);
                    a.src = "data:image/gif;base64,R0lGODlhAQABAIABAP///wAAACwAAAAAAQABAAACAkQBADs="; a.width = 1; a.height = 1; a.style.margin = 0; a.style.padding = 0; a.style.verticalAlign = "baseline"; o.style.fontFamily = f; o.style.fontSize = j; o.style.margin = 0; o.style.padding = 0; o.appendChild(z.createTextNode("Hidden Text")); q.appendChild(o); q.appendChild(a); v = a.offsetTop - o.offsetTop + 1; q.removeChild(o); q.appendChild(z.createTextNode("Hidden Text")); q.style.lineHeight = "normal"; a.style.verticalAlign = "super"; a = {
                        baseline: v, lineWidth: 1, middle: a.offsetTop -
                        q.offsetTop + 1
                    }; w[f + "-" + j] = a; O.removeChild(q); q = a
                } F = F.replace(["-webkit-auto"], ["auto"]); F = g.letterRendering === !1 && /^(left|right|justify|auto)$/.test(F) && /^(normal|none)$/.test(p) ? c.nodeValue.split(/(\b| )/) : c.nodeValue.split(""); switch (parseInt(m, 10)) { case 401: m = "bold"; break; case 400: m = "normal" } e.setVariable("fillStyle", k); e.setVariable("font", r + " " + s + " " + m + " " + j + " " + f); e.setVariable("textAlign", "left"); j = c; m = 0; for (f = F.length; m < f; m += 1) {
                    r = null; if (B.rangeBounds) {
                        if (n !== "none" || h(F[m]).length !== 0) r =
                        F[m], z.createRange ? (I = z.createRange(), I.setStart(c, A), I.setEnd(c, A + r.length)) : I = O.createTextRange(), I = I.getBoundingClientRect() ? I.getBoundingClientRect() : {}
                    } else { if (typeof j.nodeValue !== "string") continue; s = j.splitText(F[m].length); p = j.parentNode; a = z.createElement("wrapper"); o = j.cloneNode(!0); a.appendChild(j.cloneNode(!0)); p.replaceChild(a, j); I = i.Util.Bounds(a); r = j.nodeValue; j = s; p.replaceChild(o, a) } if (r !== null) s = I.left, p = I.bottom, a = e, h(r).length > 0 && (a.fillText(r, s, p), H += 1); switch (n) {
                        case "underline": d(e,
                        I.left, Math.round(I.top + q.baseline + q.lineWidth), I.width, 1, k); break; case "overline": d(e, I.left, I.top, I.width, 1, k); break; case "line-through": d(e, I.left, Math.ceil(I.top + q.middle + q.lineWidth), I.width, 1, k)
                    } A += F[m].length
                }
            }
        } function k(a) { return (a = c[a]) && a.succeeded === !0 ? a.img : !1 } function n(a, b) { var c = Math.max(a.left, b.left), d = Math.max(a.top, b.top); return { left: c, top: d, width: Math.min(a.left + a.width, b.left + b.width) - c, height: Math.min(a.top + a.height, b.top + b.height) - d } } function Q(b, c, e, g) {
            for (var f = e.left, j =
            e.top, h = e.width, e = e.height, k, p, B, q, m, i = function (b) { var c = [], d = ["Top", "Right", "Bottom", "Left"], e; for (e = 0; e < 4; e += 1) c.push({ width: a(b, "border" + d[e] + "Width"), color: y(b, "border" + d[e] + "Color") }); return c }(b), b = 0; b < 4; b += 1) if (k = i[b], k.width > 0) {
                p = f; B = j; q = h; m = e - i[2].width; switch (b) { case 0: m = i[0].width; break; case 1: p = f + h - i[1].width; q = i[1].width; break; case 2: B = B + e - i[2].width; m = i[2].width; break; case 3: q = i[3].width } q = { left: p, top: B, width: q, height: m }; g && (q = n(q, g)); q.width > 0 && q.height > 0 && d(c, p, B, q.width, q.height,
                k.color)
            } return i
        } function P(a, b, c) {
            var d = z.createElement("valuewrap"), e = ["lineHeight", "textAlign", "fontFamily", "color", "fontSize", "paddingLeft", "paddingTop", "width", "height", "border", "borderLeftWidth", "borderTopWidth"], g, j, h; g = 0; for (j = e.length; g < j; g += 1) { h = e[g]; try { d.style[h] = y(a, h) } catch (k) { E("html2canvas: Parse: Exception caught in renderFormValue: " + k.message) } } d.style.borderColor = "black"; d.style.borderStyle = "solid"; d.style.display = "block"; d.style.position = "absolute"; if (/^(submit|reset|button|text|password)$/.test(a.type) ||
            a.nodeName === "SELECT") d.style.lineHeight = y(a, "height"); d.style.top = b.top + "px"; d.style.left = b.left + "px"; b = z.createTextNode(a.nodeName === "SELECT" ? a.options[a.selectedIndex].text : a.value); d.appendChild(b); O.appendChild(d); f(a, b, c); O.removeChild(d)
        } function v(a, b, c, d, e, g, f, j) { var h = 0, k = 0; f - c > 0 && (h = f - c); j - d > 0 && (k = j - d); a.drawImage(b, h, k, e - h, g - k, c + h, d + k, e - h, g - k); H += 1 } function x(a, b, c, d, e, g, f) {
            var f = Math.min(b.height, f), h, j; c.left -= Math.ceil(c.left / b.width) * b.width; for (j = d + c.left; j < g + d;) h = Math.floor(j + b.width) >
            g + d ? g + d - j : b.width, v(a, b, j, e + c.top, h, f, d, e), j = Math.floor(j + b.width)
        } function K(b, c) {
            var j = i.Util.Bounds(b), f = j.left, B = j.top, w = j.width, D = j.height, F, p = y(b, "backgroundColor"), t = y(b, "position"), q, m = y(b, "opacity"), r, s; c ? L = {} : (L = e(), c = { opacity: 1 }); s = y(b, "zIndex"); (q = c.zIndex) ? s !== "auto" && (s = { zindex: s, children: [] }, q.children.push(s), q = s) : q = s = { zindex: 0, children: [] }; r = { ctx: U(L.width || w, L.height || D), zIndex: q, opacity: m * c.opacity, cssPosition: t }; if (c.clip) r.clip = i.Util.Extend({}, c.clip); if (g.useOverflow === !0 &&
            /(hidden|scroll|auto)/.test(y(b, "overflow")) === !0 && /(BODY)/i.test(b.nodeName) === !1) r.clip = r.clip ? n(r.clip, j) : j; t = q.children.push(r); s = q.children[t - 1].ctx; s.setVariable("globalAlpha", r.opacity); m = Q(b, s, j, !1); r.borders = m; A.test(b.nodeName) && g.iframeDefault !== "transparent" && (p = g.iframeDefault === "default" ? "#efefef" : g.iframeDefault); w = { left: f + m[3].width, top: B + m[0].width, width: w - (m[1].width + m[3].width), height: D - (m[0].width + m[2].width) }; r.clip && (w = n(w, r.clip)); if (w.height > 0 && w.width > 0) {
                d(s, w.left, w.top,
                w.width, w.height, p); var C = w, o = y(b, "backgroundImage"), l = y(b, "backgroundRepeat").split(",")[0], u, G, J; !/data:image\/.*;base64,/i.test(o) && !/^(-webkit|-moz|linear-gradient|-o-)/.test(o) && (o = o.split(",")[0]); if (typeof o !== "undefined" && /^(1|none)$/.test(o) === !1) if (o = i.Util.backgroundImage(o), p = k(o), D = i.Util.BackgroundPosition(b, C, p), p) switch (l) {
                    case "repeat-x": x(s, p, D, C.left, C.top, C.width, C.height); break; case "repeat-y": o = C.left; l = C.top; u = C.height; G = Math.min(p.width, C.width); D.top -= Math.ceil(D.top / p.height) *
                    p.height; for (J = l + D.top; J < u + l;) C = Math.floor(J + p.height) > u + l ? u + l - J : p.height, v(s, p, o + D.left, J, G, C, o, l), J = Math.floor(J + p.height); break; case "no-repeat": o = C.width - D.left; J = C.height - D.top; l = D.left; u = D.top; G = D.left + C.left; D = D.top + C.top; l < 0 ? (l = Math.abs(l), G += l, o = Math.min(C.width, p.width - l)) : (o = Math.min(o, p.width), l = 0); u < 0 ? (u = Math.abs(u), D += u, J = Math.min(C.height, p.height - u)) : (J = Math.min(J, p.height), u = 0); J > 0 && o > 0 && (s.drawImage(p, l, u, o, J, G, D, o, J), H += 1); break; default: D.top -= Math.ceil(D.top / p.height) * p.height;
                        for (o = C.top + D.top; o < C.height + C.top;) l = Math.min(p.height, C.height + C.top - o), l = Math.floor(o + p.height) > l + o ? l + o - o : p.height, o < C.top ? (u = C.top - o, o = C.top) : u = 0, x(s, p, D, C.left, o, C.width, l), u > 0 && (D.top += u), o = Math.floor(o + p.height) - u
                } else E("html2canvas: Error loading background:" + o)
            } switch (b.nodeName) {
                case "IMG": r = b.getAttribute("src"); (F = k(r)) ? (r = a(b, "paddingLeft"), w = a(b, "paddingTop"), p = a(b, "paddingRight"), D = a(b, "paddingBottom"), s.drawImage(F, 0, 0, F.width, F.height, f + r + m[3].width, B + w + m[0].width, j.width - (m[1].width +
                m[3].width + r + p), j.height - (m[0].width + m[2].width + w + D)), H += 1) : E("html2canvas: Error loading <img>:" + r); break; case "INPUT": /^(text|url|email|submit|button|reset)$/.test(b.type) && b.value.length > 0 && P(b, j, r); break; case "TEXTAREA": b.value.length > 0 && P(b, j, r); break; case "SELECT": b.options.length > 0 && P(b, j, r); break; case "LI": j = w; f = y(b, "listStylePosition"); m = y(b, "listStyleType"); B = y(b, "fontWeight"); if (/^(decimal|decimal-leading-zero|upper-alpha|upper-latin|upper-roman|lower-alpha|lower-greek|lower-latin|lower-roman)$/i.test(m)) {
                    s =
                    -1; r = 1; w = b.parentNode.childNodes; if (b.parentNode) { for (; w[++s] !== b;) w[s].nodeType === 1 && r++; s = r } else s = -1; switch (m) { case "decimal": F = s; break; case "decimal-leading-zero": F = s.toString().length === 1 ? "0" + s.toString() : s.toString(); break; case "upper-roman": F = i.Generate.ListRoman(s); break; case "lower-roman": F = i.Generate.ListRoman(s).toLowerCase(); break; case "lower-alpha": F = i.Generate.ListAlpha(s).toLowerCase(); break; case "upper-alpha": F = i.Generate.ListAlpha(s) } F += ". "; r = F; m = z.createElement("boundelement");
                    m.style.display = "inline"; s = b.style.listStyleType; b.style.listStyleType = "none"; m.appendChild(z.createTextNode(r)); b.insertBefore(m, b.firstChild); r = i.Util.Bounds(m); b.removeChild(m); b.style.listStyleType = s; switch (B) { case 401: B = "bold"; break; case 400: B = "normal" } R.setVariable("fillStyle", y(b, "color")); R.setVariable("font", y(b, "fontVariant") + " " + B + " " + y(b, "fontStyle") + " " + y(b, "fontSize") + " " + y(b, "fontFamily")); if (f === "inside") R.setVariable("textAlign", "left"), j = j.left, f = r.bottom, B = R, h(F).length > 0 && (B.fillText(F,
                    j, f), H += 1)
                } break; case "CANVAS": r = a(b, "paddingLeft"), w = a(b, "paddingTop"), p = a(b, "paddingRight"), D = a(b, "paddingBottom"), s.drawImage(b, 0, 0, b.width, b.height, f + r + m[3].width, B + w + m[0].width, j.width - (m[1].width + m[3].width + r + p), j.height - (m[0].width + m[2].width + w + D)), H += 1
            } return q.children[t - 1]
        } function G(a, b) {
            if (y(a, "display") !== "none" && y(a, "visibility") !== "hidden" && (b = K(a, b) || b, R = b.ctx, !A.test(a.nodeName))) {
                var c = i.Util.Children(a), d, e, j; d = 0; for (j = c.length; d < j; d += 1) e = c[d], e.nodeType === 1 ? G(e, b) : e.nodeType ===
                3 && f(a, e, b)
            }
        } t.scroll(0, 0); var B = {
            rangeBounds: !1, svgRendering: g.svgRendering && function () {
                var a = new Image, b = u.createElement("canvas"), c = b.getContext === l ? !1 : b.getContext("2d"); if (c === !1) return !1; b.width = b.height = 10; a.src = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'><foreignObject width='10' height='10'><div xmlns='http://www.w3.org/1999/xhtml' style='width:10;height:10;'>sup</div></foreignObject></svg>"; try { c.drawImage(a, 0, 0), b.toDataURL() } catch (d) { return !1 } E("html2canvas: Parse: SVG powered rendering available");
                return !0
            }()
        }, j = g.elements === l ? u.body : g.elements[0], H = 0, w = {}, z = j.ownerDocument, A = RegExp("(" + g.ignoreElements + ")"), O = z.body, M, N, S, R, L, c = c || {}; if (z.createRange && (M = z.createRange(), M.getBoundingClientRect)) { N = z.createElement("boundtest"); N.style.height = "123px"; N.style.display = "block"; O.appendChild(N); M.selectNode(N); M = M.getBoundingClientRect(); M = M.height; if (M === 123) B.rangeBounds = !0; O.removeChild(N) } var y = i.Util.getCSS; S = K(j, null); B.svgRendering && function (a) {
            function b(a) {
                var a = i.Util.Children(a), c = a.length,
                d, e, g, f, h; for (h = 0; h < c; h += 1) if (f = a[h], f.nodeType === 3) j += f.nodeValue.replace(/\</g, "&lt;").replace(/\>/g, "&gt;"); else if (f.nodeType === 1 && !/^(script|meta|title)$/.test(f.nodeName.toLowerCase())) { j += "<" + f.nodeName.toLowerCase(); if (f.hasAttributes()) { d = f.attributes; g = d.length; for (e = 0; e < g; e += 1) j += " " + d[e].name + '="' + d[e].value + '"' } j += ">"; b(f); j += "</" + f.nodeName.toLowerCase() + ">" }
            } var c = new Image, d = e(), j = ""; b(a); c.src = ["data:image/svg+xml,", "<svg xmlns='http://www.w3.org/2000/svg' version='1.1' width='" +
            d.width + "' height='" + d.height + "'>", "<foreignObject width='" + d.width + "' height='" + d.height + "'>", "<html xmlns='http://www.w3.org/1999/xhtml' style='margin:0;'>", j.replace(/\#/g, "%23"), "</html></foreignObject></svg>"].join(""); c.onload = function () { S.svgRender = c }
        }(u.documentElement); N = 0; j = j.children; for (M = j.length; N < M; N += 1) G(j[N], S); S.backgroundColor = y(u.documentElement, "backgroundColor"); return S
    }; i.Preload = function (c) {
        function g() {
            E("html2canvas: start: images: " + b.numLoaded + " / " + b.numTotal + " (failed: " +
            b.numFailed + ")"); !b.firstRun && b.numLoaded >= b.numTotal && (E("Finished loading images: # " + b.numTotal + " (failed: " + b.numFailed + ")"), typeof c.complete === "function" && c.complete(b))
        } function e(a, e, f) {
            var h, k = c.proxy, i; x.href = a; a = x.href; h = "html2canvas_" + n++; f.callbackname = h; k += k.indexOf("?") > -1 ? "&" : "?"; k += "url=" + encodeURIComponent(a) + "&callback=" + h; i = Q.createElement("script"); t[h] = function (a) {
                a.substring(0, 6) === "error:" ? (f.succeeded = !1, b.numLoaded++, b.numFailed++, g()) : (d(e, f), e.src = a); t[h] = l; try { delete t[h] } catch (c) { } i.parentNode.removeChild(i);
                i = null; delete f.script; delete f.callbackname
            }; i.setAttribute("type", "text/javascript"); i.setAttribute("src", k); f.script = i; t.document.body.appendChild(i)
        } function a(c) {
            var d = i.Util.Children(c), e, h, k = !1; try { var n = d.length; for (e = 0; e < n; e += 1) a(d[e]) } catch (u) { } try { k = c.nodeType } catch (v) { k = !1, E("html2canvas: failed to access some element's nodeType - Exception: " + v.message) } if (k === 1 || k === l) {
                try { h = i.Util.getCSS(c, "backgroundImage") } catch (t) { E("html2canvas: failed to get background-image - Exception: " + t.message) } h &&
                h !== "1" && h !== "none" && (/^(-webkit|-o|-moz|-ms|linear)-/.test(h) ? (c = i.Generate.Gradient(h, i.Util.Bounds(c)), c !== l && (b[h] = { img: c, succeeded: !0 }, b.numTotal++, b.numLoaded++, g())) : (h = i.Util.backgroundImage(h.match(/data:image\/.*;base64,/i) ? h : h.split(",")[0]), f.loadImage(h)))
            }
        } function d(a, d) {
            a.onload = function () { d.timer !== l && t.clearTimeout(d.timer); b.numLoaded++; d.succeeded = !0; a.onerror = a.onload = null; g() }; a.onerror = function () {
                if (a.crossOrigin === "anonymous" && (t.clearTimeout(d.timer), c.proxy)) {
                    var f = a.src;
                    a = new Image; d.img = a; a.src = f; e(a.src, a, d); return
                } b.numLoaded++; b.numFailed++; d.succeeded = !1; a.onerror = a.onload = null; g()
            }
        } var b = { numLoaded: 0, numFailed: 0, numTotal: 0, cleanupDone: !1 }, h, f, k, n = 0; k = c.elements[0] || u.body; var Q = k.ownerDocument, P = Q.images, v = P.length, x = Q.createElement("a"), K = function (a) { return a.crossOrigin !== l }(new Image), G; x.href = t.location.href; h = x.protocol + x.host; f = {
            loadImage: function (a) {
                var f, g; if (a && b[a] === l) f = new Image, a.match(/data:image\/.*;base64,/i) ? (f.src = a.replace(/url\(['"]{0,}|['"]{0,}\)$/ig,
                ""), g = b[a] = { img: f }, b.numTotal++, d(f, g)) : (x.href = a, x.href = x.href, x.protocol + x.host === h || c.allowTaint === !0 ? (g = b[a] = { img: f }, b.numTotal++, d(f, g), f.src = a) : K && !c.allowTaint && c.useCORS ? (f.crossOrigin = "anonymous", g = b[a] = { img: f }, b.numTotal++, d(f, g), f.src = a, f.customComplete = function () { if (this.img.complete) this.img.onerror(); else this.timer = t.setTimeout(this.img.customComplete, 100) }.bind(g), f.customComplete()) : c.proxy && (g = b[a] = { img: f }, b.numTotal++, e(a, f, g)))
            }, cleanupDOM: function (a) {
                var d, e; if (!b.cleanupDone) {
                    a &&
                    typeof a === "string" ? E("html2canvas: Cleanup because: " + a) : E("html2canvas: Cleanup after timeout: " + c.timeout + " ms."); for (e in b) if (b.hasOwnProperty(e) && (d = b[e], typeof d === "object" && d.callbackname && d.succeeded === l)) { t[d.callbackname] = l; try { delete t[d.callbackname] } catch (f) { } d.script && d.script.parentNode && (d.script.setAttribute("src", "about:blank"), d.script.parentNode.removeChild(d.script)); b.numLoaded++; b.numFailed++; E("html2canvas: Cleaned up failed img: '" + e + "' Steps: " + b.numLoaded + " / " + b.numTotal) } t.stop !==
                    l ? t.stop() : u.execCommand !== l && u.execCommand("Stop", !1); u.close !== l && u.close(); b.cleanupDone = !0; a && typeof a === "string" || g()
                }
            }, renderingDone: function () { G && t.clearTimeout(G) }
        }; c.timeout > 0 && (G = t.setTimeout(f.cleanupDOM, c.timeout)); E("html2canvas: Preload starts: finding background-images"); b.firstRun = !0; a(k); E("html2canvas: Preload: Finding images"); for (k = 0; k < v; k += 1) f.loadImage(P[k].getAttribute("src")); b.firstRun = !1; E("html2canvas: Preload: Done."); b.numTotal === b.numLoaded && g(); return f
    }; i.Renderer =
    function (c, g) { function e(c) { var b = [], g = [], c = c.children, f, k, i, l; f = 0; for (i = c.length; f < i; f += 1) k = c[f], k.children && k.children.length > 0 ? (b.push(k), g.push(k.zindex)) : a.push(k); g.sort(function (a, b) { return a - b }); c = 0; for (f = g.length; c < f; c += 1) { k = g[c]; i = 0; for (l = b.length; i <= l; i += 1) if (b[i].zindex === k) { k = b.splice(i, 1); e(k[0]); break } } } var a = []; e(c.zIndex); if (typeof g._renderer._create !== "function") throw Error("Invalid renderer defined"); return g._renderer._create(c, g, u, a, i) }; L = function (c, g) {
        var e, a, d = {
            logging: !1,
            elements: c, proxy: "http://html2canvas.appspot.com/", timeout: 0, useCORS: !1, allowTaint: !1, svgRendering: !1, iframeDefault: "default", ignoreElements: "IFRAME|OBJECT|PARAM", useOverflow: !0, letterRendering: !1, flashcanvas: l, width: null, height: null, taintTest: !0, renderer: "Canvas"
        }, d = i.Util.Extend(g, d); if (typeof d.renderer === "string" && i.Renderer[d.renderer] !== l) d._renderer = i.Renderer[d.renderer](d); else if (typeof d.renderer === "function") d._renderer = d.renderer(d); else throw "Unknown renderer"; i.logging = d.logging; d.complete =
        function (b) { if (!(typeof d.onpreloaded === "function" && d.onpreloaded(b) === !1) && (e = i.Parse(b, d), !(typeof d.onparsed === "function" && d.onparsed(e) === !1) && (a = i.Renderer(e, d), typeof d.onrendered === "function"))) d.onrendered(a) }; t.setTimeout(function () { i.Preload(d) }, 0); return { render: function (a, c) { return i.Renderer(a, i.Util.Extend(c, d)) }, parse: function (a, c) { return i.Parse(a, i.Util.Extend(c, d)) }, preload: function (a) { return i.Preload(i.Util.Extend(a, d)) }, log: E }
    }; L.log = E; L.Renderer = { Canvas: l }; i.Renderer.Canvas = function (c) {
        var c =
        c || {}, g = c.canvas || u.createElement("canvas"), e = !1, a = !1, d = !1, b; if (g.getContext) E("html2canvas: Renderer: using canvas renderer"), d = !0; else if (c.flashcanvas !== l) {
            e = !0; E("html2canvas: Renderer: canvas not available, using flashcanvas"); var h = u.createElement("script"); h.src = c.flashcanvas; h.onload = function (a, b) {
                var c; if (a.onload === l) a.onreadystatechange !== l ? (c = function () { a.readyState !== "loaded" && a.readyState !== "complete" ? t.setTimeout(c, 250) : b() }, t.setTimeout(c, 250)) : E("html2canvas: Renderer: Can't track when flashcanvas is loaded");
                else return b
            }(h, function () { typeof t.FlashCanvas !== "undefined" && (E("html2canvas: Renderer: Flashcanvas initialized"), t.FlashCanvas.initElement(g), d = !0, a !== !1 && b._create.apply(null, a)) }); u.body.appendChild(h)
        } return b = {
            _create: function (b, c, h, i, t) {
                if (!d) return a = arguments, g; var v = g.getContext("2d"), x, K, G, B, j, H, w = u.createElement("canvas"); j = w.getContext !== l; var z, A, w = j ? w.getContext("2d") : {}; H = []; g.width = g.style.width = !e ? c.width || b.ctx.width : Math.min(2880, c.width || b.ctx.width); g.height = g.style.height =
                !e ? c.height || b.ctx.height : Math.min(2880, c.height || b.ctx.height); x = v.fillStyle; v.fillStyle = b.backgroundColor; v.fillRect(0, 0, g.width, g.height); v.fillStyle = x; if (c.svgRendering && b.svgRender !== l) v.drawImage(b.svgRender, 0, 0); else {
                    K = 0; for (G = i.length; K < G; K += 1) {
                        x = i.splice(0, 1)[0]; x.canvasPosition = x.canvasPosition || {}; v.textBaseline = "bottom"; x.clip && (v.save(), v.beginPath(), v.rect(x.clip.left, x.clip.top, x.clip.width, x.clip.height), v.clip()); if (x.ctx.storage) {
                            B = 0; for (z = x.ctx.storage.length; B < z; B += 1) switch (A =
                            x.ctx.storage[B], A.type) {
                                case "variable": v[A.name] = A.arguments; break; case "function": if (A.name === "fillRect") (!e || A.arguments[0] + A.arguments[2] < 2880 && A.arguments[1] + A.arguments[3] < 2880) && v.fillRect.apply(v, A.arguments); else if (A.name === "fillText") (!e || A.arguments[1] < 2880 && A.arguments[2] < 2880) && v.fillText.apply(v, A.arguments); else if (A.name === "drawImage" && A.arguments[8] > 0 && A.arguments[7]) {
                                    if (j && c.taintTest && H.indexOf(A.arguments[0].src) === -1) {
                                        w.drawImage(A.arguments[0], 0, 0); try {
                                            w.getImageData(0, 0, 1,
                                            1)
                                        } catch (L) { w = h.createElement("canvas"); w = w.getContext("2d"); continue } H.push(A.arguments[0].src)
                                    } v.drawImage.apply(v, A.arguments)
                                }
                            }
                        } x.clip && v.restore()
                    }
                } E("html2canvas: Renderer: Canvas renderer done - returning canvas obj"); G = c.elements.length; return G === 1 && typeof c.elements[0] === "object" && c.elements[0].nodeName !== "BODY" && e === !1 ? (H = t.Util.Bounds(c.elements[0]), j = h.createElement("canvas"), j.width = H.width, j.height = H.height, v = j.getContext("2d"), v.drawImage(g, H.left, H.top, H.width, H.height, 0, 0, H.width,
                H.height), g = null, j) : g
            }
        }
    }; t.html2canvas = L
})(window, document);

/**
  @license html2canvas v0.34 <http://html2canvas.hertzen.com>
  Copyright (c) 2011 Niklas von Hertzen. All rights reserved.
  http://www.twitter.com/niklasvh

  Released under MIT License
 */
/*
 * jQuery helper plugin for examples and tests
 */
(function ($) {
    $.fn.html2canvas = function (options) {
        if (options && options.profile && window.console && window.console.profile) {
            console.profile();
        }
        var date = new Date(),
        html2obj,
        $message = null,
        timeoutTimer = false,
        timer = date.getTime();
        options = options || {};

        html2obj = html2canvas(this, options);
    };
})(jQuery);