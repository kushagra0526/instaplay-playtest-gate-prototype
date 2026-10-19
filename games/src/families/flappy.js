var G = {
  reset: function () {
    this.y = 300; this.vy = 0; this.pipes = []; this.sp = 0.6;
    /*IF:instant*/this.pipes.push({ x: 70, gap: -1000, passed: false });/*FI*/
  },
  update: function (dt, c) {
    var gain = 0, dead = false, i, p;
    if (c.action) this.vy = -@@FLAP@@;
    this.vy += @@GRAV@@ * dt; this.y += this.vy * dt;
    this.sp -= dt;
    if (this.sp <= 0) { this.sp = 1.4; this.pipes.push({ x: W + 30, gap: 150 + rand() * 300, passed: false }); }
    for (i = 0; i < this.pipes.length; i++) { p = this.pipes[i]; p.x -= @@PIPEV@@ * dt; if (!p.passed && p.x + 60 < 78) { p.passed = true; gain++; } }
    this.pipes = this.pipes.filter(function (q) { return q.x > -70; });
    /*IFNOT:never*/
    if (this.y > H - 20 || this.y < 0) dead = true;
    for (i = 0; i < this.pipes.length; i++) { p = this.pipes[i]; if (p.x < 102 && p.x + 60 > 78 && (this.y - 12 < p.gap - 85 || this.y + 12 > p.gap + 85)) dead = true; }
    /*FI*/
    /*IF:never*/if (this.y > H - 20) { this.y = H - 20; this.vy = 0; } if (this.y < 0) { this.y = 0; this.vy = 0; }/*FI*/
    return { gain: gain, dead: dead };
  },
  draw: function (c) {
    c.fillStyle = '@@HZ@@';
    for (var i = 0; i < this.pipes.length; i++) { var p = this.pipes[i]; c.fillRect(p.x, 0, 60, p.gap - 85); c.fillRect(p.x, p.gap + 85, 60, H); }
    c.fillStyle = '@@FG@@'; c.beginPath(); c.arc(90, this.y, 12, 0, 6.3); c.fill();
  }
};
