/**
 * Demo Survival / Top-Down Arena — test di caricamento asset + BeePlayer in mode 'free'.
 * Non modifica le classi del motore: usa solo le API pubbliche.
 */
import { BeeEngine, BeePlayer, BeeCamera, BeeTilemap } from './BeeEngine.js';

const VIEW_W = 800;
const VIEW_H = 600;
const TILE = 256;
const MAP_COLS = 8;
const MAP_ROWS = 6;
const MAP_W = MAP_COLS * TILE;
const MAP_H = MAP_ROWS * TILE;
const PLAYER_SIZE = 112;

const engine = new BeeEngine('gameCanvas', VIEW_W, VIEW_H);
engine.enableAutoResize(VIEW_W, VIEW_H);
engine.enableLadybug();

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

function makeProp(x, y, width, height, drawFn) {
    return {
        x,
        y,
        width,
        height,
        visible: true,
        destroyed: false,
        get worldX() { return this.x; },
        get worldY() { return this.y; },
        getWorldAABB() {
            return { x: this.x, y: this.y, width: this.width, height: this.height };
        },
        draw(ctx) {
            drawFn(ctx, this);
        }
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

    const player = new BeePlayer(
        MAP_W / 2 - PLAYER_SIZE / 2,
        MAP_H / 2 - PLAYER_SIZE / 2,
        PLAYER_SIZE,
        PLAYER_SIZE
    );
    player.mode = 'free';
    player.gravity = 0;
    player.sprite = sprite;

    engine.camera = new BeeCamera(VIEW_W, VIEW_H);
    engine.camera.setBounds(0, 0, MAP_W, MAP_H);
    engine.camera.follow(player, 1);

    const dirt = engine.getAsset('dirt');
    const water = engine.getAsset('water');
    const props = [
        makeProp(320, 280, 256, 256, (ctx, p) => { if (dirt) ctx.drawImage(dirt, p.x, p.y, p.width, p.height); }),
        makeProp(1500, 200, 256, 256, (ctx, p) => { if (water) ctx.drawImage(water, p.x, p.y, p.width, p.height); }),
        makeProp(380, 300, 192, 192, (ctx, p) => {
            const img = engine.getAsset('cottage');
            if (img) ctx.drawImage(img, p.x, p.y, p.width, p.height);
        }),
        makeProp(980, 420, 160, 192, (ctx, p) => {
            const img = engine.getAsset('tree');
            if (img) ctx.drawImage(img, p.x, p.y, p.width, p.height);
        }),
        makeProp(1480, 880, 160, 192, (ctx, p) => {
            const img = engine.getAsset('tree');
            if (img) ctx.drawImage(img, p.x, p.y, p.width, p.height);
        }),
        makeProp(1240, 640, 160, 192, (ctx, p) => {
            const img = engine.getAsset('well');
            if (img) ctx.drawImage(img, p.x, p.y, p.width, p.height);
        }),
        makeProp(720, 960, 128, 112, (ctx, p) => {
            const img = engine.getAsset('boulder');
            if (img) ctx.drawImage(img, p.x, p.y, p.width, p.height);
        })
    ];

    let fireFrame = 0;
    let fireTimer = 0;
    const fire = makeProp(MAP_W / 2 + 70, MAP_H / 2 + 36, 72, 72, (ctx, p) => {
        const img = engine.getAsset(`fire_${fireFrame}`);
        if (img) ctx.drawImage(img, p.x, p.y, p.width, p.height);
    });

    engine.addEntity(ground);
    props.forEach((prop) => engine.addEntity(prop));
    engine.addEntity(fire);
    engine.addEntity(player);

    engine.playMusic(engine.getAsset('bgm'), 0.4);

    engine.start(
        (dt) => {
            engine.camera.follow(player, 0.14);

            player.x = Math.max(0, Math.min(MAP_W - player.width, player.x));
            player.y = Math.max(0, Math.min(MAP_H - player.height, player.y));

            const moving = player.vx !== 0 || player.vy !== 0;
            if (moving) {
                const ax = Math.abs(player.vx);
                const ay = Math.abs(player.vy);
                if (ay > ax) {
                    sprite.play(player.vy < 0 ? 'north' : 'south');
                } else {
                    // BeePlayer specchia da solo con flipX: usiamo i frame est anche verso ovest.
                    sprite.play('east');
                }
                sprite.update(dt);
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
            ctx.fillRect(player.worldX - 36, player.worldY - 28, 184, 22);
            ctx.fillStyle = '#fff';
            ctx.fillText('WASD / frecce  ·  F2 debug', player.worldX - 28, player.worldY - 12);
            ctx.restore();
        }
    );
}

boot().catch((err) => {
    console.error(err);
    showStatus(`Errore caricamento: ${err.message}`, '#ff8080');
});
