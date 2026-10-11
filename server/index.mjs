import 'dotenv/config';
import {startServer} from './startup.mjs';
startServer({loadApplication:()=>import('./site.mjs'),port:process.env.PORT||3000});
