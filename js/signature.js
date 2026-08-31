/**
 * QuoteCraft Pro - Digital Signature Pad & Uploader Engine
 */

class SignaturePad {
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext("2d");
    this.isDrawing = false;
    this.points = [];
    this.strokeColor = options.strokeColor || "#1e293b";
    this.lineWidth = options.lineWidth || 2.5;

    this.resizeCanvas();
    this.initEvents();
  }

  resizeCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
    this.ctx.strokeStyle = this.strokeColor;
    this.ctx.lineWidth = this.lineWidth;
  }

  initEvents() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    };

    const startDraw = (e) => {
      e.preventDefault();
      this.isDrawing = true;
      const pos = getPos(e);
      this.points = [pos];
      this.ctx.beginPath();
      this.ctx.moveTo(pos.x, pos.y);
    };

    const draw = (e) => {
      if (!this.isDrawing) return;
      e.preventDefault();
      const pos = getPos(e);
      this.points.push(pos);

      if (this.points.length > 2) {
        const p1 = this.points[this.points.length - 2];
        const p2 = this.points[this.points.length - 1];
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;

        this.ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
        this.ctx.stroke();
      }
    };

    const stopDraw = () => {
      this.isDrawing = false;
      this.points = [];
    };

    // Mouse Listeners
    this.canvas.addEventListener("mousedown", startDraw);
    window.addEventListener("mousemove", draw);
    window.addEventListener("mouseup", stopDraw);

    // Touch Listeners
    this.canvas.addEventListener("touchstart", startDraw, { passive: false });
    this.canvas.addEventListener("touchmove", draw, { passive: false });
    this.canvas.addEventListener("touchend", stopDraw);
  }

  clear() {
    const dpr = window.devicePixelRatio || 1;
    this.ctx.clearRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);
  }

  isEmpty() {
    const dpr = window.devicePixelRatio || 1;
    const pixelBuffer = new Uint32Array(
      this.ctx.getImageData(0, 0, this.canvas.width / dpr, this.canvas.height / dpr).data.buffer
    );
    return !pixelBuffer.some(color => color !== 0);
  }

  toDataURL() {
    if (this.isEmpty()) return "";
    return this.canvas.toDataURL("image/png");
  }
}
