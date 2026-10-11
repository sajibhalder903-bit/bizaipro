import mongoose from 'mongoose';
const { Schema, model } = mongoose;
const postSchema = new Schema({
  title: {type:String, required:true}, slug: {type:String, required:true, unique:true},
  kind: {type:String, enum:['post','page'], default:'post'}, content: {type:String, default:''},
  excerpt: {type:String, default:''}, status: {type:String, enum:['draft','published','scheduled','archived'], default:'draft'},
  category: {type:String, default:'Guides'}, categorySlugs: [String], tags: [String], featuredImage: {type:String, default:''}, imageAlt: {type:String, default:''},
  seoTitle: {type:String, default:''}, metaDescription: {type:String, default:''}, focusKeyword: {type:String, default:''},
  noindex: {type:Boolean, default:false}, featured: {type:Boolean, default:false},
  author: {type:String, default:'BizAIPro Editorial'}, publishedAt: Date, wpId: Number,
  version: {type:Number, default:1}, sourceUrl: String
}, {timestamps:true});
postSchema.index({status:1,kind:1,publishedAt:-1});
export const Post = model('Post', postSchema);
export const User = model('User', new Schema({email:{type:String,unique:true,required:true},name:String,passwordHash:{type:String,required:true},role:{type:String,enum:['admin','editor'],default:'editor'}},{timestamps:true}));
export const Setting = model('Setting', new Schema({key:{type:String,unique:true}, value:Schema.Types.Mixed}));
export const Media = model('Media', new Schema({url:{type:String,unique:true},alt:String,name:String,bytes:Number,width:Number,height:Number,data:{type:Buffer,select:false},legacyPath:String},{timestamps:true}));
export const Revision = model('Revision', new Schema({postId:{type:Schema.Types.ObjectId,index:true},snapshot:Schema.Types.Mixed,editor:String},{timestamps:true}));
export const Audit = model('Audit', new Schema({actor:String,action:String,target:String},{timestamps:true}));
export const Redirect = model('Redirect', new Schema({from:{type:String,unique:true},to:String},{timestamps:true}));
export const Lead = model('Lead', new Schema({
  name: {type:String, trim:true, default:''},
  email: {type:String, required:true, trim:true, lowercase:true},
  phone: {type:String, trim:true, default:''},
  website: {type:String, trim:true, default:''},
  service: {type:String, default:'Growth Audit'},
  budget: {type:String, default:'$1,000 - $5,000'},
  notes: {type:String, default:''},
  source: {type:String, default:'calculator'},
  status: {type:String, enum:['new','contacted','closed','archived'], default:'new'}
},{timestamps:true}));
export const defaults = {
  siteName:'BizAIPro', tagline:'Smarter tools. Better business.',
  heroEyebrow:'THE PRACTICAL AI BUSINESS GUIDE', heroTitle:'Build a smarter business. One workflow at a time.',
  heroDescription:'Clear guides, useful tools, and actionable workflows to help you put AI to work. Less noise. More progress.',
  heroButton:'Explore the guides', heroButtonUrl:'/blog/', accentColor:'#27654b',
  logoUrl:'', footerText:'Practical AI for people building better businesses.',
  contactEmail:'', socialLinks:[],
  adsensePublisherId:'', adsenseEnabled:true,
  adsenseHeaderSlot:'', adsenseArticleSlot:'', adsenseSidebarSlot:'', adsenseToolSlot:'',
  affiliateHostingerUrl:'https://hostinger.com?REFERRALCODE=BIZAIPRO',
  affiliateMakeUrl:'https://www.make.com/en/register?pc=bizaipro',
  navigation:[{label:'AI Tools',url:'/ai-tools/'},{label:'Automation',url:'/business-automation/'},{label:'Products',url:'/products/'},{label:'Guides',url:'/blog/'},{label:'Free Tools',url:'/free-tools/'}],
  footerLinks:[{label:'About',url:'/about/'},{label:'Contact',url:'/contact/'},{label:'Privacy',url:'/privacy-policy/'}]
};
export async function getSettings() { const row = await Setting.findOne({key:'site'}).lean(); return {...defaults,...row?.value}; }
export function publishedQuery() {return {status:{$in:['published','scheduled']},publishedAt:{$lte:new Date()}};}
