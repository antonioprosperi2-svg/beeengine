/**
 * BeeJoystick — HUD analogico su canvas (base + pomello) e pulsante salto.
 * Touch e mouse via Pointer Events. Asse normalizzato -1..1.
 */
export class BeeJoystick {
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {object} [input]
     * @param {object} [options]
     */
    constructor(canvas, input, options = {}) {
        this.canvas = canvas;
        this.input = input || null;

        this.margin = options.margin ?? 36;
        this.radius = options.radius ?? 52;
        this.knobRadius = options.knobRadius ?? 20;
        this.deadZone = options.deadZone ?? 0.16;
        this.jumpEnabled = options.jump !== false;
        this.jumpRadius = options.jumpRadius ?? 38;
        this.jumpLabel = options.jumpLabel ?? 'SALTA';
        this.jumpKey = options.jumpKey ?? 'Space';

        this.baseX = 0;
        this.baseY = 0;
        this.stickX = 0;
        this.stickY = 0;
        this.jumpX = 0;
        this.jumpY = 0;

        this.axisX = 0;
        this.axisY = 0;
        this.active = false;
        this.pointerId = null;

        this.jumpPressed = false;
        this.jumpPointerId = null;

        this.updateLayout();
        this.bindEvents();
    }

    get x() {
        return this.axisX;
    }

    get y() {
        return this.axisY;
    }

    getDir() {
        return { x: this.axisX, y: this.axisY };
    }

    get vector() {
        return { x: this.axisX, y: this.axisY };
    }

    bindEvents() {
        this.onPointerDown = (e) => this.handlePointerDown(e);
        this.onPointerMove = (e) => this.handlePointerMove(e);
        this.onPointerUp = (e) => this.handlePointerUp(e);
        this.onResize = () => this.updateLayout();

        this.canvas.addEventListener('pointerdown', this.onPointerDown);
        this.canvas.addEventListener('pointermove', this.onPointerMove);
        this.canvas.addEventListener('pointerup', this.onPointerUp);
        this.canvas.addEventListener('pointercancel', this.onPointerUp);
        window.addEventListener('pointerup', this.onPointerUp);
        window.addEventListener('pointercancel', this.onPointerUp);
        window.addEventListener('resize', this.onResize);
    }

    updateLayout() {
        const w = this.canvas.width || 800;
        const h = this.canvas.height || 600;

        this.baseX = this.margin + this.radius;
        this.baseY = h - this.margin - this.radius;
        this.jumpX = w - this.margin - this.jumpRadius;
        this.jumpY = h - this.margin - this.jumpRadius;

        if (!this.active) {
            this.stickX = this.baseX;
            this.stickY = this.baseY;
        }
    }

    getCanvasCoords(event) {
        const rect = this.canvas.getBoundingClientRect();
        const rectWidth = rect.width || 1;
        const rectHeight = rect.height || 1;
        const canvasWidth = this.canvas.width || rectWidth;
        const canvasHeight = this.canvas.height || rectHeight;

        return {
            x: (event.clientX - rect.left) * (canvasWidth / rectWidth),
            y: (event.clientY - rect.top) * (canvasHeight / rectHeight)
        };
    }

    isInsideCircle(px, py, cx, cy, radius) {
        const dx = px - cx;
        const dy = py - cy;
        return dx * dx + dy * dy <= radius * radius;
    }

    handlePointerDown(e) {
        const { x, y } = this.getCanvasCoords(e);

        if (this.jumpEnabled && this.jumpPointerId == null
            && this.isInsideCircle(x, y, this.jumpX, this.jumpY, this.jumpRadius + 8)) {
            if (e.cancelable) e.preventDefault();
            this.jumpPointerId = e.pointerId;
            this.setJump(true);
            this.#capture(e);
            return;
        }

        if (this.active) return;

        if (this.isInsideCircle(x, y, this.baseX, this.baseY, this.radius + 24)) {
            if (e.cancelable) e.preventDefault();
            this.active = true;
            this.pointerId = e.pointerId;
            this.updateStickPosition(x, y);
            this.#capture(e);
        }
    }

    handlePointerMove(e) {
        if (this.active && e.pointerId === this.pointerId) {
            if (e.cancelable) e.preventDefault();
            const { x, y } = this.getCanvasCoords(e);
            this.updateStickPosition(x, y);
        }
    }

    handlePointerUp(e) {
        if (this.jumpEnabled && e.pointerId === this.jumpPointerId) {
            this.jumpPointerId = null;
            this.setJump(false);
            this.#release(e);
        }

        if (this.active && e.pointerId === this.pointerId) {
            this.resetStick();
            this.#release(e);
        }
    }

    #capture(e) {
        if (this.canvas.setPointerCapture) {
            try { this.canvas.setPointerCapture(e.pointerId); } catch (_err) { /* ignore */ }
        }
    }

    #release(e) {
        if (this.canvas.releasePointerCapture) {
            try { this.canvas.releasePointerCapture(e.pointerId); } catch (_err) { /* ignore */ }
        }
    }

    updateStickPosition(x, y) {
        const dx = x - this.baseX;
        const dy = y - this.baseY;
        const distance = Math.hypot(dx, dy);

        let clampedX = dx;
        let clampedY = dy;

        if (distance > this.radius && distance > 0) {
            const scale = this.radius / distance;
            clampedX = dx * scale;
            clampedY = dy * scale;
        }

        this.stickX = this.baseX + clampedX;
        this.stickY = this.baseY + clampedY;
        this.updateAxis(clampedX, clampedY);
    }

    updateAxis(dx, dy) {
        let nx = this.radius > 0 ? dx / this.radius : 0;
        let ny = this.radius > 0 ? dy / this.radius : 0;
        const mag = Math.hypot(nx, ny);

        if (mag < this.deadZone) {
            nx = 0;
            ny = 0;
        } else if (mag > 1) {
            nx /= mag;
            ny /= mag;
        }

        this.axisX = nx;
        this.axisY = ny;
        this.syncKeys();
    }

    syncKeys() {
        if (!this.input || typeof this.input.setKey !== 'function') return;

        this.input.setKey('ArrowLeft', this.axisX < -this.deadZone);
        this.input.setKey('ArrowRight', this.axisX > this.deadZone);
        this.input.setKey('ArrowUp', this.axisY < -this.deadZone);
        this.input.setKey('ArrowDown', this.axisY > this.deadZone);
        this.input.setKey('KeyA', this.axisX < -this.deadZone);
        this.input.setKey('KeyD', this.axisX > this.deadZone);
        this.input.setKey('KeyW', this.axisY < -this.deadZone);
        this.input.setKey('KeyS', this.axisY > this.deadZone);
    }

    setJump(pressed) {
        const was = this.jumpPressed;
        this.jumpPressed = pressed === true;
        if (!this.input || typeof this.input.setKey !== 'function') return;
        if (this.jumpPressed && !was) {
            this.input.setKey(this.jumpKey, true);
        } else if (!this.jumpPressed && was) {
            this.input.setKey(this.jumpKey, false);
        }
    }

    resetStick() {
        this.active = false;
        this.pointerId = null;
        this.stickX = this.baseX;
        this.stickY = this.baseY;
        this.axisX = 0;
        this.axisY = 0;
        this.syncKeys();
    }

    draw(ctx) {
        this.updateLayout();
        ctx.save();

        ctx.globalAlpha = this.active ? 0.38 : 0.22;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.baseX, this.baseY, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = this.active ? 0.85 : 0.5;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.baseX, this.baseY, this.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = this.active ? 0.95 : 0.6;
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.arc(this.stickX, this.stickY, this.knobRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.stickX, this.stickY, this.knobRadius, 0, Math.PI * 2);
        ctx.stroke();

        if (this.jumpEnabled) {
            ctx.globalAlpha = this.jumpPressed ? 0.85 : 0.35;
            ctx.fillStyle = this.jumpPressed ? '#ffffff' : '#111111';
            ctx.beginPath();
            ctx.arc(this.jumpX, this.jumpY, this.jumpRadius, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = 0.9;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.jumpX, this.jumpY, this.jumpRadius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = this.jumpPressed ? '#111111' : '#ffffff';
            ctx.font = `bold ${Math.round(this.jumpRadius * 0.42)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.jumpLabel, this.jumpX, this.jumpY);
        }

        ctx.restore();
    }

    destroy() {
        this.canvas.removeEventListener('pointerdown', this.onPointerDown);
        this.canvas.removeEventListener('pointermove', this.onPointerMove);
        this.canvas.removeEventListener('pointerup', this.onPointerUp);
        this.canvas.removeEventListener('pointercancel', this.onPointerUp);
        window.removeEventListener('pointerup', this.onPointerUp);
        window.removeEventListener('pointercancel', this.onPointerUp);
        window.removeEventListener('resize', this.onResize);

        this.resetStick();
        this.setJump(false);
    }
}
