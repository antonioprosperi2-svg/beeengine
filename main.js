/**
 * Demo Survival / Top-Down Arena — sprint, fisica AABB, salto Z visivo.
 * BeePlayer resta intatto: sprint/salto sono wrapper nella demo.
 */
import {
    BeeEngine,
    BeePlayer,
    BeeCamera,
    BeeTilemap,
    BeeEntity,
    BeeRigidBody,
    BEE_BODY_TYPE,
    BEE_LAYER
} from './BeeEngine.js';

const VIEW_W = 800;
const VIEW_H = 600;
const TILE = 256;
const MAP_COLS = 8;
const MAP_ROWS = 6;
const MAP_W = MAP_COLS * TILE;
const MAP_H = MAP_ROWS * TILE;
const PLAYER_SIZE = 112;
const WALK_SPEED = 220;
const SPRINT_MUL = 1.5;
const JUMP_TIME = 0.45;
const JUMP_HEIGHT = 56;

/** true = mostra joystick e salto anche su desktop (test col mouse). */
const FORCE_TOUCH_UI = true;

const engine = new BeeEngine('gameCanvas', VIEW_W, VIEW_H);
engine.enableAutoResize(VIEW_W, VIEW_H);
engine.enableLadybug();

function isTouchDevice() {
    if (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) return true;
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || window.matchMedia('(pointer: coarse)').matches;
}

if (FORCE_TOUCH_UI || isTouchDevice()) {
    engine.enableJoystick({ jump: true });
}

function buildManifest() {
    const items = [];

    for (let i = 0; i < 4; i++) {
        items.push({ type: 'image', name: `player_south_${i}`, src: `assets/images/south/${i}.png` });
        items.push({ type: 'image', name: `player_west_${i}`, src: `assets/west/${i}.png` });
        items.push({ type: 'image', name: `player_east_${i}`, src: `assets/west/east/${i}.png` });
        items.push({ type: 'image', name: `player_north_${i}`, src: `assets/west/north/${i}.png` });
    }

    items.push(
        { type: 'image', name: 'grass', src: 'assets/A3_grass_flowers/sheet.png' },
        { type: 'image', name: 'dirt', src: 'assets/A1_grass_dirt/sheet.png' },
        { type: 'image', name: 'water', src: 'assets/A2_grass_water/sheet.png' },
        { type: 'image', name: 'tree', src: 'assets/images/A5_tree_round.png' },
        { type: 'image', name: 'cottage', src: 'assets/A17_cottage_thatched.png' },
        { type: 'image', name: 'well', src: 'assets/A15_stone_well.png' },
        { type: 'image', name: 'boulder', src: 'assets/A10_mossy_boulder.png' }
    );

    for (let i = 0; i < 6; i++) {
        items.push({ type: 'image', name: `fire_${i}`, src: `assets/frame_${i}.png` });
    }

    items.push({
        type: 'audio',
        name: 'bgm',
        src: encodeURI('assets/audio/dany_photo-water-423114.mp3')
    });

    return items;
}

function stitchPlayerSheet() {
    const dirs = ['south', 'east', 'north', 'west'];
    const frameW = 244;
    const frameH = 244;
    const cols = 4;
    const canvas = document.createElement('canvas');
    canvas.width = cols * frameW;
    canvas.height = dirs.length * frameH;
    const ctx = canvas.getContext('2d');

    dirs.forEach((dir, row) => {
        for (let i = 0; i < cols; i++) {
            const img = engine.getAsset(`player_${dir}_${i}`);
            if (img) ctx.drawImage(img, i * frameW, row * frameH, frameW, frameH);
        }
    });

    return canvas;
}

function makeDecor(x, y, width, height, drawFn) {
    const entity = new BeeEntity(x, y, width, height);
    entity.draw = (ctx) => drawFn(ctx, entity);
    return entity;
}

function addSolid(x, y, width, height, drawFn, options = {}) {
    const entity = makeDecor(x, y, width, height, drawFn);
    entity.tipo = options.tipo || 'alto';
    const pivotX = width / 2;
    const pivotY = options.pivotY ?? height * 0.82;
    entity.transform.setPivot(pivotX, pivotY);
    entity.x += pivotX;
    entity.y += pivotY;

    const body = engine.physics.createBody({
        entity,
        type: BEE_BODY_TYPE.STATIC,
        shape: BeeRigidBody.box(options.boxW || width * 0.42, options.boxH || height * 0.22),
        layer: BEE_LAYER.WORLD,
        mask: BEE_LAYER.ALL,
        restitution: 0,
        friction: 0.95
    });
    body.tipo = entity.tipo;
    entity.body = body;
    engine.addEntity(entity);
    return entity;
}

function isSprintPressed(input) {
    return input.isPressed('ShiftLeft') || input.isPressed('ShiftRight') || input.isPressed('Shift');
}

function attachTopDownControls(player) {
    player.visualZ = 0;
    player.airborne = false;
    player.jumpStart = 0;
    player.sprinting = false;

    const baseUpdate = player.update.bind(player);
    player.update = function updateTopDown(dt, input, game) {
        this.sprinting = !!(input && isSprintPressed(input));
        this.speed = WALK_SPEED * (this.sprinting ? SPRINT_MUL : 1);

        if (input && input.wasPressed('Space') && !this.airborne) {
            this.airborne = true;
            this.jumpStart = game.time.elapsed;
        }

        if (this.airborne) {
            const t = (game.time.elapsed - this.jumpStart) / JUMP_TIME;
            if (t >= 1) {
                this.airborne = false;
                this.visualZ = 0;
            } else {
                this.visualZ = 4 * JUMP_HEIGHT * t * (1 - t);
            }
        }

        const bodies = game.physics ? game.physics.bodies : [];
        for (let i = 0; i < bodies.length; i++) {
            if (bodies[i].tipo === 'basso') {
                bodies[i].isTrigger = this.airborne === true;
            }
        }

        baseUpdate(dt, input, game);

        const pad = game.touchControls;
        if (pad && (pad.axisX || pad.axisY)) {
            this.vx = pad.axisX * this.speed;
            this.vy = pad.axisY * this.speed;
        }
    };

    const baseDraw = player.draw.bind(player);
    player.draw = function drawTopDown(ctx, game) {
        const z = this.visualZ || 0;
        if (!this.sprite || z <= 0) {
            return baseDraw(ctx, game);
        }

        const gx = this.worldX + this.width * 0.5;
        const gy = this.worldY + this.height * 0.78;
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
        ctx.beginPath();
        ctx.ellipse(gx, gy, this.width * 0.16, this.height * 0.06, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (this.vx < 0) this.sprite.flipX = true;
        if (this.vx > 0) this.sprite.flipX = false;
        this.sprite.draw(ctx, this.worldX, this.worldY - z, {
            width: this.width,
            height: this.height
        });
    };
}

function showStatus(message, color = '#f0f0f0') {
    const ctx = engine.ctx;
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = color;
    ctx.font = '16px sans-serif';
    ctx.fillText(message, 24, 40);
}

async function boot() {
    showStatus('Caricamento asset...');
    await engine.loadManifest(buildManifest());

    const grass = engine.getAsset('grass');
    const tiles = Array.from({ length: MAP_ROWS }, () => Array(MAP_COLS).fill(1));
    const ground = new BeeTilemap({
        x: 0,
        y: 0,
        tiles,
        tileSize: TILE,
        tileset: grass,
        tilesetColumns: 1
    });
    ground.width = MAP_W;
    ground.height = MAP_H;

    const sheet = engine.createSpriteSheet(stitchPlayerSheet(), 244, 244, {
        framesPerRow: 4,
        frameCount: 16
    });
    const sprite = engine.createAnimatedSprite(sheet, {
        animation: 'south',
        animations: {
            south: { frames: [0, 1, 2, 3], fps: 8, loop: true },
            east: { frames: [4, 5, 6, 7], fps: 8, loop: true },
            north: { frames: [8, 9, 10, 11], fps: 8, loop: true },
            west: { frames: [12, 13, 14, 15], fps: 8, loop: true }
        }
    });

    const spawnX = MAP_W / 2 - PLAYER_SIZE / 2;
    const spawnY = MAP_H / 2 - PLAYER_SIZE / 2;
    const player = new BeePlayer(spawnX, spawnY, PLAYER_SIZE, PLAYER_SIZE);
    player.mode = 'free';
    player.gravity = 0;
    player.speed = WALK_SPEED;
    player.sprite = sprite;
    const pivotX = PLAYER_SIZE / 2;
    const pivotY = PLAYER_SIZE * 0.78;
    player.transform.setPivot(pivotX, pivotY);
    player.x = spawnX + pivotX;
    player.y = spawnY + pivotY;

    const playerBody = engine.physics.createBody({
        entity: player,
        type: BEE_BODY_TYPE.DYNAMIC,
        shape: BeeRigidBody.box(28, 20),
        layer: BEE_LAYER.PLAYER,
        mask: BEE_LAYER.ALL,
        gravityScale: 0,
        fixedRotation: true,
        linearDamping: 0,
        restitution: 0,
        friction: 0,
        mass: 1
    });
    player.body = playerBody;
    attachTopDownControls(player);

    engine.camera = new BeeCamera(VIEW_W, VIEW_H);
    engine.camera.setBounds(0, 0, MAP_W, MAP_H);
    engine.camera.follow(player, 1);

    const dirt = engine.getAsset('dirt');
    const water = engine.getAsset('water');

    engine.addEntity(ground);
    engine.addEntity(makeDecor(320, 280, 256, 256, (ctx, p) => {
        if (dirt) ctx.drawImage(dirt, p.worldX, p.worldY, p.width, p.height);
    }));
    engine.addEntity(makeDecor(1500, 200, 256, 256, (ctx, p) => {
        if (water) ctx.drawImage(water, p.worldX, p.worldY, p.width, p.height);
    }));

    addSolid(380, 300, 192, 192, (ctx, p) => {
        const img = engine.getAsset('cottage');
        if (img) ctx.drawImage(img, p.worldX, p.worldY, p.width, p.height);
    }, { tipo: 'alto', boxW: 132, boxH: 70, pivotY: 168 });

    addSolid(980, 420, 160, 192, (ctx, p) => {
        const img = engine.getAsset('tree');
        if (img) ctx.drawImage(img, p.worldX, p.worldY, p.width, p.height);
    }, { tipo: 'alto', boxW: 42, boxH: 28, pivotY: 170 });

    addSolid(1480, 880, 160, 192, (ctx, p) => {
        const img = engine.getAsset('tree');
        if (img) ctx.drawImage(img, p.worldX, p.worldY, p.width, p.height);
    }, { tipo: 'alto', boxW: 42, boxH: 28, pivotY: 170 });

    addSolid(1240, 640, 160, 192, (ctx, p) => {
        const img = engine.getAsset('well');
        if (img) ctx.drawImage(img, p.worldX, p.worldY, p.width, p.height);
    }, { tipo: 'alto', boxW: 78, boxH: 48, pivotY: 150 });

    addSolid(MAP_W / 2 + 70, MAP_H / 2 + 50, 128, 112, (ctx, p) => {
        const img = engine.getAsset('boulder');
        if (img) ctx.drawImage(img, p.worldX, p.worldY, p.width, p.height);
    }, { tipo: 'basso', boxW: 78, boxH: 46, pivotY: 88 });

    addSolid(860, 820, 128, 112, (ctx, p) => {
        const img = engine.getAsset('boulder');
        if (img) ctx.drawImage(img, p.worldX, p.worldY, p.width, p.height);
    }, { tipo: 'basso', boxW: 78, boxH: 46, pivotY: 88 });

    let fireFrame = 0;
    let fireTimer = 0;
    const fire = makeDecor(MAP_W / 2 + 8, MAP_H / 2 + 70, 72, 72, (ctx, p) => {
        const img = engine.getAsset(`fire_${fireFrame}`);
        if (img) ctx.drawImage(img, p.worldX, p.worldY, p.width, p.height);
    });

    engine.addEntity(fire);
    engine.addEntity(player);

    engine.playMusic(engine.getAsset('bgm'), 0.4);

    engine.start(
        (dt, input, time) => {
            engine.camera.follow(player, 0.14);

            const left = player.worldX;
            const top = player.worldY;
            player.x += Math.max(0, -left) + Math.min(0, MAP_W - player.width - left);
            player.y += Math.max(0, -top) + Math.min(0, MAP_H - player.height - top);

            const moving = player.vx !== 0 || player.vy !== 0;
            if (moving) {
                const ax = Math.abs(player.vx);
                const ay = Math.abs(player.vy);
                if (ay > ax) {
                    sprite.play(player.vy < 0 ? 'north' : 'south');
                } else {
                    sprite.play('east');
                }
                const animScale = player.sprinting ? SPRINT_MUL : 1;
                sprite.update((time ? time.dt : dt) * animScale);
            }

            fireTimer += dt;
            if (fireTimer >= 0.12) {
                fireTimer -= 0.12;
                fireFrame = (fireFrame + 1) % 6;
            }
        },
        (ctx) => {
            ctx.save();
            ctx.font = '14px sans-serif';
            ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
            ctx.fillRect(player.worldX - 52, player.worldY - 32, 248, 22);
            ctx.fillStyle = '#fff';
            ctx.fillText('WASD / stick  Shift  Space/SALTA  F2', player.worldX - 44, player.worldY - 16);
            ctx.restore();
        }
    );
}

boot().catch((err) => {
    console.error(err);
    showStatus(`Errore caricamento: ${err.message}`, '#ff8080');
});
