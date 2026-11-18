// Adapté d'Opencadkid (scripts/make-icons.js). Icône provisoire : un carré uni ; la tâche 3 la régénère depuis le SVG de la tour.
import { Buffer } from 'node:buffer';
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
const crc = bytes => {let c=4294967295;for(const b of bytes){c^=b;for(let j=0;j<8;j++)c=(c>>>1)^((c&1)?3988292384:0);}return (c^4294967295)>>>0;};
const chunk=(name,data)=>{const type=Buffer.from(name),length=Buffer.alloc(4),checksum=Buffer.alloc(4);length.writeUInt32BE(data.length);checksum.writeUInt32BE(crc(Buffer.concat([type,data])));return Buffer.concat([length,type,data,checksum]);};
function icon(size){
 const data=Buffer.alloc((size*4+1)*size);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const color=[66,108,80];
  const i=y*(size*4+1)+1+x*4;data[i]=color[0];data[i+1]=color[1];data[i+2]=color[2];data[i+3]=255;
 }
 const header=Buffer.alloc(13);header.writeUInt32BE(size);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(data,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
mkdirSync('public/icons',{recursive:true});
for(const [name,size] of [['192',192],['512',512],['maskable-512',512]])writeFileSync(`public/icons/echecs-${name}.png`,icon(size));
