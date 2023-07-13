import axios from "axios";
import { expect } from "chai";
import hre from "hardhat";

import { waitForBlock } from "../../utils/block";

const secretPassword = 7;

export function shouldBehaveLikeTicket(): void {
  it("should mint a new NFT from the admin account", async function () {
    const encPw = this.instance.instance.encrypt32(secretPassword);

    await this.ticket.connect(this.signers.admin).setPrivateKey(encPw);

    await waitForBlock(hre);

    await this.ticket.connect(this.signers.admin).mintNft(this.signers.user.address, 0);

    await waitForBlock(hre);

    const nftOwner = await this.ticket.connect(this.signers.admin).ownerOf(0);

    expect(nftOwner).to.equal(this.signers.user.address);
  });

  it("should return the secret password from the debug interface", async function () {
    const encryptedPassword = await this.ticket.connect(this.signers.admin).getKeyDebug(this.instance.publicKey);

    const password = this.instance.instance.decrypt(await this.ticket.getAddress(), encryptedPassword);

    expect(password).to.equal(secretPassword);
  });

  it("should use encrypt/decrypt apis to simulate a challenge-response", async function () {
    const challenge = 5;
    const challengeEncrypted = (await axios.get(`http://localhost:5000/encrypt?number=${challenge}`)).data["encrypted"];

    const encryptedResponse = await this.ticket
      .connect(this.signers.admin)
      .getKeyWithChallenge(`0x${challengeEncrypted}`);

    console.log(`encrypted response: ${encryptedResponse}`);

    const decryptedResponse = (await axios.get(`http://localhost:5000/decrypt?encrypted=${encryptedResponse}`)).data[
      "decrypted"
    ];

    //const password = this.instance.instance.decrypt(await this.counter.getAddress(), encryptedPassword);
    console.log(`decrypted response: ${decryptedResponse}`);
    expect(decryptedResponse).to.equal(challenge ^ secretPassword);
  });
}
