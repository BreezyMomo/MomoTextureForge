export const EDITOR_BRIDGE_PROTOCOL='momo.editor-bridge/v1';
export const EDITOR_BRIDGE_PORT=8798;
export const EDITOR_BRIDGE_POLL_MS=20000;
export const EDITOR_BRIDGE_LEASE_MS=45000;
export const EDITOR_BRIDGE_MESSAGE_LIMIT=90*1024*1024;
export function parseEditorPairingCode(value){
 const match=/^(\d{4,5})\.([A-Za-z0-9_-]{43})$/.exec(String(value??'').trim());
 if(!match||+match[1]<1024||+match[1]>65535)throw Error('Invalid Texture Forge pairing code');
 return {origin:'http://127.0.0.1:'+match[1],code:match[2]};
}
