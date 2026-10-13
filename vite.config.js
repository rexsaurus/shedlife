import { loadEnv } from 'vite';
import api from './server/plugin.mjs';
export default ({ mode }) => { Object.assign(process.env, loadEnv(mode, process.cwd(), '')); return { build: { target: 'esnext' }, plugins: [api()] }; };
