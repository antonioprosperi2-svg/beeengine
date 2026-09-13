import { BeeEngine } from './core/BeeEngine.js';
import { BeePlayer } from './entities/BeePlayer.js'; // Il tuo file reale!

const engine = new BeeEngine('gameCanvas');

// Creiamo il giocatore usando la TUA classe!
const player = new BeePlayer(400, 300, 40, 40);
player.mode = 'free'; // Attiviamo il tuo movimento a 360° per l'arena Top-Down!

engine.addEntity(player);

// Avviamo il gioco senza toccare una singola riga della tua classe BeePlayer
engine.start();