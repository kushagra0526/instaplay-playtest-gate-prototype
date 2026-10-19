var G = {
  reset: function () {
    this.px = W / 2; this.b = []; this.e = []; this.cd = 0; this.sp = 0.5; this.t = 0;
    /*IF:instant*/this.e.push({ x: this.px, y: 580, v: 0, dead: false });/*FI*/
  },
  update: function (dt, c) {
    var gain = 0, dead = false, self = this;
    this.t += dt;
    this.px += ((c.right ? 1 : 0) - (c.left ? 1 : 0)) * @@PSPEED@@ * dt;
    this.px = Math.max(16, Math.min(W - 16, this.px));
    this.cd -= dt;
    if ((c.action || c.up) && this.cd <= 0) { this.cd = 0.25; this.b.push({ x: this.px, y: 560, dead: false }); }
    this.sp -= dt;
    if (this.sp <= 0) { this.sp = Math.max(0.35, 0.9 - this.t * 0.01); this.e.push({ x: 20 + rand() * (W - 40), y: -20, v: @@EV@@ + rand() * 40 + this.t * 2, dead: false }); }
    this.b.forEach(function (b) { b.y -= 520 * dt; });
    this.e.forEach(function (e) { e.y += e.v * dt; });
    this.b.forEach(function (b) { self.e.forEach(function (e) { if (!e.dead && !b.dead && Math.abs(b.x - e.x) < 16 && Math.abs(b.y - e.y) < 16) { e.dead = b.dead = true; gain++; } }); });
    this.b = this.b.filter(function (b) { return !b.dead && b.y > -10; });
    /*IFNOT:never*/if (this.e.some(function (e) { return !e.dead && (e.y > H - 20 || (Math.abs(e.x - self.px) < 20 && Math.abs(e.y - 580) < 20)); })) dead = true;/*FI*/
    this.e = this.e.filter(function (e) { return !e.dead && e.y < H + 20; });
    return { gain: gain, dead: dead };
  },
  draw: function (c) {
    c.fillStyle = '@@HZ@@'; this.e.forEach(function (e) { c.fillRect(e.x - 12, e.y - 12, 24, 24); });
    c.fillStyle = '#ff0'; this.b.forEach(function (b) { c.fillRect(b.x - 2, b.y - 8, 4, 12); });
    c.fillStyle = '@@FG@@'; c.fillRect(this.px - 14, 570, 28, 22);
  }
};
