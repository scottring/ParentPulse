import { describe,it,expect } from "vitest";
import { makeIdentity,keyFingerprint,encryptPassage,decryptPassage,isConnections } from "../sharing";
import { createVault,unlockVault } from "../vault";
import { emptyBook } from "../model";
describe("selected-passage encryption",()=>{
  it("encrypts only for the selected edition and binds the sender, recipient and invitation",async()=>{
    const identity=await makeIdentity("recipient"), other=await makeIdentity("outsider");
    const member={uid:identity.uid,name:"Recipient",publicKey:identity.publicKey,keyId:await keyFingerprint(identity.publicKey)};
    const d={id:crypto.randomUUID(),circleId:crypto.randomUUID(),sender:"sender"};
    const payload={title:"A chosen passage",text:"Fictional words that only the intended edition can open."};
    const packet=await encryptPassage(payload,member,d.id,d.circleId,d.sender);
    expect(JSON.stringify(packet)).not.toContain(payload.text);
    expect(JSON.stringify(packet)).not.toContain(identity.privateKey.d);
    expect(await decryptPassage(packet,identity,d)).toEqual(payload);
    await expect(decryptPassage(packet,other,d)).rejects.toThrow();
    await expect(decryptPassage(packet,identity,{...d,sender:"impostor"})).rejects.toThrow();
    await expect(decryptPassage(packet,identity,{...d,circleId:"another-family"})).rejects.toThrow();
    await expect(decryptPassage(packet,identity,{...d,id:crypto.randomUUID()})).rejects.toThrow();
    const tampered={...packet,ciphertext:(packet.ciphertext[0]==="A"?"B":"A")+packet.ciphertext.slice(1)};
    await expect(decryptPassage(tampered,identity,d)).rejects.toThrow();
  });
  it("uses fresh encryption and refuses a changed member key",async()=>{
    const a=await makeIdentity("a"),m={uid:"a",name:"A",publicKey:a.publicKey,keyId:await keyFingerprint(a.publicKey)},id=crypto.randomUUID();
    const one=await encryptPassage({title:"t",text:"selected text"},m,id,"circle","sender"),two=await encryptPassage({title:"t",text:"selected text"},m,id,"circle","sender");
    expect(one.iv).not.toBe(two.iv);expect(one.ciphertext).not.toBe(two.ciphertext);expect(one.ephemeral).not.toEqual(two.ephemeral);
    await expect(encryptPassage({title:"t",text:"selected"},{...m,keyId:"changed"},id,"circle","sender")).rejects.toThrow("key changed");
  });
  it("keeps the sharing private key only inside an encrypted, restorable book",async()=>{
    const identity=await makeIdentity("a");
    const book={...emptyBook("Fictional owner"),connections:{identity,received:[]}};
    const created=await createVault(book,"test-only existing passphrase");
    const raw=JSON.stringify(created.envelope);
    expect(raw).not.toContain(identity.privateKey.d);expect(raw).not.toContain("Fictional owner");
    const opened=await unlockVault(raw,"test-only existing passphrase");
    expect(opened.book.connections?.identity).toEqual(identity);
    expect(isConnections({identity:{...identity,privateKey:{...identity.privateKey,x:"wrong"}},received:[]})).toBe(false);
  });
});
