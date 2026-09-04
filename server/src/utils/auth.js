import jwt from 'jsonwebtoken';import crypto from 'crypto';
const accessSecret=()=>process.env.JWT_ACCESS_SECRET||'dev-access-secret-change-me';const refreshSecret=()=>process.env.JWT_REFRESH_SECRET||'dev-refresh-secret-change-me';
export const signAccess=(u)=>jwt.sign({sub:u._id.toString(),companyId:u.companyId.toString(),role:u.role,type:'access'},accessSecret(),{expiresIn:'12h'});
export const signRefresh=(u)=>jwt.sign({sub:u._id.toString(),companyId:u.companyId.toString(),type:'refresh'},refreshSecret(),{expiresIn:'30d'});
export const verifyAccess=(t)=>jwt.verify(t,accessSecret());export const verifyRefresh=(t)=>jwt.verify(t,refreshSecret());export const hashToken=t=>crypto.createHash('sha256').update(t).digest('hex');
