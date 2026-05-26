import { Game } from './Game';
import './style.css';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
new Game(canvas);
