import { provide as Gn, inject as Et, defineComponent as at, openBlock as x, createElementBlock as P, createElementVNode as pe, Fragment as Se, renderList as Xe, createCommentVNode as W, computed as w, unref as ce, normalizeStyle as St, toDisplayString as et, createBlock as Ke, createVNode as he, renderSlot as qn, withModifiers as dt, toValue as Xn, getCurrentScope as Yn, onScopeDispose as jn, useId as Br, ref as fe, watch as Ct, nextTick as Un, withDirectives as En, vShow as Sn, onBeforeUnmount as Ft, resolveComponent as Wr, withCtx as Cn, useModel as Fn, useSlots as Vr, mergeModels as Tn, h as Hr } from "vue";
import { MenuButton as un } from "menu-bar";
const ot = (e) => e.kind === "split", M = (e) => e.kind === "group", S = (e) => e.kind === "float", Ge = { x: 16, y: 16, w: 360, h: 260 }, Tt = 28, Zn = 120, tn = 220, Qn = 38, Qe = 6;
function gt(e, t) {
  let n = !1;
  const r = e.frames.map((s, a) => {
    const f = t(s.node, a);
    return f === s.node ? s : (n = !0, { ...s, node: f });
  });
  return n ? { ...e, frames: r } : e;
}
function _e(e) {
  return { kind: "group", panels: [e] };
}
function zs(e, t, n) {
  return {
    kind: "group",
    panels: e,
    ...t ? { active: t } : {},
    ...n ? { title: n } : {}
  };
}
const V = (e) => typeof e == "string", Dt = (e) => V(e) ? _e(e) : e, wt = (e) => V(e) ? [e] : ke(e), Rn = (e) => e.panels.filter(V), Kr = (e) => e.panels.filter((t) => !V(t)), ge = (e, t) => e.panels.includes(t);
function kt(e, t, n) {
  let r = !1;
  const s = e.panels.map((a) => {
    if (V(a) || !I(a, t)) return a;
    const f = n(a);
    return f !== a && (r = !0), f;
  });
  return r ? { ...e, panels: s } : e;
}
function Lt(e, t) {
  return { node: e, rect: { ...Ge, ...t } };
}
function fn(e, t) {
  return t ? { kind: "float", frames: e, title: t } : { kind: "float", frames: e };
}
function Ot(e, t) {
  const n = { ...Ge, ...t };
  return fn(
    e.map(
      (r, s) => Lt(r, {
        ...n,
        x: n.x + s * Tt,
        y: n.y + s * Tt
      })
    )
  );
}
function dn(e, t, n, r) {
  return {
    kind: "split",
    direction: e,
    children: t,
    ...n ? { sizes: n } : {},
    ...r ? { title: r } : {}
  };
}
const pn = (e, t, n) => dn("row", e, t, n), As = (e, t, n) => dn("column", e, t, n);
function Q(e) {
  return {
    ...e.title ? { title: e.title } : {},
    ...e.fixedView ? { fixedView: !0 } : {},
    ...e.headless ? { headless: !0 } : {}
  };
}
const Ye = (e) => e.fixedView === !0 || e.headless === !0 || !!e.title, Gr = (e) => ({ ...e, headless: !0 }), Ps = (e) => ({ ...e, fixedView: !0 }), qr = (e) => e === "left" || e === "right" ? "row" : "column";
function ke(e) {
  return M(e) ? e.panels.flatMap(wt) : S(e) ? e.frames.flatMap((t) => ke(t.node)) : e.children.flatMap(ke);
}
function I(e, t) {
  return M(e) ? e.panels.some((n) => V(n) ? n === t : I(n, t)) : S(e) ? e.frames.some((n) => I(n.node, t)) : e.children.some((n) => I(n, t));
}
const Jn = (e) => ke(e).length === 0, nn = (e) => !M(e) && Ye(e), rn = (e) => Jn(e) && !nn(e);
function It(e) {
  return ot(e) ? e.children.map((t, n) => ({ node: t, index: n })) : S(e) ? e.frames.map((t, n) => ({ node: t.node, index: n })) : e.panels.flatMap((t, n) => V(t) ? [] : [{ node: t, index: n }]);
}
const mn = (e) => It(e).map((t) => t.node);
function je(e) {
  const t = e.active;
  if (t) {
    const n = e.panels.findIndex(
      (r) => V(r) ? r === t : I(r, t)
    );
    if (n >= 0) return n;
  }
  return 0;
}
function er(e) {
  const t = e.panels[je(e)];
  return t !== void 0 && V(t) ? t : "";
}
function se(e) {
  if (V(e)) return e;
  if (M(e)) {
    const n = e.panels[je(e)];
    return n === void 0 ? "" : se(n);
  }
  if (S(e)) {
    const n = e.frames[e.frames.length - 1];
    return n ? se(n.node) : "";
  }
  const t = e.children[0];
  return t ? se(t) : "";
}
function tt(e, t) {
  if (M(e) && ge(e, t)) return e;
  for (const n of mn(e)) {
    const r = tt(n, t);
    if (r) return r;
  }
  return null;
}
function Xr(e) {
  const t = mn(e).flatMap(Xr);
  return M(e) ? [e, ...t] : t;
}
function re(e, t) {
  if (M(e)) {
    for (const n of Kr(e)) {
      const r = re(n, t);
      if (r) return r;
    }
    return null;
  }
  if (S(e)) {
    for (const n of e.frames)
      if (I(n.node, t))
        return re(n.node, t) ?? n;
    return null;
  }
  for (const n of e.children) {
    const r = re(n, t);
    if (r) return r;
  }
  return null;
}
function qt(e, t, n = Zn) {
  const r = (c, u) => u > 0 ? Math.max(Math.min(c, u), Math.min(n, u)) : Math.max(c, n), s = r(e.w, t.w), a = r(e.h, t.h), f = (c, u, m) => Math.min(Math.max(c, 0), Math.max(m - u, 0));
  return {
    x: Math.round(f(e.x, s, t.w)),
    y: Math.round(f(e.y, a, t.h)),
    w: Math.round(s),
    h: Math.round(a)
  };
}
function Dn(e, t, n, r, s = Zn) {
  let { x: a, y: f, w: c, h: u } = e;
  return t.includes("e") && (c = e.w + n), t.includes("w") && (c = e.w - n, a = e.x + n), t.includes("s") && (u = e.h + r), t.includes("n") && (u = e.h - r, f = e.y + r), c < s && (t.includes("w") && (a = e.x + e.w - s), c = s), u < s && (t.includes("n") && (f = e.y + e.h - s), u = s), { x: a, y: f, w: c, h: u };
}
const tr = (e, t) => e.x === t.x && e.y === t.y && e.w === t.w && e.h === t.h;
function nt(e, t, n) {
  if (M(e)) return kt(e, t, (a) => nt(a, t, n));
  if (S(e)) {
    let a = !1;
    const f = e.frames.map((c) => {
      if (!I(c.node, t)) return c;
      if (re(c.node, t)) {
        const m = nt(c.node, t, n);
        return m === c.node ? c : (a = !0, { ...c, node: m });
      }
      const u = n(c);
      return u === c ? c : (a = !0, u);
    });
    return a ? { ...e, frames: f } : e;
  }
  if (!I(e, t)) return e;
  let r = !1;
  const s = e.children.map((a) => {
    const f = nt(a, t, n);
    return f !== a && (r = !0), f;
  });
  return r ? { ...e, children: s } : e;
}
function Yr(e, t, n) {
  return nt(e, t, (r) => tr(r.rect, n) ? r : { ...r, rect: n });
}
const Oe = (e) => e.maximized === !0, nr = (e) => (t) => {
  if (Oe(t) === e) return t;
  if (e) {
    const { minimized: s, ...a } = t;
    return { ...a, maximized: !0 };
  }
  const { maximized: n, ...r } = t;
  return r;
};
function jr(e, t, n = !0) {
  return nt(e, t, nr(n));
}
function Es(e, t) {
  const n = re(e, t);
  return n ? jr(e, t, !Oe(n)) : e;
}
const He = (e) => e.minimized === !0, rr = (e) => (t) => {
  if (He(t) === e) return t;
  if (e) {
    const { maximized: s, ...a } = t;
    return { ...a, minimized: !0 };
  }
  const { minimized: n, ...r } = t;
  return r;
};
function Ur(e, t, n = !0) {
  return nt(e, t, rr(n));
}
function Ss(e, t) {
  const n = re(e, t);
  return n ? Ur(e, t, !He(n)) : e;
}
function Ve(e, t) {
  const n = t[t.length - 1];
  if (n === void 0) return null;
  const r = we(e, t.slice(0, -1));
  return !r || !S(r) ? null : r.frames[n] ?? null;
}
function sn(e, t) {
  if (S(e)) {
    for (const [n, r] of e.frames.entries()) {
      if (!I(r.node, t)) continue;
      const s = sn(r.node, t);
      return s ? [n, ...s] : [n];
    }
    return null;
  }
  for (const { node: n, index: r } of It(e)) {
    if (!I(n, t)) continue;
    const s = sn(n, t);
    return s ? [r, ...s] : null;
  }
  return null;
}
function vn(e, t, n) {
  const r = t[t.length - 1];
  if (r === void 0) return e;
  const s = t.slice(0, -1), a = we(e, s);
  if (!a || !S(a)) return e;
  const f = a.frames[r];
  if (!f) return e;
  const c = n(f);
  if (c === f) return e;
  const u = [...a.frames];
  return u[r] = c, Me(e, s, { ...a, frames: u });
}
function Ln(e, t, n) {
  return vn(
    e,
    t,
    (r) => tr(r.rect, n) ? r : { ...r, rect: n }
  );
}
function Zr(e, t, n = !0) {
  return vn(e, t, nr(n));
}
function Qr(e, t, n = !0) {
  return vn(e, t, rr(n));
}
function mt(e, t) {
  const [n, ...r] = t;
  if (n === void 0) return e;
  if (S(e)) {
    const f = e.frames[n];
    if (!f) return e;
    const c = mt(f.node, r), u = c === f.node ? f : { ...f, node: c };
    if (n === e.frames.length - 1 && u === f) return e;
    const m = [...e.frames];
    return m.splice(n, 1), m.push(u), { ...e, frames: m };
  }
  const s = we(e, [n]);
  if (!s) return e;
  const a = mt(s, r);
  return a === s ? e : Me(e, [n], a);
}
function Jr(e, t) {
  const n = [...t];
  let r = e;
  return t.forEach((s, a) => {
    r && (S(r) && (n[a] = r.frames.length - 1), r = we(r, [s]));
  }), n;
}
function $t(e, t, n, r) {
  if (M(e)) return kt(e, n, (f) => $t(f, t, n, r));
  if (S(e)) {
    const f = e.frames.findIndex((u) => I(u.node, n)), c = e.frames[f];
    if (!c) return e;
    if (re(c.node, n)) {
      const u = $t(c.node, t, n, r);
      if (u === c.node) return e;
      const m = [...e.frames];
      return m[f] = { ...c, node: u }, { ...e, frames: m };
    }
    return { ...e, frames: [...e.frames, Lt(_e(t), r)] };
  }
  if (!I(e, n)) return e;
  let s = !1;
  const a = e.children.map((f) => {
    const c = $t(f, t, n, r);
    return c !== f && (s = !0), c;
  });
  return s ? { ...e, children: a } : e;
}
function On(e, t, n, r) {
  if (t === n || !I(e, t) || !I(e, n) || !re(e, n)) return e;
  const s = qe(e, t);
  if (!s) return e;
  const a = $t(s, t, n, r);
  return a === s ? e : U(a);
}
function ei(e, t, n) {
  return S(e) ? { ...e, frames: [...e.frames, Lt(_e(t), n)] } : M(e) ? sr(e, t) : {
    kind: "split",
    direction: e.direction,
    children: [...e.children, _e(t)],
    sizes: [...Ce(e), 1],
    ...Q(e)
  };
}
function ir(e, t, n, r) {
  const s = n[0];
  if (s === void 0) return ei(e, t, r);
  const a = n.slice(1), f = (d, y) => y === s ? ir(d, t, a, r) : qe(d, t);
  if (S(e)) {
    const d = e.frames.flatMap((y, q) => {
      const _ = f(y.node, q);
      return _ ? [_ === y.node ? y : { ...y, node: _ }] : [];
    });
    return { ...e, frames: d };
  }
  if (M(e)) {
    const d = je(e), y = [];
    e.panels.forEach((E, O) => {
      if (V(E)) {
        E !== t && y.push(E);
        return;
      }
      const G = f(E, O);
      G && y.push(G);
    });
    const _ = e.active && y.some((E) => wt(E).includes(e.active)) ? e.active : se(y[d] ?? y[y.length - 1]);
    return {
      kind: "group",
      panels: y,
      ..._ ? { active: _ } : {},
      ...Q(e)
    };
  }
  const c = Ce(e), u = [], m = [];
  return e.children.forEach((d, y) => {
    const q = f(d, y);
    q && (u.push(q), m.push(c[y] ?? 0));
  }), { kind: "split", direction: e.direction, children: u, sizes: m, ...Q(e) };
}
function In(e, t, n, r) {
  const s = we(e, n);
  return !s || !Jn(s) || !I(e, t) ? e : U(ir(e, t, n, r));
}
function Xt(e, t) {
  if (M(e)) return kt(e, t, (s) => Xt(s, t));
  if (S(e)) {
    const s = e.frames.findIndex((m) => I(m.node, t)), a = e.frames[s];
    if (!a) return e;
    const f = Xt(a.node, t), c = f === a.node ? a : { ...a, node: f };
    if (s === e.frames.length - 1 && c === a) return e;
    const u = [...e.frames];
    return u.splice(s, 1), u.push(c), { ...e, frames: u };
  }
  if (!I(e, t)) return e;
  let n = !1;
  const r = e.children.map((s) => {
    const a = Xt(s, t);
    return a !== s && (n = !0), a;
  });
  return n ? { ...e, children: r } : e;
}
function hn(e, t) {
  if (e <= 0) return [];
  const n = () => Array.from({ length: e }, () => 1 / e);
  if (!t || t.length !== e) return n();
  const r = t.map((a) => Number.isFinite(a) && a > 0 ? a : 0), s = r.reduce((a, f) => a + f, 0);
  return s <= 0 ? n() : r.map((a) => a / s);
}
const Ce = (e) => hn(e.children.length, e.sizes), xe = (e) => {
  const t = M(e) ? e.panels.length : e.children.length;
  return e.places?.length === t ? e.places : void 0;
};
function U(e) {
  if (M(e)) return ti(e);
  if (S(e)) {
    const c = e.frames.flatMap((u) => {
      const m = U(u.node);
      return rn(m) ? [] : [m === u.node ? u : { ...u, node: m }];
    });
    return c.length === e.frames.length && c.every((u, m) => u === e.frames[m]) ? e : { ...e, frames: c };
  }
  if (e.children.length === 0) return e;
  const t = Ce(e), n = xe(e), r = [], s = [], a = [];
  e.children.forEach((c, u) => {
    const m = U(c), d = t[u] ?? 0;
    if (rn(m)) return;
    if (!n && ot(m) && m.direction === e.direction && !xe(m) && !Ye(m)) {
      const q = Ce(m);
      m.children.forEach((_, E) => {
        r.push(_), s.push(d * (q[E] ?? 0));
      });
      return;
    }
    r.push(m), s.push(d);
    const y = n?.[u];
    y && a.push(y);
  });
  const f = r[0];
  return r.length === 1 && f && !Ye(e) ? f : {
    kind: "split",
    direction: e.direction,
    children: r,
    sizes: hn(r.length, s),
    ...Q(e),
    ...a.length === r.length && a.length > 0 ? { places: a } : {}
  };
}
function ti(e) {
  if (e.panels.every(V)) return e;
  const t = se(e), n = xe(e), r = [], s = [];
  e.panels.forEach((c, u) => {
    const m = n?.[u];
    if (V(c)) {
      r.push(c), m && s.push(m);
      return;
    }
    const d = U(c);
    if (!rn(d)) {
      if (M(d) && !Ye(d) && !xe(d) && !e.headless) {
        r.push(...d.panels);
        return;
      }
      r.push(d), m && s.push(m);
    }
  });
  const a = r[0];
  if (r.length === 1 && a !== void 0 && !V(a) && !Ye(e))
    return a;
  if (r.length === e.panels.length && r.every((c, u) => c === e.panels[u]))
    return e;
  const f = t && r.some((c) => wt(c).includes(t)) ? t : void 0;
  return {
    kind: "group",
    panels: r,
    ...f ? { active: f } : {},
    ...Q(e),
    ...s.length === r.length && s.length > 0 ? { places: s } : {}
  };
}
function qe(e, t) {
  if (S(e)) {
    const f = e.frames.flatMap((c) => {
      const u = qe(c.node, t);
      return u ? [u === c.node ? c : { ...c, node: u }] : [];
    });
    return f.length === 0 && !nn(e) ? null : { ...e, frames: f };
  }
  if (M(e)) {
    if (!I(e, t)) return e;
    const f = je(e), c = [];
    for (const d of e.panels) {
      if (V(d)) {
        d !== t && c.push(d);
        continue;
      }
      const y = qe(d, t);
      y && c.push(y);
    }
    if (c.length === 0) return null;
    const m = e.active && c.some((d) => wt(d).includes(e.active)) ? e.active : se(c[f] ?? c[c.length - 1]);
    return m ? { kind: "group", panels: c, active: m, ...Q(e) } : { kind: "group", panels: c, ...Q(e) };
  }
  const n = Ce(e), r = [], s = [];
  if (e.children.forEach((f, c) => {
    const u = qe(f, t);
    u && (r.push(u), s.push(n[c] ?? 0));
  }), r.length === 0)
    return nn(e) ? { kind: "split", direction: e.direction, children: r, sizes: [], ...Q(e) } : null;
  const a = r[0];
  return r.length === 1 && a && !Ye(e) ? a : U({
    kind: "split",
    direction: e.direction,
    children: r,
    sizes: s,
    ...Q(e)
  });
}
function sr(e, t, n) {
  const r = e.panels.filter((a) => a !== t), s = n === void 0 ? r.length : Math.max(0, Math.min(n, r.length));
  return r.splice(s, 0, t), { kind: "group", panels: r, active: t, ...Q(e) };
}
function pt(e, t, n, r, s) {
  const a = (_) => gt(
    _,
    (E) => I(E, n) ? pt(E, t, n, r, s) : E
  );
  if (r === "float") return e;
  const f = (_) => kt(_, n, (E) => pt(E, t, n, r, s));
  if (r === "center")
    return M(e) ? ge(e, n) ? sr(e, t, s) : f(e) : S(e) ? a(e) : {
      ...e,
      children: e.children.map(
        (_) => I(_, n) ? pt(_, t, n, r, s) : _
      )
    };
  const c = qr(r), u = r === "left" || r === "top", m = (_) => ({
    kind: "split",
    direction: c,
    children: u ? [_e(t), _] : [_, _e(t)],
    sizes: [0.5, 0.5]
  });
  if (M(e)) return ge(e, n) ? m(e) : f(e);
  if (S(e)) return a(e);
  const d = Ce(e), y = e.children.findIndex(
    (_) => M(_) && ge(_, n)
  );
  if (y >= 0 && e.direction === c) {
    const _ = (d[y] ?? 0) / 2, E = [...e.children], O = [...d];
    return E.splice(u ? y : y + 1, 0, _e(t)), O.splice(y, 1, _, _), {
      kind: "split",
      direction: c,
      children: E,
      sizes: O,
      ...Q(e)
    };
  }
  const q = e.children.map((_) => I(_, n) ? M(_) && ge(_, n) ? m(_) : pt(_, t, n, r) : _);
  return {
    kind: "split",
    direction: e.direction,
    children: q,
    sizes: d,
    ...Q(e)
  };
}
function rt(e, t) {
  if (M(e)) {
    if (ge(e, t))
      return er(e) === t ? e : { ...e, active: t };
    const s = e.panels.findIndex((u) => !V(u) && I(u, t)), a = e.panels[s];
    if (a === void 0 || V(a)) return e;
    const f = rt(a, t);
    if (f === a && e.active === t) return e;
    const c = [...e.panels];
    return c[s] = f, { ...e, panels: c, active: t };
  }
  if (!I(e, t)) return e;
  if (S(e)) return gt(e, (s) => rt(s, t));
  let n = !1;
  const r = e.children.map((s) => {
    const a = rt(s, t);
    return a !== s && (n = !0), a;
  });
  return n ? { ...e, children: r } : e;
}
function vt(e, t, n) {
  if (M(e)) {
    if (!ge(e, t)) return kt(e, t, (m) => vt(m, t, n));
    const r = e.panels.indexOf(t), s = Math.max(0, Math.min(n, e.panels.length - 1));
    if (r === s) return e;
    const a = [...e.panels];
    a.splice(r, 1), a.splice(s, 0, t);
    const f = xe(e), c = f ? [...f] : void 0;
    c && c.splice(s, 0, ...c.splice(r, 1));
    const u = se(e);
    return {
      kind: "group",
      panels: a,
      ...u ? { active: u } : {},
      ...Q(e),
      ...c ? { places: c } : {}
    };
  }
  return I(e, t) ? S(e) ? gt(e, (r) => vt(r, t, n)) : { ...e, children: e.children.map((r) => vt(r, t, n)) } : e;
}
function zt(e, t, n) {
  if (t === n) return e;
  if (M(e)) {
    if (!I(e, t) && !I(e, n)) return e;
    const r = (a) => a === t ? n : a === n ? t : a, s = e.panels.map((a) => V(a) ? r(a) : zt(a, t, n));
    return { ...e, panels: s, ...e.active ? { active: r(e.active) } : {} };
  }
  return S(e) ? gt(e, (r) => zt(r, t, n)) : { ...e, children: e.children.map((r) => zt(r, t, n)) };
}
function yt(e, t, n, r, s) {
  if (r === "float" || !I(e, t) || !I(e, n)) return e;
  const a = tt(e, t);
  if (r === "center" && a && ge(a, n)) {
    if (s === void 0) return e;
    const c = a.panels.indexOf(t), u = s > c ? s - 1 : s;
    return u === c ? e : rt(vt(e, t, u), t);
  }
  if (t === n) return e;
  const f = qe(e, t);
  return f ? U(pt(f, t, n, r, s)) : e;
}
function ar(e, t, n) {
  if (M(e)) {
    const s = e.panels[t];
    if (s === void 0 || V(s)) return e;
    const a = [...e.panels];
    return a[t] = n, { ...e, panels: a };
  }
  if (S(e)) {
    const s = e.frames[t];
    if (!s) return e;
    const a = [...e.frames];
    return a[t] = { ...s, node: n }, { ...e, frames: a };
  }
  const r = [...e.children];
  return r[t] = n, { ...e, children: r };
}
function bt(e, t, n) {
  const r = It(e);
  if (!M(e) && r.some(({ node: s }) => M(s) && ge(s, t))) {
    const s = n(e);
    return s === e ? null : s;
  }
  for (const { node: s, index: a } of r) {
    if (!I(s, t)) continue;
    const f = bt(s, t, n);
    return f ? ar(e, a, f) : null;
  }
  return null;
}
function Cs(e, t, n) {
  const r = bt(
    e,
    t,
    (s) => ot(s) && s.direction !== n ? { ...s, direction: n } : s
  );
  return r ? U(r) : e;
}
function or(e) {
  return S(e) ? [e] : xe(e) || Ye(e) ? [e] : M(e) ? [...e.panels] : e.children.flatMap(or);
}
function lr(e, t) {
  if (M(e)) return e;
  const n = mn(e).map(or), r = n.flat(), s = t && r.some((f) => wt(f).includes(t)) ? t : void 0, a = ni(e, n);
  return U({
    kind: "group",
    panels: r,
    ...s ? { active: s } : {},
    ...Q(e),
    ...a ? { places: a } : {}
  });
}
function ni(e, t) {
  const n = S(e) ? e.frames.map(({ node: r, ...s }) => s) : xe(e);
  if (n)
    return t.every((r) => r.length === 1) ? n : void 0;
}
function ri(e, t) {
  const n = bt(e, t, (r) => lr(r, t));
  return n ? U(n) : e;
}
function gn(e, t, n) {
  if (M(e) && ge(e, t)) {
    const r = n(e);
    return r === e ? null : r;
  }
  for (const { node: r, index: s } of It(e)) {
    if (!I(r, t)) continue;
    const a = gn(r, t, n);
    return a ? ar(e, s, a) : null;
  }
  return null;
}
function Nn(e, t, n) {
  const r = gn(e, t, (s) => cr(s, n));
  return r ? U(r) : e;
}
function Bn(e, t, n) {
  const r = we(e, t);
  return !r || !M(r) || r.panels.length < 2 ? e : U(Me(e, t, cr(r, n)));
}
function cr(e, t) {
  if (e.panels.length < 2) return e;
  const n = xe(e);
  return {
    ...dn(t, e.panels.map(Dt)),
    ...Q(e),
    ...n ? { places: n } : {}
  };
}
function an(e, t) {
  if (M(e)) return e;
  if (S(e)) {
    const s = e.frames.findIndex(
      (c) => M(c.node) && c.node.panels.includes(t)
    ), a = e.frames[s], f = a && M(a.node) ? a.node : null;
    if (a && f && f.panels.length > 1) {
      const c = Ot(f.panels.map(Dt), a.rect).frames;
      return {
        ...e,
        frames: [...e.frames.slice(0, s), ...c, ...e.frames.slice(s + 1)]
      };
    }
    return gt(e, (c) => an(c, t));
  }
  if (!I(e, t)) return e;
  let n = !1;
  const r = e.children.map((s) => {
    const a = an(s, t);
    return a !== s && (n = !0), a;
  });
  return n ? { ...e, children: r } : e;
}
function ii(e, t, n) {
  const r = tt(e, t);
  if (!r || r.panels.length < 2) return e;
  if (re(e, t)?.node === r) {
    const f = an(e, t);
    return f === e ? e : U(f);
  }
  const a = gn(e, t, (f) => ur(f, n));
  return a ? U(a) : e;
}
function si(e, t, n) {
  const r = we(e, t);
  if (!r || !M(r) || r.panels.length < 2) return e;
  const s = t.slice(0, -1), a = t.length > 0 ? we(e, s) : null, f = t[t.length - 1], c = a && S(a) && f !== void 0 ? a.frames[f] : void 0;
  if (a && S(a) && c && f !== void 0) {
    const u = Ot(r.panels.map(Dt), c.rect).frames, m = [...a.frames.slice(0, f), ...u, ...a.frames.slice(f + 1)];
    return U(Me(e, s, { ...a, frames: m }));
  }
  return U(Me(e, t, ur(r, n)));
}
function ur(e, t) {
  return {
    ...fn(fr(e.panels.map(Dt), xe(e), t)),
    ...Q(e)
  };
}
function fr(e, t, n) {
  return t ? e.map((r, s) => ({ ...t[s], node: r })) : Ot(e, n).frames;
}
function dr(e, t) {
  return { ...fn(fr(e.children, xe(e), t)), ...Q(e) };
}
function Fs(e, t, n) {
  const r = bt(
    e,
    t,
    (s) => S(s) ? s : dr(s, n)
  );
  return r ? U(r) : M(e) && ge(e, t) ? Ot([e], n) : e;
}
function ai(e, t) {
  const n = (s) => t === "column" ? s.rect.y : s.rect.x, r = (s) => t === "column" ? s.rect.x : s.rect.y;
  return [...e].sort((s, a) => n(s) - n(a) || r(s) - r(a));
}
function pr(e, t) {
  const n = ai(e.frames, t);
  return {
    kind: "split",
    direction: t,
    children: n.map((r) => r.node),
    ...Q(e),
    places: n.map(({ node: r, ...s }) => s)
  };
}
function Ts(e, t, n = "row") {
  const r = bt(
    e,
    t,
    (s) => S(s) ? pr(s, n) : s
  );
  return r ? U(r) : e;
}
function mr(e) {
  if (S(e)) return null;
  const t = M(e) ? e.panels.length === 1 ? e.panels[0] : void 0 : e.children.length === 1 ? e.children[0] : void 0;
  return t === void 0 || V(t) || M(t) && t.panels.length === 1 && V(t.panels[0]) ? null : t;
}
const oi = (e) => {
  const { title: t, fixedView: n, headless: r, ...s } = e;
  return s;
};
function li(e, t) {
  const n = mr(e);
  return n ? t === "inner" ? n : { ...oi(n), ...Q(e) } : e;
}
function st(e) {
  return e.title ? e.title : M(e) ? "" : S(e) ? "Desktop" : e.direction === "row" ? "Row" : "Column";
}
function ht(e, t) {
  if (M(e)) {
    const r = e.panels[je(e)];
    return r === void 0 ? "" : V(r) ? t(r) ?? r : st(r) || ht(r, t);
  }
  if (e.title) return e.title;
  if (S(e)) {
    const r = e.frames[e.frames.length - 1];
    return r ? r.title ?? ht(r.node, t) : "";
  }
  const n = e.children[0];
  return n ? ht(n, t) : "";
}
function we(e, t) {
  let n = e;
  for (const r of t) {
    if (!n) return null;
    if (ot(n)) n = n.children[r];
    else if (S(n)) n = n.frames[r]?.node;
    else {
      const s = n.panels[r];
      n = s === void 0 || V(s) ? void 0 : s;
    }
  }
  return n ?? null;
}
function Me(e, t, n) {
  if (t.length === 0) return n;
  const [r, ...s] = t;
  if (r === void 0) return e;
  if (S(e)) {
    const u = e.frames[r];
    if (!u) return e;
    const m = Me(u.node, s, n);
    if (m === u.node) return e;
    const d = [...e.frames];
    return d[r] = { ...u, node: m }, { ...e, frames: d };
  }
  if (M(e)) {
    const u = e.panels[r];
    if (u === void 0 || V(u)) return e;
    const m = Me(u, s, n);
    if (m === u) return e;
    const d = [...e.panels];
    return d[r] = m, { ...e, panels: d };
  }
  const a = e.children[r];
  if (!a) return e;
  const f = Me(a, s, n);
  if (f === a) return e;
  const c = [...e.children];
  return c[r] = f, { ...e, children: c };
}
function At(e, t, n) {
  if (t.length === 0)
    return ot(e) ? { ...e, sizes: hn(e.children.length, n) } : e;
  const [r, ...s] = t;
  if (r === void 0) return e;
  if (S(e)) {
    const c = e.frames[r];
    if (!c) return e;
    const u = At(c.node, s, n);
    if (u === c.node) return e;
    const m = [...e.frames];
    return m[r] = { ...c, node: u }, { ...e, frames: m };
  }
  if (M(e)) {
    const c = e.panels[r];
    if (c === void 0 || V(c)) return e;
    const u = At(c, s, n);
    if (u === c) return e;
    const m = [...e.panels];
    return m[r] = u, { ...e, panels: m };
  }
  const a = e.children[r];
  if (!a) return e;
  const f = [...e.children];
  return f[r] = At(a, s, n), { ...e, children: f };
}
function Wn(e, t, n, r = 0.02) {
  const s = e[t], a = e[t + 1];
  if (s === void 0 || a === void 0) return e;
  const f = s + a;
  if (f < r * 2) return e;
  const c = [...e], u = Math.min(Math.max(s + n, r), f - r);
  return c[t] = u, c[t + 1] = f - u, c;
}
function Rt(e) {
  if (!M(e) || e.panels.length >= 2) return e;
  const t = e.panels[0];
  return t !== void 0 && !V(t) ? e : { ...pn([ci(e)]), ...Q(e) };
}
const ci = (e) => {
  if (!e.title) return e;
  const { title: t, ...n } = e;
  return n;
};
function Vn(e) {
  return e.length === 0 ? null : pn(e.map(_e));
}
function ui(e, t) {
  if (!e) return Vn(t);
  const n = new Set(t), r = /* @__PURE__ */ new Set(), s = /* @__PURE__ */ new Set();
  for (const u of ke(e))
    !n.has(u) || r.has(u) ? s.add(u) : r.add(u);
  let a = e;
  for (const u of s)
    a = a ? qe(a, u) : null;
  const f = new Set(a ? ke(a) : []), c = t.filter((u) => !f.has(u));
  if (c.length === 0) return a ? Rt(U(a)) : null;
  if (!a) return Vn(c);
  if (S(a)) {
    const u = a.frames.length;
    return {
      ...a,
      frames: [
        ...a.frames,
        ...c.map(
          (m, d) => Lt(_e(m), {
            x: Ge.x + (u + d) * Tt,
            y: Ge.y + (u + d) * Tt
          })
        )
      ]
    };
  }
  return Rt(U(pn([a, ...c.map(_e)])));
}
const wn = Symbol("dc.windowContext");
function fi(e) {
  return Gn(wn, e), e;
}
function Nt() {
  const e = Et(wn, null);
  if (!e)
    throw new Error(
      "[appfr] No window context found. Render this component inside <WindowFrame>."
    );
  return e;
}
const di = 320, pi = 240;
function mi(e) {
  if (!e || typeof window > "u") return;
  const t = e.getBoundingClientRect();
  if (t.width <= 0 || t.height <= 0) return;
  const n = Math.max(0, window.outerHeight - window.innerHeight);
  return {
    width: Math.round(t.width),
    height: Math.round(t.height),
    left: Math.round(window.screenX + t.left),
    top: Math.round(window.screenY + n + t.top)
  };
}
function vi(e, t) {
  if (typeof window > "u") return null;
  const n = Math.max(di, Math.round(t?.width ?? window.innerWidth)), r = Math.max(pi, Math.round(t?.height ?? window.innerHeight)), s = ["popup", `width=${n}`, `height=${r}`];
  t?.left !== void 0 && s.push(`left=${t.left}`), t?.top !== void 0 && s.push(`top=${t.top}`);
  const a = window.open(e, "_blank", s.join(","));
  if (a)
    try {
      a.opener = null;
    } catch {
    }
  return a;
}
const hi = ["data-dc-glyph"], gi = { class: "dc-glyph__line" }, wi = ["d"], ki = {
  key: 0,
  class: "dc-glyph__aqua"
}, bi = ["d"], _i = /* @__PURE__ */ at({
  __name: "WindowGlyph",
  props: {
    kind: {}
  },
  setup(e) {
    const t = {
      minimize: ["M2 5h6"],
      // Rolled up, the window is its own bar. A second square beside the maximize
      // one would be a riddle at this size; what unrolls is the body coming back
      // down, so that is the mark.
      unroll: ["M2.4 4l2.6 2.6L7.6 4"],
      maximize: ["M2.5 2.5h5v5h-5z"],
      // The near square, with the one it came from behind it.
      restore: ["M2 4.5h3.5V8H2z", "M4 4.5V2h4v4H5.5"],
      close: ["M2.4 2.4l5.2 5.2", "M7.6 2.4l-5.2 5.2"]
    }, n = {
      minimize: ["M2.2 4.3h5.6v1.4H2.2z"],
      unroll: ["M2.2 4.3h5.6v1.4H2.2z"],
      maximize: ["M8.4 1.6v4.2l-4.2-4.2z", "M1.6 8.4v-4.2l4.2 4.2z"],
      restore: ["M5 5h4.2L5 0.8z", "M5 5H0.8L5 9.2z"]
    };
    return (r, s) => (x(), P("svg", {
      class: "dc-glyph",
      "data-dc-glyph": e.kind,
      viewBox: "0 0 10 10",
      "aria-hidden": "true",
      focusable: "false"
    }, [
      pe("g", gi, [
        (x(!0), P(Se, null, Xe(t[e.kind], (a) => (x(), P("path", {
          key: a,
          d: a
        }, null, 8, wi))), 128))
      ]),
      n[e.kind] ? (x(), P("g", ki, [
        (x(!0), P(Se, null, Xe(n[e.kind], (a) => (x(), P("path", {
          key: a,
          d: a
        }, null, 8, bi))), 128))
      ])) : W("", !0)
    ], 8, hi));
  }
}), lt = (e, t) => {
  const n = e.__vccOpts || e;
  for (const [r, s] of t)
    n[r] = s;
  return n;
}, it = /* @__PURE__ */ lt(_i, [["__scopeId", "data-v-4d2872c0"]]), xi = ["data-dc-order", "data-dc-path", "data-dc-maximized", "data-dc-minimized", "data-dc-dragging"], yi = ["data-dc-movable"], Mi = { class: "dc-float__title dc-truncate" }, $i = {
  key: 1,
  class: "dc-float__controls dc-controls"
}, zi = ["aria-label", "aria-pressed", "data-dc-minimize"], Ai = ["aria-label", "aria-pressed", "data-dc-maximize"], Pi = ["aria-label", "data-dc-close"], Ei = { class: "dc-float__content" }, Si = ["data-dc-handle", "onPointerdown"], Ci = /* @__PURE__ */ at({
  __name: "WindowFloat",
  props: {
    frame: {},
    path: {},
    order: {},
    place: {}
  },
  setup(e) {
    const t = e, n = Nt(), r = w(() => se(t.frame.node)), s = w(() => n.panelFor(r.value)?.fixed === !0), a = w(() => Oe(t.frame)), f = w(() => He(t.frame)), c = w(() => a.value || f.value), u = w(() => n.resizable.value && !s.value && !c.value), m = w(() => !s.value && !c.value), d = w(() => {
      const X = ke(t.frame.node);
      return X.length === 1 ? X[0] ?? null : null;
    }), y = w(() => d.value !== null && n.closable(d.value)), q = w(() => t.frame.node.headless === !0), _ = w(
      () => !q.value && (!M(t.frame.node) || f.value)
    ), E = w(
      () => t.frame.title || st(t.frame.node) || ht(t.frame.node, (X) => n.panelFor(X)?.title)
    ), O = w(() => n.spaceMenu(t.path));
    function G(X) {
      X.target?.closest("button, a, input, select, textarea, label") || n.beginFrameDragAt(t.path, X, "move");
    }
    function ee(X) {
      X.target?.closest("button, a, input, select, textarea, label") || (f.value ? n.toggleMinimizeAt(t.path) : n.toggleMaximizeAt(t.path));
    }
    const ue = w(() => {
      const X = n.framing.value;
      return X !== null && I(t.frame.node, X);
    }), H = w(() => ({
      // Neither maximizing nor rolling up overwrites the rect: it is where the
      // window goes back to, and both are a way of not being there for a while.
      ...a.value ? { inset: "0" } : f.value && t.place ? {
        left: `${t.place.x}px`,
        bottom: `${t.place.bottom}px`,
        width: `${tn}px`,
        height: `${Qn}px`
      } : {
        left: `${t.frame.rect.x}px`,
        top: `${t.frame.rect.y}px`,
        width: `${t.frame.rect.w}px`,
        height: `${t.frame.rect.h}px`
      },
      // Back to front. The DOM order says the same thing, but a frame that paints
      // a shadow over its neighbour should not depend on that being noticed.
      zIndex: t.order + 1
    })), J = ["n", "s", "e", "w", "nw", "ne", "sw", "se"];
    return (X, j) => (x(), P("div", {
      class: "dc-float",
      style: St(H.value),
      "data-dc-order": e.order,
      "data-dc-path": e.path.join("/"),
      "data-dc-maximized": a.value ? "true" : "false",
      "data-dc-minimized": f.value ? "true" : "false",
      "data-dc-dragging": ue.value ? "true" : "false",
      onPointerdown: j[3] || (j[3] = (ae) => ce(n).raiseAt(e.path))
    }, [
      _.value ? (x(), P("header", {
        key: 0,
        class: "dc-float__bar",
        "data-dc-movable": m.value ? "true" : "false",
        onPointerdown: G,
        onDblclick: ee
      }, [
        pe("span", Mi, et(E.value), 1),
        O.value.length ? (x(), Ke(ce(un), {
          key: 0,
          items: O.value,
          label: `${E.value} menu`
        }, null, 8, ["items", "label"])) : W("", !0),
        !s.value || f.value && y.value && d.value ? (x(), P("div", $i, [
          s.value ? W("", !0) : (x(), P("button", {
            key: 0,
            type: "button",
            class: "dc-float__button dc-control",
            "aria-label": `${f.value ? "Unroll" : "Minimize"} ${E.value}`,
            "aria-pressed": f.value,
            "data-dc-minimize": r.value,
            onClick: j[0] || (j[0] = (ae) => ce(n).toggleMinimizeAt(e.path))
          }, [
            he(it, {
              kind: f.value ? "unroll" : "minimize"
            }, null, 8, ["kind"])
          ], 8, zi)),
          s.value ? W("", !0) : (x(), P("button", {
            key: 1,
            type: "button",
            class: "dc-float__button dc-control",
            "aria-label": `${a.value ? "Restore" : "Maximize"} ${E.value}`,
            "aria-pressed": a.value,
            "data-dc-maximize": r.value,
            onClick: j[1] || (j[1] = (ae) => ce(n).toggleMaximizeAt(e.path))
          }, [
            he(it, {
              kind: a.value ? "restore" : "maximize"
            }, null, 8, ["kind"])
          ], 8, Ai)),
          f.value && y.value && d.value ? (x(), P("button", {
            key: 2,
            type: "button",
            class: "dc-float__button dc-control",
            "aria-label": `Close ${E.value}`,
            "data-dc-close": d.value,
            onClick: j[2] || (j[2] = (ae) => ce(n).close(d.value))
          }, [
            he(it, { kind: "close" })
          ], 8, Pi)) : W("", !0)
        ])) : W("", !0)
      ], 40, yi)) : W("", !0),
      pe("div", Ei, [
        qn(X.$slots, "default", {}, void 0, !0)
      ]),
      (x(!0), P(Se, null, Xe(u.value ? J : [], (ae) => (x(), P("span", {
        key: ae,
        class: "dc-float__grip",
        "data-dc-handle": ae,
        "aria-hidden": "true",
        onPointerdown: dt((me) => ce(n).beginFrameDragAt(e.path, me, ae), ["stop"])
      }, null, 40, Si))), 128))
    ], 44, xi));
  }
}), Fi = /* @__PURE__ */ lt(Ci, [["__scopeId", "data-v-7e8e7555"]]), kn = Symbol("dc.paneContext");
function vr(e) {
  return Gn(kn, e), e;
}
function Rs() {
  return Et(kn, null);
}
function Ds(e) {
  const t = Et(wn, null), n = Et(kn, null);
  if (!t || !n) return () => {
  };
  const r = t.registerMenu(
    () => n.panel.value,
    () => Xn(e)
  );
  return Yn() && jn(r), r;
}
const Ti = ["data-dc-panel"], Ri = /* @__PURE__ */ at({
  __name: "WindowPaneBody",
  props: {
    panel: {},
    active: { type: Boolean }
  },
  setup(e) {
    const t = e, n = Nt();
    vr({ panel: w(() => t.panel) });
    const r = () => {
      const s = n.panelFor(t.panel);
      return s ? n.renderContent(s, n.viewFor(t.panel), t.active) ?? null : null;
    };
    return (s, a) => (x(), P("div", {
      class: "dc-pane__content",
      "data-dc-panel": t.panel
    }, [
      he(r)
    ], 8, Ti));
  }
}), Di = /* @__PURE__ */ lt(Ri, [["__scopeId", "data-v-31c655fd"]]), Li = ["data-dc-panel", "data-dc-panels", "data-dc-tabbed", "data-dc-floating", "data-dc-maximized", "data-dc-headless", "data-dc-active", "data-dc-dragging", "aria-label"], Oi = ["data-dc-movable"], Ii = ["aria-label", "aria-pressed"], Ni = ["data-dc-space-name"], Bi = { class: "dc-truncate" }, Wi = ["aria-label"], Vi = {
  key: 0,
  class: "dc-pane__insert",
  "aria-hidden": "true"
}, Hi = ["id", "data-dc-panel", "data-dc-space", "aria-selected", "aria-controls", "tabindex", "onPointerdown", "onClick", "onKeydown"], Ki = { class: "dc-tab__name dc-truncate" }, Gi = {
  key: 0,
  class: "dc-pane__sub dc-mono dc-truncate"
}, qi = ["aria-label", "data-dc-close", "onClick"], Xi = {
  key: 0,
  class: "dc-pane__insert",
  "aria-hidden": "true"
}, Yi = { class: "dc-pane__tools" }, ji = {
  key: 2,
  class: "dc-pane__controls dc-controls"
}, Ui = ["aria-label", "data-dc-minimize"], Zi = ["aria-label", "aria-pressed", "data-dc-maximize"], Qi = ["aria-label", "data-dc-close"], Ji = ["id", "role", "aria-labelledby"], es = ["id", "role", "aria-labelledby"], ts = ["data-dc-edge"], ns = /* @__PURE__ */ at({
  __name: "WindowPane",
  props: {
    group: {},
    path: {}
  },
  setup(e) {
    const t = e, n = Nt(), r = Br() ?? "dc-pane", s = w(
      () => t.group.panels.flatMap((g, $) => {
        if (!V(g)) {
          const ie = st(g) || ht(g, (oe) => n.panelFor(oe)?.title);
          return [{ kind: "space", index: $, id: `space-${$}`, title: ie, node: g }];
        }
        const A = n.panelFor(g);
        return A ? [{ kind: "panel", index: $, id: g, title: A.title, panel: A }] : [];
      })
    ), a = w(() => s.value.length > 1), f = w(() => {
      const g = je(t.group);
      return s.value.find(($) => $.index === g) ?? s.value[0] ?? null;
    }), c = w(() => f.value?.kind === "space" ? f.value.node : null), u = w(() => c.value ? "" : er(t.group)), m = w(() => c.value ? null : n.panelFor(u.value)), d = w(() => f.value?.title ?? ""), y = w(() => n.spaceNames.value ? t.group.title ?? "" : ""), q = w(() => [...t.path, f.value?.index ?? 0]), _ = w(() => u.value || Rn(t.group)[0] || ""), E = w(() => n.viewFor(u.value)), O = w(() => t.group.headless === !0), G = w(() => n.focused.value === u.value), ee = w(() => n.dragging.value === u.value), ue = w(() => n.moving.value === u.value), H = w(() => n.frameOf(_.value) !== null), J = w(() => n.panelFor(_.value)?.fixed === !0), X = w(
      () => !c.value && (n.canMove(u.value) || H.value && !J.value)
    ), j = w(
      () => c.value ? n.spaceMenu(q.value) : n.menuFor(u.value)
    ), ae = (g) => n.closable(g);
    vr({ panel: u });
    const me = w(() => n.maximized(_.value)), Ie = w(
      () => H.value && !J.value || !a.value && !!m.value && ae(m.value.id)
    ), $e = (g) => `${r}-tab-${g}`, Ne = w(() => `${r}-body`), be = w(() => {
      const g = n.dropTarget.value;
      return !g || !ge(t.group, g.panel) || g.edge === "float" ? null : g;
    }), te = w(() => be.value?.index === void 0 ? be.value?.edge ?? null : null), Ue = w(() => be.value?.index ?? null), Ze = w(
      () => s.value.flatMap(
        (g) => g.kind === "panel" && (g.id === u.value || g.panel.keepAlive === !0) ? [g.id] : []
      )
    ), k = fe(null), C = /* @__PURE__ */ new Map();
    Ct(
      u,
      (g, $) => {
        const A = k.value;
        if (!A || ($ && C.set($, A.scrollTop), !n.panelFor(g)?.keepAlive || !C.has(g))) return;
        const ie = C.get(g);
        Un(() => {
          k.value && (k.value.scrollTop = ie);
        });
      },
      { flush: "pre" }
    );
    const K = () => m.value ? n.renderActions(m.value, E.value, G.value) ?? null : null;
    let R = null;
    function Z(g) {
      const $ = R !== null && Math.hypot(g.clientX - R.x, g.clientY - R.y) >= 4;
      return R = null, $;
    }
    const de = (g) => g.kind === "panel" ? g.id : se(g.node);
    function Fe(g, $) {
      $.kind !== "space" && (n.focus($.id), R = { x: g.clientX, y: g.clientY }, n.beginDrag($.id, g));
    }
    function Te(g, $) {
      if (Z(g)) return;
      const A = de($);
      A && n.selectPanel(A);
    }
    function Re(g) {
      u.value && n.focus(u.value), !g.target?.closest(".dc-tab, button, a, input, select, textarea, label") && (H.value ? n.beginFrameDrag(_.value, g, "move") : n.beginDrag(u.value, g));
    }
    function De(g) {
      R = { x: g.clientX, y: g.clientY }, n.beginDrag(u.value, g);
    }
    function ze(g) {
      Z(g) || n.toggleMoveMode(u.value);
    }
    const Ae = {
      ArrowLeft: "left",
      ArrowRight: "right",
      ArrowUp: "up",
      ArrowDown: "down"
    };
    function Pe(g) {
      if (!ue.value) return;
      if (g.key === "Escape") {
        g.preventDefault(), n.toggleMoveMode(u.value);
        return;
      }
      const $ = Ae[g.key];
      $ && (g.preventDefault(), H.value ? n.nudgeFrame(u.value, $, g.shiftKey) : n.nudge(u.value, $, g.shiftKey));
    }
    function ct(g) {
      !H.value || g.target?.closest(".dc-tab, button, a, input, select, textarea, label") || n.toggleMaximize(_.value);
    }
    function _t(g, $) {
      g.stopPropagation(), R = null, n.close($);
    }
    function Bt(g, $) {
      const A = s.value.length;
      let ie = null;
      if (g.key === "ArrowRight" ? ie = ($ + 1) % A : g.key === "ArrowLeft" ? ie = ($ - 1 + A) % A : g.key === "Home" ? ie = 0 : g.key === "End" && (ie = A - 1), ie === null) return;
      g.preventDefault();
      const oe = s.value[ie];
      if (!oe) return;
      const ut = de(oe);
      ut && n.selectPanel(ut);
    }
    return (g, $) => f.value ? (x(), P("section", {
      key: 0,
      class: "dc-pane",
      "data-dc-panel": u.value || void 0,
      "data-dc-panels": ce(Rn)(e.group).join(" ") || void 0,
      "data-dc-tabbed": a.value ? "true" : "false",
      "data-dc-floating": H.value ? "true" : "false",
      "data-dc-maximized": me.value ? "true" : "false",
      "data-dc-headless": O.value ? "true" : "false",
      "data-dc-active": G.value ? "true" : "false",
      "data-dc-dragging": ee.value ? "true" : "false",
      "aria-label": d.value,
      onFocusin: $[7] || ($[7] = (A) => u.value && ce(n).focus(u.value))
    }, [
      O.value ? W("", !0) : (x(), P("header", {
        key: 0,
        class: "dc-pane__head",
        "data-dc-movable": X.value ? "true" : "false",
        onPointerdown: Re,
        onDblclick: ct
      }, [
        X.value ? (x(), P("button", {
          key: 0,
          type: "button",
          class: "dc-pane__grip",
          "aria-label": `Move ${d.value}`,
          "aria-pressed": ue.value,
          onPointerdown: De,
          onClick: ze,
          onKeydown: Pe
        }, [...$[8] || ($[8] = [
          pe("span", { "aria-hidden": "true" }, "⠿", -1)
        ])], 40, Ii)) : W("", !0),
        y.value ? (x(), P("span", {
          key: 1,
          class: "dc-pane__name",
          "data-dc-space-name": y.value
        }, [
          pe("span", Bi, et(y.value), 1)
        ], 8, Ni)) : W("", !0),
        pe("div", {
          class: "dc-pane__tabs",
          role: "tablist",
          "aria-label": `${d.value} panels`
        }, [
          (x(!0), P(Se, null, Xe(s.value, (A, ie) => (x(), P(Se, {
            key: A.id
          }, [
            Ue.value === ie ? (x(), P("span", Vi)) : W("", !0),
            pe("button", {
              id: $e(A.id),
              type: "button",
              role: "tab",
              class: "dc-tab",
              "data-dc-panel": A.kind === "panel" ? A.id : void 0,
              "data-dc-space": A.kind === "space" ? A.title : void 0,
              "aria-selected": A.index === f.value.index,
              "aria-controls": Ne.value,
              tabindex: A.index === f.value.index ? 0 : -1,
              onPointerdown: (oe) => Fe(oe, A),
              onClick: (oe) => Te(oe, A),
              onKeydown: (oe) => Bt(oe, ie)
            }, [
              pe("span", Ki, et(A.title), 1),
              A.kind === "panel" && A.panel.subtitle ? (x(), P("span", Gi, et(A.panel.subtitle), 1)) : W("", !0),
              a.value && A.kind === "panel" && ae(A.id) ? (x(), P("span", {
                key: 1,
                class: "dc-tab__close",
                role: "button",
                tabindex: "-1",
                "aria-label": `Close ${A.title}`,
                "data-dc-close": A.id,
                onPointerdown: $[0] || ($[0] = dt(() => {
                }, ["stop"])),
                onClick: (oe) => _t(oe, A.id)
              }, [...$[9] || ($[9] = [
                pe("span", { "aria-hidden": "true" }, "×", -1)
              ])], 40, qi)) : W("", !0)
            ], 40, Hi)
          ], 64))), 128)),
          Ue.value === s.value.length ? (x(), P("span", Xi)) : W("", !0)
        ], 8, Wi),
        pe("div", Yi, [
          he(K),
          j.value.length ? (x(), Ke(ce(un), {
            key: 0,
            items: j.value,
            label: `${d.value} menu`
          }, null, 8, ["items", "label"])) : W("", !0)
        ]),
        Ie.value ? (x(), P("div", ji, [
          H.value && !J.value ? (x(), P("button", {
            key: 0,
            type: "button",
            class: "dc-pane__button dc-control",
            "aria-label": `Minimize ${d.value}`,
            "data-dc-minimize": _.value,
            onPointerdown: $[1] || ($[1] = dt(() => {
            }, ["stop"])),
            onClick: $[2] || ($[2] = (A) => ce(n).toggleMinimize(_.value))
          }, [
            he(it, { kind: "minimize" })
          ], 40, Ui)) : W("", !0),
          H.value && !J.value ? (x(), P("button", {
            key: 1,
            type: "button",
            class: "dc-pane__button dc-control",
            "aria-label": `${me.value ? "Restore" : "Maximize"} ${d.value}`,
            "aria-pressed": me.value,
            "data-dc-maximize": _.value,
            onPointerdown: $[3] || ($[3] = dt(() => {
            }, ["stop"])),
            onClick: $[4] || ($[4] = (A) => ce(n).toggleMaximize(_.value))
          }, [
            he(it, {
              kind: me.value ? "restore" : "maximize"
            }, null, 8, ["kind"])
          ], 40, Zi)) : W("", !0),
          !a.value && m.value && ae(m.value.id) ? (x(), P("button", {
            key: 2,
            type: "button",
            class: "dc-pane__close dc-control",
            "aria-label": `Close ${d.value}`,
            "data-dc-close": m.value.id,
            onPointerdown: $[5] || ($[5] = dt(() => {
            }, ["stop"])),
            onClick: $[6] || ($[6] = (A) => ce(n).close(m.value.id))
          }, [
            he(it, { kind: "close" })
          ], 40, Qi)) : W("", !0)
        ])) : W("", !0)
      ], 40, Oi)),
      c.value ? (x(), P("div", {
        key: 1,
        id: Ne.value,
        class: "dc-pane__space",
        role: O.value ? void 0 : "tabpanel",
        "aria-labelledby": O.value ? void 0 : $e(f.value.id)
      }, [
        qn(g.$slots, "space", {
          node: c.value,
          path: q.value
        }, void 0, !0)
      ], 8, Ji)) : W("", !0),
      !c.value || Ze.value.length ? En((x(), P("div", {
        key: 2,
        id: c.value ? void 0 : Ne.value,
        ref_key: "body",
        ref: k,
        class: "dc-pane__body",
        role: O.value || c.value ? void 0 : "tabpanel",
        "aria-labelledby": O.value || c.value ? void 0 : $e(u.value)
      }, [
        (x(!0), P(Se, null, Xe(Ze.value, (A) => En((x(), Ke(Di, {
          key: A,
          panel: A,
          active: A === u.value && G.value
        }, null, 8, ["panel", "active"])), [
          [Sn, A === u.value]
        ])), 128))
      ], 8, es)), [
        [Sn, !c.value]
      ]) : W("", !0),
      te.value ? (x(), P("div", {
        key: 3,
        class: "dc-pane__drop",
        "data-dc-edge": te.value,
        "aria-hidden": "true"
      }, null, 8, ts)) : W("", !0)
    ], 40, Li)) : W("", !0);
  }
}), rs = /* @__PURE__ */ lt(ns, [["__scopeId", "data-v-29033519"]]), is = ["data-dc-space", "data-dc-path", "data-dc-bare", "aria-label"], ss = {
  key: 0,
  class: "dc-space__head"
}, as = { class: "dc-space__title dc-truncate" }, os = ["data-dc-direction"], ls = {
  key: 0,
  class: "dc-space__drop",
  "aria-hidden": "true"
}, cs = ["aria-orientation", "aria-label", "aria-valuenow", "aria-disabled", "tabindex", "onPointerdown", "onKeydown"], us = /* @__PURE__ */ at({
  __name: "WindowNode",
  props: {
    node: {},
    path: {},
    framed: { type: Boolean }
  },
  setup(e) {
    const t = e, n = Nt(), r = fe(null), s = w(() => M(t.node) ? t.node : null), a = w(() => ot(t.node) ? t.node : null), f = w(() => S(t.node) ? t.node : null), c = w(
      () => a.value ? a.value.children : f.value?.frames.map((k) => k.node) ?? []
    ), u = w(() => a.value ? Ce(a.value) : []), m = w(
      () => (f.value?.frames ?? []).map((k, C) => ({
        held: k,
        /** Place in the stack, counted from the back — what `z-index` follows. */
        order: C,
        key: me(k.node),
        path: [...t.path, C]
      })).sort((k, C) => k.key < C.key ? -1 : k.key > C.key ? 1 : 0)
    ), d = w(() => st(t.node)), y = w(() => n.spaceMenu(t.path)), q = w(() => t.node.headless === !0), _ = w(() => t.path.length === 0 && !n.rootBar.value), E = w(() => f.value ? "desktop" : a.value?.direction ?? ""), O = fe(null), G = fe(0);
    let ee = null;
    Ct(
      O,
      (k) => {
        ee?.disconnect(), ee = null, !(!k || typeof ResizeObserver > "u") && (G.value = k.clientWidth, ee = new ResizeObserver(([C]) => {
          G.value = C?.contentRect.width ?? 0;
        }), ee.observe(k));
      },
      { immediate: !0 }
    ), Ft(() => ee?.disconnect());
    const ue = w(() => {
      const k = Math.max(
        1,
        Math.floor((G.value + Qe) / (tn + Qe))
      ), C = /* @__PURE__ */ new Map();
      let K = 0;
      for (const R of m.value)
        R.held.minimized === !0 && (C.set(R.key, {
          x: Qe + K % k * (tn + Qe),
          bottom: Qe + Math.floor(K / k) * (Qn + Qe)
        }), K += 1);
      return C;
    }), H = (k) => !!k && k.join("/") === t.path.join("/"), J = w(() => {
      const k = n.dropTarget.value, C = f.value;
      if (!C || !k?.rect || k.edge !== "float") return null;
      if (k.space) return H(k.space) ? k.rect : null;
      const K = re(C, k.panel);
      return K && C.frames.includes(K) ? k.rect : null;
    }), X = w(() => {
      const k = n.dropTarget.value;
      return !!k && !k.rect && H(k.space);
    }), j = w(() => a.value?.direction === "row"), ae = w(() => c.value.map((k, C) => [...t.path, C])), me = (k) => [...ke(k)].sort().join("/"), Ie = (k) => {
      const C = ke(k)[0];
      return (C ? n.panelFor(C)?.title : null) ?? C ?? "panel";
    }, $e = (k) => {
      const C = c.value[k], K = c.value[k + 1];
      return !C || !K ? "Resize panels" : `Resize ${Ie(C)} and ${Ie(K)}`;
    }, Ne = (k) => {
      const C = u.value[k] ?? 0, K = u.value[k + 1] ?? 0, R = C + K;
      return R > 0 ? Math.round(C / R * 100) : 50;
    };
    function be() {
      const k = r.value, C = k ? j.value ? k.clientWidth : k.clientHeight : 0;
      return C <= 0 ? 0.05 : Math.min(n.minPanelSize.value / C, 0.4);
    }
    let te = null;
    function Ue(k, C) {
      const K = a.value, R = r.value;
      if (!n.resizable.value || !K || !R || k.button !== 0) return;
      const Z = j.value ? R.clientWidth : R.clientHeight;
      if (Z <= 0) return;
      const de = j.value ? k.clientX : k.clientY, Fe = Ce(K), Te = Math.min(n.minPanelSize.value / Z, 0.4);
      k.preventDefault();
      const Re = (Ae) => {
        const Pe = ((j.value ? Ae.clientX : Ae.clientY) - de) / Z;
        n.setSizes(t.path, Wn(Fe, C, Pe, Te));
      }, De = () => te?.(), ze = (Ae) => {
        Ae.key === "Escape" && (n.setSizes(t.path, Fe), te?.());
      };
      te = () => {
        window.removeEventListener("pointermove", Re), window.removeEventListener("pointerup", De), window.removeEventListener("pointercancel", De), window.removeEventListener("keydown", ze), te = null;
      }, window.addEventListener("pointermove", Re), window.addEventListener("pointerup", De), window.addEventListener("pointercancel", De), window.addEventListener("keydown", ze);
    }
    Ft(() => te?.());
    function Ze(k, C) {
      const K = a.value;
      if (!n.resizable.value || !K) return;
      const R = j.value ? "ArrowRight" : "ArrowDown", Z = j.value ? "ArrowLeft" : "ArrowUp", de = k.shiftKey ? 0.1 : 0.02;
      if (k.key !== R && k.key !== Z) return;
      const Fe = k.key === R ? de : -de;
      k.preventDefault(), n.setSizes(t.path, Wn(Ce(K), C, Fe, be()));
    }
    return (k, C) => {
      const K = Wr("WindowNode", !0);
      return s.value ? (x(), Ke(rs, {
        key: 0,
        group: s.value,
        path: e.path
      }, {
        space: Cn(({ node: R, path: Z }) => [
          he(K, {
            node: R,
            path: Z,
            framed: !s.value.headless
          }, null, 8, ["node", "path", "framed"])
        ]),
        _: 1
      }, 8, ["group", "path"])) : (x(), P("section", {
        key: 1,
        class: "dc-space",
        "data-dc-space": E.value,
        "data-dc-path": e.path.join("/"),
        "data-dc-bare": _.value ? "true" : void 0,
        "aria-label": d.value
      }, [
        !e.framed && !q.value && !_.value ? (x(), P("header", ss, [
          pe("span", as, et(d.value), 1),
          y.value.length ? (x(), Ke(ce(un), {
            key: 0,
            items: y.value,
            label: `${d.value} menu`
          }, null, 8, ["items", "label"])) : W("", !0)
        ])) : W("", !0),
        f.value ? (x(), P("div", {
          key: 1,
          ref_key: "desktop",
          ref: O,
          class: "dc-window__desktop"
        }, [
          J.value ? (x(), P("div", {
            key: 0,
            class: "dc-window__drop",
            style: St({
              left: `${J.value.x}px`,
              top: `${J.value.y}px`,
              width: `${J.value.w}px`,
              height: `${J.value.h}px`
            }),
            "aria-hidden": "true"
          }, null, 4)) : W("", !0),
          (x(!0), P(Se, null, Xe(m.value, (R) => (x(), Ke(Fi, {
            key: R.key,
            frame: R.held,
            path: R.path,
            order: R.order,
            place: ue.value.get(R.key) ?? null
          }, {
            default: Cn(() => [
              he(K, {
                node: R.held.node,
                path: R.path,
                framed: R.held.node.kind !== "group"
              }, null, 8, ["node", "path", "framed"])
            ]),
            _: 2
          }, 1032, ["frame", "path", "order", "place"]))), 128))
        ], 512)) : a.value ? (x(), P("div", {
          key: 2,
          ref_key: "container",
          ref: r,
          class: "dc-window__split",
          "data-dc-direction": a.value.direction
        }, [
          X.value ? (x(), P("div", ls)) : W("", !0),
          (x(!0), P(Se, null, Xe(c.value, (R, Z) => (x(), P(Se, {
            key: me(R)
          }, [
            pe("div", {
              class: "dc-window__cell",
              style: St({ flexGrow: u.value[Z] ?? 1 })
            }, [
              he(K, {
                node: R,
                path: ae.value[Z] ?? []
              }, null, 8, ["node", "path"])
            ], 4),
            Z < c.value.length - 1 ? (x(), P("div", {
              key: 0,
              class: "dc-window__gutter",
              role: "separator",
              "aria-orientation": j.value ? "vertical" : "horizontal",
              "aria-label": $e(Z),
              "aria-valuenow": Ne(Z),
              "aria-valuemin": "0",
              "aria-valuemax": "100",
              "aria-disabled": ce(n).resizable.value ? void 0 : "true",
              tabindex: ce(n).resizable.value ? 0 : -1,
              onPointerdown: (de) => Ue(de, Z),
              onKeydown: (de) => Ze(de, Z)
            }, null, 40, cs)) : W("", !0)
          ], 64))), 128))
        ], 8, os)) : W("", !0)
      ], 8, is));
    };
  }
}), fs = /* @__PURE__ */ lt(us, [["__scopeId", "data-v-5068616a"]]), ds = ["data-dc-theme", "data-dc-dragging", "data-dc-docking"], ps = {
  key: 1,
  class: "dc-window__empty"
}, ms = {
  class: "dc-window__live",
  "aria-live": "polite",
  role: "status"
}, Mt = 16, vs = /* @__PURE__ */ at({
  __name: "WindowFrame",
  props: /* @__PURE__ */ Tn({
    panels: {},
    resizable: { type: Boolean, default: !0 },
    minPanelSize: { default: 120 },
    menu: { type: Boolean, default: !0 },
    spaceNames: { type: Boolean, default: !0 },
    rootBar: { type: Boolean, default: !0 },
    paneMenu: {},
    popOut: {},
    solo: { type: Boolean, default: !1 },
    accent: {},
    tokens: {},
    theme: { default: "minimal" }
  }, {
    layout: { default: null },
    layoutModifiers: {},
    views: { default: () => ({}) },
    viewsModifiers: {}
  }),
  emits: /* @__PURE__ */ Tn(["panel-move", "view-change", "panel-activate", "tab-select", "frame-change", "frame-maximize", "frame-minimize", "panel-close", "panel-pop-out"], ["update:layout", "update:views"]),
  setup(e, { expose: t, emit: n }) {
    const r = e, s = n, a = Fn(e, "layout"), f = Fn(e, "views"), c = Vr(), u = w(() => new Map(r.panels.map((i) => [i.id, i]))), m = w(() => r.panels.map((i) => i.id)), d = w(() => ui(a.value, y.value)), y = w(() => {
      if (!r.solo || !a.value) return m.value;
      const i = new Set(ke(a.value)), o = m.value.filter((l) => i.has(l));
      return o.length ? o : m.value;
    }), q = fe(null), _ = fe(null), E = fe(null), O = fe(!0), G = fe(null), ee = fe(null), ue = fe(null), H = fe(""), J = fe(null);
    function X() {
      const i = J.value;
      return i ? [...i.querySelectorAll(".dc-pane[data-dc-panels]")].filter((l) => l.closest(".dc-window") === i).map((l) => ({ panels: (l.dataset.dcPanels ?? "").split(" "), element: l })) : [];
    }
    function j(i) {
      const o = [];
      let l = i.closest(".dc-float");
      for (; l; )
        o.unshift(Number(l.dataset.dcOrder ?? 0)), l = l.parentElement?.closest(".dc-float") ?? null;
      return o;
    }
    function ae() {
      return X().map((i) => ({ pane: i, order: j(i.element) })).sort((i, o) => {
        const l = Math.max(i.order.length, o.order.length);
        for (let p = 0; p < l; p += 1) {
          const v = (i.order[p] ?? -1) - (o.order[p] ?? -1);
          if (v !== 0) return v;
        }
        return 0;
      }).map((i) => i.pane);
    }
    const me = (i) => X().find((o) => o.panels.includes(i)) ?? null;
    function Ie(i) {
      const o = u.value.get(i);
      if (!o) return "";
      const l = f.value[i];
      return l && o.views?.some((p) => p.key === l) ? l : o.defaultView ?? o.views?.[0]?.key ?? "";
    }
    function $e(i, o) {
      f.value = { ...f.value, [i]: o }, s("view-change", { panel: i, view: o });
    }
    const Ne = w(
      () => r.panels.filter((i) => i.fixed !== !0).length
    );
    function be(i) {
      return Ne.value < 1 || r.panels.length < 2 ? !1 : u.value.get(i)?.fixed !== !0;
    }
    function te(i, o) {
      const l = d.value;
      !i || !l || i === l || (a.value = i, o && s("panel-move", o));
    }
    function Ue(i, o, l) {
      if (i.width <= 0 || i.height <= 0) return "center";
      const p = (o - i.left) / i.width, v = (l - i.top) / i.height, h = 0.3;
      return p > h && p < 1 - h && v > h && v < 1 - h ? "center" : [
        { edge: "left", distance: p },
        { edge: "right", distance: 1 - p },
        { edge: "top", distance: v },
        { edge: "bottom", distance: 1 - v }
      ].reduce(
        (D, b) => b.distance < D.distance ? b : D
      ).edge;
    }
    function Ze(i, o) {
      const l = [...i.querySelectorAll(".dc-tab")], p = l.findIndex((v) => {
        const h = v.getBoundingClientRect();
        return o < h.left + h.width / 2;
      });
      return p === -1 ? l.length : p;
    }
    function k(i, o, l) {
      for (const { panels: p, element: v } of ae().reverse()) {
        const h = v.getBoundingClientRect();
        if (i < h.left || i > h.right || o < h.top || o > h.bottom) continue;
        const L = p.find((F) => F !== l), D = v.querySelector(".dc-pane__tabs"), b = D?.getBoundingClientRect();
        if (D && b && o >= b.top && o <= b.bottom)
          return L ? { panel: L, edge: "center", index: Ze(D, i) } : null;
        const z = v.querySelector(":scope > .dc-pane__space");
        if (z) {
          const F = z.getBoundingClientRect();
          if (i >= F.left && i <= F.right && o >= F.top && o <= F.bottom) continue;
        }
        return L ? { panel: L, edge: Ue(h, i, o) } : null;
      }
      return K(i, o, l) ?? de(i, o);
    }
    function C() {
      const i = J.value;
      return i ? [...i.querySelectorAll(".dc-window__desktop")].filter((o) => o.closest(".dc-window") === i).reverse() : [];
    }
    function K(i, o, l) {
      const p = d.value;
      if (!p) return null;
      for (const v of C()) {
        const h = v.getBoundingClientRect();
        if (i < h.left || i > h.right || o < h.top || o > h.bottom) continue;
        const L = Fe(v), D = L.flatMap((N) => N.panels).find((N) => N !== l);
        if (!D && L.length > 0) return null;
        const b = re(p, l)?.rect, z = qt(
          {
            x: i - h.left - 24,
            y: o - h.top - 12,
            w: b?.w ?? Ge.w,
            h: b?.h ?? Ge.h
          },
          { w: v.clientWidth, h: v.clientHeight },
          r.minPanelSize
        );
        if (D) return { panel: D, edge: "float", rect: z };
        const F = R(v);
        return F ? { panel: "", space: F, edge: "float", rect: z } : null;
      }
      return null;
    }
    function R(i) {
      const o = i.closest(".dc-space")?.getAttribute("data-dc-path");
      return o == null ? null : o === "" ? [] : o.split("/").map(Number);
    }
    function Z() {
      const i = J.value;
      return i ? [...i.querySelectorAll(".dc-space")].filter((o) => o.closest(".dc-window") === i).filter((o) => !o.querySelector(".dc-pane")).reverse().flatMap((o) => {
        const l = R(o);
        return l ? [{ element: o, path: l }] : [];
      }) : [];
    }
    function de(i, o) {
      for (const { element: l, path: p } of Z()) {
        if (l.dataset.dcSpace === "desktop") continue;
        const v = l.getBoundingClientRect();
        if (!(i < v.left || i > v.right || o < v.top || o > v.bottom))
          return { panel: "", space: p, edge: "center" };
      }
      return null;
    }
    function Fe(i) {
      return X().filter(
        (o) => o.element.closest(".dc-window__desktop") === i
      );
    }
    let Te = null;
    const Re = (i) => i.altKey;
    function De(i, o) {
      if (!be(i) || _.value || ee.value || o.button !== 0) return;
      const l = o.clientX, p = o.clientY;
      let v = !1, h = Re(o);
      const L = () => {
        const B = ue.value;
        B && (E.value = h ? K(B.x, B.y, i) : k(B.x, B.y, i));
      }, D = (B) => {
        if (!v) {
          if (Math.hypot(B.clientX - l, B.clientY - p) < 4) return;
          v = !0, _.value = i, G.value = null;
        }
        h = Re(B), O.value = !h, ue.value = { x: B.clientX, y: B.clientY }, L();
      }, b = (B) => {
        Re(B) !== h && (h = !h, O.value = !h, v && L());
      }, z = (B) => {
        Te?.();
        const T = E.value, le = d.value;
        if (B && v && T && le) {
          const Le = T.space ? In(le, i, T.space, T.rect) : T.edge === "float" && T.rect ? On(le, i, T.panel, T.rect) : yt(le, i, T.panel, T.edge, T.index);
          te(Le, {
            panel: i,
            target: T.panel,
            edge: T.edge,
            ...T.space === void 0 ? {} : { space: T.space },
            ...T.index === void 0 ? {} : { index: T.index },
            ...T.rect === void 0 ? {} : { rect: T.rect }
          });
        }
        _.value = null, E.value = null, ue.value = null, O.value = !0;
      }, F = () => z(!0), N = () => z(!1), Y = (B) => {
        if (B.key === "Escape") {
          z(!1);
          return;
        }
        b(B);
      };
      Te = () => {
        window.removeEventListener("pointermove", D), window.removeEventListener("pointerup", F), window.removeEventListener("pointercancel", N), window.removeEventListener("keydown", Y), window.removeEventListener("keyup", b), Te = null;
      }, window.addEventListener("pointermove", D), window.addEventListener("pointerup", F), window.addEventListener("pointercancel", N), window.addEventListener("keydown", Y), window.addEventListener("keyup", b);
    }
    Ft(() => Te?.());
    let ze = null;
    function Ae(i) {
      const o = J.value;
      return o ? [...o.querySelectorAll(
        `.dc-float[data-dc-path="${i.join("/")}"]`
      )].find((v) => v.closest(".dc-window") === o)?.parentElement ?? null : null;
    }
    function Pe(i) {
      const o = d.value;
      return o ? sn(o, i) : null;
    }
    function ct(i) {
      const o = d.value;
      if (!o) return;
      const l = mt(o, i);
      l !== o && (a.value = l);
    }
    function _t(i) {
      const o = Pe(i);
      o && ct(o);
    }
    function Bt(i) {
      const o = d.value, l = o ? re(o, i) : null;
      return l !== null && Oe(l);
    }
    function g(i) {
      const o = d.value, l = o ? re(o, i) : null;
      return l !== null && He(l);
    }
    function $(i) {
      const o = d.value, l = o ? Ve(o, i) : null;
      return l ? se(l.node) : "";
    }
    function A(i) {
      const o = d.value, l = o ? Ve(o, i) : null;
      if (!o || !l) return;
      const p = se(l.node);
      if (u.value.get(p)?.fixed === !0) return;
      const v = !He(l);
      let h = Qr(o, i, v);
      h !== o && (v || (h = mt(h, i)), a.value = h, s("frame-minimize", { panel: p, minimized: v }));
    }
    function ie(i) {
      const o = Pe(i);
      o && A(o);
    }
    function oe(i) {
      const o = d.value, l = o ? Ve(o, i) : null;
      if (!o || !l) return;
      const p = se(l.node);
      if (u.value.get(p)?.fixed === !0) return;
      const v = !Oe(l);
      let h = Zr(o, i, v);
      h !== o && (v && (h = mt(h, i)), a.value = h, s("frame-maximize", { panel: p, maximized: v }));
    }
    function ut(i) {
      const o = Pe(i);
      o && oe(o);
    }
    function xn(i, o, l) {
      const p = d.value, v = p ? Ve(p, i) : null;
      if (!p || !v || o.button !== 0 || _.value || ee.value) return;
      const h = se(v.node);
      if (u.value.get(h)?.fixed === !0 || Oe(v) || He(v) || l !== "move" && !r.resizable) return;
      const L = Ae(i), D = Jr(p, i);
      ct(i);
      const b = { w: L?.clientWidth ?? 0, h: L?.clientHeight ?? 0 }, z = { ...v.rect }, F = o.clientX, N = o.clientY, Y = r.minPanelSize;
      ee.value = h;
      const B = (ve) => {
        const Ee = d.value;
        if (!Ee) return;
        const ft = Ln(Ee, D, qt(ve, b, Y));
        ft !== Ee && (a.value = ft);
      }, T = (ve) => {
        ve.preventDefault();
        const Ee = ve.clientX - F, ft = ve.clientY - N;
        B(
          l === "move" ? { ...z, x: z.x + Ee, y: z.y + ft } : Dn(z, l, Ee, ft, Y)
        );
      }, le = (ve) => {
        if (ze?.(), ee.value = null, !ve) {
          B(z);
          return;
        }
        const Ee = d.value ? Ve(d.value, D) : null;
        Ee && s("frame-change", { panel: $(D), rect: Ee.rect });
      }, Le = () => le(!0), Be = () => le(!1), We = (ve) => {
        ve.key === "Escape" && le(!1);
      };
      ze = () => {
        window.removeEventListener("pointermove", T), window.removeEventListener("pointerup", Le), window.removeEventListener("pointercancel", Be), window.removeEventListener("keydown", We), ze = null;
      }, window.addEventListener("pointermove", T), window.addEventListener("pointerup", Le), window.addEventListener("pointercancel", Be), window.addEventListener("keydown", We);
    }
    function br(i, o, l) {
      const p = Pe(i);
      p && xn(p, o, l);
    }
    function _r(i, o, l = !1) {
      const p = d.value, v = Pe(i), h = p && v ? Ve(p, v) : null;
      if (!p || !v || !h || u.value.get(i)?.fixed === !0 || l && !r.resizable) return;
      if (Oe(h) || He(h)) {
        H.value = `${ye(i)} is ${Oe(h) ? "maximized" : "minimized"}, so it cannot be moved.`;
        return;
      }
      const L = o === "left" ? -Mt : o === "right" ? Mt : 0, D = o === "up" ? -Mt : o === "down" ? Mt : 0, b = Ae(v), z = { w: b?.clientWidth ?? 0, h: b?.clientHeight ?? 0 }, F = l ? Dn(h.rect, "se", L, D, r.minPanelSize) : { ...h.rect, x: h.rect.x + L, y: h.rect.y + D }, N = Ln(p, v, qt(F, z, r.minPanelSize));
      if (N === p) {
        H.value = l ? `${ye(i)} cannot be resized further.` : `${ye(i)} cannot move ${o}.`;
        return;
      }
      a.value = N;
      const Y = Ve(N, v);
      Y && (s("frame-change", { panel: i, rect: Y.rect }), H.value = l ? `${ye(i)} resized to ${Y.rect.w} by ${Y.rect.h}.` : `${ye(i)} moved to ${Y.rect.x}, ${Y.rect.y}.`);
    }
    Ft(() => ze?.());
    function xr(i, o) {
      const l = me(i), p = l?.element.getBoundingClientRect();
      if (!l || !p) return null;
      const v = o === "left" || o === "right", h = (b) => {
        if (!(v ? b.bottom > p.top + 1 && b.top < p.bottom - 1 : b.right > p.left + 1 && b.left < p.right - 1)) return null;
        const F = o === "left" ? p.left - b.right : o === "right" ? b.left - p.right : o === "up" ? p.top - b.bottom : b.top - p.bottom;
        return F < -1 ? null : F;
      }, L = [];
      for (const b of X()) {
        if (b === l || b.element === l.element) continue;
        const z = h(b.element.getBoundingClientRect());
        if (z === null) continue;
        const F = b.panels.find((N) => N !== i);
        F && L.push({ to: { panel: F }, distance: z });
      }
      for (const { element: b, path: z } of Z()) {
        const F = h(b.getBoundingClientRect());
        F !== null && L.push({ to: { space: z }, distance: F });
      }
      return L.reduce(
        (b, z) => b && b.distance <= z.distance ? b : z,
        null
      )?.to ?? null;
    }
    function yr(i) {
      const o = d.value ? re(d.value, i) !== null : !1;
      if (!o && !be(i)) return;
      G.value = G.value === i ? null : i;
      const l = ye(i);
      if (!G.value) {
        H.value = `${l}: move mode off.`;
        return;
      }
      H.value = o ? `${l}: move mode on. Arrow keys move the window, shift and an arrow resize it, Escape leaves move mode.` : `${l}: move mode on. Arrow keys move the panel, shift and an arrow make it a tab of the panel that way, Escape leaves move mode.`;
    }
    const ye = (i) => u.value.get(i)?.title ?? i, Mr = {
      left: "left",
      right: "right",
      up: "top",
      down: "bottom"
    };
    function $r(i, o, l = !1) {
      if (!be(i)) return;
      const p = d.value;
      if (!p) return;
      const v = ye(i), h = tt(p, i);
      if (!l && h && (o === "left" || o === "right") && h.panels.length > 1) {
        const N = h.panels.indexOf(i), Y = o === "left" ? N - 1 : N + 1;
        if (Y >= 0 && Y < h.panels.length) {
          te(vt(p, i, Y), { panel: i, target: i, edge: "center", index: Y }), H.value = `${v} moved ${o}, now tab ${Y + 1} of ${h.panels.length}.`, Wt(i);
          return;
        }
      }
      const D = xr(i, o);
      if (!D || D.panel !== void 0 && !be(D.panel)) {
        H.value = `${v} cannot move ${o}.`;
        return;
      }
      const b = Mr[o];
      if (D.space) {
        const N = D.space, Y = we(p, N), B = re(p, i)?.rect, T = { ...Ge, ...B ? { w: B.w, h: B.h } : {} };
        te(In(p, i, N, T), { panel: i, target: "", space: N, edge: b }), H.value = `${v} moved ${o}, into ${Y ? st(Y) : "the space"}.`, Wt(i);
        return;
      }
      const z = D.panel, F = h?.panels.length === 1 && tt(p, z)?.panels.length === 1;
      l ? (te(yt(p, i, z, "center"), {
        panel: i,
        target: z,
        edge: "center"
      }), H.value = `${v} joined ${ye(z)} as a tab.`) : F ? (te(zt(p, i, z), { panel: i, target: z, edge: b }), H.value = `${v} moved ${o}, trading places with ${ye(z)}.`) : (te(yt(p, i, z, b), { panel: i, target: z, edge: b }), H.value = `${v} moved ${o}, beside ${ye(z)}.`), Wt(i);
    }
    function Wt(i) {
      Un(() => {
        me(i)?.element.querySelector(".dc-pane__grip")?.focus();
      });
    }
    function zr(i, o) {
      const l = d.value;
      l && (a.value = At(l, i, o));
    }
    function Vt(i) {
      const o = d.value;
      if (!o) return;
      const l = rt(o, i);
      l !== o && (a.value = l, s("tab-select", { panel: i }));
    }
    function Ht(i) {
      return u.value.get(i)?.closable !== !1;
    }
    function yn(i) {
      Ht(i) && s("panel-close", i);
    }
    const Kt = fe(/* @__PURE__ */ new Map());
    let Ar = 0;
    function Pr(i, o) {
      const l = Ar += 1;
      return Kt.value.set(l, { panel: i, items: o }), () => {
        Kt.value.delete(l);
      };
    }
    function Er(i) {
      const o = [];
      for (const l of Kt.value.values())
        l.panel() === i && o.push(...l.items());
      return o;
    }
    function Mn(i) {
      const o = i.filter((l) => l.items.length > 0);
      return o.length < 2 ? o.flatMap((l) => l.items) : o.flatMap((l) => [
        { id: l.id, heading: !0, label: l.title },
        ...l.items
      ]);
    }
    const $n = (i) => i.title || "These tabs";
    function Sr(i, o) {
      const l = o.id, p = tt(i, l), v = (p?.panels.length ?? 0) > 1, h = p?.fixedView === !0, L = (F) => ({
        action: () => {
          F !== i && (a.value = F);
        }
      }), D = [], b = [], z = o.views ?? [];
      if (z.length > 1 && !h) {
        const F = Ie(l);
        D.push({
          id: "view",
          label: "View",
          items: z.map((N) => ({
            id: `view-${N.key}`,
            label: N.label,
            checked: N.key === F,
            action: () => $e(l, N.key)
          }))
        });
      }
      return v && !h && b.push(
        { id: "show-row", label: "Row", checked: !1, ...L(Nn(i, l, "row")) },
        {
          id: "show-column",
          label: "Column",
          checked: !1,
          ...L(Nn(i, l, "column"))
        },
        // Already true, and nothing to collapse: these panes are tabs. Ticked
        // and choosable all the same — collapsing a strip into a strip hands
        // back the tree it was given, so it is the no-op it looks like.
        {
          id: "show-tabs",
          label: "Tabs",
          checked: !0,
          ...L(ri(i, l))
        },
        {
          id: "show-desktop",
          label: "Desktop",
          checked: !1,
          ...L(ii(i, l))
        }
      ), v && p && (b.length && b.push({ separator: !0 }), b.push(...Gt(p, l))), { panel: D, tabs: b, tabsTitle: p ? $n(p) : "" };
    }
    function Gt(i, o) {
      const l = je(i), p = (v) => {
        const h = i.panels[(l + v + i.panels.length) % i.panels.length];
        return (h === void 0 ? "" : se(h)) || o;
      };
      return [
        { id: "next-tab", label: "Next tab", action: () => Vt(p(1)) },
        { id: "previous-tab", label: "Previous tab", action: () => Vt(p(-1)) },
        ...Cr(i)
      ];
    }
    function Cr(i) {
      const o = ke(i).filter(Ht);
      return o.length ? [
        { separator: !0 },
        { id: "close-all", label: "Close all", action: () => o.forEach(yn) }
      ] : [];
    }
    function xt(i) {
      return i.title ? i.title : M(i) ? i.panels.length > 1 ? "these tabs" : "the strip" : st(i);
    }
    function zn(i) {
      if (!i || S(i) || i.fixedView === !0 || !i.title && i.headless !== !0 || xe(i)) return null;
      const o = mr(i);
      return o && o.fixedView !== !0 ? o : null;
    }
    function An(i) {
      const o = d.value;
      if (!r.menu || !o) return [];
      const l = we(o, i);
      if (!l || M(l)) return [];
      if (l.fixedView) return [];
      const p = S(l) ? "desktop" : l.direction, v = (T, le, Le) => ({
        id: `show-${T}`,
        label: le,
        checked: p === T,
        action: () => {
          const Be = d.value, We = Le();
          !Be || We === l || (a.value = Rt(U(Me(Be, i, We))));
        }
      }), h = () => {
        const T = lr(l, Fr(l));
        if (M(T) && T.panels.length === 0) return l;
        const le = M(T) && T.panels.length === 1 ? T.panels[0] : void 0;
        return le !== void 0 && V(le) ? l : T;
      }, L = (T) => () => S(l) ? pr(l, T) : l.direction === T ? l : { ...l, direction: T }, D = i.slice(0, -1), b = i.length > 0 ? we(o, D) : null, z = b && M(b) && b.panels.length > 1 ? b : null, F = b && zn(b) === l ? b : null, N = zn(l), Y = l.title || "this space", B = (T, le, Le, Be, We) => ({
        id: T,
        label: We,
        action: () => {
          const ve = d.value;
          ve && (a.value = Rt(U(Me(ve, le, li(Le, Be)))));
        }
      });
      return Mn([
        {
          id: "about-space",
          /*
           * Its own name, or what it is rather than how it is shown: `spaceTitle`
           * would answer "Row" for an unnamed row, which is the item directly
           * under it and the one already ticked.
           */
          title: l.title || "This space",
          items: [
            v("row", "Row", L("row")),
            v("column", "Column", L("column")),
            // Everything in this space in one strip: the panes as tabs, and a
            // desktop among them as a tab of its own, keeping the windows on it.
            v("tabs", "Tabs", () => h()),
            v("desktop", "Desktop", () => S(l) ? l : dr(l))
          ]
        },
        {
          id: "about-around",
          title: N ? `Around ${xt(N)}` : "",
          items: N ? [
            // Keeping this space's bar drops the one inside, so it is offered
            // only where the space inside has no name to be dropped with it.
            ...N.title ? [] : [B("merge-around-keep-this", i, l, "outer", `Keep ${Y}`)],
            ...l.title ? [] : [B("merge-around-keep-that", i, l, "inner", `Keep ${xt(N)}`)]
          ] : []
        },
        {
          id: "about-inside",
          title: F ? `Inside ${xt(F)}` : "",
          items: F ? [
            ...l.title ? [] : [B("merge-inside-keep-that", D, F, "outer", `Keep ${xt(F)}`)],
            ...F.title ? [] : [B("merge-inside-keep-this", D, F, "inner", `Keep ${Y}`)]
          ] : []
        },
        {
          id: "about-tabs",
          title: z ? $n(z) : "",
          items: z ? Gt(z, se(l)) : []
        }
      ]);
    }
    function Fr(i) {
      const o = q.value;
      return o && I(i, o) ? o : void 0;
    }
    function Tr(i) {
      const o = d.value, l = u.value.get(i);
      if (!o || !l) return [];
      const p = r.menu ? Sr(o, l) : null, v = Er(i);
      v.length && p?.panel.length && v.push({ separator: !0 }), p && v.push(...p.panel);
      const h = Lr(l);
      h && (v.length && v.push({ separator: !0 }), v.push(h));
      const L = Mn([
        { id: "about-panel", title: l.title, items: v },
        { id: "about-tabs", title: p?.tabsTitle ?? "", items: p?.tabs ?? [] }
      ]);
      return r.paneMenu ? r.paneMenu(l, L) : L;
    }
    const Rr = w(() => {
      const i = d.value;
      return i ? M(i) ? Dr([]) : An([]) : [];
    });
    function Dr(i) {
      const o = d.value, l = o ? we(o, i) : null;
      if (!r.menu || !l || !M(l) || l.panels.length < 2) return [];
      const p = (h, L, D) => ({
        id: `show-${h}`,
        label: L,
        checked: h === "tabs",
        action: () => {
          const b = d.value;
          if (!b) return;
          const z = D(b);
          z !== b && (a.value = z);
        }
      }), v = l.fixedView ? [] : [
        p("row", "Row", (h) => Bn(h, i, "row")),
        p("column", "Column", (h) => Bn(h, i, "column")),
        // Already true: these are tabs, and a strip collapsed is that strip.
        p("tabs", "Tabs", (h) => h),
        p("desktop", "Desktop", (h) => si(h, i))
      ];
      return v.length && v.push({ separator: !0 }), v.push(...Gt(l, se(l))), v;
    }
    function Lr(i) {
      const o = r.popOut?.(i);
      return !o || r.solo && d.value && ke(d.value).length <= 1 ? null : {
        id: "pop-out",
        label: "Pop out to new window",
        action: () => {
          const l = J.value?.querySelector(`.dc-pane[data-dc-panel="${CSS.escape(i.id)}"]`);
          vi(o, mi(l)) && s("panel-pop-out", { panel: i.id, href: o });
        }
      };
    }
    function Or(i, o) {
      return c[`${i}-${o}`] ?? c[i];
    }
    function Pn(i, o, l, p) {
      return Or(i, o.id)?.({ panel: o, view: l, active: p });
    }
    fi({
      panelFor: (i) => u.value.get(i) ?? null,
      viewFor: Ie,
      setView: $e,
      resizable: w(() => r.resizable),
      minPanelSize: w(() => r.minPanelSize),
      spaceNames: w(() => r.spaceNames),
      rootBar: w(() => r.rootBar),
      focused: q,
      dragging: _,
      dropTarget: E,
      moving: G,
      framing: ee,
      canMove: be,
      focus(i) {
        q.value !== i && (q.value = i, s("panel-activate", i));
      },
      selectPanel: Vt,
      beginDrag: De,
      toggleMoveMode: yr,
      nudge: $r,
      setSizes: zr,
      frameOf: (i) => d.value ? re(d.value, i) : null,
      beginFrameDrag: br,
      nudgeFrame: _r,
      raise: _t,
      maximized: Bt,
      toggleMaximize: ut,
      minimized: g,
      toggleMinimize: ie,
      beginFrameDragAt: xn,
      raiseAt: ct,
      toggleMaximizeAt: oe,
      toggleMinimizeAt: A,
      menuFor: Tr,
      spaceMenu: An,
      registerMenu: Pr,
      closable: Ht,
      close: yn,
      renderContent: (i, o, l) => Pn("panel", i, o, l),
      renderActions: (i, o, l) => Pn("actions", i, o, l),
      layout: d
    });
    const Ir = w(() => {
      if (!(!r.accent && !r.tokens))
        return { ...r.tokens, ...r.accent ? { "--dc-accent": r.accent } : {} };
    }), Nr = () => {
      const i = _.value, o = ue.value;
      return !i || !o ? null : Hr(
        "div",
        {
          class: "dc-window__ghost",
          style: { left: `${o.x}px`, top: `${o.y}px` },
          "aria-hidden": "true"
        },
        u.value.get(i)?.title ?? i
      );
    };
    return t({
      /** The layout as rendered, reconciled against the current panels. */
      layout: d,
      /** Moves a panel programmatically — the same operation a drag performs. */
      move(i, o, l, p) {
        const v = d.value;
        v && te(yt(v, i, o, l, p), {
          panel: i,
          target: o,
          edge: l,
          ...p === void 0 ? {} : { index: p }
        });
      },
      /** Brings a panel's tab to the top of its group. */
      select(i) {
        const o = d.value;
        o && (a.value = rt(o, i));
      },
      /** Lifts a panel onto the float holding `near`, as a window of its own. */
      float(i, o, l) {
        const p = d.value;
        p && te(On(p, i, o, l), {
          panel: i,
          target: o,
          edge: "float",
          rect: l
        });
      },
      /** Puts a floating frame somewhere else, or makes it another size. */
      setRect(i, o) {
        const l = d.value;
        if (!l) return;
        const p = Yr(l, i, o);
        if (p === l) return;
        a.value = p;
        const v = re(p, i);
        v && s("frame-change", { panel: i, rect: v.rect });
      },
      /**
       * Puts a panel on one of its views, the way its menu would — the way a pane
       * whose space fixed its view, or took its bar away, is switched at all.
       */
      setView: $e,
      /**
       * The menu of the space at the root: how the whole window is shown. For a
       * host's menu bar, when `rootBar` takes away the bar it was on.
       */
      rootMenu: Rr,
      /** Brings a floating frame to the front of its stack. */
      raise: _t,
      /** Fills the float with a window, or puts it back where it was. */
      toggleMaximize: ut,
      /** Rolls a window up to its title bar, or unrolls it. */
      toggleMinimize: ie
    }), (i, o) => (x(), P("div", {
      ref_key: "root",
      ref: J,
      class: "dc-shell dc-window",
      "data-dc-theme": e.theme,
      "data-dc-dragging": _.value ? "true" : "false",
      "data-dc-docking": O.value ? "true" : "false",
      style: St(Ir.value)
    }, [
      d.value ? (x(), Ke(fs, {
        key: 0,
        node: d.value,
        path: []
      }, null, 8, ["node"])) : (x(), P("p", ps, " This window has no panels. ")),
      he(Nr),
      pe("p", ms, et(H.value), 1)
    ], 12, ds));
  }
}), Ls = /* @__PURE__ */ lt(vs, [["__scopeId", "data-v-a2d5a620"]]), hs = (e) => Math.round(e * 1e3) / 1e3;
function Yt(e, t) {
  return e.title && (t.t = e.title), e.headless && (t.h = !0), e.fixedView && (t.v = !0), t;
}
function gs(e) {
  return [Math.round(e.x), Math.round(e.y), Math.round(e.w), Math.round(e.h)];
}
function jt(e) {
  const t = { b: gs(e.rect) };
  return e.title && (t.t = e.title), e.maximized && (t.M = !0), e.minimized && (t.m = !0), t;
}
function ws(e) {
  if (e.kind !== "group" || e.panels.length !== 1) return null;
  const t = e.panels[0];
  return typeof t != "string" || e.title || e.headless || e.fixedView || e.places ? null : t;
}
function on(e) {
  const t = ws(e);
  return t !== null ? t : hr(e);
}
function hr(e) {
  if (e.kind === "group") {
    const n = { g: e.panels.map((r) => typeof r == "string" ? r : hr(r)) };
    return e.active !== void 0 && e.active !== e.panels[0] && (n.a = e.active), e.places && (n.p = e.places.map(jt)), Yt(e, n);
  }
  if (e.kind === "split") {
    const n = { [e.direction === "row" ? "r" : "c"]: e.children.map(on) };
    return e.sizes && (n.z = e.sizes.map(hs)), e.places && (n.p = e.places.map(jt)), Yt(e, n);
  }
  const t = {
    f: e.frames.map((n) => ({ n: on(n.node), ...jt(n) }))
  };
  return Yt(e, t);
}
class gr extends Error {
}
const ne = () => {
  throw new gr();
}, ln = (e) => typeof e == "object" && e !== null && !Array.isArray(e), Je = (e) => Array.isArray(e) ? e : ne(), bn = (e) => e === void 0 ? void 0 : typeof e == "string" ? e : ne(), wr = (e) => Je(e).map((t) => typeof t == "number" && Number.isFinite(t) ? t : ne());
function ks(e) {
  const [t, n, r, s] = wr(e);
  return s === void 0 && ne(), { x: t, y: n, w: r, h: s };
}
function Ut(e) {
  if (!ln(e)) return ne();
  const t = { rect: ks(e.b) }, n = bn(e.t);
  return n && (t.title = n), e.M === !0 && (t.maximized = !0), e.m === !0 && (t.minimized = !0), t;
}
function Zt(e, t) {
  const n = bn(e.t);
  return n && (t.title = n), e.h === !0 && (t.headless = !0), e.v === !0 && (t.fixedView = !0), t;
}
function Pt(e) {
  if (typeof e == "string") return { kind: "group", panels: [e] };
  if (!ln(e)) return ne();
  if (e.g !== void 0) {
    const n = Je(e.g).map((a) => typeof a == "string" ? a : Pt(a));
    n.length === 0 && ne();
    const r = { kind: "group", panels: n }, s = bn(e.a);
    return s !== void 0 && (r.active = s), e.p !== void 0 && (r.places = Je(e.p).map(Ut)), Zt(e, r);
  }
  const t = e.r !== void 0 ? "row" : e.c !== void 0 ? "column" : null;
  if (t) {
    const n = Je(t === "row" ? e.r : e.c).map(Pt), r = { kind: "split", direction: t, children: n };
    return e.z !== void 0 && (r.sizes = wr(e.z)), e.p !== void 0 && (r.places = Je(e.p).map(Ut)), Zt(e, r);
  }
  if (e.f !== void 0) {
    const r = { kind: "float", frames: Je(e.f).map((s) => !ln(s) || s.n === void 0 ? ne() : { node: Pt(s.n), ...Ut(s) }) };
    return Zt(e, r);
  }
  return ne();
}
const kr = /[ '!:(),*@$]/, bs = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][-+]?\d+)?$/;
function Hn(e) {
  return e !== "" && !kr.test(e) && !/^[-\d]/.test(e) ? e : `'${e.replace(/[!']/g, (n) => `!${n}`)}'`;
}
function cn(e) {
  return e === null ? "!n" : e === !0 ? "!t" : e === !1 ? "!f" : typeof e == "number" ? Number.isFinite(e) ? String(e) : "!n" : typeof e == "string" ? Hn(e) : Array.isArray(e) ? `!(${e.map(cn).join(",")})` : `(${Object.entries(e).map(([t, n]) => `${Hn(t)}:${cn(n)}`).join(",")})`;
}
function _s(e) {
  let t = 0;
  const n = () => e[t], r = (c) => e[t++] === c ? void 0 : ne(), s = () => {
    if (n() === "'") {
      t++;
      let u = "";
      for (; ; ) {
        const m = e[t++];
        if (m === void 0) return ne();
        if (m === "'") return u;
        if (m === "!") {
          const d = e[t++];
          d !== "!" && d !== "'" && ne(), u += d;
        } else u += m;
      }
    }
    const c = t;
    for (; t < e.length && !kr.test(e[t]); ) t++;
    return t === c && ne(), e.slice(c, t);
  }, a = () => {
    const c = n();
    if (c === "(") {
      t++;
      const m = {};
      if (n() === ")")
        return t++, m;
      for (; ; ) {
        const d = s();
        r(":"), m[d] = a();
        const y = e[t++];
        if (y === ")") return m;
        y !== "," && ne();
      }
    }
    if (c === "!") {
      t++;
      const m = e[t++];
      if (m === "t") return !0;
      if (m === "f") return !1;
      if (m === "n") return null;
      if (m !== "(") return ne();
      const d = [];
      if (n() === ")")
        return t++, d;
      for (; ; ) {
        d.push(a());
        const y = e[t++];
        if (y === ")") return d;
        y !== "," && ne();
      }
    }
    if (c === "'") return s();
    const u = s();
    return bs.test(u) ? Number(u) : u;
  }, f = a();
  return t !== e.length && ne(), f;
}
function Qt(e) {
  return cn(on(e));
}
function xs(e) {
  try {
    return Pt(_s(e));
  } catch (t) {
    if (t instanceof gr) return null;
    throw t;
  }
}
function Jt(e, t) {
  for (const n of e.replace(/^[?]/, "").split("&")) {
    const r = n.indexOf("="), s = r === -1 ? n : n.slice(0, r);
    if (_n(s) === t) return r === -1 ? "" : n.slice(r + 1);
  }
  return null;
}
function en(e, t, n) {
  const r = e.replace(/^[?]/, "").split("&").filter(Boolean), s = r.findIndex((f) => {
    const c = f.indexOf("=");
    return _n(c === -1 ? f : f.slice(0, c)) === t;
  }), a = n === null ? null : `${encodeURIComponent(t)}=${n}`;
  return s === -1 ? a && r.push(a) : a ? r[s] = a : r.splice(s, 1), r.length ? `?${r.join("&")}` : "";
}
function _n(e) {
  try {
    return decodeURIComponent(e.replace(/\+/g, " "));
  } catch {
    return e;
  }
}
const ys = [
  [/%2C/g, ","],
  [/%3A/g, ":"],
  [/%2F/g, "/"],
  [/%40/g, "@"],
  [/%24/g, "$"],
  [/%20/g, "+"]
], Kn = (e) => {
  let t = encodeURIComponent(e);
  for (const [n, r] of ys) t = t.replace(n, r);
  return t;
};
function Os(e, t) {
  const { adapter: n } = t, r = t.param ?? "w", s = t.soloParam ?? "solo", a = t.delay ?? 200, f = () => Xn(t.home) ?? null;
  let c = Jt(n.search.value, r), u = null;
  const m = () => {
    u !== null && clearTimeout(u), u = null;
  }, d = (E) => E === null ? f() : xs(_n(E)) ?? f(), y = () => {
    m();
    const E = e.value, O = f(), G = E ? Qt(E) : null, ee = G === null || O && G === Qt(O) ? null : Kn(G);
    c = ee;
    const ue = en(n.search.value, r, ee);
    ue !== n.search.value && n.replace(ue);
  }, q = d(c);
  return q && (e.value = q), Ct(e, () => {
    m(), u = setTimeout(y, a);
  }), Ct(n.search, (E) => {
    const O = Jt(E, r);
    if (O === c) return;
    m(), c = O;
    const G = d(O);
    G && (e.value = G);
  }), Yn() && jn(() => u !== null ? y() : void 0), {
    flush: () => u !== null ? y() : void 0,
    popOutHref: (E) => {
      let O = en(n.search.value, r, Kn(Qt(Gr(_e(E)))));
      return O = en(O, s, "1"), n.href ? n.href(O) : `${n.path.value}${O}`;
    },
    solo: w(() => Jt(n.search.value, s) !== null)
  };
}
export {
  Tt as CASCADE_STEP,
  Ge as DEFAULT_FRAME,
  Qe as MINIMIZED_GAP,
  Qn as MINIMIZED_HEIGHT,
  tn as MINIMIZED_WIDTH,
  Zn as MIN_FRAME,
  kn as PANE_CONTEXT_KEY,
  wn as WINDOW_CONTEXT_KEY,
  Ls as WindowFrame,
  rs as WindowPane,
  er as activePanel,
  je as activeTab,
  qr as axisOf,
  Ot as cascade,
  qt as clampRect,
  lr as collapseSpace,
  ri as collapseToTabs,
  As as column,
  xs as decodeLayout,
  Vn as defaultLayout,
  In as dropIntoSpace,
  Qt as encodeLayout,
  Ps as fixedView,
  fn as float,
  On as floatPanel,
  dr as floatSplit,
  ii as floatTabs,
  si as floatTabsAt,
  Lt as frame,
  Ve as frameAt,
  re as frameOf,
  sn as framePathOf,
  se as frontPanel,
  zs as group,
  tt as groupOf,
  Xr as groups,
  I as hasPanel,
  Gr as headless,
  pt as insertPanel,
  S as isFloat,
  M as isGroup,
  Oe as isMaximized,
  He as isMinimized,
  V as isPanelTab,
  ot as isSplit,
  ge as isTabOf,
  jr as maximizeFrame,
  Zr as maximizeFrameAt,
  li as mergeSpace,
  Ur as minimizeFrame,
  Qr as minimizeFrameAt,
  yt as movePanel,
  vt as moveTab,
  we as nodeAt,
  ht as nodeTitle,
  U as normalizeLayout,
  hn as normalizeSizes,
  mr as onlySpace,
  vi as openPopOut,
  ke as panelIds,
  _e as panelNode,
  Rn as panelTabs,
  mi as popOutRect,
  vr as providePaneContext,
  fi as provideWindowContext,
  Xt as raiseFrame,
  mt as raiseFrameAt,
  Jr as raisedPath,
  ui as reconcileLayout,
  qe as removePanel,
  Me as replaceAt,
  Dn as resizeRect,
  Wn as resizeSplit,
  Rt as rootSpace,
  pn as row,
  rt as setActivePanel,
  Yr as setFrameRect,
  Ln as setFrameRectAt,
  At as setSizesAt,
  Cs as setSplitDirection,
  Ce as sizesOf,
  Q as spaceChrome,
  st as spaceTitle,
  dn as split,
  Nn as spreadTabs,
  Bn as spreadTabsAt,
  zt as swapPanels,
  Dt as tabNode,
  wt as tabPanels,
  pr as tileFloat,
  Fs as toFloat,
  Ts as toTiled,
  Es as toggleMaximized,
  Ss as toggleMinimized,
  Os as useLayoutRoute,
  Rs as usePaneContext,
  Ds as usePaneMenu,
  Nt as useWindowContext
};
