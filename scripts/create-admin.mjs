import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import {User} from '../server/models.mjs';
if(!process.env.ADMIN_EMAIL||!process.env.ADMIN_PASSWORD||process.env.ADMIN_PASSWORD.length<16)throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (16+ characters) in your private environment.');
await mongoose.connect(process.env.MONGODB_URI);
if(await User.exists({email:process.env.ADMIN_EMAIL.toLowerCase()}))throw new Error('Account already exists. No password was changed.');
await User.create({email:process.env.ADMIN_EMAIL.toLowerCase(),name:process.env.ADMIN_NAME||'Administrator',passwordHash:await bcrypt.hash(process.env.ADMIN_PASSWORD,12),role:'admin'});
console.log('Administrator created. Remove ADMIN_PASSWORD from the environment after setup.');await mongoose.disconnect();
